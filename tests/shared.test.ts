import { test } from 'node:test';
import assert from 'node:assert/strict';
import { upcomingClassDates, formatClassDate } from '../shared/dates.ts';
import { blankStudent, validateDetails, validateWaiver, signerFor, norm, type RegistrationInput } from '../shared/registration.ts';
import { waiverBlocks, policySections, waiverText } from '../shared/legal.ts';
import { course } from '../shared/config.ts';

// 2026-10-07 is a Wednesday. 15:00Z = 10:00 CDT, 14:59Z = 09:59 CDT.
test('same-day Wednesday is offered before the 10:00 CT cutoff only', () => {
  assert.equal(upcomingClassDates(new Date('2026-10-07T14:59:00Z'))[0], '2026-10-07');
  assert.equal(upcomingClassDates(new Date('2026-10-07T15:00:00Z'))[0], '2026-10-14');
});

test('six upcoming Wednesdays, all Wednesdays, crossing DST', () => {
  const d = upcomingClassDates(new Date('2026-10-26T12:00:00Z'));
  assert.equal(d.length, course.datesShown);
  assert.deepEqual(d, ['2026-10-28', '2026-11-04', '2026-11-11', '2026-11-18', '2026-11-25', '2026-12-02']);
  d.forEach((x) => assert.match(formatClassDate(x), /^Wednesday/));
});

test('late Tuesday night in Chicago is still Tuesday (UTC is already Wednesday)', () => {
  // 2026-10-07T03:00Z = Tue Oct 6, 22:00 CDT -> next class is Wed Oct 7.
  assert.equal(upcomingClassDates(new Date('2026-10-07T03:00:00Z'))[0], '2026-10-07');
});

const base = (): RegistrationInput => ({
  date: '2026-10-14', students: [{ ...blankStudent(1), name: 'Ada Lovelace', age: '36' }],
  phone: '615', email: 'ada@example.com', emName: 'Bob', emPhone: '615', list: true,
  sigs: {}, agree: false, photo: false, policyAgree: false, waiverVersion: 'x',
});

test('guardian required only for minors', () => {
  const r = base();
  assert.deepEqual(validateDetails(r, ['2026-10-14']), []);
  r.students.push({ ...blankStudent(2), name: 'Kid', age: '12' });
  assert.deepEqual(validateDetails(r, ['2026-10-14']).map((e) => e.key), ['s1.guardian']);
  r.students[1].guardian = 'Ada Lovelace';
  assert.deepEqual(validateDetails(r, ['2026-10-14']), []);
});

test('date must be one of the allowed dates; age 1-120 integer', () => {
  const r = base();
  assert.deepEqual(validateDetails(r, ['2026-10-21']).map((e) => e.key), ['date']);
  r.students[0].age = '0';
  assert.ok(validateDetails(r, ['2026-10-14']).some((e) => e.key === 's0.age'));
  r.students[0].age = '12.5';
  assert.ok(validateDetails(r, ['2026-10-14']).some((e) => e.key === 's0.age'));
});

test('signatures: adult signs own name, guardian signs for minor, case/space-insensitive', () => {
  const r = base();
  r.students.push({ ...blankStudent(2), name: 'Kid Lovelace', age: '12', guardian: 'Ada  Lovelace' });
  r.sigs = { '1': ' ada lovelace ', '2': 'Kid Lovelace' };
  r.agree = true;
  const errs = validateWaiver(r);
  assert.equal(errs.length, 1);
  assert.equal(errs[0].key, 'sig2');
  r.sigs['2'] = 'ADA LOVELACE';
  assert.deepEqual(validateWaiver(r), []);
  assert.equal(signerFor(r.students[1], 1).role, 'guardian');
  assert.equal(norm('  A   b '), 'a b');
});

test('waiver agreement required', () => {
  const r = base();
  r.sigs = { '1': 'Ada Lovelace' };
  assert.deepEqual(validateWaiver(r).map((e) => e.key), ['agree']);
});

test('legal text renders without notes and builder sections', () => {
  const text = waiverText();
  assert.ok(!text.includes('DRAFT'));
  assert.ok(!text.includes('Form elements'));
  assert.equal(waiverBlocks()[0].type, 'h1');
  assert.ok(waiverBlocks().some((b) => b.type === 'p' && b.html.startsWith('<strong>9. Electronic signature.</strong>')));
  const p = policySections();
  assert.deepEqual(p.sections.map((s) => s.title), ['Refunds and rescheduling', 'Weather']);
  assert.equal(p.sections[0].items.length, 5);
  assert.equal(p.sections[1].items.length, 5);
  assert.equal(p.footer.length, 1);
  assert.match(p.footer[0].type === 'p' ? p.footer[0].plain : '', /^To cancel or reschedule/);
});
