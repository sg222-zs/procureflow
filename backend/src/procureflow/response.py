from flask import g


def response(data=None, *, code: int = 0, message: str = "ok", status: int = 200):
    # 统一返回契约：code 是业务状态（0 表示成功），status 是 HTTP 状态码。
    # data 存放业务数据；message 是提示；requestId 用于追踪本次请求。
    # * 后面的参数必须按名称传入，例如 response(message="不存在", code=404, status=404)。
    # Flask 会将 (字典, 状态码) 转换为 JSON 响应。本函数需要在请求上下文中调用，
    # 因为 g.request_id 由 create_app 注册的 before_request 钩子设置。
    return {"code": code, "message": message, "data": data, "requestId": g.request_id}, status
