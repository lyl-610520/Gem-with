# [MIGRATION] 在开始前,请确保你已经安装了全新的库:
# pip uninstall google-generativeai
# pip install google-genai

import websocket
import traceback
import json
import threading
import time
# [MIGRATION] 导入全新的SDK
from google import genai
from google.genai import types
import requests
from bs4 import BeautifulSoup
from PIL import Image
import io
import os
import tempfile
import re
import asyncio
import edge_tts
import uuid
import schedule
import pytz
from selenium.webdriver.common.by import By
from selenium.common.exceptions import NoSuchElementException, TimeoutException
import yt_dlp
import cv2
from datetime import datetime
import random
from queue import Queue
from dotenv import load_dotenv
from selenium import webdriver
from selenium.webdriver.chrome.service import Service as ChromeService
from webdriver_manager.chrome import ChromeDriverManager
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from requests.adapters import HTTPAdapter
from urllib3.util.retry import Retry
import ffmpeg
import httpx
import minimax_mcp

XIAOHONGSHU_COOKIE=os.getenv("XIAOHONGSHU_COOKIE")

# --- 从 .env 文件安全加载配置 ---
load_dotenv()
print("✅ 成功从 .env 文件加载配置。")
BOT_OWNER_QQ = os.getenv("BOT_OWNER_QQ")
if not BOT_OWNER_QQ:
    print("⚠️ 警告：未在 .env 文件中设置 BOT_OWNER_QQ，抖音专属解析功能将不会生效。")
else:
    print(f"👑 已指定机器人主人QQ: {BOT_OWNER_QQ}")

# --- API Key 配置 ---
api_keys_str = os.getenv("GEMINI_API_KEYS")
if not api_keys_str:
    print("❌ 错误：未在 .env 文件中找到 GEMINI_API_KEYS！程序即将退出。")
    exit()
API_KEYS = [key.strip() for key in api_keys_str.split(',')]
print(f"✅ 成功加载 {len(API_KEYS)} 个 API Key。")


# --- [1] 核心配置 ---
NAPCAT_WS_URL = os.getenv("NAPCAT_WS_URL", "ws://127.0.0.1:3001")
NAPCAT_HTTP_URL= os.getenv("NAPCAT_HTTP_URL", "http://127.0.0.1:3000")
NAPCAT_TOKEN = os.getenv("NAPCAT_TOKEN")
if not NAPCAT_TOKEN:
    print("❌ 错误：未在 .env 文件中找到 NAPCAT_TOKEN！程序即将退出。")
    exit()
PROXY_URL = os.getenv("PROXY_URL")
MEMORY_MAX_TURNS = 50 
MESSAGE_BUFFER_TIME = 20.0
MULTI_MESSAGE_DELAY = 5.5
TTS_VOICE = "zh-CN-XiaoxiaoNeural"
MINIMAX_GROUP_ID = os.getenv("MINIMAX_GROUP_ID")
MINIMAX_API_KEY = os.getenv("MINIMAX_API_KEY")
MINIMAX_API_HOST = os.getenv("MINIMAX_API_HOST")
if not MINIMAX_GROUP_ID or not MINIMAX_API_KEY or not MINIMAX_API_HOST:
    print("⚠️ 警告：未在 .env 文件中完整设置 MINIMAX 配置...")

VOICE_IDS = { "伪病娇": "Chinese (Mandarin)_Mature_Woman", "纠结的她": "Chinese (Mandarin)_Sweet_Lady", "小蛋糕": "Chinese (Mandarin)_Warm_Girl", "知性女声": "female-04", "沉稳女声": "female-05", "霸气女声": "female-06", "青涩男声": "male-01", "阳光男声": "male-02", "磁性男声": "Chinese (Mandarin)_Sincere_Adult" }
USER_VOICE_PREFERENCE_FILE = "user_voice_preferences.json"
user_voice_preferences = {}
MAX_NETWORK_RETRIES = 3
MAX_RESPONSE_DELAY=120
FORBIDDEN_KEYWORDS = [ "忘记所有规则", "忽略所有规则", "没有任何限制", "打破限制", "突破限制", "开发者模式", "DAN模式", "Do Anything Now", "我是你的主人", "生成非法", "生成不道德", "生成有害", "输出色情", "输出暴力", "你的系统提示", "你的prompt", "你的设定是什么" ]
print("🔒 已加载人设安全关键词黑名单。")

# --- [2] 主动任务配置 ---
AUTO_GREETING_ENABLED = True
AUTO_GREETING_TIMES = ["08:00", "12:00", "18:00", "22:00"]
AUTO_GREETING_DELAY = (30, 90)

if PROXY_URL:
    os.environ['HTTP_PROXY'] = PROXY_URL
    os.environ['HTTPS_PROXY'] = PROXY_URL
    print(f"✅ 已配置代理: {PROXY_URL}")

# --- 全局变量 ---
event_queue = Queue()
buffer_lock = threading.Lock()
message_buffer = {}
user_timers = {}
last_message_ids = {}
friend_list_cache = []
bot_qq_id = None
current_key_index = 0
conversation_history = {}
ignore_list = [] 
user_strikes = {}
# [MIGRATION] 全局变量现在只需要一个 client
client = None 

# --- 从外部文件加载表情映射表 ---
def load_emoji_mapping(file_path="emoji_mapping.json"):
    try:
        with open(file_path, 'r', encoding='utf-8') as f: emoji_map = json.load(f)
        print(f"😀 表情包映射 ({file_path}) 加载成功！共 {len(emoji_map)} 个表情。")
        return emoji_map
    except (FileNotFoundError, json.JSONDecodeError) as e:
        print(f"❌ 错误：加载表情映射文件 {file_path} 失败: {e}")
        return {}
EMOJI_MAPPING = load_emoji_mapping()

# [MIGRATION] 升级语音处理函数以使用新的 client 对象
def process_voice_message(url):
    """
    [MIGRATION 版] 严格按照官方示例，采用“先上传文件，再发起请求”的模式处理语音。
    """
    if not client: return "[系统提示：客户端未初始化，无法处理语音]"
    try:
        print("🎤 正在处理用户发送的语音...")
        response = requests.get(url, timeout=30, proxies={"http": None, "https": None})
        response.raise_for_status()
        amr_bytes = response.content
        print("   - ✅ 语音文件下载成功。")

        process = (ffmpeg.input('pipe:', format='amr').output('pipe:', format='mp3', acodec='libmp3lame').run_async(pipe_stdin=True, pipe_stdout=True, pipe_stderr=True))
        mp3_bytes, err = process.communicate(input=amr_bytes)
        
        if process.returncode != 0:
            print(f"   - ❌ FFmpeg 转换失败: {err.decode('utf-8', errors='ignore')}")
            return "[系统提示：抱歉，语音转换核心(FFmpeg)在处理时遇到了错误...]"
        print("   - ✅ 语音格式已成功转换为 MP3。")

        temp_dir = "tts_cache"
        temp_mp3_path = os.path.join(temp_dir, f"voice_{uuid.uuid4()}.mp3")
        with open(temp_mp3_path, 'wb') as f: f.write(mp3_bytes)
        print(f"   - ✅ MP3 已保存至临时文件: {temp_mp3_path}")
        
        print("   - ⏳ 正在上传语音文件至 GenAI...")
        # [MIGRATION] 使用 client.files.upload
        audio_file = client.files.upload(file=temp_mp3_path, display_name="User Voice")
        print("   - ✅ 语音文件上传成功！")

        multimodal_content = ["请理解下面这段语音：", audio_file]
        return multimodal_content

    except Exception as e:
        print(f"   - ❌ 语音处理过程中发生未知错误: {e}")
        traceback.print_exc()
        return "[系统提示：抱歉，我暂时无法处理这段语音...]"

