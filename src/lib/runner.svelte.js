// Runs the automatic checks through the viewer's Microsoft Learn connector.

import { app, ui } from './store.svelte.js';
import { CHECKS, SERVER, TOOL, evaluate, textOf, FATAL_CODES, friendlyError } from './verify.js';

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function withTimeout(p, ms) {
  let t;
  const timeout = new Promise((_, rej) => {
    t = setTimeout(() => rej({ code: 'timeout' }), ms);
  });
  return Promise.race([p, timeout]).finally(() => clearTimeout(t));
}

async function fetchOnce(mcp, url) {
  const res = await withTimeout(mcp.callTool(SERVER, TOOL, { url }), 45000);
  return textOf(res);
}

async function fetchPage(mcp, url) {
  try {
    return await fetchOnce(mcp, url);
  } catch (e) {
    if (e && e.retryable === true && !FATAL_CODES.has(e.code)) {
      await sleep(Math.min(e.retryAfterMs || 1500, 8000) + Math.random() * 500);
      return fetchOnce(mcp, url);
    }
    throw e;
  }
}

export async function runChecks() {
  if (ui.checking) return;
  ui.checking = true;
  ui.checkState = 'running';
  ui.checkMsg = 'Checking Microsoft Learn…';

  let mcp = null;
  try {
    mcp = window.claude && typeof window.claude.use === 'function' ? await window.claude.use('mcp') : null;
  } catch {
    mcp = null;
  }
  if (!mcp) {
    ui.checkState = 'unavailable';
    ui.checkMsg = 'Automatic checks run only when this page is open in claude.ai with the Microsoft Learn connector. Use the Open source links to check by hand.';
    ui.checking = false;
    return;
  }

  let blocked = null;
  let failures = 0;
  for (const id of Object.keys(CHECKS)) {
    const now = Date.now();
    try {
      const text = await fetchPage(mcp, CHECKS[id].url);
      app.verify.results[id] = evaluate(id, text, now);
    } catch (e) {
      const code = e && e.code ? e.code : 'unknown';
      if (FATAL_CODES.has(code)) {
        blocked = code;
        break;
      }
      failures++;
      app.verify.results[id] = { status: 'error', code, checkedAt: now, message: friendlyError(code) };
    }
  }

  if (blocked) {
    ui.checkState = 'blocked';
    ui.checkMsg = friendlyError(blocked);
  } else {
    app.verify.checkedAt = Date.now();
    const changed = Object.values(app.verify.results).filter((r) => r.status === 'changed').length;
    ui.checkState = 'done';
    ui.checkMsg = failures
      ? `Checked with ${failures} page${failures > 1 ? 's' : ''} that could not be read.`
      : changed
        ? `${changed} source${changed > 1 ? 's' : ''} changed since the build. The app now shows the new values.`
        : 'All automatic sources match what the app shows.';
  }
  ui.checking = false;
}
