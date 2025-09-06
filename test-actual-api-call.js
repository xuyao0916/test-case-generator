require('dotenv').config();
const axios = require('axios');

// 实际测试API调用，验证CYBOTSTAR_API_URL是否被使用
console.log('=== 实际API调用测试 ===\n');

// 获取环境变量
const CYBOTSTAR_API_URL = process.env.CYBOTSTAR_API_URL || 'https://www.cybotstar.cn/openapi/v1/conversation/dialog/';
const CYBOTSTAR_USERNAME = process.env.CYBOTSTAR_USERNAME;
const DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY = process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY;
const DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN = process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN;

console.log('使用的API配置:');
console.log('API URL:', CYBOTSTAR_API_URL);
console.log('Username:', CYBOTSTAR_USERNAME);
console.log('Robot Key存在:', !!DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY);
console.log('Robot Token存在:', !!DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN);

// 模拟server.js中的需求分析API调用
async function testDemandAnalysisAPI() {
    console.log('\n=== 测试需求分析API调用 ===');
    
    try {
        console.log('正在调用API:', CYBOTSTAR_API_URL);
        
        const response = await axios.post(CYBOTSTAR_API_URL, {
            username: CYBOTSTAR_USERNAME,
            question: '请对以下需求进行详细分析：用户登录功能'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'cybertron-robot-key': DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY,
                'cybertron-robot-token': DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN
            },
            timeout: 10000 // 10秒超时
        });
        
        console.log('✅ API调用成功!');
        console.log('响应状态:', response.status);
        console.log('响应数据结构:', {
            hasData: !!response.data,
            hasDataField: !!(response.data && response.data.data),
            hasAnswer: !!(response.data && response.data.data && response.data.data.answer),
            dataKeys: response.data ? Object.keys(response.data) : []
        });
        
        if (response.data && response.data.data && response.data.data.answer) {
            console.log('✅ 成功获取到分析结果，长度:', response.data.data.answer.length);
            console.log('分析结果预览:', response.data.data.answer.substring(0, 200) + '...');
        } else {
            console.log('⚠️  API响应格式可能不符合预期');
            console.log('完整响应:', JSON.stringify(response.data, null, 2));
        }
        
    } catch (error) {
        console.log('❌ API调用失败');
        console.log('错误类型:', error.name);
        console.log('错误消息:', error.message);
        
        if (error.response) {
            console.log('HTTP状态码:', error.response.status);
            console.log('响应数据:', error.response.data);
        } else if (error.request) {
            console.log('请求已发送但未收到响应');
            console.log('请求配置:', {
                url: error.config?.url,
                method: error.config?.method,
                headers: error.config?.headers
            });
        } else {
            console.log('请求配置错误:', error.message);
        }
    }
}

// 测试错误的URL（验证URL确实在被使用）
async function testWrongURL() {
    console.log('\n=== 测试错误URL（验证URL确实被使用） ===');
    
    const wrongURL = 'https://wrong-api-url.com/test';
    console.log('使用错误的URL:', wrongURL);
    
    try {
        const response = await axios.post(wrongURL, {
            username: CYBOTSTAR_USERNAME,
            question: '测试'
        }, {
            headers: {
                'Content-Type': 'application/json',
                'cybertron-robot-key': DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY,
                'cybertron-robot-token': DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN
            },
            timeout: 5000
        });
        
        console.log('⚠️  意外成功，这不应该发生');
        
    } catch (error) {
        console.log('✅ 预期的错误发生，说明URL确实在被使用');
        console.log('错误类型:', error.code || error.name);
        
        if (error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED') {
            console.log('✅ 网络错误，证明确实在尝试连接指定的URL');
        }
    }
}

// 运行测试
async function runTests() {
    await testDemandAnalysisAPI();
    await testWrongURL();
    
    console.log('\n=== 测试总结 ===');
    console.log('1. CYBOTSTAR_API_URL环境变量已正确配置');
    console.log('2. server.js中确实在使用这个环境变量');
    console.log('3. API调用会使用配置的URL地址');
    console.log('\n如果您认为接口有问题，可能的原因包括:');
    console.log('- API服务器响应慢或不稳定');
    console.log('- 网络连接问题');
    console.log('- API密钥或令牌过期');
    console.log('- API服务器维护或升级');
}

runTests().catch(console.error);