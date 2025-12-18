/**
 * API测试路由模块
 * 包含：/api/generate-api-test, /api/execute-api-tests, /api/parse-curl
 */

module.exports = function(app) {
  const axios = require('axios');
  const config = require('../config');
  const { parseCurlToRequest, generateCombinationCases } = require('../utils/curlParser');
  const { executeApiTests } = require('../services/apiTestService');
  const { parseApiTestCasesToExcel, generateExcelFile } = require('../services/excelGenerator');

  // API测试用例生成
  app.post('/api/generate-api-test', async (req, res) => {
    console.log('收到API测试用例生成请求:', req.body);
    try {
      const { apiName, curlCommands, apiDoc } = req.body;
      
      if (!apiName || (!curlCommands && !apiDoc)) {
        return res.status(400).json({ error: '请提供接口名称和curl命令或接口文档' });
      }
      
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
        const response = await axios.post(config.DEEPSEEK_API_URL, {
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
            'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`
          },
          timeout: 600000
        });
        
        console.log('DeepSeek API调用成功');
        generatedContent = response.data.choices[0].message.content;
        
      } catch (apiError) {
        console.log('DeepSeek API调用失败，使用模拟响应:', apiError.message);
        generatedContent = `# ${apiName} - API测试用例\n\n## 接口信息\n${inputContent}\n\n## 测试用例\n\n### 1. 正常场景测试\n\n#### TC-001: 正常请求测试\n- **测试目的**: 验证接口在正常参数下的响应\n- **请求方法**: GET/POST\n- **请求URL**: /api/example\n- **请求头**: Content-Type: application/json\n- **请求参数**: 正常参数\n- **预期状态码**: 200\n- **预期响应**: 正常返回数据\n- **验证点**: 响应格式正确，数据完整\n\n### 2. 异常场景测试\n\n#### TC-002: 缺失必填参数测试\n- **测试目的**: 验证缺失必填参数时的错误处理\n- **请求方法**: GET/POST\n- **请求URL**: /api/example\n- **请求头**: Content-Type: application/json\n- **请求参数**: 缺失必填参数\n- **预期状态码**: 400\n- **预期响应**: 错误信息提示\n- **验证点**: 错误信息准确，状态码正确\n\n### 3. 边界值测试\n\n#### TC-003: 参数边界值测试\n- **测试目的**: 验证参数边界值的处理\n- **请求方法**: GET/POST\n- **请求URL**: /api/example\n- **请求头**: Content-Type: application/json\n- **请求参数**: 边界值参数\n- **预期状态码**: 200/400\n- **预期响应**: 正确处理或错误提示\n- **验证点**: 边界值处理正确\n\n---\n*注意：由于网络连接问题，当前使用本地生成的测试用例模板。请检查网络连接后重试以获得AI生成的个性化测试用例。*`;
      }
      
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

  // 根据cURL生成组合用例并自动执行
  app.post('/api/execute-api-tests', async (req, res) => {
    try {
      const { curl } = req.body;
      if (!curl || !curl.trim()) {
        return res.status(400).json({ success: false, error: '请提供有效的cURL命令' });
      }
      
      console.log('收到API测试执行请求，curl长度:', curl.length);
      
      let baseReq;
      try {
        baseReq = parseCurlToRequest(curl);
        console.log('cURL解析成功:', { method: baseReq.method, url: baseReq.url });
      } catch (parseError) {
        console.error('cURL解析失败:', parseError);
        return res.status(400).json({ success: false, error: `cURL解析失败: ${parseError.message}` });
      }
      
      let cases;
      try {
        cases = generateCombinationCases(baseReq);
        console.log('生成测试用例数量:', cases.length);
      } catch (caseError) {
        console.error('生成测试用例失败:', caseError);
        return res.status(500).json({ success: false, error: `生成测试用例失败: ${caseError.message}` });
      }
      
      let testResult;
      try {
        testResult = await executeApiTests(cases);
        console.log('测试执行完成:', testResult.summary);
      } catch (testError) {
        console.error('执行测试失败:', testError);
        console.error('错误堆栈:', testError.stack);
        return res.status(500).json({ success: false, error: `执行测试失败: ${testError.message}` });
      }
      
      res.json({ success: true, summary: testResult.summary, results: testResult.results, baseRequest: baseReq });
    } catch (error) {
      console.error('执行API测试失败（外层捕获）:', error);
      console.error('错误堆栈:', error.stack);
      res.status(500).json({ success: false, error: error.message || '执行失败', stack: process.env.NODE_ENV === 'development' ? error.stack : undefined });
    }
  });

  app.post('/api/execute-api-tests-multi', async (req, res) => {
    try {
      const { curls } = req.body;
      if (!Array.isArray(curls) || curls.length === 0) {
        return res.status(400).json({ success: false, error: '请提供cURL命令列表' });
      }
      const allResults = [];
      const baseRequests = [];
      for (let i = 0; i < curls.length; i++) {
        const c = (curls[i] || '').trim();
        if (!c) continue;
        try {
          const baseReq = parseCurlToRequest(c);
          baseRequests.push(baseReq);
          const cases = generateCombinationCases(baseReq);
          const { results } = await executeApiTests(cases);
          results.forEach(r => allResults.push({ ...r, groupIndex: i + 1 }));
        } catch (err) {
          console.error(`处理第${i + 1}个cURL命令失败:`, err);
          allResults.push({
            name: `cURL命令${i + 1}`,
            status: 'Error',
            duration: 0,
            success: false,
            response: { error: err.message },
            groupIndex: i + 1
          });
        }
      }
      const summary = {
        total: allResults.length,
        passed: allResults.filter(r => r.success).length,
        failed: allResults.filter(r => !r.success).length,
        passRate: allResults.length ? Math.round(allResults.filter(r => r.success).length / allResults.length * 100) : 0
      };
      res.json({ success: true, summary, results: allResults, baseRequests });
    } catch (error) {
      console.error('批量执行API测试失败:', error);
      console.error('错误堆栈:', error.stack);
      res.status(500).json({ success: false, error: error.message || '执行失败' });
    }
  });

  // 解析cURL为结构化请求（仅解析不执行）
  app.post('/api/parse-curl', async (req, res) => {
    try {
      const { curl } = req.body;
      if (!curl || !curl.trim()) {
        return res.status(400).json({ success: false, error: '请提供cURL命令' });
      }
      const baseReq = parseCurlToRequest(curl);
      res.json({ success: true, request: baseReq });
    } catch (error) {
      res.status(500).json({ success: false, error: error.message || '解析失败' });
    }
  });

  // 导出测试结果为Excel
  app.post('/api/export-api-test-results', async (req, res) => {
    try {
      const { batchResult } = req.body;
      if (!batchResult || !batchResult.results || !Array.isArray(batchResult.results)) {
        return res.status(400).json({ success: false, error: '请提供有效的测试结果数据' });
      }

      // 将测试结果转换为Excel格式
      const excelData = batchResult.results.map((result, index) => {
        const request = result.request || {};
        return {
          '用例名称': result.name || `用例${index + 1}`,
          '请求方法': request.method || 'GET',
          '请求URL': request.url || '',
          '请求头': JSON.stringify(request.headers || {}, null, 2),
          '请求体': JSON.stringify(request.data || request.body || null, null, 2),
          '状态码': result.status || '',
          '响应时间(ms)': result.duration || 0,
          '测试结果': result.success ? '通过' : '失败',
          '响应内容': JSON.stringify(result.response || {}, null, 2),
          '业务码': result.code || ''
        };
      });

      // 生成Excel文件
      const timestamp = Date.now();
      const excelFileName = `api-test-results-${timestamp}.xlsx`;
      generateExcelFile(excelData, excelFileName);

      res.json({
        success: true,
        downloadUrl: `/api/download/${excelFileName}`,
        fileName: excelFileName
      });
    } catch (error) {
      console.error('导出Excel失败:', error);
      res.status(500).json({ success: false, error: error.message || '导出失败' });
    }
  });
};
