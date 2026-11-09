'use strict';

/* ============================================================
   Onda — interface
   ============================================================ */

const $ = (selector, root = document) => root.querySelector(selector);
const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const motionAllowed = () => !reducedMotion.matches;
const prefersReduced = () => reducedMotion.matches;

const els = {
    header: $('#siteHeader'),
    menuBtn: $('#menuBtn'),
    menuClose: $('#menuClose'),
    navPanel: $('#navPanel'),

    heroBars: $('#heroBars'),
    heroPlayhead: $('#heroPlayhead'),
    heroLines: $('#heroLines'),

    studioPanel: $('#studioPanel'),
    dropzone: $('#dropzone'),
    audioInput: $('#audioInput'),
    fileError: $('#fileError'),
    fileName: $('#fileName'),
    fileSize: $('#fileSize'),
    fileDuration: $('#fileDuration'),
    previewWave: $('#previewWave'),
    previewFallback: $('#previewFallback'),
    removeFile: $('#removeFile'),
    language: $('#language'),
    generateBtn: $('#generateBtn'),

    panels: {
        empty: $('[data-panel="empty"]'),
        ready: $('[data-panel="ready"]'),
        loading: $('[data-panel="loading"]'),
        result: $('[data-panel="result"]'),
        error: $('[data-panel="error"]')
    },

    loadingTitle: $('#loadingTitle'),
    loadingHint: $('#loadingHint'),
    loadingTime: $('#loadingTime'),
    progressFill: $('#progressFill'),
    loadingFileName: $('#loadingFileName'),
    cancelBtn: $('#cancelBtn'),

    resultTitle: $('#resultTitle'),
    resultFileName: $('#resultFileName'),
    copyAllBtn: $('#copyAllBtn'),
    exportBtn: $('#exportBtn'),
    exportMenu: $('#exportMenu'),
    newFileBtn: $('#newFileBtn'),

    seek: $('#seek'),
    playerWave: $('#playerWave'),
    playBtn: $('#playBtn'),
    playIcon: $('.play-icon'),
    pauseIcon: $('.pause-icon'),
    currentTime: $('#currentTime'),
    totalTime: $('#totalTime'),
    speed: $('#speed'),
    languageBadge: $('#languageBadge'),
    segCount: $('#segCount'),
    wordCount: $('#wordCount'),
    transcriptList: $('#transcriptList'),
    audioPlayer: $('#audioPlayer'),

    errorMessage: $('#errorMessage'),
    retryBtn: $('#retryBtn'),
    errorNewFile: $('#errorNewFile'),

    studioStatus: $('#studioStatus'),
    toast: $('#toast'),
    toastText: $('#toastText'),
    year: $('#year')
};

const state = {
    file: null,
    audioUrl: null,
    duration: 0,
    peaks: null,
    prepareToken: 0,
    data: null,
    segments: [],
    xhr: null,
    requestStartedAt: 0,
    elapsedTimer: null,
    phase: 'idle',
    activeIndex: -1,
    seekDragging: false,
    raf: 0,
    lastWaveDraw: 0,
    abortRequested: false
};

const MAX_FILE_SIZE = 25 * 1024 * 1024;
const ALLOWED_EXTENSIONS = [
    '.mp3', '.mp4', '.mpeg', '.mpga', '.m4a', '.wav', '.webm',
    '.flac', '.ogg', '.oga', '.aac', '.aif', '.aiff'
];
const LANGUAGE_LABELS = {
    en: 'EN', hi: 'HI', es: 'ES', fr: 'FR', de: 'DE', pt: 'PT', it: 'IT',
    ja: 'JA', ko: 'KO', zh: 'ZH', ar: 'AR', ru: 'RU', id: 'ID', tr: 'TR',
    nl: 'NL', pl: 'PL', english: 'EN', spanish: 'ES', french: 'FR',
    german: 'DE', portuguese: 'PT', italian: 'IT', japanese: 'JA',
    korean: 'KO', chinese: 'ZH', arabic: 'AR', russian: 'RU',
    indonesian: 'ID', turkish: 'TR', dutch: 'NL', polish: 'PL'
};

/* ---------- Formatting ---------- */
function pad(value, length = 2) {
    return String(value).padStart(length, '0');
}

function formatClock(seconds) {
    const total = Math.max(0, Math.floor(Number(seconds) || 0));
    const hours = Math.floor(total / 3600);
    const minutes = Math.floor((total % 3600) / 60);
    const secs = total % 60;
    if (hours > 0) return `${hours}:${pad(minutes)}:${pad(secs)}`;
    return `${minutes}:${pad(secs)}`;
}

function formatBytes(bytes) {
    const value = Number(bytes) || 0;
    if (value >= 1024 * 1024) {
        const mb = value / (1024 * 1024);
        return `${mb >= 10 ? Math.round(mb) : mb.toFixed(1)} MB`;
    }
    if (value >= 1024) return `${Math.round(value / 1024)} KB`;
    return `${value} B`;
}

function formatSrtTime(seconds) {
    const total = Math.max(0, Math.round((Number(seconds) || 0) * 1000));
    return `${pad(Math.floor(total / 3600000))}:${pad(Math.floor((total % 3600000) / 60000))}:${pad(Math.floor((total % 60000) / 1000))},${pad(total % 1000, 3)}`;
}

function formatVttTime(seconds) {
    return formatSrtTime(seconds).replace(',', '.');
}

/* ---------- Toast ---------- */
let toastTimer = 0;

function showToast(message) {
    els.toastText.textContent = message;
    els.toast.hidden = false;
    els.toast.style.animation = 'none';
    void els.toast.offsetWidth;
    els.toast.style.animation = '';
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => {
        els.toast.hidden = true;
    }, 2800);
}

