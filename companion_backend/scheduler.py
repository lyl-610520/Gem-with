# companion_backend/scheduler.py

# 直接导入 app 对象，而不是 create_app 函数
from app import app, db, User, generate_gemini_diary_for_user 

def run_daily_job():
    """
    为数据库中所有用户执行生成Gemini日记的任务。
    """
    # 这里不再需要 create_app()，直接使用导入的 app
    with app.app_context():
        try:
            users = User.query.all()
            if not users:
                print("数据库中没有找到任何用户。")
                return

            print(f"任务开始：将为 {len(users)} 位用户生成日记。")
            
            for user in users:
                print(f"--- 正在处理用户ID: {user.id} ---")
                generate_gemini_diary_for_user(user.id)
            
            print("所有用户的日记生成任务已完成。")

        except Exception as e:
            print(f"执行定时任务时发生错误: {e}")

if __name__ == "__main__":
    print("手动执行每日定时任务...")
    run_daily_job()
