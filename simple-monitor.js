#!/usr/bin/env node

/**
 * 简单的API调用监控脚本
 * 可以直接集成到现有的server.js中
 */

require('dotenv').config();

// 环境变量检查和监控函数
class APIMonitor {
  constructor() {
    this.calls = [];
    this.currentSession = null;
  }

  // 获取步骤对应的环境变量
  getEnvVarsForStep(step, apiProvider) {
    const baseConfig = {
      CYBOTSTAR_API_URL: process.env.CYBOTSTAR_API_URL,
      CYBOTSTAR_USERNAME: process.env.CYBOTSTAR_USERNAME,
      DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
      DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL
    };

    if (apiProvider === 'cybotstar') {
      if (step === 'analyze' || step === 'supplement') {
        return {
          ...baseConfig,
          CYBOTSTAR_ROBOT_KEY: process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY,
          CYBOTSTAR_ROBOT_TOKEN: process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN,
          purpose: '需求分析专用配置',
          stepType: '需求分析阶段'
        };
      } else if (step === 'test-points' || step === 'generate-final') {
        return {
          ...baseConfig,
          CYBOTSTAR_ROBOT_KEY: process.env.CASE_GENERATION_CYBOTSTAR_ROBOT_KEY,
          CYBOTSTAR_ROBOT_TOKEN: process.env.CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN,
          purpose: '测试用例生成专用配置',
          stepType: '测试用例生成阶段'
        };
      }
    } else if (apiProvider === 'deepseek') {
      return {
        ...baseConfig,
        purpose: 'DeepSeek通用配置',
        stepType: 'AI模型调用'
      };
    }

    return baseConfig;
  }

  // 记录API调用开始
  logAPICallStart(step, apiProvider, requestData = {}) {
    const stepNames = {
      'analyze': '步骤1：需求分析',
      'supplement': '步骤2：需求补充', 
      'test-points': '步骤3：测试点生成',
      'generate-final': '步骤4：最终测试用例生成'
    };

    const envVars = this.getEnvVarsForStep(step, apiProvider);
    const callRecord = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      step: step,
      stepName: stepNames[step] || step,
      apiProvider: apiProvider,
      envVars: envVars,
      startTime: Date.now(),
      status: 'started'
    };

    this.calls.push(callRecord);

    // 控制台输出
    console.log(`\n🚀 [${new Date().toLocaleTimeString()}] API调用开始`);
    console.log(`   📋 步骤: ${callRecord.stepName}`);
    console.log(`   🔧 API提供商: ${apiProvider.toUpperCase()}`);
    console.log(`   ⚙️  配置类型: ${envVars.purpose}`);
    console.log(`   🔑 使用的环境变量:`);
    
    Object.entries(envVars).forEach(([key, value]) => {
      if (key !== 'purpose' && key !== 'stepType' && value) {
        const displayValue = this.maskSensitiveValue(key, value);
        const status = value ? '✅' : '❌';
        console.log(`      ${status} ${key}: ${displayValue}`);
      }
    });

