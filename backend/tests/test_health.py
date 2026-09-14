# 在 backend 目录执行：uv run pytest。测试客户端直接调用应用，不需要启动 HTTP 服务。
import pytest

from procureflow import create_app
from procureflow.exceptions import ApiError
from procureflow.extensions import db


@pytest.fixture
def app():
    # fixture 为每个测试准备一个应用，健康检查不查询数据库。
    app = create_app()

    @app.get("/failure")
    def failure():
        # 仅在测试中注册，用来验证意外异常不会把内部细节返回给前端。
        raise RuntimeError("sensitive detail")

    @app.get("/business-error")
    def business_error():
        raise ApiError("Invalid state", 409)

    return app


@pytest.fixture
def client(app):
    # pytest 根据参数名注入 app fixture；测试客户端可以模拟 GET、POST 等请求。
    return app.test_client()


def test_health(client):
    # 同时检查成功响应结构，以及客户端请求编号在响应体和响应头中的一致性。
    result = client.get("/api/v1/health", headers={"X-Request-ID": "test-request"})
    assert result.status_code == 200
    body = result.get_json()
    assert body["code"] == 0
    assert body["data"]["status"] == "ok"
    assert body["requestId"] == result.headers["X-Request-ID"] == "test-request"


@pytest.mark.parametrize(
    "path,status", [("/missing", 404), ("/failure", 500), ("/business-error", 409)]
)
def test_error_contract(client, path, status):
    # 参数化让同一套断言覆盖 404、500 和业务冲突 409 三种情况。
    result = client.get(path)
    assert result.status_code == status
    body = result.get_json()
    assert body["code"] == status
    assert body["data"] is None
    assert body["requestId"]
    assert "sensitive detail" not in body["message"]


def test_method_not_allowed_preserves_allow_header(client):
    # 健康检查只接受 GET；错误响应仍需告诉客户端允许使用哪些方法。
    result = client.post("/api/v1/health")
    assert result.status_code == 405
    assert "GET" in result.headers["Allow"]


def test_factory_isolation_and_business_models(app):
    # 验证工厂隔离与供应商模型表注册。
    other = create_app()
    assert app is not other
    assert "suppliers" in db.metadata.tables


def test_default_config_reads_database_url(monkeypatch):
    from procureflow.config import get_config

    # 验证填写的连接地址会进入应用配置。
    url = "mysql+pymysql://learner:password@localhost/procureflow"
    monkeypatch.setenv("DATABASE_URL", url)
    assert get_config()["SQLALCHEMY_DATABASE_URI"] == url