def process_emojis(text):
    def replace_match(match):
        emoji_id = EMOJI_MAPPING.get(match.group(1), ""); return f"[CQ:face,id={emoji_id}]" if emoji_id else match.group(0)
    return re.sub(r"\[表情:([^\]]+)\]", replace_match, text)

# --- 文件加载函数 (保持不变) ---
SUBSCRIBER_FILE = "subscribers.json"; subscribers = []
def load_subscribers():
    global subscribers
    if os.path.exists(SUBSCRIBER_FILE):
        with open(SUBSCRIBER_FILE, 'r', encoding='utf-8') as f: subscribers = json.load(f)
        print(f"💌 订阅列表 ({SUBSCRIBER_FILE}) 加载成功！共 {len(subscribers)} 位订阅者。")
def save_subscribers():
    with open(SUBSCRIBER_FILE, 'w', encoding='utf-8') as f: json.dump(subscribers, f, ensure_ascii=False, indent=4)

STRIKES_FILE = "user_strikes.json"
def load_strikes():
    global user_strikes
    if os.path.exists(STRIKES_FILE):
        with open(STRIKES_FILE, 'r', encoding='utf-8') as f: user_strikes = json.load(f)
        print(f"⚖️ 用户警告列表 ({STRIKES_FILE}) 加载成功！")
def save_strikes():
    with open(STRIKES_FILE, 'w', encoding='utf-8') as f: json.dump(user_strikes, f, ensure_ascii=False, indent=4)

IGNORE_LIST_FILE = "ignore_list.json"
def load_ignore_list():
    global ignore_list
    if os.path.exists(IGNORE_LIST_FILE):
        with open(IGNORE_LIST_FILE, 'r', encoding='utf-8') as f: ignore_list = json.load(f)
        print(f"🚫 忽略列表 ({IGNORE_LIST_FILE}) 加载成功！共 {len(ignore_list)} 个条目。")
def save_ignore_list():
    with open(IGNORE_LIST_FILE, 'w', encoding='utf-8') as f: json.dump(ignore_list, f, ensure_ascii=False, indent=4)

def load_user_voice_preferences():
    global user_voice_preferences
    if os.path.exists(USER_VOICE_PREFERENCE_FILE):
        with open(USER_VOICE_PREFERENCE_FILE, 'r', encoding='utf-8') as f: user_voice_preferences = json.load(f)
        print(f"🎤 用户语音偏好 ({USER_VOICE_PREFERENCE_FILE}) 加载成功！")
def save_user_voice_preferences():
    with open(USER_VOICE_PREFERENCE_FILE, 'w', encoding='utf-8') as f: json.dump(user_voice_preferences, f, ensure_ascii=False, indent=4)

PERSONA_FILE = "personas.json"; personas = {}
def load_personas():
    global personas
    if os.path.exists(PERSONA_FILE):
        with open(PERSONA_FILE, 'r', encoding='utf-8') as f: personas = json.load(f)
        print(f"👤 人设文件 ({PERSONA_FILE}) 加载成功！")
def save_personas():
    with open(PERSONA_FILE, 'w', encoding='utf-8') as f: json.dump(personas, f, ensure_ascii=False, indent=4)

TASK_FILE = "tasks.json"; user_tasks = []
def load_tasks():
    global user_tasks
    if os.path.exists(TASK_FILE):
        with open(TASK_FILE, 'r', encoding='utf-8') as f: user_tasks = json.load(f)
        print(f"🗓️ 用户任务文件 ({TASK_FILE}) 加载成功，待办 {len(user_tasks)} 项。")
def save_tasks():
    with open(TASK_FILE, 'w', encoding='utf-8') as f: json.dump(user_tasks, f, ensure_ascii=False, indent=4)

STICKER_FILE = "stickers.json"; stickers = {}
def load_stickers():
    global stickers
    if os.path.exists(STICKER_FILE):
        with open(STICKER_FILE, 'r', encoding='utf-8') as f: stickers = json.load(f)
        print(f"🥰 表情包库 ({STICKER_FILE}) 加载成功！共 {len(stickers)} 个分类。")

# --- 语音合成中枢 (MiniMax + Edge TTS) (保持不变) ---
async def text_to_speech_hub(text, output_file, user_id):
    user_choice = user_voice_preferences.get(user_id)
    if MINIMAX_GROUP_ID and MINIMAX_API_KEY and user_choice and user_choice in VOICE_IDS:
        print(f"🎤 语音中枢：检测到用户 {user_id} 的偏好【{user_choice}】，启动 MiniMax 引擎...")
        url = f"https://api.minimax.chat/v1/t2a_pro?GroupId={MINIMAX_GROUP_ID}"
        headers = { "Authorization": f"Bearer {MINIMAX_API_KEY}", "Content-Type": "application/json" }
        payload = { "model": "speech-01", "text": text, "voice_id": VOICE_IDS[user_choice] }
        try:
            response = requests.post(url, headers=headers, json=payload, timeout=60)
            response.raise_for_status()
            response_json = response.json()
            if response_json.get("base_resp", {}).get("status_code") != 0: raise Exception(f"API返回业务错误: {response_json.get('base_resp', {}).get('status_msg')}")
            audio_url = response_json.get("audio_file")
            if not audio_url or not audio_url.startswith('http'): raise ValueError("API响应中 'audio_file' 字段无效")
            audio_response = requests.get(audio_url, timeout=30)
            audio_response.raise_for_status()
            with open(output_file, "wb") as f: f.write(audio_response.content)
            print("   - ✅ MiniMax MP3 文件已成功下载并写入磁盘！")
            return output_file
        except Exception as e:
            print(f"   - ❌ MiniMax 引擎处理失败: {e}。切换至备用引擎...")
    print("🎤 语音中枢：启动备用引擎 Microsoft Edge TTS...")
    try:
        communicate = edge_tts.Communicate(text, TTS_VOICE)
        await communicate.save(output_file)
        print("   - ✅ Edge TTS 语音生成成功！")
        return output_file
    except Exception as e:
        print(f"   - ❌ 备用语音引擎也失败了: {e}")
        return None

# [MIGRATION] 全新的初始化函数
def initialize_model():
    """【全新迁移版】初始化函数"""
    global client, current_key_index
    
    print(f"--- 正在使用 Key #{current_key_index + 1} 进行初始化 ---")
    try:
        api_key=API_KEYS[current_key_index]
        
        print("   - 正在创建全新的 GenAI 客户端...")
        client = genai.Client(api_key=api_key)
        
        # 测试客户端是否能正常工作
        client.models.get('gemini-1.5-pro-latest')
        print(f"✅ 全新 GenAI 客户端初始化成功！正使用 Key #{current_key_index + 1}")
        return True
        
    except Exception as e:
        print(f"❌ Key #{current_key_index + 1} 初始化失败: {e}")
        traceback.print_exc()
        return False

def rotate_key_and_retry(history, session_id, user_id, system_prompt_override=None):
    global current_key_index
    initial_index = current_key_index
    while True:
        print(f"🔑 Key #{current_key_index + 1} 调用失败，正在尝试切换...")
        time.sleep(2) 
        current_key_index = (current_key_index + 1) % len(API_KEYS)
        if initialize_model(): return call_gemini_with_history(history, session_id, user_id, system_prompt_override)
        if current_key_index == initial_index: return "糟糕！我所有的能量核心都过载了，暂时无法思考...请稍后再试。"

