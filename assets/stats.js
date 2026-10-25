/*! stats.js - reads cookieless counters and renders the traffic page. */
(function () {
  'use strict';
  var CFG = window.SEO_OPS || {};
  var NS = CFG.ns || location.hostname.replace(/^www\./, '');
  var PAGES = CFG.pages || [{ key: ':PATH:root', label: '/' }];
  var API = 'https://abacus.jasoncameron.dev/get/' + encodeURIComponent(NS) + '/';
  var DAYS = 14;

  function get(key) {
    return fetch(API + key, { mode: 'cors', cache: 'no-store' })
      .then(function (r) { return r.ok ? r.json() : { value: 0 }; })
      .then(function (j) { return Number(j && j.value) || 0; })
      .catch(function () { return 0; });
  }
  function dayStr(off) {
    var d = new Date();
    d.setDate(d.getDate() - off);
    return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
  }
  /* serial with small gap: keeps us under the API's 30 requests / 10 s limit */
  function series(keys) {
    var out = [];
    return keys.reduce(function (p, k, i) {
      return p.then(function () {
        return get(k).then(function (v) {
          out.push({ key: k, value: v });
          return new Promise(function (res) { setTimeout(res, i % 4 === 3 ? 320 : 40); });
        });
      });
    }, Promise.resolve()).then(function () { return out; });
  }

  var days = [];
  for (var i = 0; i < DAYS; i++) days.push(dayStr(i));

  Promise.all([
    series(days.map(function (d) { return 'd-' + d; })),
    series(days.map(function (d) { return 'u-' + d; })),
    series((PAGES || []).map(function (p) { return p.key; }))
  ]).then(function (res) {
    var daily = res[0].map(function (r) { return { day: r.key.slice(2), value: r.value }; }).reverse();
    var uniq = res[1].reduce(function (a, r) { return a + r.value; }, 0);
    var pages = res[2].map(function (r, idx) { return { label: PAGES[idx].label, value: r.value }; })
      .sort(function (a, b) { return b.value - a.value; });

    var sum = function (n) { return daily.slice(-n).reduce(function (a, d) { return a + d.value; }, 0); };
    document.getElementById('c-today').textContent = sum(1).toLocaleString();
    document.getElementById('c-7').textContent = sum(7).toLocaleString();
    document.getElementById('c-14').textContent = sum(14).toLocaleString();
    document.getElementById('c-u').textContent = uniq.toLocaleString();

    var max = Math.max.apply(null, daily.map(function (d) { return d.value; }).concat([1]));
    var tb = document.getElementById('daily');
    tb.innerHTML = daily.map(function (d) {
      var w = Math.round((d.value / max) * 100);
      return '<tr><td>' + d.day + '</td><td class="n">' + d.value.toLocaleString() +
        '</td><td><div class="bar" style="width:' + w + '%"></div></td></tr>';
    }).join('');

    var pt = document.getElementById('pages');
    pt.innerHTML = pages.map(function (p) {
      return '<tr><td>' + p.label + '</td><td class="n">' + p.value.toLocaleString() + '</td></tr>';
    }).join('');

    var pv = pages.reduce(function (a, p) { return a + p.value; }, 0);
    document.getElementById('total').innerHTML =
      '<div class="card"><div class="k">All-time pageviews (tracked pages)</div><div class="v">' +
      pv.toLocaleString() + '</div></div>';
  });
})();
