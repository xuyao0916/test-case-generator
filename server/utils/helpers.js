/**
 * 工具函数模块
 */

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

// XML转义函数
function escapeXml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

module.exports = {
  extractTitle,
  escapeXml
};







