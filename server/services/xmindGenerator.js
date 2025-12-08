const JSZip = require('jszip');
const fs = require('fs-extra');
const path = require('path');
const config = require('../config');
const { escapeXml } = require('../utils/helpers');

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

    const hashCount = (line.match(/^#+/) || [''])[0].length;

    if (hashCount > 0) {
      flushPendingContent();

      while (currentLevel >= hashCount) {
        if (openTopics.length > 0) {
          xmlContent += openTopics.pop();
          currentLevel--;
        } else {
          break;
        }
      }

      const title = trimmedLine.replace(/^#+\s*/, '');

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

      if (hashCount < 6) {
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

  flushPendingContent();

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

