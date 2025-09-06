require('dotenv').config();
const axios = require('axios');
const fs = require('fs-extra');

// 测试分步骤接口的环境变量使用情况
async function testStepByStepEnvVars() {
  console.log('🧪 测试分步骤接口环境变量使用情况');
  console.log('=' .repeat(50));
  
  const baseURL = 'http://localhost:3001';
  
  // 测试数据
  const testContent = '测试需求：用户登录功能';
  const testAnalysis = '## 需求分析\n\n### 功能模块\n- 用户登录模块';
  const testPoints = '## 测试点\n\n1. 用户名密码验证\n2. 登录状态保持';
  
  try {
    console.log('\n📋 测试步骤1：需求分析接口 (Cybotstar)');
    console.log('-'.repeat(40));
    
    const analyzeResponse = await axios.post(`${baseURL}/api/step-by-step/analyze`, {
      textInput: testContent,
      apiProvider: 'cybotstar'
    }, {
      timeout: 10000
    });
    
    if (analyzeResponse.data.success) {
      console.log('✅ 需求分析接口调用成功');
      console.log('📝 返回内容长度:', analyzeResponse.data.analysis?.length || 0);
    } else {
      console.log('❌ 需求分析接口调用失败');
    }
    
  } catch (error) {
    console.log('❌ 需求分析接口测试失败:', error.response?.data?.error || error.message);
  }
  
  try {
    console.log('\n📋 测试步骤2：需求补充接口 (Cybotstar)');
    console.log('-'.repeat(40));
    
    const supplementResponse = await axios.post(`${baseURL}/api/step-by-step/supplement`, {
      originalAnalysis: testAnalysis,
      supplementText: '补充：需要支持手机号登录',
      apiProvider: 'cybotstar'
    }, {
      timeout: 10000
    });
    
    if (supplementResponse.data.success) {
      console.log('✅ 需求补充接口调用成功');
      console.log('📝 返回内容长度:', supplementResponse.data.updatedAnalysis?.length || 0);
    } else {
      console.log('❌ 需求补充接口调用失败');
    }
    
  } catch (error) {
    console.log('❌ 需求补充接口测试失败:', error.response?.data?.error || error.message);
  }
  
  try {
    console.log('\n📋 测试步骤4：最终测试用例生成接口 (Cybotstar)');
    console.log('-'.repeat(40));
    
    const generateResponse = await axios.post(`${baseURL}/api/step-by-step/generate-final`, {
      analysisContent: testAnalysis,
      testPoints: testPoints,
      apiProvider: 'cybotstar'
    }, {
      timeout: 15000
    });
    
    if (generateResponse.data.success) {
      console.log('✅ 最终测试用例生成接口调用成功');
      console.log('📝 返回内容长度:', generateResponse.data.testCases?.length || 0);
      console.log('📁 生成文件:', generateResponse.data.filename || '无');
    } else {
      console.log('❌ 最终测试用例生成接口调用失败');
    }
    
  } catch (error) {
    console.log('❌ 最终测试用例生成接口测试失败:', error.response?.data?.error || error.message);
  }
  
  console.log('\n🔍 环境变量检查:');
  console.log('-'.repeat(40));
  console.log('DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY:', process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY ? '✅ 已设置' : '❌ 未设置');
  console.log('DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN:', process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN ? '✅ 已设置' : '❌ 未设置');
  console.log('CASE_GENERATION_CYBOTSTAR_ROBOT_KEY:', process.env.CASE_GENERATION_CYBOTSTAR_ROBOT_KEY ? '✅ 已设置' : '❌ 未设置');
  console.log('CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN:', process.env.CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN ? '✅ 已设置' : '❌ 未设置');
  
  console.log('\n✨ 测试完成!');
}

// 运行测试
if (require.main === module) {
  testStepByStepEnvVars().catch(console.error);
}

module.exports = { testStepByStepEnvVars };