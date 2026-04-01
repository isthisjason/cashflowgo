const { existsSync } = require('fs');
const path = require('path');
const { spawn, spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const backendEntrypoint = path.join(root, 'manage.py');
const backendFiles = [
  path.join(root, 'cashflowgo', 'settings.py'),
  path.join(root, 'cashflowgo', 'urls.py'),
  path.join(root, 'cashflowgo', 'wsgi.py'),
];

const children = [];
const shouldSkipBackend = process.env.CASHFLOWGO_SKIP_BACKEND === '1';

function startProcess(name, command, args, env = {}) {
  const child = spawn(command, args, {
    cwd: root,
    stdio: 'inherit',
    shell: false,
    env: { ...process.env, ...env },
  });

  child.on('exit', (code, signal) => {
    if (signal) {
      console.log(`[${name}] stopped by signal ${signal}`);
      return;
    }

    if (code !== 0) {
      console.log(`[${name}] exited with code ${code}`);
    }
  });

  children.push(child);
  return child;
}

function shutdown(signal) {
  for (const child of children) {
    if (!child.killed) {
      child.kill(signal);
    }
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

console.log('Starting frontend on http://localhost:3000');
startProcess('frontend', 'npm', ['run', 'dev:frontend'], {
  BROWSER: 'none',
  HOST: '127.0.0.1',
  PORT: '3000',
});

const missingBackendFiles = backendFiles.filter((file) => !existsSync(file));
const djangoCheck = spawnSync('python3', ['-c', 'import django'], {
  cwd: root,
  shell: false,
  stdio: 'ignore',
});

if (shouldSkipBackend) {
  console.log('Skipping backend: CASHFLOWGO_SKIP_BACKEND=1');
} else if (!existsSync(backendEntrypoint)) {
  console.log('Skipping backend: manage.py was not found at the project root.');
} else if (missingBackendFiles.length > 0) {
  console.log('Skipping backend: Django project files are missing.');
  for (const file of missingBackendFiles) {
    console.log(`Missing: ${path.relative(root, file)}`);
  }
  console.log('Once those files exist, `npm run dev` will also start the backend on http://127.0.0.1:8000.');
} else if (djangoCheck.status !== 0) {
  console.log('Skipping backend: Django is not installed for python3 in this environment.');
  console.log('Install backend dependencies, then rerun `npm run dev`.');
} else {
  console.log('Starting backend on http://127.0.0.1:8000');
  startProcess('backend', 'python3', ['manage.py', 'runserver']);
}
