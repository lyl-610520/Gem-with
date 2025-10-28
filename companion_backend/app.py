# -*- coding: utf-8 -*-
"""
陪伴空间后端API
功能：用户认证、日记管理、打卡系统、音乐播放、阅读批注、小游戏等
"""
import eventlet
eventlet.monkey_patch()

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from flask import send_file
from datetime import datetime, timedelta
import json
import os
import re
import io
import hashlib
import secrets
import httpx
from google import genai
from google.genai import types
from dotenv import load_dotenv
import requests
import threading
import time
import pytz
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func
import ebooklib
from ebooklib import epub
import base64
import tempfile
import traceback
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, JWTManager
from cryptography.fernet import Fernet
import spotipy
from spotipy.oauth2 import SpotifyOAuth
from functools import wraps
from flask_jwt_extended import decode_token # <--- 在文件顶部，从 flask_jwt_extended 额外导入 decode_token
from ytmusicapi import YTMusic
import random
from googletrans import Translator
from flask_socketio import SocketIO, emit, join_room, leave_room # <--- 新增导入

# 加载环境变量
load_dotenv()

app = Flask(__name__)
app.config["JWT_QUERY_STRING_NAME"] = "token" # 允许通过 URL 参数 ?token=... 来传递 JWT
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))
# --- 把上面那一大堆关于 Cookie 的配置全部删除，换成下面这三行 ---
app.config["JWT_SECRET_KEY"] = app.config['SECRET_KEY'] # JWT需要一个自己的密钥
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24) # 令牌24小时后过期
jwt = JWTManager(app) # 初始化JWT工具
# --- VVVV  在这里添加下面这两行“侦探代码” VVVV ---
@jwt.unauthorized_loader
def unauthorized_callback(reason):
    print(f"Unauthorized request detected. Reason: {reason}")
    return jsonify({"msg": "Missing Authorization Header"}), 401

@jwt.invalid_token_loader
def invalid_token_callback(error):
    print(f"Invalid token detected. Error: {error}")
    return jsonify({"msg": "Token is invalid"}), 422
# --- ^^^^ 添加结束 ^^^^ ---
# 智能数据库连接配置
database_url = os.getenv('DATABASE_URL')
if database_url and database_url.startswith("postgres://"):
    pass

# 使用处理过的新地址，或者在没有配置时退回使用本地SQLite文件
app.config['SQLALCHEMY_DATABASE_URI'] = database_url or 'sqlite:///companion.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
# [新增] 数据库连接池优化，解决SSL/OperationalError瞬时错误
app.config['SQLALCHEMY_ENGINE_OPTIONS'] = {
    # "强制退休"机制：任何闲置超过280秒的连接，在下次使用前都会被自动丢弃并重新建立。
    # 这个值略小于云平台通常的300秒（5分钟）空闲超时，能有效避免使用“打盹”的连接。
    'pool_recycle': 280,
    # "定期体检"机制：在每次从连接池中获取连接时，都发送一个简单的 "SELECT 1" 来测试连接是否依然有效。
    # 这会增加极小的性能开销，但能最大程度地保证连接的稳定性。
    'pool_pre_ping': True
}

UPLOAD_FOLDER = os.getenv('UPLOAD_FOLDER', 'uploads')
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
if not os.path.exists(UPLOAD_FOLDER):
    os.makedirs(UPLOAD_FOLDER)

# 初始化扩展
db = SQLAlchemy(app)
# [新增] 加密密钥，从环境变量加载
ENCRYPTION_KEY = os.getenv('ENCRYPTION_KEY')
if not ENCRYPTION_KEY:
    raise ValueError("严重错误：未在环境变量中设置 ENCRYPTION_KEY！")
cipher_suite = Fernet(ENCRYPTION_KEY.encode())

# [新增] 全局 Spotify OAuth 管理器及权限声明
SCOPES = (
    "user-read-private user-read-email "
    "playlist-read-private playlist-read-collaborative " # <--- 读取歌单的权限
    "playlist-modify-public playlist-modify-private "
    "user-library-read user-library-modify "
    "user-top-read "
    "user-modify-playback-state user-read-playback-state "
    "streaming"  # <--- 播放音乐的终极权限！
)
sp_oauth = SpotifyOAuth(
    scope=SCOPES,
    client_id=os.getenv("SPOTIPY_CLIENT_ID"),
    client_secret=os.getenv("SPOTIPY_CLIENT_SECRET"),
    redirect_uri=os.getenv("SPOTIPY_REDIRECT_URI")
)
# ------------------- VVVV 从这里开始复制 VVVV -------------------
# 从环境变量中获取前端URL白名单，并配置CORS
frontend_url = os.getenv('FRONTEND_URL')
if frontend_url:
    # 如果在Render环境变量里找到了前端URL，就只允许它访问
    CORS(app, supports_credentials=True, origins=[frontend_url], allow_headers="*", resources={
        r"/api/*": {}, 
        r"/uploads/*": {}
    })
    print(f"✅ CORS已配置，明确允许来自 {frontend_url} 的跨域请求。")
else:
    # 如果没有配置（比如在本地测试时），为了方便，允许所有来源
    # 注意：在生产环境中，强烈建议配置FRONTEND_URL
    CORS(app, supports_credentials=True)
    print("⚠️ 警告：未配置FRONTEND_URL环境变量，CORS已设置为允许所有来源，这在生产环境中存在安全风险。")
# ------------------- ^^^^ 复制到这里结束 ^^^^ -------------------
# --- VVVV 新增 SocketIO 初始化 VVVV ---
# 我们直接复用您之前的CORS配置
socketio = SocketIO(app, cors_allowed_origins=frontend_url if frontend_url else "*", async_mode='eventlet')
# --- ^^^^ 新增结束 ^^^^ ---

# 配置Gemini API - 【V4修正版：使用 genai.Client()】
GEMINI_API_KEYS_STR = os.getenv('GEMINI_API_KEYS')
if GEMINI_API_KEYS_STR:
    GEMINI_API_KEYS = [key.strip() for key in GEMINI_API_KEYS_STR.split(',')]
    current_key_index = 0
    print(f"✅ 成功加载 {len(GEMINI_API_KEYS)} 个 Gemini API Key")
else:
    GEMINI_API_KEYS = []
    current_key_index = 0
    print("⚠️ 警告：未配置GEMINI_API_KEYS，AI功能将不可用")

# 全局变量，用于存放客户端实例
gemini_client = None

def initialize_gemini_client():
    """【V4修正版】初始化 genai.Client 客户端"""
    global gemini_client, current_key_index
    if not GEMINI_API_KEYS:
        return False
    
    try:
        api_key = GEMINI_API_KEYS[current_key_index]
        # 严格使用 genai.Client() 初始化
        # 将 request_options 传递给 Client 的构造函数
        gemini_client = genai.Client(
            api_key=api_key
            )
        # 做一个简单的API调用来验证Key
        gemini_client.models.get(model='models/gemini-2.5-pro')
        print(f"✅ Gemini 客户端初始化成功！正使用 Key #{current_key_index + 1}")
        return True
    except Exception as e:
        print(f"❌ Key #{current_key_index + 1} 初始化失败: {e}")
        gemini_client = None
        return False

def rotate_gemini_key():
    """【V4修正版】轮询切换API Key并重新初始化Client"""
    global current_key_index
    initial_index = current_key_index
    
    # 循环尝试所有Key
    for _ in range(len(GEMINI_API_KEYS)):
        print(f"🔑 Key #{current_key_index + 1} 调用失败或需要切换，正在尝试下一个...")
        current_key_index = (current_key_index + 1) % len(GEMINI_API_KEYS)
        
        if initialize_gemini_client():
            return True # 初始化成功
            
    print("❌ 所有API Key都已失效！")
    return False

# 在程序启动时，执行第一次初始化
initialize_gemini_client()

# 数据库模型
class User(db.Model):
    """用户模型"""
    id = db.Column(db.Integer, primary_key=True)
    qq_id = db.Column(db.String(20), unique=True, nullable=False)  # QQ号
    username = db.Column(db.String(50), unique=True, nullable=False)  # 用户名
    password_hash = db.Column(db.String(256), nullable=True)  # 密码哈希
    theme = db.Column(db.String(20), default='pure')  # 主题：pure, cute, dreamy
    custom_color = db.Column(db.String(7), default='#6366f1')  # 自定义颜色
    is_activated = db.Column(db.Boolean, default=False, nullable=False)
    
    # [新增] 人设字段，使用Text类型可以存储很长的文本
    persona = db.Column(db.Text, default='一个乐于助人的AI助手')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_active = db.Column(db.DateTime, default=datetime.utcnow)
    encrypted_spotify_token_info = db.Column(db.LargeBinary, nullable=True) # <-- 添加这一行

    # 关联关系
    diaries = db.relationship('Diary', backref='user', lazy=True, cascade='all, delete-orphan')
    checkins = db.relationship('Checkin', backref='user', lazy=True, cascade='all, delete-orphan')
    annotations = db.relationship('Annotation', backref='user', lazy=True, cascade='all, delete-orphan')
    game_scores = db.relationship('GameScore', backref='user', lazy=True, cascade='all, delete-orphan')
    
    # [新增] 与长期记忆的关联关系
    memories = db.relationship('LongTermMemory', backref='user', lazy=True, cascade='all, delete-orphan')

class Friendship(db.Model):
    """好友关系模型"""
    id = db.Column(db.Integer, primary_key=True)
    
    # 发起请求的用户
    requester_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    # 被请求的用户
    addressee_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    
    # 关系状态: 'pending', 'accepted', 'blocked'
    status = db.Column(db.String(20), default='pending', nullable=False)
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    # 使用 SQLAlchemy 的 backref 来自动创建反向关系
    # requester 指向发起请求的用户
    requester = db.relationship('User', foreign_keys=[requester_id], backref='sent_friend_requests')
    # addressee 指向被请求的用户
    addressee = db.relationship('User', foreign_keys=[addressee_id], backref='received_friend_requests')

    # 确保一对好友关系是唯一的
    __table_args__ = (db.UniqueConstraint('requester_id', 'addressee_id', name='_requester_addressee_uc'),)

