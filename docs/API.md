# API 契约

统一前缀 `/api/v1`，成功响应 `{"code":0,"message":"ok","data":...,"requestId":"..."}`。
错误响应使用相同结构，data 为 null，HTTP 状态和 code 分别表示传输与业务错误。前端统一归一化为 ApiError(status, code, message, requestId)。Mock 和 Server 共用 src/api 入口。

列表查询：`keyword,status,start,end,page,page_size`，默认 page=1、page_size=20；响应 `data={items,page,pageSize,total}`。日期为 YYYY-MM-DD（基于记录 UTC 日期）；时间戳为 ISO 8601。可选字段筛选：category、supplierId、department、warehouse、skuId、orderId。审批额外支持 tab=pending/processed。

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| POST | /auth/login | username,password → accessToken,user,permissions |
| GET | /users/me | 恢复当前 session（accessToken,user,permissions） |
| GET | /dashboard | 指标、七天订单趋势、最近订单、库存预警 |
| GET/POST | /suppliers | 列表/新增 |
| GET/PUT/DELETE | /suppliers/{id} | 详情/编辑/删除未引用供应商 |
| GET/POST | /products、/skus | 列表/新增 |
| GET/PUT | /products/{id}、/skus/{id} | 详情/编辑，status=ACTIVE/INACTIVE |
| GET/POST | /purchase-requests | 列表/新增 |
| GET/PUT | /purchase-requests/{id} | 详情/草稿编辑 |
| POST | /purchase-requests/{id}/submit、withdraw、cancel、revise | 状态变更 |
| GET | /approvals、/approvals/{id} | 当前角色待办/详情 |
| POST | /approvals/{id}/approve、reject | 审批；驳回 body={reason} |
| GET | /purchase-orders、/purchase-orders/{id} | 订单列表/快照与包裹 |
| GET/POST | /warehouse-receipts | 入库列表/收货 |
| GET | /warehouse-receipts/{id} | 入库详情 |
| GET | /inventory/stocks、/inventory/transactions | 库存/流水列表 |
| GET | /system/users、/system/roles、/audit-logs | 用户/角色/日志列表 |
| GET | 上述列表路径/{id} | 单条详情 |
| GET | /health | 真实 Flask 健康检查 |

采购申请输入：`{name,note?,items:[{skuId,quantity}]}`，单价从 SKU 获得，创建快照后金额以字符串保存。状态由服务决定，不能通过编辑直接修改。

入库输入：`{orderId,warehouse,items:[{skuId,quantity}]}`；quantity 为本次入库数量，允许省略本次不收货的行，所有行校验成功后再原子更新 Mock 数据。warehouse 当前为杭州中心仓/上海分仓。

供应商输入：name、contact、phone、email?、status。商品：name、category、status。SKU：name、productId、supplierId、spec、price（字符串）、status。

Mock 认证仅用于展示，token 形如 mock:buyer；并非真实安全凭证。未来 Flask 必须独立实现真实身份、权限及全部输入/状态校验。
