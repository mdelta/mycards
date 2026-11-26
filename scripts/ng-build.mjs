// Runs `ng build`, passing the Sentry DSN from the SENTRY_DSN environment variable (ADR-0018).
// Without it, the app hides the crash report and usage data switches.
import { spawnSync } from 'node:child_process';

const args = ['build', ...process.argv.slice(2)];
if (process.env.SENTRY_DSN) {
  args.push('--define', `SENTRY_DSN=${JSON.stringify(process.env.SENTRY_DSN)}`);
}
const { status } = spawnSync('ng', args, { stdio: 'inherit', shell: process.platform === 'win32' });
process.exit(status ?? 1);