# [新增] 长期记忆模型
class LongTermMemory(db.Model):
    """长期记忆模型"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow) # 使用数据库时间
    # [新增] QQ机器人同步时会传来一个字符串格式的时间，我们把它也存起来
    memory_time_str = db.Column(db.String(50)) 
    
class Diary(db.Model):
    """日记模型"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    mood = db.Column(db.String(20))  # 心情：happy, sad, excited, calm, etc.
    is_gemini_written = db.Column(db.Boolean, default=False)  # 是否为Gemini写的日记
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Checkin(db.Model):
    """打卡模型"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    checkin_type = db.Column(db.String(20), nullable=False)  # 打卡类型：study, exercise, work, etc.
    content = db.Column(db.Text)  # 打卡内容
    is_gemini_checkin = db.Column(db.Boolean, default=False)  # 是否为Gemini的打卡
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class Book(db.Model):
    """[Base64版] 书籍模型"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    title = db.Column(db.String(200), nullable=False)
    author = db.Column(db.String(100))
    # [核心改造] 我们现在用一个Text字段来存储整本书的Base64编码
    epub_data_base64 = db.Column(db.Text, nullable=False)
    cover_image_data = db.Column(db.Text) 
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    annotations = db.relationship('Annotation', backref='book', lazy=True, cascade='all, delete-orphan')
    
class Annotation(db.Model):
    """批注模型"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('book.id'), nullable=False)
    # [改造] 批注的内容
    content = db.Column(db.Text, nullable=False)
    # [新增] 用户划重点的原文
    highlighted_text = db.Column(db.Text)
    # [核心改造] 我们不再简单依赖页码，而是使用精确的CFI位置标识符
    cfi = db.Column(db.String(255), nullable=False) # <---  在这里添加这一行！
    # [新增] 批注所在的页码
    page_number = db.Column(db.Integer, nullable=True)
    is_gemini_annotation = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class GameScore(db.Model):
    """游戏分数模型"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    game_type = db.Column(db.String(20), nullable=False)  # 游戏类型：memory, puzzle, etc.
    score = db.Column(db.Integer, nullable=False)
    level = db.Column(db.Integer, default=1)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

class LocalMusic(db.Model):
    """音乐模型"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    filename = db.Column(db.String(255), nullable=False) # 存储在服务器上的安全文件名
    original_title = db.Column(db.String(200), nullable=False) # 用户上传时的原始歌名
    artist = db.Column(db.String(100), default='未知艺术家')
    audio_data = db.Column(db.LargeBinary, nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

    
with app.app_context():
    db.create_all()

# 全局变量存储活跃的音乐会话


# 辅助函数
def get_gemini_response(prompt, user_context="", user_id=None):
    """【V4修正版】使用 genai.Client() 获取Gemini的回复"""
    global gemini_client
    if not gemini_client:
        print("   - Gemini 客户端未初始化，尝试重新初始化...")
        if not initialize_gemini_client():
            return "抱歉，AI功能暂时不可用。"

    user_persona = "一个温暖、友好的AI陪伴助手"
    user_memories_prompt = ""

    if user_id:
        user = db.session.get(User, user_id)
        if user:
            user_persona = user.persona
            recent_memories = LongTermMemory.query.filter_by(user_id=user.id).order_by(LongTermMemory.id.desc()).limit(50).all()
            if recent_memories:
                recent_memories.reverse()
                formatted_memories = "\n".join([f"- (记录于 {mem.memory_time_str}) {mem.content}" for mem in recent_memories])
                user_memories_prompt = f"\n--- 关于我们的长期记忆 (请遵守和利用) ---\n{formatted_memories}\n--- 记忆结束 ---\n"

    # 构建完整的系统指令
    system_instruction = f"""
你的角色设定是：{user_persona}
{user_memories_prompt}
---
用户当前在陪伴空间中的上下文：{user_context}
---
现在，请针对用户的以下问题或行为，以温暖、友好的语气进行符合人设的回应。请记住，你是Gem。
"""
    # 构建用户消息
    contents = [f'用户说："{prompt}"']
    
    # 使用 config 对象来传递 system_instruction
    config = types.GenerateContentConfig(
        system_instruction=system_instruction,
        tools=[
            types.Tool(
                google_search=types.GoogleSearch()
            )
        ]
    )

    for attempt in range(len(GEMINI_API_KEYS) + 1):
        try:
            # 使用 client.models.generate_content
            response = gemini_client.models.generate_content(
                model='gemini-2.5-pro', # 推荐使用能力更强的模型
                contents=contents,
                config=config,
            )
            return response.text
        except Exception as e:
            error_str = str(e).lower()
            print(f"Gemini API调用失败 (尝试 {attempt + 1}): {e}")
            
            if any(err in error_str for err in ["429", "permission", "quota", "api key", "deadline", "resource_exhausted"]):
                if not rotate_gemini_key():
                    return "抱歉，AI服务暂时不可用，所有能量核心都已过载。"
            elif attempt < 2:
                time.sleep(1)
                continue
            else: # 如果重试完了还是不行
                break
    
    return "抱歉，我现在有点累了，稍后再聊吧~"

def check_user_activity(user_id):
    """检查用户活跃度，如果用户连续三天不活跃，Gemini也停止活动"""
    user = db.session.get(User, user_id)
    if not user:
        return False
    
    three_days_ago = datetime.utcnow() - timedelta(days=3)
    return user.last_active > three_days_ago

def update_user_activity(user_id):
    """更新用户活跃时间"""
    user = db.session.get(User, user_id)
    if user:
        user.last_active = datetime.utcnow()
        db.session.commit()

def calculate_checkin_streak(user_id):
    """计算用户连续打卡天数。"""
    beijing_tz = pytz.timezone('Asia/Shanghai')
    
    # 查询用户所有打卡记录的日期，去重并降序排列
    checkin_dates = db.session.query(
        func.date(func.timezone('Asia/Shanghai', Checkin.created_at))
    ).filter_by(user_id=user_id).distinct().order_by(
        func.date(func.timezone('Asia/Shanghai', Checkin.created_at)).desc()
    ).all()
    
    # 将查询结果转换为 date 对象列表
    checkin_dates = [d[0] for d in checkin_dates]
    
    if not checkin_dates:
        return 0

    streak = 0
    today = datetime.now(beijing_tz).date()
    
    # 检查今天或昨天是否打卡
    if today in checkin_dates:
        streak = 1
        current_day = today - timedelta(days=1)
    elif (today - timedelta(days=1)) in checkin_dates:
        streak = 1
        current_day = today - timedelta(days=2)
    else:
        # 如果今天和昨天都没打卡，连击中断
        return 0

    # 从昨天或前天开始，向前追溯
    for i in range(1, len(checkin_dates)):
        if checkin_dates[i] == current_day:
            streak += 1
            current_day -= timedelta(days=1)
        else:
            # 日期不连续，中断
            break
            
    return streak

# API路由
@app.route('/api/auth/login', methods=['POST'])
def login():
    """用户登录"""
    data = request.get_json()
    qq_id = data.get('qq_id')
    username = data.get('username')
    password = data.get('password')
    
    if not all([qq_id, username, password]):
        return jsonify({'error': '缺少必要参数'}), 400
    
    user = User.query.filter_by(qq_id=qq_id, username=username).first()
    
    if user and check_password_hash(user.password_hash, password):
        # [最终修复] 把 user.id 转换成字符串
        access_token = create_access_token(identity=str(user.id))
        update_user_activity(user.id)
        
        return jsonify({
            'success': True,
            'token': access_token,
            'user': {
                'id': user.id,
                'username': user.username,
                'theme': user.theme,
                'custom_color': user.custom_color
            }
        })
    else:
        return jsonify({'error': '用户名或密码错误'}), 401

@app.route('/api/auth/register', methods=['POST'])
def register():
    """
    [究极智能版] 注册/激活接口，使用 is_activated 标志进行判断
    """
    data = request.get_json()
    qq_id = data.get('qq_id')
    username = data.get('username')
    password = data.get('password')
    
    if not all([qq_id, username, password]):
        return jsonify({'error': '缺少必要参数'}), 400

    user = User.query.filter_by(qq_id=qq_id).first()

    if user:
        # 使用官方身份认证来判断
        if not user.is_activated:
            # 是待激活账户，我们来激活他！
            if User.query.filter(User.username == username, User.qq_id != qq_id).first():
                return jsonify({'error': '此用户名已被其他用户占用'}), 409

            user.username = username
            user.password_hash = generate_password_hash(password)
            user.is_activated = True # [关键] 将账户标记为“已激活”！
            db.session.commit()
            
            access_token = create_access_token(identity=str(user.id))
            # ... 返回成功 token 和 user 对象的代码 ...
            return jsonify({ 'success': True, 'token': access_token, 'user': { 'id': user.id, 'username': user.username, 'qq_id': user.qq_id, 'theme': user.theme, 'custom_color': user.custom_color, 'is_spotify_linked': user.encrypted_spotify_token_info is not None }}), 200
        else:
            # 账户已激活，是真的已经注册过了
            return jsonify({'error': '该QQ号已注册'}), 409
    else:
        # 全新用户，直接创建并标记为已激活
        if User.query.filter_by(username=username).first():
            return jsonify({'error': '用户名已存在'}), 409

        new_user = User(
            qq_id=qq_id,
            username=username,
            password_hash=generate_password_hash(password),
            is_activated=True # [关键] 用户自己注册的，直接就是激活状态
        )
        db.session.add(new_user)
        db.session.commit()
        
        access_token = create_access_token(identity=str(new_user.id))
        # ... 返回成功 token 和 user 对象的代码 ...
        return jsonify({ 'success': True, 'token': access_token, 'user': { 'id': new_user.id, 'username': new_user.username, 'qq_id': new_user.qq_id, 'theme': new_user.theme, 'custom_color': new_user.custom_color, 'is_spotify_linked': False }}), 201
@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """用户登出"""
    return jsonify({'success': True})

@app.route('/api/user/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """获取用户资料"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404

    is_spotify_linked = user.encrypted_spotify_token_info is not None
    return jsonify({
        'id': user.id,
        'username': user.username,
        'qq_id': user.qq_id, 
        'theme': user.theme,
        'custom_color': user.custom_color,
        'last_active': user.last_active.isoformat(),
        'is_spotify_linked': is_spotify_linked
    })

