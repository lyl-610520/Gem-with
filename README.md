# 🌟 陪伴空间 - Gemini QQ机器人集成项目

这是一个集成了QQ机器人和Web陪伴空间的完整项目，让用户可以通过QQ与Gemini互动，并进入专属的陪伴空间进行更丰富的活动。

## ✨ 功能特色

### QQ机器人功能
- 🤖 智能对话：基于Gemini AI的自然语言交互
- 🎭 人设设定：支持自定义AI人设（带安全审查）
- 🧠 长期记忆：AI会记住与用户的对话内容
- 📝 记忆管理：用户可以查看、删除、清空记忆
- ⏰ 定时提醒：支持设定定时任务
- 🎮 互动游戏：剪刀石头布、骰子等小游戏
- 🎵 语音回复：支持文字转语音
- 🖼️ 表情包：智能表情包回复
- 🔗 链接解析：支持抖音、小红书、B站等平台内容解析
- 🔄 **数据同步**：自动同步人设和记忆到陪伴空间
- 🔑 **API轮询**：支持多个Gemini API Key轮询使用

### 陪伴空间功能
- 📖 **日记系统**：用户和Gemini都可以写日记，分享心情
- ✅ **打卡系统**：一起养成好习惯，连续打卡
- 🎵 **音乐播放**：与Gemini一起听音乐，实时聊天互动
- 📚 **阅读批注**：一起读书，添加批注和讨论
- 🎮 **小游戏**：记忆翻牌、数字拼图等休闲游戏
- 💬 **聊天系统**：在陪伴空间中的专属聊天
- 🎨 **主题切换**：三种精美主题（纯色自定义、可爱华丽、星月梦幻）
- 🧠 **记忆继承**：自动继承QQ机器人中的人设和长期记忆
- 🔄 **上下文连续性**：在QQ和陪伴空间之间保持对话连续性

## 🏗️ 项目结构

```
/workspace
├── gemini-bot.py              # QQ机器人主程序
├── companion_backend/          # 后端API服务
│   ├── app.py                 # Flask应用主文件
│   ├── requirements.txt       # Python依赖
│   ├── .env.example          # 环境变量示例
│   └── render.yaml           # Render部署配置
├── companion_frontend/         # 前端React应用
│   ├── package.json          # Node.js依赖
│   ├── src/
│   │   ├── App.js            # 主应用组件
│   │   ├── components/       # React组件
│   │   └── index.js          # 入口文件
│   └── render.yaml           # Render部署配置
└── README.md                 # 项目说明文档
```

## 🚀 部署指南

### 1. 准备工作

#### 环境要求
- Python 3.8+
- Node.js 16+
- NapCat QQ机器人
- Gemini API Key
- Render账户（免费）

