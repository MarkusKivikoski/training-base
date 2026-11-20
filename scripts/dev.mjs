// Starts the API and the web dev server together; Ctrl+C stops both.
// A tiny stand-in for `concurrently`, to avoid a dependency.
import { spawn } from 'node:child_process';

const procs = [
  ['api', ['run', 'dev', '-w', '@app/api']],
  ['web', ['run', 'dev', '-w', '@app/web']],
].map(([name, args]) => {
  const child = spawn('npm', args, { stdio: ['ignore', 'pipe', 'pipe'], shell: true });
  const prefix = (chunk) =>
    chunk
      .toString()
      .split(/\r?\n/)
      .filter(Boolean)
      .map((line) => `[${name}] ${line}`)
      .join('\n') + '\n';
  child.stdout.on('data', (c) => process.stdout.write(prefix(c)));
  child.stderr.on('data', (c) => process.stderr.write(prefix(c)));
  child.on('exit', (code) => {
    console.log(`[${name}] exited with code ${code}`);
    shutdown(code ?? 0);
  });
  return child;
});

let stopping = false;
function shutdown(code) {
  if (stopping) return;
  stopping = true;
  for (const p of procs) if (p.exitCode === null) p.kill();
  process.exitCode = code;
}
process.on('SIGINT', () => shutdown(0));
process.on('SIGTERM', () => shutdown(0));
