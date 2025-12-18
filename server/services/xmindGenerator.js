const JSZip = require('jszip');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');
const { escapeXml } = require('../utils/helpers');

// 将测试用例内容转换为XMind XML格式
function convertToXMindXML(content) {
  const lines = content.split('\n');
  
  // 先解析所有节点，构建树结构
  const nodes = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const hashCount = (line.match(/^#+/) || [''])[0].length;
    if (hashCount > 0) {
      const title = trimmedLine.replace(/^#+\s*/, '');
      nodes.push({
        level: hashCount,
        title: title,
        isStep: /步骤\d*[:：]/.test(title) || (title.includes('步骤') && !title.includes('结果')),
        isResult: /结果\d*[:：]/.test(title) || (title.includes('结果') && !title.includes('步骤')),
        isTestCase: /^tc-/i.test(title.trim()),
        lineIndex: i
      });
    }
  }

  // 检查每个步骤节点是否有对应的结果节点作为子节点
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    if (node.isStep) {
      // 查找下一个同级或更高级的节点，在这之间的所有更深层级的节点都是子节点
      let hasResultChild = false;
      for (let j = i + 1; j < nodes.length; j++) {
        const nextNode = nodes[j];
        if (nextNode.level <= node.level) {
          // 遇到同级或更高级节点，停止查找
          break;
        }
        if (nextNode.isResult && nextNode.level === node.level + 1) {
          // 找到结果节点作为直接子节点
          hasResultChild = true;
          break;
        }
      }
      node.hasResultChild = hasResultChild;
    }
  }

  // 构建XML内容
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

  // 处理每个节点
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const nextNode = i < nodes.length - 1 ? nodes[i + 1] : null;

    // 关闭不需要的topic
    while (currentLevel >= node.level) {
      if (openTopics.length > 0) {
        xmlContent += openTopics.pop();
        currentLevel--;
      } else {
        break;
      }
    }

    // 检查节点是否有子节点
    let hasChildren = false;
    if (nextNode) {
      // 如果下一个节点的层级更深，说明当前节点有子节点
      if (nextNode.level > node.level) {
        hasChildren = true;
      }
      // 如果当前节点是步骤节点，且下一个节点是结果节点且层级正确
      if (node.isStep && node.hasResultChild) {
        hasChildren = true;
      }
    }

    // 生成topic节点
    xmlContent += `\n          <topic id="topic${topicId}">
            <title>${escapeXml(node.title)}</title>`;

    // 如果节点有子节点，需要添加children
    if (hasChildren) {
      xmlContent += `\n            <children>
              <topics type="attached">`;
      openTopics.push(`\n              </topics>
            </children>
          </topic>`);
      currentLevel = node.level;
    } else {
      // 叶子节点，直接关闭
      xmlContent += `\n          </topic>`;
    }

    topicId++;
  }

  // 关闭所有打开的topic
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

// 生成XMind文件
async function generateXMindFile(content, fileName) {
  const zip = new JSZip();
  const xmindContent = convertToXMindXML(content);

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

  const buffer = await zip.generateAsync({type: 'nodebuffer'});
  const filePath = path.join(config.outputDir, fileName);
  await fs.writeFile(filePath, buffer);

  return filePath;
}

module.exports = {
  generateXMindFile,
  convertToXMindXML
};







