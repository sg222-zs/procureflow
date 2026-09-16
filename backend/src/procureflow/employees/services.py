from flask import current_app

from itsdangerous import URLSafeTimedSerializer

from werkzeug.security import check_password_hash,generate_password_hash

from ..exceptions import ApiError
from ..extensions import db

from .models import Account,Employee

def token_serializer():
    return URLSafeTimedSerializer(
        current_app.config["SECRET_KEY"],salt="account-login"
    )

def get_account(employee_id):
    account=db.session.scalar(db.select(Account).where(Account.employee_id==employee_id))
    if account is None:
        raise ApiError("账号不存在",404)
    return account

def create_employee(values):
    values=dict(values)
    password=values.pop("password")
    role=values.pop("role","buyer")
    employee=Employee(**values)
    db.session.add(employee)

    db.session.flush()

    account=Account(
        employee_id=employee.id,
        password_hash=generate_password_hash(password),
        role=role
    )
    db.session.add(account)

    db.session.commit()
    return employee.to_dict()

def login(employee_no,password):
    employee=db.session.get(Employee,int(employee_no))
    if employee is None:
        raise ApiError("员工号或密码不正确",401)
    account=get_account(employee.id)
    if employee.status !=("ACTIVE") or not account.enabled:
        raise ApiError("账号已停用",403)
    if account.locked:
        raise ApiError("账号已锁定", 403)
    if not check_password_hash(account.password_hash,password):
        account.failed_attempts+=1
        account.locked=account.failed_attempts>=5
        db.session.commit()

        raise ApiError("员工号或者密码不正确",401)

    account.failed_attempts=0
    db.session.commit()

    token=token_serializer().dumps(
        {"id":account.id,"version":account.token_version}
    )

    return {
        "token": token, "employee": employee.to_dict(),
        "role": account.role,
        "mustChangePassword": account.must_change_password,
    }


def change_password(account,old_password,new_password):
    if not check_password_hash(account.password_hash,old_password):
        raise ApiError("原密码不正确",422)
    if old_password==new_password:
        raise ApiError("原密码和新密码不能一致",422)
    account.password_hash=generate_password_hash(new_password)
    account.must_change_password=False
    account.token_version+=1
    db.session.commit()

def manage_account(employee_id, action, password=None, reason=None):
    account = get_account(employee_id)
    employee = db.session.get(Employee, employee_id)
    if action == "enable":
        if employee.status == "LEFT":
            raise ApiError("员工已离职", 409)
        account.enabled = True
        account.disabled_reason = "" # 👈 启用时清空停用原因
    elif action == "disable":
        account.enabled = False
        account.disabled_reason = reason or "管理员停用" # 👈 保存停用原因入库
    elif action == "unlock":
        account.locked = False
        account.failed_attempts = 0
    elif action == "reset-password":
        account.password_hash = generate_password_hash(password)
        account.must_change_password = True
        account.locked = False
        account.failed_attempts = 0
    elif action == "leave":
        employee.status = "LEFT"
        account.enabled = False
    else:
        raise ApiError("账号动作不存在", 404)
    account.token_version += 1
    db.session.commit()
    return employee.to_dict()


    

