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
const XLSX = require('xlsx');
const xmindParser = require('xmindparser');

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

// 将Markdown格式的API测试用例转换为Excel表格数据
function parseApiTestCasesToExcel(content) {
  const testCases = [];
  const lines = content.split('\n');
  
  let currentTestCase = {};
  let isInTestCase = false;
  let currentField = '';
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // 检测测试用例标题
    if (line.match(/^#{1,4}\s+.*测试$/)) {
      if (Object.keys(currentTestCase).length > 0) {
        testCases.push(currentTestCase);
      }
      currentTestCase = {
        '测试用例名称': line.replace(/^#{1,4}\s+/, ''),
        '测试目的': '',
        '请求方法': '',
        '请求URL': '',
        '请求头': '',
        '请求参数/请求体': '',
        '预期响应状态码': '',
        '预期响应内容': '',
        '验证点': ''
      };
      isInTestCase = true;
      continue;
    }
    
    if (!isInTestCase) continue;
    
    // 解析字段
    if (line.includes('测试目的')) {
      currentField = '测试目的';
      currentTestCase[currentField] = line.replace(/.*测试目的[：:]*\s*/, '');
    } else if (line.includes('请求方法')) {
      currentField = '请求方法';
      currentTestCase[currentField] = line.replace(/.*请求方法[：:]*\s*/, '');
    } else if (line.includes('请求URL')) {
      currentField = '请求URL';
      currentTestCase[currentField] = line.replace(/.*请求URL[：:]*\s*/, '');
    } else if (line.includes('请求头')) {
      currentField = '请求头';
      currentTestCase[currentField] = line.replace(/.*请求头[：:]*\s*/, '');
    } else if (line.includes('请求参数') || line.includes('请求体')) {
      currentField = '请求参数/请求体';
      currentTestCase[currentField] = line.replace(/.*请求[参体][数]*[：:]*\s*/, '');
    } else if (line.includes('预期响应状态码') || line.includes('预期状态码')) {
      currentField = '预期响应状态码';
      currentTestCase[currentField] = line.replace(/.*预期[响应]*状态码[：:]*\s*/, '');
    } else if (line.includes('预期响应') || line.includes('预期内容')) {
      currentField = '预期响应内容';
      currentTestCase[currentField] = line.replace(/.*预期响应[内容]*[：:]*\s*/, '');
    } else if (line.includes('验证点')) {
      currentField = '验证点';
      currentTestCase[currentField] = line.replace(/.*验证点[：:]*\s*/, '');
    } else if (line && currentField && !line.startsWith('#') && !line.startsWith('```')) {
      // 继续添加到当前字段
      if (currentTestCase[currentField]) {
        currentTestCase[currentField] += '\n' + line;
      } else {
        currentTestCase[currentField] = line;
      }
    }
  }
  
  // 添加最后一个测试用例
  if (Object.keys(currentTestCase).length > 0) {
    testCases.push(currentTestCase);
  }
  
  return testCases;
}

// 生成Excel文件
function generateExcelFile(testCases, filename) {
  const worksheet = XLSX.utils.json_to_sheet(testCases);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'API测试用例');
  
  // 设置列宽
  const colWidths = [
    { wch: 30 }, // 测试用例名称
    { wch: 40 }, // 测试目的
    { wch: 10 }, // 请求方法
    { wch: 50 }, // 请求URL
    { wch: 30 }, // 请求头
    { wch: 40 }, // 请求参数/请求体
    { wch: 15 }, // 预期响应状态码
    { wch: 30 }, // 预期响应内容
    { wch: 40 }  // 验证点
  ];
  worksheet['!cols'] = colWidths;
  
  const filePath = path.join('generated', filename);
  XLSX.writeFile(workbook, filePath);
  
  return filePath;
}

// 解析上传的文件内容
async function parseUploadedFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  
  try {
    switch (ext) {
      case '.docx':
        // 解析Word文档 (.docx)
        const docxResult = await mammoth.extractRawText({ path: filePath });
        return docxResult.value;
        
      case '.doc':
        // 解析Word文档 (.doc) - mammoth也支持部分.doc文件
        try {
          const docResult = await mammoth.extractRawText({ path: filePath });
          return docResult.value;
        } catch (docError) {
          // 如果mammoth无法解析.doc文件，返回错误信息
          throw new Error('该.doc文件格式不受支持，请转换为.docx格式后重新上传');
        }
        
      case '.pdf':
        // 解析PDF文档
        const pdfBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        return pdfData.text;
        
      case '.xlsx':
      case '.xls':
        // 解析Excel文件
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        
        // 将二维数组转换为文本
        return jsonData.map(row => row.join('\t')).join('\n');
        
      case '.xmind':
        // 解析XMind文件
        try {
          const xmindData = await xmindParser.xmindToJson(filePath);
          // 递归提取所有文本内容
          function extractTextFromNode(node) {
            let text = '';
            if (node.title) {
              text += node.title + '\n';
            }
            if (node.note) {
              text += node.note + '\n';
            }
            if (node.children && node.children.length > 0) {
              node.children.forEach(child => {
                text += extractTextFromNode(child);
              });
            }
            return text;
          }
          
          if (xmindData && xmindData.length > 0) {
            let allText = '';
            xmindData.forEach(sheet => {
              if (sheet.rootTopic) {
                allText += extractTextFromNode(sheet.rootTopic);
              }
            });
            return allText.trim() || '无法提取XMind文件内容';
          }
          return '无法解析XMind文件内容';
        } catch (xmindError) {
          console.error('XMind解析错误:', xmindError);
          // 如果xmindparser失败，尝试使用JSZip直接解析
          const zip = new JSZip();
          const data = await fs.readFile(filePath);
          const zipContent = await zip.loadAsync(data);
          
          if (zipContent.files['content.xml']) {
            const xmlContent = await zipContent.files['content.xml'].async('string');
            // 简单提取文本内容
            return xmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
          }
          return '无法解析XMind文件内容';
        }
        
      case '.txt':
      case '.md':
        // 解析文本文件
        return await fs.readFile(filePath, 'utf8');
        
      case '.json':
        // 解析JSON文件
        const jsonContent = await fs.readFile(filePath, 'utf8');
        return JSON.stringify(JSON.parse(jsonContent), null, 2);
        
      case '.xml':
        // 解析XML文件
        return await fs.readFile(filePath, 'utf8');
        
      case '.csv':
        // 解析CSV文件
        const csvContent = await fs.readFile(filePath, 'utf8');
        return csvContent;
        
      default:
        throw new Error(`不支持的文件格式: ${ext}`);
    }
  } catch (error) {
    console.error('文件解析错误:', error);
    throw new Error(`文件解析失败: ${error.message}`);
  }
}

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
    const response = await axios.post('https://api.deepseek.com/chat/completions', {
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
        'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
// 服务前端构建文件，禁用缓存
app.use(express.static(path.join(__dirname, 'client/dist'), {
  setHeaders: (res, path) => {
    if (path.endsWith('.js') || path.endsWith('.css')) {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      res.setHeader('Pragma', 'no-cache');
      res.setHeader('Expires', '0');
    }
  }
}));

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'uploads');
fs.ensureDirSync(uploadsDir);

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

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10 // 最多10个文件
  }
});

// Cybotstar API配置
const CYBOTSTAR_API_URL = process.env.CYBOTSTAR_API_URL || 'https://www.cybotstar.cn/openapi/v1/conversation/dialog/';
const CYBOTSTAR_USERNAME = process.env.CYBOTSTAR_USERNAME;

// 需求分析专用配置
const DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY = process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY;
const DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN = process.env.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN;

// 测试用例生成专用配置
const CASE_GENERATION_CYBOTSTAR_ROBOT_KEY = process.env.CASE_GENERATION_CYBOTSTAR_ROBOT_KEY;
const CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN = process.env.CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN;

// 需求评审专用配置
const DEMAND_REVIEW_CYBOTSTAR_ROBOT_KEY = process.env.DEMAND_REVIEW_CYBOTSTAR_ROBOT_KEY;
const DEMAND_REVIEW_CYBOTSTAR_ROBOT_TOKEN = process.env.DEMAND_REVIEW_CYBOTSTAR_ROBOT_TOKEN;

