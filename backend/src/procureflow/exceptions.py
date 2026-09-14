from flask import Flask
from werkzeug.exceptions import HTTPException

from .response import response


class ApiError(Exception):
    # 可预期的业务失败，例如 raise ApiError("采购申请已提交，不能重复提交", 409)。
    # 与程序缺陷不同，这类错误的 message 会直接返回给调用方。
    def __init__(self, message: str, status: int = 400, code: int | None = None):
        self.message = message
        self.status = status
        self.code = code or status


def register_error_handlers(app: Flask) -> None:
    # 把处理器注册到指定应用；业务路由抛出异常后，由 Flask 选择匹配的处理器。
    @app.errorhandler(ApiError)
    def handle_api_error(error):
        return response(code=error.code, message=error.message, status=error.status)

    @app.errorhandler(HTTPException)
    def handle_http_error(error):
        # 处理框架产生的 404、405 等错误，将默认 HTML 错误页改为统一 JSON。
        body, status = response(code=error.code, message=error.description, status=error.code)
        result = error.get_response()
        # 复用原始响应以保留协议头，例如 405 响应中的 Allow（允许的请求方法）。
        result.data = app.json.dumps(body)
        result.content_type = "application/json"
        result.status_code = status
        return result

    @app.errorhandler(Exception)
    def handle_unexpected_error(error):
        # 记录程序异常，并返回统一的 500 JSON 响应。
        app.logger.exception("Unhandled request error")
        return response(code=500, message="Internal server error", status=500)
