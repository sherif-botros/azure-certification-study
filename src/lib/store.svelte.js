// Application state, persistence (browser storage plus the artifact's per-person database) and mutations.

import { untrack } from 'svelte';
import { STAGES } from './data.js';
import { todayISO, addDays } from './dates.js';

const KEY = 'sbae.v1';

export function defaults() {
  return {
    version: 1,
    setupDone: false,
    done: {}, // item id -> ISO date completed
    hours: {}, // item id -> hours override
    eventDates: {}, // item id -> ISO date (session or exam)
    notes: {}, // item id -> text
    position: null, // item id chosen as "where I am"
    settings: {
      startDate: todayISO(),
      hoursPerWeek: 10,
      studyDays: [1, 2, 3, 4, 5, 6],
      include: { setup: true, pl900: true, ab400: true, ab100: true },
      targetDates: { pl900: '', ab400: '', ab100: '' },
      levels: { csharp: 'strong', azure: 'strong', dataverse: 'new', powerapps: 'new', automate: 'some', copilot: 'new', d365: 'new', ai: 'some' },
    },
    verify: { checkedAt: null, results: {} },
    manualChecks: {}, // fact id -> ISO date
    updatedAt: 0,
  };
}

function merge(base, saved) {
  if (!saved || typeof saved !== 'object') return base;
  const out = { ...base, ...saved };
  out.settings = {
    ...base.settings,
    ...(saved.settings || {}),
    include: { ...base.settings.include, ...(saved.settings?.include || {}) },
    targetDates: { ...base.settings.targetDates, ...(saved.settings?.targetDates || {}) },
    levels: { ...base.settings.levels, ...(saved.settings?.levels || {}) },
  };
  out.verify = { checkedAt: saved.verify?.checkedAt ?? null, results: saved.verify?.results || {} };
  for (const k of ['done', 'hours', 'eventDates', 'notes', 'manualChecks']) out[k] = { ...(saved[k] || {}) };
  return out;
}

export const app = $state(defaults());

export const ui = $state({
  tab: 'overview',
  sync: 'local', // local | connecting | synced | error
  syncMsg: '',
  remoteChecked: false,
  storage: 'unknown', // ok | unavailable
  checking: false,
  checkState: 'idle', // idle | running | done | blocked | unavailable
  checkMsg: '',
  positionOpen: false,
  welcomeDismissed: false,
});

export function allItemsInOrder() {
  return STAGES.filter((s) => s.items && app.settings.include[s.id] !== false).flatMap((s) => s.items);
}

// ---------------------------------------------------------------- mutations
export function setDone(id, value) {
  if (value) app.done[id] = todayISO();
  else delete app.done[id];
}
export function setHours(id, value) {
  if (value === '' || value === null || Number.isNaN(Number(value))) delete app.hours[id];
  else app.hours[id] = Number(value);
}
export function setEventDate(id, value) {
  if (value) app.eventDates[id] = value;
  else delete app.eventDates[id];
}
export function setNote(id, value) {
  if (value) app.notes[id] = value;
  else delete app.notes[id];
}
export function markChecked(factId) {
  app.manualChecks[factId] = todayISO();
}
export function setPosition(itemId, { markEarlier = true, resetFromHere = false } = {}) {
  const list = allItemsInOrder();
  const idx = list.findIndex((i) => i.id === itemId);
  if (idx < 0) return;
  const today = todayISO();
  if (markEarlier) for (let i = 0; i < idx; i++) if (!app.done[list[i].id]) app.done[list[i].id] = today;
  if (resetFromHere) for (let i = idx; i < list.length; i++) delete app.done[list[i].id];
  app.position = itemId;
  app.setupDone = true;
}
export function pauseStudy(days) {
  app.settings.startDate = addDays(todayISO(), Math.max(0, Number(days) || 0));
}
export function exportJson() {
  const { verify, ...rest } = $state.snapshot(app);
  return JSON.stringify(rest, null, 2);
}
export function importJson(text) {
  const parsed = JSON.parse(text);
  if (!parsed || typeof parsed !== 'object' || typeof parsed.done !== 'object') throw new Error('This is not a saved study state.');
  const next = merge(defaults(), parsed);
  next.verify = { checkedAt: app.verify.checkedAt, results: $state.snapshot(app.verify.results) };
  Object.assign(app, next);
  app.setupDone = true;
  app.updatedAt = Date.now();
}

