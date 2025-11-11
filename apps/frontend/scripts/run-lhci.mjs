import { chromium } from 'playwright-core';
import { spawn } from 'node:child_process';
import { promises as fs } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const chromePath = chromium.executablePath();
const wrapperPath = join(tmpdir(), 'lhci-chrome-wrapper.sh');

await fs.writeFile(
  wrapperPath,
  `#!/bin/bash\n"${chromePath}" --headless=new --no-sandbox --disable-dev-shm-usage "$@"\n`,
  { mode: 0o755 }
);

const child = spawn('lhci', ['autorun', '--config', './lighthouserc.json'], {
  stdio: 'inherit',
  env: { ...process.env, LHCI_CHROME_PATH: wrapperPath }
});

child.on('exit', (code) => {
  process.exit(code ?? 1);
});