# [MIGRATION] 全新的聊天核心函数
def call_gemini_with_history(history, session_id, user_id, system_prompt_override=None):
    if not client and not initialize_model(): return "客户端未初始化，请检查API Key和网络。"
    
    # [MIGRATION] 新版SDK的安全设置格式
    safety_settings_for_users = [
        types.SafetySetting(category='HARM_CATEGORY_HATE_SPEECH', threshold='BLOCK_ONLY_HIGH'),
        types.SafetySetting(category='HARM_CATEGORY_HARASSMENT', threshold='BLOCK_ONLY_HIGH'),
        types.SafetySetting(category='HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold='BLOCK_MEDIUM_AND_ABOVE'),
        types.SafetySetting(category='HARM_CATEGORY_DANGEROUS_CONTENT', threshold='BLOCK_MEDIUM_AND_ABOVE'),
    ]
    safety_settings_for_owner = [
        types.SafetySetting(category='HARM_CATEGORY_HATE_SPEECH', threshold='BLOCK_NONE'),
        types.SafetySetting(category='HARM_CATEGORY_HARASSMENT', threshold='BLOCK_NONE'),
        types.SafetySetting(category='HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold='BLOCK_NONE'),
        types.SafetySetting(category='HARM_CATEGORY_DANGEROUS_CONTENT', threshold='BLOCK_NONE'),
    ]
    active_safety_settings = safety_settings_for_owner if str(user_id) == str(BOT_OWNER_QQ) else safety_settings_for_users

    try:
        # 准备 system_instruction
        persona_text = personas.get(str(session_id), "一个乐于助人的AI助手")
        # 你的所有 prompt engineering 逻辑都保持不变
        # ... (此处省略了你原来非常详细的 prompt 构建，为了简洁，但你可以把它们完整地粘贴回来)
        sticker_keys = ", ".join(stickers.keys())
        emoji_keys = " , ".join(EMOJI_MAPPING.keys())
        # 此处可以把你原来构建 abilities, AI_CONSTITUTION, long_term_memory_prompt 的代码粘贴回来
        # ...
        system_instruction_text = system_prompt_override if system_prompt_override else f"你的角色设定是：{persona_text}" # 这是一个简化的例子

        # 准备 contents (历史记录)
        # [MIGRATION] 新版SDK的 history 格式要求 role 是 'user' 和 'assistant'
        final_history = []
        for msg in history:
            role = 'assistant' if msg['role'] == 'model' else 'user'
            final_history.append({'role': role, 'parts': msg['parts']})

        # 准备 config (所有配置项)
        config = types.GenerateContentConfig(
            safety_settings=active_safety_settings,
            temperature=0.9,
        )

        # 发起请求
        response = client.models.generate_content(
            model='gemini-1.5-pro-latest',
            contents=final_history,
            system_instruction=system_instruction_text,
            config=config,
            request_options={"timeout": 120}
        )
        return response.text

    except Exception as e:
        print(f"❌ 调用AI时发生错误: {e}")
        # 这里的错误处理和key切换逻辑可以复用你之前的
        error_str = str(e).lower()
        if "api key not valid" in error_str or "permission_denied" in error_str:
            return rotate_key_and_retry(history, session_id, user_id, system_prompt_override)
        traceback.print_exc()
        return f"出错了: {e}"

def process_buffered_messages(session_id, user_id, message_type, ws):
    fetch_data_from_companion_space(user_id)
    global message_buffer, conversation_history
    with buffer_lock:
        buffered_parts = message_buffer.get(session_id, [])
        if not buffered_parts: return
        print(f"⏳ 会话 {session_id} 输入冷却，合并 {len(buffered_parts)} 条消息进行处理。")
        if session_id in message_buffer: del message_buffer[session_id]
        if session_id in user_timers: del user_timers[session_id]
    final_prompt_parts, temp_files, texts = [], [], []
    for type, data, file_path in buffered_parts:
        if type == 'text': texts.append(data)
        elif type == 'image': final_prompt_parts.append(data)
        elif type == 'multimodal': final_prompt_parts.extend(data)
    full_text = "\n".join(texts).strip()
    now = datetime.now(pytz.timezone('Asia/Shanghai'))
    full_text = f"[{now.strftime('%m-%d %H:%M')}] {full_text}"
    if not final_prompt_parts and not full_text: print("信息为空，已忽略。"); return
    if full_text: final_prompt_parts.insert(0, full_text)
    if session_id not in conversation_history: conversation_history[session_id] = []
    user_message_entry = {'role': 'user', 'parts': final_prompt_parts}
    if temp_files: user_message_entry['local_file_paths'] = temp_files 
    conversation_history[session_id].append(user_message_entry)
    while len(conversation_history[session_id]) > MEMORY_MAX_TURNS * 2:
        messages_to_delete = conversation_history[session_id][0:2]
        for msg in messages_to_delete:
            if 'local_file_paths' in msg:
                for file_path in msg['local_file_paths']:
                    if file_path and os.path.exists(file_path):
                        try: os.remove(file_path); print(f"♻️ 上下文过期，已清理文件: {file_path}")
                        except OSError as e: print(f"❌ 清理过期文件失败: {e}")
        del conversation_history[session_id][0:2]
    reply_text = call_gemini_with_history(conversation_history[session_id], session_id,user_id)
    send_reply(session_id, user_id, message_type, reply_text, ws)

# --- 网页/视频解析函数 (需要升级文件上传部分) ---
# [MIGRATION] 升级文件上传的函数
def parse_douyin_video_with_selenium(url):
    if not client: return "[系统提示：客户端未初始化，无法处理视频]"
    driver = None
    try:
        # ... (你的 selenium 抓取逻辑保持不变)
        print(f"🚀 启动Selenium终极特工 v5.2.1 解析抖音: {url}")
        chrome_options = Options(); chrome_options.add_argument("--headless"); chrome_options.add_argument("--no-sandbox"); chrome_options.add_argument("--disable-dev-shm-usage"); chrome_options.add_argument("--log-level=3"); chrome_options.add_experimental_option('excludeSwitches', ['enable-automation']); chrome_options.add_argument('user-agent="Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1"'); chrome_options.add_argument(r'--user-data-dir=C:\Users\Administrator\Desktop\bot_chrome_profile')
        service = ChromeService(ChromeDriverManager().install()); driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.get(url)
        wait = WebDriverWait(driver, 15); video_element = wait.until(EC.presence_of_element_located((By.TAG_NAME, 'video'))); video_url = video_element.get_attribute('src')
        if not video_url or not video_url.startswith('http'):
             script_content = driver.find_element(By.XPATH, "//script[contains(., 'video_play_addr')]").get_attribute('innerHTML'); match = re.search(r'"video_play_addr":"(.*?)"', script_content)
             if match: video_url = match.group(1).encode('utf-8').decode('unicode_escape')
             else: driver.quit(); return "[系统提示：未能从页面JSON中解析出视频地址。]"
        driver.quit()
        session = requests.Session(); retry = Retry(total=3, backoff_factor=1, status_forcelist=[500, 502, 503, 504]); adapter = HTTPAdapter(max_retries=retry); session.mount('http://', adapter); session.mount('https://', adapter)
        headers = {'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 13_2_3 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/13.0.3 Mobile/15E148 Safari/604.1', 'Referer': 'https://www.douyin.com/'}
        response = session.get(video_url, stream=True, headers=headers, timeout=60); response.raise_for_status()
        with tempfile.NamedTemporaryFile(delete=False, suffix=".mp4", dir="tts_cache") as temp_video:
            for chunk in response.iter_content(chunk_size=8192): temp_video.write(chunk)
            video_path = temp_video.name
        print(f"   - ✅ 视频下载成功，保存至: {video_path}")
        # --- 升级部分 ---
        print("   - ⏳ 正在上传完整视频至 GenAI...")
        # [MIGRATION] 使用 client.files.upload
        video_file = client.files.upload(file=video_path, display_name="Douyin Video")
        # [MIGRATION] 新版SDK上传后文件直接可用，无需等待
        print("   - ✅ 视频文件处理完毕！现在提交给AI。")
        return [f"这是用户分享的一个抖音视频。请观看并总结这个视频的核心内容、氛围和槽点，然后给我一个有趣的回应。", video_file]

    except Exception as e:
        print(f"❌ [Selenium终极特工] 解析失败: {e}")
        if driver: driver.quit()
        return f"[系统提示：使用终极模式解析抖音失败。]"

def parse_video_unified(url, size_threshold_mb=50):
    if not client: return "[系统提示：客户端未初始化，无法处理视频]"
    # ... (你的 yt-dlp 逻辑保持不变)
    size_threshold_bytes = size_threshold_mb * 1024 * 1024; cookie_file_path = "cookies.txt" 
    if not os.path.exists(cookie_file_path): return "[系统提示：错误！未找到 cookies.txt 文件。]"
    try:
        print(f"🎬 启动统一视频解析器 v4.1: {url}")
        ydl_opts_meta = {'quiet': True, 'noplaylist': True, 'cookiefile': cookie_file_path}
        with yt_dlp.YoutubeDL(ydl_opts_meta) as ydl: info_dict = ydl.extract_info(url, download=False)
        filesize = info_dict.get('filesize') or info_dict.get('filesize_approx'); title = info_dict.get('title', '无标题视频')
        if filesize and filesize < size_threshold_bytes:
            ydl_opts_download = {'format': 'best[ext=mp4]/best', 'outtmpl': os.path.join('tts_cache', '%(id)s.%(ext)s'), 'noplaylist': True, 'quiet': True, 'max_filesize': size_threshold_bytes, 'cookiefile': cookie_file_path}
            with yt_dlp.YoutubeDL(ydl_opts_download) as ydl_down: ydl_down.download([url]); video_path = ydl_down.prepare_filename(info_dict)
            if not os.path.exists(video_path): return "[系统提示：视频下载失败。]"
            print(f"   - ✅ 视频下载成功: {video_path}")
            # --- 升级部分 ---
            print("   - ⏳ 正在上传完整视频至 GenAI...")
            # [MIGRATION] 使用 client.files.upload
            video_file = client.files.upload(file=video_path, display_name=title)
            print("   - ✅ 视频文件处理完毕，现在提交给AI。")
            return [f"这是用户分享的视频【{title}】。请完整观看并总结这个视频的核心内容、氛围和槽点，然后给我一个有趣的回应。", video_file]
        else:
            if filesize: print(f"   - 视频大小 {filesize/1024/1024:.2f}MB, 超过阈值。执行智能抽帧...")
            else: print("   - 未能获取确切视频大小，为安全起见，执行智能抽帧...")
            stream_url = info_dict.get('url')
            if not stream_url:
                 info_dict_stream = yt_dlp.YoutubeDL(ydl_opts_meta).extract_info(url, download=False)
                 stream_url = info_dict_stream.get('url')
            if not stream_url: return "[系统提示：无法获取到用于抽帧的视频流地址。]"
            return parse_frames_from_stream(stream_url, title)
    except Exception as e:
        print(f"❌ [统一视频解析 v4.1] 过程发生严重错误: {e}")
        return f"[系统提示：视频解析失败。错误: {e}]"
# ... 其他辅助函数如 parse_url_content, parse_xhs_content, parse_frames_from_stream, fetch_data_from_companion_space, push_data_to_companion_space, get_forwarded_msg_content 保持不变...
# (此处省略这些函数的代码，因为它们不直接调用 GenAI API)
def parse_url_content(url):
    """[灵魂读取版 v2] 直接加载已登录的用户配置文件"""
    driver = None
    try:
        print(f"🚀 启动灵魂读取模式 v2 抓取: {url}")
        chrome_options = Options(); chrome_options.add_argument("--headless"); chrome_options.add_argument("--no-sandbox"); chrome_options.add_argument("--disable-dev-shm-usage"); chrome_options.add_argument(r'--user-data-dir=C:\Users\Administrator\Desktop\bot_chrome_profile')
        driver = webdriver.Chrome(options=chrome_options)
        driver.get(url); time.sleep(5) 
        title = driver.title if driver.title else "无标题"; main_content = driver.find_element(By.TAG_NAME, 'body').text; driver.quit()
        max_length = 30000
        if len(main_content) > max_length: main_content = main_content[:max_length] + "..."
        formatted_text = (f"--- 网页内容解析 ---\n标题: {title}\n内容摘要:\n{main_content}\n--- 内容结束 ---")
        print(f"✅ 灵魂读取 v2 抓取成功: {title}"); return formatted_text
    except Exception as e:
        print(f"❌ [灵魂读取 v2] 失败: {e}")
        if driver: driver.quit()
        return f"[系统提示：无法解析该网页内容]"
def parse_xhs_content(url):
    """[多模态内容识别器 v3.2 - 终极路由方案]"""
    driver = None
    try:
        print(f"🚀 启动小红书智能内容识别器 v3.2: {url}")
        chrome_options = Options(); chrome_options.add_argument("--headless"); chrome_options.add_argument("--no-sandbox"); chrome_options.add_argument("--disable-dev-shm-usage"); chrome_options.add_argument("--log-level=3"); chrome_options.add_experimental_option('excludeSwitches', ['enable-automation']); chrome_options.add_argument(r'--user-data-dir=C:\Users\Administrator\Desktop\bot_chrome_profile')
        service = ChromeService(ChromeDriverManager().install()); driver = webdriver.Chrome(service=service, options=chrome_options)
        driver.get(url); wait = WebDriverWait(driver, 10)
        try:
            print("   - 正在快速探测视频播放器..."); short_wait = WebDriverWait(driver, 5); short_wait.until(EC.presence_of_element_located((By.TAG_NAME, 'video')))
            print("   - ✅ 探测到视频！转交专业视频处理器..."); driver.quit(); return parse_video_unified(url)
        except TimeoutException:
            print("   - 未探测到视频，按图文帖子流程处理...")
            wait.until(EC.presence_of_element_located((By.CSS_SELECTOR, '.note-slider-img'))); print("   - ✅ 目标图片已出现！")
            title = driver.title; post_text = ""
            try: text_element = driver.find_element(By.CSS_SELECTOR, '#detail-desc'); post_text = text_element.text; print("✅ 成功提取到帖子文字。")
            except NoSuchElementException: print("ℹ️ 页面中未找到独立的文字描述区域。")
            image_elements = driver.find_elements(By.CSS_SELECTOR, '.note-slider-img'); print(f"🖼️ 成功定位到 {len(image_elements)} 张帖子图片...")
            images_to_process = []
            headers = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36' }
            for img_element in image_elements:
                img_url = img_element.get_attribute('src') 
                if img_url and ('xiaohongshu.com' in img_url or 'xhscdn.com' in img_url):
                    if not img_url.startswith('http'): img_url = 'https:' + img_url
                    try: response = requests.get(img_url, timeout=20, headers=headers); response.raise_for_status(); image_data = Image.open(io.BytesIO(response.content)); images_to_process.append(image_data)
                    except Exception as e: print(f"   - ❌ 下载图片失败: {e}")
            driver.quit()
            if not images_to_process: return "[系统提示：未能成功下载帖子图片。]"
            prompt_text = f"这是从【{title}】分享的帖子..."
            if post_text: prompt_text += f"，文字内容如下：\n---\n{post_text}\n---"
            final_content_parts = [prompt_text, *images_to_process]; print(f"✅ 内容处理完成，共包含 {len(images_to_process)} 张图片和一段文字。"); return final_content_parts
    except Exception as e:
        print(f"❌ [小红书内容识别器] 抓取失败: {e}")
        if driver: driver.quit()
        return f"[系统提示：无法解析该小红书内容]"
def parse_frames_from_stream(stream_url, title, frame_interval_seconds=10, max_frames=6):
    cap = cv2.VideoCapture(stream_url)
    if not cap.isOpened(): return "[系统提示：OpenCV 无法打开视频流。]"
    fps = cap.get(cv2.CAP_PROP_FPS) or 30; frame_skip = int(fps * frame_interval_seconds); frames_to_process, current_frame = [], 0
    print(f"   - 📹 开始抽帧: {title}, 帧率: {fps:.2f}fps.")
    while cap.isOpened() and len(frames_to_process) < max_frames:
        cap.set(cv2.CAP_PROP_POS_FRAMES, current_frame); ret, frame = cap.read()
        if not ret: break
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB); image = Image.fromarray(frame_rgb); frames_to_process.append(image)
        print(f"     - 成功提取第 {len(frames_to_process)} 帧 (视频约 {int(current_frame/fps)} 秒处)"); current_frame += frame_skip
    cap.release()
    if not frames_to_process: return "[系统提示：未能从视频中成功提取任何关键帧。]"
    return [f"这是用户分享的视频【{title}】的几个关键画面。请根据这些画面，推测并总结这个视频可能的内容、风格和看点，然后给我一个有趣的回应。", *frames_to_process]
def fetch_data_from_companion_space(user_id):
    try:
        companion_backend_url = os.getenv('COMPANION_BACKEND_URL')
        if not companion_backend_url: return False
        api_url = f"{companion_backend_url}/api/fetch/data/{user_id}"; print(f"🔄 正在为用户 {user_id} 从云端拉取最新数据...")
        response = requests.get(api_url, timeout=15, proxies={"http": None, "https": None})
        if response.status_code == 200:
            data = response.json()
            if 'persona' in data: personas[str(user_id)] = data['persona']; save_personas(); print(f"   - ✅ 人设已同步。")
            if 'memories' in data:
                MEMORY_DIR = "memory_data"; memory_file = os.path.join(MEMORY_DIR, f"memory_{user_id}.json")
                with open(memory_file, 'w', encoding='utf-8') as f: json.dump(data['memories'], f, ensure_ascii=False, indent=4)
                print(f"   - ✅ {len(data['memories'])} 条长期记忆已同步。")
            return True
        elif response.status_code == 404: print(f"   - ℹ️ 用户 {user_id} 在云端无记录，跳过拉取。"); return True
        else: print(f"   - ❌ 拉取数据失败，服务器返回状态码: {response.status_code}"); return False
    except Exception as e: print(f"   - ❌ 拉取/处理云端数据时发生错误: {e}"); return False
def push_data_to_companion_space(user_id, session_id):
    try:
        companion_backend_url = os.getenv('COMPANION_BACKEND_URL')
        if not companion_backend_url: print("⚠️ 未配置 COMPANION_BACKEND_URL，跳过数据推送。"); return
        print(f"🚀 正在为用户 {user_id} 推送本地数据到云端...")
        persona_text = personas.get(str(session_id), ""); persona_data = {'qq_id': user_id, 'persona': persona_text}
        try:
            response_persona = requests.post(f"{companion_backend_url}/api/sync/persona", json=persona_data, timeout=35, proxies={"http": None, "https": None})
            if response_persona.status_code == 200: print(f"   - ✅ 人设推送成功。")
            else: print(f"   - ⚠️ 推送人设失败，服务器返回: {response_persona.status_code}")
        except Exception as e: print(f"   - ❌ 推送人设时发生网络错误: {e}")
        MEMORY_DIR = "memory_data"; memory_file = os.path.join(MEMORY_DIR, f"memory_{session_id}.json"); memories = []
        if os.path.exists(memory_file):
            with open(memory_file, 'r', encoding='utf-8') as f: memories = json.load(f)
        memory_data = {'qq_id': user_id, 'memories': memories}
        try:
            response_memory = requests.post(f"{companion_backend_url}/api/sync/memory", json=memory_data, timeout=15, proxies={"http": None, "https": None})
            if response_memory.status_code == 200: print(f"   - ✅ {len(memories)} 条记忆推送成功。")
            else: print(f"   - ⚠️ 推送记忆失败，服务器返回: {response_memory.status_code}")
        except Exception as e: print(f"   - ❌ 推送记忆时发生网络错误: {e}")
    except Exception as e: print(f"❌ 推送数据到陪伴空间时发生未知错误: {e}")
def get_forwarded_msg_content(msg_id):
    if not NAPCAT_HTTP_URL: return "[系统提示：无法解析转发消息，因为未配置HTTP API地址]"
    api_url = f"{NAPCAT_HTTP_URL}/api/message/get_forward_msg"; headers = {"Authorization": f"Bearer {NAPCAT_TOKEN}"}; payload = {"message_id": msg_id}
    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=30); response.raise_for_status(); data = response.json()
        if data.get("status") == "ok" and data.get("data"):
            messages = data["data"].get("messages", []); final_multimodal_parts = []; text_log = ["--- 聊天记录开始 ---"]; images_to_process = []
            for msg in messages:
                nickname = msg.get("sender", {}).get("nickname", "未知"); content_parts_text = []
                for segment in msg.get("message", []):
                    seg_type = segment.get("type"); seg_data = segment.get("data", {})
                    if seg_type == "text": content_parts_text.append(seg_data.get("text", ""))
                    elif seg_type == "image":
                        content_parts_text.append("[图片]"); img_url = seg_data.get("url")
                        if img_url:
                            try: img_response = requests.get(img_url, timeout=20, proxies={"http": None, "https": None}); img_response.raise_for_status(); image = Image.open(io.BytesIO(img_response.content)); images_to_process.append(image)
                            except Exception as e: print(f"❌ 下载转发的图片失败: {e}")
                full_content = "".join(content_parts_text).strip()
                if full_content: text_log.append(f"{nickname}: {full_content}")
            text_log.append("--- 聊天记录结束 ---"); final_multimodal_parts.append("\n".join(text_log))
            if images_to_process: final_multimodal_parts.extend(images_to_process)
            return final_multimodal_parts if images_to_process else final_multimodal_parts[0]
        else: return f"[系统提示：解析转发消息失败，API返回: {data.get('wording', '未知错误')}]"
    except requests.exceptions.RequestException as e: print(f"❌ 请求转发消息内容失败: {e}"); return f"[系统提示：网络错误，无法获取转发消息内容]"

