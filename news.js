/* Homepage newsletter signup.
 *
 * The form posts to the signup API, which replies 303 back to this page with
 * ?signup=ok | invalid | closed. There is no separate thank-you page on purpose:
 * this is a side action on a page someone is already reading, and there is no ad
 * spend needing a distinct conversion URL.
 *
 * The form is the default markup, so the section is correct with no JavaScript.
 */
(function () {
  var form = document.getElementById('rwg-signup-website-welcome');
  var wrap = document.getElementById('news-form-wrap');
  var ok = document.getElementById('news-ok');
  var invalid = document.getElementById('news-invalid');
  var closed = document.getElementById('news-closed');
  var section = document.getElementById('news');
  var q = new URLSearchParams(location.search);

  /* ---- carry campaign tags and timing into the submission ---- */
  if (form) {
    var t0 = Date.now();
    ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'].forEach(function (k) {
      if (form.elements[k]) form.elements[k].value = q.get(k) || '';
    });
    if (form.elements.landing_path) form.elements.landing_path.value = location.pathname;

    /* The POST goes to the API, which creates the subscriber and sends the
       welcome email before redirecting back. That is a real wait with no visible
       feedback, so show the button working and stop a second click firing a
       second submission. */
    var submitting = false;
    var btn = form.querySelector('button[type="submit"]');
    var btnLabel = btn ? btn.textContent : '';

    form.addEventListener('submit', function (e) {
      if (submitting) { e.preventDefault(); return; }
      submitting = true;
      if (form.elements.elapsed_ms) form.elements.elapsed_ms.value = String(Date.now() - t0);
      form.setAttribute('aria-busy', 'true');
      /* Deferred so the submission is already under way: a submit button
         disabled synchronously is dropped from the payload in some browsers. */
      setTimeout(function () {
        if (!btn) return;
        btn.disabled = true;
        btn.classList.add('is-busy');
        btn.textContent = 'Joining...';
      }, 0);
    });

    /* Coming back via the back button can restore this page from the cache with
       the button still disabled and still reading "Joining...". Reset it. */
    window.addEventListener('pageshow', function (ev) {
      if (!ev.persisted) return;
      submitting = false;
      form.removeAttribute('aria-busy');
      if (!btn) return;
      btn.disabled = false;
      btn.classList.remove('is-busy');
      btn.textContent = btnLabel;
    });
  }

  /* ---- show the outcome of a submission we have just come back from ---- */
  var state = q.get('signup');
  if (!state) return;

  if (state === 'ok') {
    if (wrap) wrap.hidden = true;
    if (ok) ok.hidden = false;
    if (typeof gtag === 'function') {
      gtag('event', 'sign_up', { method: 'website-welcome' });
    }
  } else if (state === 'invalid') {
    /* Keep the form up: they need to correct a typo, not start over. */
    if (invalid) invalid.hidden = false;
    var field = document.getElementById('news-email');
    if (field) field.focus({ preventScroll: true });
  } else if (state === 'closed') {
    if (wrap) wrap.hidden = true;
    if (closed) closed.hidden = false;
  } else {
    return;
  }

  /* The API returns people to the top of the page, so bring them back to the
     section they submitted from, otherwise the confirmation is offscreen. */
  if (section && typeof section.scrollIntoView === 'function') {
    section.scrollIntoView({ block: 'center' });
  }

  /* Drop the parameter so a refresh or a shared link does not replay the state. */
  if (window.history && history.replaceState) {
    q.delete('signup');
    var rest = q.toString();
    history.replaceState({}, '', location.pathname + (rest ? '?' + rest : ''));
  }
})();
