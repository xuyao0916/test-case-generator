/**
 * 历史记录路由模块
 */

module.exports = function(app) {
  const fs = require('fs-extra');
  const path = require('path');
  const config = require('../config');
  const historyService = require('../services/historyService');

  // 获取历史记录
  app.get('/api/history', (req, res) => {
    try {
      const history = historyService.getHistory();
      res.json({
        success: true,
        data: history
      });
    } catch (error) {
      console.error('获取历史记录失败:', error);
      res.status(500).json({
        success: false,
        error: '获取历史记录失败'
      });
    }
  });

  // 下载生成的文件
  app.get('/api/download/:filename', async (req, res) => {
    try {
      const filename = req.params.filename;
      const filePath = path.join(config.outputDir, filename);
      
      if (await fs.pathExists(filePath)) {
        res.download(filePath, filename);
      } else {
        res.status(404).json({ error: '文件不存在' });
      }
    } catch (error) {
      console.error('下载文件失败:', error);
      res.status(500).json({ error: '下载文件失败' });
    }
  });
};







