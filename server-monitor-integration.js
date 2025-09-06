/**
 * 服务器监控集成代码
 * 将此代码添加到你的server.js中以启用API调用监控
 */

// 引入监控模块
const { APIMonitor } = require('./simple-monitor');
const monitor = new APIMonitor();

// 监控中间件 - 添加到你的server.js中
function addMonitoringToServer(app) {
  // 为所有分步骤API添加监控
  app.use('/api/step-by-step/*', (req, res, next) => {
    const step = req.path.split('/').pop();
    const apiProvider = req.body.apiProvider || 'deepseek';
    
    // 记录API调用开始
    const callId = monitor.logAPICallStart(step, apiProvider, req.body);
    
    // 保存callId到请求对象
    req.monitorCallId = callId;
    
    // 拦截响应
    const originalSend = res.send;
    res.send = function(data) {
      try {
        const responseData = JSON.parse(data);
        const success = responseData.success !== false;
        const error = responseData.error || null;
        
        // 记录API调用结束
        monitor.logAPICallEnd(callId, success, error, responseData);
      } catch (e) {
        // 如果响应不是JSON，假设成功
        monitor.logAPICallEnd(callId, true);
      }
      
      originalSend.call(this, data);
    };
    
    next();
  });
  
  // 添加监控数据API端点
  app.get('/api/monitor/stats', (req, res) => {
    res.json(monitor.getSessionStats());
  });
  
  app.get('/api/monitor/data', (req, res) => {
    res.json(monitor.exportData());
  });
  
  app.post('/api/monitor/clear', (req, res) => {
    monitor.clearSession();
    res.json({ success: true, message: '监控数据已清除' });
  });
  
  app.get('/api/monitor/env-check', (req, res) => {
    const { step, apiProvider } = req.query;
    if (step && apiProvider) {
      const envVars = monitor.getEnvVarsForStep(step, apiProvider);
      res.json(envVars);
    } else {
      // 返回所有步骤的环境变量配置
      const allConfigs = {};
      const steps = ['analyze', 'supplement', 'test-points', 'generate-final'];
      const providers = ['cybotstar', 'deepseek'];
      
      steps.forEach(step => {
        allConfigs[step] = {};
        providers.forEach(provider => {
          allConfigs[step][provider] = monitor.getEnvVarsForStep(step, provider);
        });
      });
      
      res.json(allConfigs);
    }
  });
  
  console.log('🔍 API监控已启用');
  console.log('📊 监控端点:');
  console.log('   GET /api/monitor/stats - 获取统计信息');
  console.log('   GET /api/monitor/data - 获取完整监控数据');
  console.log('   POST /api/monitor/clear - 清除监控数据');
  console.log('   GET /api/monitor/env-check - 检查环境变量配置');
}

// 手动监控函数 - 用于在特定位置添加监控
function manualMonitor(step, apiProvider, requestData) {
  return monitor.logAPICallStart(step, apiProvider, requestData);
}

function manualMonitorEnd(callId, success, error, responseData) {
  monitor.logAPICallEnd(callId, success, error, responseData);
}

// 打印会话统计
function printStats() {
  monitor.printSessionStats();
}

// 检查环境变量配置
function checkEnvConfig() {
  monitor.checkEnvConfig();
}

module.exports = {
  addMonitoringToServer,
  manualMonitor,
  manualMonitorEnd,
  printStats,
  checkEnvConfig,
  monitor
};

// 使用示例代码
const exampleUsage = `
// 在你的server.js中添加以下代码:

// 1. 引入监控模块
const { addMonitoringToServer, checkEnvConfig } = require('./server-monitor-integration');

// 2. 在创建Express应用后添加监控
const app = express();
app.use(express.json());

// 添加监控功能
addMonitoringToServer(app);

// 3. 启动时检查环境变量配置
checkEnvConfig();

// 4. 可选：在特定位置手动添加监控
// const callId = manualMonitor('analyze', 'cybotstar', requestData);
// ... API调用 ...
// manualMonitorEnd(callId, success, error, responseData);

// 5. 可选：定期打印统计信息
// setInterval(() => {
//   printStats();
// }, 60000); // 每分钟打印一次
`;

console.log('\n📝 集成示例:');
console.log(exampleUsage);