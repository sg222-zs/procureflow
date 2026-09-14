from uuid import uuid4

from sqlalchemy.exc import IntegrityError

from ..exceptions import ApiError
from ..extensions import db
from .models import Supplier


# 获取供应商
def get_supplier(supplier_id):
    row = db.session.get(Supplier, supplier_id)
    if row is None:
        raise ApiError("供应商不存在", 404)
    return row


def commit_supplier():
    try:
        db.session.commit()
    except IntegrityError as exc:
        db.session.rollback()

        if getattr(exc.orig, "args", [None])[0] == 1062:
            raise ApiError("供应商编号已存在", 409) from exc
        raise


def create_supplier(values):
    if not values.get("code"):
        values["code"] = "SUP-" + uuid4().hex[:20].upper()
    row = Supplier(**values)
    db.session.add(row)
    commit_supplier()
    return row.to_dict()


def update_supplier(supplier_id, values):
    if any(value is None for value in values.values()):
        raise ApiError("字段不能设置为 null", 422)
    row = get_supplier(supplier_id)

    for key, value in values.items():
        setattr(row, key, value)
    commit_supplier()
    return row.to_dict()


def list_suppliers(page, page_size, keyword, status):
    statement = db.select(Supplier)
    if keyword:
        statement = statement.where(
            Supplier.name.contains(keyword, autoescape=True)
            | Supplier.code.contains(keyword, autoescape=True)
        )
    if status:
        statement = statement.where(Supplier.status == status)
    statement = statement.order_by(
        Supplier.created_at.desc(),
        Supplier.id.desc(),
    )
    result = db.paginate(
        statement,
        page=page,
        per_page=page_size,
        max_per_page=100,
        error_out=False,
    )
    return {
        "items": [row.to_dict() for row in result.items],
        "page": page,
        "pageSize": page_size,
        "total": result.total,
    }
