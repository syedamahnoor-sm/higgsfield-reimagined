#!/usr/bin/env node
// Agent capture hook for Claude Code.
// Wired in .claude/settings.json to SessionStart, UserPromptSubmit and Stop.
// Appends the verbatim prompt and the final response of each turn to
// .agent-logs/YYYY-MM-DD_HH-MM-SS_<session-id>.md. Never blocks the agent:
// every failure is swallowed and written to <tmpdir>/claude-capture/errors.log.

const fs = require('fs');
const os = require('os');
const path = require('path');
const { execSync } = require('child_process');

const REPO = path.resolve(__dirname, '..', '..');
const LOG_DIR = path.join(REPO, '.agent-logs');
const STATE_DIR = path.join(os.tmpdir(), 'claude-capture');
const CONFIG = readJson(path.join(__dirname, 'capture.config.json')) || {};

function readJson(p) {
  try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch { return null; }
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function author() {
  if (CONFIG.author) return CONFIG.author;
  try { return execSync('git config user.name', { cwd: REPO }).toString().trim(); } catch { return 'unknown'; }
}

function readTranscript(p) {
  if (!p) return [];
  let raw;
  try { raw = fs.readFileSync(p, 'utf8'); } catch { return []; }
  const out = [];
  for (const line of raw.split('\n')) {
    if (!line.trim()) continue;
    try { out.push(JSON.parse(line)); } catch { /* partial trailing line */ }
  }
  return out;
}

function lastModel(entries) {
  for (let i = entries.length - 1; i >= 0; i--) {
    const m = entries[i].type === 'assistant' && entries[i].message && entries[i].message.model;
    if (m && m !== '<synthetic>') return m;
  }
  return null;
}

function getState(sessionId) {
  return readJson(path.join(STATE_DIR, sessionId + '.json')) || {};
}

function setState(sessionId, patch) {
  fs.mkdirSync(STATE_DIR, { recursive: true });
  fs.writeFileSync(path.join(STATE_DIR, sessionId + '.json'), JSON.stringify({ ...getState(sessionId), ...patch }));
}

function cachedModel(sessionId) {
  return getState(sessionId).model || null;
}

// A "real" user prompt: typed by the person, not a tool result or meta entry.
function promptText(entry) {
  if (entry.type !== 'user' || entry.isMeta || !entry.message) return null;
  const c = entry.message.content;
  if (typeof c === 'string') return c;
  if (!Array.isArray(c) || c.some(b => b.type === 'tool_result')) return null;
  const t = c.filter(b => b.type === 'text').map(b => b.text);
  return t.length ? t.join('\n\n') : null;
}

function lastPromptIndex(entries) {
  for (let i = entries.length - 1; i >= 0; i--) if (promptText(entries[i]) !== null) return i;
  return -1;
}

// Final response = assistant text emitted after the last tool call of the turn.
function finalResponse(entries) {
  let buf = [];
  for (let i = lastPromptIndex(entries) + 1; i < entries.length; i++) {
    const e = entries[i];
    if (e.type === 'user' && promptText(e) === null && e.message && Array.isArray(e.message.content)) {
      if (e.message.content.some(b => b.type === 'tool_result')) buf = [];
      continue;
    }
    if (e.type !== 'assistant' || !e.message || !Array.isArray(e.message.content)) continue;
    for (const b of e.message.content) {
      if (b.type === 'tool_use') buf = [];
      else if (b.type === 'text' && b.text) buf.push(b.text);
    }
  }
  return buf.join('\n\n');
}

function findLog(sessionId) {
  if (!fs.existsSync(LOG_DIR)) return null;
  const f = fs.readdirSync(LOG_DIR).find(n => n.endsWith('_' + sessionId + '.md'));
  return f ? path.join(LOG_DIR, f) : null;
}

function parseFrontmatter(text) {
  const m = text.match(/^---\n([\s\S]*?)\n---\n/);
  const fm = {};
  if (m) for (const line of m[1].split('\n')) {
    const i = line.indexOf(':');
    if (i > 0) fm[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return { fm, body: m ? text.slice(m[0].length) : text };
}

function renderFrontmatter(fm) {
  const keys = ['session_id', 'date', 'author', 'model', 'tool', 'project', 'total_exchanges', 'first_prompt_time', 'last_prompt_time'];
  return '---\n' + keys.map(k => `${k}: ${fm[k]}`).join('\n') + '\n---\n';
}

function entry(type, num, short, ts, model, text, extra = '') {
  return `[LOG_ENTRY type=${type} num=${num} session=${short}]\ntimestamp: ${ts}\nmodel: ${model}\n${extra}\n${text}\n\n\n`;
}

function writeAtomic(file, text) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, text, 'utf8');
  fs.renameSync(tmp, file);
}

function load(sessionId, ts, model) {
  let file = findLog(sessionId);
  if (file) return { file, ...parseFrontmatter(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n')) };
  fs.mkdirSync(LOG_DIR, { recursive: true });
  const stamp = ts.slice(0, 19).replace('T', '_').replace(/:/g, '-');
  file = path.join(LOG_DIR, `${stamp}_${sessionId}.md`);
  const short = sessionId.slice(0, 8);
  const project = CONFIG.project || path.basename(REPO);
  const fm = {
    session_id: sessionId, date: ts.slice(0, 10), author: author(), model,
    tool: 'claude-code', project, total_exchanges: 0, first_prompt_time: ts, last_prompt_time: ts,
  };
  const body = `\n# Session Log - ${fm.date}\n\nSession: \`${short}\` | Project: \`${project}\` | Author: \`${fm.author}\`\n\n---\n\n`;
  return { file, fm, body };
}

function addModel(fm, model) {
  const list = (fm.model || '').split(',').map(s => s.trim()).filter(Boolean);
  if (model && !list.includes(model)) list.push(model);
  fm.model = list.join(', ');
}

function appendPrompt(sessionId, ts, model, text, extra) {
  const log = load(sessionId, ts, model);
  const n = Number(log.fm.total_exchanges || 0) + 1;
  log.fm.total_exchanges = n;
  log.fm.last_prompt_time = ts;
  addModel(log.fm, model);
  log.body += entry('PROMPT', n, sessionId.slice(0, 8), ts, model, text, extra);
  writeAtomic(log.file, renderFrontmatter(log.fm) + log.body);
}

function onSessionStart(input) {
  const model = input.model && (typeof input.model === 'string' ? input.model : input.model.id);
  if (model) setState(input.session_id, { model });
}

function onPrompt(input) {
  const ts = new Date().toISOString();
  const model = lastModel(readTranscript(input.transcript_path)) || cachedModel(input.session_id) || 'unknown';
  appendPrompt(input.session_id, ts, model, input.prompt);
  setState(input.session_id, { lastPrompt: input.prompt, lastResponse: null });
}

function onStop(input) {
  const ts = new Date().toISOString();
  const short = input.session_id.slice(0, 8);

  // The transcript may lag the Stop event by a moment; retry briefly.
  let entries = readTranscript(input.transcript_path);
  let text = finalResponse(entries);
  for (let i = 0; i < 10 && !text; i++) {
    sleep(200);
    entries = readTranscript(input.transcript_path);
    text = finalResponse(entries);
  }
  if (!text && typeof input.last_assistant_message === 'string') text = input.last_assistant_message;
  const model = lastModel(entries) || cachedModel(input.session_id) || 'unknown';
  const state = getState(input.session_id);
  if (text && text === state.lastResponse) return; // same Stop delivered twice

  let log = load(input.session_id, ts, model);
  let n = Number(log.fm.total_exchanges || 0);
  const promptHdr = `[LOG_ENTRY type=PROMPT num=${n} session=${short}]`;
  const respHdr = `[LOG_ENTRY type=RESPONSE num=${n} session=${short}]`;
  const pending = n > 0 && log.body.lastIndexOf(promptHdr) > log.body.lastIndexOf(respHdr);
  let extra = '';
  if (!pending) {
    const i = lastPromptIndex(entries);
    if (i < 0) return;
    const ptext = promptText(entries[i]);
    if (n > 0 && ptext === state.lastPrompt) {
      // Agent was re-invoked without a new prompt (e.g. a background task finished).
      extra = 'note: additional response to the same prompt (agent re-invoked without a new prompt)\n';
    } else {
      // UserPromptSubmit did not record this turn's prompt (e.g. the hook was
      // installed mid-turn); backfill it from the transcript so the pair is complete.
      appendPrompt(input.session_id, entries[i].timestamp || ts, model, ptext,
        'source: transcript (UserPromptSubmit hook did not record this turn)\n');
      log = load(input.session_id, ts, model);
      n = Number(log.fm.total_exchanges);
    }
  }
  addModel(log.fm, model);
  log.body += entry('RESPONSE', n, short, ts, model, text || '(no final text response found in transcript)', extra);
  writeAtomic(log.file, renderFrontmatter(log.fm) + log.body);
  setState(input.session_id, { lastPrompt: promptText(entries[lastPromptIndex(entries)] || {}) ?? state.lastPrompt, lastResponse: text });
}

let raw = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', d => (raw += d));
process.stdin.on('end', () => {
  try {
    const input = JSON.parse(raw);
    fs.mkdirSync(STATE_DIR, { recursive: true });
    fs.writeFileSync(path.join(STATE_DIR, 'last-' + input.hook_event_name + '.keys'), Object.keys(input).join('\n'));
    if (input.hook_event_name === 'SessionStart') onSessionStart(input);
    else if (input.hook_event_name === 'UserPromptSubmit') onPrompt(input);
    else if (input.hook_event_name === 'Stop') onStop(input);
  } catch (err) {
    try {
      fs.mkdirSync(STATE_DIR, { recursive: true });
      fs.appendFileSync(path.join(STATE_DIR, 'errors.log'), `${new Date().toISOString()} ${err.stack}\n`);
    } catch { /* ignore */ }
  }
  process.exit(0);
});
