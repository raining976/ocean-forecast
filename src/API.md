# API 文档

本文档整理了前端项目当前使用的接口，基于 [src/api/index.js](src/api/index.js) 与 [src/utils/request.js](src/utils/request.js) 的实际实现。

## 基础说明

- 接口基础地址来自环境变量 `VITE_API_BASE_URL`，定义位置见 [src/utils/request.js:2-10](src/utils/request.js#L2-L10)
- 静态资源前缀来自环境变量 `VITE_WEBSITE_URL`，用于拼接图片与瓦片地址，见 [src/api/index.js:2](src/api/index.js#L2)
- 请求默认超时时间为 10 秒，见 [src/utils/request.js:4-10](src/utils/request.js#L4-L10)
- 如果 `localStorage` 中存在 `token`，请求会自动附带 `Authorization: Bearer <token>`，见 [src/utils/request.js:13-24](src/utils/request.js#L13-L24)
- 响应拦截器直接返回后端响应体 `response.data`，见 [src/utils/request.js:28-34](src/utils/request.js#L28-L34)

## 响应与错误约定

前端当前按以下方式消费接口：

- 成功响应通常直接返回业务对象
- 异步任务类接口通常会返回 `task_id`
- 查询任务结果时，前端会读取：
  - `status`：常见值为 `COMPLETED`、`FAILED`
  - `data.images`：图片结果列表
- 常规错误会弹出 toast，错误处理见 [src/utils/request.js:35-64](src/utils/request.js#L35-L64)

---

## 1. 实时预报

### 1.1 获取逐日实时预报

- 方法：`GET`
- 路径：`/api/realtime/day`
- 调用位置：[src/api/index.js:4-9](src/api/index.js#L4-L9)

#### 请求参数

前端透传 `params`，具体字段未在仓库中固定约束。

#### 响应处理

前端期望响应中包含：

```json
{
  "data": {
    "images": [
      {
        "path": "/xxx.png"
      }
    ]
  }
}
```

前端会将每个 `images[].path` 拼接为：

```text
VITE_WEBSITE_URL + item.path
```

#### 返回值

返回处理后的图片数组。

---

### 1.2 获取逐月实时预报

- 方法：`GET`
- 路径：`/api/realtime/month`
- 调用位置：[src/api/index.js:11-16](src/api/index.js#L11-L16)

#### 请求参数

前端透传 `params`，具体字段未在仓库中固定约束。

#### 响应处理

响应结构与逐日实时预报一致，前端同样会为 `images[].path` 拼接 `VITE_WEBSITE_URL`。

#### 返回值

返回处理后的图片数组。

---

### 1.3 获取逐日实时预报瓦片列表

- 方法：`GET`
- 路径：`/api/realtime/day/tiles`
- 调用位置：[src/api/index.js:236-252](src/api/index.js#L236-L252)

#### 请求参数

无。

#### 响应处理

前端期望响应中包含：

```json
{
  "data": {
    "result_date_list": ["2026-04-01", "2026-04-02"]
  }
}
```

前端会转换为：

```json
[
  {
    "path": "<VITE_WEBSITE_URL>/media/tiles/2026-04-01/{z}/{x}/{y}.png",
    "date": "2026-04-01"
  }
]
```

#### 返回值

返回瓦片列表数组，每项包含：

- `path`：瓦片模板地址
- `date`：日期

---

## 2. 模型解释器

### 2.1 提交模型解释任务

- 方法：`POST`
- 路径：`/api/model/interpreter`
- 调用位置：[src/api/index.js:28-49](src/api/index.js#L28-L49)

#### 请求体

```json
{
  "start_time": "string",
  "end_time": "string",
  "pred_gap": "string | number",
  "grad_type": "string",
  "position": "string，可选",
  "variable": "string，可选"
}
```

说明：

- `position` 仅在有值时传递
- `variable` 仅在有值时传递

#### 返回值

前端直接返回接口响应对象，通常应至少包含任务标识，例如：

```json
{
  "task_id": "xxx"
}
```

该 `task_id` 会被用于轮询结果，见 [src/store/modules/ModelInterpreterState.js:14-20](src/store/modules/ModelInterpreterState.js#L14-L20)。

---

### 2.2 获取模型解释任务结果

- 方法：`GET`
- 路径：`/api/model/interpreter/{task_id}`
- 调用位置：[src/api/index.js:54-62](src/api/index.js#L54-L62)

#### 路径参数

- `task_id`：任务 ID

#### 响应结构

前端轮询逻辑期望响应至少包含：

```json
{
  "status": "COMPLETED | FAILED | 其他处理中状态",
  "data": {
    "images": []
  }
}
```

#### 前端行为

- 当 `status === 'COMPLETED'` 时，前端将任务状态标记为“完成”
- 当 `status === 'FAILED'` 时，前端将任务状态标记为“失败”
- 成功完成后读取 `data.images`，见 [src/store/modules/ModelInterpreterState.js:30-44](src/store/modules/ModelInterpreterState.js#L30-L44)

---

## 3. 图片上传

### 3.1 上传单张图片

- 方法：`POST`
- 路径：`/api/upload/image`
- 调用位置：[src/api/index.js:67-80](src/api/index.js#L67-L80)
- 请求类型：`multipart/form-data`

#### 请求体

表单字段：

- `file`：上传文件

#### 响应结构

前端期望响应中包含：

```json
{
  "data": {
    "image_url": "https://... 或 /path"
  }
}
```

#### 返回值

返回 `res.data.image_url`。

---

### 3.2 上传多张图片

该能力不是独立后端接口，而是前端对单图上传接口的并发封装。

- 封装位置：[src/api/index.js:83-94](src/api/index.js#L83-L94)

#### 输入

- `files`：文件数组

#### 返回值

返回 `Promise.all` 的结果，即图片 URL 数组。

---

## 4. 预报测试

### 4.1 提交逐日预报任务

- 方法：`POST`
- 路径：`/api/predict/day`
- 调用位置：[src/api/index.js:97-112](src/api/index.js#L97-L112)

#### 请求体

```json
{
  "start_date": "string",
  "image_paths": ["string"]
}
```

#### 返回值

前端直接返回接口响应对象，通常应包含 `task_id`。

---

### 4.2 提交逐月预报任务

- 方法：`POST`
- 路径：`/api/predict/month`
- 调用位置：[src/api/index.js:114-129](src/api/index.js#L114-L129)

#### 请求体

```json
{
  "start_date": "string",
  "image_paths": ["string"]
}
```

#### 返回值

前端直接返回接口响应对象，通常应包含 `task_id`。

---

### 4.3 获取逐日预报结果

- 方法：`GET`
- 路径：`/api/predict/day/{taskId}`
- 调用位置：[src/api/index.js:132-143](src/api/index.js#L132-L143)

#### 路径参数

- `taskId`：任务 ID

#### 响应结构

前端期望响应至少包含：

```json
{
  "status": "COMPLETED | FAILED | 其他处理中状态",
  "data": {
    "images": []
  }
}
```

---

### 4.4 获取逐月预报结果

- 方法：`GET`
- 路径：`/api/predict/month/{taskId}`
- 调用位置：[src/api/index.js:145-156](src/api/index.js#L145-L156)

#### 路径参数

- `taskId`：任务 ID

#### 响应结构

与逐日预报结果接口一致。

---

### 4.5 统一预报接口封装

以下两个方法是前端内部封装，不是新增后端接口：

- `postPrediction(type, startDate, imagePaths)`：见 [src/api/index.js:159-171](src/api/index.js#L159-L171)
- `getPredictionResult(taskId, type)`：见 [src/api/index.js:173-188](src/api/index.js#L173-L188)

#### type 取值

- `daily`
- `monthly`

#### 任务结果轮询约定

前端会在状态管理中轮询结果，并读取：

- `status`
- `data.images`

见 [src/store/modules/PredictionTestState.js:31-50](src/store/modules/PredictionTestState.js#L31-L50)。

---

## 5. 动力学分析

### 5.1 提交动力学分析任务

- 方法：`POST`
- 路径：`/api/dynamics/analysis`
- 调用位置：[src/api/index.js:191-220](src/api/index.js#L191-L220)

#### 请求体

前端表单字段：

```json
{
  "startDate": "string",
  "endDate": "string",
  "grad_month": "string | number",
  "grad_type": "string",
  "selection": {
    "bl": { "x": "number", "y": "number" },
    "tr": { "x": "number", "y": "number" }
  }
}
```

实际提交给后端的请求体为：

```json
{
  "start_time": "string",
  "end_time": "string",
  "grad_month": "string | number",
  "grad_type": "string",
  "x1": "number",
  "y1": "number",
  "x2": "number",
  "y2": "number"
}
```

字段映射关系：

- `x1 = selection.bl.x`
- `y1 = selection.bl.y`
- `x2 = selection.tr.x`
- `y2 = selection.tr.y`

#### 返回值

前端直接返回接口响应对象，通常应包含 `task_id`。

---

### 5.2 获取动力学分析结果

- 方法：`GET`
- 路径：`/api/dynamics/analysis/{task_id}`
- 调用位置：[src/api/index.js:223-234](src/api/index.js#L223-L234)

#### 路径参数

- `task_id`：任务 ID

#### 响应结构

前端期望响应至少包含：

```json
{
  "status": "COMPLETED | FAILED | 其他处理中状态",
  "data": {
    "images": []
  }
}
```

#### 前端行为

轮询逻辑见 [src/store/modules/DynamicAnalysisState.js:30-48](src/store/modules/DynamicAnalysisState.js#L30-L48)。

---

## 6. 航线规划

### 6.1 获取港口列表

- 方法：`GET`
- 路径：`/api/route/ports`
- 调用位置：[src/api/index.js:255-265](src/api/index.js#L255-L265)

#### 请求参数

无。

#### 响应结构

前端期望响应中包含：

```json
{
  "data": {
    "ports": ["港口A", "港口B"]
  }
}
```

#### 返回值

返回 `response.data.ports`。

---

### 6.2 提交航线规划任务

- 方法：`POST`
- 路径：`/api/route/plan`
- 调用位置：[src/api/index.js:267-285](src/api/index.js#L267-L285)

#### 请求体

```json
{
  "start_port": "string",
  "end_port": "string"
}
```

#### 返回值

前端直接返回接口响应对象，通常应包含 `task_id`。

路由规划状态管理实际从 `response.data.task_id` 读取任务 ID，见 [src/store/modules/RoutePlanningState.js:113-125](src/store/modules/RoutePlanningState.js#L113-L125)。

---

### 6.3 获取航线规划结果

- 方法：`GET`
- 路径：`/api/route/plan/{task_id}`
- 调用位置：[src/api/index.js:287-299](src/api/index.js#L287-L299)

#### 路径参数

- `task_id`：任务 ID

#### 响应结构

仓库中未看到完整消费字段，但按任务型接口模式，建议至少保持以下结构：

```json
{
  "status": "COMPLETED | FAILED | 其他处理中状态",
  "data": {}
}
```

具体结果字段建议以后端实际返回为准，并同步补充到本文件。

---

## 7. 建议补充的后端接口规范

当前前端已经隐含了一套比较稳定的响应约定，后端若统一遵循，联调会更顺畅。

### 7.1 任务提交接口建议

```json
{
  "task_id": "string"
}
```

### 7.2 任务查询接口建议

```json
{
  "status": "PENDING | STARTED | COMPLETED | FAILED",
  "data": {
    "images": []
  },
  "message": "string，可选"
}
```

### 7.3 普通列表接口建议

```json
{
  "data": {
    "items": []
  }
}
```

如果后端希望继续沿用当前结构，也建议至少保证以下字段名稳定：

- `task_id`
- `status`
- `data`
- `data.images`
- `data.ports`
- `data.result_date_list`
- `data.image_url`

---

## 8. 接口清单汇总

| 模块 | 方法 | 路径 | 说明 |
| --- | --- | --- | --- |
| 实时预报 | GET | `/api/realtime/day` | 获取逐日实时预报图片 |
| 实时预报 | GET | `/api/realtime/month` | 获取逐月实时预报图片 |
| 模型解释器 | POST | `/api/model/interpreter` | 提交模型解释任务 |
| 模型解释器 | GET | `/api/model/interpreter/{task_id}` | 查询模型解释任务结果 |
| 图片上传 | POST | `/api/upload/image` | 上传单张图片 |
| 预报测试 | POST | `/api/predict/day` | 提交逐日预报任务 |
| 预报测试 | POST | `/api/predict/month` | 提交逐月预报任务 |
| 预报测试 | GET | `/api/predict/day/{taskId}` | 查询逐日预报结果 |
| 预报测试 | GET | `/api/predict/month/{taskId}` | 查询逐月预报结果 |
| 动力学分析 | POST | `/api/dynamics/analysis` | 提交动力学分析任务 |
| 动力学分析 | GET | `/api/dynamics/analysis/{task_id}` | 查询动力学分析结果 |
| 实时预报瓦片 | GET | `/api/realtime/day/tiles` | 获取逐日实时预报瓦片日期列表 |
| 航线规划 | GET | `/api/route/ports` | 获取港口列表 |
| 航线规划 | POST | `/api/route/plan` | 提交航线规划任务 |
| 航线规划 | GET | `/api/route/plan/{task_id}` | 查询航线规划结果 |
