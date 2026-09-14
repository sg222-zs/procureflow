from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import MetaData
from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    # 所有模型共享表结构元数据。统一约束名称，便于 Alembic 在迁移时定位和修改约束。
    # 后续模型继承 db.Model；使用 CheckConstraint 时需显式指定 name，供 ck 模板使用。
    metadata = MetaData(
        naming_convention={
            # ix: Index, 索引
            "ix": "ix_%(column_0_label)s",
            # uq: Unique, 唯一约束
            "uq": "uq_%(table_name)s_%(column_0_name)s",
            # ck: Check, 检查约束
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            # fk: Foreign Key, 外键约束
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            # pk: Primary Key, 主键约束
            "pk": "pk_%(table_name)s",
        }
    )


# db 提供 db.Model、db.session 等入口；写操作通常需要显式 commit，失败时 rollback。
# 此处不导入应用实例，由 create_app 调用 init_app 完成绑定。
db = SQLAlchemy(model_class=Base)
# Flask-Migrate 将 Alembic 接入 Flask CLI：db migrate 生成迁移，db upgrade 执行迁移。
migrate = Migrate()
