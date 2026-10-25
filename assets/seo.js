/*! seo-ops v1 - cookie consent + cookieless visitor counting.
 *  No cookies, no IDs, no fingerprinting, no personal data leaves the browser.
 *  Aggregate pageviews only (Abacus + optional GoatCounter).
 *  Config via window.SEO_OPS = { ns: "example.com", goatcounter: "https://x.goatcounter.com/count", privacy: "/privacy.html", brand: "#0b3d2e" }
 */
(function () {
  'use strict';
  var CFG = window.SEO_OPS || {};
  var NS = CFG.ns || location.hostname.replace(/^www\./, '');
  var GC = CFG.goatcounter || '';
  var PRIVACY = CFG.privacy || '/privacy.html';
  var ACCENT = CFG.brand || '#14532d';
  var API = 'https://abacus.jasoncameron.dev/hit/' + encodeURIComponent(NS) + '/';
  var KEY = 'seo_ops_v1';

  var store = {
    get: function () { try { return JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {} }
  };
  function today() {
    var d = new Date();
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  function hit(key) {
    try {
      fetch(API + key, { mode: 'cors', cache: 'no-store', keepalive: true, credentials: 'omit' })
        .catch(function () {});
    } catch (e) {}
  }

  var consent = store.get() || {};

  /* page key: deterministic, same rule used by stats.html
     "/" -> "root", "/faq.html" -> "faq.html", "/sub/page.html" -> "sub-page.html" */
  function pageKey() {
    var p = (location.pathname || "/").toLowerCase().replace(/^\//, "").replace(/\/$/, "");
    if (p === "" || p === "index.html") return "root";
    return p.replace(/\//g, "-").replace(/[^a-z0-9._-]/g, "-").replace(/-+/g, "-");
  }

  /* ---- aggregate pageview (cookieless, always on, disclosed in banner) ---- */
  hit('d-' + today());          // one counter per calendar day
  hit(pageKey());               // one counter per page path

  /* ---- returning-visitor count: only with consent ---- */
  if (consent.analytics === true) {
    var seen = 'seo_seen_' + today();
    try {
      if (!localStorage.getItem(seen)) {
        localStorage.setItem(seen, '1');
        hit('u-' + today());
      }
    } catch (e) {}
  }

  /* ---- GoatCounter (cookieless, already deployed on some sites) ---- */
  if (GC) {
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://gc.zgo.at/count.js';
    s.setAttribute('data-goatcounter', GC);
    document.head.appendChild(s);
  }

  /* ---- event tracking: <a data-track="buy"> ... </a> ---- */
  document.addEventListener('click', function (ev) {
    var el = ev.target;
    while (el && el !== document.body) {
      if (el.hasAttribute && el.hasAttribute('data-track')) {
        hit(String(el.getAttribute('data-track')).replace(/[^A-Za-z0-9_.:-]/g, '-') || 'click');
        return;
      }
      el = el.parentNode;
    }
  }, true);

  /* ---- consent banner (first visit only) ---- */
  function banner() {
    if (consent.choice) return;
    var css = ''
      + '#seo-consent{position:fixed;left:0;right:0;bottom:0;z-index:99998;background:#fff;color:#1a1a1a;'
      + 'border-top:3px solid ' + ACCENT + ';box-shadow:0 -2px 14px rgba(0,0,0,.13);font:15px/1.5 system-ui,-apple-system,Segoe UI,sans-serif;'
      + 'padding:14px 18px;display:flex;gap:14px;flex-wrap:wrap;align-items:center;justify-content:center}'
      + '#seo-consent p{margin:0;max-width:640px}'
      + '#seo-consent a{color:' + ACCENT + ';text-decoration:underline}'
      + '#seo-consent button{font:inherit;font-weight:600;cursor:pointer;border-radius:6px;padding:9px 16px;border:1px solid ' + ACCENT + '}'
      + '#seo-consent .ok{background:' + ACCENT + ';color:#fff}'
      + '#seo-consent .no{background:#fff;color:' + ACCENT + '}'
      + '@media(max-width:560px){#seo-consent{font-size:14px;padding:12px}#seo-consent button{flex:1 1 45%}}';
    var st = document.createElement('style');
    st.textContent = css;
    document.head.appendChild(st);
    var d = document.createElement('div');
    d.id = 'seo-consent';
    d.setAttribute('role', 'dialog');
    d.setAttribute('aria-label', 'Cookie and privacy choice');
    d.innerHTML = '<p>We count visits with no cookies and no personal data. Choose <strong>Accept</strong> to also '
      + 'remember repeat visits on this device. <a href="' + PRIVACY + '">Privacy</a>.</p>'
      + '<button class="ok" type="button">Accept</button>'
      + '<button class="no" type="button">Essential only</button>';
    document.body.appendChild(d);
    function done(v) {
      consent.choice = v;
      consent.analytics = v === 'accept';
      consent.ts = new Date().toISOString();
      store.set(consent);
      d.parentNode && d.parentNode.removeChild(d);
      if (v === 'accept') hit('u-' + today());
    }
    d.querySelector('.ok').addEventListener('click', function () { done('accept'); });
    d.querySelector('.no').addEventListener('click', function () { done('essential'); });
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', banner);
  } else {
    banner();
  }

  window.seoOps = { hit: hit, consent: consent };
})();
