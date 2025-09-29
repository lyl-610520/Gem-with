# -*- coding: utf-8 -*-
"""
陪伴空间后端API
功能：用户认证、日记管理、打卡系统、音乐播放、阅读批注、小游戏等
"""

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
import google.generativeai as genai
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
# --- 新增下面这行 ---
from flask_jwt_extended import create_access_token, get_jwt_identity, jwt_required, JWTManager

# 加载环境变量
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))
# --- 把上面那一大堆关于 Cookie 的配置全部删除，换成下面这三行 ---
app.config["JWT_SECRET_KEY"] = app.config['SECRET_KEY'] # JWT需要一个自己的密钥
app.config["JWT_ACCESS_TOKEN_EXPIRES"] = timedelta(hours=24) # 令牌24小时后过期
jwt = JWTManager(app) # 初始化JWT工具
# 智能数据库连接配置
database_url = os.getenv('DATABASE_URL')
if database_url and database_url.startswith("postgres://"):
    # 如果是PostgreSQL地址，就自动替换成pg8000的连接方式
    database_url = database_url.replace("postgres://", "postgresql+pg8000://", 1)

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
# ------------------- VVVV 从这里开始复制 VVVV -------------------
# 从环境变量中获取前端URL白名单，并配置CORS
frontend_url = os.getenv('FRONTEND_URL')
if frontend_url:
    # 如果在Render环境变量里找到了前端URL，就只允许它访问
    CORS(app, supports_credentials=True, origins=[frontend_url], resources={
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
# 配置Gemini API - 支持多Key轮询
GEMINI_API_KEYS_STR = os.getenv('GEMINI_API_KEYS')
if GEMINI_API_KEYS_STR:
    GEMINI_API_KEYS = [key.strip() for key in GEMINI_API_KEYS_STR.split(',')]
    current_key_index = 0
    print(f"✅ 成功加载 {len(GEMINI_API_KEYS)} 个 Gemini API Key")
else:
    GEMINI_API_KEYS = []
    current_key_index = 0
    print("⚠️ 警告：未配置GEMINI_API_KEYS，AI功能将不可用")

def initialize_gemini_model():
    """初始化Gemini模型"""
    global current_key_index
    if not GEMINI_API_KEYS:
        return None
    
    try:
        api_key = GEMINI_API_KEYS[current_key_index]
        genai.configure(api_key=api_key, transport='rest')
        model = genai.GenerativeModel('gemini-2.5-pro')
        print(f"✅ Gemini 模型初始化成功！正使用 Key #{current_key_index + 1}")
        return model
    except Exception as e:
        print(f"❌ Key #{current_key_index + 1} 初始化失败: {e}")
        return None

def rotate_gemini_key():
    """轮询切换API Key"""
    global current_key_index
    initial_index = current_key_index
    
    while True:
        print(f"🔑 Key #{current_key_index + 1} 调用失败，正在尝试切换...")
        current_key_index = (current_key_index + 1) % len(GEMINI_API_KEYS)
        
        model = initialize_gemini_model()
        if model:
            return model
        
        if current_key_index == initial_index:
            print("❌ 所有API Key都已失效！")
            return None

# 初始化模型
gemini_model = initialize_gemini_model()

# 数据库模型
class User(db.Model):
    """用户模型"""
    id = db.Column(db.Integer, primary_key=True)
    qq_id = db.Column(db.String(20), unique=True, nullable=False)  # QQ号
    username = db.Column(db.String(50), unique=True, nullable=False)  # 用户名
    password_hash = db.Column(db.String(256))  # 密码哈希
    theme = db.Column(db.String(20), default='pure')  # 主题：pure, cute, dreamy
    custom_color = db.Column(db.String(7), default='#6366f1')  # 自定义颜色
    
    # [新增] 人设字段，使用Text类型可以存储很长的文本
    persona = db.Column(db.Text, default='一个乐于助人的AI助手')
    
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_active = db.Column(db.DateTime, default=datetime.utcnow)

    # 关联关系
    diaries = db.relationship('Diary', backref='user', lazy=True, cascade='all, delete-orphan')
    checkins = db.relationship('Checkin', backref='user', lazy=True, cascade='all, delete-orphan')
    annotations = db.relationship('Annotation', backref='user', lazy=True, cascade='all, delete-orphan')
    game_scores = db.relationship('GameScore', backref='user', lazy=True, cascade='all, delete-orphan')
    
    # [新增] 与长期记忆的关联关系
    memories = db.relationship('LongTermMemory', backref='user', lazy=True, cascade='all, delete-orphan')

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

# companion_backend/app.py

# companion_backend/app.py

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

class MusicSession(db.Model):
    """音乐会话模型"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    playlist = db.Column(db.Text)  # JSON格式的播放列表
    current_track = db.Column(db.Integer, default=0)
    is_playing = db.Column(db.Boolean, default=False)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    updated_at = db.Column(db.DateTime, default=datetime.utcnow)
    
with app.app_context():
    db.create_all()

# 全局变量存储活跃的音乐会话
active_music_sessions = {}

# 辅助函数
def get_gemini_response(prompt, user_context="", user_id=None):
    """[改造版] 获取Gemini的回复，从数据库读取人设和记忆"""
    global gemini_model
    if not GEMINI_API_KEYS:
        return "抱歉，AI功能暂时不可用。"

    user_persona = "一个温暖、友好的AI陪伴助手" # 默认人设
    user_memories_prompt = ""

    if user_id:
        user = User.query.get(user_id)
        if user:
            # 从数据库直接读取人设
            user_persona = user.persona
            
            # 从数据库读取最新的50条长期记忆
            recent_memories = LongTermMemory.query.filter_by(user_id=user.id)\
                .order_by(LongTermMemory.id.desc()).limit(50).all()
            
            if recent_memories:
                # 为了让记忆倒序显示（最新的在最下面），我们先反转列表
                recent_memories.reverse()
                formatted_memories = "\n".join([f"- (记录于 {mem.memory_time_str}) {mem.content}" for mem in recent_memories])
                user_memories_prompt = f"\n--- 关于我们的长期记忆 (请遵守和利用) ---\n{formatted_memories}\n--- 记忆结束 ---\n"

    for attempt in range(len(GEMINI_API_KEYS) + 1):
        try:
            full_prompt = f"""
你的角色设定是：{user_persona}
{user_memories_prompt}
---
用户当前在陪伴空间中的上下文：{user_context}
---
现在，请针对用户的以下问题或行为，以温暖、友好的语气进行符合人设的回应。请记住，你是Gem。

用户说："{prompt}"
"""
            if not gemini_model:
                raise Exception("Model is not initialized.")
            
            response = gemini_model.generate_content(full_prompt, request_options={"timeout": 120})
            return response.text
        except Exception as e:
            error_str = str(e).lower()
            print(f"Gemini API调用失败 (尝试 {attempt + 1}): {e}")
            
            # 任何API Key相关错误，都直接轮询
            if any(err in error_str for err in ["429", "permission", "quota", "api key", "deadline", "resource_exhausted"]):
                print("检测到API Key或服务问题，尝试轮询...")
                gemini_model = rotate_gemini_key()
                if not gemini_model:
                    return "抱歉，AI服务暂时不可用，所有能量核心都已过载。"
            elif attempt < 2: # 其他网络类错误，重试2次
                time.sleep(1)
                continue
    
    return "抱歉，我现在有点累了，稍后再聊吧~"

def check_user_activity(user_id):
    """检查用户活跃度，如果用户连续三天不活跃，Gemini也停止活动"""
    user = User.query.get(user_id)
    if not user:
        return False
    
    three_days_ago = datetime.utcnow() - timedelta(days=3)
    return user.last_active > three_days_ago

def update_user_activity(user_id):
    """更新用户活跃时间"""
    user = User.query.get(user_id)
    if user:
        user.last_active = datetime.utcnow()
        db.session.commit()

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
        # --- 不再使用 session，而是生成一个加密的“令牌” ---
        access_token = create_access_token(identity=user.id)
        update_user_activity(user.id)
        
        return jsonify({
            'success': True,
            'token': access_token, # <--- 把令牌发给前端
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
    """用户注册"""
    data = request.get_json()
    qq_id = data.get('qq_id')
    username = data.get('username')
    password = data.get('password')
    
    if not all([qq_id, username, password]):
        return jsonify({'error': '缺少必要参数'}), 400

    if User.query.filter_by(qq_id=qq_id).first():
        return jsonify({'error': '该QQ号已注册'}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({'error': '用户名已存在'}), 400
    
    user = User(
        qq_id=qq_id,
        username=username,
        password_hash=generate_password_hash(password)
    )
    db.session.add(user)
    db.session.commit()
    
    # --- 注册成功后，也直接生成一个“令牌” ---
    access_token = create_access_token(identity=user.id)
    
    return jsonify({
        'success': True,
        'token': access_token, # <--- 把令牌发给前端
        'user': {
            'id': user.id,
            'username': user.username,
            'theme': user.theme,
            'custom_color': user.custom_color
        }
    })

@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """用户登出"""
    return jsonify({'success': True})

@app.route('/api/user/profile', methods=['GET'])
@jwt_required()
def get_profile():
    """获取用户资料"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    if not user:
        return jsonify({'error': '用户不存在'}), 404
    
    return jsonify({
        'id': user.id,
        'username': user.username,
        'theme': user.theme,
        'custom_color': user.custom_color,
        'last_active': user.last_active.isoformat()
    })

@app.route('/api/user/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    """更新用户资料"""
    current_user_id = get_jwt_identity()
    user = User.query.get(current_user_id)
    
    data = request.get_json()
    if 'theme' in data:
        user.theme = data['theme']
    if 'custom_color' in data:
        user.custom_color = data['custom_color']
    
    db.session.commit()
    update_user_activity(user.id)
    
    return jsonify({'success': True})

# 日记相关API
# --- [核心重构] 日记相关API (V2) ---

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
    
    update_user_activity(current_user_id)
    
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
    if check_user_activity(current_user_id):
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

    update_user_activity(current_user_id)
    
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

# 音乐相关API
@app.route('/api/music/session', methods=['POST'])
@jwt_required()
def create_music_session():
    """创建音乐会话"""
    current_user_id = get_jwt_identity()
    
    data = request.get_json()
    playlist = data.get('playlist', [])
    
    music_session = MusicSession.query.filter_by(user_id=current_user_id).first()
    if not music_session:
        music_session = MusicSession(
            user_id=current_user_id,
            playlist=json.dumps(playlist)
        )
        db.session.add(music_session)
    else:
        music_session.playlist = json.dumps(playlist)
        music_session.current_track = 0
        music_session.is_playing = False
        music_session.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    active_music_sessions[current_user_id] = {
        'playlist': playlist,
        'current_track': 0,
        'is_playing': False
    }
    
    update_user_activity(current_user_id)
    
    return jsonify({'success': True})

@app.route('/api/music/play', methods=['POST'])
@jwt_required()
def play_music():
    """播放音乐"""
    current_user_id = get_jwt_identity()
    if current_user_id not in active_music_sessions:
        return jsonify({'error': '没有活跃的音乐会话'}), 400
    
    active_music_sessions[current_user_id]['is_playing'] = True
    
    music_session = MusicSession.query.filter_by(user_id=current_user_id).first()
    if music_session:
        music_session.is_playing = True
        music_session.updated_at = datetime.utcnow()
        db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/music/pause', methods=['POST'])
@jwt_required()
def pause_music():
    """暂停音乐"""
    current_user_id = get_jwt_identity()
    if current_user_id not in active_music_sessions:
        return jsonify({'error': '没有活跃的音乐会话'}), 400
    
    active_music_sessions[current_user_id]['is_playing'] = False
    
    music_session = MusicSession.query.filter_by(user_id=current_user_id).first()
    if music_session:
        music_session.is_playing = False
        music_session.updated_at = datetime.utcnow()
        db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/music/next', methods=['POST'])
@jwt_required()
def next_track():
    """下一首"""
    current_user_id = get_jwt_identity()
    if current_user_id not in active_music_sessions:
        return jsonify({'error': '没有活跃的音乐会话'}), 400
    
    session_data = active_music_sessions[current_user_id]
    playlist = session_data['playlist']
    
    if playlist:
        session_data['current_track'] = (session_data['current_track'] + 1) % len(playlist)
        
        music_session = MusicSession.query.filter_by(user_id=current_user_id).first()
        if music_session:
            music_session.current_track = session_data['current_track']
            music_session.updated_at = datetime.utcnow()
            db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/music/status', methods=['GET'])
@jwt_required()
def get_music_status():
    """获取音乐状态"""
    current_user_id = get_jwt_identity()
    if current_user_id not in active_music_sessions:
        return jsonify({'current_track': 0, 'is_playing': False, 'playlist': []})
    
    session_data = active_music_sessions[current_user_id]
    return jsonify({
        'current_track': session_data['current_track'],
        'is_playing': session_data['is_playing'],
        'playlist': session_data['playlist']
    })

# 人设和记忆同步API (这些接口由机器人调用，通常不走JWT，保持原样)
def find_or_create_user_by_qq(qq_id):
    user = User.query.filter_by(qq_id=qq_id).first()
    if not user:
        temp_username = f"user_{qq_id}"
        if User.query.filter_by(username=temp_username).first():
            temp_username = f"user_{qq_id}_{secrets.token_hex(4)}"
        user = User(
            qq_id=qq_id,
            username=temp_username,
            password_hash=generate_password_hash(secrets.token_hex(16))
        )
        db.session.add(user)
        db.session.commit()
        print(f"ℹ️ 用户 {qq_id} 不存在，已自动创建新用户。")
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
    
    user = User.query.get(current_user_id)
    recent_diaries = Diary.query.filter_by(user_id=current_user_id).order_by(Diary.created_at.desc()).limit(3).all()
    context = f"用户：{user.username}，最近日记：{[d.content[:50] + '...' for d in recent_diaries]}"
    
    response = get_gemini_response(message, context, current_user_id)
    update_user_activity(current_user_id)
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
    
    update_user_activity(current_user_id)
    
    return jsonify({'success': True, 'score_id': game_score.id})

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