#### 获取API密钥
1. 访问 [Google AI Studio](https://makersuite.google.com/app/apikey) 获取Gemini API Key
   - **建议获取多个API Key**：系统支持多Key轮询，避免单Key限制
   - 格式：`key1,key2,key3`（用逗号分隔）
2. 确保NapCat QQ机器人正常运行

### 2. 后端部署（Render）

1. **创建新项目**
   - 登录 [Render](https://render.com)
   - 点击 "New +" → "Web Service"
   - 连接你的GitHub仓库

2. **配置环境变量**
   ```
   SECRET_KEY=your-secret-key-here
   GEMINI_API_KEYS=your-gemini-api-key-1,your-gemini-api-key-2,your-gemini-api-key-3
   FLASK_ENV=production
   ```

3. **部署设置**
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `gunicorn app:app`
   - 选择免费计划

4. **获取后端URL**
   - 部署完成后，记下你的后端服务URL
   - 格式类似：`https://your-app-name.onrender.com`

### 3. 前端部署（Render）

1. **创建静态网站**
   - 在Render中点击 "New +" → "Static Site"
   - 连接前端代码仓库

2. **配置环境变量**
   ```
   REACT_APP_API_URL=https://your-backend-app.onrender.com/api
   ```

3. **部署设置**
   - Build Command: `npm install && npm run build`
   - Publish Directory: `build`
   - 选择免费计划

4. **获取前端URL**
   - 部署完成后，记下你的前端网站URL
   - 格式类似：`https://your-frontend-app.onrender.com`

### 4. 配置QQ机器人

1. **修改机器人代码**
   ```python
   # 在gemini-bot.py中找到这行并修改
   companion_url = f"https://your-frontend-app.onrender.com/login?qq={user_id}"
   ```

2. **配置环境变量**
   创建 `.env` 文件：
   ```
   GEMINI_API_KEYS=your-gemini-api-key-1,your-gemini-api-key-2,your-gemini-api-key-3
   NAPCAT_WS_URL=ws://127.0.0.1:3001
   NAPCAT_HTTP_URL=http://127.0.0.1:3000
   NAPCAT_TOKEN=your-napcat-token
   BOT_OWNER_QQ=your-qq-number
   COMPANION_BACKEND_URL=https://your-backend-app.onrender.com
   ```

3. **启动机器人**
   ```bash
   python gemini-bot.py
   ```

## 🎯 使用方法

### QQ机器人使用

1. **基础对话**
   - 直接发送消息与Gemini聊天

2. **进入陪伴空间**
   - 发送 `#陪伴空间` 或 `#进入陪伴空间`
   - 机器人会回复专属链接

3. **记忆管理**
   - `#记住 [内容]` - 让AI记住重要信息
   - `#查看记忆` - 查看所有记忆
   - `#删除记忆 [编号]` - 删除特定记忆
   - `#清空记忆` - 清空所有记忆

4. **人设设定**
   - `#设定人设 [人设描述]` - 设定AI人设
   - `#设定人设` - 清空人设

5. **定时提醒**
   - `#在北京时间X月X日X点给我发 [内容]` - 设定定时提醒

### 陪伴空间使用

1. **注册登录**
   - 使用QQ号注册账户
   - 设置用户名和密码

2. **功能使用**
   - **日记**：记录心情，Gemini也会写日记回应
   - **打卡**：设定目标，一起坚持
   - **音乐**：播放音乐，实时聊天
   - **阅读**：读书批注，交流心得
   - **游戏**：休闲小游戏，放松心情
   - **聊天**：专属聊天界面

3. **主题切换**
   - 在设置中选择喜欢的主题
   - 纯色主题支持自定义颜色

## 🔧 技术栈

### 后端
- **Flask** - Web框架
- **SQLAlchemy** - 数据库ORM
- **Google Generative AI** - Gemini API
- **PostgreSQL** - 数据库（Render提供）

### 前端
- **React** - 前端框架
- **Styled Components** - CSS-in-JS
- **Framer Motion** - 动画库
- **Axios** - HTTP客户端
- **React Color** - 颜色选择器

### 部署
- **Render** - 云平台部署
- **Gunicorn** - WSGI服务器

## 📝 注意事项

### 安全考虑
1. **API密钥安全**
   - 不要在代码中硬编码API密钥
   - 使用环境变量管理敏感信息

2. **用户数据**
   - 所有用户数据存储在数据库中
   - 支持数据导出和删除

3. **内容审查**
   - AI人设设定有安全审查机制
   - 违禁词过滤和AI安全官审查

### 性能优化
1. **数据库优化**
   - 使用索引优化查询性能
   - 定期清理过期数据

2. **前端优化**
   - 代码分割和懒加载
   - 图片和资源优化

3. **API优化**
   - 请求缓存和限流
   - 错误重试机制

## 🐛 常见问题

### Q: 机器人无法连接？
A: 检查NapCat是否正常运行，确认WebSocket连接地址正确。

### Q: Gemini API调用失败？
A: 检查API密钥是否有效，确认网络连接正常。

### Q: 陪伴空间无法访问？
A: 检查前后端部署是否成功，确认环境变量配置正确。

### Q: 用户无法注册？
A: 检查数据库连接，确认后端服务正常运行。

## 🤝 贡献指南

1. Fork 项目
2. 创建功能分支
3. 提交更改
4. 发起 Pull Request

## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 🙏 致谢

- [NapCat](https://github.com/opq-osc/NapCat) - QQ机器人框架
- [Google Gemini](https://ai.google.dev/) - AI模型
- [Render](https://render.com/) - 部署平台
- [React](https://reactjs.org/) - 前端框架
- [Flask](https://flask.palletsprojects.com/) - 后端框架

---

🌟 **享受与Gemini的陪伴时光吧！** 🌟