/* ---------- Header ---------- */
function bindHeader() {
    const update = () => {
        els.header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
}

/* ---------- Mobile navigation ---------- */
let navOpen = false;
let navReturnFocus = null;

function getNavFocusables() {
    return $$('a[href], button:not([disabled])', els.navPanel)
        .filter((element) => element.offsetWidth > 0 || element.offsetHeight > 0);
}

function openNav() {
    if (navOpen) return;
    navOpen = true;
    navReturnFocus = document.activeElement instanceof HTMLElement ? document.activeElement : els.menuBtn;
    els.navPanel.classList.add('is-open');
    els.navPanel.setAttribute('aria-hidden', 'false');
    els.menuBtn.setAttribute('aria-expanded', 'true');
    document.body.classList.add('menu-open');
    window.requestAnimationFrame(() => {
        if (!navOpen) return;
        window.requestAnimationFrame(() => {
            if (navOpen) els.menuClose.focus();
        });
    });
}

function closeNav({ restoreFocus = true } = {}) {
    if (!navOpen) return;
    navOpen = false;
    els.navPanel.classList.remove('is-open');
    els.navPanel.setAttribute('aria-hidden', 'true');
    els.menuBtn.setAttribute('aria-expanded', 'false');
    document.body.classList.remove('menu-open');
    if (restoreFocus) {
        const canRestore = navReturnFocus instanceof HTMLElement &&
            navReturnFocus !== document.body &&
            document.contains(navReturnFocus);
        const target = canRestore ? navReturnFocus : els.menuBtn;
        window.requestAnimationFrame(() => {
            if (!navOpen) target.focus({ preventScroll: true });
        });
    }
}

function bindNav() {
    els.menuBtn.addEventListener('click', openNav);
    els.menuClose.addEventListener('click', () => closeNav());

    $$('a[href]', els.navPanel).forEach((link) => {
        link.addEventListener('click', () => closeNav());
    });

    document.addEventListener('keydown', (event) => {
        if (!navOpen) return;
        if (event.key === 'Escape') {
            event.preventDefault();
            closeNav();
            return;
        }
        if (event.key !== 'Tab') return;
        const focusables = getNavFocusables();
        if (!focusables.length) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });

    const desktop = window.matchMedia('(min-width: 961px)');
    const onChange = (event) => {
        if (event.matches) closeNav({ restoreFocus: false });
    };
    if (typeof desktop.addEventListener === 'function') {
        desktop.addEventListener('change', onChange);
    } else if (typeof desktop.addListener === 'function') {
        desktop.addListener(onChange);
    }
}

/* ---------- Scroll reveals ---------- */
function bindReveals() {
    const items = $$('.reveal');
    if (!items.length) return;
    if (!('IntersectionObserver' in window) || prefersReduced()) {
        items.forEach((item) => item.classList.add('is-in'));
        return;
    }
    const observer = new IntersectionObserver((entries) => {
        entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            entry.target.classList.add('is-in');
            observer.unobserve(entry.target);
        });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    items.forEach((item) => observer.observe(item));
}

/* ---------- Hero console ---------- */
let heroHot = -1;
let heroRow = -1;
let heroTimer = 0;
let heroProgress = 32;

function buildHeroWave() {
    const count = 56;
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < count; index += 1) {
        const t = index / (count - 1);
        const envelope = Math.pow(Math.sin(t * Math.PI), 0.55);
        const detail = (0.35 + Math.abs(Math.sin(index * 0.62) * 0.65 + Math.sin(index * 0.21 + 1.8) * 0.35)) / 1.35;
        const height = Math.max(7, Math.min(100, 8 + envelope * detail * 88));
        const bar = document.createElement('span');
        bar.style.height = `${height.toFixed(1)}%`;
        fragment.appendChild(bar);
    }
    els.heroBars.replaceChildren(fragment);
}

function setHeroProgress(progress) {
    heroProgress = progress;
    els.heroPlayhead.style.left = `${progress}%`;

    const rows = els.heroLines.children;
    const active = Math.min(rows.length - 1, Math.max(0, Math.floor(progress / (100 / rows.length))));
    if (active !== heroRow) {
        heroRow = active;
        Array.from(rows).forEach((row, index) => row.classList.toggle('is-active', index === active));
    }

    const bars = els.heroBars.children;
    const hot = Math.max(0, Math.round((progress / 100) * bars.length));
    if (hot !== heroHot) {
        heroHot = hot;
        Array.from(bars).forEach((bar, index) => bar.classList.toggle('is-hot', index < hot));
    }
}

function startHeroTimer() {
    if (heroTimer || !motionAllowed()) return;
    heroTimer = window.setInterval(() => {
        if (document.hidden) return;
        const next = heroProgress + 0.45;
        setHeroProgress(next >= 100 ? 0 : next);
    }, 90);
}

function startHero() {
    buildHeroWave();
    if (!motionAllowed()) {
        setHeroProgress(58);
    } else {
        setHeroProgress(heroProgress);
        startHeroTimer();
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                window.clearInterval(heroTimer);
                heroTimer = 0;
            } else {
                startHeroTimer();
            }
        });
    }

    if (typeof reducedMotion.addEventListener === 'function') {
        reducedMotion.addEventListener('change', () => {
            window.clearInterval(heroTimer);
            heroTimer = 0;
            if (motionAllowed()) {
                startHeroTimer();
            } else {
                setHeroProgress(58);
            }
        });
    }
}

