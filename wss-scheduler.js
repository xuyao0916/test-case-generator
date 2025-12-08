const cron = require('node-cron');
const WebSocket = require('ws');
const crypto = require('crypto');
const axios = require('axios');

// 钉钉机器人配置
const DINGTALK_WEBHOOK = 'https://oapi.dingtalk.com/robot/send?access_token=ad3db34fc3916266bbbfd670ffb3810e6f635d8f5a72717abb2cbf3b1927f658';
const DINGTALK_SECRET = 'SECd22760035090f699742fe85f435bdd1d0fad7f0bfd272ea778bdd8f66bc96011';

// 国内生产WSS配置
const DOMESTIC_WSS_CONFIGS = [
  {
    name: 'CybotStar多轮对话测试',
    url: 'wss://www.cybotstar.cn/openapi/v2/ws/dialog/',
    testParams: {
      'cybertron-robot-token': 'MTc1MjE1NTEzMjU1Nwp0ejl3K1ZYY2F2MkZrUkVHTGsyRGZhZUltOEU9',
      'cybertron-robot-key': 's%2B6v1Kd9jdVoa79rHsgOLKTy0qE%3D',
      username: 'yao.xu@brgroup.com',
      question: '你帮我写一个10句诗词'
    }
  },
  {
    name: '轻量接口',
    url: 'wss://www.cybotstar.cn/openapi/ws/lightweight/dialog/',
    testParams: {
      'cybertron-robot-token': 'MTc1MjE1NTEzMjU1Nwp0ejl3K1ZYY2F2MkZrUkVHTGsyRGZhZUltOEU9',
      'cybertron-robot-key': 's%2B6v1Kd9jdVoa79rHsgOLKTy0qE%3D',
      username: 'yao.xu@brgroup.com',
      question: '你帮我写一个10句诗词'
    }
  },
  {
    name: 'bate接口',
    url: 'wss://www.cybotstar.cn/openapi/ws/agent-dialog/lightweight-beta/dialog/',
    testParams: {
      'cybertron-robot-token': 'MTc1MjE1NTEzMjU1Nwp0ejl3K1ZYY2F2MkZrUkVHTGsyRGZhZUltOEU9',
      'cybertron-robot-key': 's%2B6v1Kd9jdVoa79rHsgOLKTy0qE%3D',
      username: 'yao.xu@brgroup.com',
      question: '你帮我写一个10句诗词'
    }
  },
  {
    name: '轻量plus',
    url: 'wss://www.cybotstar.cn/openapi/ws/lightweight-plus/dialog/',
    testParams: {
      'cybertron-robot-token': 'MTc1MjE1NTEzMjU1Nwp0ejl3K1ZYY2F2MkZrUkVHTGsyRGZhZUltOEU9',
      'cybertron-robot-key': 's%2B6v1Kd9jdVoa79rHsgOLKTy0qE%3D',
      username: 'yao.xu@brgroup.com',
      question: '你帮我写一个10句诗词'
    }
  }
];

// HSBC WSS配置
const HSBC_WSS_CONFIGS = [
  {
    name: 'hsbc全量',
    url: 'wss://agent-aws-poc-hsbc.fano.ai/openapi/v2/ws/dialog/',
    testParams: {
      'cybertron-robot-token': 'MTc2NDcyOTE2MzYzMgpMVXd0ZkxRZG9Bcjhaa2w0RG01NzVBajlXUk09',
      'cybertron-robot-key': 'm%2F51ww1SLa0iQmU2ruwwn13Cmi4%3D',
      username: '1000_tao.yu200@brgroup.com',
      question: '你帮我写一个10句诗词'
    }
  },
  {
    name: 'hsbc轻量',
    url: 'wss://agent-aws-poc-hsbc.fano.ai/openapi/ws/agent-dialog/lightweight-beta/dialog/',
    testParams: {
      'cybertron-robot-token': 'MTc2NDcyOTE2MzYzMgpMVXd0ZkxRZG9Bcjhaa2w0RG01NzVBajlXUk09',
      'cybertron-robot-key': 'm%2F51ww1SLa0iQmU2ruwwn13Cmi4%3D',
      username: '1000_tao.yu200@brgroup.com',
      question: '你帮我写一个10句诗词'
    }
  }
];

