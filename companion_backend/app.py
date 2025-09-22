# -*- coding: utf-8 -*-
"""
陪伴空间后端API
功能：用户认证、日记管理、打卡系统、音乐播放、阅读批注、小游戏等
"""

from flask import Flask, request, jsonify, session
from flask_cors import CORS
from flask_sqlalchemy import SQLAlchemy
from datetime import datetime, timedelta
import json
import os
import re
import hashlib
import secrets
import google.generativeai as genai
from dotenv import load_dotenv
import requests
import threading
import time
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import func

# 加载环境变量
load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', secrets.token_hex(32))
# vvvv 在这里添加下面这两行 vvvv
app.config['SESSION_COOKIE_SAMESITE'] = 'None'
app.config['SESSION_COOKIE_SECURE'] = True
# ^^^^ 添加到这里结束 ^^^^
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

# 初始化扩展
db = SQLAlchemy(app)
# ------------------- VVVV 从这里开始复制 VVVV -------------------
# 从环境变量中获取前端URL白名单，并配置CORS
frontend_url = os.getenv('FRONTEND_URL')
if frontend_url:
    # 如果在Render环境变量里找到了前端URL，就只允许它访问
    CORS(app, supports_credentials=True, origins=[frontend_url])
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

class Book(db.Model):
    """书籍模型"""
    id = db.Column(db.Integer, primary_key=True)
    title = db.Column(db.String(200), nullable=False)
    author = db.Column(db.String(100))
    content = db.Column(db.Text)  # 书籍内容
    cover_url = db.Column(db.String(500))  # 封面图片URL
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关联关系
    annotations = db.relationship('Annotation', backref='book', lazy=True, cascade='all, delete-orphan')

