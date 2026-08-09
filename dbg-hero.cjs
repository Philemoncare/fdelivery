const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const delay = (ms) => new Promise(r => setTimeout(r, ms));
function httpGet(url) { return new Promise((resolve, reject) => { http.get(url, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>{try{resolve(JSON.parse(d));}catch(e){reject(e);}}); }).on('error', reject); }); }
async function main() {
  const targets = await httpGet('http://127.0.0.1:9229/json');
  const page = targets.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  let id=0; const pending = new Map();
  ws.on('message', m => { const o = JSON.parse(m); if (o.id && pending.has(o.id)) { pending.get(o.id)(o); pending.delete(o.id); } });
  const send = (method, params={}) => new Promise(r => { const mid=++id; pending.set(mid,r); ws.send(JSON.stringify({id:mid,method,params})); });
  await new Promise(r => ws.on('open', r));
  const ev = async (expr) => { const o = await send('Runtime.evaluate', { expression: expr, awaitPromise: true, returnByValue: true }); if (o.result && o.result.exceptionDetails) return 'EXC:' + (o.result.exceptionDetails.exception?.description || o.result.exceptionDetails.text); return o.result && o.result.result ? o.result.result.value : o.result; };

  await send('Page.enable');
  await ev(`location.href='http://localhost:3000/'`);
  await delay(5000);
  const info = await ev(`(() => {
    const hero = Array.from(document.querySelectorAll('section')).find(s => /Your favorite meals/.test(s.textContent));
    return {
      path: location.pathname,
      foundHero: !!hero,
      heroText: hero ? hero.innerText : '',
      hasOldVisual: /On the move|Live Active Express Delivery/i.test(document.body.innerText),
      win: window.innerWidth + 'x' + window.innerHeight
    };
  })()`);
  console.log(JSON.stringify(info, null, 2));

  const shot = await send('Page.captureScreenshot', { format: 'png' });
  if (shot && shot.data) { fs.writeFileSync('C:/Users/PC/AppData/Local/Temp/opencode/hero-shot.png', Buffer.from(shot.data, 'base64')); console.log('SHOT TYPE:', typeof shot); if (shot && shot.data) { fs.writeFileSync('C:/Users/PC/AppData/Local/Temp/opencode/hero-shot.png', Buffer.from(shot.data, 'base64')); console.log('screenshot saved', shot.data.length); } else { console.log('shot keys:', Object.keys(shot || {})); } }
  ws.close(); process.exit(0);
}
main().catch(e=>{console.error('FATAL:',e.message);process.exit(1);});
