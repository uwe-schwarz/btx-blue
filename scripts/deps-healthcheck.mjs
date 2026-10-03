#!/usr/bin/env node
import { randomUUID } from 'node:crypto';
import { spawn } from 'node:child_process';
import { readFile, writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';

function sendPing(url) {
  return new Promise((resolve) => {
    // Pass the secret URL via stdin, never process arguments; suppress all responses.
    const child = spawn('curl', [
      '--config', '-', '--silent', '--fail', '--request', 'POST',
      '--connect-timeout', '3', '--max-time', '15', '--output', '/dev/null',
    ], { stdio: ['pipe', 'ignore', 'ignore'], timeout: 16000 });
    child.once('error', () => resolve({ ok: false }));
    child.once('close', (code) => resolve({ ok: code === 0 }));
    child.stdin.on('error', () => {});
    child.stdin.end(`url = ${JSON.stringify(url.href)}\n`);
  });
}

// The caller holds the repository maintenance lock for the complete lifecycle.
export async function pingHealthcheck(action, statePath, { env = process.env, fetchImpl = sendPing } = {}) {
  if (!['start', 'success', 'fail'].includes(action) || !statePath) {
    throw new Error('Usage: deps-healthcheck.mjs start|success|fail <temporary-state-file>');
  }
  const configured = env.HEALTHCHECKS_PING_URL;
  if (!configured) throw new Error('Missing HEALTHCHECKS_PING_URL');
  let url;
  try {
    url = new URL(configured);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) throw new Error();
  } catch {
    throw new Error('Invalid HEALTHCHECKS_PING_URL: expected an HTTPS base ping URL');
  }
  let state;
  if (action === 'start') {
    state = { runId: randomUUID(), started: true, terminal: null };
    // Exclusive creation makes a repeated start fail before contacting Healthchecks.
    await writeFile(statePath, JSON.stringify(state), { flag: 'wx', mode: 0o600 });
  } else {
    state = JSON.parse(await readFile(statePath, 'utf8'));
    if (!state.started || !state.runId || state.terminal) throw new Error('Healthchecks lifecycle already ended or was not started');
    state.terminal = action;
    // Select the terminal event before sending; ambiguous delivery must not cause duplicates.
    await writeFile(statePath, JSON.stringify(state), { mode: 0o600 });
  }
  url.pathname = url.pathname.replace(/\/$/, '') + (action === 'success' ? '' : `/${action}`);
  url.searchParams.set('rid', state.runId);
  try {
    const response = await fetchImpl(url, { method: 'POST', redirect: 'error', signal: AbortSignal.timeout(15000) });
    if (!response.ok) throw new Error();
  } catch {
    // Fetch errors can contain the secret URL. Never forward them or retry blindly.
    throw new Error(`Healthchecks ${action} delivery failed or is unconfirmed; do not resend this event`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    await pingHealthcheck(process.argv[2], process.argv[3]);
    console.log(`Healthchecks ${process.argv[2]} delivered`);
  } catch (error) {
    // Filesystem error messages do not include the configured ping URL.
    console.error(error.message);
    process.exitCode = 1;
  }
}
