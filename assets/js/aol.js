/* ==========================================================================
   America Online, circa 1995 — the fun bits.
   No dependencies. Everything here is progressive enhancement: with JS
   disabled the site still reads and navigates perfectly well.
   ========================================================================== */
(function () {
  'use strict';

  var KEYWORDS = window.AOL_KEYWORDS || [];
  var BASE = (window.AOL_BASEURL || '').replace(/\/$/, '');
  var reduceMotion = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function go(url) { window.location.href = BASE + url; }

  /* --- Win95 dialog ------------------------------------------------------- */

  function dialog(opts) {
    var existing = document.querySelector('.modal-backdrop');
    if (existing) existing.remove();

    var back = document.createElement('div');
    back.className = 'modal-backdrop';
    back.innerHTML =
      '<div class="dialog" role="dialog" aria-modal="true" aria-label="' +
        esc(opts.title) + '">' +
        '<div class="dialog-title"><span>' + esc(opts.title) + '</span>' +
          '<button class="dialog-x" aria-label="Close">&#10005;</button></div>' +
        '<div class="dialog-body">' + opts.body + '</div>' +
        '<div class="dialog-buttons"></div>' +
      '</div>';

    var buttons = back.querySelector('.dialog-buttons');
    (opts.buttons || [{ label: 'OK' }]).forEach(function (b) {
      var el = document.createElement('button');
      el.className = 'w95-btn';
      el.textContent = b.label;
      el.addEventListener('click', function () {
        close();
        if (b.onClick) b.onClick();
      });
      buttons.appendChild(el);
    });

    function close() {
      document.removeEventListener('keydown', onKey);
      back.remove();
      if (opts.onClose) opts.onClose();
    }
    function onKey(e) { if (e.key === 'Escape') close(); }

    back.querySelector('.dialog-x').addEventListener('click', close);
    back.addEventListener('click', function (e) { if (e.target === back) close(); });
    document.addEventListener('keydown', onKey);
    document.body.appendChild(back);

    var first = buttons.querySelector('button');
    if (first) first.focus();
    return close;
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* --- A short, polite chime (no audio files) ----------------------------- */

  function chime() {
    var Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    try {
      var ctx = new Ctx();
      [523.25, 659.25, 783.99].forEach(function (freq, i) {
        var osc = ctx.createOscillator();
        var gain = ctx.createGain();
        var t = ctx.currentTime + i * 0.13;
        osc.type = 'sine';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.0001, t);
        gain.gain.exponentialRampToValueAtTime(0.16, t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.42);
        osc.connect(gain).connect(ctx.destination);
        osc.start(t);
        osc.stop(t + 0.45);
      });
      setTimeout(function () { ctx.close(); }, 1400);
    } catch (e) { /* no audio, no problem */ }
  }

  /* --- Easter eggs -------------------------------------------------------- */

  var eggs = {
    mail: function () {
      chime();
      dialog({
        title: 'America Online',
        body:
          '<div class="dlg-row">' +
            '<div class="dlg-icon">&#9993;</div>' +
            '<div><p class="dlg-shout">You&#39;ve Got Mail!</p>' +
            '<p>You have <strong>1</strong> unread message in your Online Mailbox.</p>' +
            '<p class="dlg-small">From: sysadmin@aol.com &mdash; Subject: re: re: FWD: your blog</p></div>' +
          '</div>',
        buttons: [
          { label: 'Read', onClick: function () {
              dialog({
                title: 'Read Mail',
                body:
                  '<p class="dlg-small">From: sysadmin@aol.com<br>' +
                  'Date: Sat, 10 Dec 1995 03:14:00 -0500<br>' +
                  'Subject: re: re: FWD: your blog</p><hr>' +
                  '<p>Sam &mdash; your blog went five years without a single edit.</p>' +
                  '<p>Fixed the typos. Fixed the broken images. Made it look like 1995.</p>' +
                  '<p>You&#39;re welcome.</p>' +
                  '<p class="dlg-small">&gt; Sent from my 28.8 kbps modem</p>'
              });
            } },
          { label: 'Keep as New' }
        ]
      });
    },

    goodbye: function () {
      var overlay = document.createElement('div');
      overlay.className = 'goodbye';
      overlay.innerHTML =
        '<div class="goodbye-inner">' +
          '<p class="goodbye-word">Goodbye!</p>' +
          '<p>Thank you for using America Online.</p>' +
          '<p class="dlg-small">You were online for 4 hours and 12 minutes.<br>' +
          'Your parents are going to see the phone bill.</p>' +
          '<button class="w95-btn" id="signon">Sign On</button>' +
        '</div>';
      document.body.appendChild(overlay);
      var btn = overlay.querySelector('#signon');
      btn.focus();
      btn.addEventListener('click', function () { overlay.remove(); });
    },

    upgrade: function () {
      dialog({
        title: 'Special Offer!',
        body:
          '<div class="dlg-row"><div class="dlg-icon">&#128191;</div>' +
          '<div><p class="dlg-shout">50 FREE HOURS!</p>' +
          '<p>Your free America Online CD-ROM is on its way. And another one. ' +
          'And one taped to a magazine. And one in the cereal.</p>' +
          '<p class="dlg-small">Offer valid until the heat death of the universe.</p></div></div>'
      });
    },

    dialup: function (statusEl) {
      if (!statusEl || statusEl.dataset.busy === '1') return;
      var steps = ['Dialing 1-800-827-6364...', 'Connecting...',
                   'Verifying password...', 'Connected at 28.8k'];
      if (reduceMotion) { statusEl.textContent = steps[steps.length - 1]; return; }
      statusEl.dataset.busy = '1';
      var original = statusEl.textContent, i = 0;
      var timer = setInterval(function () {
        statusEl.textContent = steps[i++];
        if (i >= steps.length) {
          clearInterval(timer);
          setTimeout(function () {
            statusEl.textContent = original;
            statusEl.dataset.busy = '0';
          }, 1600);
        }
      }, 620);
    }
  };

  /* --- Keyword box -------------------------------------------------------- */

  function lookup(raw) {
    var q = String(raw || '').trim().toUpperCase().replace(/^KEYWORD:\s*/, '');
    if (!q) return;
    for (var i = 0; i < KEYWORDS.length; i++) {
      if (KEYWORDS[i].keyword.toUpperCase() === q) return KEYWORDS[i];
    }
    return null;
  }

  function runKeyword(raw) {
    var hit = lookup(raw);
    if (hit === undefined) return;
    if (!hit) {
      dialog({
        title: 'Keyword Not Found',
        body: '<div class="dlg-row"><div class="dlg-icon">&#9888;</div><div>' +
              '<p>America Online does not recognize the keyword ' +
              '<strong>' + esc(String(raw).toUpperCase()) + '</strong>.</p>' +
              '<p class="dlg-small">Try one from the Keyword directory.</p></div></div>',
        buttons: [
          { label: 'Directory', onClick: function () { go('/keywords/'); } },
          { label: 'Cancel' }
        ]
      });
      return;
    }
    if (hit.action && eggs[hit.action]) return eggs[hit.action]();
    if (hit.url) go(hit.url);
  }

  /* --- Wiring ------------------------------------------------------------- */

  document.addEventListener('DOMContentLoaded', function () {
    var form = document.querySelector('.keyword-form');
    if (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        var input = form.querySelector('input');
        runKeyword(input.value);
        input.value = '';
      });
    }

    // Anything on a page can ask for a keyword, e.g. the directory table.
    document.querySelectorAll('[data-keyword]').forEach(function (el) {
      el.addEventListener('click', function (e) {
        e.preventDefault();
        runKeyword(el.getAttribute('data-keyword'));
      });
    });

    // The window close button actually "closes" AOL.
    var x = document.querySelector('.tb-close');
    if (x) {
      x.addEventListener('click', function () { eggs.goodbye(); });
    }

    // Clicking the logo redials.
    var mark = document.querySelector('.titlebar .mark');
    var status = document.querySelector('.statusbar .conn');
    if (mark && status) {
      mark.style.cursor = 'pointer';
      mark.setAttribute('title', 'Reconnect');
      mark.addEventListener('click', function () { eggs.dialup(status); });
    }

    // Konami code.
    var seq = ['ArrowUp','ArrowUp','ArrowDown','ArrowDown','ArrowLeft','ArrowRight',
               'ArrowLeft','ArrowRight','b','a'];
    var pos = 0;
    document.addEventListener('keydown', function (e) {
      var tag = (e.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      var want = seq[pos];
      var got = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      pos = (got === want) ? pos + 1 : (got === seq[0] ? 1 : 0);
      if (pos === seq.length) { pos = 0; eggs.mail(); }
    });
  });

  /* --- For whoever opens the console -------------------------------------- */

  try {
    console.log(
      '%c   ▶  AMERICA ONLINE  \n' +
      '%c   Welcome, Sam!\n\n' +
      '   Keyword box is in the toolbar. Try MAIL, GOODBYE or UPGRADE.\n' +
      '   The ✕ button does what you think it does.\n' +
      '   ↑↑↓↓←→←→BA still works.\n',
      'background:#1a4b9c;color:#fc0;font-weight:bold;font-size:14px',
      'color:#1a4b9c;font-weight:bold'
    );
  } catch (e) { /* older console, never mind */ }
})();