// HASE WSS配置
const HASE_WSS_CONFIGS = [
  {
    name: 'hase全量',
    url: 'wss://agent-aws-poc-hase.fano.ai/openapi/v2/ws/dialog/',
    testParams: {
      'cybertron-robot-token': 'MTc2NDczMDIyMDAzMwpSQmFrZVk2NGlVL2NibTNxaUhFVzBtWnlLZm89',
      'cybertron-robot-key': 'vGsgi4TOGgUl7t6yy9bK6Q2jdk0%3D',
      username: '1000_tao.yu200@brgroup.com',
      question: '你帮我写一个10句诗词'
    }
  },
  {
    name: 'hase轻量',
    url: 'wss://agent-aws-poc-hase.fano.ai/openapi/ws/agent-dialog/lightweight-beta/dialog/',
    testParams: {
      'cybertron-robot-token': 'MTc2NDczMDIyMDAzMwpSQmFrZVk2NGlVL2NibTNxaUhFVzBtWnlLZm89',
      'cybertron-robot-key': 'vGsgi4TOGgUl7t6yy9bK6Q2jdk0%3D',
      username: '1000_tao.yu200@brgroup.com',
      question: '你帮我写一个10句诗词'
    }
  }
];

// 默认WSS配置（兼容旧代码，包含所有配置）
const DEFAULT_WSS_CONFIGS = [
  ...DOMESTIC_WSS_CONFIGS,
  ...HSBC_WSS_CONFIGS,
  ...HASE_WSS_CONFIGS
];

/**
 * 钉钉机器人加签
 * @param {string} secret - 加签密钥
 * @returns {string} 签名后的URL参数
 */
function generateDingTalkSign(secret) {
  const timestamp = Date.now();
  const stringToSign = `${timestamp}\n${secret}`;
  const sign = crypto
    .createHmac('sha256', secret)
    .update(stringToSign)
    .digest('base64');
  return `&timestamp=${timestamp}&sign=${encodeURIComponent(sign)}`;
}

/**
 * 发送钉钉通知
 * @param {string} title - 通知标题
 * @param {string} content - 通知内容
 * @param {object} testResults - 测试结果
 */
async function sendDingTalkNotification(title, content, testResults = null) {
  try {
    // 生成加签URL
    const signParams = generateDingTalkSign(DINGTALK_SECRET);
    const webhookUrl = DINGTALK_WEBHOOK + signParams;

    // 构建消息内容
    let messageContent = `## ${title}\n\n${content}`;
    
    if (testResults) {
      const successCount = testResults.filter(r => r.success).length;
      const failCount = testResults.filter(r => !r.success).length;
      const totalCount = testResults.length;
      
      messageContent += `\n\n### 测试结果汇总\n`;
      messageContent += `- **总计**: ${totalCount} 个接口\n`;
      messageContent += `- **成功**: ${successCount} 个\n`;
      messageContent += `- **失败**: ${failCount} 个\n`;
      messageContent += `- **成功率**: ${totalCount > 0 ? Math.round((successCount / totalCount) * 100) : 0}%\n\n`;
      
      messageContent += `### 详细结果\n`;
      
      // 按tab分组显示结果
      const resultsByTab = {};
      testResults.forEach(result => {
        const tab = result.tab || '未分类';
        if (!resultsByTab[tab]) {
          resultsByTab[tab] = [];
        }
        resultsByTab[tab].push(result);
      });
      
      Object.keys(resultsByTab).forEach(tab => {
        messageContent += `\n#### ${tab}\n`;
        resultsByTab[tab].forEach((result, index) => {
          const status = result.success ? '✅' : '❌';
          messageContent += `${status} **${result.name}**: ${result.message}\n`;
          if (result.error) {
            messageContent += `   - 错误: ${result.error}\n`;
          }
        });
      });
    }

    const message = {
      msgtype: 'markdown',
      markdown: {
        title: title,
        text: messageContent
      }
    };

    const response = await axios.post(webhookUrl, message, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 10000
    });

    if (response.data.errcode === 0) {
      console.log('钉钉通知发送成功');
      return true;
    } else {
      console.error('钉钉通知发送失败:', response.data);
      return false;
    }
  } catch (error) {
    console.error('发送钉钉通知时出错:', error.message);
    return false;
  }
}

/**
 * 测试单个WSS接口
 * @param {object} config - WSS配置
 * @param {number} timeout - 超时时间（毫秒）
 * @returns {Promise<object>} 测试结果
 */
