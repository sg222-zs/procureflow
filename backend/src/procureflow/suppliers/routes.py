from flask import Blueprint, request
from pydantic import ValidationError
from ..employees.auth import login_required
from ..exceptions import ApiError
from ..response import response
from .schemas import SupplierCreate, SupplierQuery, SupplierUpdate
from .services import (
    create_supplier,
    get_supplier,
    list_suppliers,
    update_supplier,
)

bp = Blueprint("suppliers", __name__)  # 让每个模块管理自己的路由、视图和逻辑


def read_body(schema):
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        raise ApiError("请求体必须是JSON对象", 422)
    try:
        return schema.model_validate(payload)
    except ValidationError as exc:
        # 提取第一个校验失败的具体字段和错误原因，方便前端/调试时秒懂哪里不对
        first_error = exc.errors()[0]
        field = first_error.get("loc", ["参数"])[-1]
        msg = first_error.get("msg", "格式错误")
        raise ApiError(f"字段 [{field}] 校验失败: {msg}", 422) from exc


def read_query(schema):
    """
    解析并校验 URL 查询参数 (Query Parameters)
    :param schema: Pydantic 模型类
    :return: 校验通过并已转换类型的 Pydantic 模型实例
    """
    # 1. 将 ImmutableMultiDict 转为普通字典
    #    request.args.to_dict() 会将每一个参数提取为单值字符串
    raw_params = request.args.to_dict()

    # 2. 校验与类型转换 (例如 "1" 会自动转为 int 1)
    try:
        return schema.model_validate(raw_params)
    except ValidationError as exc:
        # 可以提取具体是哪个字段出错（例如 exc.errors()[0]['loc'][0]）
        first_error = exc.errors()[0]
        field = first_error.get("loc", ["参数"])[-1]
        msg = first_error.get("msg", "格式错误")
        raise ApiError(f"查询参数 [{field}] 不合法: {msg}", 422) from exc


@bp.get("/suppliers")
@login_required()
def index():
    # 借助统一的校验解析器（类似你的 read_body，但解析 request.args）
    query = read_query(SupplierQuery)

    # 到这里，参数绝对合法、安全、强类型，所有 try-except / if 都不需要了
    data = list_suppliers(
        page=query.page, page_size=query.page_size, keyword=query.keyword, status=query.status
    )
    return response(data)


@bp.post("/suppliers")
@login_required("admin", "buyer")
def create():
    body = read_body(SupplierCreate)
    return response(create_supplier(body.model_dump()), status=201)


@bp.get("/suppliers/<int:supplier_id>")
@login_required()
def detail(supplier_id):
    return response(get_supplier(supplier_id).to_dict())


@bp.put("/suppliers/<int:supplier_id>")
@login_required("admin", "buyer")
def update(supplier_id):
    body = read_body(SupplierUpdate)
    return response(
        update_supplier(
            supplier_id,
            # body.model_dump()：将校验通过的 Pydantic 模型实例转换回纯 Python 字典
            body.model_dump(exclude_unset=True),
        )
    )


@bp.patch("/suppliers/<int:supplier_id>/status")
@login_required("admin", "buyer")
def set_status(supplier_id):
    body = read_body(SupplierUpdate)
    values = body.model_dump(exclude_unset=True)
    if set(values) != {"status"}:
        raise ApiError("此接口只接受 status", 422)
    return response(update_supplier(supplier_id, values))
