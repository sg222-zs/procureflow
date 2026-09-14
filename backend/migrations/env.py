# Alembic 迁移入口，由 flask db 命令加载，不是普通 API 请求的处理代码。
# 修改模型后：flask --app procureflow:create_app db migrate -m "描述"
# 会生成迁移脚本；检查脚本后再运行同一入口的 db upgrade，将变更应用到数据库。
import logging
from logging.config import fileConfig

from alembic import context
from flask import current_app

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config
# context 表示当前迁移执行环境；current_app 指向 CLI 已加载的 Flask 应用。

# Interpret the config file for Python logging.
# This line sets up loggers basically.
fileConfig(config.config_file_name)
logger = logging.getLogger("alembic.env")


def get_engine():
    # 从工厂中初始化的 Flask-Migrate 扩展获取数据库引擎，兼容不同扩展版本。
    try:
        # this works with Flask-SQLAlchemy<3 and Alchemical
        return current_app.extensions["migrate"].db.get_engine()
    except (TypeError, AttributeError):
        # this works with Flask-SQLAlchemy>=3
        return current_app.extensions["migrate"].db.engine


def get_engine_url():
    # 迁移连接使用完整 URL（包含密码）；不要将它输出到日志。
    # 将 % 转义为 %% 是为了适配 Alembic 配置解析器的插值规则。
    try:
        return get_engine().url.render_as_string(hide_password=False).replace("%", "%%")
    except AttributeError:
        return str(get_engine().url).replace("%", "%%")


# add your model's MetaData object here
# for 'autogenerate' support
# from myapp import mymodel
# target_metadata = mymodel.Base.metadata
config.set_main_option("sqlalchemy.url", get_engine_url())
target_db = current_app.extensions["migrate"].db

# other values from the config, defined by the needs of env.py,
# can be acquired:
# my_important_option = config.get_main_option("my_important_option")
# ... etc.


def get_metadata():
    # 元数据描述代码中的表结构，autogenerate 用它与数据库实际结构比较。
    # None 表示默认数据库绑定；此骨架没有实现多个数据库绑定的迁移流程。
    # 如果新增模型未被应用导入，它的表也不会出现在这里的元数据中。
    if hasattr(target_db, "metadatas"):
        return target_db.metadatas[None]
    return target_db.metadata


def run_migrations_offline():
    """Run migrations in 'offline' mode.

    This configures the context with just a URL
    and not an Engine, though an Engine is acceptable
    here as well.  By skipping the Engine creation
    we don't even need a DBAPI to be available.

    Calls to context.execute() here emit the given string to the
    script output.

    """
    # 离线模式（例如 db upgrade --sql）输出 SQL，不在这里打开数据库连接。
    # literal_binds 将参数值写入生成的 SQL，方便后续独立执行或审阅。
    url = config.get_main_option("sqlalchemy.url")
    context.configure(url=url, target_metadata=get_metadata(), literal_binds=True)

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online():
    """Run migrations in 'online' mode.

    In this scenario we need to create an Engine
    and associate a connection with the context.

    """

    # this callback is used to prevent an auto-migration from being generated
    # when there are no changes to the schema
    # reference: http://alembic.zzzcomputing.com/en/latest/cookbook.html
    def process_revision_directives(context, revision, directives):
        # 自动生成迁移时，如果模型与数据库结构没有差异，就不创建空迁移文件。
        if getattr(config.cmd_opts, "autogenerate", False):
            script = directives[0]
            if script.upgrade_ops.is_empty():
                directives[:] = []
                logger.info("No changes in schema detected.")

    conf_args = current_app.extensions["migrate"].configure_args
    # 保留应用已经配置的自定义回调，未配置时才使用上面的默认行为。
    if conf_args.get("process_revision_directives") is None:
        conf_args["process_revision_directives"] = process_revision_directives

    connectable = get_engine()

    with connectable.connect() as connection:
        # 在线模式连接真实数据库；事务中的具体操作由迁移命令和迁移脚本决定。
        context.configure(connection=connection, target_metadata=get_metadata(), **conf_args)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    # 根据 CLI 是否要求生成 SQL，选择离线或在线执行路径。
    run_migrations_offline()
else:
    run_migrations_online()
