/**
 * WSS相关路由模块
 */

module.exports = function(app) {
  const wssScheduler = require('../../wss-scheduler');

  // 手动触发WSS测试
  app.post('/api/wss/test', async (req, res) => {
    try {
      console.log('收到手动WSS测试请求');
      const result = await wssScheduler.executeScheduledWssTest();
      res.json({
        success: true,
        ...result
      });
    } catch (error) {
      console.error('手动WSS测试失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'WSS测试执行失败'
      });
    }
  });

  // 启动定时任务
  app.post('/api/wss/schedule/start', (req, res) => {
    try {
      wssScheduler.startScheduledTask();
      res.json({
        success: true,
        message: '定时任务已启动',
        status: wssScheduler.getScheduledTaskStatus()
      });
    } catch (error) {
      console.error('启动定时任务失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || '启动定时任务失败'
      });
    }
  });

  // 停止定时任务
  app.post('/api/wss/schedule/stop', (req, res) => {
    try {
      const stopped = wssScheduler.stopScheduledTask();
      res.json({
        success: true,
        message: stopped ? '定时任务已停止' : '定时任务未运行',
        status: wssScheduler.getScheduledTaskStatus()
      });
    } catch (error) {
      console.error('停止定时任务失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || '停止定时任务失败'
      });
    }
  });

  // 获取定时任务状态
  app.get('/api/wss/schedule/status', (req, res) => {
    try {
      const status = wssScheduler.getScheduledTaskStatus();
      res.json({
        success: true,
        status: status
      });
    } catch (error) {
      console.error('获取定时任务状态失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || '获取定时任务状态失败'
      });
    }
  });

  // 测试钉钉通知
  app.post('/api/wss/test-notification', async (req, res) => {
    try {
      const testResults = [
        { name: '测试接口1', success: true, message: '测试成功' },
        { name: '测试接口2', success: false, message: '测试失败', error: '连接超时' }
      ];
      
      const success = await wssScheduler.sendDingTalkNotification(
        'WSS测试通知',
        '这是一条测试通知消息',
        testResults
      );
      
      res.json({
        success: success,
        message: success ? '通知发送成功' : '通知发送失败'
      });
    } catch (error) {
      console.error('测试通知失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || '测试通知失败'
      });
    }
  });

  // 发送钉钉通知（用于立即测试）
  app.post('/api/wss/send-notification', async (req, res) => {
    try {
      const { title, testResults } = req.body;
      
      if (!title || !testResults || !Array.isArray(testResults)) {
        return res.status(400).json({
          success: false,
          error: '缺少必要参数：title 和 testResults'
        });
      }

      const startTime = new Date();

      // 构建通知内容（只包含基础信息，详细结果由sendDingTalkNotification函数自动添加）
      const content = `**测试时间**: ${startTime.toLocaleString('zh-CN')}\n`;

      const success = await wssScheduler.sendDingTalkNotification(
        title,
        content,
        testResults
      );
      
      res.json({
        success: success,
        message: success ? '通知发送成功' : '通知发送失败'
      });
    } catch (error) {
      console.error('发送钉钉通知失败:', error);
      res.status(500).json({
        success: false,
        error: error.message || '发送钉钉通知失败'
      });
    }
  });
};

