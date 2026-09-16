from functools import wraps
 
from flask import g, request
from itsdangerous import BadSignature
 
from ..exceptions import ApiError
from ..extensions import db
from .models import Account, Employee
from .services import token_serializer

def login_required(*roles, allow_password_change=False):
    def decorate(view):
        @wraps(view)
        def wrapped(*args, **kwargs):
            token = request.headers.get("Authorization", "")
            if not token.startswith("Bearer "):
                raise ApiError("请先登录", 401)
            try:
                payload = token_serializer().loads(token[7:], max_age=28800)
            except BadSignature as exc:
                raise ApiError("请重新登录", 401) from exc
            account = db.session.get(Account, payload["id"])
            if account is None:
                raise ApiError("账号不存在", 401)
            employee = db.session.get(Employee, account.employee_id)
            if (
                not account.enabled or account.locked
                or employee.status != "ACTIVE"
                or payload["version"] != account.token_version
            ):
                raise ApiError("请重新登录", 401)
            if account.must_change_password and not allow_password_change:
                raise ApiError("请先修改初始密码", 403)
            if roles and account.role not in roles:
                raise ApiError("当前角色不能执行此操作", 403)
            g.account = account
            g.employee = employee
            return view(*args, **kwargs)
        return wrapped
    return decorate

