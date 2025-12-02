# 测试用例自动生成平台

一个面向测试工程与质量保障的智能化平台，围绕“需求理解 → 测试设计 → 用例产出 → 评审与追踪”，提供从接口文档、一段文本或源码出发的多形态测试用例自动化生成、评审与导出能力。前端基于 Vue 3 + Element Plus，后端基于 Node.js + Express，并集成 DeepSeek 与 Cybotstar 等上游模型服务。

## 核心能力

- 🧠 用例生成：支持功能用例快速生成与“分步骤”精细化生成（需求分析/补充/测试点提炼/最终用例整合）
- 📄 文档到用例：从接口文档直接生成 API 测试用例（`/api/generate`）
- 🗂 多格式导出：XMind 思维导图（`.xmind`）、Excel（`.xlsx`）、纯文本（`.txt`），统一存放于 `generated/`
- 🔍 评审闭环：需求评审与用例评审视图，促进方案完善与质量把关
- 🌐 WebSocket 测试：批量连接、分轮次对话与连断控制，便捷验证 WSS 行为
- 🧰 联调与工具：API 联调页、环境变量检测与调用监控（含可视化监控页）
- 📜 历史记录：生成与评审历史追踪，便于回溯与复用

## 界面与模块

- 功能用例生成：`/functional/generate`（`client/src/views/TestCaseGenerator.vue`）
- 分步骤生成：`/functional/step-by-step`（`client/src/views/StepByStepGenerator.vue`）
- 历史记录：`/functional/history`（`client/src/views/History.vue`）
- 用例评审：`/review/testcase`（`client/src/views/TestCaseReview.vue`）
- 需求评审：`/review/requirement`（`client/src/views/RequirementReview.vue`）
- 工具模块：`/tools/main`（`client/src/views/ToolsModule.vue`）
- API 联调：`/api/test`（`client/src/views/ApiTest.vue`）
- WSS 测试：`/api/wss`（`client/src/views/WssTest.vue`）
- API 文档到用例：`/api/generate`（`client/src/views/ApiGenerate.vue`）
- API 文档查看：`/api/docs`（`client/src/views/ApiDocs.vue`）

## 技术栈

- 前端：`Vue 3`、`Element Plus`、`Vue Router`、`Axios`
- 构建：`@vue/cli-service`（`vue-cli-service serve/build`），开发代理见 `client/vue.config.js`
- 后端：`Node.js + Express`，文件上传 `multer`，文档处理 `mammoth`/`pdf-parse`，压缩打包 `JSZip`，表格 `xlsx`，XMind 解析 `xmindparser`
- 环境变量：`dotenv`（根目录 `.env`）

## 目录结构

- `client/` 前端单页应用（入口 `client/src/main.js`，路由 `client/src/router/index.js`）
- `generated/` 生成物输出目录（`.xmind`、`.xlsx`、`.txt` 等）
- `uploads/` 上传文件存储
- `server.js` 后端主服务（Express）
- `server-monitor-integration.js` 监控集成（暴露 `/api/monitor/*` 端点）
- `simple-monitor.js`/`monitor-api-calls.js` 监控与可视化支持
- `.env` 环境变量配置；`package.json` 根脚本与依赖；`client/package.json` 前端脚本与依赖

## 快速开始

### 安装依赖

```bash
npm install
npm run install-client
```

### 配置环境变量

在项目根目录 `.env` 配置上游服务与模型参数，例如：

- DeepSeek：`DEEPSEEK_API_KEY`、`DEEPSEEK_API_URL`
- Cybotstar：`CYBOTSTAR_API_URL`、各阶段 `ROBOT_KEY/ROBOT_TOKEN`

### 启动项目

```bash
# 同时启动前后端（推荐）
npm run dev

# 或分别启动
npm run server      # 后端，默认 3001
npm run client      # 前端，默认 8080
```

### 访问地址

- 前端：`http://localhost:8080`
- 后端：`http://localhost:3001`

## 使用流程

- 选择输入：上传文件或直接粘贴需求/代码
- 生成用例：在功能或分步骤视图发起生成，等待结果
- 导出成果：在结果区选择导出为 XMind/Excel/文本，文件位于 `generated/`
- 评审改进：进入评审视图进行完善，历史可在 `History` 查看

## 监控与环境

- 监控端点：`GET /api/monitor/stats`、`GET /api/monitor/data`、`POST /api/monitor/clear`、`GET /api/monitor/env-check`
- 可视化页面：`client/public/monitor.html`
- 开发代理：前端将 `'/api'` 代理至 `process.env.VUE_APP_API_URL || http://localhost:3001`

## NPM 脚本

- 根目录：`start`（生产运行）、`dev`（并发启动前后端）、`server`（nodemon）、`client`、`build`
- 前端：`serve/start`、`build`、`lint`

## 适用场景

- 从零构建测试体系（需求到用例的闭环）
- 大批量接口测试用例生成与导出
- 面向评审与回溯的质量保障工作流

## 许可证

MIT
