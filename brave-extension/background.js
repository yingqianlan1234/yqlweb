const allowedPage = value => {
  try { const url = new URL(value); return url.origin === 'https://yingqianlan1234.github.io' && url.pathname.startsWith('/yqlweb/'); } catch { return false; }
};
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message?.type !== 'QIDIAN_READ_BOOKMARKS' || !allowedPage(sender.url)) return;
  chrome.bookmarks.getTree().then(tree => reply({ tree })).catch(() => reply({ error: '无法读取书签，请检查扩展权限。' }));
  return true;
});