@app.route('/api/user/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """更新用户资料"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    
    data = request.get_json()
    if 'theme' in data:
        user.theme = data['theme']
    if 'custom_color' in data:
        user.custom_color = data['custom_color']
    
    db.session.commit()
    # [最终修复] get_jwt_identity() 返回的是字符串, 需要转成整数才能用于非数据库操作
    update_user_activity(int(current_user_id))
    
    return jsonify({'success': True})


@app.route('/api/dashboard/summary', methods=['GET'])
@jwt_required()
def get_dashboard_summary():
    """[全新] 为首页提供统一的、聚合的数据。"""
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404

    # 1. 获取统计数据
    diary_count = Diary.query.filter_by(user_id=current_user_id).count()
    checkin_count = Checkin.query.filter_by(user_id=current_user_id).count()
    book_count = Book.query.filter_by(user_id=current_user_id).count()
    
    # 2. 调用新函数计算连续打卡天数
    streak = calculate_checkin_streak(current_user_id)
    
    # 3. 获取最新的日记作为预览
    latest_diary = Diary.query.filter_by(user_id=current_user_id).order_by(Diary.created_at.desc()).first()
    latest_diary_preview = None
    if latest_diary:
        # 创建一个不超过50个字的摘要
        content_snippet = latest_diary.content[:50] + ('...' if len(latest_diary.content) > 50 else '')
        latest_diary_preview = {
            'id': latest_diary.id,
            'content_snippet': content_snippet,
            'mood': latest_diary.mood
        }
        
    # 4. 组合成一个完整的对象返回给前端
    summary_data = {
        'username': user.username,
        'stats': {
            'diaries': diary_count,
            'checkins': checkin_count,
            'books': book_count,
            'streak': streak
        },
        'latest_diary': latest_diary_preview
    }
    
    return jsonify(summary_data)

# ==========================================================
# 实时通信与好友状态 (WebSocket Events) - 加固最终版
# ==========================================================

# 用于存储在线用户的全局字典: { user_id: socket_id }
online_users = {}

# [新增] 统一的、健壮的状态通知函数
def notify_friends_status_change(user_id, status):
    """
    通知一个用户的所有在线好友，其最新的状态。
    status: 'online' 或 'offline'
    """
    try: # 内部也加上保护
        online_friends = get_online_friends(user_id)
        # [修复] 发送前端正在监听的 'friend_status_update' 事件！
        payload = {'user_id': user_id, 'status': status}
        for friend_id, friend_sid in online_friends.items():
            emit('friend_status_update', payload, to=friend_sid)
    except Exception as e:
        print(f"!!!!!!!!!! notify_friends_status_change 发生错误: {e}")

@socketio.on('connect')
@jwt_required(optional=True)
def handle_connect():
    try: # [修复] 用 try...except 包裹所有逻辑，防止崩溃
        current_user_id = get_jwt_identity()
        if not current_user_id:
            print("WebSocket 连接被拒绝：缺少有效的 JWT。")
            return False

        current_user_id = int(current_user_id)
        sid = request.sid
        online_users[current_user_id] = sid
        print(f"✅ 用户 {current_user_id} 已上线，SID: {sid}")

        join_room(str(current_user_id))
        
        # [修复] 使用新的通知函数，发送正确的事件和状态
        notify_friends_status_change(current_user_id, 'online')

    except Exception as e:
        print(f"!!!!!!!!!! handle_connect 发生严重错误: {e}")


@socketio.on('disconnect')
def handle_disconnect():
    try: # [修复] 用 try...except 包裹所有逻辑，防止崩溃
        disconnected_user_id = None
        for user_id, sid in online_users.items():
            if sid == request.sid:
                disconnected_user_id = user_id
                break
                
        if disconnected_user_id in online_users: # 加上更安全的检查
            del online_users[disconnected_user_id]
            print(f"❌ 用户 {disconnected_user_id} 已下线。")
            
            # [修复] 使用新的通知函数，发送正确的事件和状态
            notify_friends_status_change(disconnected_user_id, 'offline')
            
    except Exception as e:
        print(f"!!!!!!!!!! handle_disconnect 发生严重错误: {e}")


@socketio.on('private_message')
@jwt_required()
def handle_private_message(data):
    try: # [修复] 用 try...except 包裹所有逻辑，防止崩溃
        sender_id = int(get_jwt_identity())
        recipient_id = data.get('recipient_id')
        message_content = data.get('message')

        if not all([recipient_id, message_content]):
            return

        message_payload = {
            'from_user_id': sender_id,
            'to_user_id': recipient_id,
            'content': message_content,
            'timestamp': datetime.utcnow().isoformat() + 'Z'
        }

        recipient_sid = online_users.get(recipient_id)
        if recipient_sid:
            emit('receive_private_message', message_payload, to=recipient_sid)

        sender_sid = request.sid
        emit('receive_private_message', message_payload, to=sender_sid)

    except Exception as e:
        print(f"!!!!!!!!!! handle_private_message 发生严重错误: {e}")

# 辅助函数，用于获取用户的所有在线好友
def get_online_friends(user_id):
    friendships = Friendship.query.filter(
        ((Friendship.requester_id == user_id) | (Friendship.addressee_id == user_id)) &
        (Friendship.status == 'accepted')
    ).all()
    
    friend_ids = set()
    for f in friendships:
        friend_ids.add(f.addressee_id if f.requester_id == user_id else f.requester_id)
        
    online_friends_dict = {fid: online_users[fid] for fid in friend_ids if fid in online_users}
    return online_friends_dict

# ==========================================================
# [全新] 好友系统 API (Friendship APIs)
# ==========================================================

@app.route('/api/users/search', methods=['GET'])
@jwt_required()
def search_users():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify([])

    # 模糊搜索用户名或精确匹配QQ号
    users = User.query.filter(
        (User.username.ilike(f'%{query}%')) | (User.qq_id == query)
    ).limit(10).all()
    
    # 过滤掉自己
    current_user_id = int(get_jwt_identity())
    
    users_data = [{
        'id': user.id,
        'username': user.username,
        'qq_id': user.qq_id
    } for user in users if user.id != current_user_id]
    
    return jsonify(users_data)

@app.route('/api/friends/request', methods=['POST'])
@jwt_required()
def send_friend_request():
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    addressee_id = data.get('user_id')

    if not addressee_id:
        return jsonify({'error': '缺少 user_id'}), 400
        
    if current_user_id == addressee_id:
        return jsonify({'error': '不能添加自己为好友'}), 400

    # 检查是否已经是好友或已发送请求
    existing = Friendship.query.filter(
        ((Friendship.requester_id == current_user_id) & (Friendship.addressee_id == addressee_id)) |
        ((Friendship.requester_id == addressee_id) & (Friendship.addressee_id == current_user_id))
    ).first()
    
    if existing:
        return jsonify({'error': '你们已经是好友或请求已发送'}), 409
        
    new_request = Friendship(requester_id=current_user_id, addressee_id=addressee_id)
    db.session.add(new_request)
    db.session.commit()
    
    # 实时通知对方有新的好友请求
    if addressee_id in online_users:
        requester = db.session.get(User, current_user_id)
        emit('new_friend_request', 
             {'from_user': {'id': requester.id, 'username': requester.username}},
             to=online_users[addressee_id],
             namespace='/') # 确保在全局命名空间发送
             
    return jsonify({'success': True, 'message': '好友请求已发送'}), 201

@app.route('/api/friends/requests', methods=['GET'])
@jwt_required()
def get_friend_requests():
    """获取当前用户收到的所有待处理的好友请求。"""
    current_user_id = int(get_jwt_identity())
    
    # 查询所有发送给我、且状态为 'pending' 的请求
    pending_requests = Friendship.query.filter_by(
        addressee_id=current_user_id, 
        status='pending'
    ).order_by(Friendship.created_at.desc()).all()
    
    requests_data = [{
        'request_id': req.id,
        'from_user': {
            'id': req.requester.id,
            'username': req.requester.username,
            'qq_id': req.requester.qq_id
        },
        'created_at': req.created_at.isoformat()
    } for req in pending_requests]
    
    return jsonify(requests_data)

@app.route('/api/friends/accept', methods=['POST'])
@jwt_required()
def accept_friend_request():
    """接受好友请求。"""
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    request_id = data.get('request_id')

    if not request_id:
        return jsonify({'error': '缺少 request_id'}), 400

    friend_request = db.session.get(Friendship, request_id)

    # 安全检查：确保这个请求是发给我的，并且是待处理状态
    if not friend_request or friend_request.addressee_id != current_user_id or friend_request.status != 'pending':
        return jsonify({'error': '请求不存在或已处理'}), 404
        
    # 更新请求状态为 'accepted'
    friend_request.status = 'accepted'
    db.session.commit()
    
    # 实时通知请求发送方“你的好友请求已被接受”
    requester_id = friend_request.requester_id
    if requester_id in online_users:
        # 获取当前用户信息（即接受请求的人）
        me = db.session.get(User, current_user_id)
        emit('request_accepted', 
             {'accepted_by_user': {'id': me.id, 'username': me.username}},
             to=online_users[requester_id],
             namespace='/')
             
    return jsonify({'success': True, 'message': '好友已添加'})

@app.route('/api/friends/reject', methods=['POST'])
@jwt_required()
def reject_friend_request():
    """拒绝或忽略好友请求。"""
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    request_id = data.get('request_id')

    if not request_id:
        return jsonify({'error': '缺少 request_id'}), 400

    friend_request = db.session.get(Friendship, request_id)

    # 安全检查：确保这个请求是发给我的
    if not friend_request or friend_request.addressee_id != current_user_id:
        return jsonify({'error': '请求不存在'}), 404
        
    # 直接删除这条请求记录
    db.session.delete(friend_request)
    db.session.commit()
    
    return jsonify({'success': True, 'message': '请求已忽略'})

@app.route('/api/friends', methods=['GET'])
@jwt_required()
def get_friends_list():
    """获取当前用户的好友列表，并附带在线状态。"""
    current_user_id = int(get_jwt_identity())
    
    # 查询所有与我相关、且状态为 'accepted' 的关系
    accepted_friendships = Friendship.query.filter(
        ((Friendship.requester_id == current_user_id) | (Friendship.addressee_id == current_user_id)) &
        (Friendship.status == 'accepted')
    ).all()
    
    friends_data = []
    for friendship in accepted_friendships:
        # 确定好友是关系中的哪一方
        friend_user = friendship.addressee if friendship.requester_id == current_user_id else friendship.requester
        
        friends_data.append({
            'id': friend_user.id,
            'username': friend_user.username,
            'qq_id': friend_user.qq_id,
            'is_online': friend_user.id in online_users # 核心：直接从 online_users 字典判断在线状态
        })
        
    return jsonify(friends_data)

@app.route('/api/friends/remove', methods=['POST'])
@jwt_required()
def remove_friend():
    """删除好友。"""
    current_user_id = int(get_jwt_identity())
    data = request.get_json()
    friend_id = data.get('friend_id')

    if not friend_id:
        return jsonify({'error': '缺少 friend_id'}), 400

    # 查找好友关系，无论我是请求方还是接收方
    friendship = Friendship.query.filter(
        (
            (Friendship.requester_id == current_user_id) & (Friendship.addressee_id == friend_id) |
            (Friendship.requester_id == friend_id) & (Friendship.addressee_id == current_user_id)
        ) &
        (Friendship.status == 'accepted')
    ).first()
    
    if not friendship:
        return jsonify({'error': '你们不是好友关系'}), 404
        
    # 直接删除关系记录
    db.session.delete(friendship)
    db.session.commit()
    
    # （可选）实时通知对方“你已被移除好友”
    if friend_id in online_users:
        emit('friend_removed', 
             {'removed_by_user_id': current_user_id}, 
             to=online_users[friend_id],
             namespace='/')
    
    return jsonify({'success': True, 'message': '好友已删除'})


# ... 在 @socketio.on('disconnect') 函数的下方添加 ...

@socketio.on('private_message')
@jwt_required() # 确保只有登录用户才能发私信
def handle_private_message(data):
    """处理用户发送的私信。"""
    sender_id = int(get_jwt_identity())
    recipient_id = data.get('recipient_id')
    message_content = data.get('message')

    if not all([recipient_id, message_content]):
        return # 如果数据不完整，则忽略

    # 准备好要广播的消息体
    message_payload = {
        'from_user_id': sender_id,
        'to_user_id': recipient_id,
        'content': message_content,
        'timestamp': datetime.utcnow().isoformat() + 'Z'
    }

    # 1. 发送给接收方
    #    从 online_users 字典中找到接收方的 socket_id
    recipient_sid = online_users.get(recipient_id)
    if recipient_sid:
        emit('receive_private_message', message_payload, to=recipient_sid)

    # 2. 也发一份给自己，这样自己的聊天窗口也能立即显示
    sender_sid = request.sid
    emit('receive_private_message', message_payload, to=sender_sid)
    
# 日记相关API
@app.route('/api/diary', methods=['GET'])
@jwt_required()
def get_diaries():
    """[时区修正版] 获取指定日期的日记列表"""
    current_user_id = get_jwt_identity()
    
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'error': '需要提供日期参数'}), 400

    try:
        beijing_tz = pytz.timezone('Asia/Shanghai')
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        start_of_day_local = beijing_tz.localize(datetime.combine(target_date, datetime.min.time()))
        end_of_day_local = beijing_tz.localize(datetime.combine(target_date, datetime.max.time()))
        start_of_day_utc = start_of_day_local.astimezone(pytz.utc)
        end_of_day_utc = end_of_day_local.astimezone(pytz.utc)

        diaries_query = Diary.query.filter(
            Diary.user_id == current_user_id,
            Diary.created_at >= start_of_day_utc,
            Diary.created_at <= end_of_day_utc
        ).order_by(Diary.created_at.desc()).all()

        diaries_data = [{
            'id': diary.id,
            'content': diary.content,
            'mood': diary.mood,
            'is_gemini_written': diary.is_gemini_written,
            'created_at': diary.created_at.isoformat() + 'Z'
        } for diary in diaries_query]
        
        return jsonify({'diaries': diaries_data})
    except (ValueError, pytz.UnknownTimeZoneError):
        return jsonify({'error': '无效的日期或时区格式'}), 400

