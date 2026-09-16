from typing import Literal

from pydantic import BaseModel, ConfigDict,Field

class EmployeeCreate(BaseModel):
    model_config = ConfigDict(
            extra="ignore",  # 👈 改为 ignore：自动忽略前端传来的 items/warehouse 等无关字段
            str_strip_whitespace=True,
        )
    name: str = Field(min_length=1, max_length=64)
    department: str = Field(default="", max_length=64)
    password: str = Field(min_length=8, max_length=128)
    role: Literal["admin", "buyer", "approver", "warehouse"] = "buyer"


class LoginBody(BaseModel):
    employee_no:str=Field(pattern=r"^\d{8}$")
    password:str

class PasswordBody(BaseModel):
    old_password: str
    new_password: str = Field(min_length=8, max_length=128)
 
 
class ResetBody(BaseModel):
    password: str = Field(min_length=8, max_length=128)
