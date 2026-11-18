// Automatic checks against Microsoft Learn pages.
// Extractors are pure (text in, facts out) so they can be tested against saved page text.

import { parseLongDate, fmtFull } from './dates.js';

export const LEARN = 'https://learn.microsoft.com';
export const SERVER = 'Microsoft Learn'; // connector display name
export const TOOL = 'microsoft_docs_fetch';

const DATE_RE = '([A-Z][a-z]+ \\d{1,2}, \\d{4})';

function longDateAfter(text, prefix) {
  const m = new RegExp(prefix + '\\s*' + DATE_RE).exec(text);
  return m ? parseLongDate(m[1]) : null;
}

// Parses the "Skills at a glance" list: "- Name (20–25%)" or "1. Name (20–25%)".
export function parseWeights(text) {
  const start = text.search(/skills at a glance/i);
  if (start < 0) return [];
  const rest = text.slice(start);
  const nl = rest.indexOf('\n');
  const after = nl < 0 ? '' : rest.slice(nl + 1);
  const endRel = after.search(/\n#{2,4}\s/);
  const block = endRel < 0 ? after : after.slice(0, endRel);
  const out = [];
  const re = /^\s*(?:[-*]|\d+\.)\s+(.+?)\s*\((\d+)\s*[–—-]\s*(\d+)\s*%\)\s*$/gm;
  let m;
  while ((m = re.exec(block))) out.push({ name: m[1].trim(), min: Number(m[2]), max: Number(m[3]) });
  return out;
}

export function parsePrereqs(text) {
  const set = new Set();
  const re = /^\s*[-*]\s*([A-Z]{2,3}-\d{3}),/gm;
  let m;
  while ((m = re.exec(text))) set.add(m[1]);
  return [...set].sort();
}

function parseLastUpdated(text) {
  const m = /Last Updated\s*(\d{2})\/(\d{2})\/(\d{4})/.exec(text);
  return m ? `${m[3]}-${m[1]}-${m[2]}` : null;
}

const wText = (w) => w.map((x) => `${x.min}–${x.max}%`).join(', ');

export const CHECKS = {
  'pl900-guide': {
    label: 'PL-900 study guide',
    url: `${LEARN}/en-us/credentials/certifications/resources/study-guides/pl-900`,
    extract: (t) => ({ skillsAsOf: longDateAfter(t, 'Skills measured as of'), weights: parseWeights(t) }),
    valid: (v) => !!v.skillsAsOf && v.weights.length >= 4,
    baseline: {
      skillsAsOf: '2026-07-24',
      weights: [
        { name: 'Describe the business value of Microsoft Power Platform', min: 5, max: 10 },
        { name: 'Manage the Microsoft Power Platform environment', min: 20, max: 25 },
        { name: 'Demonstrate the capabilities of Power Apps', min: 20, max: 25 },
        { name: 'Demonstrate the capabilities of Power Automate', min: 20, max: 25 },
        { name: 'Describe features and capabilities of agents in Microsoft Copilot Studio', min: 20, max: 25 },
      ],
    },
    compareKey: (v) => JSON.stringify([v.skillsAsOf, v.weights.map((w) => [w.min, w.max])]),
    describe: (v) => `Skills measured as of ${fmtFull(v.skillsAsOf)}. Weightings ${wText(v.weights)}.`,
  },
  'pl900-cert': {
    label: 'PL-900 certification page',
    url: `${LEARN}/en-us/credentials/certifications/exams/pl-900/`,
    extract: (t) => ({ lastUpdated: parseLastUpdated(t), retired: /exam was retired|certification was retired/i.test(t) }),
    valid: (v) => !!v.lastUpdated,
    baseline: { lastUpdated: '2026-07-24', retired: false },
    compareKey: (v) => JSON.stringify([v.lastUpdated, v.retired]),
    describe: (v) => `Certification page last updated ${fmtFull(v.lastUpdated)}${v.retired ? '. Marked retired.' : '. Still active.'}`,
  },
  'pl400-exam': {
    label: 'PL-400 exam page',
    url: `${LEARN}/en-us/credentials/certifications/exams/pl-400/`,
    extract: (t) => ({ retiredOn: longDateAfter(t, 'retired on'), replacedByAB400: /AB-400/.test(t) }),
    valid: (v) => !!v.retiredOn,
    baseline: { retiredOn: '2026-10-30', replacedByAB400: true },
    compareKey: (v) => JSON.stringify([v.retiredOn, v.replacedByAB400]),
    describe: (v) => `PL-400 retired ${fmtFull(v.retiredOn)}${v.replacedByAB400 ? '. Replaced by AB-400.' : '.'}`,
  },
  'ab400-guide': {
    label: 'AB-400 study guide',
    url: `${LEARN}/en-us/credentials/certifications/resources/study-guides/ab-400`,
    extract: (t) => ({ weights: parseWeights(t) }),
    valid: (v) => v.weights.length >= 3,
    baseline: {
      weights: [
        { name: 'Build Microsoft Power Platform solutions', min: 15, max: 20 },
        { name: 'Extend the user experience', min: 25, max: 30 },
        { name: 'Extend Microsoft Power Platform', min: 35, max: 40 },
        { name: 'Develop integrations', min: 10, max: 15 },
      ],
    },
    compareKey: (v) => JSON.stringify(v.weights.map((w) => [w.min, w.max])),
    describe: (v) => `Weightings ${wText(v.weights)}.`,
  },
  'ab100-guide': {
    label: 'AB-100 study guide',
    url: `${LEARN}/en-us/credentials/certifications/resources/study-guides/ab-100`,
    extract: (t) => ({ skillsAsOf: longDateAfter(t, 'Skills measured as of'), weights: parseWeights(t) }),
    valid: (v) => !!v.skillsAsOf && v.weights.length >= 3,
    baseline: {
      skillsAsOf: '2026-11-16',
      weights: [
        { name: 'Plan AI-powered business solutions', min: 35, max: 40 },
        { name: 'Design AI-powered business solutions', min: 30, max: 35 },
        { name: 'Deploy AI-powered business solutions', min: 20, max: 25 },
      ],
    },
    compareKey: (v) => JSON.stringify([v.skillsAsOf, v.weights.map((w) => [w.min, w.max])]),
    describe: (v) => `Skills measured as of ${fmtFull(v.skillsAsOf)}. Weightings ${wText(v.weights)}.`,
  },
  'ab100-cert': {
    label: 'AB-100 certification page',
    url: `${LEARN}/en-us/credentials/certifications/agentic-ai-business-solutions-architect/`,
    extract: (t) => ({ prereqs: parsePrereqs(t), updatedOn: longDateAfter(t, 'was updated on') }),
    valid: (v) => v.prereqs.length >= 5,
    baseline: {
      prereqs: ['AB-210', 'AB-250', 'AB-410', 'AB-620', 'AI-103', 'AI-300', 'MB-230', 'MB-310', 'MB-330', 'MB-500', 'MB-800', 'MB-820', 'PL-400'],
      updatedOn: '2026-11-16',
    },
    compareKey: (v) => JSON.stringify([v.prereqs, v.updatedOn]),
    describe: (v) => `${v.prereqs.length} qualifying Associate certifications: ${v.prereqs.join(', ')}.${v.updatedOn ? ` Page updated ${fmtFull(v.updatedOn)}.` : ''}`,
  },
  devplan: {
    label: 'Power Apps Developer Plan guide',
    url: `${LEARN}/en-us/power-apps/maker/developer-plan`,
    extract: (t) => ({
      signupChangeOn: longDateAfter(t, 'Starting'),
      suspendedOn: longDateAfter(t, 'suspended starting'),
    }),
    valid: (v) => !!v.suspendedOn,
    baseline: { signupChangeOn: '2026-11-15', suspendedOn: '2026-12-15' },
    compareKey: (v) => JSON.stringify([v.signupChangeOn, v.suspendedOn]),
    describe: (v) => `New sign-ups stop creating a developer environment from ${fmtFull(v.signupChangeOn)}. Unmanaged developer environments are suspended from ${fmtFull(v.suspendedOn)}.`,
  },
};

export function evaluate(id, text, nowMs) {
  const c = CHECKS[id];
  let got;
  try {
    got = c.extract(text);
  } catch {
    got = null;
  }
  if (!got || !c.valid(got)) {
    return { status: 'unreadable', checkedAt: nowMs, message: 'The page text did not match the expected layout. Open the source to confirm.' };
  }
  const same = c.compareKey(got) === c.compareKey(c.baseline);
  return { status: same ? 'match' : 'changed', checkedAt: nowMs, got };
}

// The value to show: live data when the page changed, otherwise the baseline.
export function currentValue(id, results) {
  const r = results?.[id];
  return r && r.status === 'changed' && r.got ? r.got : CHECKS[id].baseline;
}

export function textOf(res) {
  if (!res) return '';
  if (typeof res.payload === 'string') return res.payload;
  if (Array.isArray(res.content)) {
    const t = res.content.filter((b) => b && b.type === 'text').map((b) => b.text).join('\n');
    if (t) return t;
  }
  if (res.payload && typeof res.payload === 'object') return JSON.stringify(res.payload);
  return '';
}

// Connector-level failures end the whole run, so the viewer sees one clear message.
export const FATAL_CODES = new Set([
  'server_not_connected',
  'needs_reauth',
  'selection_required',
  'not_in_manifest',
  'approval_required',
  'consent_required',
  'blocked_by_policy',
  'not_granted',
  'capability_disabled',
  'capability_removed',
]);

export function friendlyError(code) {
  switch (code) {
    case 'server_not_connected':
      return 'The Microsoft Learn connector is not connected. Add it in claude.ai Settings → Connectors, then choose Check now.';
    case 'needs_reauth':
      return 'The Microsoft Learn connector needs to be reconnected in claude.ai Settings → Connectors.';
    case 'selection_required':
      return 'More than one Microsoft Learn connector is available. Choose one when claude.ai asks, then choose Check now.';
    case 'not_in_manifest':
    case 'approval_required':
    case 'consent_required':
      return 'This page has not been allowed to use Microsoft Learn. Allow it when claude.ai asks, then choose Check now.';
    case 'blocked_by_policy':
      return 'Your organization blocks this connector for the page.';
    case 'not_granted':
    case 'capability_disabled':
    case 'capability_removed':
      return 'This view cannot run connector checks. Open the page in claude.ai.';
    case 'tool_error':
      return 'Microsoft Learn could not return this page.';
    case 'server_unavailable':
    case 'upstream_error':
      return 'Microsoft Learn did not answer in time.';
    case 'timeout':
      return 'Microsoft Learn did not answer within 45 seconds.';
    default:
      return `The check failed${code ? ` (${code})` : ''}.`;
  }
}