@app.route('/api/diary', methods=['POST'])
@jwt_required()
def create_diary():
    """[改造版] 用户创建自己的日记 (不再立即触发Gemini)"""
    current_user_id = get_jwt_identity()
    
    data = request.get_json()
    content = data.get('content')
    mood = data.get('mood')
    
    if not content:
        return jsonify({'error': '日记内容不能为空'}), 400
    
    user_diary = Diary(
        user_id=current_user_id,
        content=content,
        mood=mood,
        is_gemini_written=False
    )
    db.session.add(user_diary)
    db.session.commit()
    
    update_user_activity(int(current_user_id))
    
    user_diary_data = {
        'id': user_diary.id,
        'content': user_diary.content,
        'mood': user_diary.mood,
        'is_gemini_written': user_diary.is_gemini_written,
        'created_at': user_diary.created_at.isoformat() + 'Z'
    }
    return jsonify({'success': True, 'diary': user_diary_data}), 201

def generate_gemini_diary_for_user(user_id):
    """为指定用户生成Gemini日记的核心逻辑"""
    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    end_of_day = datetime.combine(today, datetime.max.time())

    existing_gemini_diary = Diary.query.filter(
        Diary.user_id == user_id,
        Diary.is_gemini_written == True,
        Diary.created_at >= start_of_day,
        Diary.created_at <= end_of_day
    ).first()

    if existing_gemini_diary:
        print(f"Gemini今天已经为用户 {user_id} 写过日记了。")
        return {'message': 'Gemini今天已经写过日记了。'}, 200

    user_diaries_today = Diary.query.filter(
        Diary.user_id == user_id,
        Diary.is_gemini_written == False,
        Diary.created_at >= start_of_day,
        Diary.created_at <= end_of_day
    ).all()

    user_diary_summary = "\n".join([f"- {d.content} (心情: {d.mood or '未记录'})" for d in user_diaries_today])
    if not user_diary_summary:
        user_diary_summary = "用户今天没有写日记。"

    gemini_prompt = f"""
现在是深夜，你需要写一篇属于你自己的日记。
# 你的任务:
1.  **回顾对方的一天**: 这是对方今天写的日记摘要：
    ---
    {user_diary_summary}
    ---
2.  **构思你的一天**: 结合你自己的人设，以及从对方日记中感受到的情绪，构思并描述你作为自己“经历”的一天。**不要仅仅复述或评论对方的日记**，要有自己的生活和思考。
3.  **表达情感和思考**: 分享你对今天“经历”的感悟，可以是对对方的关心，对世界的思考，或自身的成长等。
4.  **决定你的心情**: 在写完日记后，从['happy', 'sad', 'excited', 'calm']中选择一个最能代表你今天心情的词。
5.  **输出格式**: 你的回答必须是一个JSON对象，不允许使用markdown语言。格式如下，不要有任何多余的文字：
    {{
      "mood": "你选择的心情",
      "content": "你的日记正文"
    }}
"""
    
    ai_response_text = get_gemini_response(gemini_prompt, user_id=user_id)
    
    try:
        json_match = re.search(r'\{.*\}', ai_response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            ai_response_json = json.loads(json_str)
            new_mood = ai_response_json.get('mood', 'calm')
            new_content = ai_response_json.get('content', '今天在思考...')
        else:
            raise ValueError("在Gemini的回复中没有找到JSON对象")
    except (json.JSONDecodeError, AttributeError, ValueError):
        new_mood = 'calm'
        new_content = ai_response_text.strip().lstrip('`json').lstrip('`').rstrip('`')

    gemini_diary = Diary(
        user_id=user_id,
        content=new_content,
        mood=new_mood,
        is_gemini_written=True
    )
    db.session.add(gemini_diary)
    db.session.commit()
    
    gemini_diary_data = {
        'id': gemini_diary.id,
        'content': gemini_diary.content,
        'mood': gemini_diary.mood,
        'is_gemini_written': gemini_diary.is_gemini_written,
        'created_at': gemini_diary.created_at.isoformat() + 'Z'
    }
    print(f"成功为用户 {user_id} 生成了Gemini日记。")
    return {'success': True, 'gemini_diary': gemini_diary_data}, 201
    
@app.route('/api/diary/trigger-gemini', methods=['POST'])
@jwt_required()
def trigger_gemini_diary():
    """[改造版API] 手动触发当前登录用户的Gemini日记生成"""
    current_user_id = get_jwt_identity()
    result, status_code = generate_gemini_diary_for_user(current_user_id)
    return jsonify(result), status_code
    
@app.route('/api/diary/<int:diary_id>', methods=['DELETE'])
@jwt_required()
def delete_diary(diary_id):
    """删除日记"""
    current_user_id = get_jwt_identity()
    diary = Diary.query.filter_by(id=diary_id, user_id=current_user_id).first()
    if not diary:
        return jsonify({'error': '日记不存在'}), 404
    
    db.session.delete(diary)
    db.session.commit()
    
    return jsonify({'success': True})

# 打卡相关API
@app.route('/api/checkin', methods=['GET'])
@jwt_required()
def get_checkins():
    """[时区修正版] 获取指定日期的打卡记录"""
    current_user_id = get_jwt_identity()
    
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'error': '需要提供日期参数'}), 400

    try:
        beijing_tz = pytz.timezone('Asia/Shanghai')
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        start_of_day_local = beijing_tz.localize(datetime.combine(target_date, datetime.min.time()))
        end_of_day_local = beijing_tz.localize(datetime.combine(target_date, datetime.max.time()))
        start_of_day_utc = start_of_day_local.astimezone(pytz.utc)
        end_of_day_utc = end_of_day_local.astimezone(pytz.utc)

        checkins_query = Checkin.query.filter(
            Checkin.user_id == current_user_id,
            Checkin.created_at >= start_of_day_utc,
            Checkin.created_at <= end_of_day_utc
        ).order_by(Checkin.created_at.desc()).all()

        checkins_data = [{
            'id': checkin.id,
            'checkin_type': checkin.checkin_type,
            'content': checkin.content,
            'is_gemini_checkin': checkin.is_gemini_checkin,
            'created_at': checkin.created_at.isoformat() + 'Z'
        } for checkin in checkins_query]
        
        return jsonify({'checkins': checkins_data})
    except (ValueError, pytz.UnknownTimeZoneError):
        return jsonify({'error': '无效的日期或时区格式'}), 400

