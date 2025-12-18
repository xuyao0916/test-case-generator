const fs = require('fs-extra');
const config = require('../config');

/**
 * 历史记录服务
 */

// 初始化历史记录文件
function initHistoryFile() {
  if (!fs.existsSync(config.historyFile)) {
    fs.writeFileSync(config.historyFile, JSON.stringify([]));
  }
}

// 读取历史记录
function getHistory() {
  try {
    const data = fs.readFileSync(config.historyFile, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('读取历史记录失败:', error);
    return [];
  }
}

// 保存历史记录
function saveHistory(record) {
  try {
    const history = getHistory();
    history.unshift(record);
    
    // 只保留最近10条记录
    if (history.length > 10) {
      history.splice(10);
    }
    
    fs.writeFileSync(config.historyFile, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('保存历史记录失败:', error);
  }
}

module.exports = {
  initHistoryFile,
  getHistory,
  saveHistory
};







