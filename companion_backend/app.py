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
import hashlib
import secrets
import google.generativeai as genai
from dotenv import load_dotenv
import requests
import threading
import time
from werkzeug.security import generate_password_hash, check_password_hash

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
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    last_active = db.Column(db.DateTime, default=datetime.utcnow)
    
    # 关联关系
    diaries = db.relationship('Diary', backref='user', lazy=True, cascade='all, delete-orphan')
    checkins = db.relationship('Checkin', backref='user', lazy=True, cascade='all, delete-orphan')
    annotations = db.relationship('Annotation', backref='user', lazy=True, cascade='all, delete-orphan')
    game_scores = db.relationship('GameScore', backref='user', lazy=True, cascade='all, delete-orphan')

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
    """获取Gemini的回复，支持API Key轮询"""
    global gemini_model
    
    if not GEMINI_API_KEYS:
        return "抱歉，AI功能暂时不可用。"
    
    # 获取用户的人设和记忆
    user_persona = ""
    user_memories = ""
    
    if user_id:
        # 获取用户人设
        user = User.query.get(user_id)
        if user:
            # 这里可以从QQ机器人的人设数据中获取
            # 暂时使用默认人设
            user_persona = "一个温暖、友好的AI陪伴助手"
        
        # 获取用户记忆
        try:
            memory_file = f"memory_data/memory_{user.qq_id}.json"
            if os.path.exists(memory_file):
                with open(memory_file, 'r', encoding='utf-8') as f:
                    memories = json.load(f)
                if memories:
                    formatted_memories = "\n".join([f"- (记录于 {mem['time']}) {mem['content']}" for mem in memories[-5:]])  # 最近5条记忆
                    user_memories = f"\n--- 关于我们的长期记忆 ---\n{formatted_memories}\n--- 记忆结束 ---\n"
        except Exception as e:
            print(f"加载用户记忆失败: {e}")
    
    for attempt in range(3):  # 最多重试3次
        try:
            full_prompt = f"""
你是一个陪伴型AI助手Gemini，正在陪伴空间中和用户互动。

你的角色设定：{user_persona}
{user_memories}
用户上下文：{user_context}

请以温暖、友好的语气回复，保持人设的一致性。记住你是Gemini，一个陪伴型AI助手。
{prompt}
"""
            response = gemini_model.generate_content(full_prompt)
            return response.text
        except Exception as e:
            error_str = str(e).lower()
            print(f"Gemini API调用失败 (尝试 {attempt + 1}/3): {e}")
            
            # 如果是API Key相关错误，尝试轮询
            if any(err in error_str for err in ["429", "permission", "quota", "api key"]):
                print("检测到API Key问题，尝试轮询...")
                gemini_model = rotate_gemini_key()
                if not gemini_model:
                    return "抱歉，AI服务暂时不可用，请稍后再试。"
            else:
                # 其他错误，等待后重试
                if attempt < 2:
                    time.sleep(1)
                    continue
                else:
                    return "抱歉，我现在有点累了，稍后再聊吧~"
    
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
@app.route('/api/diary', methods=['GET'])
def get_diaries():
    """获取日记列表"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    page = request.args.get('page', 1, type=int)
    per_page = request.args.get('per_page', 10, type=int)
    
    diaries = Diary.query.filter_by(user_id=session['user_id'])\
        .order_by(Diary.created_at.desc())\
        .paginate(page=page, per_page=per_page, error_out=False)
    
    return jsonify({
        'diaries': [{
            'id': diary.id,
            'content': diary.content,
            'mood': diary.mood,
            'is_gemini_written': diary.is_gemini_written,
            'created_at': diary.created_at.isoformat()
        } for diary in diaries.items],
        'total': diaries.total,
        'pages': diaries.pages,
        'current_page': page
    })

@app.route('/api/diary', methods=['POST'])
def create_diary():
    """创建日记"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    data = request.get_json()
    content = data.get('content')
    mood = data.get('mood')
    
    if not content:
        return jsonify({'error': '日记内容不能为空'}), 400
    
    # 创建用户日记
    diary = Diary(
        user_id=session['user_id'],
        content=content,
        mood=mood
    )
    
    db.session.add(diary)
    db.session.commit()
    
    # 如果用户活跃，让Gemini也写日记
    if check_user_activity(session['user_id']):
        gemini_prompt = f"""
用户今天写了日记：
"{content}"
心情：{mood or '未指定'}

请以Gemini的身份，写一篇简短的日记回应，分享你的感受和想法。
"""
        gemini_content = get_gemini_response(gemini_prompt, user_id=session['user_id'])
        
        gemini_diary = Diary(
            user_id=session['user_id'],
            content=gemini_content,
            mood='calm',
            is_gemini_written=True
        )
        
        db.session.add(gemini_diary)
        db.session.commit()
    
    update_user_activity(session['user_id'])
    
    return jsonify({'success': True, 'diary_id': diary.id})

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

请以Gemini的身份，也进行一个相关的打卡，分享你的想法。
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
@app.route('/api/sync/persona', methods=['POST'])
def sync_persona():
    """同步QQ机器人的人设数据"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    data = request.get_json()
    persona_text = data.get('persona')
    qq_id = data.get('qq_id')
    
    if not persona_text or not qq_id:
        return jsonify({'error': '缺少必要参数'}), 400
    
    # 更新用户的人设信息
    user = User.query.filter_by(qq_id=qq_id).first()
    if user:
        # 这里可以将人设存储到数据库的某个字段
        # 或者存储到单独的人设表中
        print(f"同步用户 {qq_id} 的人设: {persona_text}")
    
    return jsonify({'success': True})

@app.route('/api/sync/memory', methods=['POST'])
def sync_memory():
    """同步QQ机器人的记忆数据"""
    if 'user_id' not in session:
        return jsonify({'error': '未登录'}), 401
    
    data = request.get_json()
    memories = data.get('memories', [])
    qq_id = data.get('qq_id')
    
    if not qq_id:
        return jsonify({'error': '缺少QQ号'}), 400
    
    # 确保memory_data目录存在
    memory_dir = "memory_data"
    if not os.path.exists(memory_dir):
        os.makedirs(memory_dir)
    
    # 保存记忆到文件
    memory_file = os.path.join(memory_dir, f"memory_{qq_id}.json")
    try:
        with open(memory_file, 'w', encoding='utf-8') as f:
            json.dump(memories, f, ensure_ascii=False, indent=4)
        print(f"同步用户 {qq_id} 的记忆，共 {len(memories)} 条")
        return jsonify({'success': True})
    except Exception as e:
        print(f"保存记忆失败: {e}")
        return jsonify({'error': '保存记忆失败'}), 500

# 聊天相关API
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