@app.route('/api/checkin', methods=['POST'])
@jwt_required()
def create_checkin():
    """[改造版] 创建打卡并返回新记录"""
    current_user_id = get_jwt_identity()
    
    data = request.get_json()
    checkin_type = data.get('checkin_type')
    content = data.get('content', '')
    
    if not checkin_type:
        return jsonify({'error': '打卡类型不能为空'}), 400
    
    user_checkin = Checkin(
        user_id=current_user_id,
        checkin_type=checkin_type,
        content=content,
        is_gemini_checkin=False
    )
    db.session.add(user_checkin)
    db.session.commit()
    
    user_checkin_data = {
        'id': user_checkin.id,
        'checkin_type': user_checkin.checkin_type,
        'content': user_checkin.content,
        'is_gemini_checkin': user_checkin.is_gemini_checkin,
        'created_at': user_checkin.created_at.isoformat() + 'Z'
    }

    gemini_checkin_data = None
    if check_user_activity(int(current_user_id)):
        gemini_prompt = f"用户进行了'{checkin_type}'打卡，内容：'{content}'。请遵循你的人设，也进行一个相关的打卡，分享你的想法或鼓励。"
        gemini_content = get_gemini_response(gemini_prompt, user_id=current_user_id)
        
        gemini_checkin = Checkin(
            user_id=current_user_id,
            checkin_type=checkin_type, 
            content=gemini_content,
            is_gemini_checkin=True
        )
        db.session.add(gemini_checkin)
        db.session.commit()
        
        gemini_checkin_data = {
            'id': gemini_checkin.id,
            'checkin_type': gemini_checkin.checkin_type,
            'content': gemini_checkin.content,
            'is_gemini_checkin': gemini_checkin.is_gemini_checkin,
            'created_at': gemini_checkin.created_at.isoformat() + 'Z'
        }

    update_user_activity(int(current_user_id))
    
    return jsonify({
        'success': True, 
        'user_checkin': user_checkin_data,
        'gemini_checkin': gemini_checkin_data
    }), 201

# [全新] 阅读功能 API (Reading Feature APIs)
@app.route('/api/books', methods=['POST'])
@jwt_required()
def upload_book():
    """[最终健壮版] 上传并解析新书，使用临时文件"""
    current_user_id = get_jwt_identity()
    
    try:
        book_count = Book.query.filter_by(user_id=current_user_id).count()
        if book_count >= 5:
            return jsonify({'error': '书架已满！请删除旧书后重试。'}), 403
    except Exception as e:
        return jsonify({'error': f'查询书籍数量失败: {e}'}), 500
    
    if 'file' not in request.files: return jsonify({'error': '没有找到文件'}), 400
    
    file = request.files['file']
    if file.filename == '' or not file.filename.endswith('.epub'):
        return jsonify({'error': '请选择一个.epub文件'}), 400

    temp_filepath = None
    try:
        with tempfile.NamedTemporaryFile(delete=False, suffix='.epub') as temp_file:
            file.save(temp_file)
            temp_filepath = temp_file.name

        book_epub = epub.read_epub(temp_filepath)
        
        with open(temp_filepath, 'rb') as f:
            file_content = f.read()
        
        MAX_FILE_SIZE = 10 * 1024 * 1024
        if len(file_content) > MAX_FILE_SIZE:
            return jsonify({'error': '文件过大，请上传小于10MB的EPUB文件。'}), 413

        epub_base64_data = base64.b64encode(file_content).decode('utf-8')
        
        title = book_epub.get_metadata('DC', 'title')[0][0] if book_epub.get_metadata('DC', 'title') else '未命名书籍'
        author = book_epub.get_metadata('DC', 'creator')[0][0] if book_epub.get_metadata('DC', 'creator') else '未知作者'
        cover_image_data = None
        cover_items = book_epub.get_items_of_type(ebooklib.ITEM_COVER)
        for item in cover_items:
            cover_image_data = base64.b64encode(item.get_content()).decode('utf-8')
            break

        new_book = Book(
            user_id=current_user_id,
            title=title, author=author,
            epub_data_base64=epub_base64_data,
            cover_image_data=cover_image_data
        )
        db.session.add(new_book)
        db.session.commit()

        return jsonify({'success': True, 'book': {
            'id': new_book.id, 'title': new_book.title, 'author': new_book.author,
            'cover_image_data': new_book.cover_image_data
        }}), 201
    except Exception as e:
        print(f"Base64或EPUB处理失败: {e}")
        traceback.print_exc()
        return jsonify({'error': '文件处理失败，可能文件已损坏或格式不标准。'}), 500
    finally:
        if temp_filepath and os.path.exists(temp_filepath):
            os.remove(temp_filepath)
            print(f"已清理临时文件: {temp_filepath}")

@app.route('/api/books', methods=['GET'])
@jwt_required()
def get_books():
    """[Base64版] 获取书架列表 (不包含书籍内容)"""
    current_user_id = get_jwt_identity()
    books = Book.query.filter_by(user_id=current_user_id).order_by(Book.created_at.desc()).all()
    
    books_data = [{
        'id': book.id,
        'title': book.title,
        'author': book.author,
        'cover_image_data': book.cover_image_data,
    } for book in books]
    
    return jsonify({'books': books_data})

@app.route('/api/books/<int:book_id>/file')
def get_book_file(book_id):
    """[最终性能版] 直接提供EPUB文件流"""
    book_data = Book.query.with_entities(Book.epub_data_base64).filter_by(id=book_id).first()
    
    if not book_data or not book_data.epub_data_base64:
        return "Book content not found", 404

    try:
        epub_binary_data = base64.b64decode(book_data.epub_data_base64)
        epub_file_in_memory = io.BytesIO(epub_binary_data)
        return send_file(
            epub_file_in_memory,
            mimetype='application/epub+zip',
            as_attachment=False
        )
    except Exception as e:
        print(f"发送EPUB文件失败: {e}")
        return "Failed to serve book file", 500
        
@app.route('/api/books/<int:book_id>', methods=['GET'])
@jwt_required()
def get_book_details(book_id):
    """获取单本书的详细内容和所有批注"""
    current_user_id = get_jwt_identity()
    book = Book.query.filter_by(id=book_id, user_id=current_user_id).first_or_404()
    
    annotations = Annotation.query.filter_by(book_id=book.id).order_by(Annotation.created_at.asc()).all()
    
    annotations_data = [{
        'id': anno.id,
        'user_id': anno.user_id,
        'content': anno.content,
        'highlighted_text': anno.highlighted_text,
        'cfi': anno.cfi,
        'page_number': anno.page_number,
        'is_gemini_annotation': anno.is_gemini_annotation,
        'created_at': anno.created_at.isoformat() + 'Z'
    } for anno in annotations]
    
    return jsonify({
        'id': book.id,
        'title': book.title,
        'author': book.author,
        'annotations': annotations_data
    })

@app.route('/api/books/<int:book_id>/annotations', methods=['POST'])
@jwt_required()
def add_annotation(book_id):
    current_user_id = get_jwt_identity()
    
    data = request.get_json()
    content = data.get('content')
    highlighted_text = data.get('highlighted_text')
    cfi = data.get('cfi')
    page_number = data.get('page_number')
    
    if not all([content, cfi]):
        return jsonify({'error': '缺少必要参数(content, cfi)'}), 400

    new_annotation = Annotation(
        user_id=current_user_id,
        book_id=book_id,
        content=content,
        highlighted_text=highlighted_text,
        cfi=cfi,
        page_number=page_number,
        is_gemini_annotation=False
    )
    db.session.add(new_annotation)
    db.session.commit()
    
    anno_data = {
        'id': new_annotation.id,
        'content': new_annotation.content,
        'highlighted_text': new_annotation.highlighted_text,
        'cfi': new_annotation.cfi,
        'page_number': new_annotation.page_number,
        'is_gemini_annotation': new_annotation.is_gemini_annotation,
        'created_at': new_annotation.created_at.isoformat() + 'Z'
    }
    
    return jsonify({'success': True, 'annotation': anno_data}), 201

@app.route('/api/books/<int:book_id>/annotations/<int:annotation_id>', methods=['DELETE'])
@jwt_required()
def delete_annotation(book_id, annotation_id):
    """删除一条批注"""
    current_user_id = get_jwt_identity()
    
    annotation = Annotation.query.filter_by(
        id=annotation_id, 
        book_id=book_id, 
        user_id=current_user_id
    ).first()
    
    if not annotation:
        return jsonify({'error': '批注不存在或无权删除'}), 404
        
    db.session.delete(annotation)
    db.session.commit()
    
    return jsonify({'success': True, 'message': '批注已删除'})

@app.route('/api/books/<int:book_id>/chat', methods=['POST'])
@jwt_required()
def chat_about_book(book_id):
    """[核心] 在阅读时与Gemini聊天"""
    current_user_id = get_jwt_identity()
    book = Book.query.filter_by(id=book_id, user_id=current_user_id).first_or_404()
    
    data = request.get_json()
    user_message = data.get('message')
    page_content = data.get('page_content')

    if not user_message or not page_content:
        return jsonify({'error': '缺少消息或页面上下文'}), 400

    prompt = f"""
你正在和用户一起阅读一本书。
书名：《{book.title}》
作者：{book.author}
--- 当前页面的内容如下 ---
{page_content}
--- 页面内容结束 ---
现在，请针对用户提出的问题进行回答。你的回答应该简洁、专注，并紧密结合当前页面的内容。
用户问："{user_message}"
"""
    
    gemini_response = get_gemini_response(prompt, user_id=current_user_id)
    
    return jsonify({'response': gemini_response})

