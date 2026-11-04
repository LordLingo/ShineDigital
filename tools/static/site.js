/*
 * Shine Digital: runtime for the static site.
 * Everything visible is already in the HTML. This file only adds behaviour:
 * mobile menu, hover effects, package pick, request form, WhatsApp pill.
 * Hand-written. Copied (with a content hash in the name) by tools/build-static.js.
 */
(function () {
  'use strict';
  var d = document;
  var w = window;

  var data = {};
  try { data = JSON.parse(d.getElementById('sd-data').textContent) || {}; } catch (err) {}
  var t = data.t || {};
  var EMAIL = data.email || 'contact@shinedigital.ro';

  function all(sel, root) { return Array.prototype.slice.call((root || d).querySelectorAll(sel)); }
  function calm() {
    try { return !!(w.matchMedia && w.matchMedia('(prefers-reduced-motion: reduce)').matches); } catch (err) { return false; }
  }

  /* ---- Mobile menu ---------------------------------------------------- */
  var burger = d.querySelector('[data-menu-toggle]');
  var menu = d.getElementById('s-menu');
  function setMenu(open) {
    if (!burger || !menu) return;
    menu.hidden = !open;
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (burger && menu) {
    burger.addEventListener('click', function () { setMenu(menu.hidden); });
    menu.addEventListener('click', function (e) {
      var a = e.target && e.target.closest ? e.target.closest('a') : null;
      if (a) setMenu(false);
    });
    d.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !menu.hidden) { setMenu(false); burger.focus(); }
    });
    w.addEventListener('resize', function () {
      if (!menu.hidden && w.innerWidth >= 920) setMenu(false);
    });
  }

  /* ---- Card spotlight and hero tilt ----------------------------------- */
  all('[data-spot]').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      var r = el.getBoundingClientRect();
      el.style.setProperty('--mx', (e.clientX - r.left) + 'px');
      el.style.setProperty('--my', (e.clientY - r.top) + 'px');
    }, { passive: true });
  });
  all('[data-tilt]').forEach(function (el) {
    el.addEventListener('pointermove', function (e) {
      if (calm() || (e.pointerType && e.pointerType !== 'mouse')) return;
      var r = el.getBoundingClientRect();
      var px = (e.clientX - r.left) / r.width - 0.5;
      var py = (e.clientY - r.top) / r.height - 0.5;
      el.style.setProperty('--ry', (px * 12).toFixed(2) + 'deg');
      el.style.setProperty('--rx', (-py * 9).toFixed(2) + 'deg');
    }, { passive: true });
    el.addEventListener('pointerleave', function () {
      el.style.setProperty('--ry', '0deg');
      el.style.setProperty('--rx', '0deg');
    });
  });

  /* ---- "Order <package>" buttons pre-select the package in the form ---- */
  all('a[data-pkg]').forEach(function (a) {
    a.addEventListener('click', function () {
      var sel = d.getElementById('f-pkg');
      var v = a.getAttribute('data-pkg');
      if (sel && /^(essential|signature|visibility)$/.test(v)) sel.value = v;
    });
  });

  /* ---- Request form: builds an email, nothing is sent from here ------- */
  var form = d.querySelector('form.s-fm');
  var ok = d.getElementById('s-ok');
  var pre = d.querySelector('.s-ok-pre');
  var mailBtn = d.getElementById('s-ok-mail');
  var copyBtn = d.querySelector('[data-copy]');
  var lastMsg = '';
  var copyTimer = 0;

  function setCopyLabel(kind) {
    if (!copyBtn) return;
    copyBtn.textContent = kind === 'ok' ? t.copy_ok : kind === 'sel' ? t.copy_sel : t.copy_default;
  }
  function flash(kind) {
    setCopyLabel(kind);
    clearTimeout(copyTimer);
    copyTimer = setTimeout(function () { setCopyLabel(''); }, 2400);
  }
  function selectPre() {
    try {
      if (pre && w.getSelection && d.createRange) {
        var rng = d.createRange();
        rng.selectNodeContents(pre);
        var sel = w.getSelection();
        sel.removeAllRanges();
        sel.addRange(rng);
      }
    } catch (err) {}
    flash('sel');
  }

  if (form && ok && pre) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var pkgs = { none: t.pkg_none, essential: t.pkg_essential, signature: t.pkg_signature, visibility: t.pkg_visibility };
      var buds = { none: t.bud_none, b1: t.bud_1, b2: t.bud_2, b3: t.bud_3, b4: t.bud_4 };
      var val = function (n) {
        var el = form.elements ? form.elements[n] : null;
        return el && el.value ? String(el.value).trim() : '';
      };
      var body = [
        t.m_pkg + ': ' + (pkgs[val('pachet')] || t.pkg_none),
        t.m_company + ': ' + val('companie'),
        t.m_field + ': ' + val('domeniu'),
        t.m_city + ': ' + val('localitate'),
        t.m_contact + ': ' + val('persoana'),
        t.m_email + ': ' + val('email'),
        t.m_phone + ': ' + (val('telefon') || '—'),
        t.m_budget + ': ' + (buds[val('buget')] || t.bud_none),
        '',
        t.m_want + ':',
        val('mesaj')
      ].join('\n');
      var subject = t.m_subject_pre + ' — ' + val('companie');
      var mailto = 'mailto:' + EMAIL + '?subject=' + encodeURIComponent(subject) +
        '&body=' + encodeURIComponent(body.replace(/\n/g, '\r\n'));
      lastMsg = t.m_to + ': ' + EMAIL + '\n' + t.m_subject + ': ' + subject + '\n\n' + body;
      pre.textContent = lastMsg;
      if (mailBtn) mailBtn.setAttribute('href', mailto);
      setCopyLabel('');
      ok.hidden = false;
      setTimeout(function () {
        try { ok.scrollIntoView({ behavior: calm() ? 'auto' : 'smooth', block: 'center' }); } catch (err) {}
      }, 80);
    });
  }

  if (copyBtn) {
    copyBtn.addEventListener('click', function () {
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(lastMsg).then(function () { flash('ok'); }, selectPre);
          return;
        }
      } catch (err) {}
      selectPre();
    });
  }

  /* ---- Floating WhatsApp pill steps aside near the form and final CTA --- */
  var wa = d.querySelector('.s-wa');
  var raf = 0;
  function waCheck() {
    raf = 0;
    if (!wa) return;
    var vh = w.innerHeight || (d.documentElement && d.documentElement.clientHeight) || 0;
    var hide = false;
    ['cere-un-site', 's-final'].forEach(function (id) {
      var el = d.getElementById(id);
      if (!el) return;
      var r = el.getBoundingClientRect();
      if (r.top < vh - 120 && r.bottom > 40) hide = true;
    });
    wa.classList.toggle('s-wa-off', hide);
  }
  function waQueue() {
    if (raf) return;
    if (w.requestAnimationFrame) raf = w.requestAnimationFrame(waCheck); else waCheck();
  }
  d.addEventListener('scroll', waQueue, { capture: true, passive: true });
  w.addEventListener('resize', waQueue);
  waQueue();

  /* ---- Language links keep the section you are reading ------------------ */
  all('a[data-lang-link]').forEach(function (a) {
    a.addEventListener('click', function () {
      if (w.location.hash) a.hash = w.location.hash;
    });
  });
})();
