/* Final preorder countdown. CLOSE is the last day preorders are open,
   counted in Eastern time (the studio's clock), not the visitor's.

   Fills every [data-days-left] with "28 days left", "Closes tomorrow" or
   "Last day", and hides the .promo bar once the date has passed. The
   static text in the HTML ("Final preorders close October 29") is what
   shows without JavaScript, so change both when the date moves. */
(function () {
  var CLOSE = '2026-10-29';

  var today;
  try {
    // en-CA formats as YYYY-MM-DD
    today = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York', year: 'numeric', month: '2-digit', day: '2-digit'
    }).format(new Date());
  } catch (e) {
    return;
  }
  var days = Math.round((Date.parse(CLOSE) - Date.parse(today)) / 864e5);
  if (isNaN(days)) return;

  if (days < 0) {
    Array.prototype.forEach.call(document.querySelectorAll('.promo'), function (el) {
      el.hidden = true;
    });
    return;
  }

  var text = days === 0 ? 'Last day' : days === 1 ? 'Closes tomorrow' : days + ' days left';
  Array.prototype.forEach.call(document.querySelectorAll('[data-days-left]'), function (el) {
    el.textContent = text;
    el.hidden = false;
  });
})();
