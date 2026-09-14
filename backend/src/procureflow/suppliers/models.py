from datetime import UTC, datetime

from sqlalchemy import CheckConstraint, String
from sqlalchemy.orm import Mapped, mapped_column

from ..extensions import db


def utc_now():
    return datetime.now(UTC).replace(tzinfo=None)


class Supplier(db.Model):
    __tablename__ = "suppliers"
    __table_args__ = (
        CheckConstraint(
            "status IN ('ACTIVE','INACTIVE')",
            name="supplier_status",
        ),
        {"mysql_engine": "InnoDB", "mysql_charset": "utf8mb4"},
    )

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    code: Mapped[str] = mapped_column(String(32), unique=True)
    name: Mapped[str] = mapped_column(String(128), index=True)
    contact: Mapped[str] = mapped_column(String(128))
    phone: Mapped[str] = mapped_column(String(32))
    email: Mapped[str] = mapped_column(String(32))
    status: Mapped[str] = mapped_column(String(32))
    created_at: Mapped[datetime] = mapped_column(default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(default=utc_now, onupdate=utc_now)

    def to_dict(self):
        return {
            "id": str(self.id),
            "code": self.code,
            "name": self.name,
            "contact": self.contact,
            "phone": self.phone,
            "email": self.email,
            "status": self.status,
            "createdAt": self.created_at.isoformat() + "Z",
            "updatedAt": self.updated_at.isoformat() + "Z",
        }
