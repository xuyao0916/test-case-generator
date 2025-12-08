/**
 * 通用路由模块
 */

module.exports = function(app) {
  const axios = require('axios');
  const upload = app.locals.upload;

  // 健康检查
  app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', message: '测试用例生成平台运行正常' });
  });

  // 服务端代理请求，避免浏览器跨域限制
  app.post('/api/proxy-request', async (req, res) => {
    try {
      const { method, url, headers, data, timeout } = req.body || {};
      if (!url || !/^https?:\/\//i.test(url)) {
        return res.status(400).json({ success: false, error: 'URL无效，仅支持http/https' });
      }
      const m = (method || 'GET').toLowerCase();
      const start = Date.now();
      const cfg = { method: m, url, headers: headers || {}, timeout: timeout || 30000, validateStatus: () => true };
      if (m !== 'get' && data !== undefined) cfg.data = data;
      const resp = await axios(cfg);
      const duration = Date.now() - start;
      res.json({ success: true, status: resp.status, data: resp.data, headers: resp.headers, duration, request: { method: method || 'GET', url, headers: headers || {}, body: data ?? null } });
    } catch (error) {
      const duration = typeof error.config?.startTime === 'number' ? Date.now() - error.config.startTime : undefined;
      res.status(200).json({ success: false, status: 'Error', error: error.message, duration, request: { method: req.body?.method || 'GET', url: req.body?.url, headers: req.body?.headers || {}, body: req.body?.data ?? null } });
    }
  });
};