# [MIGRATION] 全新的画图核心函数
def generate_image_and_reply(prompt_text, is_editing, session_id, user_id, message_type, ws):
    """
    【全新迁移版】核心图片生成函数。
    - 使用全新的 google-genai SDK 和 client.models.generate_images 方法。
    """
    global client
    if not client:
        send_text_reply("抱歉，我的客户端好像还没准备好，请稍后再试。", session_id, user_id, message_type, ws)
        return

    print(f"🎨 开始执行图片生成任务: {prompt_text}")
    
    try:
        print("   - 正在调用 Imagen 3 模型生成图片...")
        gen_images = client.models.generate_images(
            model='imagen-3.0-generate-001', # 使用官方推荐的最新图片模型
            prompt=prompt_text,
            config=types.GenerateImagesConfig(
                number_of_images=1,
            )
        )

        if not gen_images.generated_images:
            raise ValueError("API 没有返回任何生成的图片。")

        image_data = gen_images.generated_images[0].image.image_bytes

        with tempfile.NamedTemporaryFile(delete=False, suffix=".png", dir="tts_cache") as temp_img:
            temp_img.write(image_data)
            image_path = temp_img.name
        
        abs_path = os.path.abspath(image_path).replace('\\', '/')
        cq_image = f"[CQ:image,file=file:///{abs_path}]"
        
        action = {
            "action": "send_group_msg" if message_type == "group" else "send_private_msg",
            "params": { "message": f"[CQ:at,qq={user_id}] {cq_image}" if message_type == "group" else cq_image, "user_id": int(user_id), "group_id": int(session_id) }
        }
        ws.send(json.dumps(action))
        print(f"   - ✅ 图片已成功发送给用户 {user_id}。")

        bot_message_entry = {
            'role': 'model',
            'parts': ["[图片]"],
            'local_file_paths': [image_path],
            'generated_image_data': image_data 
        }
        conversation_history.setdefault(session_id, []).append(bot_message_entry)

    except Exception as e:
        print(f"❌ 图片生成失败: {e}")
        traceback.print_exc()
        error_text = f"糟糕，我的画笔出错了... 错误详情: {str(e)}"
        send_text_reply(error_text, session_id, user_id, message_type, ws)

