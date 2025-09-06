require('dotenv').config();
const axios = require('axios');

// 测试CYBOTSTAR_API_URL环境变量的使用
console.log('=== 测试CYBOTSTAR_API_URL环境变量使用情况 ===\n');

// 检查环境变量
console.log('环境变量检查:');
console.log('CYBOTSTAR_API_URL:', process.env.CYBOTSTAR_API_URL);
console.log('CYBOTSTAR_USERNAME:', process.env.CYBOTSTAR_USERNAME);
console.log('DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY存在:', !!process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY);
console.log('DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN存在:', !!process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN);

// 模拟server.js中的API URL配置
const CYBOTSTAR_API_URL = process.env.CYBOTSTAR_API_URL || 'https://www.cybotstar.cn/openapi/v1/conversation/dialog/';
const CYBOTSTAR_USERNAME = process.env.CYBOTSTAR_USERNAME;
const DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY = process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY;
const DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN = process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN;

console.log('\n=== 实际使用的配置 ===');
console.log('API URL:', CYBOTSTAR_API_URL);
console.log('Username:', CYBOTSTAR_USERNAME);
console.log('Robot Key存在:', !!DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY);
console.log('Robot Token存在:', !!DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN);

// 测试API调用（不实际发送请求，只检查配置）
console.log('\n=== API调用配置测试 ===');

if (!CYBOTSTAR_API_URL) {
    console.log('❌ CYBOTSTAR_API_URL 未配置');
} else {
    console.log('✅ CYBOTSTAR_API_URL 已配置:', CYBOTSTAR_API_URL);
}

if (!CYBOTSTAR_USERNAME) {
    console.log('❌ CYBOTSTAR_USERNAME 未配置');
} else {
    console.log('✅ CYBOTSTAR_USERNAME 已配置:', CYBOTSTAR_USERNAME);
}

if (!DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY) {
    console.log('❌ DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY 未配置');
} else {
    console.log('✅ DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY 已配置');
}

if (!DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN) {
    console.log('❌ DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN 未配置');
} else {
    console.log('✅ DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN 已配置');
}

// 模拟API请求配置（不实际发送）
const requestConfig = {
    url: CYBOTSTAR_API_URL,
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'cybertron-robot-key': DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY,
        'cybertron-robot-token': DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN
    },
    data: {
        username: CYBOTSTAR_USERNAME,
        question: '测试问题'
    }
};

console.log('\n=== 模拟请求配置 ===');
console.log('请求URL:', requestConfig.url);
console.log('请求方法:', requestConfig.method);
console.log('请求头:', {
    'Content-Type': requestConfig.headers['Content-Type'],
    'cybertron-robot-key': requestConfig.headers['cybertron-robot-key'] ? '已设置' : '未设置',
    'cybertron-robot-token': requestConfig.headers['cybertron-robot-token'] ? '已设置' : '未设置'
});
console.log('请求数据:', requestConfig.data);

console.log('\n=== 结论 ===');
if (CYBOTSTAR_API_URL && CYBOTSTAR_USERNAME && DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY && DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN) {
    console.log('✅ 所有必需的环境变量都已正确配置，API URL会被正确使用');
} else {
    console.log('❌ 部分环境变量未配置，可能影响API调用');
}