/* ---------- Canvas waveform drawing ---------- */
function paintWave(canvas, peaks, progress = 0, options = {}) {
    if (!canvas || !peaks || !peaks.length) return;
    const rect = canvas.getBoundingClientRect();
    const width = Math.round(rect.width);
    const height = Math.round(rect.height);
    if (!width || !height) return;

    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
        canvas.width = Math.round(width * ratio);
        canvas.height = Math.round(height * ratio);
    }
    const context = canvas.getContext('2d');
    if (!context) return;
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, width, height);

    const count = Math.max(24, Math.min(150, Math.floor(width / 3.4)));
    const slot = width / count;
    const barWidth = Math.max(1.2, Math.min(3, slot * 0.52));
    const minHeight = options.minHeight ?? 2;

    for (let index = 0; index < count; index += 1) {
        const from = Math.floor((index / count) * peaks.length);
        const to = Math.max(from + 1, Math.floor(((index + 1) / count) * peaks.length));
        let peak = 0;
        for (let cursor = from; cursor < to; cursor += 1) {
            if (peaks[cursor] > peak) peak = peaks[cursor];
        }
        const barHeight = Math.max(minHeight, peak * height * 0.84);
        const x = index * slot + (slot - barWidth) / 2;
        const y = (height - barHeight) / 2;
        const played = options.progressColors ? (index + 1) / count <= progress : false;
        if (options.accentEvery && index % options.accentEvery === 0) {
            context.fillStyle = options.accentColor || options.restColor;
        } else {
            context.fillStyle = played ? options.playedColor : options.restColor;
        }
        if (typeof context.roundRect === 'function') {
            context.beginPath();
            context.roundRect(x, y, barWidth, barHeight, barWidth / 2);
            context.fill();
        } else {
            context.fillRect(x, y, barWidth, barHeight);
        }
    }

    if (options.progressColors && progress > 0) {
        const x = Math.min(width - 0.5, width * progress);
        context.fillStyle = options.cursorColor || 'rgba(247, 243, 234, 0.85)';
        context.fillRect(x, 3, 1, height - 6);
    }
}

function drawPreview() {
    paintWave(els.previewWave, state.peaks, 0, {
        restColor: 'rgba(247, 243, 234, 0.34)',
        accentEvery: 11,
        accentColor: 'rgba(255, 138, 103, 0.6)',
        minHeight: 3
    });
}

function drawPlayerWave() {
    if (!state.peaks || !state.data) return;
    const duration = getDuration();
    const progress = duration > 0 ? Math.min(1, Math.max(0, els.audioPlayer.currentTime / duration)) : 0;
    paintWave(els.playerWave, state.peaks, progress, {
        restColor: 'rgba(247, 243, 234, 0.22)',
        playedColor: 'rgba(255, 138, 103, 0.92)',
        cursorColor: 'rgba(247, 243, 234, 0.92)',
        progressColors: true,
        minHeight: 2
    });
}

function clearCanvas(canvas) {
    if (!canvas) return;
    const context = canvas.getContext('2d');
    if (!context) return;
    context.clearRect(0, 0, canvas.width, canvas.height);
}

/* ---------- Audio preparation ---------- */
function probeDuration(url) {
    return new Promise((resolve) => {
        const audio = document.createElement('audio');
        let settled = false;
        const finish = (value) => {
            if (settled) return;
            settled = true;
            window.clearTimeout(timer);
            audio.onloadedmetadata = null;
            audio.onerror = null;
            audio.removeAttribute('src');
            try { audio.load(); } catch (error) { /* no-op */ }
            resolve(value);
        };
        const timer = window.setTimeout(() => finish(0), 4500);
        audio.preload = 'metadata';
        audio.onloadedmetadata = () => {
            const value = Number(audio.duration);
            finish(Number.isFinite(value) && value > 0 ? value : 0);
        };
        audio.onerror = () => finish(0);
        audio.src = url;
    });
}

function peaksFromBuffer(buffer, count = 150) {
    const channels = Math.min(2, buffer.numberOfChannels);
    if (!channels) return [];
    const length = buffer.length;
    const block = Math.floor(length / count);
    if (block <= 0) return [];
    const sources = [];
    for (let channel = 0; channel < channels; channel += 1) {
        sources.push(buffer.getChannelData(channel));
    }
    const peaks = [];
    for (let index = 0; index < count; index += 1) {
        const start = index * block;
        const end = Math.min(length, start + block);
        const step = Math.max(1, Math.floor((end - start) / 220));
        let peak = 0;
        for (let cursor = start; cursor < end; cursor += step) {
            for (let channel = 0; channel < sources.length; channel += 1) {
                const value = Math.abs(sources[channel][cursor]);
                if (value > peak) peak = value;
            }
        }
        peaks.push(peak);
    }
    const max = Math.max(...peaks, 0.0001);
    return peaks.map((value) => Math.pow(value / max, 0.72));
}

async function prepareAudio(file) {
    const url = URL.createObjectURL(file);
    let duration = 0;
    let peaks = null;

    try {
        duration = await probeDuration(url);
    } catch (error) {
        duration = 0;
    }

    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        const worthDecoding = file.size <= 12 * 1024 * 1024 && (!duration || duration <= 480);
        if (AudioContextClass && worthDecoding) {
            const context = new AudioContextClass();
            try {
                if (context.state === 'suspended') {
                    await context.resume().catch(() => {});
                }
                const arrayBuffer = await file.arrayBuffer();
                const decoded = await new Promise((resolve, reject) => {
                    const attempt = context.decodeAudioData(arrayBuffer, resolve, reject);
                    if (attempt && typeof attempt.then === 'function') attempt.then(resolve, reject);
                });
                if (!duration) duration = decoded.duration;
                peaks = peaksFromBuffer(decoded, 150);
            } finally {
                if (typeof context.close === 'function') context.close().catch(() => {});
            }
        }
    } catch (error) {
        peaks = null;
    }

    return { url, duration, peaks };
}

/* ---------- File selection ---------- */
function extensionOf(name) {
    const match = /\.([a-z0-9]+)$/i.exec(name || '');
    return match ? `.${match[1].toLowerCase()}` : '';
}

function validateFile(file) {
    if (!file) return 'Choose an audio file first.';
    if (file.size === 0) return 'That file is empty. Choose a recording with audio in it.';
    const extension = extensionOf(file.name);
    const mime = (file.type || '').toLowerCase();
    const formatAllowed = ALLOWED_EXTENSIONS.includes(extension) ||
        mime.startsWith('audio/') || mime === 'video/webm' || mime === 'application/ogg' || !mime;
    if (!formatAllowed) {
        return 'That file type is not supported. Use MP3, WAV, M4A, FLAC, OGG or WEBM.';
    }
    if (file.size > MAX_FILE_SIZE) {
        return `That file is ${formatBytes(file.size)}. The studio accepts files up to 25 MB.`;
    }
    return '';
}

function showFileError(message) {
    els.fileError.textContent = message;
    els.fileError.hidden = false;
    els.studioStatus.textContent = message;
}