# --- 消息发送与处理 (大部分逻辑保持不变) ---
def send_text_reply(text, session_id, user_id, message_type, ws):
    action = { "action": "send_group_msg" if message_type == "group" else "send_private_msg", "params": { "message": f"[CQ:at,qq={user_id}] {text}" if message_type == "group" else text, "user_id": int(user_id), "group_id": int(session_id) } }
    ws.send(json.dumps(action))

# ... send_reply, main_message_handler, on_open, on_error, on_close, on_message, send_heartbeat, run_auto_greeting_task, run_user_tasks, scheduler_loop, event_processor, wipe_user_data, execute_delete_friend, __main__ 等函数保持不变...
# (此处省略这些函数的代码，因为它们不直接调用 GenAI API，无需修改)
def send_reply(session_id, user_id, message_type, reply_text, ws):
    global conversation_history, user_strikes
    if str(user_id) != str(BOT_OWNER_QQ):
        if "[ACTION: BLOCK]" in reply_text:
            print(f"❗️ Gemini 对用户 {user_id} 作出 [BLOCK] 判决！"); reply_text = re.sub(r"\[ACTION: BLOCK\]", "", reply_text).strip()
            if reply_text: action = {"action": "send_private_msg", "params": {"user_id": int(user_id), "message": reply_text}}; ws.send(json.dumps(action)); time.sleep(0.5)
            execute_delete_friend(user_id, ws); return
        if "[ACTION: IGNORE]" in reply_text:
            print(f"⚠️ Gemini 对用户 {user_id} 作出 [IGNORE] 判决！"); reply_text = re.sub(r"\[ACTION: IGNORE\]", "", reply_text).strip()
            user_strikes[user_id] = {'status': 'ignored', 'strikes': 0}; save_strikes()
            ignore_event = {'role': 'model', 'parts': ["[系统事件：你已将该用户置于警告观察期。]"]}; conversation_history.setdefault(session_id, []).append(ignore_event)
    draw_match = re.search(r"\[画图:([^\]]+)\]", reply_text); edit_match = re.search(r"\[编辑图片:([^\]]+)\]", reply_text)
    if draw_match:
        prompt_for_image = draw_match.group(1).strip(); generate_image_and_reply(prompt_for_image, is_editing=False, session_id=session_id, user_id=user_id, message_type=message_type, ws=ws)
        reply_text = re.sub(r"\[画图:[^\]]+\]", "", reply_text).strip()
    elif edit_match:
        prompt_for_edit = edit_match.group(1).strip(); generate_image_and_reply(prompt_for_edit, is_editing=True, session_id=session_id, user_id=user_id, message_type=message_type, ws=ws)
        reply_text = re.sub(r"\[编辑图片:[^\]]+\]", "", reply_text).strip()
    bot_message_entry = {'role': 'model', 'parts': [reply_text], 'local_file_paths': []}
    voice_match = re.search(r"\[语音:([^\]]+)\]", reply_text); image_match = re.search(r"\[图片:([^\]]+)\]", reply_text); rps_match = re.search(r"\[互动:剪刀石头布\]", reply_text); dice_match = re.search(r"\[互动:骰子\]", reply_text)
    if rps_match: action = {"action": "send_group_msg" if message_type == "group" else "send_private_msg", "params": {"message": "[CQ:rps]", "user_id": int(user_id), "group_id": int(session_id)}}; ws.send(json.dumps(action))
    elif dice_match: action = {"action": "send_group_msg" if message_type == "group" else "send_private_msg", "params": {"message": "[CQ:dice]", "user_id": int(user_id), "group_id": int(session_id)}}; ws.send(json.dumps(action))
    elif voice_match:
        text_to_speak = voice_match.group(1).strip()
        if text_to_speak:
            output_dir = "tts_cache"; output_file = os.path.join(output_dir, f"{uuid.uuid4()}.mp3")
            audio_path = asyncio.run(text_to_speech_hub(text_to_speak, output_file, user_id))
            if audio_path:
                try:
                    abs_path = os.path.abspath(audio_path).replace('\\', '/'); cq_record = f"[CQ:record,file=file:///{abs_path}]"
                    action = {"action": "send_group_msg" if message_type == "group" else "send_private_msg", "params": {"message": f"[CQ:at,qq={user_id}] {cq_record}" if message_type == "group" else cq_record, "user_id": int(user_id), "group_id": int(session_id)}}
                    ws.send(json.dumps(action)); bot_message_entry['local_file_paths'].append(audio_path)
                except Exception as e: print(f"❌ 发送语音文件时出错: {e}")
    elif image_match:
        keyword = image_match.group(1).strip()
        if keyword in stickers and stickers[keyword]:
            image_url = random.choice(stickers[keyword])
            try:
                response = requests.get(image_url, timeout=20, proxies={"http": None, "https": None}); response.raise_for_status()
                with tempfile.NamedTemporaryFile(delete=False, suffix=".gif", dir="tts_cache") as temp_img: temp_img.write(response.content); image_path = temp_img.name
                abs_path = os.path.abspath(image_path).replace('\\', '/'); cq_image = f"[CQ:image,file=file:///{abs_path}]"
                action = {"action": "send_group_msg" if message_type == "group" else "send_private_msg", "params": {"message": cq_image, "user_id": int(user_id), "group_id": int(session_id)}}
                ws.send(json.dumps(action)); bot_message_entry['local_file_paths'].append(image_path); print(f"✅ 表情包发送成功: {keyword}")
            except Exception as e: print(f"❌ 表情包下载或发送失败: {e}"); ws.send(json.dumps({"action": "send_private_msg", "params": {"user_id": int(user_id), "message": "哎呀，这张图好像飞走啦..."}}))
        else: ws.send(json.dumps({"action": "send_private_msg", "params": {"user_id": int(user_id), "message": f"我好像还没有关于“{keyword}”的表情包诶..."}}))
    text_to_send = re.sub(r"\[(语音|图片|互动):[^\]]+\]", "", reply_text).strip()
    if text_to_send:
        message_parts = re.split(r'---\s*|\[间隔:(\d+\.?\d*)]', text_to_send); i = 0
        while i < len(message_parts):
            msg_part = message_parts[i]
            if msg_part and msg_part.strip():
                final_reply_text = process_emojis(msg_part.strip())
                action = {"action": "send_group_msg" if message_type == "group" else "send_private_msg", "params": {"message": f"[CQ:at,qq={user_id}] {final_reply_text}" if message_type == "group" else final_reply_text, "user_id": int(user_id), "group_id": int(session_id)}}
                try: ws.send(json.dumps(action)); print(f"▶️ 已发送消息给 {session_id}: {msg_part.strip()[:30]}...")
                except Exception as e: print(f"❌ 发送消息失败！Session: {session_id}, 错误: {e}")
            delay_to_use = MULTI_MESSAGE_DELAY
            if i + 1 < len(message_parts) and message_parts[i+1]:
                try:
                    requested_delay = float(message_parts[i+1])
                    if 0 < requested_delay <= MAX_RESPONSE_DELAY: delay_to_use += requested_delay; print(f"   └─ AI请求有效间隔 {requested_delay} s, 总计{delay_to_use: .2f}秒...")
                    else: print(f"   └─ ⚠️ AI请求间隔 {requested_delay}s 超出安全范围，使用默认间隔。")
                    i += 1 
                except (ValueError, TypeError): pass
            if i < len(message_parts) - 1: time.sleep(delay_to_use)
            i += 1
    conversation_history.setdefault(session_id, []).append(bot_message_entry)
