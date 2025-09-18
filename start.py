#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
陪伴空间项目快速启动脚本
检查环境配置并提供启动指导
"""

import os
import sys
import subprocess
from pathlib import Path

def check_python_version():
    """检查Python版本"""
    if sys.version_info < (3, 8):
        print("❌ 错误：需要Python 3.8或更高版本")
        print(f"   当前版本：{sys.version}")
        return False
    print(f"✅ Python版本检查通过：{sys.version.split()[0]}")
    return True

def check_env_file():
    """检查环境变量文件"""
    env_file = Path(".env")
    if not env_file.exists():
        print("⚠️  警告：未找到 .env 文件")
        print("   请复制 .env.example 为 .env 并填入实际配置")
        return False
    
    print("✅ 找到 .env 配置文件")
    return True

def check_dependencies():
    """检查依赖包"""
    required_packages = [
        "websocket-client",
        "google-generativeai", 
        "requests",
        "Pillow",
        "edge-tts",
        "schedule",
        "pytz",
        "python-dotenv",
        "selenium",
        "webdriver-manager",
        "yt-dlp",
        "opencv-python"
    ]
    
    missing_packages = []
    for package in required_packages:
        try:
            __import__(package.replace("-", "_"))
        except ImportError:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ 缺少以下依赖包：")
        for package in missing_packages:
            print(f"   - {package}")
        print("\n请运行以下命令安装：")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    print("✅ 所有依赖包已安装")
    return True

def check_napcat():
    """检查NapCat是否运行"""
    try:
        import requests
        response = requests.get("http://127.0.0.1:3000", timeout=3)
        print("✅ NapCat服务正在运行")
        return True
    except:
        print("⚠️  警告：无法连接到NapCat服务")
        print("   请确保NapCat正在运行在 http://127.0.0.1:3000")
        return False

def load_env_vars():
    """加载环境变量"""
    try:
        from dotenv import load_dotenv
        load_dotenv()
        
        required_vars = ["GEMINI_API_KEYS", "NAPCAT_TOKEN"]
        missing_vars = []
        
        for var in required_vars:
            if not os.getenv(var):
                missing_vars.append(var)
        
        if missing_vars:
            print("❌ 缺少以下环境变量：")
            for var in missing_vars:
                print(f"   - {var}")
            return False
        
        print("✅ 环境变量配置完整")
        return True
    except ImportError:
        print("❌ 无法导入python-dotenv，请安装：pip install python-dotenv")
        return False

def show_deployment_info():
    """显示部署信息"""
    print("\n" + "="*60)
    print("🚀 陪伴空间部署指南")
    print("="*60)
    print("\n1. 后端部署（Render）：")
    print("   - 上传 companion_backend/ 文件夹到GitHub")
    print("   - 在Render创建Web Service")
    print("   - 设置环境变量：GEMINI_API_KEY")
    print("   - 获取后端URL：https://your-app.onrender.com")
    
    print("\n2. 前端部署（Render）：")
    print("   - 上传 companion_frontend/ 文件夹到GitHub")
    print("   - 在Render创建Static Site")
    print("   - 设置环境变量：REACT_APP_API_URL")
    print("   - 获取前端URL：https://your-app.onrender.com")
    
    print("\n3. 修改机器人配置：")
    print("   - 在gemini-bot.py中修改companion_url")
    print("   - 更新.env文件中的COMPANION_BACKEND_URL")
    
    print("\n4. 启动机器人：")
    print("   python gemini-bot.py")

def main():
    """主函数"""
    print("🌟 陪伴空间项目启动检查")
    print("="*40)
    
    checks = [
        ("Python版本", check_python_version),
        ("环境文件", check_env_file),
        ("依赖包", check_dependencies),
        ("环境变量", load_env_vars),
        ("NapCat服务", check_napcat)
    ]
    
    all_passed = True
    for name, check_func in checks:
        print(f"\n🔍 检查{name}...")
        if not check_func():
            all_passed = False
    
    print("\n" + "="*40)
    if all_passed:
        print("🎉 所有检查通过！可以启动机器人了")
        print("\n启动命令：")
        print("python gemini-bot.py")
        
        # 询问是否立即启动
        try:
            choice = input("\n是否立即启动机器人？(y/n): ").lower()
            if choice in ['y', 'yes', '是']:
                print("\n🚀 启动机器人...")
                subprocess.run([sys.executable, "gemini-bot.py"])
        except KeyboardInterrupt:
            print("\n👋 再见！")
    else:
        print("❌ 部分检查未通过，请解决上述问题后重试")
        show_deployment_info()

if __name__ == "__main__":
    main()