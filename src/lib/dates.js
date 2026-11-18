// Date helpers. All dates are local calendar dates as 'YYYY-MM-DD' strings.

const pad = (n) => String(n).padStart(2, '0');

export function toISO(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
export function fromISO(s) {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}
export function todayISO() {
  return toISO(new Date());
}
export function addDays(iso, n) {
  const d = fromISO(iso);
  d.setDate(d.getDate() + n);
  return toISO(d);
}
export function diffDays(a, b) {
  return Math.round((fromISO(b) - fromISO(a)) / 86400000);
}
export function maxISO(a, b) {
  return a >= b ? a : b;
}
export function weekday(iso) {
  return fromISO(iso).getDay(); // 0 = Sunday
}
export function mondayOf(iso) {
  const w = weekday(iso);
  return addDays(iso, w === 0 ? -6 : 1 - w);
}
export function nextStudyDay(iso, days) {
  let d = iso;
  for (let i = 0; i < 14; i++) {
    if (days.includes(weekday(d))) return d;
    d = addDays(d, 1);
  }
  return iso;
}
export function addBusinessDays(iso, n) {
  let d = iso;
  let left = n;
  while (left > 0) {
    d = addDays(d, 1);
    const w = weekday(d);
    if (w !== 0 && w !== 6) left--;
  }
  return d;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// 'July 24, 2026' -> '2026-07-24'
export function parseLongDate(s) {
  const m = /^([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})$/.exec(String(s).trim());
  if (!m) return null;
  const mi = MONTHS.findIndex((x) => x.toLowerCase() === m[1].toLowerCase());
  if (mi < 0) return null;
  return `${m[3]}-${pad(mi + 1)}-${pad(Number(m[2]))}`;
}

const fDay = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short' });
const fFull = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', year: 'numeric' });
const fLong = new Intl.DateTimeFormat('en-AU', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
const fTime = new Intl.DateTimeFormat('en-AU', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' });

export const fmtDay = (iso) => (iso ? fDay.format(fromISO(iso)) : '');
export const fmtFull = (iso) => (iso ? fFull.format(fromISO(iso)) : '');
export const fmtLong = (iso) => (iso ? fLong.format(fromISO(iso)) : '');
export const fmtTime = (ms) => (ms ? fTime.format(new Date(ms)) : '');

export function relative(iso, today) {
  const n = diffDays(today, iso);
  if (n === 0) return 'today';
  if (n === 1) return 'tomorrow';
  if (n === -1) return 'yesterday';
  return n > 0 ? `in ${n} days` : `${-n} days ago`;
}