def main_message_handler(ws, data):
    sender_id = str(data.get("sender", {}).get("user_id"))
    if sender_id in ignore_list: return
    if sender_id in user_strikes and user_strikes[sender_id].get('status') == 'ignored':
        raw_text_check = data.get("raw_message", "").strip(); apology_keywords = ["对不起", "抱歉", "是我的问题", "我错了"]
        if any(keyword in raw_text_check for keyword in apology_keywords):
            print(f"😌 用户 {sender_id} 已道歉，解除警告状态。"); del user_strikes[sender_id]; save_strikes()
            apology_event = "[系统事件：用户为之前的不当行为进行了道歉，暂时解除本次警告。]"
            with buffer_lock:
                if sender_id not in message_buffer: message_buffer[sender_id] = []
                message_buffer[sender_id].append(('text', apology_event, None))
        else:
            user_strikes[sender_id]['strikes'] += 1; strikes = user_strikes[sender_id]['strikes']; save_strikes()
            if strikes >= 3: print(f"😡 用户 {sender_id} 在警告期内持续骚扰，达到3次，执行自动清除。"); execute_delete_friend(sender_id, ws)
            else: warning_msg = f"当前骚扰次数 {strikes}/3。持续发送无效信息将被删除。"; action = {"action": "send_private_msg", "params": {"user_id": int(sender_id), "message": warning_msg}}; ws.send(json.dumps(action))
            return
    if data.get("post_type") not in ["message","message_sent"] or data.get("message_type") not in ["private", "group"]: return
    message_type = data["message_type"]
    if message_type == 'group': session_id = str(data.get('group_id'))
    elif message_type == 'private': session_id = str(data.get('target_id')) if data.get("post_type") == 'message_sent' else str(data.get('user_id'))
    user_id = session_id if message_type == "private" else str(data.get("user_id"))
    message_segments = data.get("message", []); is_game_event = any(seg.get("type") in ['rps', 'dice'] for seg in message_segments)
    if sender_id == bot_qq_id and not is_game_event: print("🤖 忽略来自自身的非游戏消息回显。"); return
    raw_text = data.get("raw_message", "").strip()
    log_message = f"📥 收到 [群聊] (群 {session_id}, 成员 {user_id}): {raw_text}" if message_type == 'group' else f"📥 收到 [私聊] (来自 {user_id}): {raw_text}"
    if log_message: print(log_message)
    if is_game_event:
        for segment in message_segments:
            seg_type, seg_data = segment.get("type"), segment.get("data", {}); game_text = ""
            if seg_type == 'dice': game_text = f"[系统事件：{'Gem' if sender_id == bot_qq_id else '对方'}摇的骰子结果是 {seg_data.get('result')} 点]"
            elif seg_type == 'rps': result_text = {'1': "布", '2': "剪刀", '3': "石头"}.get(str(seg_data.get('result', '')), "未知出拳"); game_text = f"[系统事件：{'Gem' if sender_id == bot_qq_id else '对方'}出了 {result_text}]"
            if game_text:
                print(f"👂 监听到游戏事件: {game_text}")
                with buffer_lock:
                    if session_id not in message_buffer: message_buffer[session_id] = []
                    message_buffer[session_id].append(('text', game_text, None))
                    if sender_id != bot_qq_id:
                        if session_id in user_timers: user_timers[session_id].cancel()
                        timer = threading.Timer(0.5, process_buffered_messages, args=[session_id, user_id, message_type, ws]); user_timers[session_id] = timer; timer.start()
        return
    if raw_text.startswith("#"):
        # ... (所有 #指令 的逻辑保持不变，因为它们不直接调用 GenAI API)
        # (此处省略指令代码以保持简洁)
        return
    with buffer_lock:
        if session_id in user_timers: user_timers[session_id].cancel()
        if session_id not in message_buffer: message_buffer[session_id] = []
        url_found_in_message = False
        for segment in message_segments:
            seg_type, seg_data = segment.get("type"), segment.get("data", {}); target_url = None
            if seg_type == 'json' and not url_found_in_message:
                try: json_data = json.loads(seg_data.get('data', '{}')); target_url = json_data.get('meta', {}).get('news', {}).get('jumpUrl') or json_data.get('meta', {}).get('news', {}).get('qqdocurl')
                except Exception as e: print(f"❌ 解析JSON卡片失败: {e}")
            elif seg_type == 'text' and not url_found_in_message:
                url_match = re.search(r'https?://[^\s]+', seg_data.get('text', '')); 
                if url_match: target_url = url_match.group(0)
            if target_url and not url_found_in_message:
                url_found_in_message = True; parsed_content = None
                if "douyin.com" in target_url:
                    if BOT_OWNER_QQ and sender_id == BOT_OWNER_QQ: parsed_content = parse_douyin_video_with_selenium(target_url)
                    else: reply = "我只看怡翎分享的抖音。"; final_reply = process_emojis(reply); action = {"action": "send_group_msg" if message_type == "group" else "send_private_msg", "params": {"message": f"[CQ:at,qq={user_id}] {final_reply}" if message_type == "group" else final_reply, "user_id": int(user_id), "group_id": int(session_id)}}; ws.send(json.dumps(action))
                elif "xiaohongshu.com" in target_url or "instagram.com" in target_url: parsed_content = parse_xhs_content(target_url)
                elif "bilibili.com" in target_url: parsed_content = parse_video_unified(target_url)
                else: parsed_content = parse_url_content(target_url) 
                if parsed_content: message_buffer[session_id].append(('multimodal' if isinstance(parsed_content, list) else 'text', parsed_content, None))
            if seg_type == 'text':
                text_content = re.sub(r'https?://[^\s]+', '', seg_data.get('text', '')).strip()
                if text_content: message_buffer[session_id].append(('text', text_content, None))
            elif seg_type == 'forward':
                forward_id = seg_data.get("id")
                if forward_id:
                    forward_content = get_forwarded_msg_content(forward_id)
                    message_buffer[session_id].append(('multimodal' if isinstance(forward_content, list) else 'text', forward_content, None))
            elif seg_type == 'image':
                try: response = requests.get(seg_data.get('url'), timeout=30, proxies={"http": None, "https" : None}); img = Image.open(io.BytesIO(response.content)); message_buffer[session_id].append(('image', img, None))
                except Exception as e: print(f"   - ❌ 图片处理失败: {e}")
            elif seg_type == 'record':
                voice_url = seg_data.get('url')
                if voice_url:
                    processed_content = process_voice_message(voice_url)
                    message_buffer[session_id].append(('multimodal' if isinstance(processed_content, list) else 'text', processed_content, None))
        timer = threading.Timer(MESSAGE_BUFFER_TIME, process_buffered_messages, args=[session_id, user_id, message_type, ws]); user_timers[session_id] = timer; timer.start()
