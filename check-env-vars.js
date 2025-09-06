#!/usr/bin/env node

/**
 * 分步骤测试用例生成模块环境变量检查工具
 * 用于验证各个步骤调用接口时使用的环境变量配置
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config();

// 颜色输出函数
const colors = {
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  reset: '\x1b[0m'
};

function colorLog(color, message) {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// 环境变量配置映射
const envVarConfig = {
  // 基础配置
  basic: {
    CYBOTSTAR_API_URL: process.env.CYBOTSTAR_API_URL || 'https://www.cybotstar.cn/openapi/v1/conversation/dialog/',
    CYBOTSTAR_USERNAME: process.env.CYBOTSTAR_USERNAME,
    DEEPSEEK_API_KEY: process.env.DEEPSEEK_API_KEY,
    DEEPSEEK_API_URL: process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions'
  },
  
  // 分步骤生成各步骤使用的环境变量
  stepByStep: {
    // 步骤1：需求分析
    step1_analyze: {
      cybotstar: {
        key: process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY,
        token: process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN,
        url: process.env.CYBOTSTAR_API_URL,
        username: process.env.CYBOTSTAR_USERNAME
      },
      deepseek: {
        key: process.env.DEEPSEEK_API_KEY,
        url: process.env.DEEPSEEK_API_URL
      }
    },
    
    // 步骤2：需求补充
    step2_supplement: {
      cybotstar: {
        key: process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY,
        token: process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN,
        url: process.env.CYBOTSTAR_API_URL,
        username: process.env.CYBOTSTAR_USERNAME
      },
      deepseek: {
        key: process.env.DEEPSEEK_API_KEY,
        url: process.env.DEEPSEEK_API_URL
      }
    },
    
    // 步骤3：测试点生成
    step3_testPoints: {
      cybotstar: {
        key: process.env.CASE_GENERATION_CYBOTSTAR_ROBOT_KEY,
        token: process.env.CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN,
        url: process.env.CYBOTSTAR_API_URL,
        username: process.env.CYBOTSTAR_USERNAME
      },
      deepseek: {
        key: process.env.DEEPSEEK_API_KEY,
        url: process.env.DEEPSEEK_API_URL
      }
    },
    
    // 步骤4：最终测试用例生成
    step4_generateFinal: {
      cybotstar: {
        key: process.env.CASE_GENERATION_CYBOTSTAR_ROBOT_KEY,
        token: process.env.CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN,
        url: process.env.CYBOTSTAR_API_URL,
        username: process.env.CYBOTSTAR_USERNAME
      },
      deepseek: {
        key: process.env.DEEPSEEK_API_KEY,
        url: process.env.DEEPSEEK_API_URL
      }
    }
  }
};

// 检查环境变量是否存在
function checkEnvVar(name, value, required = true) {
  if (value) {
    colorLog('green', `✓ ${name}: ${value.substring(0, 20)}${value.length > 20 ? '...' : ''}`);
    return true;
  } else {
    if (required) {
      colorLog('red', `✗ ${name}: 未设置 (必需)`);
    } else {
      colorLog('yellow', `⚠ ${name}: 未设置 (可选)`);
    }
    return false;
  }
}

// 检查基础配置
function checkBasicConfig() {
  colorLog('cyan', '\n=== 基础配置检查 ===');
  
  let allValid = true;
  
  allValid &= checkEnvVar('CYBOTSTAR_API_URL', envVarConfig.basic.CYBOTSTAR_API_URL, false);
  allValid &= checkEnvVar('CYBOTSTAR_USERNAME', envVarConfig.basic.CYBOTSTAR_USERNAME);
  allValid &= checkEnvVar('DEEPSEEK_API_KEY', envVarConfig.basic.DEEPSEEK_API_KEY);
  allValid &= checkEnvVar('DEEPSEEK_API_URL', envVarConfig.basic.DEEPSEEK_API_URL, false);
  
  return allValid;
}

// 检查分步骤配置
function checkStepByStepConfig() {
  colorLog('cyan', '\n=== 分步骤生成配置检查 ===');
  
  const steps = [
    { name: '步骤1：需求分析', key: 'step1_analyze' },
    { name: '步骤2：需求补充', key: 'step2_supplement' },
    { name: '步骤3：测试点生成', key: 'step3_testPoints' },
    { name: '步骤4：最终测试用例生成', key: 'step4_generateFinal' }
  ];
  
  let allValid = true;
  
  steps.forEach(step => {
    colorLog('magenta', `\n--- ${step.name} ---`);
    
    const stepConfig = envVarConfig.stepByStep[step.key];
    
    // Cybotstar配置检查
    colorLog('blue', 'Cybotstar API配置:');
    const cybotstarValid = 
      checkEnvVar('  Key', stepConfig.cybotstar.key) &&
      checkEnvVar('  Token', stepConfig.cybotstar.token) &&
      checkEnvVar('  URL', stepConfig.cybotstar.url, false) &&
      checkEnvVar('  Username', stepConfig.cybotstar.username);
    
    // DeepSeek配置检查
    colorLog('blue', 'DeepSeek API配置:');
    const deepseekValid = 
      checkEnvVar('  Key', stepConfig.deepseek.key) &&
      checkEnvVar('  URL', stepConfig.deepseek.url, false);
    
    if (cybotstarValid || deepseekValid) {
      colorLog('green', `  ✓ ${step.name} 至少有一个可用的API配置`);
    } else {
      colorLog('red', `  ✗ ${step.name} 没有可用的API配置`);
      allValid = false;
    }
  });
  
  return allValid;
}

// 显示环境变量使用说明
function showUsageInfo() {
  colorLog('cyan', '\n=== 环境变量使用说明 ===');
  
  console.log(`
各步骤使用的环境变量:
`);
  
  console.log('步骤1 (需求分析):');
  console.log('  - Cybotstar: DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY, DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN');
  console.log('  - DeepSeek: DEEPSEEK_API_KEY\n');
  
  console.log('步骤2 (需求补充):');
  console.log('  - Cybotstar: DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY, DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN');
  console.log('  - DeepSeek: DEEPSEEK_API_KEY\n');
  
  console.log('步骤3 (测试点生成):');
  console.log('  - Cybotstar: CASE_GENERATION_CYBOTSTAR_ROBOT_KEY, CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN');
  console.log('  - DeepSeek: DEEPSEEK_API_KEY\n');
  
  console.log('步骤4 (最终测试用例生成):');
  console.log('  - Cybotstar: CASE_GENERATION_CYBOTSTAR_ROBOT_KEY, CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN');
  console.log('  - DeepSeek: DEEPSEEK_API_KEY\n');
  
  console.log('注意:');
  console.log('  - 步骤1和步骤2使用需求分析专用的Cybotstar配置');
  console.log('  - 步骤3和步骤4使用测试用例生成专用的Cybotstar配置');
  console.log('  - 所有步骤的DeepSeek配置都使用相同的API Key');
}

// 生成.env模板
function generateEnvTemplate() {
  const template = `# 分步骤测试用例生成环境变量配置

# 基础配置
CYBOTSTAR_API_URL=https://www.cybotstar.cn/openapi/v1/conversation/dialog/
CYBOTSTAR_USERNAME=your_username
DEEPSEEK_API_KEY=your_deepseek_api_key
DEEPSEEK_API_URL=https://api.deepseek.com/chat/completions

# 需求分析专用配置 (步骤1和步骤2)
DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY=your_demand_analysis_key
DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN=your_demand_analysis_token

# 测试用例生成专用配置 (步骤3和步骤4)
CASE_GENERATION_CYBOTSTAR_ROBOT_KEY=your_case_generation_key
CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN=your_case_generation_token

# 需求评审专用配置
DEMAND_REVIEW_CYBOTSTAR_ROBOT_KEY=your_demand_review_key
DEMAND_REVIEW_CYBOTSTAR_ROBOT_TOKEN=your_demand_review_token

# 用例评审专用配置
CASE_REVIEW_CYBOTSTAR_ROBOT_KEY=your_case_review_key
CASE_REVIEW_CYBOTSTAR_ROBOT_TOKEN=your_case_review_token
`;
  
  fs.writeFileSync('.env.template', template);
  colorLog('green', '\n✓ 已生成 .env.template 文件');
}

// 主函数
function main() {
  colorLog('cyan', '分步骤测试用例生成模块 - 环境变量检查工具');
  colorLog('cyan', '================================================');
  
  const args = process.argv.slice(2);
  
  if (args.includes('--help') || args.includes('-h')) {
    showUsageInfo();
    return;
  }
  
  if (args.includes('--template')) {
    generateEnvTemplate();
    return;
  }
  
  // 检查.env文件是否存在
  if (!fs.existsSync('.env')) {
    colorLog('yellow', '\n⚠ 未找到 .env 文件，请确保已创建并配置环境变量');
  }
  
  // 执行检查
  const basicValid = checkBasicConfig();
  const stepValid = checkStepByStepConfig();
  
  // 显示总结
  colorLog('cyan', '\n=== 检查总结 ===');
  
  if (basicValid && stepValid) {
    colorLog('green', '✓ 所有环境变量配置正确');
  } else {
    colorLog('red', '✗ 存在环境变量配置问题，请检查上述输出');
  }
  
  // 显示使用提示
  console.log('\n使用说明:');
  console.log('  node check-env-vars.js          # 检查环境变量');
  console.log('  node check-env-vars.js --help   # 显示详细说明');
  console.log('  node check-env-vars.js --template # 生成.env模板文件');
}

if (require.main === module) {
  main();
}

module.exports = {
  checkBasicConfig,
  checkStepByStepConfig,
  envVarConfig
};