# 分步骤测试用例生成 - API调用监控指南

## 📋 概述

本监控系统可以帮助你实时查看分步骤测试用例生成模块中各个步骤调用接口时传递的环境变量，确保配置符合预期。

## 🛠️ 监控工具说明

### 1. 环境变量检查工具 (`check-env-vars.js`)
- **功能**: 检查所有环境变量配置是否正确
- **使用**: `node check-env-vars.js`
- **特点**: 一次性检查，显示配置状态

### 2. 简单监控模块 (`simple-monitor.js`)
- **功能**: 提供监控类和函数，可集成到现有代码
- **使用**: 作为模块引入使用
- **特点**: 轻量级，易于集成

### 3. 服务器集成监控 (`server-monitor-integration.js`)
- **功能**: 完整的服务器端监控解决方案
- **使用**: 集成到 `server.js` 中
- **特点**: 自动监控所有API调用，提供REST API

### 4. 实时监控服务 (`monitor-api-calls.js`)
- **功能**: 独立的监控服务器，支持WebSocket实时更新
- **使用**: `node monitor-api-calls.js`
- **特点**: 实时监控，Web界面

### 5. 前端监控页面 (`client/public/monitor.html`)
- **功能**: 可视化监控界面
- **访问**: `http://localhost:8082/monitor.html`
- **特点**: 实时显示，交互式界面

## 🚀 快速开始

### 方案一：简单检查（推荐新手）

1. **检查环境变量配置**:
   ```bash
   node check-env-vars.js
   ```

2. **查看详细说明**:
   ```bash
   node check-env-vars.js --help
   ```

### 方案二：集成监控（推荐日常使用）

1. **修改你的 `server.js`**:
   ```javascript
   // 在文件顶部添加
   const { addMonitoringToServer, checkEnvConfig } = require('./server-monitor-integration');
   
   // 在创建Express应用后添加
   const app = express();
   app.use(express.json());
   
   // 添加监控功能
   addMonitoringToServer(app);
   
   // 启动时检查环境变量
   checkEnvConfig();
   ```

2. **启动应用**:
   ```bash
   npm run dev
   ```

3. **访问监控页面**:
   ```
   http://localhost:8082/monitor.html
   ```

### 方案三：独立监控服务（推荐开发调试）

1. **启动监控服务**:
   ```bash
   node monitor-api-calls.js
   ```

2. **启动主应用**（另一个终端）:
   ```bash
   npm run dev
   ```

3. **访问监控页面**:
   ```
   http://localhost:3001/monitor
   ```

## 📊 监控信息说明

### 环境变量配置检查

系统会检查以下环境变量配置：

#### 基础配置
- `CYBOTSTAR_API_URL`: Cybotstar API地址
- `CYBOTSTAR_USERNAME`: Cybotstar用户名
- `DEEPSEEK_API_KEY`: DeepSeek API密钥
- `DEEPSEEK_API_URL`: DeepSeek API地址

#### 需求分析配置（步骤1、2）
- `DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY`: 需求分析机器人Key
- `DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN`: 需求分析机器人Token

#### 测试用例生成配置（步骤3、4）
- `CASE_GENERATION_CYBOTSTAR_ROBOT_KEY`: 用例生成机器人Key
- `CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN`: 用例生成机器人Token

### 步骤与环境变量对应关系

| 步骤 | 步骤名称 | Cybotstar配置 | DeepSeek配置 |
|------|----------|---------------|-------------|
| analyze | 步骤1：需求分析 | 需求分析专用配置 | 通用配置 |
| supplement | 步骤2：需求补充 | 需求分析专用配置 | 通用配置 |
| test-points | 步骤3：测试点生成 | 用例生成专用配置 | 通用配置 |
| generate-final | 步骤4：最终测试用例生成 | 用例生成专用配置 | 通用配置 |

## 🔍 实时监控功能

### 监控数据包含
- **API调用时间**: 精确到毫秒的调用时间戳
- **步骤信息**: 当前执行的步骤名称和编号
- **API提供商**: 使用的是Cybotstar还是DeepSeek
- **环境变量**: 当前步骤使用的所有环境变量
- **调用结果**: 成功/失败状态
- **响应时间**: API调用耗时
- **错误信息**: 失败时的详细错误信息

### 统计信息
- **总调用次数**: 当前会话的API调用总数
- **成功调用**: 成功的API调用次数
- **失败调用**: 失败的API调用次数
- **平均耗时**: 所有API调用的平均响应时间

## 🔧 API端点

当集成监控功能后，系统会提供以下API端点：

- `GET /api/monitor/stats` - 获取统计信息
- `GET /api/monitor/data` - 获取完整监控数据
- `POST /api/monitor/clear` - 清除监控数据
- `GET /api/monitor/env-check` - 检查环境变量配置
- `GET /api/monitor/env-check?step=analyze&apiProvider=cybotstar` - 检查特定步骤配置

## 🎯 使用场景

### 1. 开发阶段
- 验证环境变量配置是否正确
- 调试API调用问题
- 监控系统性能

### 2. 测试阶段
- 确保不同步骤使用正确的配置
- 验证API调用流程
- 性能测试和优化

### 3. 生产环境
- 实时监控API调用状态
- 快速定位问题
- 性能分析

## ⚠️ 注意事项

1. **敏感信息保护**: 监控系统会自动掩码敏感信息（API密钥、Token等）
2. **性能影响**: 监控功能对系统性能影响很小，可以在生产环境使用
3. **数据存储**: 监控数据存储在内存中，重启服务后会清空
4. **网络安全**: 确保监控页面只在安全的网络环境中访问

## 🐛 故障排除

### 常见问题

1. **监控页面无法访问**
   - 检查服务器是否正常启动
   - 确认端口没有被占用
   - 检查防火墙设置

2. **环境变量显示未配置**
   - 检查 `.env` 文件是否存在
   - 确认环境变量名称拼写正确
   - 重启服务器使配置生效

3. **API调用监控不显示**
   - 确认监控功能已正确集成
   - 检查API调用是否通过监控中间件
   - 查看控制台是否有错误信息

### 调试技巧

1. **查看控制台输出**: 监控系统会在控制台输出详细的调用信息
2. **使用浏览器开发者工具**: 检查网络请求和控制台错误
3. **检查服务器日志**: 查看服务器端的错误信息

## 📞 技术支持

如果遇到问题，可以：

1. 查看控制台输出的详细信息
2. 检查 `.env` 文件配置
3. 确认所有依赖包已正确安装
4. 重启服务器重新加载配置

## 🔄 更新日志

- **v1.0.0**: 初始版本，支持基本的环境变量检查和API调用监控
- 支持实时监控和可视化界面
- 支持多种集成方式
- 支持敏感信息保护

---

**提示**: 建议在开发过程中始终开启监控功能，这样可以及时发现配置问题和性能瓶颈。