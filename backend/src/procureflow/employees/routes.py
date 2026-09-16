from flask import Blueprint, g, request
 
from ..extensions import db
from ..response import response
from ..suppliers.routes import read_body
from .auth import login_required
from .models import Employee, Account
from .schemas import EmployeeCreate, LoginBody
from .services import create_employee, login
from ..exceptions import ApiError
from .schemas import PasswordBody, ResetBody
from .services import change_password, manage_account


bp=Blueprint("employees",__name__)

@bp.post("/auth/login")
def sign_in():
    body=read_body(LoginBody)
    return response(login(body.employee_no,body.password))

@bp.get("/auth/me")
@login_required(allow_password_change=True)
def me():
    return response({
        "employee":g.employee.to_dict(),"role":g.account.role,
        "enabled":g.account.enabled,
        "mustChangePassword":g.account.must_change_password
    })


@bp.post("/employees")
@login_required("admin")
def create():
    values=read_body(EmployeeCreate).model_dump()
    return response(create_employee(values),status=201)

@bp.get("/employees")
@login_required("admin")
def index():
    stmt = db.select(Employee).order_by(Employee.id)
    keyword = request.args.get("keyword")
    if keyword:
        pattern = f"%{keyword}%"
        stmt = stmt.where(
            (Employee.name.ilike(pattern)) |
            (Employee.phone.ilike(pattern)) |
            (Employee.email.ilike(pattern)) |
            (Employee.id.cast(db.String).ilike(pattern))
        )
    department = request.args.get("department")
    if department:
        stmt = stmt.where(Employee.department == department)
    employment_status = request.args.get("employmentStatus")
    if employment_status:
        stmt = stmt.where(Employee.status == employment_status)
    account_status = request.args.get("accountStatus")
    if account_status:
        stmt = stmt.outerjoin(Account, Employee.id == Account.employee_id)
        if account_status == "ENABLED":
            stmt = stmt.where(Account.enabled == True, Account.locked == False)
        elif account_status == "DISABLED":
            stmt = stmt.where(Account.enabled == False)
        elif account_status == "LOCKED":
            stmt = stmt.where(Account.locked == True)
    rows = db.session.scalars(stmt)
    return response([row.to_dict() for row in rows])

@bp.post("/auth/password")
@login_required(allow_password_change=True)
def password():
    body = read_body(PasswordBody)
    change_password(g.account, body.old_password, body.new_password)
    return response({"changed": True})
 
 
@bp.post("/employees/<int:employee_id>/<action>")
@login_required("admin")
def account_action(employee_id, action):
    if employee_id == g.employee.id and action in ("disable", "reset-password"):
        raise ApiError("不可对本人账号执行此操作", 409)
    
    payload = request.get_json(silent=True) or {}
    new_password = payload.get("password")
    reason = payload.get("reason")
    
    return response(manage_account(employee_id, action, password=new_password, reason=reason))


@bp.get("/employees/<int:employee_id>")
@login_required("admin")
def detail(employee_id):
    employee = db.session.get(Employee, employee_id)
    if not employee:
        raise ApiError("员工档案不存在", 404)
    return response(employee.to_dict())