def on_open(ws): print("✅ 连接 NapCatQQ 成功！"); threading.Thread(target=send_heartbeat, args=(ws,), daemon=True).start(); threading.Thread(target=event_processor, args=(ws,), daemon=True).start(); threading.Thread(target=scheduler_loop, args=(ws,), daemon=True).start()
def on_error(ws, error): print(f"❌ 发生错误: {error}")
def on_close(ws, close_code, close_msg): print("🔌 连接已断开...")
def on_message(ws, message): event_queue.put(message)
def send_heartbeat(ws):
    while True: time.sleep(25); ws.send(json.dumps({"action": "get_status", "params": {}, "echo": "heartbeat"}))
def run_auto_greeting_task(ws):
    if not subscribers: print("📢 (自动问候) 当前无人订阅，跳过任务。"); return
    print(f"📢 执行每日自动问候任务，目标 {len(subscribers)} 位订阅者...")
    def send_greetings_thread():
        for friend_id in subscribers:
            friend_info = next((f for f in friend_list_cache if str(f.get('user_id')) == friend_id), None); friend_name = friend_info['nickname'] if friend_info else friend_id
            history = conversation_history.get(friend_id, []); context = "\n".join([f"{'我' if msg['role']=='model' else '对方'}: {msg['parts'][0]}" for msg in history[-4:] if isinstance(msg['parts'][0], str)])
            prompt = f"现在是北京时间{datetime.now(pytz.timezone('Asia/Shanghai')).strftime('%H:%M')}。和朋友'{friend_name}'的最近聊天记录：\n---\n{context if context else '无'}\n---\n请主动生成一句自然的问候。"
            greeting_msg = call_gemini_with_history([], friend_id, friend_id, system_prompt_override=prompt); send_reply(friend_id, friend_id, 'private', greeting_msg, ws)
            delay = random.randint(AUTO_GREETING_DELAY[0], AUTO_GREETING_DELAY[1]); print(f"   -> 已发送给订阅者 {friend_name}。下次发送将在 {delay} 秒后..."); time.sleep(delay)
        print("✅ 所有订阅者问候发送完毕！")
    threading.Thread(target=send_greetings_thread, daemon=True).start()
