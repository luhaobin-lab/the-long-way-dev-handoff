import { existsSync } from 'node:fs';
import { chromium } from 'playwright';

/** CHROME overrides the browser; otherwise use local macOS Chrome or Playwright Chromium. */
export function launchBrowser(options = {}) {
  const macChrome = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
  const executablePath = process.env.CHROME || (existsSync(macChrome) ? macChrome : undefined);
  return chromium.launch({ ...options, ...(executablePath ? { executablePath } : {}) });
}
