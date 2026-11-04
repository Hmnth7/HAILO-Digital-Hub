import { spawn } from 'child_process';

async function main() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=/tmp/diag-' + Date.now(),
    'http://localhost:3000/login'
  ]);

  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      if (res.ok) {
        ready = true;
        break;
      }
    } catch (e) {
      // wait
    }
    await new Promise(r => setTimeout(r, 200));
  }

  if (!ready) {
    console.error('Failed to connect to 9222');
    chrome.kill();
    process.exit(1);
  }

  const jsonRes = await fetch('http://127.0.0.1:9222/json');
  const targets = await jsonRes.json();
  const pageTarget = targets.find(t => t.type === 'page');
  const ws = new WebSocket(pageTarget.webSocketDebuggerUrl);

  let idCounter = 1;
  const pending = new Map();
  function send(method, params = {}) {
    return new Promise((resolve, reject) => {
      const id = idCounter++;
      pending.set(id, { resolve, reject });
      ws.send(JSON.stringify({ id, method, params }));
    });
  }

  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve } = pending.get(data.id);
      pending.delete(data.id);
      resolve(data.result);
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true });
    return res.result?.value;
  }

  console.log('Initial Path:', await evaluate('window.location.pathname'));
  
  // Wait for React to mount buttons
  for (let i = 0; i < 20; i++) {
    const count = await evaluate(`document.querySelectorAll('button').length`);
    if (count > 0) break;
    await new Promise(r => setTimeout(r, 200));
  }

  // Find all buttons on page
  const buttonsText = await evaluate(`
    Array.from(document.querySelectorAll('button')).map(b => b.innerText.trim()).join(' | ')
  `);
  console.log('Buttons on page:', buttonsText);

  // Click Customer Demo
  const clickRes = await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const customerBtn = btns.find(b => b.innerText.includes('Customer Demo'));
      if (!customerBtn) return 'Customer Demo button NOT found';
      customerBtn.click();
      return 'Clicked!';
    })()
  `);
  console.log('Click result:', clickRes);

  await new Promise(r => setTimeout(r, 1200));
  console.log('Path after click:', await evaluate('window.location.pathname'));
  console.log('Body snippet after click:', (await evaluate('document.body.innerText')).substring(0, 300));

  ws.close();
  chrome.kill();
  process.exit(0);
}

main().catch(console.error);
