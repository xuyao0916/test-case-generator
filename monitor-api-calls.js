#!/usr/bin/env node

/**
 * 分步骤测试用例生成 - API调用监控工具
 * 实时监控各个步骤的API调用和环境变量使用情况
 */

const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 创建Express应用
const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

app.use(express.json());
app.use(express.static('public'));

// 监控数据存储
let monitoringData = {
  sessions: [],
  currentSession: null
};

// 环境变量映射
const getEnvVarsForStep = (step, apiProvider) => {
  const baseVars = {
    CYBOTSTAR_API_URL: process.env.CYBOTSTAR_API_URL,
    CYBOTSTAR_USERNAME: process.env.CYBOTSTAR_USERNAME,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL
  };

  if (apiProvider === 'cybotstar') {
    if (step === 'analyze' || step === 'supplement') {
      return {
        ...baseVars,
        CYBOTSTAR_ROBOT_KEY: process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY,
        CYBOTSTAR_ROBOT_TOKEN: process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN,
        purpose: '需求分析专用配置'
      };
    } else if (step === 'test-points' || step === 'generate-final') {
      return {
        ...baseVars,
        CYBOTSTAR_ROBOT_KEY: process.env.CASE_GENERATION_CYBOTSTAR_ROBOT_KEY,
        CYBOTSTAR_ROBOT_TOKEN: process.env.CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN,
        purpose: '测试用例生成专用配置'
      };
    }
  } else if (apiProvider === 'deepseek') {
    return {
      ...baseVars,
      purpose: 'DeepSeek通用配置'
    };
  }

  return baseVars;
};

// API调用监控中间件
app.use('/api/step-by-step/*', (req, res, next) => {
  const startTime = Date.now();
  const step = req.path.split('/').pop();
  const apiProvider = req.body.apiProvider || 'deepseek';
  
  // 获取当前步骤使用的环境变量
  const envVars = getEnvVarsForStep(step, apiProvider);
  
  // 创建监控记录
  const monitorRecord = {
    id: Date.now(),
    timestamp: new Date().toISOString(),
    step: step,
    stepName: getStepName(step),
    apiProvider: apiProvider,
    envVars: envVars,
    requestBody: {
      ...req.body,
      // 隐藏敏感信息
      apiProvider: req.body.apiProvider
    },
    status: 'pending',
    startTime: startTime
  };
  
  // 添加到当前会话
  if (!monitoringData.currentSession) {
    monitoringData.currentSession = {
      id: Date.now(),
      startTime: new Date().toISOString(),
      steps: []
    };
  }
  
  monitoringData.currentSession.steps.push(monitorRecord);
  
  // 发送实时更新
  io.emit('apiCallStart', monitorRecord);
  
  console.log(`\n🚀 API调用开始:`);
  console.log(`   步骤: ${monitorRecord.stepName}`);
  console.log(`   API提供商: ${apiProvider}`);
  console.log(`   使用配置: ${envVars.purpose}`);
  console.log(`   环境变量:`);
  Object.entries(envVars).forEach(([key, value]) => {
    if (key !== 'purpose' && value) {
      const displayValue = value.length > 20 ? value.substring(0, 20) + '...' : value;
      console.log(`     ${key}: ${displayValue}`);
    }
  });
  
  // 拦截响应
  const originalSend = res.send;
  res.send = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // 更新监控记录
    monitorRecord.status = 'completed';
    monitorRecord.duration = duration;
    monitorRecord.endTime = endTime;
    
    try {
      const responseData = JSON.parse(data);
      monitorRecord.success = responseData.success;
      monitorRecord.error = responseData.error;
      monitorRecord.mock = responseData.mock;
    } catch (e) {
      // 忽略JSON解析错误
    }
    
    // 发送实时更新
    io.emit('apiCallComplete', monitorRecord);
    
    console.log(`✅ API调用完成:`);
    console.log(`   耗时: ${duration}ms`);
    console.log(`   状态: ${monitorRecord.success ? '成功' : '失败'}`);
    if (monitorRecord.mock) {
      console.log(`   ⚠️  使用模拟响应`);
    }
    
    originalSend.call(this, data);
  };
  
  next();
});

