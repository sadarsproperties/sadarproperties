import { execSync } from 'child_process';

const PORTS = [3001, 5173];

function freePortWindows(port) {
  try {
    const output = execSync(`netstat -ano | findstr :${port}`, { encoding: 'utf8' });
    const pids = new Set();

    for (const line of output.split('\n')) {
      if (!line.includes('LISTENING')) continue;
      const parts = line.trim().split(/\s+/);
      const pid = parts[parts.length - 1];
      if (pid && pid !== '0') pids.add(pid);
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[start] Freed port ${port} (PID ${pid})`);
      } catch {
        // Process may have already exited.
      }
    }
  } catch {
    // Port not in use.
  }
}

function freePortUnix(port) {
  try {
    execSync(`lsof -ti tcp:${port} | xargs kill -9 2>/dev/null || true`, {
      shell: true,
      stdio: 'ignore',
    });
    console.log(`[start] Freed port ${port}`);
  } catch {
    // Port not in use.
  }
}

for (const port of PORTS) {
  if (process.platform === 'win32') {
    freePortWindows(port);
  } else {
    freePortUnix(port);
  }
}