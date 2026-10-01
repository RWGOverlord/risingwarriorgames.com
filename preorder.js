/* BackerKit Pre-Order Widget: buy without leaving the site.

   Every preorder button is a normal link to the item's hosted BackerKit page,
   plus a data-bk-preorders attribute with the item's overlay URL. With
   BackerKit's script loaded, a click opens the checkout in a modal instead.
   If the script never loads (ad blocker, network), the link still works.

   data-offer names the button for analytics and for QR deep links:
   /zombieoverlord.html?open=horde opens the first [data-offer="horde"]. */
(function () {
  var BK = 'https://www.backerkit.com/assets/preorders.js';
  var links = document.querySelectorAll('[data-bk-preorders]');
  if (!links.length) return;

  function track(name, params) {
    if (typeof window.gtag === 'function') window.gtag('event', name, params);
  }

  /* Recorded before BackerKit sees the click, so it counts even if the
     modal is blocked. */
  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-bk-preorders]');
    if (!a) return;
    var where = a.closest('[data-loc]');
    track('preorder_click', {
      offer: a.getAttribute('data-offer') || 'store',
      placement: where ? where.getAttribute('data-loc') : 'page',
      auto_open: !e.isTrusted
    });
  }, true);

  /* The widget preloads one shared iframe. Clicking before that iframe has
     loaded opens the whole store rather than the item, so a deep link waits
     for it (tested 2026-10-01). Watching starts before BackerKit's script
     runs, so the load event can't be missed. */
  var frameReady = false, onFrameReady = null;
  new MutationObserver(function (muts, obs) {
    muts.forEach(function (m) {
      Array.prototype.forEach.call(m.addedNodes, function (n) {
        if (n.nodeType !== 1) return;
        var f = n.tagName === 'IFRAME' ? n : n.querySelector('iframe');
        if (!f || (f.src && !/backerkit\.com/.test(f.src))) return;
        obs.disconnect();
        f.addEventListener('load', function () {
          frameReady = true;
          if (onFrameReady) onFrameReady();
        }, { once: true });
      });
    });
  }).observe(document.body, { childList: true, subtree: true });

  function openFromUrl() {
    var want = new URLSearchParams(location.search).get('open');
    if (!want || !/^[a-z0-9-]+$/.test(want)) return;
    var target = document.querySelector('[data-offer="' + want + '"][data-bk-preorders]');
    if (!target) return;

    var done = false;
    function go() {
      if (done) return;
      done = true;
      target.click();
    }
    if (frameReady) setTimeout(go, 200);
    else onFrameReady = function () { setTimeout(go, 200); };
    setTimeout(go, 8000); // never leave a QR visitor waiting on nothing
  }

  var s = document.createElement('script');
  s.src = BK;
  s.async = true;
  s.onload = function () {
    /* BackerKit handles the click now; "#" stops the hosted page from also
       opening if its handler doesn't cancel the navigation. */
    Array.prototype.forEach.call(links, function (a) {
      a.setAttribute('data-href', a.getAttribute('href'));
      a.setAttribute('href', '#');
    });
    openFromUrl();
  };
  s.onerror = function () {
    track('preorder_widget_blocked', {});
    // Hosted links stay as they are. A deep link falls back to the hosted page.
    var want = new URLSearchParams(location.search).get('open');
    var target = want && /^[a-z0-9-]+$/.test(want) &&
      document.querySelector('[data-offer="' + want + '"][data-bk-preorders]');
    if (target) target.scrollIntoView({ block: 'center' });
  };
  document.head.appendChild(s);
})();
