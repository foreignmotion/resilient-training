import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import { course, formatMoney, hasPrice, mailtoHref, priceLabel, site } from '../../shared/config.ts';
import { formatClassDate, formatToday, upcomingClassDates } from '../../shared/dates.ts';
import { linkContacts, policySections, waiverBlocks, waiverVersion } from '../../shared/legal.ts';
import {
  allergyText,
  blankStudent,
  isMinor,
  signerFor,
  validateDetails,
  validateReview,
  validateWaiver,
  type Errors,
  type RegistrationInput,
  type StudentInput,
} from '../../shared/registration.ts';

type Step = 'details' | 'waiver' | 'review';
interface State extends RegistrationInput {
  step: Step;
  nextId: number;
}

const STORAGE_KEY = 'registration-draft-v1';

const stepLabels: Record<Step, string> = {
  details: 'Register · Step 1 of 3 · Your details',
  waiver: 'Register · Step 2 of 3 · Release of liability',
  review: 'Register · Step 3 of 3 · Review and pay',
};

function initialState(dates: string[]): State {
  const fresh: State = {
    step: 'details',
    nextId: 2,
    date: dates[0] ?? '',
    students: [blankStudent(1)],
    phone: '',
    email: '',
    emName: '',
    emPhone: '',
    list: true,
    sigs: {},
    agree: false,
    photo: false,
    policyAgree: false,
    waiverVersion,
  };
  try {
    const saved = JSON.parse(sessionStorage.getItem(STORAGE_KEY) || 'null') as State | null;
    if (saved && Array.isArray(saved.students) && saved.students.length) {
      const merged = { ...fresh, ...saved, waiverVersion };
      // A saved date may have passed or been blacked out since.
      if (!dates.includes(merged.date)) merged.date = dates[0] ?? '';
      // Signatures only count against the waiver version they were made under.
      if (saved.waiverVersion !== waiverVersion) Object.assign(merged, { sigs: {}, agree: false, step: 'details' });
      return merged;
    }
  } catch {
    /* storage unavailable: start fresh */
  }
  return fresh;
}

/* ---------- small presentational pieces ---------- */

let uid = 0;
function Field(props: {
  label: string;
  value: string;
  onInput: (v: string) => void;
  invalid?: boolean;
  id?: string;
  style?: Record<string, string>;
  type?: string;
  placeholder?: string;
  autoComplete?: string;
  inputMode?: 'numeric' | 'text' | 'tel' | 'email';
  required?: boolean;
}) {
  const id = useMemo(() => props.id ?? `rf-${++uid}`, [props.id]);
  return (
    <div class="field" style={props.style}>
      <label for={id} class="field-label">{props.label}</label>
      <input
        id={id}
        class="input"
        type={props.type ?? 'text'}
        value={props.value}
        placeholder={props.placeholder}
        autoComplete={props.autoComplete}
        inputMode={props.inputMode}
        required={props.required}
        aria-required={props.required ? 'true' : undefined}
        aria-invalid={props.invalid ? 'true' : undefined}
        onInput={(e) => props.onInput((e.target as HTMLInputElement).value)}
      />
    </div>
  );
}

function Check(props: { id: string; checked: boolean; onChange: (v: boolean) => void; invalid?: boolean; children: ComponentChildren }) {
  return (
    <div class="check-row">
      <input
        id={props.id}
        type="checkbox"
        class="ck"
        checked={props.checked}
        aria-invalid={props.invalid ? 'true' : undefined}
        onChange={(e) => props.onChange((e.target as HTMLInputElement).checked)}
      />
      <label for={props.id} class="t-body t-tight">{props.children}</label>
    </div>
  );
}

