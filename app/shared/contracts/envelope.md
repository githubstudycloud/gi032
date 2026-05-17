# 统一响应信封

所有服务（report-query / report-generation / 未来 service）都用同一形状回响：

```json
{
  "code": 0,
  "message": "ok",
  "trace_id": "32-char hex uuid",
  "data": <任意 JSON 或 null>
}
```

## 约定

| 字段 | 类型 | 必填 | 说明 |
|---|---|---|---|
| `code` | int | ✅ | 0 = 成功；其它 = 错误。HTTP 状态码也照样设置（200 / 4xx / 5xx），但前端兜底以 `code` 为准。 |
| `message` | string | ✅ | 给人看的描述。错误时简短可读。 |
| `trace_id` | string | ✅ | 32 字符 hex（uuid4.hex）。日志关联。后续接 OpenTelemetry 时替换为 W3C traceparent。 |
| `data` | any \| null | ❌ | 业务数据。错误时可省略或带 issues 列表。 |

## 错误码段位

| 段位 | 含义 |
|---|---|
| `0` | 成功 |
| `400xx` | 客户端入参错误 |
| `401xx` | 鉴权错误 |
| `403xx` | 权限不足 |
| `404xx` | 资源不存在 |
| `409xx` | 冲突（重复 / 版本不一致） |
| `429xx` | 限流 |
| `500xx` | 服务端兜底 |

## 校验失败

Pydantic 校验失败时，HTTP 422，`code=40001`，`message="validation failed"`，`data.issues = [{loc, msg, type}, ...]`（直接转 Pydantic 报错）。

## 注意

- 不要在 `data` 里再嵌套一层 `{ data: ... }` —— 一层就够。
- 不要省略 `trace_id` —— 它是定位线上问题最便宜的工具。
- 不要把异常 stacktrace 放进 `message`。
