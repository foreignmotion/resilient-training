/**
 * Progressive enhancement for simple forms marked data-ajax:
 * posts JSON to the form's action, swaps in the [data-success] message on success,
 * shows [data-error] on failure. Without JS the form posts normally.
 */
export function enhanceForms() {
  document.querySelectorAll<HTMLFormElement>('form[data-ajax]').forEach((form) => {
    const root = form.closest('[data-form-root]') ?? form.parentElement!;
    const success = root.querySelector<HTMLElement>('[data-success]');
    const error = form.querySelector<HTMLElement>('[data-error]');
    const submit = form.querySelector<HTMLButtonElement>('[type=submit]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      if (error) error.hidden = true;
      form.querySelectorAll('[aria-invalid]').forEach((el) => el.removeAttribute('aria-invalid'));
      const invalid = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input:not([type=hidden]):not([tabindex="-1"]), textarea')].filter((el) => !el.checkValidity());
      if (invalid.length) {
        invalid.forEach((el) => el.setAttribute('aria-invalid', 'true'));
        if (error) {
          error.textContent = 'Please check: ' + invalid.map((el) => el.labels?.[0]?.textContent || el.getAttribute('aria-label') || el.name).join(', ') + '.';
          error.hidden = false;
        }
        invalid[0].focus();
        return;
      }
      const data = Object.fromEntries(new FormData(form).entries());
      submit?.setAttribute('disabled', '');
      try {
        const res = await fetch(form.action, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify(data),
        });
        if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string } | null)?.error || 'Something went wrong.');
        root.querySelectorAll<HTMLElement>('[data-echo]').forEach((el) => {
          el.textContent = String(data[el.dataset.echo!] ?? '');
        });
        form.hidden = true;
        if (success) {
          success.hidden = false;
          success.setAttribute('tabindex', '-1');
          success.focus();
        }
      } catch (err) {
        if (error) {
          error.textContent = (err as Error).message + ' Please try again, or contact us directly.';
          error.hidden = false;
        }
      } finally {
        submit?.removeAttribute('disabled');
      }
    });
  });
}