function ErrorSummary({ errors, title, fieldId, attempt }: { errors: Errors; title?: string; fieldId: (key: string) => string; attempt: number }) {
  const ref = useRef<HTMLDivElement>(null);
  // Move focus only when a submit attempt fails, never while the person is fixing fields.
  useEffect(() => {
    if (attempt && errors.length) ref.current?.focus();
  }, [attempt]);
  if (!errors.length) return null;
  return (
    <div class="error-summary" role="alert" tabIndex={-1} ref={ref}>
      {title && <p class="t-item">{title}</p>}
      <ul>
        {errors.map((e) => (
          <li key={e.key + e.message}>
            <a
              href={`#${fieldId(e.key)}`}
              class={title ? 't-body t-tight' : 't-item'}
              onClick={(ev) => {
                ev.preventDefault();
                document.getElementById(fieldId(e.key))?.focus();
              }}
            >
              {e.message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Kv({ label, children }: { label: string; children: ComponentChildren }) {
  return (
    <div class="group" style={{ gap: '0.25rem' }}>
      <p class="eyebrow">{label}</p>
      {children}
    </div>
  );
}

/* ---------- the flow ---------- */

export default function RegisterFlow() {
  const dates = useMemo(() => upcomingClassDates(), []);
  const [st, setSt] = useState<State>(() => initialState(dates));
  const [errors, setErrors] = useState<Errors>([]);
  const [attempt, setAttempt] = useState(0);
  const fail = (errs: Errors) => {
    setErrors(errs);
    setAttempt((a) => a + 1);
  };
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState('');
  const headingRef = useRef<HTMLParagraphElement>(null);
  const today = useMemo(() => formatToday(), []);
  const policies = useMemo(() => policySections(), []);
  const waiver = useMemo(() => waiverBlocks(), []);

  // Persist the draft so a cancelled Stripe checkout returns with everything intact.
  useEffect(() => {
    try {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(st));
    } catch {
      /* ignore */
    }
  }, [st]);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get('canceled') === '1') {
      const ok = !validateDetails(st, dates).length && !validateWaiver(st).length;
      setSt((s) => ({ ...s, step: ok ? 'review' : 'details' }));
      setNotice('Checkout was cancelled. Your details are saved; you can review and try again.');
      history.replaceState(null, '', location.pathname);
    }
  }, []);

  // Keep the step label in the page header in sync.
  useEffect(() => {
    const el = document.getElementById('step-label');
    if (el) el.textContent = stepLabels[st.step];
  }, [st.step]);

  const clearError = (key: string) => setErrors((errs) => (errs.some((e) => e.key === key) ? errs.filter((e) => e.key !== key) : errs));
  const set = <K extends keyof State>(k: K, v: State[K]) => {
    clearError(String(k));
    setSt((s) => ({ ...s, [k]: v }));
  };
  const updStudent = (id: number, key: keyof StudentInput, value: string) => {
    const i = st.students.findIndex((x) => x.id === id);
    clearError(`s${i}.${key}`);
    setSt((s) => ({ ...s, students: s.students.map((x) => (x.id === id ? { ...x, [key]: value } : x)) }));
  };

  const go = (step: Step) => {
    setErrors([]);
    setNotice('');
    setSt((s) => ({ ...s, step }));
    requestAnimationFrame(() => {
      document.getElementById('register-top')?.scrollIntoView({ block: 'start' });
      headingRef.current?.focus({ preventScroll: true });
    });
  };

  const bad = (key: string) => errors.some((e) => e.key === key);
  const fieldId = (key: string) => {
    if (key === 'date') return 'date-0';
    const m = key.match(/^s(\d+)\.(\w+)$/);
    if (m) return `s-${st.students[+m[1]]?.id}-${m[2]}`;
    if (key.startsWith('sig')) return `sig-${key.slice(3)}`;
    return `f-${key}`;
  };

  const n = st.students.length;
  const totalCents = course.priceCents * n;

  async function pay() {
    const errs = validateReview(st);
    if (errs.length) return fail(errs);
    if (!hasPrice()) return fail([{ key: 'policyAgree', message: 'Online payment opens once the course price is set. Please call or email to register.' }]);
    setErrors([]);
    setSubmitting(true);
    try {
      const { step, nextId, ...payload } = st;
      const res = await fetch('/api/registrations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data: any = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        fail(
          Array.isArray(data.errors) && data.errors.length
            ? data.errors
            : [{ key: 'policyAgree', message: data.error || 'We couldn’t start checkout. Please try again, or call or email us.' }],
        );
        setSubmitting(false);
        return;
      }
      location.href = data.url;
    } catch {
      fail([{ key: 'policyAgree', message: 'Network problem. Check your connection and try again.' }]);
      setSubmitting(false);
    }
  }

  const signers = st.students.map((s, i) => signerFor(s, i));
  const signerNames = [...new Set(st.students.map((s) => (st.sigs[s.id] || '').trim()).filter(Boolean))];

  return (
    <>
      <p ref={headingRef} tabIndex={-1} class="visually-hidden" aria-live="polite">{stepLabels[st.step]}</p>

      {notice && <p class="t-item notice" role="status">{notice}</p>}

      {st.step === 'details' && (
        <form
          noValidate
          class="flow"
          style={{ gap: '4rem' }}
          onSubmit={(e) => {
            e.preventDefault();
            const errs = validateDetails(st, dates);
            if (errs.length) return fail(errs);
            go('waiver');
          }}
        >
          <fieldset class="group bare">
            <legend class="t-subhead" style={{ marginBottom: '1rem' }}>Class date</legend>
            {dates.length ? (
              <div class="pills">
                {dates.map((d, i) => (
                  <button
                    key={d}
                    id={`date-${i}`}
                    type="button"
                    class={d === st.date ? 'pill pill-on' : 'pill'}
                    aria-pressed={d === st.date ? 'true' : 'false'}
                    onClick={() => set('date', d)}
                  >
                    {formatClassDate(d)}
                  </button>
                ))}
              </div>
            ) : (
              <p class="t-body">No upcoming dates are open right now. Email <a href={mailtoHref()}>{site.email}</a>.</p>
            )}
          </fieldset>

          <div class="group" style={{ gap: '3rem' }}>
            <p class="t-subhead">Students attending</p>
            {st.students.map((s, i) => (
              <fieldset key={s.id} class="group bare student">
                <div class="student-head">
                  <legend class="t-item">Student {i + 1}</legend>
                  {n > 1 && (
                    <button
                      type="button"
                      class="linkbtn"
                      aria-label={`Remove student ${i + 1}${s.name.trim() ? ` (${s.name.trim()})` : ''}`}
                      onClick={() => setSt((x) => ({ ...x, students: x.students.filter((y) => y.id !== s.id) }))}
                    >
                      Remove
                    </button>
                  )}
                </div>
                <div class="row">
                  <Field id={`s-${s.id}-name`} label="Full name" autoComplete="off" value={s.name} onInput={(v) => updStudent(s.id, 'name', v)} required invalid={bad(`s${i}.name`)} style={{ flex: '3 1 18rem' }} />
                  <Field id={`s-${s.id}-age`} label="Age" type="text" inputMode="numeric" value={s.age} onInput={(v) => updStudent(s.id, 'age', v.replace(/\D/g, '').slice(0, 3))} required invalid={bad(`s${i}.age`)} style={{ flex: '1 1 8rem' }} />
                </div>
                {isMinor(s) && (
                  <Field id={`s-${s.id}-guardian`} label="Parent or legal guardian’s full name" value={s.guardian} onInput={(v) => updStudent(s.id, 'guardian', v)} required invalid={bad(`s${i}.guardian`)} />
                )}
                <div class="row">
                  <Field label="Food allergies" placeholder="None" value={s.food} onInput={(v) => updStudent(s.id, 'food', v)} style={{ flex: '1 1 14rem' }} />
                  <Field label="Medication allergies" placeholder="None" value={s.meds} onInput={(v) => updStudent(s.id, 'meds', v)} style={{ flex: '1 1 14rem' }} />
                  <Field label="Other allergies" placeholder="None" value={s.other} onInput={(v) => updStudent(s.id, 'other', v)} style={{ flex: '1 1 14rem' }} />
                </div>
              </fieldset>
            ))}
            <div class="btns">
              <button
                type="button"
                class="btn"
                onClick={() => {
                  const id = st.nextId;
                  setSt((x) => ({ ...x, nextId: id + 1, students: [...x.students, blankStudent(id)] }));
                  requestAnimationFrame(() => document.getElementById(`s-${id}-name`)?.focus());
                }}
              >
                <span>Add another student</span>
              </button>
            </div>
          </div>

          <fieldset class="group bare">
            <legend class="t-subhead" style={{ marginBottom: '1rem' }}>Your contact information</legend>
            <div class="row">
              <Field id="f-phone" label="Phone number" type="tel" autoComplete="tel" value={st.phone} onInput={(v) => set('phone', v)} required invalid={bad('phone')} style={{ flex: '1 1 18rem' }} />
              <Field id="f-email" label="Email" type="email" autoComplete="email" value={st.email} onInput={(v) => set('email', v)} required invalid={bad('email')} style={{ flex: '1 1 18rem' }} />
            </div>
          </fieldset>

          <fieldset class="group bare">
            <legend class="t-subhead" style={{ marginBottom: '1rem' }}>Emergency contact</legend>
            <div class="row">
              <Field id="f-emName" label="Emergency contact name" value={st.emName} onInput={(v) => set('emName', v)} required invalid={bad('emName')} style={{ flex: '1 1 18rem' }} />
              <Field id="f-emPhone" label="Emergency contact phone" type="tel" value={st.emPhone} onInput={(v) => set('emPhone', v)} required invalid={bad('emPhone')} style={{ flex: '1 1 18rem' }} />
            </div>
          </fieldset>

          <Check id="reg-list" checked={st.list} onChange={(v) => set('list', v)}>
            Add me to the email list for training locations and new courses
          </Check>

          <div class="flow" style={{ gap: '2rem' }}>
            <ErrorSummary errors={errors} title="Please complete these before continuing:" fieldId={fieldId} attempt={attempt} />
            <div class="btns">
              <button type="submit" class="btn btn-solid"><span>Continue to waiver</span></button>
            </div>
          </div>
        </form>
      )}

      {st.step === 'waiver' && (
        <form
          noValidate
          class="flow"
          style={{ gap: '3rem' }}
          onSubmit={(e) => {
            e.preventDefault();
            const errs = validateWaiver(st);
            if (errs.length) return fail(errs);
            go('review');
          }}
        >
          <div class="flow" style={{ gap: '1.5rem' }}>
            <header class="section-header">
              <p class="eyebrow">Required for every participant</p>
              <h2 class="title title-section">Release of liability</h2>
            </header>
            <p class="t-body t-tight">Read the full release below. Adults sign for themselves. A parent or legal guardian signs for each student under 18.</p>
          </div>

          <div class="waiver" tabIndex={0} role="region" aria-label="Release of liability, assumption of risk and medical authorization">
            {waiver.map((b, i) =>
              b.type === 'p' ? (
                <p key={i} class="t-body t-tight" dangerouslySetInnerHTML={{ __html: b.html }} />
              ) : (
                <p key={i} class="t-item">{b.text}</p>
              ),
            )}
          </div>

          <fieldset class="group bare" style={{ gap: '2rem' }}>
            <legend class="t-subhead" style={{ marginBottom: '2rem' }}>Signatures · {today}</legend>
            {signers.map((g) => (
              <Field
                key={g.id}
                id={`sig-${g.id}`}
                label={g.label}
                placeholder="Type full name"
                autoComplete="off"
                value={st.sigs[g.id] || ''}
                onInput={(v) => {
                  clearError(`sig${g.id}`);
                  setSt((x) => ({ ...x, sigs: { ...x.sigs, [g.id]: v } }));
                }}
                required
                invalid={bad(`sig${g.id}`)}
                style={{ maxWidth: '36rem' }}
              />
            ))}
          </fieldset>

          <div class="flow" style={{ gap: '1.5rem' }}>
            <Check id="f-agree" checked={st.agree} onChange={(v) => set('agree', v)} invalid={bad('agree')}>
              I have read this release, I understand that I am giving up legal rights, and I agree to its terms.
            </Check>
            <Check id="waiver-photo" checked={st.photo} onChange={(v) => set('photo', v)}>
              Optional: {site.orgName} and NCRT may use photos and video of the participants taken during class in their marketing, without payment.
            </Check>
          </div>

          <div class="flow" style={{ gap: '2rem' }}>
            <ErrorSummary errors={errors} title="Please complete these before continuing:" fieldId={fieldId} attempt={attempt} />
            <div class="btns" style={{ columnGap: '1.5rem' }}>
              <button type="submit" class="btn btn-solid"><span>Sign and continue</span></button>
              <button type="button" class="linkbtn" onClick={() => go('details')}>Edit details</button>
            </div>
          </div>
        </form>
      )}

      {st.step === 'review' && (
        <div class="flow" style={{ gap: '3rem' }}>
          <header class="section-header">
            <p class="eyebrow">Review</p>
            <h2 class="title title-section">Your registration</h2>
          </header>

          <Kv label="Class date">
            <p class="t-item">{st.date ? formatClassDate(st.date) : ''}, {course.timeLabel}</p>
          </Kv>

          <div class="group" style={{ gap: '1.5rem' }}>
            <p class="eyebrow">Students</p>
            {st.students.map((s) => (
              <div key={s.id}>
                <p class="t-item">{s.name} · Age {s.age}</p>
                {isMinor(s) && <p class="t-body t-tight">Parent or legal guardian: {s.guardian}</p>}
                <p class="t-body t-tight">Allergies: {allergyText(s)}</p>
              </div>
            ))}
          </div>

          <div class="row" style={{ gap: '1.5rem 5rem' }}>
            <div>
              <p class="eyebrow">Contact</p>
              <p class="t-body t-tight">{st.phone}</p>
              <p class="t-body t-tight">{st.email}</p>
            </div>
            <div>
              <p class="eyebrow">Emergency contact</p>
              <p class="t-body t-tight">{st.emName}</p>
              <p class="t-body t-tight">{st.emPhone}</p>
            </div>
          </div>

          <Kv label="Release of liability">
            <p class="t-body t-tight">Signed {today} by {signerNames.join(', ')}</p>
            <p class="t-body t-tight">Photo and video release: {st.photo ? 'granted' : 'not granted'}</p>
          </Kv>

          <div class="group" style={{ gap: '2rem' }}>
            {policies.sections.map((sec, i) => (
              <div class="policy" key={sec.title}>
                <h3 class="t-subhead">{sec.title}</h3>
                {sec.items.map((b, j) => b.type === 'p' && <p key={j} class="t-body t-tight" dangerouslySetInnerHTML={{ __html: b.html }} />)}
                {i === 0 && policies.footer.map((b, j) => b.type === 'p' && <p key={`f${j}`} class="t-body t-tight" dangerouslySetInnerHTML={{ __html: linkContacts(b.html) }} />)}
              </div>
            ))}
            <Check id="f-policyAgree" checked={st.policyAgree} onChange={(v) => set('policyAgree', v)} invalid={bad('policyAgree')}>
              I have read and agree to the refund, rescheduling and weather policies.
            </Check>
          </div>

          <Kv label="Payment">
            <p class="t-body t-tight">{n === 1 ? '1 student' : `${n} students`} × {priceLabel()} per student</p>
            <p class="t-heading">Total {hasPrice() ? formatMoney(totalCents) : `[Price × ${n}]`}</p>
          </Kv>

          <div class="flow" style={{ gap: '2rem' }}>
            <ErrorSummary errors={errors} fieldId={fieldId} attempt={attempt} />
            <div class="btns" style={{ columnGap: '1.5rem' }}>
              <button type="button" class="btn btn-solid" disabled={submitting} aria-disabled={submitting ? 'true' : undefined} onClick={pay}>
                <span>{submitting ? 'Opening secure checkout…' : 'Continue to secure checkout'}</span>
              </button>
              <button type="button" class="linkbtn" onClick={() => go('waiver')}>Back to waiver</button>
            </div>
            <p class="t-small" style={{ fontStyle: 'normal' }}>Payment is handled by Stripe. Your card details never touch this site.</p>
          </div>
        </div>
      )}
    </>
  );
}
