/**
 * 分步骤生成路由模块
 * 包含：/api/step-by-step/*
 */

module.exports = function(app) {
  const axios = require('axios');
  const fs = require('fs-extra');
  const path = require('path');
  const upload = app.locals.upload;
  const config = require('../config');
  const { parseUploadedFile } = require('../services/fileParser');
  const { generateXMindFile, convertToXMindXML } = require('../services/xmindGenerator');
  const historyService = require('../services/historyService');

  // 需求分析
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
          const cybotstarResponse = await axios.post(config.CYBOTSTAR_API_URL, {
            username: config.CYBOTSTAR_USERNAME,
            question: `请对以下需求进行详细分析，包括功能模块、业务流程、用户角色等方面：\n\n${content}`
          }, {
            headers: {
              'Content-Type': 'application/json',
              'cybertron-robot-key': config.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY,
              'cybertron-robot-token': config.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN
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
          const deepseekResponse = await axios.post(config.DEEPSEEK_API_URL, {
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
              'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`,
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
      console.error('错误堆栈:', error.stack);
      
      res.status(500).json({
        success: false,
        error: '需求分析失败，请重新尝试分析'
      });
    }
  });

  // 需求补充
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
          const cybotstarResponse = await axios.post(config.CYBOTSTAR_API_URL, {
            username: config.CYBOTSTAR_USERNAME,
            question: `请作为专业的需求分析师，基于以下原始需求分析和补充信息，提供一个完整详细的更新后需求分析报告。请直接输出分析结果，不要提示信息不完整或要求更多信息。\n\n原始分析：\n${originalAnalysis}\n\n补充信息：\n${supplementContent}\n\n请提供完整的更新后需求分析：`
          }, {
            headers: {
              'Content-Type': 'application/json',
              'cybertron-robot-key': config.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_KEY,
              'cybertron-robot-token': config.DEMAND_ANALYSIS_CYBOTSTAR_ROBOT_TOKEN
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
          const deepseekResponse = await axios.post(config.DEEPSEEK_API_URL, {
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
              'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`,
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
      console.error('错误堆栈:', error.stack);
      
      res.status(500).json({
        success: false,
        error: '需求补充失败，请重新尝试补充'
      });
    }
  });

  // 测试点生成
  app.post('/api/step-by-step/test-points', async (req, res) => {
    try {
      const { analysisContent, apiProvider = 'deepseek' } = req.body;
      
      if (!analysisContent || !analysisContent.trim()) {
        return res.status(400).json({ error: '请提供需求分析内容' });
      }
      
      let testPoints;
      
      if (apiProvider === 'cybotstar') {
        try {
          const cybotstarResponse = await axios.post(config.CYBOTSTAR_API_URL, {
            username: config.CYBOTSTAR_USERNAME,
            question: `基于以下需求分析，生成详细的测试点列表，包括功能测试点、边界测试点、异常测试点等：\n\n${analysisContent}`
          }, {
            headers: {
              'Content-Type': 'application/json',
              'cybertron-robot-key': config.TEST_POINT_GENERATION_CYBOTSTAR_ROBOT_KEY,
              'cybertron-robot-token': config.TEST_POINT_GENERATION_CYBOTSTAR_ROBOT_TOKEN
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
          const deepseekResponse = await axios.post(config.DEEPSEEK_API_URL, {
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
              'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`,
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
      console.error('错误堆栈:', error.stack);
      
      res.status(500).json({
        success: false,
        error: '测试点生成失败，请重新尝试生成'
      });
    }
  });

  // 最终生成
  app.post('/api/step-by-step/generate-final', async (req, res) => {
    try {
      const { analysisContent, testPoints, apiProvider = 'deepseek' } = req.body;
      
      if (!analysisContent || !testPoints) {
        return res.status(400).json({ error: '请提供需求分析内容和测试点' });
      }
      
      let testCases;
      
      if (apiProvider === 'cybotstar') {
        try {
          const cybotstarResponse = await axios.post(config.CYBOTSTAR_API_URL, {
            username: config.CYBOTSTAR_USERNAME,
            question: `基于以下需求分析和测试点，生成详细的功能测试用例，包括测试步骤、预期结果等：\n\n需求分析：\n${analysisContent}\n\n测试点：\n${testPoints}`
          }, {
            headers: {
              'Content-Type': 'application/json',
              'cybertron-robot-key': config.CASE_GENERATION_CYBOTSTAR_ROBOT_KEY,
              'cybertron-robot-token': config.CASE_GENERATION_CYBOTSTAR_ROBOT_TOKEN
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
          const deepseekResponse = await axios.post(config.DEEPSEEK_API_URL, {
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
              'Authorization': `Bearer ${config.DEEPSEEK_API_KEY}`,
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
      const timestamp = Date.now();
      const filename = `step_by_step_testcases_${timestamp}.xmind`;
      await generateXMindFile(testCases, filename);
      
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
        type: 'step-by-step',
        downloadUrl: `/api/download/${filename}`,
        fileName: filename
      };
      
      historyService.saveHistory(historyItem);
      
      res.json({
        success: true,
        content: testCases,
        filename: filename,
        title: title,
        downloadUrl: `/api/download/${filename}`
      });
      
    } catch (error) {
      console.error('最终测试用例生成失败:', error);
      console.error('错误堆栈:', error.stack);
      
      res.status(500).json({
        success: false,
        error: error.message || '测试用例生成失败，请重新尝试生成'
      });
    }
  });
};