// 获取步骤名称
function getStepName(step) {
  const stepNames = {
    'analyze': '步骤1：需求分析',
    'supplement': '步骤2：需求补充',
    'test-points': '步骤3：测试点生成',
    'generate-final': '步骤4：最终测试用例生成'
  };
  return stepNames[step] || step;
}

// 获取监控数据API
app.get('/monitor/data', (req, res) => {
  res.json(monitoringData);
});

// 清除监控数据API
app.post('/monitor/clear', (req, res) => {
  if (monitoringData.currentSession) {
    monitoringData.sessions.push(monitoringData.currentSession);
  }
  monitoringData.currentSession = null;
  res.json({ success: true });
});

// 获取环境变量配置API
app.get('/monitor/env-config', (req, res) => {
  const { step, apiProvider } = req.query;
  const envVars = getEnvVarsForStep(step, apiProvider);
  res.json(envVars);
});

// Socket.IO连接处理
io.on('connection', (socket) => {
  console.log('🔗 监控客户端已连接');
  
  // 发送当前监控数据
  socket.emit('monitoringData', monitoringData);
  
  socket.on('disconnect', () => {
    console.log('🔌 监控客户端已断开');
  });
});

// 创建监控页面HTML
const createMonitorPage = () => {
  const html = `
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>分步骤生成 - API调用监控</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background-color: #f5f5f5;
        }
        .container {
            max-width: 1200px;
            margin: 0 auto;
        }
        .header {
            background: white;
            padding: 20px;
            border-radius: 8px;
            margin-bottom: 20px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .status {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
        }
        .status-item {
            background: white;
            padding: 15px;
            border-radius: 8px;
            flex: 1;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .step-card {
            background: white;
            margin-bottom: 15px;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        .step-header {
            padding: 15px;
            background: #f8f9fa;
            border-bottom: 1px solid #e9ecef;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .step-content {
            padding: 15px;
        }
        .env-vars {
            background: #f8f9fa;
            padding: 10px;
            border-radius: 4px;
            margin-top: 10px;
            font-family: monospace;
            font-size: 12px;
        }
        .status-pending { color: #ffc107; }
        .status-success { color: #28a745; }
        .status-error { color: #dc3545; }
        .mock-indicator {
            background: #ffc107;
            color: white;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 10px;
            margin-left: 10px;
        }
        .controls {
            margin-bottom: 20px;
        }
        .btn {
            background: #007bff;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 4px;
            cursor: pointer;
            margin-right: 10px;
        }
        .btn:hover {
            background: #0056b3;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔍 分步骤测试用例生成 - API调用监控</h1>
            <p>实时监控各个步骤的API调用和环境变量使用情况</p>
        </div>
        
        <div class="controls">
            <button class="btn" onclick="clearSession()">清除当前会话</button>
            <button class="btn" onclick="refreshData()">刷新数据</button>
        </div>
        
        <div class="status">
            <div class="status-item">
                <h3 id="totalCalls">0</h3>
                <p>总调用次数</p>
            </div>
            <div class="status-item">
                <h3 id="successCalls">0</h3>
                <p>成功调用</p>
            </div>
            <div class="status-item">
                <h3 id="errorCalls">0</h3>
                <p>失败调用</p>
            </div>
            <div class="status-item">
                <h3 id="avgDuration">0ms</h3>
                <p>平均耗时</p>
            </div>
        </div>
        
        <div id="stepsList"></div>
    </div>
    
    <script>
        const socket = io();
        let monitoringData = { currentSession: null, sessions: [] };
        
        socket.on('monitoringData', (data) => {
            monitoringData = data;
            updateDisplay();
        });
        
        socket.on('apiCallStart', (record) => {
            if (!monitoringData.currentSession) {
                monitoringData.currentSession = { steps: [] };
            }
            const existingIndex = monitoringData.currentSession.steps.findIndex(s => s.id === record.id);
            if (existingIndex >= 0) {
                monitoringData.currentSession.steps[existingIndex] = record;
            } else {
                monitoringData.currentSession.steps.push(record);
            }
            updateDisplay();
        });
        
        socket.on('apiCallComplete', (record) => {
            if (monitoringData.currentSession) {
                const index = monitoringData.currentSession.steps.findIndex(s => s.id === record.id);
                if (index >= 0) {
                    monitoringData.currentSession.steps[index] = record;
                }
            }
            updateDisplay();
        });
        
        function updateDisplay() {
            updateStats();
            updateStepsList();
        }
        
        function updateStats() {
            const steps = monitoringData.currentSession ? monitoringData.currentSession.steps : [];
            const totalCalls = steps.length;
            const successCalls = steps.filter(s => s.success).length;
            const errorCalls = steps.filter(s => s.success === false).length;
            const completedSteps = steps.filter(s => s.duration);
            const avgDuration = completedSteps.length > 0 
                ? Math.round(completedSteps.reduce((sum, s) => sum + s.duration, 0) / completedSteps.length)
                : 0;
            
            document.getElementById('totalCalls').textContent = totalCalls;
            document.getElementById('successCalls').textContent = successCalls;
            document.getElementById('errorCalls').textContent = errorCalls;
            document.getElementById('avgDuration').textContent = avgDuration + 'ms';
        }
        
        function updateStepsList() {
            const steps = monitoringData.currentSession ? monitoringData.currentSession.steps : [];
            const container = document.getElementById('stepsList');
            
            container.innerHTML = steps.map(step => {
                const statusClass = step.status === 'pending' ? 'status-pending' : 
                                  step.success ? 'status-success' : 'status-error';
                const statusText = step.status === 'pending' ? '进行中...' : 
                                 step.success ? '成功' : '失败';
                
                const envVarsHtml = Object.entries(step.envVars)
                    .filter(([key, value]) => key !== 'purpose' && value)
                    .map(([key, value]) => {
                        const displayValue = value.length > 30 ? value.substring(0, 30) + '...' : value;
                        return \`\${key}: \${displayValue}\`;
                    })
                    .join('\n');
                
                return \`
                    <div class="step-card">
                        <div class="step-header">
                            <div>
                                <strong>\${step.stepName}</strong>
                                <span style="margin-left: 10px; color: #666;">\${step.apiProvider.toUpperCase()}</span>
                                \${step.mock ? '<span class="mock-indicator">模拟</span>' : ''}
                            </div>
                            <div>
                                <span class="\${statusClass}">\${statusText}</span>
                                \${step.duration ? \`<span style="margin-left: 10px; color: #666;">\${step.duration}ms</span>\` : ''}
                            </div>
                        </div>
                        <div class="step-content">
                            <p><strong>配置用途:</strong> \${step.envVars.purpose}</p>
                            <p><strong>调用时间:</strong> \${new Date(step.timestamp).toLocaleString()}</p>
                            <div class="env-vars">
                                <strong>使用的环境变量:</strong><br>
                                \${envVarsHtml}
                            </div>
                        </div>
                    </div>
                \`;
            }).join('');
        }
        
        function clearSession() {
            fetch('/monitor/clear', { method: 'POST' })
                .then(() => {
                    monitoringData.currentSession = null;
                    updateDisplay();
                });
        }
        
        function refreshData() {
            fetch('/monitor/data')
                .then(res => res.json())
                .then(data => {
                    monitoringData = data;
                    updateDisplay();
                });
        }
        
        // 初始加载数据
        refreshData();
    </script>
</body>
</html>
  `;
  
  return html;
};

// 提供监控页面
app.get('/monitor', (req, res) => {
  res.send(createMonitorPage());
});

// 启动监控服务器
const PORT = process.env.MONITOR_PORT || 3001;
server.listen(PORT, () => {
  console.log(`\n🔍 API调用监控服务已启动`);
  console.log(`📊 监控页面: http://localhost:${PORT}/monitor`);
  console.log(`🔧 API端点: http://localhost:${PORT}/monitor/data`);
  console.log(`\n使用说明:`);
  console.log(`1. 在浏览器中打开监控页面`);
  console.log(`2. 在另一个终端启动主应用: npm run dev`);
  console.log(`3. 使用分步骤生成功能，监控页面将实时显示API调用信息`);
  console.log(`\n按 Ctrl+C 停止监控服务\n`);
});

module.exports = app;