function clearFileError() {
    els.fileError.textContent = '';
    els.fileError.hidden = true;
}

function resetAudioSource() {
    if (!els.audioPlayer.paused) els.audioPlayer.pause();
    els.audioPlayer.removeAttribute('src');
    try { els.audioPlayer.load(); } catch (error) { /* no-op */ }
    if (state.audioUrl) {
        URL.revokeObjectURL(state.audioUrl);
        state.audioUrl = null;
    }
}

async function selectFile(file) {
    if (!file) return;
    const problem = validateFile(file);
    if (problem) {
        showFileError(problem);
        els.audioInput.value = '';
        return;
    }

    clearFileError();
    resetAudioSource();
    resetResultView();

    const token = state.prepareToken + 1;
    state.prepareToken = token;
    state.file = file;
    state.duration = 0;
    state.peaks = null;

    els.fileName.textContent = file.name;
    els.fileSize.textContent = formatBytes(file.size);
    els.fileDuration.textContent = 'Reading…';
    els.previewFallback.hidden = true;
    els.previewWave.hidden = false;
    clearCanvas(els.previewWave);
    showPanel('ready');
    els.studioStatus.textContent = `${file.name} selected. Preparing a waveform preview.`;

    let prepared;
    try {
        prepared = await prepareAudio(file);
    } catch (error) {
        prepared = { url: null, duration: 0, peaks: null };
    }

    if (token !== state.prepareToken) {
        if (prepared.url) URL.revokeObjectURL(prepared.url);
        return;
    }

    state.audioUrl = prepared.url;
    state.duration = prepared.duration || 0;
    state.peaks = prepared.peaks;
    els.fileDuration.textContent = state.duration ? formatClock(state.duration) : '—';

    if (state.peaks && state.peaks.length) {
        els.previewFallback.hidden = true;
        els.previewWave.hidden = false;
        window.requestAnimationFrame(drawPreview);
    } else {
        els.previewWave.hidden = true;
        els.previewFallback.hidden = false;
    }

    els.studioStatus.textContent = `${file.name} is ready to transcribe.`;
}

/* ============================================================
   Studio state
   ============================================================ */
function getDuration() {
    const mediaDuration = Number(els.audioPlayer.duration);
    if (Number.isFinite(mediaDuration) && mediaDuration > 0) return mediaDuration;
    return state.duration || 0;
}

function showPanel(name) {
    Object.entries(els.panels).forEach(([key, panel]) => {
        if (panel) panel.hidden = key !== name;
    });
    els.studioPanel.dataset.state = name;
    if (name !== 'result' && !els.audioPlayer.paused) {
        els.audioPlayer.pause();
    }
}

function setPlayingUI(playing) {
    els.playIcon.hidden = playing;
    els.pauseIcon.hidden = !playing;
    els.playBtn.setAttribute('aria-label', playing ? 'Pause recording' : 'Play recording');
    els.playBtn.setAttribute('aria-pressed', playing ? 'true' : 'false');
}

function resetResultView() {
    cancelPlaybackFrame();
    if (!els.audioPlayer.paused) els.audioPlayer.pause();
    state.data = null;
    state.segments = [];
    state.activeIndex = -1;
    state.lastWaveDraw = 0;
    closeExportMenu({ restoreFocus: false });
    els.transcriptList.replaceChildren();
    els.resultFileName.textContent = '';
    clearCanvas(els.playerWave);
    els.currentTime.textContent = '0:00';
    els.totalTime.textContent = '0:00';
    els.seek.setAttribute('aria-valuenow', '0');
    els.seek.setAttribute('aria-valuetext', '0:00');
    setPlayingUI(false);
}

function countWords(segments) {
    return segments.reduce((total, segment) => total + (segment.text.match(/\S+/g) || []).length, 0);
}

function languageLabel(value) {
    if (!value) return 'AUTO';
    const key = String(value).toLowerCase();
    return LANGUAGE_LABELS[key] || key.slice(0, 3).toUpperCase();
}

/* ---------- Transcript rendering ---------- */
function iconUse(id) {
    return `<svg class="icon" aria-hidden="true"><use href="#${id}"/></svg>`;
}

function renderTranscript() {
    const fragment = document.createDocumentFragment();
    state.segments.forEach((segment, index) => {
        const row = document.createElement('li');
        row.className = 'transcript-row';
        row.dataset.index = String(index);

        const time = document.createElement('button');
        time.type = 'button';
        time.className = 'transcript-time';
        time.dataset.seek = String(index);
        time.textContent = formatClock(segment.start);
        time.setAttribute('aria-label', `Play from ${formatClock(segment.start)}`);

        const text = document.createElement('button');
        text.type = 'button';
        text.className = 'transcript-text';
        text.dataset.seek = String(index);
        text.textContent = segment.text;

        const copy = document.createElement('button');
        copy.type = 'button';
        copy.className = 'row-copy';
        copy.dataset.copy = String(index);
        copy.setAttribute('aria-label', 'Copy this caption');
        copy.innerHTML = iconUse('i-copy');

        row.append(time, text, copy);
        fragment.appendChild(row);
    });
    els.transcriptList.replaceChildren(fragment);
}

function scrollRowIntoView(row) {
    const list = els.transcriptList;
    const listRect = list.getBoundingClientRect();
    const rowRect = row.getBoundingClientRect();
    if (rowRect.top >= listRect.top && rowRect.bottom <= listRect.bottom) return;
    const delta = rowRect.top - listRect.top - (list.clientHeight - rowRect.height) / 2;
    list.scrollTo({
        top: Math.max(0, list.scrollTop + delta),
        behavior: prefersReduced() ? 'auto' : 'smooth'
    });
}

function setActiveRow(index, { scroll = true } = {}) {
    if (index === state.activeIndex) return;
    const rows = els.transcriptList.children;
    if (rows[state.activeIndex]) rows[state.activeIndex].classList.remove('is-active');
    const row = rows[index];
    if (!row) {
        state.activeIndex = -1;
        return;
    }
    row.classList.add('is-active');
    state.activeIndex = index;
    if (scroll) scrollRowIntoView(row);
}