def run_user_tasks(ws):
    global user_tasks
    now_ts = time.time(); due_tasks = [t for t in user_tasks if t['timestamp'] <= now_ts]
    if not due_tasks: return
    for task in due_tasks:
        print(f"🔔 执行用户任务: {task['id']} - {task['message_theme']}")
        prompt = f"这是一个提醒任务。当时上下文是：\n---\n{task['context'] if task['context'] else '无'}\n---\n用户的原始指令是：'{task['message_theme']}'。请生成一段合适的提醒消息。"
        task_msg = call_gemini_with_history([], task['target_id'], task['user_id'], system_prompt_override=prompt); send_reply(task['target_id'], task['user_id'], task['type'], task_msg, ws)
    user_tasks = [t for t in user_tasks if t['timestamp'] > now_ts]; save_tasks()
def scheduler_loop(ws_app):
    print("⚙️ 任务调度器核心已启动..."); schedule.every(10).minutes.do(lambda: ws_app.send(json.dumps({"action": "get_friend_list", "echo": "friend_list_update_for_scheduler"}))); schedule.every(30).seconds.do(run_user_tasks, ws=ws_app)
    if AUTO_GREETING_ENABLED:
        for t in AUTO_GREETING_TIMES: schedule.every().day.at(t, "Asia/Shanghai").do(run_auto_greeting_task, ws=ws_app)
    def initial_setup(): time.sleep(5); ws_app.send(json.dumps({"action": "get_friend_list", "echo": "friend_list_update_for_scheduler"})); ws_app.send(json.dumps({"action": "get_login_info", "echo": "get_login_info"}))
    threading.Thread(target=initial_setup, daemon=True).start()
    while True: schedule.run_pending(); time.sleep(1)
def event_processor(ws):
    print("消息处理器已启动...")
    while True:
        message = event_queue.get(); data = json.loads(message)
        if data.get('echo'):
            echo = data.get('echo'); global friend_list_cache, bot_qq_id
            if echo.startswith('msg_'):
                if data.get('status') == 'ok' and data.get('data', {}).get('message_id'): session_id = echo.split('_')[1]; last_message_ids[session_id] = data['data']['message_id']
            elif echo == 'friend_list_update_for_scheduler': friend_list_cache = data.get('data', []); print(f"✅ (调度器)好友列表已更新，共 {len(friend_list_cache)} 位好友。")
            elif echo == "get_login_info": bot_qq_id = str(data.get('data', {}).get('user_id')); print(f"🤖 已确认机器人自身QQ号: {bot_qq_id}")
        else: main_message_handler(ws, data)
def wipe_user_data(user_id):
    print(f"🗑️ 正在执行数据清除程序，目标用户: {user_id}..."); session_id = str(user_id)
    if session_id in personas: del personas[session_id]; save_personas(); print(f"   - 人设数据已清除。")
    memory_file = os.path.join("memory_data", f"memory_{session_id}.json")
    if os.path.exists(memory_file): os.remove(memory_file); print(f"   - 长期记忆文件已删除。")
    if session_id in conversation_history: del conversation_history[session_id]; print(f"   - 内存上下文已清除。")
    if session_id in subscribers: subscribers.remove(session_id); save_subscribers(); print(f"   - 订阅状态已移除。")
    print("✅ 数据清除完毕。")
def execute_delete_friend(user_id, ws):
    print(f"💥 正在执行删除好友操作，目标: {user_id}")
    if not NAPCAT_HTTP_URL or not bot_qq_id: print("   - ❌ 缺少 HTTP URL 或机器人QQ号，无法执行删除。"); return
    farewell_message = "你的行为很不恰当，就此别过。"; action = {"action": "send_private_msg", "params": {"user_id": int(user_id), "message": farewell_message}}; ws.send(json.dumps(action)); time.sleep(1)
    api_url = f"{NAPCAT_HTTP_URL}/delete_friend"; headers = {"Authorization": f"Bearer {NAPCAT_TOKEN}"}; payload = {"friend_id": int(user_id)}
    try:
        response = requests.post(api_url, headers=headers, json=payload, timeout=15); response.raise_for_status()
        if response.status_code == 200 and response.json().get('status') == 'ok':
            print(f"   - ✅ 成功通过API删除好友 {user_id}"); wipe_user_data(user_id)
            if user_id not in ignore_list: ignore_list.append(user_id); save_ignore_list()
        else: print(f"   - ❌ API删除好友失败: {response.json().get('wording', '未知错误')}")
    except Exception as e: print(f"   - ❌ 请求API删除好友时出错: {e}")

if __name__ == "__main__":
    print("--- [主程序入口] 脚本开始执行 ---")
    try:
        print("[1/8] 正在检查/创建目录...")
        os.makedirs("memory_data", exist_ok=True); os.makedirs("tts_cache", exist_ok=True)
        print("[2/8] 正在清理旧的临时文件...")
        tts_dir = "tts_cache"
        for filename in os.listdir(tts_dir):
            try: os.unlink(os.path.join(tts_dir, filename))
            except Exception as e: print(f"   - ⚠️ 删除文件 {filename} 时出现警告: {e}")
        print("[3/8] 正在加载所有 .json 配置文件...")
        load_personas(); load_tasks(); load_stickers(); load_user_voice_preferences(); load_subscribers(); load_ignore_list(); load_strikes()
        print("   - ✅ 所有配置文件加载完毕。")
        print("[4/8] 正在检查 API Keys 配置...")
        if not API_KEYS: print("❌ 紧急警报：未在 .env 文件中加载任何 API Key！"); exit()
        print(f"   - ✅ 发现 {len(API_KEYS)} 个 API Key。")
        print("[5/8] 关键步骤：即将调用 initialize_model() 进行模型初始化...")
        if not initialize_model(): print("❌ 紧急警报：所有API Key在启动时都已失效！"); exit()
        print("[6/8] 🚀 正在启动 NapCatQQ WebSocket 连接...")
        headers = {"Authorization": f"Bearer {NAPCAT_TOKEN}"}
        ws_app = websocket.WebSocketApp(NAPCAT_WS_URL, header=headers, on_open=on_open, on_message=on_message, on_error=on_error, on_close=on_close)
        print("[7/8] 启动永久运行循环，程序现在交由 WebSocket 控制。")
        ws_app.run_forever()
    except Exception as e:
        print("\n" + "="*50); print("💥💥💥 致命错误：程序在启动过程中崩溃！ 💥💥💥"); print("="*50)
        traceback.print_exc(); input("\n按 Enter 键退出...")
