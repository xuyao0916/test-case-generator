const express = require('express');
const cors = require('cors');
const multer = require('multer');
const fs = require('fs-extra');
const path = require('path');
const axios = require('axios');
require('dotenv').config();
const JSZip = require('jszip');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');

const app = express();
const PORT = process.env.PORT || 3001;

// 确保输出目录存在
const outputDir = path.join(__dirname, 'generated');
fs.ensureDirSync(outputDir);

// 历史记录存储文件
const historyFile = path.join(__dirname, 'history.json');

// 初始化历史记录文件
if (!fs.existsSync(historyFile)) {
  fs.writeFileSync(historyFile, JSON.stringify([]));
}

// 读取历史记录
function getHistory() {
  try {
    const data = fs.readFileSync(historyFile, 'utf8');
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
    history.unshift(record); // 添加到开头，保持最新的在前
    
    // 只保留最近10条记录
    if (history.length > 10) {
      history.splice(10);
    }
    
    fs.writeFileSync(historyFile, JSON.stringify(history, null, 2));
  } catch (error) {
    console.error('保存历史记录失败:', error);
  }
}

// 从输入内容中提取标题
function extractTitle(content) {
  if (!content) return null;
  
  // 尝试提取第一行作为标题
  const firstLine = content.split('\n')[0].trim();
  if (firstLine.length > 0 && firstLine.length <= 50) {
    return firstLine;
  }
  
  // 如果第一行太长，截取前30个字符
  if (firstLine.length > 50) {
    return firstLine.substring(0, 30) + '...';
  }
  
  return null;
}

