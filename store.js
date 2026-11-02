/* ============================================================
   store.js — the Zombie Overlord order panel.

   Every price, MSRP, stock count, shipping amount and date shown here comes
   from GET /api/catalog on the checkout service. Nothing is hardcoded in
   this file: taking the Core Edition to $35 after the convention is a config
   change on the service, not an edit here and a deploy there. This page
   once shipped a hardcoded promotional deadline and it went stale in
   public, which is the mistake this arrangement exists to prevent.

   The site holds no Stripe key of any kind, publishable included. It posts
   item IDs to POST /api/checkout, which prices the order server-side and
   hands back a Stripe Checkout URL. Nothing in this file is trusted by the
   server, and nothing in this file needs to be.
   ============================================================ */
(function () {
  'use strict';

  var root = document.getElementById('order');
  if (!root) return;

  var API = root.getAttribute('data-api');
  if (!API) return;

  var MAIL = 'overlord@risingwarriorgames.com';
  var PAY_LABEL = 'Continue to payment';

  /* Descriptions only. Every number lives in the catalog response. */
  var BUNDLE_COPY = {
    core: {
      items: ['194-card core game', '48 unique characters', 'Every stretch goal unlocked in the campaign']
    },
    horde: {
      tag: 'Best value',
      items: ['194-card core game, all stretch goals', 'Misfits Mini Expansion, so all 68 Survivors are unique', 'Life Point Trackers, four engraved crown dice']
    },
    overlord: {
      tag: 'Everything',
      items: ['Everything in the Horde Bundle', 'Board Mat for the middle of the table', 'Player mats can be added below']
    }
  };

  var cat = null;
  var sel = { bundle: null, addons: {}, delivery: null, region: null, confirm: false };
  var els = {};

  /* ---------- formatting ---------- */

  function money(cents) {
    return '$' + (cents / 100).toFixed(2).replace(/\.00$/, '');
  }

  function esc(s) {
    return String(s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* "2026-11-14" as a local date. new Date() on a bare date string parses it
     as UTC midnight, which reads as the day before across the Americas. */
  function ymd(s) {
    var p = String(s).split('-');
    return new Date(+p[0], (+p[1]) - 1, +p[2]);
  }

  function dateLong(s) {
    try {
      return ymd(s).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    } catch (e) { return s; }
  }

  function dateShort(s) {
    try {
      return ymd(s).toLocaleDateString('en-US', { month: 'long', day: 'numeric' });
    } catch (e) { return s; }
  }

  /* The catalog sends a time range as "4:00 – 6:00 pm". House style keeps
     the dash out of running prose, so spell it for sentences. */
  function windowWords(w) {
    var parts = String(w).split(/\s*[–—-]\s*/);
    return parts.length === 2 ? parts[0] + ' and ' + parts[1] : String(w);
  }

  /* ---------- lookups ---------- */

  function bundle(id) {
    var found = null;
    (cat.bundles || []).forEach(function (b) { if (b.id === id) found = b; });
    return found;
  }

  function addon(id) {
    var found = null;
    (cat.addons || []).forEach(function (a) { if (a.id === id) found = a; });
    return found;
  }

  function matCount() {
    var n = 0;
    Object.keys(sel.addons).forEach(function (k) { if (sel.addons[k]) n++; });
    return n;
  }

  /* shipping_quotes[bundle][addedMats][region]. The page never computes a
     weight: the service already did, for every valid combination. */
  function quote(region) {
    if (!sel.bundle || !region) return null;
    var byBundle = cat.shipping_quotes && cat.shipping_quotes[sel.bundle];
    if (!byBundle) return null;
    var row = byBundle[String(matCount())];
    if (!row) return null;
    return typeof row[region] === 'number' ? row[region] : null;
  }

  function cheapestAnywhere() {
    var min = null;
    var q = cat.shipping_quotes || {};
    Object.keys(q).forEach(function (b) {
      Object.keys(q[b]).forEach(function (n) {
        Object.keys(q[b][n]).forEach(function (r) {
          var v = q[b][n][r];
          if (typeof v === 'number' && (min === null || v < min)) min = v;
        });
      });
    });
    return min;
  }

  function itemsTotal() {
    var b = bundle(sel.bundle);
    if (!b) return 0;
    var t = b.price_cents;
    (cat.addons || []).forEach(function (a) { if (sel.addons[a.id]) t += a.price_cents; });
    return t;
  }

  function canAdd(id) {
    var b = bundle(sel.bundle);
    var a = addon(id);
    if (!b || !a) return false;
    if (!a.available) return false;
    if ((b.addable_addons || []).indexOf(id) < 0) return false;
    if (!sel.addons[id] && matCount() >= b.max_added_mats) return false;
    return true;
  }

  function ready() {
    if (!sel.bundle) return false;
    if (sel.delivery === 'pickup') return !!sel.confirm;
    if (sel.delivery === 'ship') return !!sel.region;
    return false;
  }

  /* ---------- the unavailable state ---------- */

  function down(message) {
    root.innerHTML =
      '<div class="ord-down">' +
      '<h3>Ordering is temporarily unavailable</h3>' +
      '<p>' + esc(message) + ' Email <a href="mailto:' + MAIL + '">' + MAIL + '</a> ' +
      'and we will take your order by hand, or <a href="/#news">join the list</a> ' +
      'and you will hear when it is back.</p>' +
      '</div>';
  }

  /* ---------- markup ---------- */

  function bundleCard(b) {
    var copy = BUNDLE_COPY[b.id] || { items: [] };
    var save = b.msrp_cents && b.msrp_cents > b.price_cents ? b.msrp_cents - b.price_cents : 0;
    var h = '';
    h += '<label class="opick' + (b.available ? '' : ' is-out') + '">';
    h += '<input type="radio" name="ord-bundle" value="' + esc(b.id) + '"' + (b.available ? '' : ' disabled') + '>';
    h += '<span class="opick-in">';
    if (copy.tag) h += '<span class="opick-tag mono">' + esc(copy.tag) + '</span>';
    h += '<span class="opick-name">' + esc(b.name) + '</span>';
    h += '<span class="opick-price">' + money(b.price_cents);
    if (b.msrp_cents) h += ' <s>' + money(b.msrp_cents) + '</s>';
    h += '</span>';
    if (save) h += '<span class="opick-save">Save ' + money(save) + '</span>';
    h += '<span class="opick-list">';
    copy.items.forEach(function (i) { h += '<span>' + esc(i) + '</span>'; });
    h += '</span>';
    if (!b.available) h += '<span class="opick-out mono">Sold out</span>';
    h += '</span></label>';
    return h;
  }

  function matRow(a) {
    var h = '';
    h += '<label class="omat" data-mat="' + esc(a.id) + '">';
    h += '<input type="checkbox" name="ord-addon" value="' + esc(a.id) + '">';
    h += '<span class="omat-in">';
    h += '<span class="omat-name">' + esc(a.name) + '</span>';
    h += '<span class="omat-price">' + money(a.price_cents);
    if (a.msrp_cents) h += ' <s>' + money(a.msrp_cents) + '</s>';
    h += '</span>';
    h += '<span class="omat-state mono"></span>';
    h += '</span></label>';
    return h;
  }

  function deliverStep() {
    var p = cat.pickup || {};
    var h = '';

    h += '<fieldset class="ord-step">';
    h += '<legend><span class="ord-num">3</span> Are you picking up locally?</legend>';
    h += '<div class="ord-body ord-body--deliver">';

    if (p.available) {
      h += '<p class="ord-hint ord-hint--loud">Pick one. We do not want anyone paying for shipping when they could collect the box in person for nothing.</p>';
      h += '<div class="odels">';

      h += '<label class="odel odel--pickup">';
      h += '<input type="radio" name="ord-delivery" value="pickup">';
      h += '<span class="odel-in">';
      h += '<span class="odel-head"><b>Yes, I will pick it up</b>';
      h += '<span class="odel-amt" id="ord-pickup-amt">Free</span></span>';
      h += '<span class="odel-meta">';
      if (p.location) h += '<span class="odel-where">' + esc(p.location) + '</span>';
      if (p.date) h += '<span>' + esc(dateLong(p.date)) + '</span>';
      if (p.window) h += '<span>' + esc(p.window) + '</span>';
      if (p.area_note) h += '<span>' + esc(p.area_note) + '</span>';
      h += '</span>';
      if (p.orders_close) {
        h += '<span class="odel-note">Pickup orders close ' + esc(dateShort(p.orders_close)) + '.</span>';
      }
      h += '</span></label>';

      h += '<label class="odel odel--ship">';
      h += '<input type="radio" name="ord-delivery" value="ship">';
      h += '<span class="odel-in">';
      h += '<span class="odel-head"><b>No, ship it to me</b>';
      h += '<span class="odel-amt" id="ord-ship-amt"></span></span>';
      h += '<span class="odel-meta"><span>Posted from Chattanooga</span><span>Fulfillment begins November 2026</span></span>';
      h += '</span></label>';

      h += '</div>';
    } else {
      h += '<p class="ord-hint">Local pickup has closed. Orders ship from Chattanooga.</p>';
      h += '<div class="odels odels--one">';
      h += '<label class="odel odel--ship">';
      h += '<input type="radio" name="ord-delivery" value="ship">';
      h += '<span class="odel-in">';
      h += '<span class="odel-head"><b>Ship it to me</b>';
      h += '<span class="odel-amt" id="ord-ship-amt"></span></span>';
      h += '<span class="odel-meta"><span>Posted from Chattanooga</span><span>Fulfillment begins November 2026</span></span>';
      h += '</span></label>';
      h += '</div>';
    }

    /* Revealed by choosing pickup. Unskippable: the pay button stays off
       until it is ticked. */
    if (p.available) {
      h += '<div class="ord-confirm" id="ord-confirm-row" hidden>';
      h += '<label><input type="checkbox" id="ord-confirm"><span>';
      h += 'Yes, I can collect it on <b>' + esc(dateLong(p.date)) + '</b>';
      if (p.window) h += ' between <b>' + esc(windowWords(p.window)) + '</b>';
      if (p.location) h += ', at ' + esc(p.location);
      h += '.</span></label>';
      h += '</div>';
    }

    /* Revealed by choosing shipping. */
    h += '<div class="ord-region" id="ord-region-row" hidden>';
    h += '<label for="ord-region">Where are we shipping to?</label>';
    h += '<select id="ord-region"><option value="">Choose a region</option>';
    (cat.regions || []).forEach(function (r) {
      h += '<option value="' + esc(r.id) + '">' + esc(r.label) + '</option>';
    });
    h += '</select>';
    if (cat.excluded_note) h += '<p class="ord-excluded">' + esc(cat.excluded_note) + '</p>';
    h += '</div>';

    h += '</div></fieldset>';
    return h;
  }

  function panel() {
    var h = '';

    if (cat.promo && cat.promo.label) {
      h += '<p class="ord-promo mono">' + esc(cat.promo.label);
      if (cat.promo.ends) h += ' <span>through ' + esc(dateShort(cat.promo.ends)) + '</span>';
      h += '</p>';
    }

    h += '<form class="ord-form" id="ord-form" novalidate>';

    h += '<fieldset class="ord-step">';
    h += '<legend><span class="ord-num">1</span> Choose your edition</legend>';
    h += '<div class="ord-body">';
    h += '<div class="opicks">' + (cat.bundles || []).map(bundleCard).join('') + '</div>';
    h += '</div></fieldset>';

    h += '<fieldset class="ord-step">';
    h += '<legend><span class="ord-num">2</span> Add playmats <span class="ord-opt">optional</span></legend>';
    h += '<div class="ord-body">';
    h += '<p class="ord-hint" id="ord-mat-hint"></p>';
    h += '<div class="omats">' + (cat.addons || []).map(matRow).join('') + '</div>';
    h += '</div></fieldset>';

    h += deliverStep();

    h += '<div class="ord-sum">';
    h += '<dl class="ord-lines" id="ord-lines"></dl>';
    h += '<p class="ord-total"><span>Total</span><b id="ord-total">Choose an edition</b></p>';
    h += '<p class="ord-err" id="ord-err" role="alert" hidden></p>';
    h += '<button class="btn ord-pay" id="ord-pay" type="submit" disabled>' + PAY_LABEL + '</button>';
    h += '<p class="ord-fine">Card payment is handled by Stripe on their own secure page. We never see your card details.</p>';
    h += '<p class="ord-fine">Need more than one copy? Email <a href="mailto:' + MAIL + '">' + MAIL + '</a> and we will sort it out so you are not charged shipping twice.</p>';
    h += '</div>';

    h += '</form>';
    return h;
  }

  /* ---------- the published rate table ----------
     The same numbers that price the order, so the table on the page and the
     amount charged at checkout cannot drift apart. Adjacent mat counts that
     cost the same everywhere are merged into one column, which is what turns
     six columns into four. */

  function matLabel(from, to) {
    if (from === 0 && to === 0) return 'Game only';
    if (from === to) return '+ ' + from + (from === 1 ? ' playmat' : ' playmats');
    return '+ ' + from + '\u2013' + to + ' playmats';
  }

  function rateTable() {
    var host = document.getElementById('shipping-rates');
    if (!host) return;

    var regions = cat.regions || [];
    var rows = (cat.shipping_quotes || {}).core;
    if (!rows || !regions.length) return;

    var counts = Object.keys(rows).map(Number).sort(function (a, b) { return a - b; });
    var groups = [];
    counts.forEach(function (n) {
      var key = regions.map(function (r) { return rows[String(n)][r.id]; }).join('|');
      var last = groups[groups.length - 1];
      if (last && last.key === key) { last.to = n; return; }
      groups.push({ from: n, to: n, key: key, vals: rows[String(n)] });
    });

    var h = '';
    h += '<table>';
    h += '<caption class="vh">Shipping cost in US dollars by region and the number of playmats in the order</caption>';
    h += '<thead><tr><th scope="col">Region</th>';
    groups.forEach(function (g) { h += '<th scope="col">' + esc(matLabel(g.from, g.to)) + '</th>'; });
    h += '</tr></thead><tbody>';
    regions.forEach(function (r) {
      h += '<tr><th scope="row">' + esc(r.label) + '</th>';
      groups.forEach(function (g) {
        var v = g.vals[r.id];
        h += '<td>' + (typeof v === 'number' ? money(v) : '&mdash;') + '</td>';
      });
      h += '</tr>';
    });
    if (cat.pickup && cat.pickup.available) {
      h += '<tr><th scope="row">Local pickup, ' + esc((cat.pickup.area_note || 'Chattanooga')) + '</th>';
      groups.forEach(function () { h += '<td>Free</td>'; });
      h += '</tr>';
    }
    h += '</tbody></table>';
    h += '<p class="shipping-foot">The Overlord Bundle already contains the Board Mat, so it starts one column along.</p>';

    host.innerHTML = h;
  }

  /* ---------- sync: everything that changes as they choose ---------- */

  function sync() {
    var b = bundle(sel.bundle);
    var p = cat.pickup || {};

    /* step 2: what can be added, and why not */
    if (els.matHint) {
      els.matHint.textContent = !b
        ? 'Choose an edition first. Playmats are an add-on to a game, not sold on their own.'
        : 'Full size 24" × 14" mats, rubber backed. Add as many as you like, one of each.';
    }

    Array.prototype.forEach.call(root.querySelectorAll('.omat'), function (row) {
      var id = row.getAttribute('data-mat');
      var box = row.querySelector('input');
      var state = row.querySelector('.omat-state');
      var a = addon(id);
      var note = '';

      box.disabled = !canAdd(id) && !sel.addons[id];
      /* Dim a mat only once an edition is chosen and it genuinely cannot be
         added. Before that every mat is disabled, because a mat needs a game,
         and dimming the lot would read as though they were all sold out. */
      row.classList.toggle('is-off', !!b && box.disabled && !sel.addons[id]);

      if (!a) {
        note = '';
      } else if (!a.available) {
        note = 'Sold out';
        row.classList.add('is-out');
      } else if (b && (b.addable_addons || []).indexOf(id) < 0) {
        note = 'Already in this bundle';
      } else if (b && box.disabled) {
        note = 'Limit reached';
      } else if (typeof a.remaining === 'number') {
        /* Shown before an edition is picked too. How few are left is
           exactly what someone deciding wants to know. */
        note = a.remaining + ' left';
      }
      if (state) state.textContent = note;
    });

    /* step 3: what each delivery choice costs right now */
    if (els.pickupAmt) {
      var saved = quote('us');
      els.pickupAmt.textContent = saved ? 'Free, save ' + money(saved) : 'Free';
    }
    if (els.shipAmt) {
      if (sel.region) {
        var exact = quote(sel.region);
        els.shipAmt.textContent = exact === null ? '' : money(exact);
      } else {
        var from = b ? quote('us') : cheapestAnywhere();
        els.shipAmt.textContent = from === null ? '' : 'from ' + money(from);
      }
    }

    if (els.confirmRow) els.confirmRow.hidden = sel.delivery !== 'pickup';
    if (els.regionRow) els.regionRow.hidden = sel.delivery !== 'ship';

    /* the running total */
    var lines = '';
    if (b) {
      lines += '<div><dt>' + esc(b.name) + '</dt><dd>' + money(b.price_cents) + '</dd></div>';
      (cat.addons || []).forEach(function (a) {
        if (sel.addons[a.id]) {
          lines += '<div><dt>' + esc(a.name) + '</dt><dd>' + money(a.price_cents) + '</dd></div>';
        }
      });
      if (sel.delivery === 'pickup') {
        lines += '<div><dt>Local pickup, ' + esc(p.location || 'Chattanooga') + '</dt><dd>Free</dd></div>';
      } else if (sel.delivery === 'ship') {
        var label = 'Shipping';
        (cat.regions || []).forEach(function (r) { if (r.id === sel.region) label = 'Shipping to ' + r.label; });
        var s = sel.region ? quote(sel.region) : null;
        lines += '<div><dt>' + esc(label) + '</dt><dd>' + (s === null ? 'Choose a region' : money(s)) + '</dd></div>';
      }
    }
    if (els.lines) els.lines.innerHTML = lines;

    if (els.total) {
      if (!b) {
        els.total.innerHTML = '<small>Choose an edition to start</small>';
      } else if (sel.delivery === 'ship' && !sel.region) {
        els.total.innerHTML = money(itemsTotal()) + '<small>plus shipping</small>';
      } else if (sel.delivery === 'ship') {
        els.total.textContent = money(itemsTotal() + (quote(sel.region) || 0));
      } else if (sel.delivery === 'pickup') {
        els.total.textContent = money(itemsTotal());
      } else {
        els.total.innerHTML = money(itemsTotal()) + '<small>plus pickup or shipping</small>';
      }
    }

    if (els.pay) els.pay.disabled = !ready();
  }

  function showError(msg) {
    if (!els.err) return;
    if (!msg) { els.err.hidden = true; els.err.textContent = ''; return; }
    els.err.hidden = false;
    els.err.textContent = msg;
  }

  /* ---------- events ---------- */

  function wire() {
    els.form = document.getElementById('ord-form');
    els.matHint = document.getElementById('ord-mat-hint');
    els.pickupAmt = document.getElementById('ord-pickup-amt');
    els.shipAmt = document.getElementById('ord-ship-amt');
    els.confirmRow = document.getElementById('ord-confirm-row');
    els.regionRow = document.getElementById('ord-region-row');
    els.lines = document.getElementById('ord-lines');
    els.total = document.getElementById('ord-total');
    els.err = document.getElementById('ord-err');
    els.pay = document.getElementById('ord-pay');

    root.addEventListener('change', function (e) {
      var t = e.target;
      if (!t || !t.name && t.id !== 'ord-confirm' && t.id !== 'ord-region') return;

      if (t.name === 'ord-bundle') {
        sel.bundle = t.value;
        /* A bundle that already contains a mat cannot also have it added,
           and a narrower bundle may allow fewer mats than are ticked. */
        Object.keys(sel.addons).forEach(function (id) {
          if (sel.addons[id] && !canAdd(id)) {
            sel.addons[id] = false;
            var box = root.querySelector('.omat[data-mat="' + id + '"] input');
            if (box) box.checked = false;
          }
        });
        showError('');
      } else if (t.name === 'ord-addon') {
        if (t.checked && !canAdd(t.value)) { t.checked = false; return; }
        sel.addons[t.value] = t.checked;
      } else if (t.name === 'ord-delivery') {
        sel.delivery = t.value;
        if (t.value === 'pickup') { sel.region = null; }
        if (t.value === 'ship') { sel.confirm = false; }
        var cb = document.getElementById('ord-confirm');
        if (cb && t.value === 'ship') cb.checked = false;
        var rs = document.getElementById('ord-region');
        if (rs && t.value === 'pickup') rs.value = '';
        showError('');
      } else if (t.id === 'ord-confirm') {
        sel.confirm = t.checked;
      } else if (t.id === 'ord-region') {
        sel.region = t.value || null;
      }
      sync();
    });

    els.form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (!ready()) return;
      checkout();
    });
  }

  /* ---------- checkout ---------- */

  function checkout() {
    var body = { bundle: sel.bundle, addons: {}, delivery: sel.delivery };
    Object.keys(sel.addons).forEach(function (id) { if (sel.addons[id]) body.addons[id] = 1; });
    if (sel.delivery === 'ship') body.region = sel.region;

    showError('');
    els.pay.disabled = true;
    els.pay.textContent = 'Opening checkout…';

    if (typeof gtag === 'function') {
      gtag('event', 'begin_checkout', { items: [{ item_id: sel.bundle }] });
    }

    fetch(API + '/api/checkout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    }).then(function (res) {
      return res.json().catch(function () { return {}; }).then(function (data) {
        return { status: res.status, ok: res.ok, data: data };
      });
    }).then(function (r) {
      if (r.ok && r.data && r.data.url) {
        window.location.href = r.data.url;
        return;
      }
      resetPay();
      handleError(r.data || {});
    }).catch(function () {
      resetPay();
      showError('We could not reach the store. Check your connection and try again, or email ' + MAIL + '.');
    });
  }

  function resetPay() {
    els.pay.textContent = PAY_LABEL;
    els.pay.disabled = !ready();
  }

  function handleError(data) {
    var code = data.error;

    if (code === 'out_of_stock') {
      var name = (data.item && addon(data.item) && addon(data.item).name) || 'One of those playmats';
      var left = typeof data.remaining === 'number'
        ? (data.remaining === 0 ? ' There are none left.' : ' Only ' + data.remaining + ' left.')
        : '';
      reload(name + ' sold out while you were choosing.' + left + ' The counts below are up to date now.');
      return;
    }
    if (code === 'bundle_unavailable') {
      reload('That edition has just sold out. The list below is up to date now.');
      return;
    }
    if (code === 'pickup_closed') {
      reload('Local pickup has closed. Choose shipping instead.');
      return;
    }
    if (code === 'checkout_unavailable') {
      showError('Ordering is temporarily unavailable. Email ' + MAIL + ' and we will take your order by hand.');
      return;
    }
    /* invalid_selection, invalid_region, addon_without_bundle: the server
       rejected something this page should never have sent. Say nothing about
       the detail, which would only describe our own bug. */
    showError('Something went wrong putting that order together. Email ' + MAIL + ' and we will take it by hand.');
  }

  /* Refetch the catalog and rebuild, keeping whatever is still valid. */
  function reload(message) {
    var keep = { bundle: sel.bundle, addons: sel.addons, delivery: sel.delivery, region: sel.region };
    load(keep, message);
  }

  function restore(keep) {
    if (!keep) return;

    var b = bundle(keep.bundle);
    if (b && b.available) {
      sel.bundle = keep.bundle;
      var radio = root.querySelector('input[name="ord-bundle"][value="' + keep.bundle + '"]');
      if (radio) radio.checked = true;
    }

    Object.keys(keep.addons || {}).forEach(function (id) {
      if (keep.addons[id] && canAdd(id)) {
        sel.addons[id] = true;
        var box = root.querySelector('.omat[data-mat="' + id + '"] input');
        if (box) box.checked = true;
      }
    });

    if (keep.delivery === 'pickup' && (cat.pickup || {}).available) {
      sel.delivery = 'pickup';
      var pr = root.querySelector('input[name="ord-delivery"][value="pickup"]');
      if (pr) pr.checked = true;
    } else if (keep.delivery === 'ship' || keep.delivery === 'pickup') {
      sel.delivery = 'ship';
      var sr = root.querySelector('input[name="ord-delivery"][value="ship"]');
      if (sr) sr.checked = true;
      if (keep.region) {
        sel.region = keep.region;
        var rs = document.getElementById('ord-region');
        if (rs) rs.value = keep.region;
      }
    }
    /* The pickup confirmation is deliberately never restored. Anyone who
       gets here again has to tick it again. */
  }

  /* ---------- load ---------- */

  function load(keep, message) {
    root.innerHTML = '<p class="ord-boot">Loading the store…</p>';

    fetch(API + '/api/catalog', { headers: { Accept: 'application/json' } })
      .then(function (res) {
        if (!res.ok) throw new Error('catalog ' + res.status);
        return res.json();
      })
      .then(function (data) {
        if (!data || !data.bundles || !data.bundles.length) throw new Error('empty catalog');
        cat = data;
        sel = { bundle: null, addons: {}, delivery: null, region: null, confirm: false };
        root.innerHTML = panel();
        wire();
        restore(keep);
        sync();
        rateTable();
        if (message) showError(message);
      })
      .catch(function () {
        down('The store is not responding right now.');
      });
  }

  load();

  /* Coming back from Stripe through the back button restores this page from
     the bfcache with the pay button still disabled and stock counts from
     before the order. Rebuild rather than hand back a stale panel. */
  window.addEventListener('pageshow', function (e) {
    if (e.persisted) load();
  });
})();
