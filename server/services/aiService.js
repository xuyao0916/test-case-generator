const axios = require('axios');
const config = require('../config');

/**
 * AI服务模块
 * 包含DeepSeek和Cybotstar API调用
 */

// 调用DeepSeek API进行格式转换
async function convertFileFormat(fileContent, fileName, description) {
  const prompt = `# 测试用例格式转换专家
## 核心要求
- 你是一个专业的测试用例格式转换专家，需要将上传的文件内容转换为符合XMind格式规范的测试用例
- **重要规则**：每个测试用例必须以"tc-"开头标注（小写），例如：tc-p1:用例标题、tc-p2:用例标题
- **重要规则**：每个测试步骤必须有一个对应的预期结果，且结果节点必须是步骤节点的子节点

## 测试用例格式要求
### 用例标题格式
- 每个测试用例标题必须以"tc-"开头，格式为：tc-[优先级]:用例标题
- 优先级可以是：p1（高优先级）、p2（中优先级）、p3（低优先级）
- 示例：tc-p1:用户登录功能验证、tc-p2:输入框边界值测试

### 测试步骤和结果格式
- 每个测试步骤必须紧跟着对应的预期结果
- 格式示例：
  ## tc-p1:用户登录功能验证
  ### PC:前置条件
  （前置条件内容）
  ### 步骤1:打开登录页面
  #### 结果1:成功打开登录页面，显示用户名和密码输入框
  ### 步骤2:输入正确的用户名和密码
  #### 结果2:输入框正常显示输入内容，无错误提示
  ### 步骤3:点击登录按钮
  #### 结果3:系统验证通过，跳转到主页，显示欢迎信息

## 输出要求
- 使用Markdown格式输出
- 每个测试用例必须使用"tc-"开头
- 每个步骤后面必须有一个对应的结果节点（使用#### 结果N:格式）
- 确保步骤和结果一一对应，结果节点是步骤节点的子节点
- 可以包含分组节点来组织测试用例，但测试用例本身必须以"tc-"开头

## 需要转换的文件内容
文件名: ${fileName}
描述: ${description || '无'}

原始内容:
${fileContent}

请将以上文件内容转换为符合规范的测试用例格式。`;

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
    
    // 返回模拟转换结果（符合规范格式）
    return `# ${fileName} - 转换后的测试用例

## 功能测试场景

### 基本功能测试
#### tc-p1:基本功能验证
##### PC:前置条件
系统正常启动，用户已登录
##### 步骤1:打开应用程序
###### 结果1:应用程序成功启动，显示主界面
##### 步骤2:执行基本操作
###### 结果2:操作执行成功，无错误提示
##### 步骤3:检查结果
###### 结果3:结果显示正确，功能正常运行

### 异常场景测试
#### tc-p2:异常输入处理
##### PC:前置条件
系统正常启动
##### 步骤1:输入异常数据
###### 结果1:系统检测到异常数据，显示错误提示
##### 步骤2:提交操作
###### 结果2:系统拒绝提交，保持当前状态
##### 步骤3:观察系统反应
###### 结果3:系统正确处理异常输入，给出合适的错误提示信息

---
*注意：由于网络连接问题，当前使用本地生成的测试用例模板。请检查网络连接后重试以获得AI生成的个性化测试用例。*`;
  }
}

module.exports = {
  convertFileFormat
};







