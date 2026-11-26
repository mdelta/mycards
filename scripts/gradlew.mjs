// Runs the Gradle wrapper in android/ on every OS: `gradlew.bat` on Windows, `./gradlew` elsewhere.
import { spawnSync } from 'node:child_process';

const isWindows = process.platform === 'win32';
const { status } = spawnSync(isWindows ? 'gradlew.bat' : './gradlew', process.argv.slice(2), {
  cwd: 'android',
  stdio: 'inherit',
  shell: isWindows,
});
process.exit(status ?? 1);
