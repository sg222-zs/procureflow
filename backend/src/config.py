import os


def get_config() -> dict:
    # 后端共用这一份配置；os.getenv 读取配置值，未填写时使用后面的默认值。
    return {
        # SECRET_KEY 用于 Flask 的会话签名。
        "SECRET_KEY": os.getenv("SECRET_KEY", "procureflow-local-study"),
        # 地址依次包含驱动、用户名、密码、主机、端口和数据库名。
        "SQLALCHEMY_DATABASE_URI": os.getenv(
            "DATABASE_URL",
            "mysql+pymysql://root:123456@127.0.0.1:3306/procureflow?charset=utf8mb4",
        ),
        # 关闭 Flask-SQLAlchemy 的额外对象变更信号，减少开销；不影响提交事务。
        "SQLALCHEMY_TRACK_MODIFICATIONS": False,
    }
