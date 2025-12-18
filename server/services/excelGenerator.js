const XLSX = require('xlsx');
const path = require('path');
const config = require('../config');

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
  
  const filePath = path.join(config.outputDir, filename);
  XLSX.writeFile(workbook, filePath);
  
  return filePath;
}

module.exports = {
  parseApiTestCasesToExcel,
  generateExcelFile
};