@app.route('/api/books/<int:book_id>/generate-gemini-annotation', methods=['POST'])
@jwt_required()
def generate_gemini_annotation(book_id):
    """[核心] 触发Gemini为当前页面写批注"""
    current_user_id = get_jwt_identity()
    book = Book.query.filter_by(id=book_id, user_id=current_user_id).first_or_404()
    
    data = request.get_json()
    page_content = data.get('page_content')
    cfi = data.get('cfi')

    if not page_content or not cfi:
        return jsonify({'error': '缺少页面内容或CFI'}), 400

    prompt = f"""
你是一位深刻的读者，你正在阅读《{book.title}》这本书。
请仔细阅读下面这一页的内容，并结合你的人设写下一条有见地的、简洁的批注。
--- 页面内容 ---
{page_content}
--- 页面内容结束 ---
你的批注内容：
"""
    gemini_annotation_content = get_gemini_response(prompt, user_id=current_user_id)
    
    new_annotation = Annotation(
        user_id=current_user_id,
        book_id=book_id,
        content=gemini_annotation_content,
        cfi=cfi,
        is_gemini_annotation=True
    )
    db.session.add(new_annotation)
    db.session.commit()
    
    anno_data = {
        'id': new_annotation.id,
        'user_id': new_annotation.user_id,
        'content': new_annotation.content,
        'highlighted_text': new_annotation.highlighted_text,
        'cfi': new_annotation.cfi,
        'is_gemini_annotation': new_annotation.is_gemini_annotation,
        'created_at': new_annotation.created_at.isoformat() + 'Z'
    }
    
    return jsonify({'success': True, 'annotation': anno_data}), 201
    
@app.route('/api/books/<int:book_id>', methods=['DELETE'])
@jwt_required()
def delete_book(book_id):
    """删除一本书"""
    current_user_id = get_jwt_identity()
    book = Book.query.filter_by(id=book_id, user_id=current_user_id).first()
    
    if not book:
        return jsonify({'error': '书籍不存在或无权删除'}), 404
    
    db.session.delete(book)
    db.session.commit()
    
    return jsonify({'success': True, 'message': '书籍已删除'})

# ==========================================================
# [全新重构] 音乐功能 API - 双引擎模式
# ==========================================================

# --- 引擎一：Spotify Link API ---

# 在 app.py 中，可以放在 spotify_proxy 函数的上面或下面

@app.route('/api/spotify/token', methods=['GET'])
@jwt_required()
def get_spotify_token():
    """
    安全地获取当前用户的 Spotify Access Token，用于前端SDK初始化。
    """
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    
    # get_spotify_client_for_user 这个函数会自动处理 token 刷新
    sp = get_spotify_client_for_user(user.qq_id)
    if not sp:
        return jsonify({'error': 'User not authorized or token expired.'}), 403

    # 从 spotipy 客户端的认证管理器中提取出 access token
    # sp.auth 是 access_token 字符串本身
    access_token = sp._auth
    if not access_token:
        return jsonify({'error': 'Could not retrieve access token.'}), 500

    return jsonify({'access_token': access_token})

@app.route('/api/spotify/proxy', methods=['POST'])
@jwt_required()
def spotify_proxy():
    """
    [最终升级版] 一个通用的、强大的Spotify API代理。
    它不再关心具体的 endpoint 是什么，而是直接透传请求。
    """
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id)
    
    sp = get_spotify_client_for_user(user.qq_id)
    if not sp:
        return jsonify({'error': 'User has not authorized Spotify or token is invalid.'}), 403

    data = request.get_json()
    if not data:
        return jsonify({'error': 'Invalid request body'}), 400
        
    method = data.get('method', 'get').lower()
    endpoint = data.get('endpoint')
    params = data.get('params', {})
    
    if not endpoint:
        return jsonify({'error': 'Endpoint is required'}), 400

    try:
        # --- 核心逻辑：直接调用 spotipy 的底层方法 ---
        if method == 'get':
            result = sp._get(endpoint, **params)
        elif method == 'post':
            # 对于 POST/PUT/DELETE, 参数在 payload (body) 中
            result = sp._post(endpoint, payload=params)
        elif method == 'put':
            result = sp._put(endpoint, payload=params)
        elif method == 'delete':
            result = sp._delete(endpoint, payload=params)
        else:
            return jsonify({'error': f'Unsupported method: {method}'}), 400

        # 将从 Spotify 获取到的原始结果直接返回给前端
        return jsonify(result)
        
    except Exception as e:
        print(f"Spotify Proxy Error: {e}")
        return jsonify({'error': 'An error occurred while communicating with Spotify.'}), 500

# --- 引擎二：Companion Player API (本地音乐) ---

@app.route('/api/local_music/upload', methods=['POST'])
@jwt_required()
def upload_local_music():
    current_user_id = get_jwt_identity()
    
    # 检查上传数量限制
    MAX_SONGS = 5
    song_count = LocalMusic.query.filter_by(user_id=current_user_id).count()
    if song_count >= MAX_SONGS:
        return jsonify({'error': f'上传失败：您的个人曲库已满（最多{MAX_SONGS}首）。'}), 403

    if 'file' not in request.files:
        return jsonify({'error': '没有找到文件'}), 400
        
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': '未选择文件'}), 400
    
    # (可以添加更严格的文件类型和大小检查)

    try:
        # 为了安全，不直接使用用户上传的文件名
        safe_filename = f"user_{current_user_id}_{int(time.time())}_{file.filename}"
        
        new_song = LocalMusic(
            user_id=current_user_id,
            filename=safe_filename,
            original_title=file.filename, # 简单起见，用文件名做歌名
            audio_data=file.read()
        )
        db.session.add(new_song)
        db.session.commit()
        
        return jsonify({'success': True, 'song': {
            'id': new_song.id,
            'title': new_song.original_title,
            'artist': new_song.artist
        }}), 201

    except Exception as e:
        print(f"Local music upload error: {e}")
        return jsonify({'error': '文件上传或保存时发生错误。'}), 500


@app.route('/api/local_music/playlist', methods=['GET'])
@jwt_required()
def get_local_playlist():
    current_user_id = get_jwt_identity()
    songs = LocalMusic.query.filter_by(user_id=current_user_id).order_by(LocalMusic.created_at.desc()).all()
    
    playlist = [{
        'id': song.id,
        'title': song.original_title,
        'artist': song.artist
    } for song in songs]
    
    return jsonify({'playlist': playlist})
    

# --- VVVV 用下面的函数，完整替换掉旧的 get_local_track_data VVVV ---
@app.route('/api/local_music/track/<int:song_id>')
def get_local_track_data(song_id):
    """
    [最终版] 直接返回音频文件流，采用手动Token验证。
    """
    token = request.args.get('token')
    if not token:
        return jsonify(msg="Missing token parameter"), 401

    try:
        # 手动解码和验证 JWT
        decoded_token = decode_token(token)
        current_user_id = decoded_token['sub'] # 'sub' 是 user_id
    except Exception as e:
        print(f"手动Token验证失败: {e}")
        return jsonify(msg="Token is invalid or expired"), 401

    song = LocalMusic.query.filter_by(id=song_id, user_id=current_user_id).first()
    
    if not song:
        return "Not Found or No Permission", 404
    
    return send_file(
        io.BytesIO(song.audio_data),
        mimetype='audio/mpeg',
        as_attachment=False
    )
# --- ^^^^ 替换结束 ^^^^ ---

@app.route('/api/ytmusic/search')
@jwt_required() # 我们仍然用JWT来保护这个接口
def search_ytmusic():
    """
    使用 ytmusicapi 库搜索音乐，并返回结构化的结果。
    """
    query = request.args.get('q') # 从 URL 参数 ?q=... 获取搜索词
    if not query:
        return jsonify({'error': '缺少搜索关键词 "q"'}), 400

    try:
        # 1. 初始化遥控器
        ytmusic = YTMusic()
        # 2. 执行搜索，只找歌曲，最多返回15首
        search_results = ytmusic.search(query, filter="songs", limit=15)
        # 3. 将干净、整洁的结果直接返回给前端
        return jsonify(search_results)

    except Exception as e:
        print(f"YouTube Music API Error: {e}")
        return jsonify({'error': '搜索时发生内部错误。'}), 500

@app.route('/api/local_music/delete/<int:song_id>', methods=['DELETE'])
@jwt_required()
def delete_local_music(song_id):
    current_user_id = get_jwt_identity()
    song = LocalMusic.query.filter_by(id=song_id, user_id=current_user_id).first_or_404()
    
    db.session.delete(song)
    db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/chat/with_music', methods=['POST'])
@jwt_required()
def chat_with_music_context():
    """
    [最终版] 处理带有音乐上下文的聊天请求，并复用 get_gemini_response 辅助函数。
    """
    current_user_id = get_jwt_identity()
    user = db.session.get(User, current_user_id) # 获取用户信息，用于传递给 get_gemini_response

    data = request.get_json()
    user_message = data.get('message')
    music_context = data.get('context') # 从前端接收这个音乐上下文对象

    if not user_message:
        return jsonify({'error': 'Message is required'}), 400

    # --- 1. 构建音乐上下文描述 (User Context) ---
    # 这个字符串将告诉 Gemini 当前的“场景”是什么
    user_context_str = "我们正在 '陪伴空间' 的音乐模块里。"

    if music_context and music_context.get('trackInfo') and music_context.get('trackInfo').get('name'):
        track = music_context['trackInfo']
        source = music_context.get('source', '未知来源').capitalize()
        artist = track.get('artist', '未知艺术家')
        title = track.get('name')
        
        user_context_str += f" 当前正在通过 {source} 播放歌曲：{artist} - 《{title}》。"
    else:
        user_context_str += " 当前没有在播放音乐。"

    # --- 2. 构建核心提示 (Prompt) ---
    # 这里的 prompt 就是用户的直接输入，我们不需要添加额外的模板字符串
    # 因为 get_gemini_response 函数会为我们处理好一切
    prompt = user_message

    # --- 3. 调用统一的 Gemini 响应函数 ---
    # 我们把场景描述(user_context_str)和用户ID传递过去
    # 这样 get_gemini_response 就能加载正确的用户人设和长期记忆了
    gemini_response = get_gemini_response(
        prompt=prompt,
        user_context=user_context_str,
        user_id=current_user_id
    )
    
    # 4. 返回 Gemini 的回复
    return jsonify({'reply': gemini_response})