function findActiveIndex(seconds) {
    if (!state.segments.length) return -1;
    let index = 0;
    for (let cursor = 0; cursor < state.segments.length; cursor += 1) {
        if (state.segments[cursor].start <= seconds + 0.08) {
            index = cursor;
        } else {
            break;
        }
    }
    return index;
}

function updatePlayerUI(force = false) {
    const duration = getDuration();
    const current = Math.max(0, Math.min(els.audioPlayer.currentTime || 0, duration || Infinity));
    els.currentTime.textContent = formatClock(current);
    els.totalTime.textContent = formatClock(duration);
    const percent = duration > 0 ? Math.min(100, Math.max(0, (current / duration) * 100)) : 0;
    els.seek.setAttribute('aria-valuenow', String(Math.round(percent)));
    els.seek.setAttribute('aria-valuetext', formatClock(current));

    const now = performance.now();
    if (force || now - state.lastWaveDraw > 90) {
        state.lastWaveDraw = now;
        drawPlayerWave();
    }
    if (state.segments.length) {
        setActiveRow(findActiveIndex(current));
    }
}

function startPlaybackLoop() {
    cancelPlaybackFrame();
    const tick = () => {
        updatePlayerUI();
        if (!els.audioPlayer.paused && !els.audioPlayer.ended) {
            state.raf = window.requestAnimationFrame(tick);
        }
    };
    tick();
}

function cancelPlaybackFrame() {
    if (state.raf) {
        window.cancelAnimationFrame(state.raf);
        state.raf = 0;
    }
}

function seekTo(seconds, { play = false } = {}) {
    const duration = getDuration();
    if (!duration) {
        if (play) showToast('The audio preview is not available.');
        return;
    }
    const target = Math.min(duration, Math.max(0, Number(seconds) || 0));
    try {
        els.audioPlayer.currentTime = target;
    } catch (error) {
        return;
    }
    updatePlayerUI(true);
    if (play && els.audioPlayer.paused) {
        const attempt = els.audioPlayer.play();
        if (attempt && typeof attempt.catch === 'function') {
            attempt.catch(() => showToast('Playback could not start. Try again.'));
        }
    }
}

function seekBy(delta) {
    seekTo((els.audioPlayer.currentTime || 0) + delta);
}

function togglePlayback() {
    if (!state.data) return;
    if (!els.audioPlayer.currentSrc && !els.audioPlayer.src) {
        showToast('The audio preview is not available.');
        return;
    }
    if (els.audioPlayer.paused) {
        const attempt = els.audioPlayer.play();
        if (attempt && typeof attempt.catch === 'function') {
            attempt.catch(() => showToast('Playback could not start. Try again.'));
        }
    } else {
        els.audioPlayer.pause();
    }
}

/* ---------- Request timing ---------- */
function stopElapsed() {
    if (state.elapsedTimer) {
        window.clearInterval(state.elapsedTimer);
        state.elapsedTimer = 0;
    }
}

function startElapsed() {
    stopElapsed();
    state.requestStartedAt = performance.now();
    const tick = () => {
        const seconds = (performance.now() - state.requestStartedAt) / 1000;
        els.loadingTime.textContent = formatClock(seconds);
    };
    tick();
    state.elapsedTimer = window.setInterval(tick, 500);
}

function beginLoadingUI(file) {
    state.phase = 'upload';
    els.loadingFileName.textContent = file.name;
    els.loadingTitle.textContent = 'Uploading your recording';
    els.loadingHint.textContent = 'Sending the file to the studio.';
    els.loadingTime.textContent = '0:00';
    els.progressFill.classList.remove('is-indeterminate');
    els.progressFill.style.width = '0%';
    showPanel('loading');
    startElapsed();
    window.requestAnimationFrame(() => els.cancelBtn.focus({ preventScroll: true }));
}

function cancelRequest() {
    if (!state.xhr) return;
    state.abortRequested = true;
    stopElapsed();
    try {
        state.xhr.abort();
    } catch (error) {
        state.xhr = null;
        showPanel('ready');
    }
}

function requestErrorMessage(status, payload) {
    if (payload && typeof payload.error === 'string' && payload.error.trim()) {
        return payload.error.trim();
    }
    if (status === 413) return 'That file is larger than 25 MB. Try a shorter clip or a compressed copy.';
    if (status === 415) return 'That format is not supported. Use MP3, WAV, M4A, FLAC, OGG or WEBM.';
    if (status === 422) return 'No speech was detected in that recording. Try a clearer or longer clip.';
    if (status === 429) return 'The studio is receiving too many requests right now. Wait a moment and try again.';
    if (status === 502) return 'The transcription service is unavailable right now. Try again in a moment.';
    if (status === 503) return 'The studio is not configured yet. Add a Groq API key on the server and restart.';
    if (status === 0) return 'The studio could not be reached. Check your connection and try again.';
    return 'Something interrupted the transcription. Try again in a moment.';
}

function finishRequest(xhr) {
    if (state.xhr !== xhr) return;
    state.xhr = null;
    stopElapsed();
    state.phase = 'idle';

    let payload = null;
    try {
        payload = JSON.parse(xhr.responseText || '{}');
    } catch (error) {
        payload = null;
    }

    if (xhr.status >= 200 && xhr.status < 300 && payload && payload.success && Array.isArray(payload.segments) && payload.segments.length) {
        renderResult(payload);
        return;
    }

    showError(requestErrorMessage(xhr.status, payload));
}

function showError(message) {
    stopElapsed();
    state.phase = 'error';
    els.errorMessage.textContent = message;
    showPanel('error');
    els.studioStatus.textContent = message;
    window.requestAnimationFrame(() => els.retryBtn.focus({ preventScroll: true }));
}