// ---------------------------------------------------------------- persistence
let lastContent = '';
let remoteApplied = false;
let saveTimer = null;
let ref = null;
let writing = Promise.resolve();
let unsub = null;

function readLocal() {
  try {
    const raw = window.localStorage.getItem(KEY);
    ui.storage = 'ok';
    return raw ? JSON.parse(raw) : null;
  } catch {
    ui.storage = 'unavailable';
    return null;
  }
}

function writeLocal(snap) {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(snap));
    ui.storage = 'ok';
  } catch {
    ui.storage = 'unavailable';
  }
}

export function loadLocal() {
  const saved = readLocal();
  if (saved) Object.assign(app, merge(defaults(), saved));
  lastContent = contentOf($state.snapshot(app));
}

function contentOf(snap) {
  const { updatedAt, ...rest } = snap;
  return JSON.stringify(rest);
}

function applyRemote(state, updatedAt) {
  remoteApplied = true;
  Object.assign(app, merge(defaults(), state));
  app.updatedAt = updatedAt;
  writeLocal($state.snapshot(app));
}

function queueRemoteWrite() {
  if (!ref) return;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    const snap = $state.snapshot(app);
    writing = writing
      .then(() => ref.set({ state: snap, updatedAt: snap.updatedAt }))
      .then(() => {
        ui.sync = 'synced';
        ui.syncMsg = '';
      })
      .catch((e) => {
        ui.sync = 'error';
        ui.syncMsg = e?.code || 'write failed';
      });
  }, 900);
}

export function startPersistence() {
  return $effect.root(() => {
    $effect(() => {
      const snap = $state.snapshot(app);
      const content = contentOf(snap);
      if (remoteApplied) {
        remoteApplied = false;
        lastContent = content;
        return;
      }
      if (content === lastContent) return;
      lastContent = content;
      untrack(() => {
        app.updatedAt = Date.now();
        writeLocal($state.snapshot(app));
        queueRemoteWrite();
      });
    });
  });
}

export async function initRemote() {
  const timer = setTimeout(() => {
    ui.remoteChecked = true;
  }, 4000);
  try {
    const c = window.claude;
    if (!c || typeof c.use !== 'function') throw new Error('no runtime');
    const [user, db] = await Promise.all([c.use('user'), c.use('db')]);
    const id = user ? await user.id() : null;
    if (!db || !id) throw new Error('no db');
    ref = db.doc(`data/users/${id}/progress`);
    ui.sync = 'connecting';
    unsub = ref.onSnapshot(
      (snap) => {
        clearTimeout(timer);
        ui.remoteChecked = true;
        ui.sync = snap.metadata.fromCache ? 'connecting' : 'synced';
        const d = snap.exists ? snap.data() : null;
        if (d && d.state && Number(d.updatedAt) > (app.updatedAt || 0)) applyRemote(d.state, Number(d.updatedAt));
        else if (app.setupDone && (!d || Number(d.updatedAt) < (app.updatedAt || 0))) queueRemoteWrite();
      },
      (err) => {
        clearTimeout(timer);
        ui.remoteChecked = true;
        ui.sync = 'error';
        ui.syncMsg = err?.code || 'unavailable';
      },
    );
  } catch {
    clearTimeout(timer);
    ui.sync = 'local';
    ui.remoteChecked = true;
  }
}

export function stopRemote() {
  if (unsub) unsub();
}
