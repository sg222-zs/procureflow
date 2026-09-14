from flask import Blueprint

from ..response import response

# 蓝图名称是 health；URL 前缀在应用工厂注册蓝图时指定。
bp = Blueprint("health", __name__)


@bp.get("/health")
def health():
    # GET /api/v1/health：检查 Web 服务是否能够接收并响应请求。
    # 这是存活检查，不连接数据库；返回 ok 不代表数据库或未来的业务依赖可用。
    return response({"status": "ok"})
