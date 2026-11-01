const fs = require('node:fs');
const path = require('node:path');
const { spawn } = require('node:child_process');

const root = path.resolve(__dirname, '..');
const stateFile = path.join(root, 'tmp', 'mobile-access.json');
const executable = path.join(root, 'node_modules', '.cache', 'cloudflared', 'cloudflared.exe');

async function main() {
  if (process.argv.includes('--stop')) {
    if (!fs.existsSync(stateFile)) return console.log('No mobile tunnel is running.');
    const state = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    try { process.kill(state.pid); } catch (error) { if (error.code !== 'ESRCH') throw error; }
    fs.rmSync(stateFile, { force: true });
    return console.log('Mobile HTTPS tunnel stopped.');
  }
  if (!fs.existsSync(executable)) throw new Error('Install cloudflared at node_modules/.cache/cloudflared/cloudflared.exe from https://github.com/cloudflare/cloudflared/releases');
  const response = await fetch('http://127.0.0.1:3000/login', { signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Local web is unavailable: HTTP ${response.status}`);
  if (fs.existsSync(stateFile)) {
    const previous = JSON.parse(fs.readFileSync(stateFile, 'utf8'));
    try { process.kill(previous.pid, 0); return console.log(`Already running: ${previous.url}`); }
    catch (error) { if (error.code !== 'ESRCH') throw error; }
  }
  const child = spawn(executable, ['tunnel', '--url', 'http://127.0.0.1:3000', '--protocol', 'http2', '--no-autoupdate'], { cwd: root, windowsHide: true });
  fs.mkdirSync(path.dirname(stateFile), { recursive: true });
  let tail = '', saved = false;
  const report = chunk => {
    const text = chunk.toString(); process.stdout.write(text);
    tail = (tail + text).slice(-16000);
    const match = tail.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
    if (!match || saved) return;
    saved = true;
    const url = match[0];
    const envFile = path.join(root, '.env.local');
    const env = fs.existsSync(envFile) ? fs.readFileSync(envFile, 'utf8') : '';
    const line = `MOBILE_DEV_ORIGIN=${new URL(url).hostname}`;
    fs.writeFileSync(envFile, /^MOBILE_DEV_ORIGIN=.*$/m.test(env) ? env.replace(/^MOBILE_DEV_ORIGIN=.*$/m, line) : `${env.trimEnd()}\n${line}\n`);
    fs.writeFileSync(stateFile, JSON.stringify({ pid: child.pid, url, checkinUrl: `${url}/dashboard/faculty-officer/checkin` }, null, 2));
    console.log(`\nPHONE: ${url}/dashboard/faculty-officer/checkin\nStop sharing: npm run mobile:stop\n`);
  };
  child.stdout.on('data', report); child.stderr.on('data', report);
  child.on('error', error => { console.error(error.message); process.exitCode = 1; });
  const stop = () => { child.kill(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop);
  child.on('exit', code => {
    if (fs.existsSync(stateFile) && JSON.parse(fs.readFileSync(stateFile, 'utf8')).pid === child.pid) fs.rmSync(stateFile, { force: true });
    process.exitCode = code || 0;
  });
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
