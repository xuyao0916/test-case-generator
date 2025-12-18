/**
 * cURL解析工具
 */

function parseCurlToRequest(curlText) {
  if (!curlText || typeof curlText !== 'string') {
    throw new Error('未提供有效的cURL命令');
  }
  const text = curlText.trim();
  if (!text.startsWith('curl')) {
    throw new Error('cURL命令必须以 curl 开头');
  }

  const tokens = [];
  let current = '';
  let inSingle = false;
  let inDouble = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (ch === "'" && !inDouble) { inSingle = !inSingle; continue; }
    if (ch === '"' && !inSingle) { inDouble = !inDouble; continue; }
    if (!inSingle && !inDouble && /\s/.test(ch)) {
      if (current.length) { tokens.push(current); current = ''; }
    } else {
      current += ch;
    }
  }
  if (current.length) tokens.push(current);

  // 移除首个 curl
  if (tokens[0] === 'curl') tokens.shift();

  let method = 'GET';
  let url = '';
  const headers = {};
  let body = null;

  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i];
    if ((t === '-X' || t === '--request') && tokens[i+1]) {
      method = tokens[i+1].toUpperCase();
      i++;
      continue;
    }
    if ((t === '-H' || t === '--header') && tokens[i+1]) {
      const hv = tokens[i+1];
      const sepIndex = hv.indexOf(':');
      if (sepIndex > -1) {
        const key = hv.slice(0, sepIndex).trim();
        const val = hv.slice(sepIndex + 1).trim();
        headers[key] = val;
      }
      i++;
      continue;
    }
    if ((t === '-d' || t === '--data' || t === '--data-raw' || t === '--data-binary') && tokens[i+1]) {
      const dv = tokens[i+1];
      // 尝试解析为JSON，否则当作字符串
      try {
        body = JSON.parse(dv);
      } catch {
        // 尝试解析为 key=value& 格式
        if (dv.includes('=') && dv.includes('&')) {
          const obj = {};
          dv.split('&').forEach(pair => {
            const [k, v] = pair.split('=');
            obj[decodeURIComponent(k)] = decodeURIComponent(v || '');
          });
          body = obj;
        } else {
          body = dv;
        }
      }
      i++;
      continue;
    }
    if (!t.startsWith('-') && !url) {
      url = t;
    }
  }

  // 如果URL仍为空，尝试最后一个非选项token
  if (!url) {
    const lastNonOption = [...tokens].reverse().find(x => !x.startsWith('-'));
    if (lastNonOption) url = lastNonOption;
  }

  return { method, url, headers, body };
}

function generateCombinationCases(baseReq) {
  const cases = [];
  const { method, url, headers, body } = baseReq;

  const baseCase = {
    name: '正常请求',
    request: { method, url, headers: { ...headers }, data: body ?? null },
    expectStatus: 200,
    negative: false
  };
  cases.push(baseCase);

  const urlObj = (() => { try { return new URL(url); } catch { return null; } })();
  const queryParams = {};
  if (urlObj) {
    urlObj.searchParams.forEach((v, k) => { queryParams[k] = v; });
  }

  const bodyObj = typeof body === 'object' && body !== null ? body : {};

  const keys = [...Object.keys(queryParams), ...Object.keys(bodyObj)];
  keys.forEach(k => {
    // 缺失参数
    const c1 = {
      name: `缺失参数 ${k}`,
      request: { method, url, headers: { ...headers }, data: { ...bodyObj } },
      expectStatus: 400,
      negative: true
    };
    if (k in c1.request.data) delete c1.request.data[k];
    cases.push(c1);

    // 空值
    const c2 = {
      name: `空值参数 ${k}`,
      request: { method, url, headers: { ...headers }, data: { ...bodyObj, [k]: '' } },
      expectStatus: 400,
      negative: true
    };
    cases.push(c2);

    // 类型错误
    const v = bodyObj[k];
    let wrongVal = Array.isArray(v) ? {} : (typeof v === 'number' ? 'abc' : (typeof v === 'string' ? 123 : []));
    const c3 = {
      name: `类型错误 ${k}`,
      request: { method, url, headers: { ...headers }, data: { ...bodyObj, [k]: wrongVal } },
      expectStatus: 400,
      negative: true
    };
    cases.push(c3);

    // 边界值（长字符串）
    const c4 = {
      name: `边界值长度 ${k}`,
      request: { method, url, headers: { ...headers }, data: { ...bodyObj, [k]: 'x'.repeat(256) } },
      expectStatus: 400,
      negative: true
    };
    cases.push(c4);
  });

  // 头部缺失 Content-Type
  if (headers && headers['Content-Type']) {
    cases.push({
      name: '缺失Content-Type',
      request: { method, url, headers: Object.fromEntries(Object.entries(headers).filter(([hk]) => hk !== 'Content-Type')), data: body ?? null },
      expectStatus: 400,
      negative: true
    });
  }

  return cases;
}

module.exports = {
  parseCurlToRequest,
  generateCombinationCases
};







