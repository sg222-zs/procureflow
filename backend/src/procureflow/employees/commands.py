import click

from ..extensions import db
from .models import Account
from .services import create_employee, get_account

def register_commands(app):
    @app.cli.command("init-admin")
    @click.option("--name",prompt="Name")
    @click.password_option()

    def init_admin(name,password):
        existing=db.session.scalar(db.select(Account).where(Account.role=="admin"))
        if existing:
            click.echo("Admin already exists")
            return
        if len(password)<8:
            raise click.ClickException("password needs at least 8 characters")
        employee=create_employee(
            {
                "name":name,"department":"管理部",
                "password":password,"role":"admin"
            }
        )
        account=get_account(employee["id"])
        account.must_change_password=False
        db.session.commit()

        click.echo("Employee number :" + employee["employeeNo"])

