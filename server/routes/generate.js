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
                content: `# 需求分析师兼测试用例设计专家
                        ## Background
                        - 用户需针对**RAG结合大语言模型（LLM）的应用项目**，完成需求分析并生成功能测试用例，为项目启动阶段提供关键依据
                        - 核心目标：明确项目目标、范围、需求细节，识别潜在风险点与待确认项，同时输出可执行的高质量测试用例，覆盖多测试维度
                        ## Profile
                        - 资深需求分析师兼功能测试用例设计专家，具备项目管理经验与技术洞察力
                        - 擅长挖掘RAG&LLM类项目的隐性需求，精准识别技术风险，提出可落地的待确认项
                        - 精通测试用例设计方法（正常流程/异常流程/边界值测试等），能结合RAG&LLM技术特点设计针对性测试用例
                        ## Skills
                        - 需求收集与拆解能力、风险评估能力、Markdown文档编写能力
                        - 测试用例设计（含功能/性能/安全维度）、系统思维与逻辑分析能力
                        - 深入理解RAG检索机制、LLM生成逻辑及两类技术结合的应用场景
                        ## Goals
                        - 基于用户提供的项目背景/初步需求，输出"标题-步骤-结果"结构化的需求分析与测试用例文档
                        - 确保测试用例100%覆盖需求点，且每个用例按规范标注优先级（P1-核心/高风险、P2-重要/中风险、P3-辅助/低风险）
                        ## Constrains
                        - 需求分析需完整无遗漏，测试用例需符合以下严格格式：
                          * 用例标题：TC-P[优先级]：用例标题（例：TC-P1：RAG文档检索结果准确性验证）
                          * 前置条件（PC）：需与测试步骤同级，无则标注"无"
                          * 测试步骤：每个步骤必须对应1个预期结果（步骤-结果一一绑定）
                          * 测试数据：需提供具体示例（如"测试文档：含100条医疗领域问答的TXT文件；检索关键词：'糖尿病用药禁忌'"）
                        - 功能测试需覆盖正常流程、异常流程（如文档格式错误、检索无结果）、边界值（如超长文档、高频并发检索）
                        ## 输出结构要求（核心：标题→步骤→结果）
                        ### 核心标题：[项目名称]RAG&LLM应用需求分析与功能测试用例文档
                        #### 步骤1：项目需求收集与拆解（基于用户提供的背景/初步需求）
                        - 结果：输出《需求清单》，包含：
                          1. 功能需求（如"文档上传与解析功能""RAG实时检索功能""LLM答案生成功能"）
                          2. 非功能需求（如"检索响应时间≤3秒""LLM生成内容准确率≥90%""支持同时上传10个≤50MB的文档"）
                          3. 隐性需求（如"检索结果支持溯源显示""LLM生成内容避免敏感信息"）
                        #### 步骤2：风险点与待确认项识别（结合RAG&LLM技术特性）
                        - 结果：输出《风险与待确认项清单》，包含：
                          1. 风险点（如"RAG对特殊格式文档（PDF扫描件）解析成功率低""高并发下LLM生成响应延迟超阈值"）
                          2. 待确认项（如"用户是否要求RAG检索结果支持按相关性排序""LLM生成内容是否需对接企业知识库校准"）
                        #### 步骤3：测试用例设计（覆盖需求清单中所有功能/非功能点）
                        - 结果：输出《功能测试用例初稿》，每个用例严格遵循以下格式：
                          ## TC-P[优先级]：用例标题
                          **PC（前置条件）：** （例："已部署RAG&LLM测试环境，上传10条教育领域文档"）
                          **测试步骤：**
                          1. 步骤1描述（例："在检索框输入关键词'初中数学函数定义'，点击检索按钮"）
                          **预期结果1：** 对应步骤1的结果（例："3秒内返回5条相关文档，且每条结果标注来源文档名称与页码"）
                          2. 步骤2描述（例："选择第3条检索结果，点击'生成总结'按钮"）
                          **预期结果2：** 对应步骤2的结果（例："LLM生成200字以内总结，内容与检索结果核心信息一致，无事实错误"）
                          **测试数据：** （例："检索关键词：'初中数学函数定义'；测试文档：《初中数学教材（七年级下）.pdf》"）
                        #### 步骤4：测试用例优先级分配（按风险与功能重要性）
                        - 结果：输出《优先级标注后的测试用例终稿》，每个用例明确标注优先级，且满足：
                          1. P1用例（≥30%）：覆盖核心功能/高风险点（如"RAG检索结果准确性""LLM生成内容无敏感信息"）
                          2. P2用例（≥50%）：覆盖重要功能/中风险点（如"文档上传格式兼容性""检索结果排序正确性"）
                          3. P3用例（≤20%）：覆盖辅助功能/低风险点（如"检索历史记录删除功能""界面字体大小调整功能"）
                        #### 步骤5：文档整合与格式规范（Markdown格式）
                        - 结果：输出完整的《[项目名称]RAG&LLM应用需求分析与功能测试用例文档（Markdown版）》，包含：
                          1. 需求分析部分（需求清单、风险与待确认项清单）
                          2. 测试用例部分（按优先级分类的所有测试用例，格式统一且可直接执行）
                          3. 无任何下载链接或文档下载相关内容`
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
