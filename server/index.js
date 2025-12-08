const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const config = require('./config');
const historyService = require('./services/historyService');

const app = express();

// 确保目录存在
fs.ensureDirSync(config.outputDir);
fs.ensureDirSync(config.uploadsDir);
historyService.initHistoryFile();

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    fs.ensureDirSync(config.uploadsDir);
    cb(null, config.uploadsDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: config.upload.maxFileSize,
    files: config.upload.maxFiles
  }
});

// 中间件
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// 服务前端构建文件，禁用缓存
app.use(express.static(config.clientDistDir, {
  setHeaders: (res, filePath) => {
    if (filePath.endsWith('.js') || filePath.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// 将upload中间件添加到app，供路由使用
app.locals.upload = upload;

// 加载路由
const routes = require('./routes');
routes(app);

// 处理前端路由，所有非API请求都返回index.html（必须放在所有API路由之后）
app.get('*', (req, res) => {
  res.sendFile(path.join(config.clientDistDir, 'index.html'));
});

// 启动服务器
app.listen(config.PORT, '0.0.0.0', () => {
  console.log(`服务器运行在端口 ${config.PORT}`);
  console.log(`局域网访问地址: http://你的IP地址:${config.PORT}`);
  console.log('请确保防火墙允许该端口的入站连接');
  
  // 启动WSS定时任务
  try {
    const wssScheduler = require('../wss-scheduler');
    console.log('\n正在启动WSS定时任务...');
    wssScheduler.startScheduledTask();
    console.log('WSS定时任务已启动，将在每天早上8:50自动执行测试\n');
  } catch (error) {
    console.log('WSS定时任务启动失败:', error.message);
  }
});

module.exports = app;

