/* Mobile nav: collapses into a hamburger panel below 920px. */
(function () {
  var btn = document.querySelector('.burger');
  var nav = document.getElementById('site-nav');
  if (!btn || !nav) return;

  function isOpen() {
    return btn.getAttribute('aria-expanded') === 'true';
  }

  function open() {
    btn.setAttribute('aria-expanded', 'true');
    nav.classList.add('open');
    var first = nav.querySelector('a');
    if (first) first.focus();
  }

  function close(returnFocus) {
    if (!isOpen()) return;
    btn.setAttribute('aria-expanded', 'false');
    nav.classList.remove('open');
    if (returnFocus) btn.focus();
  }

  btn.addEventListener('click', function (e) {
    e.stopPropagation();
    isOpen() ? close(false) : open();
  });

  /* Following a link closes the panel — same-page anchors don't reload. */
  nav.addEventListener('click', function (e) {
    if (e.target.closest('a')) close(false);
  });

  document.addEventListener('click', function (e) {
    if (!nav.contains(e.target) && !btn.contains(e.target)) close(false);
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' || e.key === 'Esc') close(true);
  });

  /* Widening past the breakpoint shows the normal nav — drop the open state. */
  var mq = window.matchMedia('(min-width:921px)');
  function onChange() {
    if (mq.matches) close(false);
  }
  if (mq.addEventListener) mq.addEventListener('change', onChange);
  else if (mq.addListener) mq.addListener(onChange);
})();