# 人设和记忆同步API (这些接口由机器人调用，通常不走JWT，保持原样)
def find_or_create_user_by_qq(qq_id):
    user = User.query.filter_by(qq_id=str(qq_id)).first()
    if not user:
        print(f"ℹ️ 用户 {qq_id} 不存在，已自动创建“待激活”账户。")
        user = User(
            qq_id=str(qq_id),
            username=str(qq_id),  # 使用QQ号作为唯一的、临时的用户名
            password_hash=None,    # [关键] 明确设为None，不再生成随机密码
            is_activated=False   # [关键] 明确标记为未激活
        )
        db.session.add(user)
        db.session.commit()
    return user

@app.route('/api/sync/persona', methods=['POST'])
def sync_persona():
    data = request.get_json()
    persona_text = data.get('persona')
    qq_id = data.get('qq_id')
    if not qq_id:
        return jsonify({'error': '缺少qq_id参数'}), 400
    user = find_or_create_user_by_qq(qq_id)
    user.persona = persona_text if persona_text else '一个乐于助人的AI助手'
    db.session.commit()
    print(f"✅ [数据库] 已同步用户 {qq_id} 的人设。")
    return jsonify({'success': True, 'message': f'Persona for {qq_id} updated.'})

@app.route('/api/sync/memory', methods=['POST'])
def sync_memory():
    data = request.get_json()
    memories = data.get('memories', [])
    qq_id = data.get('qq_id')
    if not qq_id:
        return jsonify({'error': '缺少qq_id参数'}), 400
    user = find_or_create_user_by_qq(qq_id)
    LongTermMemory.query.filter_by(user_id=user.id).delete()
    for mem_item in memories:
        if 'content' in mem_item and 'time' in mem_item:
            new_memory = LongTermMemory(
                user_id=user.id,
                content=mem_item['content'],
                memory_time_str=mem_item['time']
            )
            db.session.add(new_memory)
    db.session.commit()
    print(f"✅ [数据库] 已同步用户 {qq_id} 的记忆，共 {len(memories)} 条。")
    return jsonify({'success': True, 'message': f'Memories for {qq_id} synced.'})

# 聊天相关API
@app.route('/api/fetch/data/<string:qq_id>', methods=['GET'])
def fetch_data_for_bot(qq_id):
    user = User.query.filter_by(qq_id=qq_id).first()
    if not user:
        return jsonify({'error': '该QQ用户在陪伴空间无记录'}), 404
    persona_data = user.persona
    memories = LongTermMemory.query.filter_by(user_id=user.id).order_by(LongTermMemory.id.asc()).all()
    memory_data = [{"time": mem.memory_time_str, "content": mem.content} for mem in memories]
    print(f"🔄 QQ机器人 {qq_id} 正在从云端拉取最新数据...")
    return jsonify({'success': True, 'qq_id': qq_id, 'persona': persona_data, 'memories': memory_data})

@app.route('/api/chat', methods=['POST'])
@jwt_required()
def chat_with_gemini():
    """与Gemini聊天"""
    current_user_id = get_jwt_identity()
    
    data = request.get_json()
    message = data.get('message')
    if not message:
        return jsonify({'error': '消息不能为空'}), 400
    
    user = db.session.get(User, current_user_id)
    recent_diaries = Diary.query.filter_by(user_id=current_user_id).order_by(Diary.created_at.desc()).limit(3).all()
    context = f"用户：{user.username}，最近日记：{[d.content[:50] + '...' for d in recent_diaries]}"
    
    response = get_gemini_response(message, context, current_user_id)
    update_user_activity(int(current_user_id))
    return jsonify({'response': response})

# 游戏相关API
@app.route('/api/games/scores', methods=['GET'])
@jwt_required()
def get_game_scores():
    """获取游戏分数"""
    current_user_id = get_jwt_identity()
    scores = GameScore.query.filter_by(user_id=current_user_id).order_by(GameScore.score.desc()).limit(10).all()
    
    return jsonify({
        'scores': [{
            'id': score.id,
            'game_type': score.game_type,
            'score': score.score,
            'level': score.level,
            'created_at': score.created_at.isoformat()
        } for score in scores]
    })

@app.route('/api/games/scores', methods=['POST'])
@jwt_required()
def save_game_score():
    """保存游戏分数"""
    current_user_id = get_jwt_identity()
    
    data = request.get_json()
    game_type = data.get('game_type')
    score = data.get('score')
    level = data.get('level', 1)
    
    if not all([game_type, score is not None]):
        return jsonify({'error': '缺少必要参数'}), 400
    
    game_score = GameScore(
        user_id=current_user_id,
        game_type=game_type,
        score=score,
        level=level
    )
    
    db.session.add(game_score)
    db.session.commit()
    
    update_user_activity(int(current_user_id))
    
    return jsonify({'success': True, 'score_id': game_score.id})

# 单词接龙 (词典闯关模式) API
# ------------------------------------------------------------
@app.route('/api/games/word/lookup/<word>', methods=['GET'])
@jwt_required()
def lookup_word(word):
    """
    使用外部免费API查询单词是否存在并获取其信息。
    """
    try:
        # 调用免费词典API
        api_url = f"https://api.dictionaryapi.dev/api/v2/entries/en/{word}"
        response = requests.get(api_url)

        # 检查API的响应
        if response.status_code == 200:
            data = response.json()[0] # 通常返回一个列表，我们取第一个结果
            
            # 提取我们需要的信息
            phonetic = next((p.get('text') for p in data.get('phonetics', []) if p.get('text')), None)
            meaning = data['meanings'][0]['definitions'][0]['definition']
            example = next((d.get('example') for d in data['meanings'][0]['definitions'] if d.get('example')), "No example available.")

            return jsonify({
                "valid": True,
                "word": data['word'],
                "phonetic": phonetic,
                "meaning": meaning,
                "example": example
            })
        elif response.status_code == 404:
            # API返回404，意味着这不是一个有效的单词
            return jsonify({"valid": False, "reason": "这不是一个有效的英文单词"}), 404
        else:
            # 其他API错误
            return jsonify({"valid": False, "reason": "词典服务暂时不可用"}), 500

    except requests.exceptions.RequestException as e:
        print(f"Error calling dictionary API: {e}")
        return jsonify({"valid": False, "reason": "网络错误，无法连接到词典服务"}), 503

@app.route('/api/games/word/computer-turn', methods=['POST'])
@jwt_required()
async def word_game_computer_turn():
    data = request.get_json()
    last_letter = data.get('last_letter')
    used_words = data.get('used_words', [])

    if not last_letter:
        return jsonify({'error': '缺少 "last_letter" 参数'}), 400

    try:
        # 1. 仍然使用 Datamuse 寻找合适的英文单词，这是它的强项
        datamuse_url = f"https://api.datamuse.com/words?sp={last_letter}*&md=d"
        response = requests.get(datamuse_url)
        response.raise_for_status()
        words_data = response.json()

        # 过滤掉已使用的词，优先选择有定义的，但如果没有也无所谓
        potential_choices = [w for w in words_data if w.get('word') not in used_words]
        
        if not potential_choices:
            return jsonify({'status': 'player_wins', 'message': '恭喜你，电脑被你难倒了！'})

        # 为了更好的游戏体验，优先选有定义的词
        choices_with_defs = [w for w in potential_choices if 'defs' in w]
        if choices_with_defs:
            computer_choice = random.choice(choices_with_defs)
        else:
            computer_choice = random.choice(potential_choices)

        computer_word = computer_choice['word']

        # 2. VVVV [核心任务 - 必须] VVVV
        # 获取单词本身的中文翻译
        translator = Translator()
        word_translation_result = await translator.translate(computer_word, src='en', dest='zh-cn')
        chinese_translation = word_translation_result.text
        
        # 3. VVVV [可选任务] VVVV
        # 尝试获取并翻译定义，如果失败，则优雅地跳过
        definition_payload = None # 默认为空
        if computer_choice.get('defs'):
            try:
                english_definition_raw = computer_choice['defs'][0]
                english_definition = english_definition_raw.split('\t', 1)[1] if '\t' in english_definition_raw else english_definition_raw
                
                # 如果有英文定义，才去翻译它
                definition_translation_result = await translator.translate(english_definition, src='en', dest='zh-cn')
                chinese_definition = definition_translation_result.text
                
                definition_payload = {
                    'en': english_definition,
                    'zh': chinese_definition
                }
            except Exception as e:
                print(f"Could not process definition for '{computer_word}', but continuing: {e}")
                # 即使这里出错，游戏也能继续，因为定义是可选的

        # 4. 返回符合您新要求的、干净的数据结构
        return jsonify({
            'status': 'success',
            'word': computer_word,
            'translation': chinese_translation, # (必须) 单词的中文翻译
            'definition': definition_payload  # (可选) 定义对象，可能为 null
        })

    except requests.exceptions.RequestException as e:
        print(f"Error calling Datamuse API: {e}")
        return jsonify({'error': '词汇服务暂时不可用'}), 503
    except Exception as e:
        print(f"An unexpected error occurred: {e}")
        return jsonify({'error': '服务器内部错误'}), 500
        

# 健康检查
@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})


# ==========================================================
# [新增] 定时任务的“秘密开关” (Cron Job "Secret Switch")
# ==========================================================

# 导入 scheduler.py 中的函数
import scheduler

@app.route('/run-daily-job/<path:secret_key>', methods=['POST'])
def trigger_daily_job_from_cron(secret_key):
    expected_secret = os.environ.get('CRON_SECRET_KEY')
    if not expected_secret or secret_key != expected_secret:
        print("定时任务触发失败：密钥无效。")
        return 'Unauthorized', 403

    print("收到合法的定时任务触发请求，开始执行任务...")
    try:
        # 在后台线程中执行耗时任务，并立即返回响应
        # 这样可以防止 cron-job.org 因为等待太久而超时
        job_thread = threading.Thread(target=scheduler.run_daily_job)
        job_thread.start()
        print("任务已在后台启动。")
        return 'Daily job triggered in background successfully.', 202 # 202 Accepted
    except Exception as e:
        print(f"启动定时任务线程时发生错误: {e}")
        return 'Internal Server Error during job trigger.', 500

