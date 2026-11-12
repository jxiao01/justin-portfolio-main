// Small shared motions. Loaded (deferred) by every page.
(function() {
    const root = document.documentElement;
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

    // ---- 3. Cursor feedback -------------------------------------------------------------
    let pressTimer = null, pressedAt = 0, down = false;
    const press = function(on) {
        clearTimeout(pressTimer);
        if (on) { pressedAt = Date.now(); root.classList.add('cursor-press'); return; }
        // keep the pressed look for at least 90ms so a quick click is still visible
        pressTimer = setTimeout(function() { if (!down) root.classList.remove('cursor-press'); }, Math.max(0, 90 - (Date.now() - pressedAt)));
    };
    document.addEventListener('mousedown', function() { down = true; press(true); });
    document.addEventListener('mouseup', function() { down = false; press(false); });
    window.addEventListener('blur', function() { down = false; press(false); });
    // the hand taps once when it arrives on something clickable
    let onLink = false;
    document.addEventListener('mouseover', function(e) {
        if (reduce || down || !(e.target instanceof Element)) return;
        const now = getComputedStyle(e.target).cursor.indexOf('hand') !== -1;
        if (now && !onLink) {
            setTimeout(function() { if (!down) { press(true); setTimeout(function() { if (!down) press(false); }, 110); } }, 60);
        }
        onLink = now;
    });

    // ---- 0. Doodle frames -------------------------------------------------------------------
    // Everything hand-drawn exists in three slightly different stampings; html.boil-0/1/2 says
    // which one is showing. Cycled about seven times a second, like a hand-drawn GIF.
    const NS = 'http://www.w3.org/2000/svg';
    let frame = 0;
    const live = [];                                       // doodles that redraw on every frame
    root.classList.add('boil-0');
    if (!reduce) setInterval(function() {
        if (document.hidden) return;
        root.classList.remove('boil-' + frame);
        frame = (frame + 1) % 3;
        root.classList.add('boil-' + frame);
        live.forEach(function(d) { d.draw(); });
    }, 140);
    // a deterministic random source, so a doodle looks the same every time the page loads
    const rng = function(seed) {
        let s = seed % 2147483647 || 1;
        return function() { s = (s * 16807) % 2147483647; return s / 2147483647; };
    };
    // one-pixel wobble for stamped lines; a different wobble for each frame
    const wob = function(i, f) {
        return [Math.round(1.1 * Math.sin(i * 0.035 + f * 2.1) + 0.5 * Math.sin(i * 0.09 + f * 4.7)),
                Math.round(1.1 * Math.sin(i * 0.03 + f * 3.3 + 1.7) + 0.5 * Math.sin(i * 0.12 + f * 1.9))];
    };

    // ---- 1. Green highlighter bars with the cursor's hard pixel edge ------------------------------
    // For each highlighted word, draw a bar exactly its size (one canvas pixel per CSS pixel) and
    // bite uneven notches out of all four edges. Three versions per word, one per doodle frame.
    const roughBar = function(w, h, seed) {
        const c = document.createElement('canvas');
        c.width = w; c.height = h;
        const ctx = c.getContext('2d');
        const rnd = rng(seed);
        ctx.fillStyle = '#00ff88';
        ctx.fillRect(0, 0, w, h);
        for (let x = 0; x < w;) {                           // top and bottom edges
            const run = 2 + Math.floor(rnd() * 5);
            ctx.clearRect(x, 0, run, [0, 0, 1, 1, 2][Math.floor(rnd() * 5)]);
            const b = [0, 0, 1, 1, 2][Math.floor(rnd() * 5)];
            ctx.clearRect(x, h - b, run, b);
            x += run;
        }
        for (let y = 0; y < h;) {                           // left and right ends
            const run = 1 + Math.floor(rnd() * 2);
            ctx.clearRect(0, y, Math.floor(rnd() * 4), run);
            const r = Math.floor(rnd() * 4);
            ctx.clearRect(w - r, y, r, run);
            y += run;
        }
        return 'url(' + c.toDataURL() + ')';
    };
    const paintBars = function() {
        document.querySelectorAll('.project-list li a, .sidebar .bio h1, .doodle-hl').forEach(function(el, n) {
            const w = Math.round(el.offsetWidth);
            if (!w || el.dataset.hlWidth === String(w)) return;
            el.dataset.hlWidth = String(w);
            for (let f = 0; f < 3; f++) el.style.setProperty('--hl-' + f, roughBar(w, 8, 97 * (n + 1) + 13 * f + w));
        });
    };
    paintBars();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(paintBars);
    window.addEventListener('load', paintBars);
    window.addEventListener('resize', paintBars);
    window.addEventListener('doodle-hl', paintBars);     // a page changed the text of a highlighted word
    document.addEventListener('submit', function() { setTimeout(paintBars, 300); }, true);   // Blinkko: title appears after the password

    // ---- 2. A doodled ring follows a project's name between the homepage list and its page ----
    if (reduce) return;
    const KEY = 'nav-ring';
    const read = function() {
        try {
            const v = JSON.parse(sessionStorage.getItem(KEY) || 'null');
            sessionStorage.removeItem(KEY);
            return v && Date.now() - v.t < 6000 ? v : null;
        } catch (e) { return null; }
    };
    const save = function(v) {
        try { sessionStorage.setItem(KEY, JSON.stringify(Object.assign({ t: Date.now() }, v))); } catch (e) {}
    };
    const visible = function(r) { return r.width > 0 && r.bottom > 0 && r.top < innerHeight && r.right > 0 && r.left < innerWidth; };
    // one loose lap whose end overshoots the start, like someone circling a word on paper (100 x 40 box)
    const loopSvg = document.createElementNS(NS, 'svg');
    loopSvg.setAttribute('width', '0'); loopSvg.setAttribute('height', '0'); loopSvg.setAttribute('aria-hidden', 'true');
    loopSvg.style.cssText = 'position:absolute;width:0;height:0';
    loopSvg.innerHTML = '<path d="M15 10 C32 3 63 1 83 6 C96 10 99 22 92 30 C82 39 40 40 18 35 C4 32 1 18 10 9 C13 6 19 4 27 4"/>';
    document.body.appendChild(loopSvg);
    const loop = loopSvg.firstChild, loopLen = loop.getTotalLength();
    const N = 1100, loopPts = [];
    for (let i = 0; i < N; i++) loopPts.push(loop.getPointAtLength(loopLen * i / (N - 1)));

    // The ring is a canvas over the word: a 1px black pixel line stamped dot by dot.
    const ring = function(host, state) {
        const r = host.getBoundingClientRect();
        const w = Math.round(r.width) + 18, h = Math.round(r.height) + 12;
        const c = document.createElement('canvas');
        c.className = 'doodle-ring';
        c.width = w; c.height = h;
        c.style.width = w + 'px'; c.style.height = h + 'px';
        c.setAttribute('aria-hidden', 'true');
        const ctx = c.getContext('2d');
        const d = { el: c, from: 0, to: state === 'there' ? 1 : 0 };
        d.draw = function() {
            ctx.clearRect(0, 0, w, h);
            ctx.fillStyle = '#000';
            for (let i = Math.round(d.from * N); i < Math.round(d.to * N); i++) {
                const k = wob(i * 0.6, frame);
                ctx.fillRect(Math.round(3 + loopPts[i].x * (w - 7) / 100) + k[0], Math.round(3 + loopPts[i].y * (h - 7) / 40) + k[1], 1, 1);
            }
        };
        d.step = function(prop, steps, ms, after) {         // move one end of the line in a few frames
            let n = 0;
            const t = setInterval(function() {
                n++;
                d[prop] = n / steps;
                d.draw();
                if (n >= steps) { clearInterval(t); if (after) after(); }
            }, ms / steps);
        };
        // Sit in the sidebar rather than inside the word, so the line stays solid black even when the
        // word itself is dimmed, and still travels with the sidebar when it slides.
        const box = host.closest('.sidebar') || document.body;
        const b = box.getBoundingClientRect();
        c.style.left = Math.round(r.left - b.left + box.scrollLeft) - 9 + 'px';
        c.style.top = Math.round(r.top - b.top + box.scrollTop) - 6 + 'px';
        box.appendChild(c);
        live.push(d);
        d.draw();
        if (state === 'draw') d.step('to', 9, 360);
        return d;
    };
    const letGo = function(d, wait) {
        setTimeout(function() {
            d.step('from', 6, 300, function() {
                d.el.remove();
                live.splice(live.indexOf(d), 1);
            });
        }, wait);
    };

    const list = document.querySelector('.project-list');
    const title = document.querySelector('.sidebar .bio h1');
    const arriving = read();
    let leaving = false;
    window.addEventListener('pageshow', function(e) {
        if (!e.persisted) return;                          // restored by the browser's Back button
        leaving = false;
        document.querySelectorAll('.doodle-ring').forEach(function(el) { el.remove(); });
        live.length = 0;
    });

    if (list) {
        // Homepage. The list itself gets no ring; just note that a project was opened from here, so
        // its page can bring the title in circled. Navigation is left alone (no delay).
        document.addEventListener('click', function(e) {
            if (!(e.target instanceof Element) || document.body.classList.contains('collapsed')) return;
            if (e.target.closest('.project-list a') || e.target.closest('#project-preview-wrapper')) save({ dir: 'in' });
        }, true);
    } else if (title) {
        // Project page. Arriving from the homepage: the title comes in already circled, then the ring goes.
        if (arriving && arriving.dir === 'in' && title.offsetWidth) {
            root.classList.add('ring-in');
            letGo(ring(title, 'there'), 1150);
            setTimeout(function() { root.classList.remove('ring-in'); }, 2600);
        }
        // Leaving: circle the title; the page's own exit then carries it off with the sidebar.
        const back = document.querySelector('.back-link');
        if (back) back.addEventListener('click', function() {
            if (leaving || !visible(title.getBoundingClientRect())) return;
            leaving = true;
            ring(title, 'draw');
        }, true);
    }
})();
