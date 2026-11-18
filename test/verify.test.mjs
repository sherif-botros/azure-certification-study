import test from 'node:test';
import assert from 'node:assert/strict';
import { evaluate, CHECKS, parseWeights, parsePrereqs, textOf } from '../src/lib/verify.js';

// Excerpts copied from the Microsoft Learn pages as returned on 18 November 2026.
const PL900_GUIDE = `# Study guide for Exam PL-900

## Skills measured as of July 24, 2026

### Audience profile

As a candidate for this exam, you aspire to understand how Microsoft Power Platform technologies can be used to:

### Skills at a glance

- Describe the business value of Microsoft Power Platform (5–10%)
- Manage the Microsoft Power Platform environment (20–25%)
- Demonstrate the capabilities of Power Apps (20–25%)
- Demonstrate the capabilities of Power Automate (20–25%)
- Describe features and capabilities of agents in Microsoft Copilot Studio (20–25%)

### Describe the business value of Microsoft Power Platform (5–10%)

#### Describe the business value of Microsoft Power Platform services
`;

const PL900_CERT = `# Microsoft Certified: Power Platform Fundamentals

## At a glance

- Level

[Beginner](/en-us/credentials/browse/)
- Last Updated

07/24/2026

## Overview
`;

const PL400_EXAM = `# Exam PL-400: Microsoft Power Platform Developer

Warning

This exam was retired on October 30, 2026, at 11:59 PM Central Standard Time. [Learn more](https://example.com).

Note

PL-400 is transitioning to AB-400 to align the exam within Microsoft's certification portfolio.
`;

const AB400_GUIDE = `## Skills measured

### Skills at a glance

- Build Microsoft Power Platform solutions (15–20%)
- Extend the user experience (25–30%)
- Extend Microsoft Power Platform (35–40%)
- Develop integrations (10–15%)

### Build Microsoft Power Platform solutions (15–20%)
`;

const AB100_GUIDE = `## Skills measured as of November 16, 2026

### Skills at a glance

- Plan AI-powered business solutions (35–40%)
- Design AI-powered business solutions (30–35%)
- Deploy AI-powered business solutions (20–25%)

### Plan AI-powered business solutions (35–40%)
`;

const AB100_CERT = `In addition to passing the AB-100 required exam, you must also earn at least one of the prerequisite Associate-level certifications listed below.

- MB-330, [Microsoft Certified: Dynamics 365 Supply Chain Management Functional Consultant Associate](/x)
- PL-400, [Microsoft Certified: Power Platform Developer Associate](/x)
- MB-230, [Microsoft Certified: Dynamics 365 Customer Service Functional Consultant Associate](/x)
- MB-310, [x](/x)
- MB-500, [x](/x)
- MB-800, [x](/x)
- MB-820, [x](/x)
- AI-300, [x](/x)
- AI-103, [x](/x)
- AB-620, [x](/x)
- AB-210, [x](/x)
- AB-410, [x](/x)
- AB-250, [x](/x)

Important

The English language version of this certification was updated on November 16, 2026. Review the study guide.
`;

const DEVPLAN = `Important

Unmanaged developer environments are deprecated.

- **Unmanaged developer environments**, including the environment that you get when you sign up for the Developer Plan, are suspended starting December 15, 2026 and deleted starting January 15, 2027.

Starting November 15, 2026, signing up for the Developer Plan no longer creates a developer environment, and you can't create new unmanaged developer environments.
`;

test('weights parse from the at-a-glance block only', () => {
  const w = parseWeights(PL900_GUIDE);
  assert.equal(w.length, 5);
  assert.deepEqual(w[1], { name: 'Manage the Microsoft Power Platform environment', min: 20, max: 25 });
});

test('numbered list layout also parses', () => {
  const w = parseWeights('### Skills at a glance\n1. A one (5–10%)\n2. A two (20–25%)\n\n### A one (5–10%)');
  assert.equal(w.length, 2);
});

test('all checks match their baselines on the build-day text', () => {
  const samples = {
    'pl900-guide': PL900_GUIDE,
    'pl900-cert': PL900_CERT,
    'pl400-exam': PL400_EXAM,
    'ab400-guide': AB400_GUIDE,
    'ab100-guide': AB100_GUIDE,
    'ab100-cert': AB100_CERT,
    devplan: DEVPLAN,
  };
  assert.deepEqual(Object.keys(samples).sort(), Object.keys(CHECKS).sort());
  for (const [id, text] of Object.entries(samples)) {
    const r = evaluate(id, text, 1);
    assert.equal(r.status, 'match', `${id}: ${JSON.stringify(r)}`);
  }
});

test('a changed skills date is reported as changed with the new value', () => {
  const r = evaluate('pl900-guide', PL900_GUIDE.replace('July 24, 2026', 'January 9, 2027'), 1);
  assert.equal(r.status, 'changed');
  assert.equal(r.got.skillsAsOf, '2027-01-09');
});

test('a changed weighting is detected', () => {
  const r = evaluate('ab100-guide', AB100_GUIDE.replace('(35–40%)', '(40–45%)'), 1);
  assert.equal(r.status, 'changed');
});

test('prerequisite list changes are detected', () => {
  const r = evaluate('ab100-cert', AB100_CERT.replace('- PL-400,', '- AB-400,'), 1);
  assert.equal(r.status, 'changed');
  assert.ok(r.got.prereqs.includes('AB-400'));
  assert.equal(parsePrereqs(AB100_CERT).length, 13);
});

test('an unrecognised page is unreadable, never a false match', () => {
  assert.equal(evaluate('pl900-guide', 'Sign in to continue', 1).status, 'unreadable');
  assert.equal(evaluate('ab100-cert', '', 1).status, 'unreadable');
});

test('textOf handles string payloads, content blocks and objects', () => {
  assert.equal(textOf({ payload: 'abc' }), 'abc');
  assert.equal(textOf({ content: [{ type: 'text', text: 'x' }, { type: 'text', text: 'y' }] }), 'x\ny');
  assert.equal(textOf({ payload: { a: 1 } }), '{"a":1}');
  assert.equal(textOf(null), '');
});