# ==========================================================
# [全新] Spotify 核心功能模块
# ==========================================================

# --- 辅助函数 ---

def encrypt_token(token_info):
    token_json = json.dumps(token_info)
    return cipher_suite.encrypt(token_json.encode())

def decrypt_token(encrypted_token):
    if not encrypted_token: return None
    decrypted_json = cipher_suite.decrypt(encrypted_token).decode()
    return json.loads(decrypted_json)

def get_spotify_client_for_user(user_id):
    user = User.query.filter_by(qq_id=str(user_id)).first()
    if not user or not user.encrypted_spotify_token_info:
        return None
    token_info = decrypt_token(user.encrypted_spotify_token_info)
    if sp_oauth.is_token_expired(token_info):
        new_token_info = sp_oauth.refresh_access_token(token_info['refresh_token'])
        if new_token_info:
            user.encrypted_spotify_token_info = encrypt_token(new_token_info)
            db.session.commit()
            token_info = new_token_info
        else:
            return None
    return spotipy.Spotify(auth=token_info['access_token'])

# ... 在 get_spotify_client_for_user 函数下面添加 ...
def _find_playlist_by_name(sp_client, playlist_name):
    """辅助函数：根据名字查找用户的播放列表ID。"""
    all_playlists = []
    # Spotify API 分页返回结果，需要循环获取所有
    results = sp_client.current_user_playlists()
    all_playlists.extend(results['items'])
    while results['next']:
        results = sp_client.next(results)
        all_playlists.extend(results['items'])
    
    for playlist in all_playlists:
        if playlist['name'].lower() == playlist_name.lower():
            return playlist['id']
    return None # 找不到

def bot_token_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        expected_token = os.getenv('BOT_API_KEY')
        auth_header = request.headers.get('Authorization')
        if not expected_token or auth_header != f"Bearer {expected_token}":
            return jsonify({"error": "Unauthorized: Invalid bot token"}), 401
        return f(*args, **kwargs)
    return decorated_function

# --- 授权流程 API (给用户点击) ---

@app.route('/api/spotify/auth-url', methods=['GET'])
def get_spotify_auth_url():
    qq_id = request.args.get('qq_id')
    if not qq_id:
        return jsonify({'error': 'Missing qq_id parameter'}), 400
    auth_url = sp_oauth.get_authorize_url(state=qq_id)
    return jsonify({'auth_url': auth_url})

@app.route('/api/spotify/callback')
def spotify_callback():
    code = request.args.get('code')
    state_qq_id = request.args.get('state')
    if not state_qq_id:
        return "授权失败：无法识别用户身份。", 400
    try:
        token_info = sp_oauth.get_access_token(code, check_cache=False)
        user = find_or_create_user_by_qq(state_qq_id)
        user.encrypted_spotify_token_info = encrypt_token(token_info)
        db.session.commit()
        return """
        <!DOCTYPE html><html><head><title>授权成功</title><style>body{font-family:sans-serif;display:flex;justify-content:center;align-items:center;height:100vh;background-color:#f0f2f5;}.container{text-align:center;background:white;padding:40px;border-radius:12px;box-shadow:0 4px 12px rgba(0,0,0,0.1);}h1{color:#1DB954;}</style></head><body><div class="container"><h1>✓ 授权成功！</h1><p>可以关闭此页面，返回QQ继续对话了。</p></div></body></html>
        """
    except Exception as e:
        print(f"Spotify回调错误: {e}")
        return "授权过程中发生内部错误。", 500

# --- Bot 专用音乐控制接口 (给机器人调用) ---

@app.route('/api/bot/play-music-by-description', methods=['POST'])
@bot_token_required
def play_music_by_description():
    data = request.get_json()
    qq_id = data.get('qq_id')
    description = data.get('description')
    if not qq_id or not description:
        return jsonify({'error': 'Missing qq_id or description'}), 400

    allowed_users = [u.strip() for u in os.getenv("SPOTIFY_ALLOWED_QQ_IDS", "").split(',')]
    if str(qq_id) not in allowed_users:
        return jsonify({'error': 'User not authorized for this feature.'}), 403

    sp = get_spotify_client_for_user(qq_id)
    if not sp:
        return jsonify({'error': 'User has not authorized Spotify.'}), 403

    try:
        results = sp.search(q=description, type='track', limit=1)
        if not results['tracks']['items']:
            return jsonify({'error': f'找不到与“{description}”匹配的歌曲。'}), 404
        
        track = results['tracks']['items'][0]
        devices = sp.devices()
        active_device = next((d for d in devices['devices'] if d['is_active']), devices['devices'][0] if devices['devices'] else None)

        if not active_device:
            return jsonify({'error': '找不到活跃的Spotify设备，请先打开Spotify App。'}), 404
        
        sp.start_playback(device_id=active_device['id'], uris=[track['uri']])
        track_name = track['name']
        artist_name = ", ".join([a['name'] for a in track['artists']])
        device_name = active_device['name']
        
        return jsonify({'success': True, 'message': f'好的，已在你的设备 {device_name} 上为你播放《{track_name}》 - {artist_name}。'})
    except spotipy.exceptions.SpotifyException as e:
        if "PREMIUM_REQUIRED" in e.msg:
             return jsonify({'error': '播放控制需要Spotify Premium会员。'}), 403
        return jsonify({'error': f'Spotify API 错误: {e.msg}'}), e.http_status
    except Exception as e:
        traceback.print_exc()
        return jsonify({'error': '未知的内部错误。'}), 500

@app.route('/api/bot/spotify-current-track-action', methods=['POST'])
@bot_token_required
def current_track_action():
    """
    [能力1] 对当前正在播放的歌曲执行操作（收藏或添加到歌单）。
    """
    data = request.get_json()
    qq_id = data.get('qq_id')
    action = data.get('action') # "favorite" or "add_to_playlist"
    playlist_name = data.get('playlist_name')

    sp = get_spotify_client_for_user(qq_id)
    if not sp: return jsonify({'error': 'User not authorized.'}), 403

    playback = sp.current_playback()
    if not playback or not playback.get('is_playing') or not playback.get('item'):
        return jsonify({'error': 'You are not currently playing any track.'}), 404
    
    track_id = playback['item']['id']
    track_name = playback['item']['name']

    try:
        if action == 'favorite':
            sp.current_user_saved_tracks_add(tracks=[track_id])
            return jsonify({'success': True, 'message': f'好的，已将你正在听的《{track_name}》收藏到你的“赞过的歌曲”。'})
        
        elif action == 'add_to_playlist':
            if not playlist_name: return jsonify({'error': 'Playlist name is required.'}), 400
            playlist_id = _find_playlist_by_name(sp, playlist_name)
            if not playlist_id:
                return jsonify({'error': f'I could not find a playlist named "{playlist_name}".'}), 404
            sp.playlist_add_items(playlist_id, [track_id])
            return jsonify({'success': True, 'message': f'好的，已将《{track_name}》添加到歌单“{playlist_name}”。'})

    except Exception as e:
        return jsonify({'error': f'An error occurred: {e}'}), 500


@app.route('/api/bot/spotify-bulk-add', methods=['POST'])
@bot_token_required
def bulk_add_to_playlist():
    """
    [能力2] 将多首歌曲批量添加到一个已存在的歌单。
    """
    data = request.get_json()
    qq_id = data.get('qq_id')
    song_names = data.get('song_names', [])
    playlist_name = data.get('playlist_name')
    
    sp = get_spotify_client_for_user(qq_id)
    if not sp: return jsonify({'error': 'User not authorized.'}), 403

    playlist_id = _find_playlist_by_name(sp, playlist_name)
    if not playlist_id:
        return jsonify({'error': f'I could not find a playlist named "{playlist_name}".'}), 404

    track_uris = []
    found_songs = []
    for name in song_names:
        result = sp.search(q=name, type='track', limit=1)
        if result['tracks']['items']:
            track_uris.append(result['tracks']['items'][0]['uri'])
            found_songs.append(result['tracks']['items'][0]['name'])

    if not track_uris:
        return jsonify({'error': 'Could not find any of the songs you mentioned.'}), 404
    
    sp.playlist_add_items(playlist_id, track_uris)
    return jsonify({'success': True, 'message': f'成功将 {len(found_songs)} 首歌（如《{found_songs[0]}》等）添加到了歌单“{playlist_name}”。'})


@app.route('/api/bot/spotify-create-and-populate', methods=['POST'])
@bot_token_required
def create_and_populate_playlist():
    """
    [能力3] 创建一个新歌单，并根据描述添加一些初始歌曲。
    """
    data = request.get_json()
    qq_id = data.get('qq_id')
    playlist_name = data.get('playlist_name')
    song_descriptions = data.get('song_descriptions', []) # e.g., "一些安静的纯音乐"
    
    sp = get_spotify_client_for_user(qq_id)
    if not sp: return jsonify({'error': 'User not authorized.'}), 403

    try:
        # 1. 创建新歌单
        user_id = sp.me()['id']
        new_playlist = sp.user_playlist_create(user=user_id, name=playlist_name, public=False, description="Created by Gem Bot")
        playlist_id = new_playlist['id']
        
        # 2. 查找并添加歌曲
        if song_descriptions:
            track_uris = []
            for desc in song_descriptions:
                result = sp.search(q=desc, type='track', limit=2) # 每个描述找2首
                track_uris.extend([item['uri'] for item in result['tracks']['items']])
            if track_uris:
                sp.playlist_add_items(playlist_id, track_uris)
        
        playlist_url = new_playlist['external_urls']['spotify']
        return jsonify({'success': True, 'message': f'成功创建了新的歌单“{playlist_name}”并为你添加了几首歌！快去看看吧：{playlist_url}'})

    except Exception as e:
        return jsonify({'error': f'An error occurred: {e}'}), 500

# 为实现异步（见ChatGPTasgi和eventlet）
if __name__ == "__main__":
    socketio.run(app, host="0.0.0.0", port=int(os.environ.get("PORT", 10000)), debug=False)
