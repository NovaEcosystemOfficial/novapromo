import { execSync } from 'child_process';

const port = process.argv[2] || '3001';

function freePortWindows(targetPort) {
  try {
    const out = execSync(`netstat -ano | findstr :${targetPort}`, { encoding: 'utf8' });
    const pids = new Set();

    for (const line of out.split('\n')) {
      if (!line.includes('LISTENING')) continue;
      const pid = line.trim().split(/\s+/).pop();
      if (pid && pid !== '0') pids.add(pid);
    }

    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' });
        console.log(`[free-port] Liberata porta ${targetPort} (PID ${pid})`);
      } catch {
        console.warn(`[free-port] Impossibile terminare PID ${pid}`);
      }
    }

    if (pids.size === 0) {
      console.log(`[free-port] Porta ${targetPort} già libera`);
    }
  } catch {
    console.log(`[free-port] Porta ${targetPort} già libera`);
  }
}

if (process.platform === 'win32') {
  freePortWindows(port);
} else {
  try {
    execSync(`lsof -ti:${port} | xargs kill -9 2>/dev/null`, { stdio: 'ignore', shell: true });
  } catch {
    /* port free */
  }
}
