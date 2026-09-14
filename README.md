# ProcureFlow

> 轻量、现代的企业级采购协同与供应链管理系统，采用前后端分离架构（Vue 3 + Flask）。

---

## 🌟 项目亮点

- **全流程业务闭环**：涵盖供应商管理、商品与 SKU 维护、采购申请、多级审批、采购订单生成及入库管理。
- **现代化技术栈**：
  - 前端基于 Vue 3 + TypeScript + Vite + Element Plus，组件设计清晰，交互流畅。
  - 后端基于 Flask 3.1 + SQLAlchemy 2.0 + Pydantic，具备强类型参数校验与规范的统一 RESTful 响应规范。
- **开箱即用体验**：前端内置灵活的数据模式（支持独立 Mock 演示与直连真实后端无缝切换）。

---

## 🛠️ 技术栈

| 领域 | 核心技术 |
| --- | --- |
| **前端** | Vue 3 · TypeScript · Vite · Element Plus · Pinia · Vue Router |
| **后端** | Python 3.12+ · Flask 3.1 · SQLAlchemy 2.0 · Flask-Migrate · Pydantic 2 |
| **数据库** | MySQL 8.0+ / PostgreSQL |

---

## 🚀 快速启动

### 1. 环境准备
确保本机已安装：
- **Node.js** (>= 20.0) 及 **pnpm**
- **Python** (>= 3.12) 及 **pip**
- **MySQL**（若仅体验前端 Mock 模式可不启动数据库）

---

### 2. 启动后端 (Flask)

```bash
cd backend

# 1. 创建并激活虚拟环境
python -m venv .venv
# Windows PowerShell:
.\.venv\Scripts\Activate.ps1
# macOS / Linux:
# source .venv/bin/activate

# 2. 安装依赖
pip install -r requirements.txt

# 3. 配置环境变量（根据实际情况修改数据库连接）
cp .env.example .env

# 4. 启动后端服务
flask --app procureflow:create_app run --debug
```
> 后端服务运行于 `http://127.0.0.1:5000`  
> 健康检查接口：`http://127.0.0.1:5000/api/v1/health`

---

### 3. 启动前端 (Vue 3)

另开终端窗口：

```bash
cd frontend

# 1. 安装依赖
pnpm install

# 2. 启动开发服务器
pnpm dev
```
> 前端访问地址：`http://127.0.0.1:5173`

---

## 🔑 演示账号

系统内置了不同角色的演示账号（默认密码统一为 `demo123`）：

| 账号 | 角色 | 核心权限 |
| --- | --- | --- |
| **admin** | 系统管理员 | 拥有系统全量功能与配置权限 |
| **buyer** | 采购专员 | 供应商、商品目录、新建及跟踪个人采购申请 |
| **approver** | 审批经理 | 采购审批中心、订单与库存查阅 |
| **warehouse** | 仓库管理员 | 订单收货、分批入库、库存查看与出入库流水 |

---

## 📁 目录结构

```text
procureflow/
├── frontend/                  # 前端工程 (Vue 3 + Vite)
│   ├── src/
│   │   ├── api/               # 统一接口请求层 (Axios 封装)
│   │   ├── components/        # 公共业务与基础组件
│   │   ├── mock/              # 离线演示 Mock 数据库与处理器
│   │   ├── router/            # 路由与权限守卫
│   │   ├── stores/            # Pinia 状态管理 (会话/权限)
│   │   └── views/             # 页面视图 (工作台、资源管理等)
│   └── package.json
│
├── backend/                   # 后端工程 (Flask)
│   ├── src/procureflow/
│   │   ├── api/               # 基础 API (健康检查等)
│   │   ├── suppliers/         # 供应商模块 (路由、模型、业务逻辑)
│   │   ├── config.py          # 基础配置与环境变量加载
│   │   └── extensions.py      # SQLAlchemy、Migrate 扩展初始化
│   ├── tests/                 # 后端单元测试
│   ├── requirements.txt       # Python 依赖清单
│   └── pyproject.toml
│
├── scripts/                   # 一键启动便捷脚本
│   ├── dev-backend.ps1
│   └── dev-frontend.ps1
└── README.md
```

---

## 🧪 代码质量与测试

**前端质量检查**：
```bash
cd frontend
pnpm typecheck       # TypeScript 类型检查
pnpm test            # 单元测试 (Vitest)
pnpm build           # 生产构建打包
```

**后端质量检查**：
```bash
cd backend
ruff check .         # 代码规范检查
pytest               # 单元测试
```

---

## 📄 开源许可

本项目遵循 [Apache-2.0 License](LICENSE)。
