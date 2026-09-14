from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


class SupplierCreate(BaseModel):
    model_config = ConfigDict(
        extra="ignore",  # 👈 改为 ignore：自动忽略前端传来的 items/warehouse 等无关字段
        str_strip_whitespace=True,
    )
    code: str | None = Field(default=None, min_length=1, max_length=32)
    name: str = Field(min_length=1, max_length=128)
    contact: str = Field(default="", max_length=64)
    phone: str = Field(default="", max_length=32)
    email: str = Field(default="", max_length=128)
    status: Literal["ACTIVE", "INACTIVE"] = "ACTIVE"


class SupplierUpdate(BaseModel):
    model_config = ConfigDict(
        extra="ignore",  # 👈 改为 ignore：自动忽略前端传回的 id/code/createdAt 等只读字段
        str_strip_whitespace=True,
    )
    name: str | None = Field(default=None, min_length=1, max_length=128)
    contact: str | None = Field(default=None, max_length=64)
    phone: str | None = Field(default=None, max_length=32)
    email: str | None = Field(default=None, max_length=128)
    status: Literal["ACTIVE", "INACTIVE"] | None = None


class SupplierQuery(BaseModel):
    page: int = Field(default=1, ge=1)  # 自动校验整数且 >= 1
    page_size: int = Field(default=20, ge=1, le=100)  # 自动限制 1~100
    keyword: str = ""
    status: Literal["", "ACTIVE", "INACTIVE"] = ""  # 自动限制枚举值
