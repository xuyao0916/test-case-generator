const axios = require('axios');
const config = require('../config');

/**
 * AI服务模块
 * 包含DeepSeek和Cybotstar API调用
 */

// 调用DeepSeek API进行格式转换
async function convertFileFormat(fileContent, fileName, description) {
  const prompt = `请将以下文件内容转换为标准的功能测试用例XMind格式。

文件名: ${fileName}
描述: ${description || '无'}

原始内容:
${fileContent}

请按照以下格式生成测试用例:

# 测试用例标题

## 测试场景1
### 用例1.1
- **用例编号**: TC-001
- **用例标题**: 具体测试内容
- **前置条件**: 测试前需要满足的条件
- **测试步骤**: 
  1. 步骤1
  2. 步骤2
  3. 步骤3
- **预期结果**: 期望的测试结果
- **优先级**: 高/中/低

请确保生成的测试用例完整、清晰，并且符合软件测试的标准格式。`;

  try {
    const response = await axios.post(config.DEEPSEEK_API_URL, {
      model: 'deepseek-chat',
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      stream: false
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`
      },
      timeout: 120000 // 2分钟超时
    });
    
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('DeepSeek API调用失败:', error.message);
    
    // 返回模拟转换结果
    return `# ${fileName} - 转换后的测试用例

## 功能测试场景

### 基本功能测试
#### TC-001: 基本功能验证
- **用例编号**: TC-001
- **用例标题**: 验证基本功能正常运行
- **前置条件**: 系统正常启动，用户已登录
- **测试步骤**: 
  1. 打开应用程序
  2. 执行基本操作
  3. 检查结果
- **预期结果**: 功能正常运行，无错误提示
- **优先级**: 高

### 异常场景测试
#### TC-002: 异常输入处理
- **用例编号**: TC-002
- **用例标题**: 验证异常输入的处理
- **前置条件**: 系统正常启动
- **测试步骤**: 
  1. 输入异常数据
  2. 提交操作
  3. 观察系统反应
- **预期结果**: 系统正确处理异常输入，给出合适提示
- **优先级**: 中

---
*注意：由于网络连接问题，当前使用本地生成的测试用例模板。请检查网络连接后重试以获得AI生成的个性化测试用例。*`;
  }
}

module.exports = {
  convertFileFormat
};