function startTranscription() {
    if (!state.file) {
        showPanel('empty');
        return;
    }
    if (state.xhr) return;

    state.abortRequested = false;
    resetResultView();
    beginLoadingUI(state.file);

    const form = new FormData();
    form.append('audio', state.file, state.file.name);
    const language = els.language.value;
    if (language && language !== 'auto') form.append('language', language);

    let xhr;
    try {
        xhr = new XMLHttpRequest();
    } catch (error) {
        showError('Your browser could not start the upload. Try a different browser.');
        return;
    }

    state.xhr = xhr;
    xhr.open('POST', '/api/transcribe', true);
    xhr.timeout = 300000;
    xhr.setRequestHeader('Accept', 'application/json');

    xhr.upload.addEventListener('progress', (event) => {
        if (state.xhr !== xhr || !event.lengthComputable || !event.total) return;
        const percent = Math.min(96, Math.max(0, Math.round((event.loaded / event.total) * 100)));
        els.progressFill.style.width = `${percent}%`;
    });

    xhr.upload.addEventListener('load', () => {
        if (state.xhr !== xhr) return;
        state.phase = 'align';
        els.progressFill.classList.add('is-indeterminate');
        els.progressFill.style.width = '';
        els.loadingTitle.textContent = 'Aligning every word';
        els.loadingHint.textContent = 'Whisper is mapping speech to time.';
    });

    xhr.addEventListener('load', () => finishRequest(xhr));

    xhr.addEventListener('error', () => {
        if (state.xhr !== xhr) return;
        state.xhr = null;
        showError('The studio could not be reached. Check your connection and try again.');
    });

    xhr.addEventListener('timeout', () => {
        if (state.xhr !== xhr) return;
        state.xhr = null;
        showError('That recording took too long to transcribe. Try a shorter clip.');
    });

    xhr.addEventListener('abort', () => {
        if (state.xhr !== xhr) return;
        state.xhr = null;
        stopElapsed();
        state.phase = 'idle';
        const wasCurrent = !els.panels.loading.hidden;
        if (wasCurrent) {
            showPanel('ready');
            showToast('Upload cancelled');
            window.requestAnimationFrame(() => els.generateBtn.focus({ preventScroll: true }));
        }
        state.abortRequested = false;
    });

    try {
        xhr.send(form);
    } catch (error) {
        state.xhr = null;
        showError('The upload could not start. Check your connection and try again.');
    }
}

function renderResult(payload) {
    const segments = (payload.segments || [])
        .map((segment, index) => {
            const text = String(segment.text || '').trim();
            const start = Math.max(0, Number(segment.start) || 0);
            let end = Number(segment.end);
            if (!Number.isFinite(end) || end <= start) end = start + 1.5;
            return { id: index + 1, start, end, text };
        })
        .filter((segment) => segment.text.length > 0);

    if (!segments.length) {
        showError('No speech was detected in that recording. Try a clearer or longer clip.');
        return;
    }

    resetResultView();
    state.data = payload;
    state.segments = segments;

    const lastEnd = segments[segments.length - 1].end;
    const apiDuration = Number(payload.duration);
    state.duration = apiDuration > 0 ? apiDuration : Math.max(state.duration || 0, lastEnd);

    const words = countWords(segments);
    els.resultFileName.textContent = state.file ? state.file.name : 'recording';
    els.segCount.textContent = String(segments.length);
    els.wordCount.textContent = String(words);
    els.languageBadge.textContent = languageLabel(payload.language);
    els.totalTime.textContent = formatClock(state.duration);

    renderTranscript();

    if (state.audioUrl) {
        els.audioPlayer.src = state.audioUrl;
        els.audioPlayer.playbackRate = Number(els.speed.value) || 1;
        try { els.audioPlayer.load(); } catch (error) { /* no-op */ }
    }

    showPanel('result');
    setActiveRow(0, { scroll: false });
    updatePlayerUI(true);
    els.studioStatus.textContent = `Transcript ready. ${segments.length} timed segments, ${words} words.`;
    window.requestAnimationFrame(() => {
        drawPlayerWave();
        els.resultTitle.focus({ preventScroll: true });
    });
}

/* ============================================================
   Export & clipboard
   ============================================================ */
function buildExport(format) {
    const segments = state.segments;
    if (!segments.length) return '';

    if (format === 'srt') {
        return segments.map((segment, index) => {
            const end = Math.max(segment.end, segment.start + 0.4);
            return `${index + 1}\r\n${formatSrtTime(segment.start)} --> ${formatSrtTime(end)}\r\n${segment.text}`;
        }).join('\r\n\r\n') + '\r\n';
    }

    if (format === 'vtt') {
        const cues = segments.map((segment) => {
            const end = Math.max(segment.end, segment.start + 0.4);
            return `${formatVttTime(segment.start)} --> ${formatVttTime(end)}\n${segment.text}`;
        }).join('\n\n');
        return `WEBVTT\n\n${cues}\n`;
    }

    if (format === 'txt') {
        return segments.map((segment) => segment.text).join('\n') + '\n';
    }

    return '';
}

function exportFilename(extension) {
    const original = state.file && state.file.name ? state.file.name : 'onda-transcript';
    const base = original
        .replace(/\.[^.]+$/, '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 48);
    return `${base || 'onda-transcript'}.${extension}`;
}

function downloadFile(content, filename, mime) {
    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = 'none';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function downloadExport(format) {
    const content = buildExport(format);
    if (!content) {
        showToast('There is no transcript to export yet.');
        return;
    }
    const types = {
        srt: { mime: 'application/x-subrip', label: 'SubRip' },
        vtt: { mime: 'text/vtt', label: 'WebVTT' },
        txt: { mime: 'text/plain', label: 'Plain text' }
    };
    const type = types[format];
    if (!type) return;
    downloadFile(content, exportFilename(format), type.mime);
    showToast(`${type.label} file downloaded`);
}

function setExportMenuOpen(open, { focusFirst = false } = {}) {
    els.exportMenu.hidden = !open;
    els.exportBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
    if (open && focusFirst) {
        window.requestAnimationFrame(() => {
            const first = $('[role="menuitem"]', els.exportMenu);
            if (first) first.focus();
        });
    }
}

function closeExportMenu({ restoreFocus = false } = {}) {
    if (els.exportMenu.hidden) {
        if (restoreFocus) els.exportBtn.focus({ preventScroll: true });
        return;
    }
    setExportMenuOpen(false);
    if (restoreFocus) els.exportBtn.focus({ preventScroll: true });
}

function fallbackCopy(text) {
    const area = document.createElement('textarea');
    area.value = text;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '-1000px';
    area.style.left = '-1000px';
    document.body.appendChild(area);
    area.select();
    area.setSelectionRange(0, area.value.length);
    const copied = document.execCommand('copy');
    area.remove();
    if (!copied) throw new Error('Copy command was rejected');
}

async function copyText(text) {
    const value = String(text ?? '');
    if (!value) return false;
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(value);
            return true;
        }
    } catch (error) {
        /* fall through to the selection-based fallback */
    }
    try {
        fallbackCopy(value);
        return true;
    } catch (error) {
        showToast('Copy did not work. Select the text and copy it manually.');
        return false;
    }
}

