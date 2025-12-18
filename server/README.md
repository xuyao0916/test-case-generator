# 后端模块化结构说明

## 目录结构

```
server/
├── index.js              # 主入口文件
├── config/               # 配置模块
│   └── index.js          # 配置文件
├── routes/               # 路由模块
│   ├── index.js          # 路由汇总
│   ├── common.js         # 通用路由（健康检查、代理请求）
│   ├── generate.js       # 测试用例生成路由
│   ├── api-test.js       # API测试路由
│   ├── step-by-step.js   # 分步骤生成路由
│   ├── review.js         # 评审路由
│   ├── wss.js            # WSS相关路由
│   └── history.js        # 历史记录路由
├── controllers/          # 控制器模块（待实现）
├── services/             # 服务层模块
│   ├── fileParser.js     # 文件解析服务
│   └── historyService.js # 历史记录服务
└── utils/               # 工具函数模块
    ├── helpers.js        # 辅助函数
    └── curlParser.js     # cURL解析工具
```

## 迁移说明

### 已完成
- ✅ 目录结构创建
- ✅ 配置文件模块
- ✅ 工具函数模块（helpers, curlParser）
- ✅ 服务层模块（fileParser, historyService）
- ✅ 主入口文件（server/index.js）
- ✅ 路由框架（所有路由文件已创建）
- ✅ 通用路由（common.js）
- ✅ WSS路由（wss.js）
- ✅ 历史记录路由（history.js）

### 待完成
以下路由模块需要从 `server.js.bak` 中提取相关代码：

1. **generate.js** - 需要提取：
   - `/api/generate` (line 887)
   - `/api/convert-format` (line 1263)
   - `/api/generate-distributed` (line 1725)

2. **api-test.js** - 需要提取：
   - `/api/generate-api-test` (line 1117)
   - `/api/execute-api-tests` (line 1203)
   - `/api/execute-api-tests-multi` (line 1219)
   - `/api/parse-curl` (line 1249)

3. **step-by-step.js** - 需要提取：
   - `/api/step-by-step/analyze` (line 1319)
   - `/api/step-by-step/supplement` (line 1416)
   - `/api/step-by-step/test-points` (line 1515)
   - `/api/step-by-step/generate-final` (line 1604)

4. **review.js** - 需要提取：
   - `/api/review-testcase` (line 1862)
   - `/api/review/requirement` (line 1969)
   - `/api/requirement-review` (line 2121)
   - `/api/review-test-cases` (line 2216)

### 需要创建的服务模块

还需要创建以下服务模块（从 server.js.bak 中提取）：

1. **services/xmindGenerator.js** - XMind文件生成服务
   - `generateXMindFile()` (line 103)
   - `convertToXMindXML()` (line 429)

2. **services/excelGenerator.js** - Excel文件生成服务
   - `parseApiTestCasesToExcel()` (line 130)
   - `generateExcelFile()` (line 207)

3. **services/aiService.js** - AI服务调用
   - `convertFileFormat()` (line 345)
   - DeepSeek API调用
   - Cybotstar API调用

4. **services/apiTestService.js** - API测试服务
   - `executeApiTests()` (line 811)

## 使用方式

启动服务器：
```bash
npm start
# 或
npm run server
```

开发模式（前后端同时启动）：
```bash
npm run dev
```

## 注意事项

1. 原 `server.js` 已备份为 `server.js.bak`
2. 新的入口文件是 `server/index.js`
3. 所有路由都按模块划分到 `server/routes/` 目录
4. 配置统一在 `server/config/index.js` 中管理
5. 工具函数在 `server/utils/` 目录
6. 服务层在 `server/services/` 目录

## 下一步

1. 从 `server.js.bak` 中提取各个路由的代码到对应的路由文件
2. 创建缺失的服务模块
3. 测试各个功能是否正常
4. 删除 `server.js.bak`（确认一切正常后）