function testWssInterface(config, timeout = 15000) {
  return new Promise((resolve) => {
    const result = {
      name: config.name,
      success: false,
      message: '',
      error: null,
      duration: 0
    };

    const startTime = Date.now();
    let ws = null;
    let messageReceived = false;
    let testTimeout = null;

    try {
      ws = new WebSocket(config.url);

      // 连接超时
      const connectTimeout = setTimeout(() => {
        if (ws && ws.readyState === WebSocket.CONNECTING) {
          ws.close();
          result.message = '连接超时';
          result.error = '连接超时（10秒）';
          result.duration = Date.now() - startTime;
          resolve(result);
        }
      }, 10000);

      ws.on('open', () => {
        clearTimeout(connectTimeout);
        console.log(`${config.name} 连接成功`);

        // 发送测试消息
        try {
          const messageContent = JSON.stringify(config.testParams);
          ws.send(messageContent);
          console.log(`${config.name} 消息发送成功`);

          // 等待接收消息的超时
          testTimeout = setTimeout(() => {
            if (!messageReceived) {
              ws.close();
              result.success = false;
              result.message = '未收到响应消息';
              result.error = '等待响应超时（5秒）';
              result.duration = Date.now() - startTime;
              resolve(result);
            }
          }, 5000);
        } catch (sendError) {
          clearTimeout(connectTimeout);
          ws.close();
          result.message = '消息发送失败';
          result.error = sendError.message;
          result.duration = Date.now() - startTime;
          resolve(result);
        }
      });

      ws.on('message', (data) => {
        messageReceived = true;
        if (testTimeout) clearTimeout(testTimeout);
        
        result.success = true;
        result.message = '测试成功，已收到响应';
        result.duration = Date.now() - startTime;
        
        console.log(`${config.name} 收到消息:`, data.toString().substring(0, 100));
        
        ws.close();
        resolve(result);
      });

      ws.on('error', (error) => {
        clearTimeout(connectTimeout);
        if (testTimeout) clearTimeout(testTimeout);
        
        result.message = '连接错误';
        result.error = error.message || '未知错误';
        result.duration = Date.now() - startTime;
        
        console.error(`${config.name} 连接错误:`, error.message);
        resolve(result);
      });

      ws.on('close', (code, reason) => {
        clearTimeout(connectTimeout);
        if (testTimeout) clearTimeout(testTimeout);
        
        if (!messageReceived && !result.error) {
          if (code === 1000) {
            result.success = true;
            result.message = '连接正常关闭';
          } else {
            result.success = false;
            result.message = `连接异常关闭 (代码: ${code})`;
            result.error = reason ? reason.toString() : '未知原因';
          }
          result.duration = Date.now() - startTime;
          resolve(result);
        }
      });

    } catch (error) {
      if (testTimeout) clearTimeout(testTimeout);
      result.message = '创建连接失败';
      result.error = error.message;
      result.duration = Date.now() - startTime;
      resolve(result);
    }
  });
}

/**
 * 批量测试所有WSS接口
 * @param {Array} configs - WSS配置数组
 * @returns {Promise<Array>} 测试结果数组
 */