    return callRecord.id;
  }

  // 记录API调用结束
  logAPICallEnd(callId, success, error = null, responseData = null) {
    const callRecord = this.calls.find(call => call.id === callId);
    if (!callRecord) return;

    const endTime = Date.now();
    const duration = endTime - callRecord.startTime;

    callRecord.endTime = endTime;
    callRecord.duration = duration;
    callRecord.success = success;
    callRecord.error = error;
    callRecord.status = 'completed';

    // 控制台输出
    const statusIcon = success ? '✅' : '❌';
    const statusText = success ? '成功' : '失败';
    
    console.log(`   ${statusIcon} 调用结果: ${statusText}`);
    console.log(`   ⏱️  耗时: ${duration}ms`);
    
    if (error) {
      console.log(`   ⚠️  错误信息: ${error}`);
    }
    
    if (responseData && responseData.mock) {
      console.log(`   🎭 使用模拟响应`);
    }

    console.log(`   ────────────────────────────────────────`);
  }

  // 掩码敏感信息
  maskSensitiveValue(key, value) {
    if (!value) return '未配置';
    
    const sensitiveKeys = ['KEY', 'TOKEN', 'SECRET', 'PASSWORD'];
    const isSensitive = sensitiveKeys.some(sk => key.toUpperCase().includes(sk));
    
    if (isSensitive && value.length > 8) {
      return value.substring(0, 4) + '****' + value.substring(value.length - 4);
    }
    
    if (value.length > 50) {
      return value.substring(0, 30) + '...';
    }
    
    return value;
  }

  // 获取当前会话统计
  getSessionStats() {
    const totalCalls = this.calls.length;
    const successCalls = this.calls.filter(call => call.success === true).length;
    const failedCalls = this.calls.filter(call => call.success === false).length;
    const completedCalls = this.calls.filter(call => call.duration).length;
    const avgDuration = completedCalls > 0 
      ? Math.round(this.calls.reduce((sum, call) => sum + (call.duration || 0), 0) / completedCalls)
      : 0;

    return {
      totalCalls,
      successCalls,
      failedCalls,
      avgDuration,
      completedCalls
    };
  }

  // 打印会话统计
  printSessionStats() {
    const stats = this.getSessionStats();
    
    console.log(`\n📊 当前会话统计:`);
    console.log(`   📞 总调用次数: ${stats.totalCalls}`);
    console.log(`   ✅ 成功调用: ${stats.successCalls}`);
    console.log(`   ❌ 失败调用: ${stats.failedCalls}`);
    console.log(`   ⏱️  平均耗时: ${stats.avgDuration}ms`);
    console.log(`   ────────────────────────────────────────\n`);
  }

  // 清除会话数据
  clearSession() {
    this.calls = [];
    console.log(`🧹 会话数据已清除`);
  }

  // 导出监控数据
  exportData() {
    return {
      calls: this.calls,
      stats: this.getSessionStats(),
      exportTime: new Date().toISOString()
    };
  }

  // 检查环境变量配置完整性
  checkEnvConfig() {
    console.log(`\n🔍 环境变量配置检查:`);
    
    const requiredVars = {
      '基础配置': {
        CYBOTSTAR_API_URL: process.env.CYBOTSTAR_API_URL,
        CYBOTSTAR_USERNAME: process.env.CYBOTSTAR_USERNAME,
        DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
        DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL
      },
      '需求分析配置': {
        DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY: process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY,
        DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN: process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN
      },
      '测试用例生成配置': {
        CASE_GENERATION_CYBOTSTAR_ROBOT_KEY: process.env.CASE_GENERATION_CYBOTSTAR_ROBOT_KEY,
        CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN: process.env.CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN
      }
    };

    Object.entries(requiredVars).forEach(([category, vars]) => {
      console.log(`\n   📂 ${category}:`);
      Object.entries(vars).forEach(([key, value]) => {
        const status = value ? '✅' : '❌';
        const displayValue = value ? this.maskSensitiveValue(key, value) : '未配置';
        console.log(`      ${status} ${key}: ${displayValue}`);
      });
    });

    console.log(`\n`);
  }
}

// 创建全局监控实例
const monitor = new APIMonitor();

// 如果直接运行此脚本
if (require.main === module) {
  console.log(`🔍 API调用监控工具`);
  console.log(`==================`);
  
  // 检查环境变量配置
  monitor.checkEnvConfig();
  
  console.log(`使用说明:`);
  console.log(`1. 在你的server.js中引入此模块:`);
  console.log(`   const { APIMonitor } = require('./simple-monitor');`);
  console.log(`   const monitor = new APIMonitor();`);
  console.log(``);
  console.log(`2. 在API调用前记录:`);
  console.log(`   const callId = monitor.logAPICallStart('analyze', 'cybotstar');`);
  console.log(``);
  console.log(`3. 在API调用后记录:`);
  console.log(`   monitor.logAPICallEnd(callId, true/false, error, responseData);`);
  console.log(``);
  console.log(`4. 查看统计信息:`);
  console.log(`   monitor.printSessionStats();`);
}

module.exports = { APIMonitor, monitor };