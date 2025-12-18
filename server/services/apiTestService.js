const axios = require('axios');

async function executeApiTests(testCases) {
  const results = [];
  for (const tc of testCases) {
    const start = Date.now();
    try {
      const cfg = {
        method: (tc.request.method || 'GET').toLowerCase(),
        url: tc.request.url,
        headers: tc.request.headers || {},
        timeout: 30000
      };
      if (tc.request.data !== null && cfg.method !== 'get') {
        cfg.data = tc.request.data;
      }
      const resp = await axios(cfg);
      const duration = Date.now() - start;
      const status = resp.status;
      const body = resp.data;
      const rawCode = (body && typeof body === 'object') ? (body.code ?? body?.data?.code ?? body?.statusCode) : undefined;
      const normCode = rawCode == null ? undefined : String(rawCode).padStart(6, '0');
      const isCodePass = normCode === '000000';
      const success = isCodePass;
      results.push({
        name: tc.name,
        status,
        duration,
        success,
        response: body,
        code: normCode,
        request: tc.request
      });
    } catch (err) {
      const duration = Date.now() - start;
      const status = err.response?.status || 0;
      const success = false;
      results.push({
        name: tc.name,
        status: status || 'Error',
        duration,
        success,
        response: err.response?.data || { error: err.message },
        code: (err.response?.data && (err.response.data.code != null ? String(err.response.data.code).padStart(6, '0') : undefined)) || undefined,
        request: tc.request
      });
    }
  }
  const summary = {
    total: results.length,
    passed: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    passRate: results.length ? Math.round(results.filter(r => r.success).length / results.length * 100) : 0
  };
  return { summary, results };
}

module.exports = {
  executeApiTests
};