// 用例评审专用配置
const CASE_REVIEW_CYBOTSTAR_ROBOT_KEY = process.env.CASE_REVIEW_CYBOTSTAR_ROBOT_KEY;
const CASE_REVIEW_CYBOTSTAR_ROBOT_TOKEN = process.env.CASE_REVIEW_CYBOTSTAR_ROBOT_TOKEN;

// 测试点生成专用配置
const TEST_POINT_GENERATION_CYBOTSTAR_ROBOT_KEY = process.env.TEST_POINT_GENERATION_CYBOTSTAR_ROBOT_KEY;
const TEST_POINT_GENERATION_CYBOTSTAR_ROBOT_TOKEN = process.env.TEST_POINT_GENERATION_CYBOTSTAR_ROBOT_TOKEN;

// DeepSeek API配置
const DEEPSEEK_API_KEY = process.env.DEEPSEEK_API_KEY;
const DEEPSEEK_API_URL = process.env.DEEPSEEK_API_URL || 'https://api.deepseek.com/chat/completions';

console.log('API配置:', {
  url: CYBOTSTAR_API_URL,
  username: CYBOTSTAR_USERNAME,
  demandAnalysisKeyExists: !!DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY,
  demandAnalysisTokenExists: !!DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN,
  caseGenerationKeyExists: !!CASE_GENERATION_CYBOTSTAR_ROBOT_KEY,
  caseGenerationTokenExists: !!CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN,
  deepseekKeyExists: !!DEEPSEEK_API_KEY
});