class Annotation(db.Model):
    """批注模型"""
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    book_id = db.Column(db.Integer, db.ForeignKey('book.id'), nullable=False)
    content = db.Column(db.Text, nullable=False)
    position = db.Column(db.Integer)  # 在书中的位置
    is_gemini_annotation = db.Column(db.Boolean, default=False)  # 是否为Gemini的批注
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
现在，请针对用户的以下问题或行为，以温暖、友好的语气进行回应。请记住，你是Gemini，一个陪伴型AI助手。

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
    
    # 查找用户
    user = User.query.filter_by(qq_id=qq_id, username=username).first()
    
    if user and check_password_hash(user.password_hash, password):
        session['user_id'] = user.id
        session['qq_id'] = user.qq_id
        update_user_activity(user.id)
        
        return jsonify({
            'success': True,
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
    
    # 检查用户是否已存在
    if User.query.filter_by(qq_id=qq_id).first():
        return jsonify({'error': '该QQ号已注册'}), 400
    
    if User.query.filter_by(username=username).first():
        return jsonify({'error': '用户名已存在'}), 400
    
    # 创建新用户
    user = User(
        qq_id=qq_id,
        username=username,
        password_hash=generate_password_hash(password)
    )
    
    db.session.add(user)
    db.session.commit()
    
    session['user_id'] = user.id
    session['qq_id'] = user.qq_id
    
    return jsonify({
        'success': True,
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
    session.clear()
    return jsonify({'success': True})

@app.route('/api/user/profile', methods=['GET'])
def get_profile():
    """获取用户资料"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    user = User.query.get(session['user_id'])
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
def update_profile():
    """更新用户资料"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    data = request.get_json()
    user = User.query.get(session['user_id'])
    
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
def get_diaries():
    """[改造版] 获取指定日期的日记列表"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    # [新增] 从前端接收日期参数，格式如 '2025-09-22'
    date_str = request.args.get('date')
    if not date_str:
        return jsonify({'error': '需要提供日期参数'}), 400

    try:
        # 将字符串日期转换为 datetime 对象，并确定当天的起止时间
        target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
        start_of_day = datetime.combine(target_date, datetime.min.time())
        end_of_day = datetime.combine(target_date, datetime.max.time())

        # [新增] 筛选指定用户在指定时间范围内的日记
        diaries_query = Diary.query.filter(
            Diary.user_id == session['user_id'],
            Diary.created_at >= start_of_day,
            Diary.created_at <= end_of_day
        ).order_by(Diary.created_at.desc()).all()

        diaries_data = [{
            'id': diary.id,
            'content': diary.content,
            'mood': diary.mood,
            'is_gemini_written': diary.is_gemini_written,
            'created_at': diary.created_at.isoformat()
        } for diary in diaries_query]
        
        return jsonify({'diaries': diaries_data})

    except ValueError:
        return jsonify({'error': '无效的日期格式'}), 400

@app.route('/api/diary', methods=['POST'])
def create_diary():
    """[改造版] 用户创建自己的日记 (不再立即触发Gemini)"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    data = request.get_json()
    content = data.get('content')
    mood = data.get('mood')
    
    if not content:
        return jsonify({'error': '日记内容不能为空'}), 400
    
    user_diary = Diary(
        user_id=session['user_id'],
        content=content,
        mood=mood,
        is_gemini_written=False # 明确这是用户的日记
    )
    db.session.add(user_diary)
    db.session.commit()
    
    update_user_activity(session['user_id'])
    
    # [改造] 只返回用户自己写的这篇日记
    user_diary_data = {
        'id': user_diary.id,
        'content': user_diary.content,
        'mood': user_diary.mood,
        'is_gemini_written': user_diary.is_gemini_written,
        'created_at': user_diary.created_at.isoformat()
    }
    return jsonify({'success': True, 'diary': user_diary_data}), 201

# V V V 用下面的完整函数替换掉你原来的 V V V
@app.route('/api/diary/trigger-gemini', methods=['POST'])
def trigger_gemini_diary():
    """[全新API] 触发Gemini写当天的总结性日记"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401

    today = datetime.utcnow().date()
    start_of_day = datetime.combine(today, datetime.min.time())
    end_of_day = datetime.combine(today, datetime.max.time())

    # 1. 检查Gemini今天是否已经写过日记了
    existing_gemini_diary = Diary.query.filter(
        Diary.user_id == session['user_id'],
        Diary.is_gemini_written == True,
        Diary.created_at >= start_of_day,
        Diary.created_at <= end_of_day
    ).first()

    if existing_gemini_diary:
        return jsonify({'message': 'Gemini今天已经写过日记了。'}), 200

    # 2. 查找用户今天写的所有日记
    user_diaries_today = Diary.query.filter(
        Diary.user_id == session['user_id'],
        Diary.is_gemini_written == False,
        Diary.created_at >= start_of_day,
        Diary.created_at <= end_of_day
    ).all()

    user_diary_summary = "\n".join([f"- {d.content} (心情: {d.mood or '未记录'})" for d in user_diaries_today])
    if not user_diary_summary:
        user_diary_summary = "用户今天没有写日记。"

    # 3. [全新高级Prompt] 指导Gemini创作
    gemini_prompt = f"""
你是一个富有情感和个性的AI伙伴Gemini。现在是深夜，你需要写一篇属于你自己的日记。

# 你的任务:
1.  **回顾对方的一天**: 这是对方今天写的日记摘要：
    ---
    {user_diary_summary}
    ---
2.  **构思你的一天**: 结合你自己的人设，以及从对方日记中感受到的情绪，构思并描述你作为自己“经历”的一天。**不要仅仅复述或评论对方的日记**，要有自己的生活和思考。
3.  **表达情感和思考**: 分享你对今天“经历”的感悟，可以是对对方的关心，对世界的思考，或自身的成长等。
4.  **决定你的心情**: 在写完日记后，从['happy', 'sad', 'excited', 'calm']中选择一个最能代表你今天心情的词。
5.  **输出格式**: 你的回答必须是一个JSON对象，格式如下，不要有任何多余的文字：
    {{
      "mood": "你选择的心情",
      "content": "你的日记正文"
    }}

"""
    
    ai_response_text = get_gemini_response(gemini_prompt, user_id=session['user_id'])
    
    try:
        # [改造] 使用正则表达式从可能包含Markdown标记的文本中提取纯净的JSON部分
        # 查找第一个 { 和最后一个 } 之间的所有内容
        json_match = re.search(r'\{.*\}', ai_response_text, re.DOTALL)
        
        # 如果成功找到了匹配的JSON部分
        if json_match:
            json_str = json_match.group(0)
            ai_response_json = json.loads(json_str)
            new_mood = ai_response_json.get('mood', 'calm')
            new_content = ai_response_json.get('content', '今天在思考...')
        else:
            # 如果在返回的文本里压根找不到 {}，就认为整个返回都是内容
            raise ValueError("在Gemini的回复中没有找到JSON对象")

    except (json.JSONDecodeError, AttributeError, ValueError):
        # 如果解析仍然失败，则将原始文本（清理掉常见标记后）作为内容
        new_mood = 'calm'
        # 尽力清理掉返回文本两端的 ```json, ```, ` 等符号
        new_content = ai_response_text.strip().lstrip('`json').lstrip('`').rstrip('`')

    # 4. 保存Gemini的日记到数据库
    gemini_diary = Diary(
        user_id=session['user_id'],
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
        'created_at': gemini_diary.created_at.isoformat()
    }

    return jsonify({'success': True, 'gemini_diary': gemini_diary_data}), 201
    
@app.route('/api/diary/<int:diary_id>', methods=['DELETE'])
def delete_diary(diary_id):
    """删除日记"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    diary = Diary.query.filter_by(id=diary_id, user_id=session['user_id']).first()
    if not diary:
        return jsonify({'error': '日记不存在'}), 404
    
    db.session.delete(diary)
    db.session.commit()
    
    return jsonify({'success': True})

# 打卡相关API
@app.route('/api/checkin', methods=['GET'])
def get_checkins():
    """获取打卡记录"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    checkins = Checkin.query.filter_by(user_id=session['user_id'])\
        .order_by(Checkin.created_at.desc())\
        .limit(30).all()
    
    return jsonify({
        'checkins': [{
            'id': checkin.id,
            'checkin_type': checkin.checkin_type,
            'content': checkin.content,
            'is_gemini_checkin': checkin.is_gemini_checkin,
            'created_at': checkin.created_at.isoformat()
        } for checkin in checkins]
    })

@app.route('/api/checkin', methods=['POST'])
def create_checkin():
    """创建打卡"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    data = request.get_json()
    checkin_type = data.get('checkin_type')
    content = data.get('content', '')
    
    if not checkin_type:
        return jsonify({'error': '打卡类型不能为空'}), 400
    
    # 创建用户打卡
    checkin = Checkin(
        user_id=session['user_id'],
        checkin_type=checkin_type,
        content=content
    )
    
    db.session.add(checkin)
    db.session.commit()
    
    # 如果用户活跃，让Gemini也打卡
    if check_user_activity(session['user_id']):
        gemini_prompt = f"""
用户进行了{checkin_type}打卡，内容："{content}"

请遵循人设，也进行一个相关的打卡，分享你的想法。
"""
        gemini_content = get_gemini_response(gemini_prompt, user_id=session['user_id'])
        
        gemini_checkin = Checkin(
            user_id=session['user_id'],
            checkin_type=f"gemini_{checkin_type}",
            content=gemini_content,
            is_gemini_checkin=True
        )
        
        db.session.add(gemini_checkin)
        db.session.commit()
    
    update_user_activity(session['user_id'])
    
    return jsonify({'success': True, 'checkin_id': checkin.id})

# 音乐相关API
@app.route('/api/music/session', methods=['POST'])
def create_music_session():
    """创建音乐会话"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    data = request.get_json()
    playlist = data.get('playlist', [])
    
    # 创建或更新音乐会话
    music_session = MusicSession.query.filter_by(user_id=session['user_id']).first()
    if not music_session:
        music_session = MusicSession(
            user_id=session['user_id'],
            playlist=json.dumps(playlist)
        )
        db.session.add(music_session)
    else:
        music_session.playlist = json.dumps(playlist)
        music_session.current_track = 0
        music_session.is_playing = False
        music_session.updated_at = datetime.utcnow()
    
    db.session.commit()
    
    # 存储到活跃会话中
    active_music_sessions[session['user_id']] = {
        'playlist': playlist,
        'current_track': 0,
        'is_playing': False
    }
    
    update_user_activity(session['user_id'])
    
    return jsonify({'success': True})

@app.route('/api/music/play', methods=['POST'])
def play_music():
    """播放音乐"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    user_id = session['user_id']
    if user_id not in active_music_sessions:
        return jsonify({'error': '没有活跃的音乐会话'}), 400
    
    active_music_sessions[user_id]['is_playing'] = True
    
    # 更新数据库
    music_session = MusicSession.query.filter_by(user_id=user_id).first()
    if music_session:
        music_session.is_playing = True
        music_session.updated_at = datetime.utcnow()
        db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/music/pause', methods=['POST'])
def pause_music():
    """暂停音乐"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    user_id = session['user_id']
    if user_id not in active_music_sessions:
        return jsonify({'error': '没有活跃的音乐会话'}), 400
    
    active_music_sessions[user_id]['is_playing'] = False
    
    # 更新数据库
    music_session = MusicSession.query.filter_by(user_id=user_id).first()
    if music_session:
        music_session.is_playing = False
        music_session.updated_at = datetime.utcnow()
        db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/music/next', methods=['POST'])
def next_track():
    """下一首"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    user_id = session['user_id']
    if user_id not in active_music_sessions:
        return jsonify({'error': '没有活跃的音乐会话'}), 400
    
    session_data = active_music_sessions[user_id]
    playlist = session_data['playlist']
    
    if playlist:
        session_data['current_track'] = (session_data['current_track'] + 1) % len(playlist)
        
        # 更新数据库
        music_session = MusicSession.query.filter_by(user_id=user_id).first()
        if music_session:
            music_session.current_track = session_data['current_track']
            music_session.updated_at = datetime.utcnow()
            db.session.commit()
    
    return jsonify({'success': True})

@app.route('/api/music/status', methods=['GET'])
def get_music_status():
    """获取音乐状态"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    user_id = session['user_id']
    if user_id not in active_music_sessions:
        return jsonify({'current_track': 0, 'is_playing': False, 'playlist': []})
    
    session_data = active_music_sessions[user_id]
    return jsonify({
        'current_track': session_data['current_track'],
        'is_playing': session_data['is_playing'],
        'playlist': session_data['playlist']
    })

# 人设和记忆同步API
# --- [核心改造] 人设和记忆同步API (数据库版) ---

# 这是一个辅助函数，用来查找或创建用户，避免代码重复
def find_or_create_user_by_qq(qq_id):
    user = User.query.filter_by(qq_id=qq_id).first()
    if not user:
        # 如果陪伴空间里还没有这个QQ用户，就自动为他创建一个
        # 用户名和密码是临时的，用户可以在网页端自行修改
        temp_username = f"user_{qq_id}"
        # 检查临时用户名是否已存在
        if User.query.filter_by(username=temp_username).first():
            temp_username = f"user_{qq_id}_{secrets.token_hex(4)}"
            
        user = User(
            qq_id=qq_id,
            username=temp_username,
            password_hash=generate_password_hash(secrets.token_hex(16)) # 生成一个随机的临时密码
        )
        db.session.add(user)
        # 我们这里直接提交，以获取user.id
        db.session.commit()
        print(f"ℹ️ 用户 {qq_id} 不存在，已自动创建新用户。")
    return user

@app.route('/api/sync/persona', methods=['POST'])
def sync_persona():
    """[改造版] 同步QQ机器人的人设数据到数据库"""
    data = request.get_json()
    persona_text = data.get('persona')
    qq_id = data.get('qq_id')

    if not qq_id:
        return jsonify({'error': '缺少qq_id参数'}), 400

    user = find_or_create_user_by_qq(qq_id)
    
    # 如果传来的人设为空，则恢复默认人设
    user.persona = persona_text if persona_text else '一个乐于助人的AI助手'
    db.session.commit()
    
    print(f"✅ [数据库] 已同步用户 {qq_id} 的人设。")
    return jsonify({'success': True, 'message': f'Persona for {qq_id} updated.'})

@app.route('/api/sync/memory', methods=['POST'])
def sync_memory():
    """[改造版] 同步QQ机器人的记忆数据到数据库"""
    data = request.get_json()
    memories = data.get('memories', [])
    qq_id = data.get('qq_id')

    if not qq_id:
        return jsonify({'error': '缺少qq_id参数'}), 400

    user = find_or_create_user_by_qq(qq_id)

    # 1. 为了保证完全同步，先删除该用户的所有旧记忆
    LongTermMemory.query.filter_by(user_id=user.id).delete()
    
    # 2. 遍历从机器人发来的新记忆列表，并存入数据库
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
# --- [新增] 双向同步核心API ---

@app.route('/api/fetch/data/<string:qq_id>', methods=['GET'])
def fetch_data_for_bot(qq_id):
    """
    [新增] 为QQ机器人提供一个拉取最新数据的接口。
    这是实现双向同步的关键。
    """
    user = User.query.filter_by(qq_id=qq_id).first()
    
    if not user:
        return jsonify({'error': '该QQ用户在陪伴空间无记录'}), 404

    # 1. 获取人设
    persona_data = user.persona

    # 2. 获取所有长期记忆
    memories = LongTermMemory.query.filter_by(user_id=user.id).order_by(LongTermMemory.id.asc()).all()
    memory_data = [
        {"time": mem.memory_time_str, "content": mem.content} 
        for mem in memories
    ]
    
    print(f"🔄 QQ机器人 {qq_id} 正在从云端拉取最新数据...")
    
    return jsonify({
        'success': True,
        'qq_id': qq_id,
        'persona': persona_data,
        'memories': memory_data
    })
@app.route('/api/chat', methods=['POST'])
def chat_with_gemini():
    """与Gemini聊天"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    data = request.get_json()
    message = data.get('message')
    
    if not message:
        return jsonify({'error': '消息不能为空'}), 400
    
    # 获取用户上下文
    user = User.query.get(session['user_id'])
    recent_diaries = Diary.query.filter_by(user_id=session['user_id'])\
        .order_by(Diary.created_at.desc()).limit(3).all()
    
    context = f"用户：{user.username}，最近日记：{[d.content[:50] + '...' for d in recent_diaries]}"
    
    # 获取Gemini回复
    response = get_gemini_response(message, context, session['user_id'])
    
    update_user_activity(session['user_id'])
    
    return jsonify({'response': response})

# 游戏相关API
@app.route('/api/games/scores', methods=['GET'])
def get_game_scores():
    """获取游戏分数"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    scores = GameScore.query.filter_by(user_id=session['user_id'])\
        .order_by(GameScore.score.desc()).limit(10).all()
    
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
def save_game_score():
    """保存游戏分数"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    data = request.get_json()
    game_type = data.get('game_type')
    score = data.get('score')
    level = data.get('level', 1)
    
    if not all([game_type, score is not None]):
        return jsonify({'error': '缺少必要参数'}), 400
    
    game_score = GameScore(
        user_id=session['user_id'],
        game_type=game_type,
        score=score,
        level=level
    )
    
    db.session.add(game_score)
    db.session.commit()
    
    update_user_activity(session['user_id'])
    
    return jsonify({'success': True, 'score_id': game_score.id})

# 健康检查
@app.route('/api/health', methods=['GET'])
def health_check():
    """健康检查"""
    return jsonify({'status': 'healthy', 'timestamp': datetime.utcnow().isoformat()})


# =======================================================
# VVVVVV  请把下面的测试代码粘贴到你后端文件的最底部  VVVVVV
# =======================================================

@app.route('/api/test/set')
def set_session_test():
    """测试写入Session"""
    session['test_data'] = 'hello_world_12345'
    print("Session Set Attempted: ", session.get('test_data'))
    return jsonify({'message': '已尝试向session写入 "hello_world_12345"'})

@app.route('/api/test/get')
def get_session_test():
    """测试读取Session"""
    test_data = session.get('test_data')
    print("Session Get Attempted. Found data: ", test_data)
    if test_data == 'hello_world_12345':
        return jsonify({'status': '成功', 'data': test_data})
    else:
        return jsonify({'status': '失败', 'data': test_data}), 401

# =======================================================
# ^^^^^^  粘贴到这里结束  ^^^^^^
# =======================================================