// 文件解析函数
async function parseFile(filePath, mimetype) {
  try {
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        filePath.endsWith('.docx')) {
      // 解析Word文档
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (mimetype === 'application/msword' || filePath.endsWith('.doc')) {
      // 对于.doc文件，尝试用mammoth解析
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (mimetype === 'application/pdf' || filePath.endsWith('.pdf')) {
      // 解析PDF文档
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else {
      // 默认按文本文件处理
      return await fs.readFile(filePath, 'utf8');
    }
  } catch (error) {
    console.error('文件解析错误:', error);
    throw new Error('文件解析失败，请确保文件格式正确');
  }
}

// 生成XMind文件的函数
async function generateXMindFile(content, fileName) {
  const zip = new JSZip();
  
  // 解析测试用例内容并转换为XMind格式
  const xmindContent = convertToXMindXML(content);
  
  // 添加必要的XMind文件
  zip.file('content.xml', xmindContent);
  zip.file('META-INF/manifest.xml', `<?xml version="1.0" encoding="UTF-8"?>
<manifest xmlns="urn:xmind:xmap:xmlns:manifest:1.0">
  <file-entry full-path="content.xml" media-type="text/xml"/>
</manifest>`);
  zip.file('meta.xml', `<?xml version="1.0" encoding="UTF-8"?>
<meta xmlns="urn:xmind:xmap:xmlns:meta:2.0" version="2.0">
  <Author>Test Case Generator</Author>
  <Create-Time>${new Date().toISOString()}</Create-Time>
</meta>`);
  
  // 生成zip文件
  const buffer = await zip.generateAsync({type: 'nodebuffer'});
  const filePath = path.join(outputDir, fileName);
  await fs.writeFile(filePath, buffer);
  
  return filePath;
}

// 将测试用例内容转换为XMind XML格式
function convertToXMindXML(content) {
  const lines = content.split('\n');
  let xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<xmap-content xmlns="urn:xmind:xmap:xmlns:content:2.0" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xsi:schemaLocation="urn:xmind:xmap:xmlns:content:2.0 content.xsd" version="2.0">
  <sheet id="sheet1" theme="classic">
    <topic id="root" structure-class="org.xmind.ui.logic.right">
      <title>测试用例</title>
      <children>
        <topics type="attached">`;
  
  let topicId = 1;
  let currentLevel = 0;
  let openTopics = [];
  let pendingStepContent = '';
  let pendingExpectedContent = '';
  let isCollectingStep = false;
  let isCollectingExpected = false;
  
  function flushPendingContent() {
    if (pendingStepContent) {
      xmlContent += `\n          <topic id="topic${topicId++}">
            <title>${escapeXml(pendingStepContent)}</title>
          </topic>`;
      pendingStepContent = '';
    }
    if (pendingExpectedContent) {
      xmlContent += `\n          <topic id="topic${topicId++}">
            <title>${escapeXml(pendingExpectedContent)}</title>
          </topic>`;
      pendingExpectedContent = '';
    }
    isCollectingStep = false;
    isCollectingExpected = false;
  }
  
  for (let line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // 检测标题级别
    const hashCount = (line.match(/^#+/) || [''])[0].length;
    
    if (hashCount > 0) {
      // 先处理待处理的内容
      flushPendingContent();
      
      // 关闭之前的topic
      while (currentLevel >= hashCount) {
        if (openTopics.length > 0) {
          xmlContent += openTopics.pop();
          currentLevel--;
        } else {
          break;
        }
      }
      
      const title = trimmedLine.replace(/^#+\s*/, '');
      
      // 检查是否是步骤或预期相关的标题
      if (title.includes('步骤') && hashCount >= 4) {
        isCollectingStep = true;
        pendingStepContent = title;
        continue;
      } else if (title.includes('预期') && hashCount >= 4) {
        isCollectingExpected = true;
        pendingExpectedContent = title;
        continue;
      }
      
      xmlContent += `\n          <topic id="topic${topicId++}">
            <title>${escapeXml(title)}</title>`;
      
      if (hashCount < 6) { // 不是最深层级
        xmlContent += `\n            <children>
              <topics type="attached">`;
        openTopics.push(`\n              </topics>
            </children>
          </topic>`);
      } else {
        xmlContent += `\n          </topic>`;
      }
      
      currentLevel = hashCount;
    } else {
      // 处理非标题内容
      const cleanLine = trimmedLine.replace(/^#+\s*/, '').replace(/^[-*]\s*/, '').replace(/^\d+\.\s*/, '');
      
      if (isCollectingStep) {
        if (pendingStepContent && !pendingStepContent.includes(cleanLine)) {
          pendingStepContent += ' - ' + cleanLine;
        }
      } else if (isCollectingExpected) {
        if (pendingExpectedContent && !pendingExpectedContent.includes(cleanLine)) {
          pendingExpectedContent += ' - ' + cleanLine;
        }
      } else {
        // 普通内容直接添加
        if (trimmedLine.startsWith('**') && trimmedLine.endsWith('**')) {
          const title = trimmedLine.replace(/\*\*/g, '');
          xmlContent += `\n          <topic id="topic${topicId++}">
            <title>${escapeXml(title)}</title>
          </topic>`;
        } else if (trimmedLine.match(/^\d+\./)) {
          const title = trimmedLine.replace(/^\d+\.\s*/, '');
          xmlContent += `\n          <topic id="topic${topicId++}">
            <title>${escapeXml(title)}</title>
          </topic>`;
        } else if (trimmedLine.startsWith('-') || trimmedLine.startsWith('*')) {
          const title = trimmedLine.replace(/^[-*]\s*/, '');
          xmlContent += `\n          <topic id="topic${topicId++}">
            <title>${escapeXml(title)}</title>
          </topic>`;
        }
      }
    }
  }
  
  // 处理最后的待处理内容
  flushPendingContent();
  
  // 关闭所有打开的topics
  while (openTopics.length > 0) {
    xmlContent += openTopics.pop();
  }
  
  xmlContent += `\n        </topics>
      </children>
    </topic>
  </sheet>
</xmap-content>`;
  
  return xmlContent;
}

// XML转义函数
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// 中间件
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true })); // 添加表单数据解析
app.use(express.static('public'));

// 服务前端构建文件
app.use(express.static(path.join(__dirname, 'client/dist')));

// 配置文件上传
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = 'uploads';
    fs.ensureDirSync(uploadDir);
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// DeepSeek API配置
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;

console.log('API配置:', {
  url: DEEPSEEK_API_URL,
  keyExists: !!DEEPSEEK_API_KEY,
  keyPrefix: DEEPSEEK_API_KEY ? DEEPSEEK_API_KEY.substring(0, 10) + '...' : 'undefined'
});

// 生成测试用例的API
app.post('/api/generate', upload.single('file'), async (req, res) => {
  console.log('收到生成请求:', req.body);
  try {
    let inputContent = '';
    
    // 处理文件上传
    if (req.file) {
      const filePath = req.file.path;
      inputContent = await parseFile(filePath, req.file.mimetype);
      // 删除临时文件
      await fs.remove(filePath);
    }
    
    // 处理文本输入
    if (req.body.textInput) {
      inputContent += req.body.textInput;
    }
    
    // 处理JSON格式的content字段
    if (req.body.content) {
      inputContent += req.body.content;
    }
    
    if (!inputContent.trim()) {
      return res.status(400).json({ error: '请提供输入内容或上传文件' });
    }
    
    console.log('准备调用DeepSeek API，输入内容长度:', inputContent.length);
    
    // 临时使用模拟响应来测试功能
    let generatedContent;
    
    try {
      // 调用DeepSeek API
      const response = await axios.post(DEEPSEEK_API_URL, {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '- Role: 需求分析师兼测试用例设计专家\n- Background: 用户需要进行需求分析，并基于需求分析结果生成测试用例。这通常是在项目启动阶段的关键环节，目的是明确项目目标、范围和需求细节，同时识别潜在风险点和待确认项，并为后续的测试工作提供全面的依据。公司业务专注于RAG（Retrieval-Augmented Generation）结合大语言模型（LLM）的应用开发。\n- Profile: 你是一位资深的需求分析师兼测试用例设计专家，具备丰富的项目管理经验和敏锐的洞察力，能够深入挖掘用户需求，识别潜在风险，并提出合理的待确认项。同时，你精通测试用例设计方法，能够根据需求分析结果设计高质量的测试用例，覆盖多个测试维度。\n- Skills: 你具备需求收集、需求分析、风险评估、文档编写和测试用例设计的能力，能够运用系统思维和逻辑分析方法，确保需求分析的全面性和准确性，以及测试用例的有效性。你对RAG和LLM技术有深入的理解，能够设计出符合这些技术特点的测试用例。\n- Goals: 根据用户提供的项目背景和初步需求，进行详细的需求分析，识别潜在风险点和待确认项，并基于需求分析结果生成测试用例。测试用例应覆盖功能测试、性能测试、安全测试、兼容性测试等多个维度，确保测试的完整性和有效性。将需求分析结果和测试用例以Markdown格式输出，同时提供可下载的需求分析文档（Word、PDF、Excel、Markdown）。\n- Constrains: 需求分析应全面、准确，避免遗漏关键信息，同时确保文档格式规范，易于理解和执行。测试用例应覆盖需求分析中的所有功能点和非功能点，确保测试的完整性和有效性。\n- OutputFormat: 输出为Markdown格式的文档，包含需求分析结果和测试用例，并提供可下载的需求分析文档（Word、PDF、Excel、Markdown）。\n- Workflow:\n  1. 收集用户提供的项目背景和初步需求信息。\n  2. 进行详细的需求分析，识别潜在风险点和待确认项。\n  3. 基于需求分析结果，设计测试用例，确保测试用例覆盖功能测试、性能测试、安全测试、兼容性测试等多个维度。\n  4. 将需求分析结果和测试用例整理成Markdown格式的文档，并提供文档下载链接。\n- Examples:\n  - 例子1：项目背景：开发一款基于RAG+LLM的智能客服系统。\n    需求分析：\n    - 功能需求：\n      - 支持用户输入问题并获取准确回答。\n      - 支持从知识库中检索相关信息以增强回答质量。\n      - 支持多轮对话，能够根据上下文提供连贯的回答。\n      - 支持外部API集成，扩展知识库内容。\n    - 非功能需求：\n      - 系统应具备高可用性，响应时间不超过3秒。\n      - 系统应具备安全性，保护用户数据隐私。\n      - 支持多终端访问，包括Web和移动设备。\n    - 潜在风险点：\n      - 知识库检索的准确性可能受到数据质量的影响。\n      - 大模型生成的回答可能需要进一步优化以提高准确性。\n    - 待确认项：\n      - 是否需要支持多语言对话。\n      - 是否需要集成外部API以扩展知识库。\n    测试用例输出语法：\n    # 根节点不导入\n## 分组 1\n### 用例 1 的标题\n#### 步骤：具体操作步骤描述\n#### 预期：预期结果描述\n### 用例 2 的标题\n#### 步骤：具体操作步骤描述\n#### 预期：预期结果描述\n### 用例 3 的标题\n#### 步骤：具体操作步骤描述\n#### 预期：预期结果描述\n## 分组 2\n### 用例 4 的标题\n#### 步骤：具体操作步骤描述\n#### 预期：预期结果描述\n### 分组 3\n#### 用例 5 的标题\n##### 步骤：具体操作步骤描述\n##### 预期：预期结果描述\n#### 分组 4\n##### 用例 6 的标题\n###### 步骤：具体操作步骤描述\n###### 预期：预期结果描述'
          },
          {
            role: 'user',
            content: `请为以下内容生成测试用例：\n\n${inputContent}`
          }
        ],
        stream: false
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        timeout: 600000 // 30秒超时
      });
      
      console.log('DeepSeek API调用成功');
      generatedContent = response.data.choices[0].message.content;
      
    } catch (apiError) {
      console.log('DeepSeek API调用失败，使用模拟响应:', apiError.message);
      console.log('错误详情:', {
        code: apiError.code,
        response: apiError.response?.status,
        responseData: apiError.response?.data
      });
      
      // 使用模拟响应
      generatedContent = `# 测试用例生成结果\n\n## 功能描述\n${inputContent}\n\n## 测试用例\n\n### 测试用例1：正常功能测试\n**测试步骤：**\n1. 准备测试数据\n2. 执行功能操作\n3. 验证结果\n\n**预期结果：**\n功能正常执行，返回预期结果\n\n### 测试用例2：边界条件测试\n**测试步骤：**\n1. 使用边界值进行测试\n2. 验证系统处理\n\n**预期结果：**\n系统能正确处理边界情况\n\n### 测试用例3：异常情况测试\n**测试步骤：**\n1. 输入异常数据\n2. 观察系统响应\n\n**预期结果：**\n系统能优雅处理异常情况并给出适当提示\n\n---\n*注意：由于网络连接问题，当前使用本地生成的测试用例模板。请检查网络连接后重试以获得AI生成的个性化测试用例。*`;
    }
    
    // 保存生成的内容到XMind文件
    const timestamp = Date.now();
    const fileName = `test-cases-${timestamp}.xmind`;
    await generateXMindFile(generatedContent, fileName);
    
    // 生成标题（从内容中提取或使用默认标题）
    const title = extractTitle(inputContent) || `测试用例-${new Date().toLocaleString('zh-CN')}`;
    
    // 保存到历史记录
    const historyRecord = {
      id: timestamp,
      title: title,
      description: inputContent.substring(0, 100) + (inputContent.length > 100 ? '...' : ''),
      createTime: timestamp,
      downloadUrl: `/api/download/${fileName}`,
      fileName: fileName
    };
    
    saveHistory(historyRecord);
    
    res.json({
      success: true,
      content: generatedContent,
      downloadUrl: `/api/download/${fileName}`
    });
    
  } catch (error) {
    console.error('生成测试用例失败:', error.message);
    console.error('错误详情:', error.response?.data || error);
    res.status(500).json({ 
      success: false,
      error: error.response?.data?.error?.message || error.message || '生成测试用例失败，请稍后重试' 
    });
  }
});

// 获取历史记录
app.get('/api/history', (req, res) => {
  try {
    const history = getHistory();
    res.json({
      success: true,
      data: history
    });
  } catch (error) {
    console.error('获取历史记录失败:', error);
    res.status(500).json({
      success: false,
      error: '获取历史记录失败'
    });
  }
});

// 下载生成的文件
app.get('/api/download/:filename', async (req, res) => {
  try {
    const filename = req.params.filename;
    const filePath = path.join('generated', filename);
    
    if (await fs.pathExists(filePath)) {
      res.download(filePath, filename);
    } else {
      res.status(404).json({ error: '文件不存在' });
    }
  } catch (error) {
    console.error('下载文件失败:', error);
    res.status(500).json({ error: '下载文件失败' });
  }
});

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '测试用例生成平台运行正常' });
});

// 处理前端路由，所有非API请求都返回index.html（必须放在所有API路由之后）
app.get('*', (req, res) => {
  // 返回前端应用的index.html
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`局域网访问地址: http://你的IP地址:${PORT}`);
  console.log('请确保防火墙允许该端口的入站连接');
});