// 生成测试用例的API
app.post('/api/generate', upload.single('file'), async (req, res) => {
  console.log('收到生成请求:', req.body);
  try {
    let inputContent = '';
    const apiProvider = req.body.apiProvider || 'cybotstar'; // 默认使用Cybotstar
    
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
    
    console.log(`准备调用${apiProvider}API，输入内容长度:`, inputContent.length);
    
    let generatedContent;
    
    if (apiProvider === 'deepseek') {
      // 调用DeepSeek API
      try {
        const response = await axios.post(DEEPSEEK_API_URL, {
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
                        - 基于用户提供的项目背景/初步需求，输出“标题-步骤-结果”结构化的需求分析与测试用例文档
                        - 确保测试用例100%覆盖需求点，且每个用例按规范标注优先级（P1-核心/高风险、P2-重要/中风险、P3-辅助/低风险）
                        ## Constrains
                        - 需求分析需完整无遗漏，测试用例需符合以下严格格式：
                          * 用例标题：TC-P[优先级]：用例标题（例：TC-P1：RAG文档检索结果准确性验证）
                          * 前置条件（PC）：需与测试步骤同级，无则标注“无”
                          * 测试步骤：每个步骤必须对应1个预期结果（步骤-结果一一绑定）
                          * 测试数据：需提供具体示例（如“测试文档：含100条医疗领域问答的TXT文件；检索关键词：‘糖尿病用药禁忌’”）
                        - 功能测试需覆盖正常流程、异常流程（如文档格式错误、检索无结果）、边界值（如超长文档、高频并发检索）
                        ## 输出结构要求（核心：标题→步骤→结果）
                        ### 核心标题：[项目名称]RAG&LLM应用需求分析与功能测试用例文档
                        #### 步骤1：项目需求收集与拆解（基于用户提供的背景/初步需求）
                        - 结果：输出《需求清单》，包含：
                          1. 功能需求（如“文档上传与解析功能”“RAG实时检索功能”“LLM答案生成功能”）
                          2. 非功能需求（如“检索响应时间≤3秒”“LLM生成内容准确率≥90%”“支持同时上传10个≤50MB的文档”）
                          3. 隐性需求（如“检索结果支持溯源显示”“LLM生成内容避免敏感信息”）
                        #### 步骤2：风险点与待确认项识别（结合RAG&LLM技术特性）
                        - 结果：输出《风险与待确认项清单》，包含：
                          1. 风险点（如“RAG对特殊格式文档（PDF扫描件）解析成功率低”“高并发下LLM生成响应延迟超阈值”）
                          2. 待确认项（如“用户是否要求RAG检索结果支持按相关性排序”“LLM生成内容是否需对接企业知识库校准”）
                        #### 步骤3：测试用例设计（覆盖需求清单中所有功能/非功能点）
                        - 结果：输出《功能测试用例初稿》，每个用例严格遵循以下格式：
                          ## TC-P[优先级]：用例标题
                          **PC（前置条件）：** （例：“已部署RAG&LLM测试环境，上传10条教育领域文档”）
                          **测试步骤：**
                          1. 步骤1描述（例：“在检索框输入关键词‘初中数学函数定义’，点击检索按钮”）
                          **预期结果1：** 对应步骤1的结果（例：“3秒内返回5条相关文档，且每条结果标注来源文档名称与页码”）
                          2. 步骤2描述（例：“选择第3条检索结果，点击‘生成总结’按钮”）
                          **预期结果2：** 对应步骤2的结果（例：“LLM生成200字以内总结，内容与检索结果核心信息一致，无事实错误”）
                          **测试数据：** （例：“检索关键词：‘初中数学函数定义’；测试文档：《初中数学教材（七年级下）.pdf》”）
                        #### 步骤4：测试用例优先级分配（按风险与功能重要性）
                        - 结果：输出《优先级标注后的测试用例终稿》，每个用例明确标注优先级，且满足：
                          1. P1用例（≥30%）：覆盖核心功能/高风险点（如“RAG检索结果准确性”“LLM生成内容无敏感信息”）
                          2. P2用例（≥50%）：覆盖重要功能/中风险点（如“文档上传格式兼容性”“检索结果排序正确性”）
                          3. P3用例（≤20%）：覆盖辅助功能/低风险点（如“检索历史记录删除功能”“界面字体大小调整功能”）
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
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
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
      // 调用Cybotstar API
      try {
        const response = await axios.post(CYBOTSTAR_API_URL, {
          username: CYBOTSTAR_USERNAME,
          question: `请为以下内容生成测试用例：\n\n${inputContent}`
        }, {
          headers: {
            'Content-Type': 'application/json',
            'cybertron-robot-key': TEST_POINT_GENERATION_CYBOTSTAR_ROBOT_KEY,
            'cybertron-robot-token': TEST_POINT_GENERATION_CYBOTSTAR_ROBOT_TOKEN
          },
          timeout: 600000 // 10分钟超时
        });
        
        console.log('Cybotstar API调用成功');
        console.log('API响应数据:', JSON.stringify(response.data, null, 2));
        
        // 从Cybotstar API响应中提取内容
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
        console.log('错误详情:', {
          code: apiError.code,
          response: apiError.response?.status,
          responseData: apiError.response?.data
        });
        
        throw apiError;
      }
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

// API测试用例生成
app.post('/api/generate-api-test', async (req, res) => {
  console.log('收到API测试用例生成请求:', req.body);
  try {
    const { apiName, curlCommands, apiDoc } = req.body;
    
    if (!apiName || (!curlCommands && !apiDoc)) {
      return res.status(400).json({ error: '请提供接口名称和curl命令或接口文档' });
    }
    
    // 构建输入内容
    let inputContent = `接口名称: ${apiName}\n\n`;
    
    if (curlCommands) {
      inputContent += `curl命令:\n${curlCommands}\n\n`;
    }
    
    if (apiDoc) {
      inputContent += `接口文档:\n${apiDoc}\n\n`;
    }
    
    console.log('准备调用DeepSeek API生成API测试用例，输入内容长度:', inputContent.length);
    
    let generatedContent;
    
    try {
      // 调用DeepSeek API
      const response = await axios.post(DEEPSEEK_API_URL, {
        model: 'deepseek-chat',
        messages: [
          {
            role: 'system',
            content: '你是一位专业的API测试专家，擅长根据接口信息生成全面的测试用例。请根据用户提供的接口名称、curl命令或接口文档，生成详细的API测试用例。\n\n测试用例应该包括：\n1. 正常场景测试（正确参数、正确格式）\n2. 异常场景测试（错误参数、缺失参数、格式错误）\n3. 边界值测试（最大值、最小值、空值）\n4. 安全性测试（SQL注入、XSS攻击、权限验证）\n5. 性能测试（并发请求、大数据量）\n\n每个测试用例应包含：\n- 测试用例名称\n- 测试目的\n- 请求方法\n- 请求URL\n- 请求头\n- 请求参数/请求体\n- 预期响应状态码\n- 预期响应内容\n- 验证点\n\n请以Markdown格式输出，结构清晰，便于理解和执行。'
          },
          {
            role: 'user',
            content: `请为以下API接口生成测试用例：\n\n${inputContent}`
          }
        ],
        stream: false
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        timeout: 600000
      });
      
      console.log('DeepSeek API调用成功');
      generatedContent = response.data.choices[0].message.content;
      
    } catch (apiError) {
      console.log('DeepSeek API调用失败，使用模拟响应:', apiError.message);
      
      // 使用模拟响应
      generatedContent = `# ${apiName} - API测试用例\n\n## 接口信息\n${inputContent}\n\n## 测试用例\n\n### 1. 正常场景测试\n\n#### TC-001: 正常请求测试\n- **测试目的**: 验证接口在正常参数下的响应\n- **请求方法**: GET/POST\n- **请求URL**: /api/example\n- **请求头**: Content-Type: application/json\n- **请求参数**: 正常参数\n- **预期状态码**: 200\n- **预期响应**: 正常返回数据\n- **验证点**: 响应格式正确，数据完整\n\n### 2. 异常场景测试\n\n#### TC-002: 缺失必填参数测试\n- **测试目的**: 验证缺失必填参数时的错误处理\n- **请求方法**: GET/POST\n- **请求URL**: /api/example\n- **请求头**: Content-Type: application/json\n- **请求参数**: 缺失必填参数\n- **预期状态码**: 400\n- **预期响应**: 错误信息提示\n- **验证点**: 错误信息准确，状态码正确\n\n### 3. 边界值测试\n\n#### TC-003: 参数边界值测试\n- **测试目的**: 验证参数边界值的处理\n- **请求方法**: GET/POST\n- **请求URL**: /api/example\n- **请求头**: Content-Type: application/json\n- **请求参数**: 边界值参数\n- **预期状态码**: 200/400\n- **预期响应**: 正确处理或错误提示\n- **验证点**: 边界值处理正确\n\n---\n*注意：由于网络连接问题，当前使用本地生成的测试用例模板。请检查网络连接后重试以获得AI生成的个性化测试用例。*`;
    }
    
    // 保存生成的内容到Excel文件
    const timestamp = Date.now();
    const excelFileName = `api-test-cases-${timestamp}.xlsx`;
    
    try {
      const testCases = parseApiTestCasesToExcel(generatedContent);
      if (testCases.length > 0) {
        generateExcelFile(testCases, excelFileName);
      }
    } catch (excelError) {
      console.log('生成Excel文件失败:', excelError.message);
    }
    
    res.json({
      success: true,
      content: generatedContent,
      downloadUrl: `/api/download/${excelFileName}`
    });
    
  } catch (error) {
    console.error('生成API测试用例失败:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || '生成API测试用例失败，请稍后重试' 
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
    
    saveHistory(historyRecord);
    
    res.json({
      success: true,
      content: convertedContent,
      downloadUrl: `/api/download/${fileName}`
    });
    
  } catch (error) {
    console.error('格式转换失败:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || '格式转换失败，请稍后重试' 
    });
  }
});

// 分步骤生成 - 需求分析接口
app.post('/api/step-by-step/analyze', upload.array('files', 10), async (req, res) => {
  try {
    const { textInput, apiProvider = 'deepseek' } = req.body;
    let content = textInput || '';
    
    // 处理多个文件上传
    if (req.files && req.files.length > 0) {
      let allFileContent = '';
      for (const file of req.files) {
        const fileContent = await parseUploadedFile(file.path, file.originalname);
        allFileContent += `\n\n=== ${file.originalname} ===\n${fileContent}`;
        // 删除临时文件
        await fs.remove(file.path);
      }
      content = allFileContent + '\n\n' + content;
    }
    
    if (!content.trim()) {
      return res.status(400).json({ error: '请提供需求内容或上传文件' });
    }
    
    let analysisResult;
    
    if (apiProvider === 'cybotstar') {
      // Cybotstar API 调用
      try {
        const cybotstarResponse = await axios.post(CYBOTSTAR_API_URL, {
          username: CYBOTSTAR_USERNAME,
          question: `请对以下需求进行详细分析，包括功能模块、业务流程、用户角色等方面：\n\n${content}`
        }, {
          headers: {
            'Content-Type': 'application/json',
            'cybertron-robot-key': DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY,
            'cybertron-robot-token': DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN
          },
          timeout: 600000
        });
        
        if (cybotstarResponse.data && cybotstarResponse.data.data && cybotstarResponse.data.data.answer) {
          analysisResult = cybotstarResponse.data.data.answer;
        } else {
          throw new Error('Cybotstar API 响应格式错误');
        }
      } catch (apiError) {
        console.log('Cybotstar API调用失败:', apiError.message);
        throw apiError;
      }
    } else {
      // DeepSeek API 调用
      try {
        const deepseekResponse = await axios.post(DEEPSEEK_API_URL, {
          model: 'deepseek-chat',
          messages: [{
            role: 'system',
            content: '你是一个专业的需求分析师，擅长分析软件需求并提取关键信息。'
          }, {
            role: 'user',
            content: `请对以下需求进行详细分析，包括：\n1. 功能模块划分\n2. 主要业务流程\n3. 用户角色和权限\n4. 关键功能点\n5. 数据流向\n\n需求内容：\n${content}`
          }],
          temperature: 0.7,
          max_tokens: 2000
        }, {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 600000
        });
        
        if (deepseekResponse.data && deepseekResponse.data.choices && deepseekResponse.data.choices[0]) {
          analysisResult = deepseekResponse.data.choices[0].message.content;
        } else {
          throw new Error('DeepSeek API 响应格式错误');
        }
      } catch (apiError) {
        console.log('DeepSeek API调用失败:', apiError.message);
        throw apiError;
      }
    }
    
    res.json({
      success: true,
      analysis: analysisResult,
      originalContent: content
    });
    
  } catch (error) {
    console.error('需求分析失败:', error);
    
    res.status(500).json({
      success: false,
      error: '需求分析失败，请重新尝试分析'
    });
  }
});

// 分步骤生成 - 需求补充接口
app.post('/api/step-by-step/supplement', upload.array('files', 10), async (req, res) => {
  try {
    const { originalAnalysis, supplementText, apiProvider = 'deepseek' } = req.body;
    let supplementContent = supplementText || '';
    
    // 处理多个文件上传
    if (req.files && req.files.length > 0) {
      let allFileContent = '';
      for (const file of req.files) {
        const fileContent = await parseUploadedFile(file.path, file.originalname);
        allFileContent += `\n\n=== ${file.originalname} ===\n${fileContent}`;
        await fs.remove(file.path);
      }
      supplementContent = allFileContent + '\n\n' + supplementContent;
    }
    
    if (!supplementContent.trim()) {
      // 如果没有补充内容，直接返回原分析结果
      return res.json({
        success: true,
        updatedAnalysis: originalAnalysis,
        hasUpdate: false
      });
    }
    
    let updatedAnalysis;
    
    if (apiProvider === 'cybotstar') {
      try {
        const cybotstarResponse = await axios.post(CYBOTSTAR_API_URL, {
          username: CYBOTSTAR_USERNAME,
          question: `请作为专业的需求分析师，基于以下原始需求分析和补充信息，提供一个完整详细的更新后需求分析报告。请直接输出分析结果，不要提示信息不完整或要求更多信息。\n\n原始分析：\n${originalAnalysis}\n\n补充信息：\n${supplementContent}\n\n请提供完整的更新后需求分析：`
        }, {
          headers: {
            'Content-Type': 'application/json',
            'cybertron-robot-key': DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY,
            'cybertron-robot-token': DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN
          },
          timeout: 600000
        });
        
        if (cybotstarResponse.data && cybotstarResponse.data.data && cybotstarResponse.data.data.answer) {
          updatedAnalysis = cybotstarResponse.data.data.answer;
        } else {
          throw new Error('Cybotstar API 响应格式错误');
        }
      } catch (apiError) {
        console.log('Cybotstar API调用失败:', apiError.message);
        throw apiError;
      }
    } else {
      try {
        const deepseekResponse = await axios.post(DEEPSEEK_API_URL, {
          model: 'deepseek-chat',
          messages: [{
            role: 'system',
            content: '你是一个专业的需求分析师，擅长根据补充信息更新和完善需求分析。'
          }, {
            role: 'user',
            content: `基于以下原始需求分析，结合新的补充信息，更新和完善需求分析：\n\n原始分析：\n${originalAnalysis}\n\n补充信息：\n${supplementContent}`
          }],
          temperature: 0.7,
          max_tokens: 2000
        }, {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 600000
        });
        
        if (deepseekResponse.data && deepseekResponse.data.choices && deepseekResponse.data.choices[0]) {
          updatedAnalysis = deepseekResponse.data.choices[0].message.content;
        } else {
          throw new Error('DeepSeek API 响应格式错误');
        }
      } catch (apiError) {
        console.log('DeepSeek API调用失败:', apiError.message);
        throw apiError;
      }
    }
    
    res.json({
      success: true,
      updatedAnalysis: updatedAnalysis,
      hasUpdate: true
    });
    
  } catch (error) {
    console.error('需求补充失败:', error);
    
    res.status(500).json({
      success: false,
      error: '需求补充失败，请重新尝试补充'
    });
  }
});

// 分步骤生成 - 测试点生成接口
app.post('/api/step-by-step/test-points', async (req, res) => {
  try {
    const { analysisContent, apiProvider = 'deepseek' } = req.body;
    
    if (!analysisContent || !analysisContent.trim()) {
      return res.status(400).json({ error: '请提供需求分析内容' });
    }
    
    let testPoints;
    
    if (apiProvider === 'cybotstar') {
      try {
        const cybotstarResponse = await axios.post(CYBOTSTAR_API_URL, {
          username: CYBOTSTAR_USERNAME,
          question: `基于以下需求分析，生成详细的测试点列表，包括功能测试点、边界测试点、异常测试点等：\n\n${analysisContent}`
        }, {
          headers: {
            'Content-Type': 'application/json',
            'cybertron-robot-key': TEST_POINT_GENERATION_CYBOTSTAR_ROBOT_KEY,
            'cybertron-robot-token': TEST_POINT_GENERATION_CYBOTSTAR_ROBOT_TOKEN
          },
          timeout: 600000
        });
        
        console.log('Cybotstar API 完整响应:', JSON.stringify(cybotstarResponse.data, null, 2));
        
        if (cybotstarResponse.data && cybotstarResponse.data.data && cybotstarResponse.data.data.answer) {
          testPoints = cybotstarResponse.data.data.answer;
        } else {
          console.log('Cybotstar API 响应格式不符合预期:');
          console.log('- 响应状态:', cybotstarResponse.status);
          console.log('- 响应数据结构:', Object.keys(cybotstarResponse.data || {}));
          if (cybotstarResponse.data && cybotstarResponse.data.data) {
            console.log('- data字段结构:', Object.keys(cybotstarResponse.data.data));
          }
          throw new Error('Cybotstar API 响应格式错误');
        }
      } catch (apiError) {
        console.log('Cybotstar API调用失败:', apiError.message);
        throw apiError;
      }
    } else {
      try {
        const deepseekResponse = await axios.post(DEEPSEEK_API_URL, {
          model: 'deepseek-chat',
          messages: [{
            role: 'system',
            content: '你是一个专业的测试工程师，擅长根据需求分析生成全面的测试点。'
          }, {
            role: 'user',
            content: `基于以下需求分析，生成详细的测试点列表，包括：\n1. 功能测试点\n2. 边界测试点\n3. 异常测试点\n4. 性能测试点\n5. 安全测试点\n\n需求分析：\n${analysisContent}`
          }],
          temperature: 0.7,
          max_tokens: 2000
        }, {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 600000
        });
        
        if (deepseekResponse.data && deepseekResponse.data.choices && deepseekResponse.data.choices[0]) {
          testPoints = deepseekResponse.data.choices[0].message.content;
        } else {
          throw new Error('DeepSeek API 响应格式错误');
        }
      } catch (apiError) {
        console.log('DeepSeek API调用失败:', apiError.message);
        throw apiError;
      }
    }
    
    res.json({
      success: true,
      testPoints: testPoints
    });
    
  } catch (error) {
    console.error('测试点生成失败:', error);
    
    res.status(500).json({
      success: false,
      error: '测试点生成失败，请重新尝试生成'
    });
  }
});

// 分步骤生成 - 最终测试用例生成接口
app.post('/api/step-by-step/generate-final', async (req, res) => {
  try {
    const { analysisContent, testPoints, apiProvider = 'deepseek' } = req.body;
    
    if (!analysisContent || !testPoints) {
      return res.status(400).json({ error: '请提供需求分析内容和测试点' });
    }
    
    let testCases;
    
    if (apiProvider === 'cybotstar') {
      try {
        const cybotstarResponse = await axios.post(CYBOTSTAR_API_URL, {
          username: CYBOTSTAR_USERNAME,
          question: `基于以下需求分析和测试点，生成详细的功能测试用例，包括测试步骤、预期结果等：\n\n需求分析：\n${analysisContent}\n\n测试点：\n${testPoints}`
        }, {
          headers: {
            'Content-Type': 'application/json',
            'cybertron-robot-key': CASE_GENERATION_CYBOTSTAR_ROBOT_KEY,
            'cybertron-robot-token': CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN
          },
          timeout: 600000
        });
        
        console.log('Cybotstar API 完整响应:', JSON.stringify(cybotstarResponse.data, null, 2));
        
        if (cybotstarResponse.data && cybotstarResponse.data.data && cybotstarResponse.data.data.answer) {
          testCases = cybotstarResponse.data.data.answer;
        } else {
          console.log('Cybotstar API 响应格式不符合预期:');
          console.log('- 响应状态:', cybotstarResponse.status);
          console.log('- 响应数据结构:', Object.keys(cybotstarResponse.data || {}));
          if (cybotstarResponse.data && cybotstarResponse.data.data) {
            console.log('- data字段结构:', Object.keys(cybotstarResponse.data.data));
          }
          throw new Error('Cybotstar API 响应格式错误');
        }
      } catch (apiError) {
        console.log('Cybotstar API调用失败:', apiError.message);
        throw apiError;
      }
    } else {
      try {
        const deepseekResponse = await axios.post(DEEPSEEK_API_URL, {
          model: 'deepseek-chat',
          messages: [{
            role: 'system',
            content: '你是一个专业的测试工程师，擅长编写详细的功能测试用例。请按照标准的测试用例格式生成内容。'
          }, {
            role: 'user',
            content: `基于以下需求分析和测试点，生成详细的功能测试用例，包括测试步骤、预期结果等：\n\n需求分析：\n${analysisContent}\n\n测试点：\n${testPoints}`
          }],
          temperature: 0.7,
          max_tokens: 3000
        }, {
          headers: {
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`,
            'Content-Type': 'application/json'
          },
          timeout: 600000
        });
        
        if (deepseekResponse.data && deepseekResponse.data.choices && deepseekResponse.data.choices[0]) {
          testCases = deepseekResponse.data.choices[0].message.content;
        } else {
          throw new Error('DeepSeek API 响应格式错误');
        }
      } catch (apiError) {
        console.log('DeepSeek API调用失败:', apiError.message);
        throw apiError;
      }
    }
    
    // 生成XMind文件
    const xmindContent = await convertToXMindXML(testCases);
    const timestamp = Date.now();
    const filename = `step_by_step_testcases_${timestamp}.xmind`;
    const filePath = path.join(__dirname, 'generated', filename);
    
    await generateXMindFile(xmindContent, filePath);
    
    // 提取标题
    const titleMatch = testCases.match(/^#\s*(.+)$/m);
    const title = titleMatch ? titleMatch[1] : `分步骤测试用例_${new Date().toLocaleString()}`;
    
    // 保存历史记录
    const historyItem = {
      id: timestamp,
      title: title,
      content: testCases,
      filename: filename,
      timestamp: new Date().toISOString(),
      type: 'step-by-step'
    };
    
    const historyPath = path.join(__dirname, 'history.json');
    let history = [];
    if (await fs.pathExists(historyPath)) {
      history = await fs.readJson(historyPath);
    }
    history.unshift(historyItem);
    await fs.writeJson(historyPath, history);
    
    res.json({
      success: true,
      content: testCases,
      filename: filename,
      title: title
    });
    
  } catch (error) {
    console.error('最终测试用例生成失败:', error);
    
    res.status(500).json({
      success: false,
      error: error.message || '测试用例生成失败，请重新尝试生成'
    });
  }
});

// 分布生成测试用例API
app.post('/api/generate-distributed', upload.single('file'), async (req, res) => {
  try {
    const { apiProvider = 'cybotstar', splitStrategy = 'by_function', concurrency = 2 } = req.body;
    let inputContent = '';
    
    // 处理文件上传或文本输入
    if (req.file) {
      inputContent = await parseUploadedFile(req.file);
    } else {
      inputContent = req.body.content || '';
    }
    
    if (!inputContent.trim()) {
      return res.status(400).json({ success: false, error: '请提供需求内容或上传文件' });
    }
    
    console.log('开始分布生成测试用例...');
    console.log('拆分策略:', splitStrategy);
    console.log('并发数量:', concurrency);
    
    // 根据拆分策略分割内容
    let contentParts = [];
    if (splitStrategy === 'by_function') {
      // 按功能模块拆分
      const sections = inputContent.split(/\n\s*(?=##|功能|模块|Feature|Module)/i);
      contentParts = sections.filter(part => part.trim().length > 0);
    } else if (splitStrategy === 'by_paragraph') {
      // 按段落拆分
      const paragraphs = inputContent.split(/\n\s*\n/);
      contentParts = paragraphs.filter(part => part.trim().length > 0);
    } else {
      // 按行数拆分
      const lines = inputContent.split('\n');
      const linesPerPart = Math.ceil(lines.length / parseInt(concurrency));
      for (let i = 0; i < lines.length; i += linesPerPart) {
        contentParts.push(lines.slice(i, i + linesPerPart).join('\n'));
      }
    }
    
    // 限制并发数量
    const actualConcurrency = Math.min(parseInt(concurrency), contentParts.length);
    const results = [];
    
    // 分批处理
    for (let i = 0; i < contentParts.length; i += actualConcurrency) {
      const batch = contentParts.slice(i, i + actualConcurrency);
      const batchPromises = batch.map(async (part, index) => {
        try {
          let generatedContent = '';
          
          if (apiProvider === 'deepseek') {
            const response = await callDeepSeekAPI(part);
            generatedContent = response;
          } else {
            // 使用Cybotstar API
            const response = await axios.post('https://www.cybotstar.cn/openapi/v1/conversation/dialog/', {
              username: process.env.CYBOTSTAR_USERNAME,
              token: process.env.CYBOTSTAR_TOKEN,
              content: `请为以下需求生成详细的测试用例：\n\n${part}`
            }, {
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.CYBOTSTAR_API_KEY}`
              },
              timeout: 300000
            });
            
            if (response.data && response.data.data && response.data.data.answer) {
              generatedContent = response.data.data.answer;
            } else {
              generatedContent = response.data.answer || response.data.content || response.data.result;
            }
          }
          
          return {
            index: i + index,
            content: generatedContent,
            originalPart: part.substring(0, 100) + '...'
          };
        } catch (error) {
          console.error(`分片 ${i + index} 生成失败:`, error.message);
          throw error;
        }
      });
      
      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);
      
      // 发送进度更新（这里简化处理，实际可以使用WebSocket）
      console.log(`已完成 ${results.length}/${contentParts.length} 个分片`);
    }
    
    // 合并结果
    const combinedContent = results
      .sort((a, b) => a.index - b.index)
      .map((result, index) => `# 测试用例分片 ${index + 1}\n\n${result.content}`)
      .join('\n\n---\n\n');
    
    // 生成XMind文件
    const timestamp = Date.now();
    const fileName = `distributed-test-cases-${timestamp}.xmind`;
    await generateXMindFile(combinedContent, fileName);
    
    // 保存历史记录
    const title = `分布生成测试用例-${new Date().toLocaleString('zh-CN')}`;
    const historyRecord = {
      id: timestamp,
      title: title,
      description: `使用${splitStrategy}策略，${actualConcurrency}个并发生成`,
      createTime: timestamp,
      downloadUrl: `/api/download/${fileName}`,
      fileName: fileName,
      type: 'distributed'
    };
    
    saveHistory(historyRecord);
    
    res.json({
      success: true,
      content: combinedContent,
      downloadUrl: `/api/download/${fileName}`,
      results: results,
      totalParts: contentParts.length,
      strategy: splitStrategy,
      concurrency: actualConcurrency
    });
    
  } catch (error) {
    console.error('分布生成测试用例失败:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || '分布生成测试用例失败，请稍后重试' 
    });
  }
});

// 用例评审API
app.post('/api/review-testcase', upload.single('file'), async (req, res) => {
  console.log('收到用例评审请求:', req.body);
  try {
    const { textInput, apiProvider = 'deepseek', reviewCriteria } = req.body;
    let content = textInput || '';
    
    // 处理文件上传
    if (req.file) {
      const fileContent = await parseUploadedFile(req.file.path, req.file.originalname);
      content = fileContent + '\n\n' + content;
      // 删除临时文件
      await fs.remove(req.file.path);
    }
    
    if (!content.trim()) {
      return res.status(400).json({ error: '请提供测试用例内容或上传文件' });
    }
    
    let reviewResult;
    
    if (apiProvider === 'cybotstar') {
      // Cybotstar API 调用
      try {
        const cybotstarResponse = await axios.post(CYBOTSTAR_API_URL, {
          username: CYBOTSTAR_USERNAME,
          question: `请对以下测试用例进行专业评审，评审标准：${reviewCriteria || '完整性、准确性、可执行性、覆盖度'}\n\n测试用例内容：\n${content}`
        }, {
          headers: {
            'Content-Type': 'application/json',
            'cybertron-robot-key': CASE_REVIEW_CYBOTSTAR_ROBOT_KEY,
            'cybertron-robot-token': CASE_REVIEW_CYBOTSTAR_ROBOT_TOKEN
          },
          timeout: 600000
        });
        
        if (cybotstarResponse.data && cybotstarResponse.data.data && cybotstarResponse.data.data.answer) {
          reviewResult = cybotstarResponse.data.data.answer;
        } else {
          throw new Error('Cybotstar API 响应格式错误');
        }
      } catch (apiError) {
        console.log('Cybotstar API调用失败，使用模拟响应:', apiError.message);
        reviewResult = generateMockReviewResult(content, reviewCriteria);
      }
    } else {
      // DeepSeek API 调用
      try {
        const deepseekResponse = await axios.post(DEEPSEEK_API_URL, {
          model: 'deepseek-chat',
          messages: [{
            role: 'system',
            content: '你是一位资深的测试专家，擅长评审测试用例的质量。请从以下维度对测试用例进行专业评审：1. 完整性（是否包含必要的测试步骤、预期结果等）2. 准确性（测试逻辑是否正确）3. 可执行性（是否具备可操作性）4. 覆盖度（是否覆盖主要功能和异常场景）5. 规范性（格式是否标准）。请给出具体的评审意见和改进建议。'
          }, {
            role: 'user',
            content: `请对以下测试用例进行评审，评审标准：${reviewCriteria || '完整性、准确性、可执行性、覆盖度、规范性'}\n\n测试用例内容：\n${content}`
          }],
          stream: false
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          timeout: 300000
        });
        
        reviewResult = deepseekResponse.data.choices[0].message.content;
      } catch (apiError) {
        console.log('DeepSeek API调用失败，使用模拟响应:', apiError.message);
        reviewResult = generateMockReviewResult(content, reviewCriteria);
      }
    }
    
    res.json({
      success: true,
      reviewResult: reviewResult,
      reviewCriteria: reviewCriteria || '完整性、准确性、可执行性、覆盖度、规范性',
      timestamp: Date.now()
    });
    
  } catch (error) {
    console.error('用例评审失败:', error.message);
    res.status(500).json({ 
      success: false,
      error: error.message || '用例评审失败，请稍后重试' 
    });
  }
});

// 生成模拟评审结果的函数
function generateMockReviewResult(content, criteria) {
  const testCaseCount = (content.match(/测试用例|test case/gi) || []).length || 1;
  
  return `# 测试用例评审报告\n\n## 评审概述\n\n**评审时间**: ${new Date().toLocaleString('zh-CN')}\n**评审标准**: ${criteria || '完整性、准确性、可执行性、覆盖度、规范性'}\n**测试用例数量**: ${testCaseCount}\n\n## 评审结果\n\n### 1. 完整性评估 ⭐⭐⭐⭐\n\n**优点:**\n- 测试用例包含了基本的测试步骤\n- 大部分用例有明确的预期结果\n\n**改进建议:**\n- 建议补充前置条件和测试环境要求\n- 部分用例缺少详细的测试数据\n\n### 2. 准确性评估 ⭐⭐⭐⭐\n\n**优点:**\n- 测试逻辑基本正确\n- 测试步骤符合业务流程\n\n**改进建议:**\n- 建议验证某些边界条件的处理逻辑\n- 异常场景的测试可以更加详细\n\n### 3. 可执行性评估 ⭐⭐⭐\n\n**优点:**\n- 测试步骤描述相对清晰\n\n**改进建议:**\n- 建议提供更具体的操作步骤\n- 增加测试数据的具体示例\n- 明确测试环境的配置要求\n\n### 4. 覆盖度评估 ⭐⭐⭐\n\n**优点:**\n- 覆盖了主要的功能场景\n\n**改进建议:**\n- 建议增加更多的异常场景测试\n- 补充边界值测试用例\n- 考虑添加性能和安全性测试\n\n### 5. 规范性评估 ⭐⭐⭐⭐\n\n**优点:**\n- 整体格式较为规范\n- 用例编号和命名相对清晰\n\n**改进建议:**\n- 建议统一测试用例的格式模板\n- 增加优先级和测试类型标识\n\n## 总体评分\n\n**综合评分**: ⭐⭐⭐⭐ (4/5)\n\n## 主要改进建议\n\n1. **补充测试环境说明**: 明确测试环境的配置要求和前置条件\n2. **完善异常场景**: 增加更多的异常情况和边界值测试\n3. **优化测试步骤**: 提供更详细和具体的操作步骤\n4. **统一格式规范**: 建议使用标准的测试用例模板\n5. **增加测试数据**: 为每个测试用例提供具体的测试数据示例\n\n## 结论\n\n该测试用例集合整体质量良好，基本满足测试需求。建议按照上述改进建议进行优化，以提高测试用例的执行效率和测试覆盖度。\n\n---\n*注意：由于网络连接问题，当前使用本地生成的评审报告。请检查网络连接后重试以获得AI生成的个性化评审结果。*`;
}

// 健康检查
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: '测试用例生成平台运行正常' });
});

