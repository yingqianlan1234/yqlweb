(() => {
  const origin = location.origin;
  const respond = (requestId, payload) => window.postMessage({ channel: 'qidian-bookmarks-extension', requestId, ...payload }, origin);
  let connected = false;
  window.addEventListener('message', async event => {
    const message = event.data;
    if (event.source !== window || event.origin !== origin || message?.channel !== 'qidian-bookmarks-page' || typeof message.requestId !== 'string') return;
    if (message.type === 'ping') return respond(message.requestId, { type: 'ready', version: '1.0.0' });
    if (message.type === 'disconnect') { connected = false; return; }
    if (message.type !== 'read') return;
    try {
      const result = await chrome.runtime.sendMessage({ type: 'QIDIAN_READ_BOOKMARKS' });
      if (result?.error || !Array.isArray(result?.tree)) throw new Error();
      connected = true; respond(message.requestId, { type: 'tree', tree: result.tree });
    } catch { respond(message.requestId, { type: 'error' }); }
  });
  // 浏览器编辑后，回到起始页时按需刷新；不轮询、不常驻读取。
  window.addEventListener('focus', () => { if (connected) window.postMessage({ channel: 'qidian-bookmarks-extension', type: 'changed' }, origin); });
})();
