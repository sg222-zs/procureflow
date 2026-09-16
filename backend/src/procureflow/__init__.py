# 后端入口：Flask 命令中的 procureflow:create_app 会调用下面的应用工厂。
# 建议阅读顺序：本文件 → config.py → extensions.py → api/health.py
# → response.py → exceptions.py，理解一次请求从进入应用到返回响应的过程。
import re
from uuid import uuid4

from dotenv import load_dotenv
from flask import Flask, g, request

from .api.health import bp as health_bp
from .config import get_config
from .exceptions import register_error_handlers
from .extensions import db, migrate
from .suppliers.routes import bp as suppliers_bp
from .employees.routes import bp as employees_bp
from . employees.commands import register_commands

def create_app() -> Flask:
    # 读取 .env；默认不覆盖终端中已经设置的环境变量。
    load_dotenv()
    app = Flask(__name__)
    # 创建应用后加载唯一的默认配置。
    app.config.from_mapping(get_config())
    # 扩展先在 extensions.py 中创建，再绑定当前应用，减少循环导入。
    # 初始化扩展不会自动建表，也不会在这里执行数据库查询。
    db.init_app(app)
    migrate.init_app(app, db)

    @app.before_request
    def assign_request_id():
        # 在路由处理前生成请求编号，便于将前端报错与后端请求对应起来。
        # g 是当前应用上下文的数据容器；这里随请求使用，不是跨请求共享的全局字典。
        supplied = request.headers.get("X-Request-ID", "")
        # 只接受 1–64 个字母、数字、下划线或连字符；不合规则生成 UUID。
        g.request_id = supplied if re.fullmatch(r"[\w-]{1,64}", supplied) else str(uuid4())

    @app.after_request
    def attach_request_id(result):
        # 在响应发送前补充请求编号，JSON 响应体中也会包含同一个编号。
        result.headers["X-Request-ID"] = g.request_id
        return result

    # 蓝图用于按业务模块组织路由：前缀 /api/v1 + 蓝图路径 /health。
    # 后续新增供应商、采购等 API 时，可分别定义蓝图并在这里注册。
    # 新增数据库模型后，也要确保工厂加载它们，迁移工具才能发现对应的表。
    app.register_blueprint(health_bp, url_prefix="/api/v1")
    app.register_blueprint(suppliers_bp, url_prefix="/api/v1")

    app.register_blueprint(employees_bp,url_prefix="/api/v1")
    register_commands(app)
    # 将业务异常、HTTP 异常和未预期异常统一转换成 API 响应。
    register_error_handlers(app)
    return app
