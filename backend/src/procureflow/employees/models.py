from sqlalchemy import ForeignKey, String, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from ..extensions import db

class Employee(db.Model):
    __tablename__ = "employees"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(64))
    department: Mapped[str] = mapped_column(String(64))
    position: Mapped[str] = mapped_column(String(64), default="员工") # 👈 岗位
    phone: Mapped[str] = mapped_column(String(32), default="")        # 👈 手机
    email: Mapped[str] = mapped_column(String(128), default="")       # 👈 邮箱
    hire_date: Mapped[str] = mapped_column(String(32), default="")    # 👈 入职日期
    status: Mapped[str] = mapped_column(String(20), default="ACTIVE")

    accounts: Mapped["Account"] = relationship(back_populates="employees", uselist=False)

    @property
    def employee_no(self):
        return f"{self.id:08d}"

    def to_dict(self):
        acc = self.accounts
        return {
            "id": str(self.id),
            "employeeNo": self.employee_no,
            "name": self.name,
            "department": self.department,
            "position": self.position,
            "phone": self.phone,
            "email": self.email,
            "hireDate": self.hire_date,
            "status": self.status,
            "employmentStatus": self.status,
            "hasAccount": acc is not None,
            "accountStatus": "DISABLED" if acc and not acc.enabled else ("LOCKED" if acc and acc.locked else "ENABLED"),
            "role": acc.role if acc else "buyer",
            "disabledReason": acc.disabled_reason if acc else "", # 👈 吐给前端停用说明
            "mustChangePassword": acc.must_change_password if acc else False,
            "failedLoginCount": acc.failed_attempts if acc else 0,
        }

class Account(db.Model):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    employee_id: Mapped[int] = mapped_column(ForeignKey("employees.id"), unique=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    role: Mapped[str] = mapped_column(String(20), default="buyer")
    enabled: Mapped[bool] = mapped_column(default=True)
    disabled_reason: Mapped[str] = mapped_column(String(255), default="", nullable=True) # 👈 存储停用原因
    must_change_password: Mapped[bool] = mapped_column(default=True)
    failed_attempts: Mapped[int] = mapped_column(default=0)
    locked: Mapped[bool] = mapped_column(default=False)
    token_version: Mapped[int] = mapped_column(default=1)

    employees: Mapped[Employee] = relationship(back_populates="accounts", uselist=False)