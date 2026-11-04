import { spawn } from 'child_process';

async function main() {
  const chrome = spawn('/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', [
    '--headless=new',
    '--remote-debugging-port=9222',
    '--disable-gpu',
    '--no-sandbox',
    '--user-data-dir=/tmp/test-report-' + Date.now(),
    'http://localhost:3000/report/BIN-003'
  ]);

  let ready = false;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch('http://127.0.0.1:9222/json');
      if (res.ok) {
        ready = true;
        break;
      }
    } catch (e) {}
    await new Promise(r => setTimeout(r, 200));
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

  const consoleLogs = [];
  ws.onmessage = (event) => {
    const data = JSON.parse(event.data);
    if (data.id && pending.has(data.id)) {
      const { resolve } = pending.get(data.id);
      pending.delete(data.id);
      resolve(data.result);
    }
    if (data.method === 'Runtime.consoleAPICalled') {
      consoleLogs.push(data.params.args.map(a => a.value || a.description).join(' '));
    }
  };

  await new Promise(r => ws.onopen = r);
  await send('Runtime.enable');

  async function evaluate(expression) {
    const res = await send('Runtime.evaluate', { expression, returnByValue: true });
    return res.result?.value;
  }

  // Wait for React
  for (let i = 0; i < 20; i++) {
    const count = await evaluate(`document.querySelectorAll('button').length`);
    if (count > 0) break;
    await new Promise(r => setTimeout(r, 200));
  }

  console.log('Page title:', await evaluate('document.title'));
  console.log('Current pathname:', await evaluate('window.location.pathname'));
  console.log('Has BIN-003:', (await evaluate('document.body.innerText')).includes('BIN-003'));
  console.log('Has Hostel:', (await evaluate('document.body.innerText')).includes('Hostel'));

  // Select "Bin is Full" and click submit
  const res = await evaluate(`
    (() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const fullBtn = btns.find(b => b.innerText.includes('Bin is Full'));
      if (fullBtn) fullBtn.click();

      const textarea = document.querySelector('textarea');
      if (textarea) {
        textarea.value = 'Hostel dustbin is full and overflowing with garbage.';
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
      }

      const form = document.querySelector('form');
      const submitBtn = form.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.click();
        return 'Clicked Submit Button!';
      }
      return 'Submit button not found';
    })()
  `);
  console.log('Form submission result:', res);

  // Wait for submission timeout
  await new Promise(r => setTimeout(r, 1500));

  console.log('Pathname after submit:', await evaluate('window.location.pathname'));
  const bodyText = await evaluate('document.body.innerText');
  console.log('Body snippet after submit:', bodyText.substring(0, 400));
  console.log('Console logs during run:', consoleLogs);

  ws.close();
  chrome.kill();
  process.exit(0);
}

main().catch(console.error);
