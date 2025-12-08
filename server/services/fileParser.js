const fs = require('fs-extra');
const path = require('path');
const mammoth = require('mammoth');
const pdfParse = require('pdf-parse');
const XLSX = require('xlsx');
const xmindParser = require('xmindparser');
const JSZip = require('jszip');

/**
 * 文件解析服务
 */

// 解析文件（根据mimetype）
async function parseFile(filePath, mimetype) {
  try {
    if (mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' || 
        filePath.endsWith('.docx')) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (mimetype === 'application/msword' || filePath.endsWith('.doc')) {
      const result = await mammoth.extractRawText({ path: filePath });
      return result.value;
    } else if (mimetype === 'application/pdf' || filePath.endsWith('.pdf')) {
      const dataBuffer = await fs.readFile(filePath);
      const data = await pdfParse(dataBuffer);
      return data.text;
    } else {
      return await fs.readFile(filePath, 'utf8');
    }
  } catch (error) {
    console.error('文件解析错误:', error);
    throw new Error('文件解析失败，请确保文件格式正确');
  }
}

// 解析上传的文件内容（根据扩展名）
async function parseUploadedFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();
  
  try {
    switch (ext) {
      case '.docx':
        const docxResult = await mammoth.extractRawText({ path: filePath });
        return docxResult.value;
        
      case '.doc':
        try {
          const docResult = await mammoth.extractRawText({ path: filePath });
          return docResult.value;
        } catch (docError) {
          throw new Error('该.doc文件格式不受支持，请转换为.docx格式后重新上传');
        }
        
      case '.pdf':
        const pdfBuffer = await fs.readFile(filePath);
        const pdfData = await pdfParse(pdfBuffer);
        return pdfData.text;
        
      case '.xlsx':
      case '.xls':
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        return jsonData.map(row => row.join('\t')).join('\n');
        
      case '.xmind':
        try {
          const xmindData = await xmindParser.xmindToJson(filePath);
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
          const zip = new JSZip();
          const data = await fs.readFile(filePath);
          const zipContent = await zip.loadAsync(data);
          
          if (zipContent.files['content.xml']) {
            const xmlContent = await zipContent.files['content.xml'].async('string');
            return xmlContent.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim();
          }
          return '无法解析XMind文件内容';
        }
        
      case '.txt':
      case '.md':
        return await fs.readFile(filePath, 'utf8');
        
      case '.json':
        const jsonContent = await fs.readFile(filePath, 'utf8');
        return JSON.stringify(JSON.parse(jsonContent), null, 2);
        
      case '.xml':
        return await fs.readFile(filePath, 'utf8');
        
      case '.csv':
        return await fs.readFile(filePath, 'utf8');
        
      default:
        throw new Error(`不支持的文件格式: ${ext}`);
    }
  } catch (error) {
    console.error('文件解析错误:', error);
    throw new Error(`文件解析失败: ${error.message}`);
  }
}

module.exports = {
  parseFile,
  parseUploadedFile
};