async function copySegment(index, button) {
    const segment = state.segments[index];
    if (!segment) return;
    const copied = await copyText(segment.text);
    if (!copied) return;
    showToast('Caption line copied');
    if (button) {
        button.innerHTML = iconUse('i-check');
        window.setTimeout(() => {
            if (button.isConnected) button.innerHTML = iconUse('i-copy');
        }, 1300);
    }
}

/* ============================================================
   Reset & file intake
   ============================================================ */
function resetStudio({ focusInput = false } = {}) {
    state.prepareToken += 1;
    if (state.xhr) {
        const pending = state.xhr;
        state.xhr = null;
        state.abortRequested = true;
        try { pending.abort(); } catch (error) { /* no-op */ }
    }
    stopElapsed();

    state.file = null;
    state.duration = 0;
    state.peaks = null;
    state.data = null;
    state.segments = [];
    state.activeIndex = -1;
    state.phase = 'idle';
    state.abortRequested = false;

    resetAudioSource();
    resetResultView();
    clearFileError();

    els.fileName.textContent = '';
    els.fileSize.textContent = '0 MB';
    els.fileDuration.textContent = '0:00';
    els.previewWave.hidden = false;
    els.previewFallback.hidden = true;
    clearCanvas(els.previewWave);
    els.audioInput.value = '';
    els.loadingTitle.textContent = 'Uploading your recording';
    els.loadingHint.textContent = 'Sending the file to the studio.';
    els.progressFill.classList.remove('is-indeterminate');
    els.progressFill.style.width = '0%';

    showPanel('empty');
    els.studioStatus.textContent = 'Studio reset. Choose another recording.';

    if (focusInput) {
        window.requestAnimationFrame(() => els.audioInput.focus({ preventScroll: true }));
    }
}

function bindFileInputs() {
    els.audioInput.addEventListener('change', () => {
        const file = els.audioInput.files && els.audioInput.files[0];
        els.audioInput.value = '';
        if (file) selectFile(file);
    });

    els.removeFile.addEventListener('click', () => resetStudio({ focusInput: true }));

    let dragDepth = 0;

    const hasFiles = (event) => {
        const transfer = event.dataTransfer;
        if (!transfer) return false;
        if (transfer.types && typeof transfer.types.includes === 'function') {
            return transfer.types.includes('Files');
        }
        return transfer.files && transfer.files.length > 0;
    };

    els.dropzone.addEventListener('dragenter', (event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        dragDepth += 1;
        els.dropzone.classList.add('is-dragging');
    });

    els.dropzone.addEventListener('dragover', (event) => {
        if (!hasFiles(event)) return;
        event.preventDefault();
        if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy';
        els.dropzone.classList.add('is-dragging');
    });

    els.dropzone.addEventListener('dragleave', () => {
        dragDepth = Math.max(0, dragDepth - 1);
        if (dragDepth === 0) els.dropzone.classList.remove('is-dragging');
    });

    els.dropzone.addEventListener('drop', (event) => {
        event.preventDefault();
        dragDepth = 0;
        els.dropzone.classList.remove('is-dragging');
        const file = event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0];
        if (file) {
            selectFile(file);
        } else {
            showFileError('That drop did not include an audio file. Try again.');
        }
    });

    window.addEventListener('dragover', (event) => {
        if (hasFiles(event)) event.preventDefault();
    });

    window.addEventListener('drop', (event) => {
        if (hasFiles(event)) event.preventDefault();
    });
}

/* ============================================================
   Player
   ============================================================ */
function bindPlayer() {
    els.playBtn.addEventListener('click', togglePlayback);

    els.audioPlayer.addEventListener('play', () => {
        setPlayingUI(true);
        startPlaybackLoop();
    });

    els.audioPlayer.addEventListener('pause', () => {
        setPlayingUI(false);
        cancelPlaybackFrame();
        updatePlayerUI(true);
    });

    els.audioPlayer.addEventListener('ended', () => {
        setPlayingUI(false);
        cancelPlaybackFrame();
        updatePlayerUI(true);
    });

    els.audioPlayer.addEventListener('timeupdate', () => {
        if (els.audioPlayer.paused) updatePlayerUI();
    });

    els.audioPlayer.addEventListener('loadedmetadata', () => {
        const mediaDuration = Number(els.audioPlayer.duration);
        if (Number.isFinite(mediaDuration) && mediaDuration > 0 && state.data) {
            state.duration = mediaDuration;
            els.totalTime.textContent = formatClock(mediaDuration);
        }
        if (state.data) {
            drawPlayerWave();
            updatePlayerUI(true);
        }
    });

    let previewWarningShown = false;
    els.audioPlayer.addEventListener('error', () => {
        if (!state.data || !state.audioUrl || previewWarningShown) return;
        previewWarningShown = true;
        showToast('Audio preview unavailable — your captions are ready.');
    });

    els.speed.addEventListener('change', () => {
        const rate = Number(els.speed.value) || 1;
        els.audioPlayer.playbackRate = rate;
        els.audioPlayer.defaultPlaybackRate = rate;
    });
}

