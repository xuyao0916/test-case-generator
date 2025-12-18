/**
 * 测试用例生成路由模块
 * 包含：/api/generate, /api/convert-format, /api/generate-distributed
 */

module.exports = function(app) {
  const axios = require('axios');
  const fs = require('fs-extra');
  const upload = app.locals.upload;
  const config = require('../config');
  const { parseFile, parseUploadedFile } = require('../services/fileParser');
  const { generateXMindFile } = require('../services/xmindGenerator');
  const { extractTitle } = require('../utils/helpers');
  const historyService = require('../services/historyService');

  // 生成测试用例的API
  app.post('/api/generate', upload.single('file'), async (req, res) => {
    console.log('收到生成请求:', req.body);
    try {
      let inputContent = '';
      const apiProvider = req.body.apiProvider || 'cybotstar';

      if (req.file) {
        const filePath = req.file.path;
        inputContent = await parseFile(filePath, req.file.mimetype);
        await fs.remove(filePath);
      }

      if (req.body.textInput) {
        inputContent += req.body.textInput;
      }

      if (req.body.content) {
        inputContent += req.body.content;
      }

      if (!inputContent.trim()) {
        return res.status(400).json({ error: '请提供输入内容或上传文件' });
      }

      console.log(`准备调用${apiProvider}API，输入内容长度:`, inputContent.length);

      let generatedContent;

      if (apiProvider === 'deepseek') {
        try {
          const response = await axios.post(config.DEEPSEEK_API_URL, {
            model: 'deepseek-chat',
            messages: [
              {
                role: 'system',
                content: `# 测试用例设计专家
                        ## 核心要求
                        - 你是一个专业的测试用例设计专家，需要生成符合XMind格式规范的测试用例
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
                        
                        ## 示例输出格式
                        # 测试用例
                        ## 分组1
                        ### 分组2
                        #### tc-p1:用例内容
                        ##### tx:文本描述
                        （用例的文本描述）
                        ##### owner:负责人
                        （负责人信息）
                        ##### pc:前置条件
                        （前置条件内容）
                        ##### 步骤1:步骤1描述
                        ###### 结果1:步骤1对应的预期结果
                        ##### 步骤2:步骤2描述
                        ###### 结果2:步骤2对应的预期结果`
              },
              {
                role: 'user',
                content: `请为以下功能生成测试用例：\n\n${inputContent}`
              }
            ],
            stream: false
          }, {
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`
            },
            timeout: 600000
          });

          console.log('DeepSeek API调用成功');
          generatedContent = response.data.choices[0].message.content;

        } catch (apiError) {
          console.log('DeepSeek API调用失败:', apiError.message);
          throw apiError;
        }
      } else {
        try {
          const response = await axios.post(config.CYBOTSTAR_API_URL, {
            username: config.CYBOTSTAR_USERNAME,
            question: `请为以下内容生成测试用例：\n\n${inputContent}`
          }, {
            headers: {
              'Content-Type': 'application/json',
              'cybertron-robot-key': config.TEST_POINT_GENERATION_CYBOTSTAR_ROBOT_KEY,
              'cybertron-robot-token': config.TEST_POINT_GENERATION_CYBOTSTAR_ROBOT_TOKEN
            },
            timeout: 600000
          });

          console.log('Cybotstar API调用成功');
          if (response.data && response.data.data && response.data.data.answer) {
            generatedContent = response.data.data.answer;
          } else {
            generatedContent = response.data.answer || response.data.content || response.data.result;
          }

          if (!generatedContent || typeof generatedContent !== 'string') {
            console.log('警告: 无法从API响应中提取有效字符串内容，使用模拟响应');
            throw new Error('API响应中未找到有效内容');
          }

          console.log('成功提取内容，长度:', generatedContent.length);

        } catch (apiError) {
          console.log('Cybotstar API调用失败:', apiError.message);
          throw apiError;
        }
      }

      const timestamp = Date.now();
      const fileName = `test-cases-${timestamp}.xmind`;
      await generateXMindFile(generatedContent, fileName);

      const title = extractTitle(inputContent) || `测试用例-${new Date().toLocaleString('zh-CN')}`;

      const historyRecord = {
        id: timestamp,
        title: title,
        description: inputContent.substring(0, 100) + (inputContent.length > 100 ? '...' : ''),
        createTime: timestamp,
        downloadUrl: `/api/download/${fileName}`,
        fileName: fileName
      };

      historyService.saveHistory(historyRecord);

      res.json({
        success: true,
        content: generatedContent,
        downloadUrl: `/api/download/${fileName}`
      });

    } catch (error) {
      console.error('生成测试用例失败:', error.message);
      res.status(500).json({
        success: false,
        error: error.response?.data?.error?.message || error.message || '生成测试用例失败，请稍后重试'
      });
    }
  });

  // 格式转换API
  app.post('/api/convert-format', upload.single('file'), async (req, res) => {
    console.log('收到格式转换请求:', req.body);
    try {
      if (!req.file) {
        return res.status(400).json({ error: '请上传文件' });
      }
      
      const { description } = req.body;
      const filePath = req.file.path;
      const originalName = req.file.originalname;
      
      // 解析上传的文件
      const fileContent = await parseUploadedFile(filePath, originalName);
      
      // 删除临时文件
      await fs.remove(filePath);
      
      // 调用AI进行格式转换
      const { convertFileFormat } = require('../services/aiService');
      const convertedContent = await convertFileFormat(fileContent, originalName, description);
      
      // 生成XMind文件
      const timestamp = Date.now();
      const fileName = `converted-${timestamp}.xmind`;
      await generateXMindFile(convertedContent, fileName);
      
      // 生成标题
      const title = `${originalName} - 格式转换 - ${new Date().toLocaleString('zh-CN')}`;
      
      // 保存到历史记录
      const historyRecord = {
        id: timestamp,
        title: title,
        description: description || `从 ${originalName} 转换的测试用例`,
        createTime: timestamp,
        downloadUrl: `/api/download/${fileName}`,
        fileName: fileName
      };
      
      historyService.saveHistory(historyRecord);
      
      res.json({
        success: true,
        content: convertedContent,
        downloadUrl: `/api/download/${fileName}`
      });
      
    } catch (error) {
      console.error('格式转换失败:', error.message);
      console.error('错误堆栈:', error.stack);
      res.status(500).json({ 
        success: false,
        error: error.message || '格式转换失败，请稍后重试' 
      });
    }
  });

  // 分布生成 - 暂时留空，后续实现
  app.post('/api/generate-distributed', upload.single('file'), async (req, res) => {
    res.status(501).json({ error: '功能待实现' });
  });
};
