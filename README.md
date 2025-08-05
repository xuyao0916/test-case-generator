# 测试用例自动生成平台

基于Vue3 + Node.js + DeepSeek API的智能测试用例生成平台

## 功能特性

- 📁 **文件上传**: 支持多种格式文件上传（txt, md, js, py, java, cpp, c, html, css, json, xml等）
- ✏️ **文本输入**: 直接输入代码或需求描述
- 🤖 **AI生成**: 基于DeepSeek API智能生成测试用例
- 📄 **结果展示**: 实时显示生成的测试用例
- 💾 **文件下载**: 支持将生成结果下载为文件
- 📋 **一键复制**: 快速复制生成内容到剪贴板

## 技术栈

### 前端
- Vue 3
- Element Plus UI组件库
- Vue Router
- Axios

### 后端
- Node.js
- Express
- Multer (文件上传)
- Axios (API调用)

## 快速开始

### 1. 安装依赖

```bash
# 安装后端依赖
npm install

# 安装前端依赖
cd client
npm install
cd ..
```

### 2. 配置环境变量

项目根目录已包含 `.env` 文件，包含DeepSeek API配置。如需修改，请编辑该文件。

### 3. 启动项目

```bash
# 同时启动前后端（推荐）
npm run dev

# 或者分别启动
# 启动后端服务器
npm run server

# 启动前端开发服务器（新终端）
npm run client
```

### 4. 访问应用

- 前端地址: http://localhost:8080
- 后端API: http://localhost:3001

## 使用说明

1. **选择输入方式**:
   - 文件上传：拖拽或点击上传代码文件
   - 文本输入：直接在文本框中输入代码或需求

2. **生成测试用例**:
   - 点击"开始生成测试用例"按钮
   - 等待AI处理并生成结果

3. **查看和使用结果**:
   - 在结果区域查看生成的测试用例
   - 点击"下载文件"保存到本地
   - 点击"复制内容"复制到剪贴板
