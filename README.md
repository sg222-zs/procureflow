# ProcureFlow Starter

现代采购协同平台：完整 Vue 3 前端演示 + 最小 Flask 3.1 后端。

这是独立的 ProcureFlow 项目，位于 `D:\flask-project\procureflow`。**当前业务全部使用浏览器内存 Mock，后端只提供健康检查与基础工程骨架**，后续逐个领域替换为真实 Flask API。前后端、依赖、启动脚本和 CI 均在本项目内，不依赖相邻的 Bibi 项目。

## 快速启动

需要 Node.js 24、pnpm 11、uv。uv 会按项目要求安装 Python 3.13。

前端可独立运行，无需数据库或 Flask：

```powershell
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

打开 http://127.0.0.1:5173 。演示密码统一为 `demo123`：

| 账号 | 角色 | 能力 |
| --- | --- | --- |
| admin | 系统管理员 | 全部页面与操作 |
| buyer | 采购专员 | 供应商、商品、SKU、自己的采购申请 |
| approver | 审批经理 | 待办审批、订单与库存查看 |
| warehouse | 仓库管理员 | 分批入库、订单、库存、流水 |

数据在当前浏览器页面内存保留，**硬刷新恢复初始数据**。使用退出登录切换角色可以继续当前演示流程。用户和角色管理提供只读查看；无真实认证。

另开终端启动后端（健康检查无需连接数据库）：

```powershell
cd backend
uv sync --frozen
Copy-Item .env.example .env
uv run flask --app procureflow:create_app run --debug
```

访问 http://127.0.0.1:5000/api/v1/health ，或点击前端右上角连接图标。

后端只使用一份默认配置：`backend/.env`。复制 `.env.example` 后填写 MySQL 用户名、密码和数据库名即可；`create_app()` 不需要传入环境名称。`--debug` 用来在保存 Python 文件后自动重新加载。

仓库根目录也提供 `scripts/dev-frontend.ps1` 和 `scripts/dev-backend.ps1` 启动脚本。

前端依赖安装完成后，`scripts/dev-frontend.ps1` 直接使用 Node.js 启动本地 Vite，不要求终端能找到全局 pnpm。若首次安装时提示找不到 pnpm，可在 `frontend` 目录执行 `corepack pnpm install --frozen-lockfile`。前端脚本固定使用 5173 端口；端口占用时会明确报错，请先停止旧的前端服务。

## 业务演示

采购申请 → 添加 SKU 明细 → 保存草稿 → 更多操作 / 提交审批 → 审批中心批准 → 自动按供应商生成订单 → 入库管理分批收货 → 查看订单进度、库存流水和操作日志。

支持驳回原因、审批轨迹、撤回、草稿取消、驳回后修订、供应商引用保护、商品/SKU 启停和超量入库拦截。所有金额通过整数分计算。

工作台提供实时 Mock 指标、七天采购趋势、待办、库存预警与最近订单。列表统一支持查询、分页、URL 筛选、加载/空/错误状态，新增和详情使用抽屉。

## 开发检查

```powershell
# frontend
pnpm typecheck
pnpm test
pnpm build
pnpm format:check

# backend
uv run ruff check .
uv run ruff format --check .
uv run pytest
```

GitHub Actions 配置会执行前端类型检查、测试、构建与后端 Ruff/pytest。CI 文件已加入仓库，尚未在远程运行。

## 数据源切换

前端默认 `.env.development` / `.env.production` 都为 `VITE_API_MODE=mock`，确保开发和构建预览均可演示。创建 `.env.development.local` 设置：

```dotenv
VITE_API_MODE=server
VITE_API_BASE_URL=/api/v1
```

重启 Vite 后所有业务请求走真实 Flask；目前除 `/health` 外会返回结构化 404，这符合 Starter 边界。连接检查按钮始终访问真实后端。Vite 开发和预览均把 `/api` 代理至 `127.0.0.1:5000`。静态产物部署时需由宿主配置 SPA fallback 和 API 同源转发。

页面只依赖 `src/api/`，不能直接导入 Mock 或调用 Axios。业务请求模拟 300–700ms 延迟；右上角调试菜单可模拟下一次 400/401/403/409/500 错误。

## 工程结构

```text
frontend/src/
  api/          统一 Axios、错误、业务 API
  mock/         fixtures、内存数据库、状态机与测试
  types/        统一类型与分页响应
  views/        工作台、业务列表、登录
  components/   表单、详情、权限、状态、图表
  layouts/      裁剪后的 pure-admin 菜单与工作台布局
  router/       菜单、路由、权限守卫
  stores/       Pinia 会话
  utils/        金额、状态显示
backend/
  src/procureflow/  工厂、配置、扩展、错误、健康 API
  migrations/      已初始化的 Alembic 框架，无业务迁移
  tests/           health、错误契约、工厂测试
  pyproject.toml
  uv.lock
```

- [改造范围与演示说明](docs/MODERNIZATION.md)
- [API 契约](docs/API.md)
- [pure-admin 来源和 MIT 说明](frontend/THIRD_PARTY_NOTICES.md)
- [旧 Bibi 中文文档](docs/BIBI_LEGACY_ZH.md) / [英文文档](docs/BIBI_LEGACY_EN.md)

旧 Bibi 项目独立保留在 `D:\flask-project\bibi`，未迁入本项目；docs 中只保留其历史文档作为参考。保留原 Apache-2.0 LICENSE；引用的 pure-admin 组件另附 MIT 许可证。