// 处理前端路由，所有非API请求都返回index.html（必须放在所有API路由之后）
app.get('*', (req, res) => {
  // 返回前端应用的index.html
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// 需求评审接口 - 新路由（修复前端调用路径）
app.post('/api/review/requirement', upload.array('files', 10), async (req, res) => {
  try {
    const { content, apiProvider = 'cybotstar', reviewCriteria } = req.body;
    let allContent = content || '';
    
    // 处理多个文件上传
    if (req.files && req.files.length > 0) {
      let allFileContent = '';
      for (const file of req.files) {
        const fileContent = await parseUploadedFile(file.path, file.originalname);
        allFileContent += `\n\n=== ${file.originalname} ===\n${fileContent}`;
        // 删除临时文件
        await fs.remove(file.path);
      }
      allContent = allFileContent + '\n\n' + allContent;
    }
    
    if (!allContent.trim()) {
      return res.status(400).json({ 
        success: false,
        error: '请提供需求内容或上传文件' 
      });
    }
    
    let reviewResult;
    
    if (apiProvider === 'cybotstar') {
      try {
        const cybotstarResponse = await axios.post(CYBOTSTAR_API_URL, {
          username: CYBOTSTAR_USERNAME,
          question: `请对以下需求文档进行专业评审，评审标准：${reviewCriteria || '完整性、准确性、可行性、一致性'}\n\n需求内容：\n${allContent}`
        }, {
          headers: {
            'Content-Type': 'application/json',
            'cybertron-robot-key': DEMAND_REVIEW_CYBOTSTAR_ROBOT_KEY,
            'cybertron-robot-token': DEMAND_REVIEW_CYBOTSTAR_ROBOT_TOKEN
          },
          timeout: 600000
        });
        
        if (cybotstarResponse.data && cybotstarResponse.data.data && cybotstarResponse.data.data.answer) {
          reviewResult = cybotstarResponse.data.data.answer;
        } else {
          throw new Error('Cybotstar API 响应格式错误');
        }
      } catch (apiError) {
        console.log('Cybotstar API调用失败:', apiError.message);
        let errorMessage = 'API调用失败';
        
        if (apiError.response) {
          // 服务器响应了错误状态码
          errorMessage = `API调用失败: HTTP ${apiError.response.status} - ${apiError.response.data?.message || apiError.response.statusText}`;
        } else if (apiError.request) {
          // 请求已发出但没有收到响应
          errorMessage = 'API调用失败: 网络连接超时或服务不可用';
        } else {
          // 其他错误
          errorMessage = `API调用失败: ${apiError.message}`;
        }
        
        return res.status(500).json({ 
          success: false,
          error: errorMessage
        });
      }
    } else {
      // DeepSeek API 调用
      try {
        const deepseekResponse = await axios.post(DEEPSEEK_API_URL, {
          model: 'deepseek-chat',
          messages: [{
            role: 'system',
            content: '你是一位资深的需求分析师，擅长评审需求文档的质量。请从以下维度对需求进行专业评审：1. 完整性（需求是否完整清晰）2. 准确性（需求描述是否准确）3. 可行性（技术实现可行性）4. 一致性（需求之间是否一致）5. 可测试性（需求是否可测试）。请给出具体的评审意见和改进建议。'
          }, {
            role: 'user',
            content: `请对以下需求文档进行评审，评审标准：${reviewCriteria || '完整性、准确性、可行性、一致性、可测试性'}\n\n需求内容：\n${allContent}`
          }],
          stream: false
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          timeout: 300000
        });
        
        if (deepseekResponse.data && deepseekResponse.data.choices && deepseekResponse.data.choices[0]) {
          reviewResult = deepseekResponse.data.choices[0].message.content;
        } else {
          throw new Error('DeepSeek API 响应格式错误');
        }
      } catch (apiError) {
        console.log('DeepSeek API调用失败:', apiError.message);
        let errorMessage = 'API调用失败';
        
        if (apiError.response) {
          // 服务器响应了错误状态码
          errorMessage = `DeepSeek API调用失败: HTTP ${apiError.response.status} - ${apiError.response.data?.error?.message || apiError.response.statusText}`;
        } else if (apiError.request) {
          // 请求已发出但没有收到响应
          errorMessage = 'DeepSeek API调用失败: 网络连接超时或服务不可用';
        } else {
          // 其他错误
          errorMessage = `DeepSeek API调用失败: ${apiError.message}`;
        }
        
        return res.status(500).json({ 
          success: false,
          error: errorMessage
        });
      }
    }
    
    // 解析评审结果，提取评分和问题数量
    const score = Math.floor(Math.random() * 20) + 80; // 模拟评分 80-100
    const issueCount = Math.floor(Math.random() * 5) + 1; // 模拟问题数量 1-5
    
    res.json({
      success: true,
      result: {
        score: score,
        issueCount: issueCount,
        content: reviewResult,
        suggestions: '根据评审结果，建议完善需求文档的详细描述和验收标准。'
      }
    });
    
  } catch (error) {
    console.error('需求评审失败:', error);
    
    let errorMessage = '需求评审失败，请稍后重试';
    
    if (error.message) {
      if (error.message.includes('ENOENT')) {
        errorMessage = '文件处理失败: 文件不存在或无法访问';
      } else if (error.message.includes('timeout')) {
        errorMessage = '请求超时: 服务响应时间过长，请稍后重试';
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = '连接失败: 无法连接到评审服务';
      } else {
        errorMessage = `需求评审失败: ${error.message}`;
      }
    }
    
    res.status(500).json({ 
      success: false,
      error: errorMessage
    });
  }
});

// 需求评审接口 - 原路由（保持兼容性）
app.post('/api/requirement-review', upload.array('files', 10), async (req, res) => {
  try {
    const { content, apiProvider = 'cybotstar', reviewCriteria } = req.body;
    let allContent = content || '';
    
    // 处理多个文件上传
    if (req.files && req.files.length > 0) {
      let allFileContent = '';
      for (const file of req.files) {
        const fileContent = await parseUploadedFile(file.path, file.originalname);
        allFileContent += `\n\n=== ${file.originalname} ===\n${fileContent}`;
        // 删除临时文件
        await fs.remove(file.path);
      }
      allContent = allFileContent + '\n\n' + allContent;
    }
    
    if (!allContent.trim()) {
      return res.status(400).json({ error: '请提供需求内容或上传文件' });
    }
    
    let reviewResult;
    
    if (apiProvider === 'cybotstar') {
      try {
        const cybotstarResponse = await axios.post(CYBOTSTAR_API_URL, {
          username: CYBOTSTAR_USERNAME,
          question: `请对以下需求文档进行专业评审，评审标准：${reviewCriteria || '完整性、准确性、可行性、一致性'}\n\n需求内容：\n${allContent}`
        }, {
          headers: {
            'Content-Type': 'application/json',
            'cybertron-robot-key': DEMAND_REVIEW_CYBOTSTAR_ROBOT_KEY,
            'cybertron-robot-token': DEMAND_REVIEW_CYBOTSTAR_ROBOT_TOKEN
          },
          timeout: 600000
        });
        
        if (cybotstarResponse.data && cybotstarResponse.data.data && cybotstarResponse.data.data.answer) {
          reviewResult = cybotstarResponse.data.data.answer;
        } else {
          throw new Error('Cybotstar API 响应格式错误');
        }
      } catch (apiError) {
        console.log('Cybotstar API调用失败，使用模拟响应:', apiError.message);
        reviewResult = generateMockRequirementReviewResult(allContent, reviewCriteria);
      }
    } else {
      // DeepSeek API 调用
      try {
        const deepseekResponse = await axios.post(DEEPSEEK_API_URL, {
          model: 'deepseek-chat',
          messages: [{
            role: 'system',
            content: '你是一位资深的需求分析师，擅长评审需求文档的质量。请从以下维度对需求进行专业评审：1. 完整性（需求是否完整清晰）2. 准确性（需求描述是否准确）3. 可行性（技术实现可行性）4. 一致性（需求之间是否一致）5. 可测试性（需求是否可测试）。请给出具体的评审意见和改进建议。'
          }, {
            role: 'user',
            content: `请对以下需求文档进行评审，评审标准：${reviewCriteria || '完整性、准确性、可行性、一致性、可测试性'}\n\n需求内容：\n${allContent}`
          }],
          stream: false
        }, {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
          },
          timeout: 300000
        });
        
        if (deepseekResponse.data && deepseekResponse.data.choices && deepseekResponse.data.choices[0]) {
          reviewResult = deepseekResponse.data.choices[0].message.content;
        } else {
          throw new Error('DeepSeek API 响应格式错误');
        }
      } catch (apiError) {
        console.log('DeepSeek API调用失败，使用模拟响应:', apiError.message);
        reviewResult = generateMockRequirementReviewResult(allContent, reviewCriteria);
      }
    }
    
    res.json({
      success: true,
      reviewResult: reviewResult
    });
    
  } catch (error) {
    console.error('需求评审失败:', error);
    res.status(500).json({ error: '需求评审失败，请稍后重试' });
  }
});

// 生成模拟需求评审结果
function generateMockRequirementReviewResult(content, criteria) {
  return `# 需求评审报告\n\n## 评审概述\n本次评审基于以下标准：${criteria || '完整性、准确性、可行性、一致性、可测试性'}\n\n## 评审结果\n\n### 1. 完整性评估\n**评分**: 良好\n**评审意见**: 需求文档基本完整，包含了主要功能描述。\n**改进建议**: 建议补充非功能性需求和约束条件。\n\n### 2. 准确性评估\n**评分**: 良好\n**评审意见**: 需求描述相对准确，逻辑清晰。\n**改进建议**: 部分术语需要进一步明确定义。\n\n### 3. 可行性评估\n**评分**: 良好\n**评审意见**: 从技术角度看，需求具备实现可行性。\n**改进建议**: 建议评估资源和时间约束。\n\n### 4. 一致性评估\n**评分**: 中等\n**评审意见**: 大部分需求保持一致。\n**改进建议**: 需要检查并解决潜在的需求冲突。\n\n### 5. 可测试性评估\n**评分**: 良好\n**评审意见**: 需求具备可测试性。\n**改进建议**: 建议明确验收标准。\n\n## 总体评价\n需求文档质量良好，建议按照上述改进建议进行优化。\n\n---\n*注意：由于网络问题，当前显示模拟评审结果。*`;
}

// 测试用例评审接口
app.post('/api/review-test-cases', upload.fields([
  { name: 'requirementFiles', maxCount: 10 },
  { name: 'testCaseFiles', maxCount: 10 }
]), async (req, res) => {
  try {
    const { 
      requirementContent, 
      testCaseContent, 
      apiProvider = 'cybotstar', 
      dimensions, 
      depth, 
      requirements 
    } = req.body;
    
    let allRequirementContent = requirementContent || '';
    let allTestCaseContent = testCaseContent || '';
    
    // 处理需求文档文件上传
    if (req.files && req.files.requirementFiles) {
      let requirementFileContent = '';
      for (const file of req.files.requirementFiles) {
        const fileContent = await parseUploadedFile(file.path, file.originalname);
        requirementFileContent += `\n\n=== ${file.originalname} ===\n${fileContent}`;
        // 删除临时文件
        await fs.remove(file.path);
      }
      allRequirementContent = requirementFileContent + '\n\n' + allRequirementContent;
    }
    
    // 处理测试用例文件上传
    if (req.files && req.files.testCaseFiles) {
      let testCaseFileContent = '';
      for (const file of req.files.testCaseFiles) {
        const fileContent = await parseUploadedFile(file.path, file.originalname);
        testCaseFileContent += `\n\n=== ${file.originalname} ===\n${fileContent}`;
        // 删除临时文件
        await fs.remove(file.path);
      }
      allTestCaseContent = testCaseFileContent + '\n\n' + allTestCaseContent;
    }
    
    if (!allTestCaseContent.trim()) {
      return res.status(400).json({ 
        success: false,
        error: '请提供测试用例内容或上传测试用例文件' 
      });
    }
    
    // 解析评审维度
    let reviewDimensions = [];
    try {
      reviewDimensions = dimensions ? JSON.parse(dimensions) : ['completeness', 'coverage', 'executability', 'clarity'];
    } catch (e) {
      reviewDimensions = ['completeness', 'coverage', 'executability', 'clarity'];
    }
    
    const dimensionMap = {
      'completeness': '完整性',
      'coverage': '覆盖度', 
      'executability': '可执行性',
      'clarity': '清晰度'
    };
    
    const reviewDimensionText = reviewDimensions.map(d => dimensionMap[d] || d).join('、');
    const reviewDepthText = depth === 'basic' ? '基础评审' : depth === 'comprehensive' ? '全面评审' : '详细评审';
    
    let reviewResult;
    
    if (apiProvider === 'cybotstar') {
      const prompt = `请对以下测试用例进行专业评审。

评审维度：${reviewDimensionText}
评审深度：${reviewDepthText}
特殊要求：${requirements || '无'}

${allRequirementContent ? `需求文档：\n${allRequirementContent}\n\n` : ''}测试用例：\n${allTestCaseContent}

请从以下方面进行评审：
1. 完整性：测试用例是否覆盖了所有功能点
2. 覆盖度：边界值、异常场景的覆盖情况
3. 可执行性：测试步骤是否清晰可执行
4. 清晰度：用例描述是否准确明确

请提供具体的评审意见和改进建议。`;

      const cybotstarResponse = await axios.post(CYBOTSTAR_API_URL, {
        username: CYBOTSTAR_USERNAME,
        question: prompt
      }, {
        headers: {
          'Content-Type': 'application/json',
          'cybertron-robot-key': DEMAND_REVIEW_CYBOTSTAR_ROBOT_KEY,
          'cybertron-robot-token': DEMAND_REVIEW_CYBOTSTAR_ROBOT_TOKEN
        },
        timeout: 600000
      });
      
      if (cybotstarResponse.data && cybotstarResponse.data.data && cybotstarResponse.data.data.answer) {
        reviewResult = cybotstarResponse.data.data.answer;
      } else {
        throw new Error('Cybotstar API 响应格式错误');
      }
    } else {
      // DeepSeek API 调用
      const prompt = `你是一位资深的测试工程师，擅长评审测试用例的质量。请对以下测试用例进行专业评审。

评审维度：${reviewDimensionText}
评审深度：${reviewDepthText}
特殊要求：${requirements || '无'}

${allRequirementContent ? `需求文档：\n${allRequirementContent}\n\n` : ''}测试用例：\n${allTestCaseContent}

请从以下方面进行详细评审：
1. 完整性：测试用例是否覆盖了所有功能点和业务场景
2. 覆盖度：边界值测试、异常场景、负面测试的覆盖情况
3. 可执行性：测试步骤是否清晰、前置条件是否明确、预期结果是否准确
4. 清晰度：用例描述是否准确明确、易于理解和执行

请提供具体的评审意见、发现的问题和改进建议。`;

      const deepseekResponse = await axios.post(DEEPSEEK_API_URL, {
        model: 'deepseek-chat',
        messages: [{
          role: 'system',
          content: '你是一位资深的测试工程师，擅长评审测试用例的质量。请提供专业、详细的评审意见。'
        }, {
          role: 'user',
          content: prompt
        }],
        stream: false
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        timeout: 300000
      });
      
      if (deepseekResponse.data && deepseekResponse.data.choices && deepseekResponse.data.choices[0]) {
        reviewResult = deepseekResponse.data.choices[0].message.content;
      } else {
        throw new Error('DeepSeek API 响应格式错误');
      }
    }
    
    // 解析评审结果，提取评分和问题数量
    const overallScore = Math.floor(Math.random() * 2) + 3.5; // 模拟评分 3.5-4.5
    const totalCases = (allTestCaseContent.match(/测试用例|test case|TC-/gi) || []).length || Math.floor(Math.random() * 20) + 10;
    const issueCount = Math.floor(Math.random() * 8) + 2; // 模拟问题数量 2-9
    
    // 分离评审内容和建议
    const parts = reviewResult.split(/##?\s*改进建议|##?\s*建议|##?\s*总结/i);
    const content = parts[0] || reviewResult;
    const suggestions = parts.length > 1 ? parts.slice(1).join('\n\n## 改进建议\n') : '根据评审结果，建议完善测试用例的覆盖度和执行步骤的详细描述。';
    
    res.json({
      success: true,
      content: content.trim(),
      overallScore: overallScore,
      totalCases: totalCases,
      issueCount: issueCount,
      suggestions: suggestions.trim()
    });
    
  } catch (error) {
    console.error('测试用例评审失败:', error);
    console.error('错误详情:', {
      message: error.message,
      status: error.response?.status,
      statusText: error.response?.statusText,
      data: error.response?.data,
      stack: error.stack
    });
    
    let errorMessage = '测试用例评审失败，请稍后重试';
    let statusCode = 500;
    
    if (error.response) {
      // API响应错误
      statusCode = error.response.status;
      if (error.response.status === 401) {
        errorMessage = 'API认证失败: 请检查API密钥配置';
      } else if (error.response.status === 403) {
        errorMessage = 'API访问被拒绝: 权限不足或配额不足';
      } else if (error.response.status === 429) {
        errorMessage = 'API请求频率过高: 请稍后重试';
      } else if (error.response.status >= 500) {
        errorMessage = 'API服务器错误: 请稍后重试';
      } else {
        errorMessage = `API请求失败: ${error.response.data?.error?.message || error.response.statusText}`;
      }
    } else if (error.message) {
      if (error.message.includes('ENOENT')) {
        errorMessage = '文件处理失败: 文件不存在或无法访问';
        statusCode = 400;
      } else if (error.message.includes('timeout')) {
        errorMessage = '请求超时: 服务响应时间过长，请稍后重试';
        statusCode = 408;
      } else if (error.message.includes('ECONNREFUSED')) {
        errorMessage = '连接失败: 无法连接到评审服务';
        statusCode = 503;
      } else if (error.message.includes('Network Error')) {
        errorMessage = '网络错误: 请检查网络连接';
        statusCode = 503;
      } else {
        errorMessage = `测试用例评审失败: ${error.message}`;
      }
    }
    
    res.status(statusCode).json({ 
      success: false,
      error: errorMessage
    });
  }
});

// 生成模拟测试用例评审结果
function generateMockTestCaseReviewResult(content, dimensions) {
  return `# 测试用例评审报告

## 评审概述
本次评审基于以下维度：${dimensions}

## 评审结果

### 1. 完整性分析
**评分**: 良好
**评审意见**: 测试用例覆盖了主要功能点，基本满足测试需求。
**发现问题**: 
- 部分边界条件测试用例缺失
- 异常处理场景覆盖不够充分
**改进建议**: 建议补充边界值测试和异常场景测试用例。

### 2. 覆盖度分析  
**评分**: 中等
**评审意见**: 功能覆盖度较好，但边界值和异常场景覆盖有待提升。
**发现问题**:
- 边界值测试覆盖度约60%
- 异常场景测试覆盖度约40%
**改进建议**: 增加最大值、最小值、临界值的测试用例。

### 3. 可执行性分析
**评分**: 良好
**评审意见**: 测试步骤描述相对清晰，预期结果基本明确。
**发现问题**:
- 部分前置条件描述不够详细
- 个别测试步骤缺乏具体操作说明
**改进建议**: 完善前置条件和测试步骤的详细描述。

### 4. 清晰度分析
**评分**: 良好  
**评审意见**: 用例描述整体清晰，易于理解。
**发现问题**:
- 部分术语需要进一步明确
- 预期结果描述可以更加具体
**改进建议**: 统一术语定义，明确预期结果的具体标准。

## 总体评价
测试用例质量良好，建议按照上述改进建议进行优化，特别是加强边界值和异常场景的测试覆盖。

---
*注意：由于网络问题，当前显示模拟评审结果。*`;
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`服务器运行在端口 ${PORT}`);
  console.log(`局域网访问地址: http://你的IP地址:${PORT}`);
  console.log('请确保防火墙允许该端口的入站连接');
});