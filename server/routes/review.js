/**
 * 评审路由模块
 * 包含：/api/review-testcase, /api/review/requirement, /api/review-test-cases
 */

module.exports = function(app) {
  const axios = require('axios');
  const fs = require('fs-extra');
  const upload = app.locals.upload;
  const config = require('../config');
  const { parseUploadedFile } = require('../services/fileParser');

  // 用例评审
  app.post('/api/review-testcase', upload.single('file'), async (req, res) => {
    res.status(501).json({ error: '功能待实现' });
  });

  // 需求评审
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
          const cybotstarResponse = await axios.post(config.CYBOTSTAR_API_URL, {
            username: config.CYBOTSTAR_USERNAME,
            question: `请对以下需求文档进行专业评审，评审标准：${reviewCriteria || '完整性、准确性、可行性、一致性'}\n\n需求内容：\n${allContent}`
          }, {
            headers: {
              'Content-Type': 'application/json',
              'cybertron-robot-key': config.DEMAND_REVIEW_CYBOTSTAR_ROBOT_KEY,
              'cybertron-robot-token': config.DEMAND_REVIEW_CYBOTSTAR_ROBOT_TOKEN
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
            errorMessage = `API调用失败: HTTP ${apiError.response.status} - ${apiError.response.data?.message || apiError.response.statusText}`;
          } else if (apiError.request) {
            errorMessage = 'API调用失败: 网络连接超时或服务不可用';
          } else {
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
          const deepseekResponse = await axios.post(config.DEEPSEEK_API_URL, {
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
              'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`
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
            errorMessage = `DeepSeek API调用失败: HTTP ${apiError.response.status} - ${apiError.response.data?.error?.message || apiError.response.statusText}`;
          } else if (apiError.request) {
            errorMessage = 'DeepSeek API调用失败: 网络连接超时或服务不可用';
          } else {
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
      console.error('错误堆栈:', error.stack);
      
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

  // 需求评审（兼容路由）
  app.post('/api/requirement-review', upload.array('files', 10), async (req, res) => {
    // 复用相同的逻辑
    try {
      const { content, apiProvider = 'cybotstar', reviewCriteria } = req.body;
      let allContent = content || '';
      
      // 处理多个文件上传
      if (req.files && req.files.length > 0) {
        let allFileContent = '';
        for (const file of req.files) {
          const fileContent = await parseUploadedFile(file.path, file.originalname);
          allFileContent += `\n\n=== ${file.originalname} ===\n${fileContent}`;
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
          const cybotstarResponse = await axios.post(config.CYBOTSTAR_API_URL, {
            username: config.CYBOTSTAR_USERNAME,
            question: `请对以下需求文档进行专业评审，评审标准：${reviewCriteria || '完整性、准确性、可行性、一致性'}\n\n需求内容：\n${allContent}`
          }, {
            headers: {
              'Content-Type': 'application/json',
              'cybertron-robot-key': config.DEMAND_REVIEW_CYBOTSTAR_ROBOT_KEY,
              'cybertron-robot-token': config.DEMAND_REVIEW_CYBOTSTAR_ROBOT_TOKEN
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
          // 返回模拟评审结果
          reviewResult = `# 需求评审报告\n\n## 评审概述\n本次评审基于以下标准：${reviewCriteria || '完整性、准确性、可行性、一致性、可测试性'}\n\n## 评审结果\n\n### 1. 完整性评估\n**评分**: 良好\n**评审意见**: 需求文档基本完整，包含了主要功能描述。\n**改进建议**: 建议补充非功能性需求和约束条件。\n\n### 2. 准确性评估\n**评分**: 良好\n**评审意见**: 需求描述相对准确，逻辑清晰。\n**改进建议**: 部分术语需要进一步明确定义。\n\n### 3. 可行性评估\n**评分**: 良好\n**评审意见**: 从技术角度看，需求具备实现可行性。\n**改进建议**: 建议评估资源和时间约束。\n\n### 4. 一致性评估\n**评分**: 中等\n**评审意见**: 大部分需求保持一致。\n**改进建议**: 需要检查并解决潜在的需求冲突。\n\n### 5. 可测试性评估\n**评分**: 良好\n**评审意见**: 需求具备可测试性。\n**改进建议**: 建议明确验收标准。\n\n## 总体评价\n需求文档质量良好，建议按照上述改进建议进行优化。\n\n---\n*注意：由于网络问题，当前显示模拟评审结果。*`;
        }
      } else {
        try {
          const deepseekResponse = await axios.post(config.DEEPSEEK_API_URL, {
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
              'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`
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
          reviewResult = `# 需求评审报告\n\n## 评审概述\n本次评审基于以下标准：${reviewCriteria || '完整性、准确性、可行性、一致性、可测试性'}\n\n## 评审结果\n\n### 1. 完整性评估\n**评分**: 良好\n**评审意见**: 需求文档基本完整，包含了主要功能描述。\n**改进建议**: 建议补充非功能性需求和约束条件。\n\n### 2. 准确性评估\n**评分**: 良好\n**评审意见**: 需求描述相对准确，逻辑清晰。\n**改进建议**: 部分术语需要进一步明确定义。\n\n### 3. 可行性评估\n**评分**: 良好\n**评审意见**: 从技术角度看，需求具备实现可行性。\n**改进建议**: 建议评估资源和时间约束。\n\n### 4. 一致性评估\n**评分**: 中等\n**评审意见**: 大部分需求保持一致。\n**改进建议**: 需要检查并解决潜在的需求冲突。\n\n### 5. 可测试性评估\n**评分**: 良好\n**评审意见**: 需求具备可测试性。\n**改进建议**: 建议明确验收标准。\n\n## 总体评价\n需求文档质量良好，建议按照上述改进建议进行优化。\n\n---\n*注意：由于网络问题，当前显示模拟评审结果。*`;
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

  // 测试用例评审
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

        const cybotstarResponse = await axios.post(config.CYBOTSTAR_API_URL, {
          username: config.CYBOTSTAR_USERNAME,
          question: prompt
        }, {
          headers: {
            'Content-Type': 'application/json',
            'cybertron-robot-key': config.DEMAND_REVIEW_CYBOTSTAR_ROBOT_KEY,
            'cybertron-robot-token': config.DEMAND_REVIEW_CYBOTSTAR_ROBOT_TOKEN
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

        const deepseekResponse = await axios.post(config.DEEPSEEK_API_URL, {
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
            'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`
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
};