function bindSeek() {
    const seekFromPointer = (event) => {
        const duration = getDuration();
        if (!duration) return;
        const rect = els.seek.getBoundingClientRect();
        if (!rect.width) return;
        const ratio = Math.min(1, Math.max(0, (event.clientX - rect.left) / rect.width));
        seekTo(ratio * duration);
    };

    els.seek.addEventListener('pointerdown', (event) => {
        if (event.button !== undefined && event.button !== 0) return;
        state.seekDragging = true;
        if (typeof els.seek.setPointerCapture === 'function') {
            try { els.seek.setPointerCapture(event.pointerId); } catch (error) { /* no-op */ }
        }
        seekFromPointer(event);
        event.preventDefault();
    });

    els.seek.addEventListener('pointermove', (event) => {
        if (state.seekDragging) seekFromPointer(event);
    });

    const endDrag = (event) => {
        state.seekDragging = false;
        if (typeof els.seek.hasPointerCapture === 'function' && els.seek.hasPointerCapture(event.pointerId)) {
            els.seek.releasePointerCapture(event.pointerId);
        }
    };

    els.seek.addEventListener('pointerup', endDrag);
    els.seek.addEventListener('pointercancel', endDrag);

    els.seek.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowLeft') {
            event.preventDefault();
            seekBy(-5);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            seekBy(5);
        } else if (event.key === 'Home') {
            event.preventDefault();
            seekTo(0);
        } else if (event.key === 'End') {
            event.preventDefault();
            seekTo(getDuration());
        } else if (event.key === ' ' || event.code === 'Space') {
            event.preventDefault();
            togglePlayback();
        }
    });
}

/* ============================================================
   Studio bindings
   ============================================================ */
function bindStudio() {
    els.generateBtn.addEventListener('click', startTranscription);
    els.cancelBtn.addEventListener('click', cancelRequest);
    els.retryBtn.addEventListener('click', startTranscription);
    els.errorNewFile.addEventListener('click', () => {
        resetStudio();
        els.audioInput.click();
    });
    els.newFileBtn.addEventListener('click', () => {
        resetStudio();
        els.audioInput.click();
    });
}

function bindTranscript() {
    els.transcriptList.addEventListener('click', (event) => {
        const copyButton = event.target.closest('.row-copy');
        if (copyButton) {
            copySegment(Number(copyButton.dataset.copy), copyButton);
            return;
        }
        const seekButton = event.target.closest('[data-seek]');
        if (seekButton) {
            const segment = state.segments[Number(seekButton.dataset.seek)];
            if (segment) seekTo(segment.start, { play: true });
        }
    });
}

function bindCopy() {
    els.copyAllBtn.addEventListener('click', async () => {
        if (!state.segments.length) return;
        const text = state.segments.map((segment) => segment.text).join(' ');
        const copied = await copyText(text);
        if (copied) showToast('Full transcript copied');
    });
}

function bindExports() {
    els.exportBtn.addEventListener('click', () => {
        const shouldOpen = els.exportMenu.hidden;
        setExportMenuOpen(shouldOpen, { focusFirst: shouldOpen });
    });

    els.exportBtn.addEventListener('keydown', (event) => {
        if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
            event.preventDefault();
            setExportMenuOpen(true);
            const items = $$('[role="menuitem"]', els.exportMenu);
            if (items.length) items[event.key === 'ArrowDown' ? 0 : items.length - 1].focus();
        }
    });

    els.exportMenu.addEventListener('keydown', (event) => {
        const items = $$('[role="menuitem"]', els.exportMenu);
        if (!items.length) return;
        const current = items.indexOf(document.activeElement);
        if (event.key === 'Escape') {
            event.preventDefault();
            closeExportMenu({ restoreFocus: true });
        } else if (event.key === 'ArrowDown') {
            event.preventDefault();
            items[(current + 1 + items.length) % items.length].focus();
        } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            items[(current - 1 + items.length) % items.length].focus();
        } else if (event.key === 'Home') {
            event.preventDefault();
            items[0].focus();
        } else if (event.key === 'End') {
            event.preventDefault();
            items[items.length - 1].focus();
        }
    });

    els.exportMenu.addEventListener('click', (event) => {
        const item = event.target.closest('[data-export]');
        if (!item) return;
        downloadExport(item.dataset.export);
        closeExportMenu({ restoreFocus: true });
    });

    document.addEventListener('click', (event) => {
        if (els.exportMenu.hidden) return;
        if (event.target.closest('.menu')) return;
        closeExportMenu();
    });
}

function bindGlobalKeys() {
    document.addEventListener('keydown', (event) => {
        if (event.defaultPrevented) return;
        if (event.key === 'Escape' && !els.exportMenu.hidden) {
            event.preventDefault();
            closeExportMenu({ restoreFocus: true });
            return;
        }
        if (event.metaKey || event.ctrlKey || event.altKey) return;
        if (els.panels.result.hidden) return;

        const target = event.target;
        if (target instanceof Element && target.closest('input, select, textarea, button, a, summary, [contenteditable="true"], [role="slider"]')) {
            return;
        }

        const studioRect = els.studioPanel.getBoundingClientRect();
        if (studioRect.bottom <= 0 || studioRect.top >= window.innerHeight) return;

        if (event.key === ' ' || event.code === 'Space') {
            event.preventDefault();
            togglePlayback();
        } else if (event.key === 'ArrowLeft') {
            event.preventDefault();
            seekBy(-5);
        } else if (event.key === 'ArrowRight') {
            event.preventDefault();
            seekBy(5);
        }
    });
}

function bindResize() {
    let resizeTimer = 0;
    window.addEventListener('resize', () => {
        window.clearTimeout(resizeTimer);
        resizeTimer = window.setTimeout(() => {
            if (!els.panels.ready.hidden && state.peaks) drawPreview();
            if (!els.panels.result.hidden) drawPlayerWave();
        }, 120);
    });
}

/* ============================================================
   Init
   ============================================================ */
function init() {
    els.year.textContent = String(new Date().getFullYear());
    bindHeader();
    bindNav();
    bindReveals();
    startHero();
    bindFileInputs();
    bindStudio();
    bindPlayer();
    bindSeek();
    bindTranscript();
    bindCopy();
    bindExports();
    bindGlobalKeys();
    bindResize();
}

init();