async function testAllWssInterfaces(configs = DEFAULT_WSS_CONFIGS) {
  console.log(`开始批量测试 ${configs.length} 个WSS接口...`);
  const results = [];

  for (let i = 0; i < configs.length; i++) {
    const config = configs[i];
    console.log(`测试 ${i + 1}/${configs.length}: ${config.name}`);
    
    const result = await testWssInterface(config);
    results.push(result);
    
    // 每个接口测试之间稍作延迟
    if (i < configs.length - 1) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return results;
}

/**
 * 执行定时WSS测试任务（测试所有tab的接口）
 */
async function executeScheduledWssTest() {
  const startTime = new Date();
  console.log(`\n========== 定时WSS测试任务开始 ==========`);
  console.log(`执行时间: ${startTime.toLocaleString('zh-CN')}`);

  try {
    // 测试所有tab的接口
    const allResults = [];
    const tabResults = {};
    
    // 测试国内生产
    console.log('\n--- 测试国内生产接口 ---');
    const domesticResults = await testAllWssInterfaces(DOMESTIC_WSS_CONFIGS);
    domesticResults.forEach(r => {
      r.tab = '国内生产';
      allResults.push(r);
    });
    tabResults['国内生产'] = {
      total: domesticResults.length,
      success: domesticResults.filter(r => r.success).length,
      failed: domesticResults.filter(r => !r.success).length
    };
    
    // 测试HSBC
    console.log('\n--- 测试HSBC接口 ---');
    const hsbcResults = await testAllWssInterfaces(HSBC_WSS_CONFIGS);
    hsbcResults.forEach(r => {
      r.tab = 'hsbc';
      allResults.push(r);
    });
    tabResults['hsbc'] = {
      total: hsbcResults.length,
      success: hsbcResults.filter(r => r.success).length,
      failed: hsbcResults.filter(r => !r.success).length
    };
    
    // 测试HASE
    console.log('\n--- 测试HASE接口 ---');
    const haseResults = await testAllWssInterfaces(HASE_WSS_CONFIGS);
    haseResults.forEach(r => {
      r.tab = 'hase';
      allResults.push(r);
    });
    tabResults['hase'] = {
      total: haseResults.length,
      success: haseResults.filter(r => r.success).length,
      failed: haseResults.filter(r => !r.success).length
    };
    
    const endTime = new Date();
    const duration = Math.round((endTime - startTime) / 1000);
    
    const successCount = allResults.filter(r => r.success).length;
    const failCount = allResults.filter(r => !r.success).length;
    const totalCount = allResults.length;

    // 构建通知内容
    const title = 'WSS接口定时测试报告';
    let content = `**测试时间**: ${startTime.toLocaleString('zh-CN')}\n**执行时长**: ${duration}秒\n**测试接口数**: ${totalCount}个\n\n`;
    
    // 添加各tab的统计信息
    content += `### 各Tab测试统计\n`;
    Object.keys(tabResults).forEach(tab => {
      const stats = tabResults[tab];
      const successRate = stats.total > 0 ? Math.round((stats.success / stats.total) * 100) : 0;
      content += `- **${tab}**: ${stats.success}/${stats.total} 成功 (${successRate}%)\n`;
    });

    // 发送钉钉通知
    await sendDingTalkNotification(title, content, allResults);

    console.log(`========== 定时WSS测试任务完成 ==========`);
    console.log(`成功: ${successCount}, 失败: ${failCount}, 总计: ${totalCount}`);
    console.log(`各Tab统计:`, tabResults);
    
    return {
      success: true,
      results: allResults,
      tabResults: tabResults,
      summary: {
        total: totalCount,
        success: successCount,
        failed: failCount,
        duration: duration
      }
    };
  } catch (error) {
    console.error('定时WSS测试任务执行失败:', error);
    
    // 发送错误通知
    await sendDingTalkNotification(
      'WSS接口定时测试失败',
      `**错误信息**: ${error.message}\n**执行时间**: ${startTime.toLocaleString('zh-CN')}`
    );
    
    return {
      success: false,
      error: error.message
    };
  }
}

// 定时任务配置
let scheduledTask = null;

/**
 * 启动定时任务（每天早上9:20执行）
 */
function startScheduledTask() {
  // 每天早上9:20执行
  // node-cron格式: 分 时 日 月 周 (5字段格式)
  const cronExpression = '20 9 * * *'; // 每天9:20执行
  
  if (scheduledTask) {
    scheduledTask.stop();
  }

  scheduledTask = cron.schedule(cronExpression, async () => {
    await executeScheduledWssTest();
  }, {
    scheduled: true,
    timezone: 'Asia/Shanghai'
  });

  console.log('WSS定时任务已启动，将在每天早上9:20执行');
  return scheduledTask;
}

/**
 * 停止定时任务
 */
function stopScheduledTask() {
  if (scheduledTask) {
    scheduledTask.stop();
    scheduledTask = null;
    console.log('WSS定时任务已停止');
    return true;
  }
  return false;
}

/**
 * 获取定时任务状态
 */
function getScheduledTaskStatus() {
  return {
    running: scheduledTask !== null,
    nextExecution: scheduledTask ? '每天 09:20:00' : null,
    cronExpression: '20 9 * * *'
  };
}

module.exports = {
  executeScheduledWssTest,
  testAllWssInterfaces,
  testWssInterface,
  sendDingTalkNotification,
  startScheduledTask,
  stopScheduledTask,
  getScheduledTaskStatus,
  DEFAULT_WSS_CONFIGS,
  DOMESTIC_WSS_CONFIGS,
  HSBC_WSS_CONFIGS,
  HASE_WSS_CONFIGS
};

