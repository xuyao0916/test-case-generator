require('dotenv').config();
const path = require('path');

module.exports = {
  // 服务器配置
  PORT: process.env.PORT || 3001,
  
  // 目录配置
  outputDir: path.join(__dirname, '../../generated'),
  uploadsDir: path.join(__dirname, '../../uploads'),
  historyFile: path.join(__dirname, '../../history.json'),
  clientDistDir: path.join(__dirname, '../../client/dist'),
  
  // Cybotstar API配置
  CYBOTSTAR_API_URL: process.env.CYBOTSTAR_API_URL || 'https://www.cybotstar.cn/openapi/v1/conversation/dialog/',
  CYBOTSTAR_USERNAME: process.env.CYBOTSTAR_USERNAME,
  
  // 需求分析专用配置
  DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY: process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY,
  DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN: process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN,
  
  // 测试用例生成专用配置
  CASE_GENERATION_CYBOTSTAR_ROBOT_KEY: process.env.CASE_GENERATION_CYBOTSTAR_ROBOT_KEY,
  CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN: process.env.CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN,
  
  // 需求评审专用配置
  DEMAND_REVIEW_CYBOTSTAR_ROBOT_KEY: process.env.DEMAND_REVIEW_CYBOTSTAR_ROBOT_KEY,
  DEMAND_REVIEW_CYBOTSTAR_ROBOT_TOKEN: process.env.DEMAND_REVIEW_CYBOTSTAR_ROBOT_TOKEN,
  
  // 用例评审专用配置
  CASE_REVIEW_CYBOTSTAR_ROBOT_KEY: process.env.CASE_REVIEW_CYBOTSTAR_ROBOT_KEY,
  CASE_REVIEW_CYBOTSTAR_ROBOT_TOKEN: process.env.CASE_REVIEW_CYBOTSTAR_ROBOT_TOKEN,
  
  // 测试点生成专用配置
  TEST_POINT_GENERATION_CYBOTSTAR_ROBOT_KEY: process.env.TEST_POINT_GENERATION_CYBOTSTAR_ROBOT_KEY,
  TEST_POINT_GENERATION_CYBOTSTAR_ROBOT_TOKEN: process.env.TEST_POINT_GENERATION_CYBOTSTAR_ROBOT_TOKEN,
  
  // DeepSeek API配置
  DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
  DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions',
  
  // 文件上传配置
  upload: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10
  }
};

