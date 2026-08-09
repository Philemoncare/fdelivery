import { spawn, execSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Stop any stale OmniMarket dev servers still holding our ports (kills the
// EADDRINUSE crashes that happen when an old instance is left running, e.g.
// after closing a terminal that didn't clean up its child processes).
function killStaleServers(ports) {
  let netstatOut = '';
  try {
    netstatOut = execSync('netstat -ano').toString();
  } catch (e) {
    return;
  }
  const listening = netstatOut.split(/\r?\n/).filter(line => /LISTENING/.test(line));
  for (const port of ports) {
    const pattern = new RegExp(`:${port}\\s`);
    for (const line of listening) {
      if (!pattern.test(line)) continue;
      const cols = line.trim().split(/\s+/);
      const pid = cols[cols.length - 1];
      if (!pid || !/^\d+$/.test(pid) || Number(pid) === process.pid) continue;
      try {
        execSync(`taskkill /PID ${pid} /T /F`);
        console.log(`[cleanup] Stopped stale process ${pid} using port ${port}`);
      } catch (e) {
        // Already gone
      }
    }
  }
}

function runCommand(command, args, name) {
  console.log(`[${name}] Executing: ${command} ${args.join(' ')}`);

  const child = spawn(command, args, {
    cwd: projectRoot,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, FORCE_COLOR: 'true' }
  });

  child.on('error', (err) => {
    console.error(`Failed to start ${name}:`, err);
  });

  child.on('close', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`${name} process exited with code ${code}`);
    }
  });

  return child;
}

const serverPath = './node_modules/tsx/dist/cli.mjs';
const vitePath = './node_modules/vite/bin/vite.js';

console.log('Starting OmniMarket Development Environment...');
console.log('Using relative paths to bypass ampersand issues.');

// Free the ports before spawning so a fresh start always succeeds.
killStaleServers([3000, 3999]);

runCommand('node', [serverPath, 'watch', 'server.ts'], 'Backend Server');
runCommand('node', [vitePath, '--port=3000', '--host=0.0.0.0'], 'Frontend Client');
