/* ==========================================================================
1. SISTEMA DE ÁUDIO SINTETIZADO E ANUNCIADOR DE VOZ
========================================================================== */
class SoundSystem {
    constructor() {
        this.ctx = null;
        this.muted = false;
        this.musicTimer = null;
        this.noteIndex = 0;
        this.synthNotes = [110, 130.81, 146.83, 164.81, 196.00, 220];
    }

    init() {
        if (!this.ctx) {
            const AudioCtx = window.AudioContext || window.webkitAudioContext;
            this.ctx = new AudioCtx();
            // Cadeia mestre (ganho -> passa-baixa -> saída): permite abafar o áudio no bullet-time
            try {
                this.master = this.ctx.createGain();
                this.filter = this.ctx.createBiquadFilter();
                this.filter.type = 'lowpass';
                this.filter.frequency.value = 22000;
                this.master.connect(this.filter);
                this.filter.connect(this.ctx.destination);
            } catch (e) { this.master = null; this.filter = null; }
        }
    }

    get out() { return this.master || this.ctx.destination; }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
    }

    speak(text) {
        if (this.muted || !('speechSynthesis' in window)) return;
        window.speechSynthesis.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-US';
        utterance.pitch = 0.6;
        utterance.rate = 1.2;
        window.speechSynthesis.speak(utterance);
    }

    startSynthwaveMusic(isBoss = false) {
        if (this.musicTimer) clearInterval(this.musicTimer);
        const interval = isBoss ? 150 : 250;

        this.musicTimer = setInterval(() => {
            if (!this.ctx || this.muted || !gameActive || isPaused) return;

            const osc = this.ctx.createOscillator();
            const gain = this.ctx.createGain();
            osc.type = 'sawtooth';

            const freq = this.synthNotes[this.noteIndex % this.synthNotes.length] * (isBoss ? 1.5 : 1.0);
            osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

            gain.gain.setValueAtTime(0.04, this.ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + (interval / 1000));

            osc.connect(gain);
            gain.connect(this.out);
            osc.start();
            osc.stop(this.ctx.currentTime + (interval / 1000));

            this.noteIndex++;
        }, interval);
    }

    stopMusic() {
        if (this.musicTimer) clearInterval(this.musicTimer);
    }

    playLaser(freq = 800) {
        if (!this.ctx || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(100, this.ctx.currentTime + 0.1);
        gain.gain.setValueAtTime(0.12, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.1);
        osc.connect(gain); gain.connect(this.out);
        osc.start(); osc.stop(this.ctx.currentTime + 0.1);
    }

    playExplosion() {
        if (!this.ctx || this.muted) return;
        const bufferSize = this.ctx.sampleRate * 0.2;
        const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
        const noise = this.ctx.createBufferSource(); noise.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.setValueAtTime(800, this.ctx.currentTime);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(0.25, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.2);
        noise.connect(filter); filter.connect(gain); gain.connect(this.out);
        noise.start(); noise.stop(this.ctx.currentTime + 0.2);
    }

    playPowerup() {
        if (!this.ctx || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(300, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(1200, this.ctx.currentTime + 0.25);
        gain.gain.setValueAtTime(0.15, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.25);
        osc.connect(gain); gain.connect(this.out);
        osc.start(); osc.stop(this.ctx.currentTime + 0.25);
    }

    announce(text, tier = 1) {
        if (this.muted || !('speechSynthesis' in window)) return;
        try {
            window.speechSynthesis.cancel();
            const u = new SpeechSynthesisUtterance(text);
            u.lang = 'en-US';
            u.pitch = Math.max(0.2, 0.55 - tier * 0.06); // quanto maior o combo, mais grave e agressiva
            u.rate = Math.min(1.5, 1.08 + tier * 0.05);
            u.volume = 1;
            window.speechSynthesis.speak(u);
        } catch (e) { /* voz indisponível neste navegador */ }
    }

    tone(type, f0, f1, dur, vol = 0.12) {
        if (!this.ctx || this.muted) return;
        const t = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(f0, t);
        osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
        gain.gain.setValueAtTime(vol, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + dur);
        osc.connect(gain); gain.connect(this.out);
        osc.start(t); osc.stop(t + dur);
    }

    noise(dur, vol = 0.2, cutoff = 800) {
        if (!this.ctx || this.muted) return;
        const size = Math.floor(this.ctx.sampleRate * dur);
        const buffer = this.ctx.createBuffer(1, size, this.ctx.sampleRate);
        const data = buffer.getChannelData(0);
        for (let i = 0; i < size; i++) data[i] = Math.random() * 2 - 1;
        const src = this.ctx.createBufferSource(); src.buffer = buffer;
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass'; filter.frequency.setValueAtTime(cutoff, this.ctx.currentTime);
        const gain = this.ctx.createGain();
        gain.gain.setValueAtTime(vol, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + dur);
        src.connect(filter); filter.connect(gain); gain.connect(this.out);
        src.start(); src.stop(this.ctx.currentTime + dur);
    }

    playHit() {
        const now = performance.now();
        if (now - (this._lastHit || 0) < 45) return; // evita estourar o áudio com tiros múltiplos
        this._lastHit = now;
        this.tone('square', 520, 260, 0.05, 0.04);
    }
    playZap() { this.tone('square', 900, 120, 0.12, 0.06); this.tone('sawtooth', 1800, 200, 0.08, 0.04); }
    playCoin() {
        const now = performance.now();
        if (now - (this._lastCoin || 0) < 50) return;
        this._lastCoin = now;
        this.tone('square', 988, 988, 0.06, 0.05);
        setTimeout(() => this.tone('square', 1319, 1319, 0.1, 0.05), 55);
    }
    playOverload() { this.tone('sawtooth', 120, 1600, 0.9, 0.22); this.tone('square', 240, 2400, 0.9, 0.08); this.noise(0.5, 0.15, 3000); }
    playNova() { this.tone('sine', 700, 60, 0.45, 0.25); this.noise(0.35, 0.2, 1500); }
    playDeath() { this.tone('sawtooth', 420, 35, 1.5, 0.2); }
    playBigExplosion() { this.noise(0.9, 0.4, 500); this.tone('sine', 140, 30, 0.8, 0.35); }

    setMuffle(on) {
        if (!this.ctx || !this.filter) return;
        try { this.filter.frequency.setTargetAtTime(on ? 450 : 22000, this.ctx.currentTime, 0.06); } catch (e) { /* ignora */ }
    }

    playGrazeZt() {
        const now = performance.now();
        if (now - (this._lastZt || 0) < 60) return;
        this._lastZt = now;
        this.tone('square', 3200, 2200, 0.05, 0.06);
        this.tone('sawtooth', 5200, 1800, 0.04, 0.03);
    }

    playRouletteTick(f = 600) { this.tone('square', f, f * 0.9, 0.03, 0.035); }

    playRouletteStop(i = 0) {
        this.tone('triangle', 220 + i * 70, 110, 0.18, 0.18);
        this.noise(0.08, 0.12, 2000);
    }

    playRareReveal(rarity) {
        const base = rarity === 'EPICA' ? 520 : 440;
        [0, 4, 7].forEach((st, k) => {
            const f = base * Math.pow(2, st / 12);
            setTimeout(() => this.tone('triangle', f, f, 0.25, 0.09), k * 90);
        });
    }

    playLegendary() {
        [523, 659, 784, 1047, 1319, 1568].forEach((f, k) => {
            setTimeout(() => { this.tone('square', f, f, 0.22, 0.07); this.tone('triangle', f / 2, f / 2, 0.3, 0.08); }, k * 85);
        });
        this.tone('sawtooth', 100, 900, 0.9, 0.1);
        this.noise(0.6, 0.12, 5000);
    }

    playCoinStack(n = 1) {
        const now = performance.now();
        if (now - (this._lastStack || 0) < 28) return;
        this._lastStack = now;
        const f = Math.min(2600, 1100 + n * 30);
        this.tone('square', f, f * 1.5, 0.05, 0.04);
    }

    playJackpot() {
        this.noise(0.4, 0.25, 4000);
        this.tone('triangle', 300, 1200, 0.4, 0.15);
        for (let k = 0; k < 6; k++) setTimeout(() => this.tone('square', 900 + k * 160, 900 + k * 160, 0.07, 0.05), k * 60);
    }

    playBulletTime() {
        this.tone('sine', 500, 60, 0.7, 0.2);
        this.noise(0.3, 0.1, 600);
    }

    playQuest() {
        [660, 880, 1320].forEach((f, k) => setTimeout(() => this.tone('triangle', f, f, 0.14, 0.1), k * 80));
    }

    playUlt() {
        if (!this.ctx || this.muted) return;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(150, this.ctx.currentTime);
        osc.frequency.exponentialRampToValueAtTime(800, this.ctx.currentTime + 0.6);
        gain.gain.setValueAtTime(0.3, this.ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, this.ctx.currentTime + 0.6);
        osc.connect(gain); gain.connect(this.out);
        osc.start(); osc.stop(this.ctx.currentTime + 0.6);
    }
}

const audio = new SoundSystem();

/* ==========================================================================
2. PROGRESSÃO, METADADOS, CONQUISTAS E MODO DIÁRIO
========================================================================== */
const difficultySettings = {
    EASY: { enemySpeed: 0.65, spawnRate: 1.4, bossHp: 0.7, damageMult: 0.5 },
    MEDIUM: { enemySpeed: 1.0, spawnRate: 1.0, bossHp: 1.0, damageMult: 1.0 },
    HARD: { enemySpeed: 1.3, spawnRate: 0.8, bossHp: 1.4, damageMult: 1.25 },
    EXTREME: { enemySpeed: 1.6, spawnRate: 0.6, bossHp: 2.0, damageMult: 1.5 },
    IMPOSSIBLE: { enemySpeed: 2.1, spawnRate: 0.35, bossHp: 3.0, damageMult: 2.2 },
    UNPLAYABLE: { enemySpeed: 3.5, spawnRate: 0.15, bossHp: 6.0, damageMult: 10.0 }
};

let currentDifficulty = localStorage.getItem('cyber_difficulty') || 'EASY';
let isDailyMode = false;

const upgradeConfigs = {
    health: { baseCost: 25, ratio: 1.5 },
    speed: { baseCost: 30, ratio: 1.6 },
    duration: { baseCost: 40, ratio: 1.7 },
    drone: { baseCost: 150, ratio: 2.2 }
};

const metaData = {
    credits: parseInt(localStorage.getItem('cyber_credits') || '0'),
    upgrades: JSON.parse(localStorage.getItem('cyber_upgrades') || '{"health":0,"speed":0,"duration":0,"drone":0}'),
    skins: JSON.parse(localStorage.getItem('cyber_skins') || '{"vWing":false,"dualWing":false}'),
    equippedSkin: localStorage.getItem('cyber_equippedSkin') || 'DEFAULT',
    achievements: JSON.parse(localStorage.getItem('cyber_achievements') || '{"grazeMaster":false,"ultSpammer":false,"impossibleBoss":false,"unplayableSurvivor":false}'),
    stats: JSON.parse(localStorage.getItem('cyber_stats') || '{"totalGrazes":0,"ultUses":0}'),
    leaderboard: JSON.parse(localStorage.getItem('cyber_leaderboard') || '[]'),
    // ---- v2: metas, lasers, drones e recorde pessoal ----
    quests: JSON.parse(localStorage.getItem('cyber_quests') || '{}'),
    lasers: JSON.parse(localStorage.getItem('cyber_lasers') || '{"MAGENTA":false,"PLASMA":false,"GOLD_FIRE":false}'),
    equippedLaser: localStorage.getItem('cyber_equippedLaser') || 'DEFAULT',
    dronePatterns: JSON.parse(localStorage.getItem('cyber_dronePatterns') || '{"DELTA":false,"HELIX":false}'),
    equippedDronePattern: localStorage.getItem('cyber_droneMode') || 'ORBIT',
    bestScore: parseInt(localStorage.getItem('cyber_best') || '0')
};

// Habilidades Roguelite ativas durante a run atual
let activeRunPerks = {
    ricochet: false,
    vampirism: false,
    overcharge: false,
    laserChain: false,
    impactNova: false,
    glassCannon: false,
    // ---- v2 ----
    doubleRicochet: false,
    infiniteRicochet: false,
    chainOverdrive: false,
    omegaChain: false,
    fastShield: false,
    retaliation: false,
    retaliationSwarm: false,
    survivalDrones: false,
    novaSurge: false,
    bloodPact: false,
    gambleContract: false,
    goldenAge: false,
    phoenixCore: false,
    lensFocus: false,
    phoenixUsed: false
};

function saveMetaData() {
    localStorage.setItem('cyber_credits', metaData.credits);
    localStorage.setItem('cyber_upgrades', JSON.stringify(metaData.upgrades));
    localStorage.setItem('cyber_skins', JSON.stringify(metaData.skins));
    localStorage.setItem('cyber_equippedSkin', metaData.equippedSkin);
    localStorage.setItem('cyber_achievements', JSON.stringify(metaData.achievements));
    localStorage.setItem('cyber_stats', JSON.stringify(metaData.stats));
    localStorage.setItem('cyber_leaderboard', JSON.stringify(metaData.leaderboard));
    localStorage.setItem('cyber_difficulty', currentDifficulty);
    localStorage.setItem('cyber_quests', JSON.stringify(metaData.quests));
    localStorage.setItem('cyber_lasers', JSON.stringify(metaData.lasers));
    localStorage.setItem('cyber_equippedLaser', metaData.equippedLaser);
    localStorage.setItem('cyber_dronePatterns', JSON.stringify(metaData.dronePatterns));
    localStorage.setItem('cyber_droneMode', metaData.equippedDronePattern);
    localStorage.setItem('cyber_best', metaData.bestScore || 0);

    // Gancho opcional para sincronizar com o Firestore. Defina window.onMetaDataSaved = (metaData) => {...}
    // no seu código Firebase. O debounce evita gravar na nuvem a cada Graze.
    if (typeof window.onMetaDataSaved === 'function') {
        clearTimeout(window.__metaSaveTimer);
        window.__metaSaveTimer = setTimeout(() => {
            try { window.onMetaDataSaved(metaData); } catch (err) { console.warn('onMetaDataSaved falhou:', err); }
        }, 1500);
    }
}

function setDifficulty(diffKey) {
    if (difficultySettings[diffKey]) {
        currentDifficulty = diffKey;
        saveMetaData();
        document.querySelectorAll('.btn-diff').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-diff') === currentDifficulty);
        });
    }
}

function getUpgradeCost(type) {
    const config = upgradeConfigs[type];
    if (!config) return 100;
    const level = metaData.upgrades[type] || 0;
    return Math.floor(config.baseCost * Math.pow(config.ratio, level));
}

function checkAchievements() {
    if (!metaData.achievements.grazeMaster && metaData.stats.totalGrazes >= 50) {
        metaData.achievements.grazeMaster = true;
        metaData.credits += 200;
        triggerPowerupNotice('🏆 CONQUISTA: MESTRE DO GRAZE (+₡200)');
    }
    if (!metaData.achievements.ultSpammer && metaData.stats.ultUses >= 3) {
        metaData.achievements.ultSpammer = true;
        metaData.credits += 300;
        triggerPowerupNotice('🏆 CONQUISTA: DESTRUÇÃO TOTAL (+₡300)');
    }
    saveMetaData();
}

let nextAdaptiveMilestone = 3000;
let adaptiveLevel = 0;
const ADAPTIVE_STEP = 3000;

function checkAdaptiveDifficulty() {
    let step = ADAPTIVE_STEP;
    if (currentDifficulty === 'IMPOSSIBLE') step = 2000;
    if (currentDifficulty === 'UNPLAYABLE') step = 1000;

    if (score >= nextAdaptiveMilestone) {
        adaptiveLevel++;
        nextAdaptiveMilestone += step;
        triggerAdaptiveNotice(`DIFICULDADE ADAPTADA: NÍVEL +${adaptiveLevel}`);
        audio.playPowerup();
        screenShake = 15;
    }
}

function triggerAdaptiveNotice(text) {
    const adaptiveNotice = document.getElementById('adaptiveNotice');
    if (adaptiveNotice) {
        adaptiveNotice.innerText = text;
        adaptiveNotice.classList.remove('hidden');
        setTimeout(() => adaptiveNotice.classList.add('hidden'), 3000);
    }
}

/* ==========================================================================
3. ENGINE PRINCIPAL, ESTADO GLOBAL, CYBER OVERLOAD E SISTEMA ROGUELITE
========================================================================== */
let canvas, ctx, wrapper, dangerVignette;
let scoreVal, creditsVal, healthFill, ultFill, ultPercentVal, startScreen, gameOverScreen, pauseScreen, shopScreen, leaderboardScreen, achievementsScreen;
let finalScoreText, earnedCreditsText, powerupNotice, bossHealthContainer, bossHealthFill, bossTitle, comboBadge;
let bonusNotice, bonusTimerVal, soundToggleBtn;
let overloadBox, overloadFill, overloadPercentVal, overloadLabel, comboAnnouncer;

/* ---- Balanceamento: ajuste aqui o "feeling" do jogo ---- */
const FX_CFG = {
    DMG_UNIT: 15,            // número exibido = dano x DMG_UNIT  (1 de dano => -15)
    CRIT_CHANCE: 0.22,       // chance de crítico por acerto
    CRIT_MULT: 10 / 3,       // 1 de dano => crítico de -50
    FLASH_FRAMES: 3,         // ~0.05s a 60 FPS
    MAGNET_RADIUS: 150,      // raio de atração magnética dos itens
    CHAIN_RANGE: 170,        // alcance do Laser Chain
    CHAIN_DMG_RATIO: 0.5,    // dano do arco em relação ao tiro original
    NOVA_RADIUS: 340,        // raio da Impact Nova
    STREAK_WINDOW: 100       // frames para encadear abates (anunciador)
};

const OVERLOAD_CFG = {
    AUTO_ACTIVATE: true,     // true = ativa sozinho ao chegar em 100%. false = tecla Q (ou toque na barra)
    DURATION_MS: 6000,
    PER_KILL: 4,
    PER_GRAZE: 2,
    PER_LOOT_KILL: 10,
    PER_BOSS_HIT: 0.15,
    PER_BOSS_KILL: 30,
    CREDIT_MULT: 3,
    BEAM_HALF_W: 26,
    BEAM_DAMAGE: 1.6,
    BEAM_TICK: 4             // a cada N frames o feixe causa dano
};

const COMBO_CALLS = {
    // [texto, cor, tier de intensidade]
    2: ['DOUBLE KILL', '#00e5ff', 1],
    3: ['TRIPLE KILL', '#00ff99', 1],
    4: ['QUAD KILL', '#ffee00', 2],
    5: ['MEGA KILL', '#ffaa00', 2],
    6: ['OVERKILL', '#ff7a00', 3],
    7: ['ULTRA KILL', '#ff6600', 3],
    10: ['MONSTER KILL', '#ff0055', 4],
    12: ['RAMPAGE', '#ff2a6d', 4],
    15: ['UNSTOPPABLE', '#ff00ff', 5],
    20: ['GODLIKE', '#ffffff', 6],
    30: ['BEYOND GODLIKE', '#fffa9a', 7]
};

let gameActive = false, isPaused = false;
let score = 0, earnedCredits = 0, combo = 1, comboTimer = 0;
let screenShake = 0, frameCount = 0;
let ultimateEnergy = 0;

let hitstopFrames = 0;
let slowMotionFactor = 1; // 1 = normal, >1 = slow motion
let slowMotionDuration = 0;
let slowAccum = 0;

let isBonusStage = false;
let bonusTimer = 0;

const BOSS_INTERVAL = 20000;
let nextBossScore = BOSS_INTERVAL, bossLevel = 1;
let subBossSpawned = false;

// Cyber Overload (Fever Mode)
let overload = 0, overloadActive = false, overloadTimer = 0;
// Sequência de abates (anunciador por voz)
let killStreak = 0, streakTimer = 0, lastCallTime = 0;
// Controle do loop em tempo real
let lastTs = 0, rafId = null, pausedAt = 0;
// Morte cinematográfica e flash de tela
let deathSeq = null, flashAlpha = 0;
// Coleções de VFX
let ghosts = [], sparks = [], floatTexts = [], shockwaves = [], lightnings = [];

const neonThemes = [
    { bg: '#080811', star: '#ffffff', accent: '#00e5ff' },
    { bg: '#110515', star: '#ff00ff', accent: '#ff007f' },
    { bg: '#05150e', star: '#00ff66', accent: '#00ffaa' },
    { bg: '#151005', star: '#ffcc00', accent: '#ffaa00' }
];

const keys = {};
let touchX = null, touchY = null;

function triggerHitstop(frames = 6) {
    hitstopFrames = Math.max(hitstopFrames, frames);
}

function triggerSlowMotion(durationFrames = 90, factor = 3) {
    slowMotionDuration = durationFrames;
    slowMotionFactor = factor; // o mundo roda a 1/factor da velocidade
    slowAccum = 0;
}

// Decide se o "mundo" avança neste frame (acumulador => câmera lenta suave, sem travar)
function worldStepAllowed() {
    if (slowMotionDuration > 0) {
        slowMotionDuration--;
        if (slowMotionDuration === 0) slowMotionFactor = 1;
        slowAccum += 1 / slowMotionFactor;
        if (slowAccum < 1) return false;
        slowAccum -= 1;
    }
    return true;
}

function resize() {
    if (canvas && wrapper) {
        canvas.width = wrapper.clientWidth;
        canvas.height = wrapper.clientHeight;
    }
}

function scheduleLoop() {
    lastTs = 0;
    if (rafId) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(gameLoop);
}

/* ---------- Helpers de juice ---------- */
function playerDmgMult() {
    return (activeRunPerks.glassCannon ? 2 : 1) * runMods.dmg;
}

function addCredits(n) {
    const v = Math.round(n * (overloadActive ? OVERLOAD_CFG.CREDIT_MULT : 1) * runMods.credit);
    earnedCredits += v;
    return v;
}

function spawnText(x, y, text, color = '#ffffff', size = 16, opts = {}) {
    if (!canvas) return;
    if (floatTexts.length > 60) floatTexts.shift();
    const cx = Math.max(45, Math.min(canvas.width - 45, x));
    floatTexts.push(new FloatingText(cx, y, text, color, size, opts));
}

// Partículas leves (sem som e sem tremor de tela)
function burst(x, y, color, count = 5) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

function showComboCall(text, color = '#00e5ff', tier = 2) {
    if (!comboAnnouncer) return;
    comboAnnouncer.textContent = text;
    comboAnnouncer.style.color = color;
    comboAnnouncer.style.textShadow = `0 0 12px ${color}, 0 0 30px ${color}`;
    comboAnnouncer.className = 'combo-announcer tier-' + tier;
    void comboAnnouncer.offsetWidth; // reinicia a animação CSS
    comboAnnouncer.classList.add('show');
}

/* ---------- Anunciador de combos (Web Speech API) ---------- */
function registerKill() {
    killStreak++;
    runStats.maxStreak = Math.max(runStats.maxStreak, killStreak);
    streakTimer = FX_CFG.STREAK_WINDOW;
    const call = COMBO_CALLS[killStreak];
    if (call) {
        const tier = call[2] || 1;
        showComboCall(call[0] + '!', call[1], tier);
        comboImpact(tier);
        const now = performance.now();
        if (now - lastCallTime > 700) { audio.announce(call[0], call[2] || 1); lastCallTime = now; }
        score += killStreak * 50;
    }
}

/* ---------- Cyber Overload (Fever Mode) ---------- */
function addOverload(amount) {
    if (!gameActive || overloadActive || (player && player.dying)) return;
    overload = Math.min(100, overload + amount);
    if (overload >= 100 && OVERLOAD_CFG.AUTO_ACTIVATE) activateOverload();
}

function activateOverload() {
    if (overloadActive || overload < 100 || !gameActive || isPaused || (player && player.dying)) return;
    overloadActive = true;
    runStats.overloads++;
    overloadTimer = OVERLOAD_CFG.DURATION_MS;
    overload = 100;
    if (wrapper) wrapper.classList.add('overload-active');
    audio.playOverload();
    audio.announce('NEON OVERLOAD');
    lastCallTime = performance.now();
    showComboCall('NEON OVERLOAD!', '#ffcc00');
    screenShake = Math.max(screenShake, 30);
    flashAlpha = 0.8;
    triggerHitstop(10);
    enemyBullets = []; // limpa a tela de projéteis na ativação
}

function endOverload(silent = false) {
    overloadActive = false;
    overloadTimer = 0;
    overload = 0;
    if (wrapper) wrapper.classList.remove('overload-active');
    if (!silent && player && !player.dying) spawnText(player.x, player.y - 55, 'OVERLOAD ENCERRADO', '#ffcc00', 16, { life: 60 });
}

function updateOverloadBeam() {
    if (!overloadActive || !player || player.dying) return;
    const halfW = OVERLOAD_CFG.BEAM_HALF_W * (1 + Math.sin(frameCount * 0.5) * 0.08);
    const bx = player.x, botY = player.y - player.height / 2;

    // O feixe consome projéteis inimigos na coluna
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const eb = enemyBullets[i];
        if (eb.y < botY && Math.abs(eb.x - bx) < halfW + eb.radius) {
            burst(eb.x, eb.y, '#ffcc00', 3);
            enemyBullets.splice(i, 1);
        }
    }

    if (frameCount % 6 === 0) audio.playLaser(260);
    if (frameCount % OVERLOAD_CFG.BEAM_TICK !== 0) return;

    const dmg = OVERLOAD_CFG.BEAM_DAMAGE * playerDmgMult();
    const showText = frameCount % 12 === 0;

    [...enemies].forEach(e => {
        if (e.y - e.height / 2 < botY && Math.abs(e.x - bx) < halfW + e.width / 2) {
            damageEnemy(e, dmg, { crit: false, flash: true, silent: !showText });
        }
    });

    [...obstacles].forEach(o => {
        if (o.y - o.radius < botY && Math.abs(o.x - bx) < halfW + o.radius) damageObstacle(o, dmg);
    });

    if (currentBoss && currentBoss.hp > 0 && currentBoss.y < botY && Math.abs(currentBoss.x - bx) < halfW + currentBoss.width / 2) {
        damageBoss(dmg, { crit: false, flash: true, silent: !showText });
    }
}

function drawOverloadBeam() {
    if (!overloadActive || !player || player.dying) return;
    const halfW = OVERLOAD_CFG.BEAM_HALF_W * (1 + Math.sin(frameCount * 0.5) * 0.08);
    const x = player.x, y1 = Math.max(1, player.y - player.height / 2 + 4);
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';

    let g = ctx.createLinearGradient(x - halfW * 1.7, 0, x + halfW * 1.7, 0);
    g.addColorStop(0, 'rgba(255,170,0,0)');
    g.addColorStop(0.5, 'rgba(255,200,60,0.5)');
    g.addColorStop(1, 'rgba(255,170,0,0)');
    ctx.fillStyle = g;
    ctx.fillRect(x - halfW * 1.7, 0, halfW * 3.4, y1);

    g = ctx.createLinearGradient(x - halfW, 0, x + halfW, 0);
    g.addColorStop(0, 'rgba(255,140,0,0.25)');
    g.addColorStop(0.35, 'rgba(255,220,100,0.9)');
    g.addColorStop(0.5, 'rgba(255,255,255,1)');
    g.addColorStop(0.65, 'rgba(255,220,100,0.9)');
    g.addColorStop(1, 'rgba(255,140,0,0.25)');
    ctx.fillStyle = g;
    ctx.shadowBlur = 30; ctx.shadowColor = '#ffcc00';
    ctx.fillRect(x - halfW, 0, halfW * 2, y1);

    // anéis de energia subindo pelo feixe
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    for (let i = 0; i < 6; i++) {
        const yy = (frameCount * 18 + i * 140) % (y1 + 1);
        ctx.fillRect(x - halfW - 4, y1 - yy, halfW * 2 + 8, 2);
    }
    ctx.restore();
}

/* ---------- Morte cinematográfica (slow-motion + rotação + faíscas) ---------- */
function startDeathSequence() {
    if (!player || player.dying) return;
    if (activeRunPerks.phoenixCore && !activeRunPerks.phoenixUsed) { phoenixRevive(); return; }
    endBulletTime(true);
    player.dying = true;
    player.health = 0;
    deathSeq = { start: performance.now(), phase: 'spin', boomAt: 0 };
    if (overloadActive) endOverload(true);
    audio.stopMusic();
    audio.playDeath();
    audio.announce('Critical failure');
    triggerSlowMotion(999999, 4);
    screenShake = Math.max(screenShake, 14);
    if (dangerVignette) dangerVignette.classList.remove('hidden');
}

function updateDeathSequence() {
    if (!deathSeq || !player) return;
    const now = performance.now();
    if (deathSeq.phase === 'spin') {
        const t = now - deathSeq.start;
        const k = Math.min(1, t / 1500);
        player.rot += 0.08 + k * 0.42;
        player.x += Math.sin(t * 0.012) * 0.8;
        player.y = Math.min(canvas.height - 10, player.y + 0.3 + k * 0.5);
        const colors = ['#ff9500', '#ffe066', '#ffffff', '#ff3300'];
        for (let i = 0; i < 3; i++) {
            const a = Math.random() * Math.PI * 2, sp = 2 + Math.random() * 6;
            sparks.push(new Spark(player.x + (Math.random() - 0.5) * 16, player.y + (Math.random() - 0.5) * 16, {
                vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 22 + Math.random() * 18, size: 2 + Math.random() * 1.5,
                color: colors[Math.floor(Math.random() * colors.length)]
            }));
        }
        if (t >= 1500) {
            deathSeq.phase = 'boom';
            deathSeq.boomAt = now;
            finalExplosion();
        }
    } else if (deathSeq.phase === 'boom') {
        if (now - deathSeq.boomAt > 900) {
            deathSeq = null;
            endGame();
        }
    }
}

function finalExplosion() {
    slowMotionDuration = 0; slowMotionFactor = 1; slowAccum = 0;
    player.hidden = true;
    createExplosion(player.x, player.y, '#00e5ff', 60);
    createExplosion(player.x, player.y, '#ff007f', 60);
    createExplosion(player.x, player.y, '#ffffff', 40);
    for (let i = 0; i < 50; i++) {
        const a = Math.random() * Math.PI * 2, sp = 4 + Math.random() * 12;
        sparks.push(new Spark(player.x, player.y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 30 + Math.random() * 30, size: 2.5, color: i % 2 ? '#ffcc00' : '#ffffff' }));
    }
    shockwaves.push(new Shockwave(player.x, player.y, { maxR: 280, speed: 14, color: '#ff0055', damaging: false }));
    audio.playBigExplosion();
    flashAlpha = 1;
    screenShake = 45;
}

/* ==========================================================================
SISTEMA DE CARTAS DE UPGRADES ROGUELITE (BOSS REWARD)
========================================================================== */
const availablePerkCards = [
    { id: 'ricochet', key: 'ricochet', title: '⚡ LASER RICOCHETE', desc: 'Tiros do jogador rebatem 1x nas paredes da tela.' },
    { id: 'vampirism', key: 'vampirism', title: '🩸 NANO-BOTS VAMPIRICOS', desc: 'Destruir inimigos recupera 2% de Vida.' },
    { id: 'overcharge', key: 'overcharge', title: '🚀 PROPULSOR OVERCHARGE', desc: '+25% de Velocidade base permanentemente nesta partida.' },
    { id: 'shield_matrix', title: '🛡️ MATRIZ DE ESCUDO', desc: 'Concede instantaneamente um Escudo Protetor.' },
    { id: 'ult_recharge', title: '⚡ RECARGA EMP', desc: 'Carrega instantaneamente 50% da barra Ultimate.' },
    { id: 'laser_chain', key: 'laserChain', title: '⛓️ LASER CHAIN', desc: 'Seus tiros soltam um arco elétrico que ricocheteia entre até 2 inimigos próximos.' },
    { id: 'impact_nova', key: 'impactNova', title: '💥 IMPACT NOVA', desc: 'Perfect Dash libera uma onda de choque que destrói projéteis inimigos.' },
    { id: 'glass_cannon', key: 'glassCannon', risk: true, title: '🔮 GLASS CANNON', desc: '+100% de dano, mas a vida máxima cai pela metade.' }
];

function showCardSelectionScreenClassic() {
    if (!gameActive || (player && player.dying)) return;
    isPaused = true;

    // Não oferece de novo perks que já estão ativos
    const pool = availablePerkCards.filter(c => !c.key || !activeRunPerks[c.key]);
    for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
    }
    const selectedCards = pool.slice(0, 3);

    let cardModal = document.getElementById('cardSelectionModal');
    if (!cardModal) {
        cardModal = document.createElement('div');
        cardModal.id = 'cardSelectionModal';
        cardModal.className = 'overlay-screen';
        cardModal.style.zIndex = '30';
        document.getElementById('game-wrapper').appendChild(cardModal);
    }

    cardModal.innerHTML = `
        <h2 class="title-secondary" style="color: #00ffcc;">CHEFÃO DERROTADO!</h2>
        <p class="subtitle">ESCOLHA UMA MELHORIA DE SISTEMA:</p>
        <div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center; max-width: 90%;">
            ${selectedCards.map(c => `
                <div class="shop-item" style="flex-direction: column; width: 150px; text-align: center; cursor: pointer; border-color: ${c.risk ? '#ff0055' : '#00ffcc'}; padding: 15px;" onclick="applyPerkCard('${c.id}')">
                    <strong style="color: ${c.risk ? '#ff6688' : '#00e5ff'}; font-size: 0.85rem; margin-bottom: 8px;">${c.title}</strong>
                    <span style="font-size: 0.7rem; color: #a0a0c0;">${c.desc}</span>
                    <button class="btn-shop" style="margin-top: 12px; width: 100%;">ESCOLHER</button>
                </div>
            `).join('')}
        </div>
    `;

    cardModal.classList.remove('hidden');
}

window.applyPerkCard = function(perkId) {
    clearRouletteTimers();
    applyExtendedPerk(perkId);
    if (perkId === 'ricochet') activeRunPerks.ricochet = true;
    else if (perkId === 'vampirism') activeRunPerks.vampirism = true;
    else if (perkId === 'overcharge') {
        activeRunPerks.overcharge = true;
        if (player) player.speed *= 1.25;
    }
    else if (perkId === 'shield_matrix') {
        if (player) player.powerup = 'SHIELD';
    }
    else if (perkId === 'ult_recharge') {
        ultimateEnergy = Math.min(100, ultimateEnergy + 50);
    }
    else if (perkId === 'laser_chain') activeRunPerks.laserChain = true;
    else if (perkId === 'impact_nova') activeRunPerks.impactNova = true;
    else if (perkId === 'glass_cannon') {
        activeRunPerks.glassCannon = true;
        if (player) {
            player.maxHealth = Math.max(1, Math.round(player.maxHealth / 2));
            player.health = Math.min(player.health, player.maxHealth);
        }
    }

    const cardModal = document.getElementById('cardSelectionModal');
    if (cardModal) cardModal.classList.add('hidden');

    isPaused = false;
    audio.playPowerup();
    startBonusStage();
    scheduleLoop();
};

function startBonusStage() {
    isBonusStage = true;
    bonusTimer = 600;
    enemies = []; enemyBullets = []; obstacles = [];
    if (bonusNotice) bonusNotice.classList.remove('hidden');
    audio.speak('Bonus Stage!');
}

function updateBonusStage() {
    if (!isBonusStage) return;
    bonusTimer--;
    if (bonusTimerVal) bonusTimerVal.innerText = `${Math.ceil(bonusTimer / 60)}s`;

    if (frameCount % 15 === 0) {
        const x = Math.random() * (canvas.width - 40) + 20;
        const type = Math.random() < 0.2 ? 'ULT_CHARGE' : 'CRYSTAL';
        powerups.push(new PowerUp(x, -20, type));
    }

    if (bonusTimer <= 0) {
        isBonusStage = false;
        if (bonusNotice) bonusNotice.classList.add('hidden');
    }
}

function triggerUltimate() {
    if (!gameActive || isPaused || ultimateEnergy < 100 || (player && player.dying)) return;

    ultimateEnergy = 0;
    metaData.stats.ultUses++;
    runStats.ultUsed++;
    checkAchievements();

    audio.playUlt();
    audio.speak('Ultimate Activated!');
    screenShake = 25;
    flashAlpha = Math.max(flashAlpha, 0.5);
    triggerHitstop(12);

    enemyBullets = [];
    obstacles = [];

    enemies.forEach(e => {
        createExplosion(e.x, e.y, e.color, 25);
        if (e.type === 'LOOT') dropLootCoins(e, 8); // o Loot Drone solta o prêmio mesmo no EMP
    });
    enemies = [];

    if (currentBoss && currentBoss.hp > 0) {
        createExplosion(currentBoss.x, currentBoss.y, '#ff00ff', 40);
        currentBoss.flash = FX_CFG.FLASH_FRAMES;
        spawnText(currentBoss.x, currentBoss.y + 50, 'EMP -180', '#ff00ff', 24, { life: 70 });
        runStats.damage += 180 * FX_CFG.DMG_UNIT;
        currentBoss.takeDamage(180);
    }

    triggerPowerupNotice('BOMBA EMP ATIVADA!');
}

function togglePause() {
    if (!gameActive) return;
    const cardModal = document.getElementById('cardSelectionModal');
    if (cardModal && !cardModal.classList.contains('hidden')) return; // escolhendo carta: não pausa
    isPaused = !isPaused;
    if (isPaused) {
        pausedAt = performance.now();
        if (pauseScreen) pauseScreen.classList.remove('hidden');
    } else {
        if (deathSeq) deathSeq.start += performance.now() - pausedAt; // não "gasta" a cena de morte pausado
        if (pauseScreen) pauseScreen.classList.add('hidden');
        scheduleLoop();
    }
}

function toggleSound() {
    const isMuted = audio.toggleMute();
    if (soundToggleBtn) soundToggleBtn.innerText = isMuted ? 'SOM: DESLIGADO' : 'SOM: LIGADO';
}

function triggerPowerupNotice(text) {
    if (powerupNotice) { powerupNotice.innerText = text; powerupNotice.style.opacity = '1'; }
}

/* ==========================================================================
DANO: INIMIGOS, CHEFE, OBSTÁCULOS, JOGADOR (centralizado p/ aplicar VFX)
========================================================================== */
function dropLootCoins(e, n = 1) {
    for (let i = 0; i < n; i++) {
        const c = new PowerUp(e.x, e.y, 'CREDIT');
        const a = Math.random() * Math.PI * 2, s = 2 + Math.random() * 4;
        c.vx = Math.cos(a) * s;
        c.vy = Math.sin(a) * s - 1;
        powerups.push(c);
    }
    audio.playCoin();
}

function damageEnemy(e, dmg, opts = {}) {
    if (!e || e.dead) return false;
    const crit = (opts.crit !== undefined) ? opts.crit : Math.random() < FX_CFG.CRIT_CHANCE;
    const finalDmg = dmg * (crit ? FX_CFG.CRIT_MULT : 1);
    runStats.damage += Math.min(finalDmg, Math.max(0, e.hp)) * FX_CFG.DMG_UNIT;
    e.hp -= finalDmg;
    if (crit || opts.flash) e.flash = FX_CFG.FLASH_FRAMES;

    if (!opts.silent) {
        const shown = Math.round(finalDmg * FX_CFG.DMG_UNIT);
        if (crit) {
            spawnText(e.x, e.y - e.height / 2 - 20, 'CRITICAL!', '#ffee00', 17, { life: 60 });
            spawnText(e.x, e.y - e.height / 2 - 2, `-${shown}`, '#ffffff', 20, { life: 60 });
        } else {
            spawnText(e.x, e.y - e.height / 2 - 4, `-${shown}`, '#ff8fb0', 14, { life: 40 });
        }
    }

    // Loot Drone: cada acerto solta créditos
    if (e.type === 'LOOT' && e.hp > 0) dropLootCoins(e, Math.random() < 0.5 ? 2 : 1);

    audio.playHit();

    if (e.hp <= 0) { onEnemyKilled(e); return true; }
    return false;
}

function onEnemyKilled(e) {
    if (e.dead) return;
    e.dead = true;
    const idx = enemies.indexOf(e);
    if (idx !== -1) enemies.splice(idx, 1);

    if (e.type === 'GOLDEN') {
        const v = addCredits(100);
        ultimateEnergy = Math.min(100, ultimateEnergy + 30);
        triggerPowerupNotice(`🏆 DRONE DOURADO DESTRUÍDO (+₡${v} / +30% ULT)!`);
        triggerHitstop(8);
    } else if (e.type === 'LOOT') {
        dropLootCoins(e, 10);
        jackpotExplosion(e.x, e.y, 32, 2);
        spawnText(e.x, e.y - 30, 'JACKPOT!', '#ffd700', 24, { life: 80 });
        showComboCall('JACKPOT!', '#ffd700');
        audio.announce('Jackpot');
        lastCallTime = performance.now();
        triggerHitstop(8);
    } else {
        const dropChance = currentBoss ? 0.60 : 0.25;
        if (Math.random() < dropChance) powerups.push(new PowerUp(e.x, e.y));
    }

    // Perk Vampirismo
    if (activeRunPerks.vampirism && player && !player.dying) {
        player.health = Math.min(player.maxHealth, player.health + player.maxHealth * 0.02);
    }

    createExplosion(e.x, e.y, e.color, 20);
    score += 100 * combo;
    addCredits(5);
    ultimateEnergy = Math.min(100, ultimateEnergy + 10);
    comboTimer = 120; combo = Math.min(5, combo + 0.2);
    addOverload(e.type === 'LOOT' ? OVERLOAD_CFG.PER_LOOT_KILL : OVERLOAD_CFG.PER_KILL);
    registerKill();
    runStats.kills++;
    onKillV2(e);
}

function damageBoss(dmg, opts = {}) {
    const b = currentBoss;
    if (!b || b.hp <= 0) return;
    const crit = (opts.crit !== undefined) ? opts.crit : Math.random() < FX_CFG.CRIT_CHANCE;
    const finalDmg = dmg * (crit ? FX_CFG.CRIT_MULT : 1);
    if (crit || opts.flash) b.flash = FX_CFG.FLASH_FRAMES;

    if (!opts.silent && (crit || frameCount - (b.lastTextFrame || 0) >= 4)) {
        b.lastTextFrame = frameCount;
        const shown = Math.round(finalDmg * FX_CFG.DMG_UNIT);
        const tx = b.x + (Math.random() - 0.5) * b.width * 0.6;
        if (crit) {
            spawnText(tx, b.y + b.height / 2 + 6, 'CRITICAL!', '#ffee00', 18, { life: 60 });
            spawnText(tx, b.y + b.height / 2 + 26, `-${shown}`, '#ffffff', 22, { life: 60 });
        } else {
            spawnText(tx, b.y + b.height / 2 + 6, `-${shown}`, '#ff8fb0', 15, { life: 40 });
        }
    }
    runStats.damage += Math.min(finalDmg, Math.max(0, b.hp)) * FX_CFG.DMG_UNIT;
    audio.playHit();
    b.takeDamage(finalDmg);
}

function damageObstacle(obs, dmg) {
    obs.hp -= dmg;
    if (obs.hp <= 0) {
        createExplosion(obs.x, obs.y, '#ffaa00', 30);
        [...enemies].forEach(e => {
            if (Math.hypot(e.x - obs.x, e.y - obs.y) < 80) damageEnemy(e, 3, { crit: false, flash: true, silent: true });
        });
        const i = obstacles.indexOf(obs);
        if (i !== -1) obstacles.splice(i, 1);
        return true;
    }
    return false;
}

function damagePlayer(amount) {
    if (!player || player.dying || overloadActive) return; // Overload = invulnerável
    if (player.invuln > 0) return;
    amount *= runMods.dmgTaken;
    combo = 1; killStreak = 0;
    if (player.powerup === 'SHIELD') {
        player.powerup = null;
        if (activeRunPerks.fastShield) player.shieldRegen = 480;
        if (powerupNotice) powerupNotice.style.opacity = '0';
        spawnText(player.x, player.y - 40, 'SHIELD BREAK', '#00e5ff', 16);
        onPlayerHitV2();
        screenShake = Math.max(screenShake, 8);
        return;
    }
    player.health -= amount;
    screenShake = Math.max(screenShake, 14);
    triggerHitstop(3);
    spawnText(player.x, player.y - 36, `-${Math.round(amount)}`, '#ff3355', 18);
    onPlayerHitV2();
    if (player.health <= 0) {
        player.health = 0;
        startDeathSequence();
    }
}

/* ---------- Laser Chain (perk) ---------- */
function chainLightning(x, y, exclude, baseDmg) {
    const visited = new Set([exclude]);
    const pts = [{ x, y }];
    let cx = x, cy = y;
    for (let i = 0; i < chainTargets(); i++) {
        let best = null, bd = chainRange();
        enemies.forEach(en => {
            if (visited.has(en) || en.dead) return;
            const d = Math.hypot(en.x - cx, en.y - cy);
            if (d < bd) { bd = d; best = en; }
        });
        if (!best && currentBoss && currentBoss.hp > 0 && !visited.has(currentBoss)
            && Math.hypot(currentBoss.x - cx, currentBoss.y - cy) < chainRange() + currentBoss.width / 2) {
            best = currentBoss;
        }
        if (!best) break;
        visited.add(best);
        pts.push({ x: best.x, y: best.y });
        cx = best.x; cy = best.y;
        const d = baseDmg * chainRatio();
        if (best === currentBoss) damageBoss(d, { crit: false, flash: true, silent: true });
        else damageEnemy(best, d, { crit: false, flash: true, silent: true });
    }
    if (pts.length > 1) {
        lightnings.push(new Lightning(pts));
        audio.playZap();
    }
}

/* ---------- Impact Nova (perk) ---------- */
function spawnNova() {
    if (!player) return;
    shockwaves.push(new Shockwave(player.x, player.y, { maxR: FX_CFG.NOVA_RADIUS * runMods.range * runMods.novaMult, speed: 16, color: '#00e5ff' }));
    audio.playNova();
    screenShake = Math.max(screenShake, 18);
    flashAlpha = Math.max(flashAlpha, 0.25);
    spawnText(player.x, player.y - 62, 'IMPACT NOVA!', '#00e5ff', 22, { life: 70 });
}

/* ==========================================================================
4. ENTIDADES: PLAYER, VFX, INIMIGOS, OBSTÁCULOS, CHEFE E ITENS
========================================================================== */
const SKIN_COLORS = { DEFAULT: '#00e5ff', V_WING: '#ff007f', DUAL_WING: '#00ff66' };
const SKIN_FILL = { DEFAULT: '#050508', V_WING: '#100015', DUAL_WING: '#00150a' };

function skinColor(skin) { return SKIN_COLORS[skin] || SKIN_COLORS.DEFAULT; }

// Contorno da nave (compartilhado entre a nave e os ghosts do Dash)
function traceShipPath(c, skin, w, h) {
    c.beginPath();
    if (skin === 'V_WING') {
        c.moveTo(0, -h / 2); c.lineTo(w / 2 + 5, h / 2); c.lineTo(0, 0); c.lineTo(-w / 2 - 5, h / 2);
    } else if (skin === 'DUAL_WING') {
        c.moveTo(-10, -h / 2); c.lineTo(10, -h / 2); c.lineTo(w / 2 + 8, h / 2); c.lineTo(0, h / 4); c.lineTo(-w / 2 - 8, h / 2);
    } else {
        c.moveTo(0, -h / 2); c.lineTo(w / 2, h / 2); c.lineTo(0, h / 3); c.lineTo(-w / 2, h / 2);
    }
    c.closePath();
}

function drawShip(c, skin, w, h, strokeOverride) {
    const col = skinColor(skin);
    c.shadowBlur = 15; c.shadowColor = strokeOverride || col;
    c.strokeStyle = strokeOverride || col;
    c.fillStyle = SKIN_FILL[skin] || SKIN_FILL.DEFAULT;
    traceShipPath(c, skin, w, h);
    c.fill(); c.lineWidth = 2.5; c.stroke();
}

class Player {
    constructor() {
        this.width = 40; this.height = 45;
        this.x = canvas ? canvas.width / 2 : 300;
        this.y = canvas ? canvas.height - 100 : 700;
        this.speed = 7 + (metaData.upgrades.speed || 0) * 0.8;
        this.maxHealth = 100 + (metaData.upgrades.health || 0) * 25;
        this.health = this.maxHealth;
        this.powerup = null; this.powerupTimer = 0; this.shootCooldown = 0;
        this.isDashing = false; this.dashTimer = 0; this.dashCooldown = 0;
        this.perfectDashWindow = 0;
        this.skin = metaData.equippedSkin;
        this.droneCount = metaData.upgrades.drone || 0;

        this.dashAge = 0;      // frames desde o início do Dash (ghost trail)
        this.novaUsed = false; // Impact Nova: 1x por Dash
        this.vx = 0; this.vy = 0;
        this.thrust = 1;       // intensidade do propulsor
        this.dying = false; this.hidden = false; this.rot = 0;
        this.guards = [];      // Drones de Sobrevivência
        this.shieldRegen = 0;  // recarga do escudo (carta)
        this.novaCd = 0;       // recarga da Nova Surto
        this.invuln = 0;       // invulnerabilidade temporária (Fênix)
    }

    dash() {
        if (this.dying) return;
        if (this.dashCooldown === 0) {
            this.isDashing = true;
            this.dashTimer = 14;
            this.perfectDashWindow = 6;
            this.dashCooldown = 60;
            this.dashAge = 0;
            this.novaUsed = false;
            audio.playPowerup();
            if (activeRunPerks.novaSurge && this.novaCd <= 0) { this.novaCd = 180; spawnNova(); }
        }
    }

    rearY() {
        if (this.skin === 'V_WING') return 2;
        if (this.skin === 'DUAL_WING') return this.height / 4;
        return this.height / 3 - 1;
    }

    update() {
        const prevX = this.x, prevY = this.y;
        this.tickV2();

        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.dashTimer > 0) {
            this.dashTimer--;
            if (this.perfectDashWindow > 0) this.perfectDashWindow--;
            if (this.dashTimer === 0) this.isDashing = false;
        }

        // Ghost Trail: 3 sombras translúcidas durante o Dash
        if (this.isDashing) {
            this.dashAge++;
            if (this.dashAge === 1 || this.dashAge === 5 || this.dashAge === 9) {
                ghosts.push(new Ghost(this.x, this.y, this.skin, this.width, this.height));
            }
        }

        const isOverdrive = (this.health / this.maxHealth) <= 0.25;
        let currentSpeed = this.isDashing ? this.speed * 2.2 : this.speed;
        if (isOverdrive) currentSpeed *= 1.3;

        if (keys['ArrowLeft'] || keys['KeyA']) this.x -= currentSpeed;
        if (keys['ArrowRight'] || keys['KeyD']) this.x += currentSpeed;
        if (keys['ArrowUp'] || keys['KeyW']) this.y -= currentSpeed;
        if (keys['ArrowDown'] || keys['KeyS']) this.y += currentSpeed;

        if (touchX !== null && touchY !== null) {
            const dx = touchX - this.x, dy = touchY - this.y;
            this.x += dx * 0.15; this.y += dy * 0.15;
        }

        if (canvas) {
            this.x = Math.max(this.width / 2, Math.min(canvas.width - this.width / 2, this.x));
            this.y = Math.max(this.height / 2, Math.min(canvas.height - this.height / 2, this.y));
        }

        this.vx = this.x - prevX;
        this.vy = this.y - prevY;

        // Propulsor dinâmico: cresce ao avançar, encolhe ao recuar
        const forward = -this.vy;
        let target = 1;
        if (forward > 0.5) target = 1.6 + Math.min(1.2, forward / 8);
        else if (forward < -0.5) target = 0.55;
        if (this.isDashing) target = Math.max(target, 3);
        this.thrust += (target - this.thrust) * 0.2;

        const sparkCount = this.thrust > 2 ? 3 : this.thrust > 1.3 ? 2 : (frameCount % 3 === 0 ? 1 : 0);
        const flameColor = overloadActive ? '#ffd24a' : skinColor(this.skin);
        for (let i = 0; i < sparkCount; i++) {
            sparks.push(new Spark(this.x + (Math.random() - 0.5) * 10, this.y + this.rearY() + this.height / 2 - 6, {
                vx: (Math.random() - 0.5) * 2.4 - this.vx * 0.15,
                vy: 2 + this.thrust * 1.6 + Math.random() * 2,
                life: 14 + Math.random() * 12,
                size: 1.5 + Math.random() * 1.2,
                color: Math.random() < 0.35 ? '#ffffff' : flameColor,
                drag: 0.95
            }));
        }

        const fireInterval = Math.max(3, Math.round((isOverdrive ? 4 : 8) / runMods.fireRate));
        this.shootCooldown++;
        if (this.shootCooldown >= fireInterval) {
            if (!overloadActive) this.shoot(); // em Overload o feixe gigante substitui o tiro comum
            this.shootCooldown = 0;
        }

        // Drones auxiliares disparam de forma independente (padrão definido pela loja)
        this.fireDrones();

        if (this.powerupTimer > 0) {
            this.powerupTimer--;
            if (this.powerupTimer === 0) { this.powerup = null; if (powerupNotice) powerupNotice.style.opacity = '0'; }
        }
    }

    shoot() {
        audio.playLaser(800);
        const bulletColor = laserColor(this.skin);

        if (this.powerup === 'HOMING') {
            bullets.push(new Bullet(this.x - 15, this.y, 0, -8, true, '#ffcc00', true));
            bullets.push(new Bullet(this.x + 15, this.y, 0, -8, true, '#ffcc00', true));
        } else if (this.powerup === 'PENTA') {
            bullets.push(new Bullet(this.x, this.y - 20, 0, -12, true, '#ff00ff'));
            bullets.push(new Bullet(this.x - 12, this.y - 15, -2.5, -11.5, true, '#ff00ff'));
            bullets.push(new Bullet(this.x + 12, this.y - 15, 2.5, -11.5, true, '#ff00ff'));
            bullets.push(new Bullet(this.x - 22, this.y - 10, -5, -10.5, true, '#ff00ff'));
            bullets.push(new Bullet(this.x + 22, this.y - 10, 5, -10.5, true, '#ff00ff'));
        } else if (this.powerup === 'TRIPLE') {
            bullets.push(new Bullet(this.x, this.y - 20, 0, -12, true, bulletColor));
            bullets.push(new Bullet(this.x - 15, this.y - 10, -3, -11, true, bulletColor));
            bullets.push(new Bullet(this.x + 15, this.y - 10, 3, -11, true, bulletColor));
        } else {
            bullets.push(new Bullet(this.x, this.y - 20, 0, -12, true, bulletColor));
        }
    }

    drawFlame() {
        const col = overloadActive ? '#ffd24a' : skinColor(this.skin);
        const originY = this.rearY();
        const len = 10 + this.thrust * 15 + Math.random() * 5;
        const wd = 4 + Math.min(3, this.thrust * 1.4);
        const g = ctx.createLinearGradient(0, originY, 0, originY + len);
        g.addColorStop(0, '#ffffff');
        g.addColorStop(0.3, col);
        g.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.shadowBlur = 18; ctx.shadowColor = col;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(-wd, originY);
        ctx.quadraticCurveTo(-wd * 0.6, originY + len * 0.55, 0, originY + len);
        ctx.quadraticCurveTo(wd * 0.6, originY + len * 0.55, wd, originY);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
    }

    draw() {
        if (this.hidden) return;
        ctx.save(); ctx.translate(this.x, this.y);
        if (this.rot) ctx.rotate(this.rot);
        if (this.isDashing) ctx.globalAlpha = 0.5;

        if (!this.dying) this.drawFlame();

        if ((this.health / this.maxHealth) <= 0.25 && !this.dying) {
            ctx.beginPath(); ctx.arc(0, 0, 30 + Math.sin(frameCount * 0.3) * 5, 0, Math.PI * 2);
            ctx.strokeStyle = '#ff0000'; ctx.lineWidth = 2; ctx.stroke();
        }

        if (overloadActive) {
            ctx.beginPath(); ctx.arc(0, 0, 32 + Math.sin(frameCount * 0.4) * 4, 0, Math.PI * 2);
            ctx.strokeStyle = '#ffe066'; ctx.lineWidth = 3; ctx.shadowBlur = 20; ctx.shadowColor = '#ffcc00'; ctx.stroke();
        }

        if (this.powerup === 'SHIELD') {
            ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 3; ctx.shadowBlur = 15; ctx.shadowColor = '#00e5ff'; ctx.stroke();
        }

        // Em colapso a nave pisca entre laranja e vermelho
        const dyingColor = this.dying ? (Math.floor(performance.now() / 70) % 2 ? '#ff3300' : '#ffaa00') : null;
        drawShip(ctx, this.skin, this.width, this.height, dyingColor);

        ctx.restore();

        if (!this.dying) this.drawDrones();
    }
}

/* ---------- VFX ---------- */
class Ghost {
    constructor(x, y, skin, w, h) {
        this.x = x; this.y = y; this.skin = skin; this.w = w; this.h = h;
        this.alpha = 0.55; this.scale = 1;
    }
    update() { this.alpha -= 0.028; this.scale += 0.012; }
    draw() {
        const col = skinColor(this.skin);
        ctx.save();
        ctx.translate(this.x, this.y); ctx.scale(this.scale, this.scale);
        ctx.globalAlpha = Math.max(0, this.alpha) * 0.55;
        ctx.shadowBlur = 20; ctx.shadowColor = col;
        ctx.fillStyle = col;
        traceShipPath(ctx, this.skin, this.w, this.h);
        ctx.fill();
        ctx.globalAlpha = Math.max(0, this.alpha);
        ctx.strokeStyle = col; ctx.lineWidth = 2; ctx.stroke();
        ctx.restore();
    }
}

class Spark {
    constructor(x, y, o = {}) {
        this.x = x; this.y = y;
        this.vx = o.vx ?? 0; this.vy = o.vy ?? 0;
        this.life = this.maxLife = o.life || 20;
        this.size = o.size || 2;
        this.color = o.color || '#ffffff';
        this.drag = o.drag ?? 0.97;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vx *= this.drag; this.vy *= this.drag;
        this.life--;
    }
    draw() {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.strokeStyle = this.color; ctx.lineWidth = this.size; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x - this.vx * 2, this.y - this.vy * 2); ctx.stroke();
        ctx.restore();
    }
}

class FloatingText {
    constructor(x, y, text, color, size, opts = {}) {
        this.x = x; this.y = y; this.text = text; this.color = color; this.size = size;
        this.life = this.maxLife = opts.life || 55;
        this.vx = opts.vx ?? (Math.random() - 0.5) * 0.6;
        this.vy = opts.vy ?? -1.2;
    }
    update() {
        this.x += this.vx; this.y += this.vy;
        this.vy *= 0.96;
        this.life--;
    }
    draw() {
        const t = this.life / this.maxLife;
        const age = this.maxLife - this.life;
        const pop = age < 8 ? 1.6 - (age / 8) * 0.6 : 1; // "pulo" de escala ao nascer
        ctx.save();
        ctx.globalAlpha = Math.max(0, t < 0.35 ? t / 0.35 : 1);
        ctx.font = `900 ${Math.round(this.size * pop)}px 'Segoe UI', Tahoma, sans-serif`;
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
        ctx.lineWidth = 3; ctx.strokeStyle = 'rgba(0,0,0,0.75)'; ctx.lineJoin = 'round';
        ctx.strokeText(this.text, this.x, this.y);
        ctx.fillStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 10;
        ctx.fillText(this.text, this.x, this.y);
        ctx.restore();
    }
}

class Shockwave {
    constructor(x, y, o = {}) {
        this.x = x; this.y = y; this.r = 10;
        this.maxR = o.maxR || 320; this.speed = o.speed || 14;
        this.color = o.color || '#00e5ff';
        this.damaging = o.damaging !== false;
        this.hit = new Set();
    }
    get done() { return this.r >= this.maxR; }
    update() {
        this.r += this.speed;
        this.speed = Math.max(7, this.speed * 0.97);
        if (!this.damaging) return;
        const mult = playerDmgMult() * runMods.novaDmg;

        for (let i = enemyBullets.length - 1; i >= 0; i--) {
            const eb = enemyBullets[i];
            if (Math.hypot(eb.x - this.x, eb.y - this.y) <= this.r + eb.radius) {
                burst(eb.x, eb.y, eb.color, 3);
                score += 10;
                enemyBullets.splice(i, 1);
            }
        }
        [...enemies].forEach(e => {
            if (!this.hit.has(e) && Math.hypot(e.x - this.x, e.y - this.y) <= this.r + e.width / 2) {
                this.hit.add(e);
                damageEnemy(e, 3 * mult, { crit: true });
            }
        });
        if (currentBoss && currentBoss.hp > 0 && !this.hit.has(currentBoss)
            && Math.hypot(currentBoss.x - this.x, currentBoss.y - this.y) <= this.r + currentBoss.width / 2) {
            this.hit.add(currentBoss);
            damageBoss(20 * mult, { crit: false, flash: true });
        }
    }
    draw() {
        const a = Math.max(0, 1 - this.r / this.maxR);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = this.color; ctx.shadowColor = this.color; ctx.shadowBlur = 25;
        ctx.globalAlpha = a; ctx.lineWidth = 3 + 7 * a;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r, 0, Math.PI * 2); ctx.stroke();
        ctx.globalAlpha = a * 0.5; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.arc(this.x, this.y, this.r * 0.8, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();
    }
}

class Lightning {
    constructor(points, opts = {}) {
        this.pts = points;
        this.c1 = opts.c1 || '#37c8ff';
        this.c2 = opts.c2 || '#ffffff';
        this.life = this.maxLife = opts.life || 10;
        this.path = this.build();
    }
    build() {
        const out = [];
        for (let i = 0; i < this.pts.length - 1; i++) {
            const a = this.pts[i], b = this.pts[i + 1];
            const segs = 7;
            const nx = -(b.y - a.y), ny = (b.x - a.x);
            const len = Math.hypot(nx, ny) || 1;
            out.push({ x: a.x, y: a.y });
            for (let s = 1; s < segs; s++) {
                const t = s / segs, j = (Math.random() - 0.5) * 18;
                out.push({ x: a.x + (b.x - a.x) * t + (nx / len) * j, y: a.y + (b.y - a.y) * t + (ny / len) * j });
            }
        }
        out.push(this.pts[this.pts.length - 1]);
        return out;
    }
    update() {
        this.life--;
        if (this.life % 3 === 0) this.path = this.build(); // tremula como eletricidade
    }
    draw() {
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.globalAlpha = Math.max(0, this.life / this.maxLife);
        ctx.lineJoin = 'round';
        ctx.shadowBlur = 14; ctx.shadowColor = this.c1;
        for (const pass of [{ w: 4, c: this.c1 }, { w: 1.5, c: this.c2 }]) {
            ctx.strokeStyle = pass.c; ctx.lineWidth = pass.w;
            ctx.beginPath();
            this.path.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
            ctx.stroke();
        }
        ctx.restore();
    }
}

/* ---------- Projéteis ---------- */
class Bullet {
    constructor(x, y, vx, vy, isPlayer = true, color = '#00e5ff', isHoming = false) {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.radius = isPlayer ? 3 : 5; this.isPlayer = isPlayer; this.color = color;
        this.isHoming = isHoming;
        this.bounced = false;
        this.dmg = 1;
        this.forceCrit = false; // ex.: projétil refletido no Perfect Dash
        this.bounces = 0;
        const ld = LASER_DEFS[metaData.equippedLaser];
        this.laserId = (isPlayer && ld && ld.color && ld.color === color) ? metaData.equippedLaser : null;
        if (isPlayer) { this.vx *= runMods.bulletSpeed; this.vy *= runMods.bulletSpeed; }
    }

    update() {
        if (this.isHoming) {
            let target = null;
            if (this.isPlayer) {
                let minDist = Infinity;
                enemies.forEach(e => {
                    const d = Math.hypot(e.x - this.x, e.y - this.y);
                    if (d < minDist) { minDist = d; target = e; }
                });
                if (currentBoss) target = currentBoss;
            } else {
                target = player;
            }

            if (target) {
                const angle = Math.atan2(target.y - this.y, target.x - this.x);
                this.vx += Math.cos(angle) * 0.5; this.vy += Math.sin(angle) * 0.5;
                const speed = Math.hypot(this.vx, this.vy);
                const maxSpeed = this.isPlayer ? 10 : 5.5;
                if (speed > maxSpeed) { this.vx = (this.vx / speed) * maxSpeed; this.vy = (this.vy / speed) * maxSpeed; }
            }
        }

        // Perk Roguelite: Ricochete
        if (this.isPlayer && activeRunPerks.ricochet && this.bounces < maxBounces()) {
            if (this.x <= 10 || this.x >= canvas.width - 10) {
                this.vx *= -1;
                this.bounces++;
                this.bounced = true;
                this.x = Math.max(11, Math.min(canvas.width - 11, this.x));
                if (activeRunPerks.infiniteRicochet) this.dmg *= 1.25;
                burst(this.x, this.y, this.color, 2);
            }
        }

        this.x += this.vx; this.y += this.vy;

        if (this.laserId === 'GOLD_FIRE' && Math.random() < 0.4 && sparks.length < 380) {
            sparks.push(new Spark(this.x, this.y, { vx: (Math.random() - 0.5) * 1.6, vy: 0.6 + Math.random(), life: 14, size: 1.6, color: '#ffae00' }));
        }
    }

    draw() {
        if (this.laserId) this.drawLaserFx();
        ctx.save();
        if (this.isPlayer) {
            ctx.globalAlpha = 0.45; ctx.strokeStyle = this.color; ctx.lineWidth = this.radius * 1.4; ctx.lineCap = 'round';
            ctx.beginPath(); ctx.moveTo(this.x - this.vx * 1.6, this.y - this.vy * 1.6); ctx.lineTo(this.x, this.y); ctx.stroke();
            ctx.globalAlpha = 1;
        }
        if (!this.isPlayer && VISUAL_CFG.DANGER_AURA) drawEnemyBulletAura(this);
        ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.shadowBlur = 10; ctx.shadowColor = this.color; ctx.fill();
        if (!this.isPlayer && VISUAL_CFG.DANGER_AURA) { // núcleo branco-quente: leitura imediata de "projétil inimigo"
            ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.85)';
            ctx.beginPath(); ctx.arc(this.x, this.y, this.radius * 0.42, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
}

/* ---------- Inimigos ---------- */
class Enemy {
    constructor(type) {
        this.type = type;
        this.dead = false;
        this.flash = 0;
        this.dir = 1;
        this.phase = Math.random() * Math.PI * 2;
        this.x = type === 'CROSS' ? -30 : Math.random() * (canvas.width - 60) + 30;
        this.y = type === 'CROSS' ? Math.random() * (canvas.height * 0.4) + 50 : -40;

        const diff = difficultySettings[currentDifficulty];
        const mult = (1 + (bossLevel - 1) * 0.12) * diff.enemySpeed * (1 + adaptiveLevel * 0.08);

        if (type === 'FAST') {
            this.width = 30; this.height = 30; this.speed = (Math.random() * 2 + 4.5) * mult;
            this.hp = 1; this.color = '#ff0055';
        } else if (type === 'KAMIKAZE') {
            this.width = 25; this.height = 25; this.speed = 4.8 * mult;
            this.hp = 1; this.color = '#ff007f';
        } else if (type === 'SHIELDED') {
            this.width = 45; this.height = 40; this.speed = 1.6 * mult;
            this.hp = 5 + adaptiveLevel; this.color = '#00ff66';
        } else if (type === 'CROSS') {
            this.width = 35; this.height = 30; this.speed = 3.2 * mult;
            this.hp = 2; this.color = '#aa00ff';
        } else if (type === 'GOLDEN') {
            this.width = 25; this.height = 25; this.speed = 7 * mult;
            this.hp = 2; this.color = '#ffcc00';
            this.x = -30; this.y = Math.random() * (canvas.height * 0.5) + 50;
        } else if (type === 'LOOT') {
            // Loot Drone: raro, veloz (velocidade fixa para sempre ser alcançável) e cheio de créditos
            this.width = 34; this.height = 34; this.speed = 8;
            this.hp = 10; this.color = '#ffd700';
            this.dir = Math.random() < 0.5 ? 1 : -1;
            this.x = this.dir === 1 ? -40 : canvas.width + 40;
            this.baseY = Math.random() * (canvas.height * 0.45) + 70;
            this.y = this.baseY;
        } else {
            this.width = 44; this.height = 40; this.speed = (Math.random() * 1.2 + 2) * mult;
            this.hp = 3; this.color = '#ffaa00';
        }
    }

    update() {
        if (this.flash > 0) this.flash--;

        if (this.type === 'LOOT') {
            this.x += this.dir * this.speed;
            this.y = this.baseY + Math.sin(frameCount * 0.07 + this.phase) * 45;
            if (frameCount % 2 === 0) {
                sparks.push(new Spark(this.x - this.dir * 14, this.y + (Math.random() - 0.5) * 10, {
                    vx: -this.dir * 1.2, vy: (Math.random() - 0.5) * 1.5, life: 16, size: 2, color: '#ffd700'
                }));
            }
            return;
        }

        if (this.type === 'KAMIKAZE' && player) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.x += Math.cos(angle) * this.speed; this.y += Math.sin(angle) * this.speed;
        } else if (this.type === 'CROSS' || this.type === 'GOLDEN') {
            this.x += this.speed;
            if (this.type === 'CROSS' && frameCount % 40 === 0) {
                enemyBullets.push(new Bullet(this.x, this.y, 0, 4, false, '#aa00ff'));
            }
        } else {
            this.y += this.speed;
        }
    }

    isOffscreen() {
        return this.y > canvas.height + 50 || this.x > canvas.width + 60 || this.x < -90;
    }

    draw() {
        ctx.save(); ctx.translate(this.x, this.y);
        const flashing = this.flash > 0;

        if (this.type === 'LOOT') {
            const spin = frameCount * 0.08;
            ctx.shadowBlur = 20; ctx.shadowColor = '#ffd700';
            ctx.strokeStyle = flashing ? '#ffffff' : '#ffd700'; ctx.lineWidth = 2.5;
            ctx.fillStyle = flashing ? '#ffffff' : 'rgba(255,215,0,0.18)';
            ctx.beginPath();
            for (let i = 0; i < 6; i++) {
                const a = Math.PI / 3 * i + Math.PI / 6;
                const px = Math.cos(a) * 16, py = Math.sin(a) * 16;
                if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
            }
            ctx.closePath(); ctx.fill(); ctx.stroke();
            ctx.setLineDash([6, 5]); ctx.lineDashOffset = -spin * 20;
            ctx.beginPath(); ctx.arc(0, 0, 23, 0, Math.PI * 2); ctx.stroke();
            ctx.setLineDash([]);
            ctx.shadowBlur = 0;
            ctx.fillStyle = flashing ? '#ffd700' : '#ffe680';
            ctx.font = '900 16px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
            ctx.fillText('₡', 0, 1);
            ctx.restore();
            return;
        }

        if (VISUAL_CFG.DANGER_AURA) drawEnemyAura(this);
        ctx.shadowBlur = 12; ctx.shadowColor = flashing ? '#ffffff' : this.color;
        ctx.strokeStyle = flashing ? '#ffffff' : this.color; ctx.lineWidth = 2; ctx.fillStyle = '#ffffff';
        if (flashing) ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height); // flash branco absoluto
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }
}

class Obstacle {
    constructor(type) {
        this.type = type;
        this.x = Math.random() * (canvas.width - 60) + 30;
        this.y = -30;
        this.radius = 20;
        this.speed = 2;
        this.hp = 6;
        // v3: aparência (MINE = mina espacial com espinhos | BARRIER = nave-barreira sem piloto)
        this.variant = Math.random() < OBSTACLE_CFG.MINE_CHANCE ? 'MINE' : 'BARRIER';
        this.seed = Math.random() * Math.PI * 2;
        this.spin = Math.random() * Math.PI * 2;
        this.spinSpeed = (Math.random() < 0.5 ? -1 : 1) * (0.012 + Math.random() * 0.012);
        if (this.variant === 'BARRIER') { this.radius = 22; this.hp = 9; this.speed = 1.6; }
    }

    update() { this.y += this.speed; this.spin += this.spinSpeed; }

    draw() {
        if (VISUAL_CFG.SPRITES && this.type === 'ASTEROID') {
            if (this.variant === 'BARRIER') this.drawBarrier(); else this.drawMine();
            return;
        }
        this.drawLegacy();
    }

    // desenho original (círculo laranja), preservado e acessível com VISUAL_CFG.SPRITES = false
    drawLegacy() {
        ctx.save();
        if (this.type === 'ASTEROID') {
            ctx.translate(this.x, this.y); 
            ctx.shadowBlur = 15; 
            ctx.shadowColor = '#ffaa00';
            ctx.strokeStyle = '#ffaa00'; 
            ctx.lineWidth = 2; 
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, Math.PI * 2); 
            ctx.stroke();
        }
        ctx.restore();
    }
}

/* ==========================================================================
SISTEMA DE ESCALONAMENTO DE CHEFES MULTIFÁSICO
========================================================================== */
class Boss {
    constructor(level, isSub = false) {
        this.level = level; this.isSub = isSub;
        this.width = isSub ? 70 : Math.min(150, 90 + level * 6);
        this.height = isSub ? 50 : Math.min(110, 70 + level * 5);
        this.x = canvas.width / 2; this.y = -80; this.targetY = 100;

        const diff = difficultySettings[currentDifficulty];
        this.maxHp = isSub ? Math.floor(60 * diff.bossHp) : Math.floor((120 + level * 85) * diff.bossHp);
        this.maxHp = Math.max(1, Math.floor(this.maxHp * perkBossMult())); // cartas fortes => chefes mais duros
        this.hp = this.maxHp;

        this.baseSpeedX = isSub ? 4 : Math.min(6, (2.5 + level * 0.5) * diff.enemySpeed);
        this.speedX = this.baseSpeedX;

        this.attackRate = isSub ? 25 : Math.max(10, Math.floor((42 - level * 3) * diff.spawnRate));
        this.attackTimer = 0;
        this.phase = 1;
        this.spiralAngle = 0;
        this.flash = 0;          // frames de flash branco
        this.lastTextFrame = 0;  // limita a quantidade de textos de dano
    }

    takeDamage(amount) {
        this.hp -= amount;

        if (this.hp <= 0) {
            this.hp = 0;
            defeatBoss();
            return;
        }

        const hpPercent = this.hp / this.maxHp;

        if (this.phase === 1 && hpPercent <= 0.66) {
            this.phase = 2;
            this.speedX = this.baseSpeedX * 1.4;
            triggerHitstop(8);
            screenShake = 18;
            audio.speak('Boss Phase Two!');
            triggerPowerupNotice('⚠️ CHEFE: FASE 2 - PADRÕES DE ESPIRAL!');
            powerups.push(new PowerUp(this.x, this.y + 40, 'HEAL'));
        } else if (this.phase === 2 && hpPercent <= 0.33) {
            this.phase = 3;
            this.speedX = this.baseSpeedX * 1.8;
            triggerHitstop(12);
            screenShake = 25;
            audio.speak('Warning! Boss Berserk Mode!');
            triggerPowerupNotice('☠️ CHEFE: FASE 3 BERSERK - GAROA DE MÍSSEIS!');
            powerups.push(new PowerUp(this.x, this.y + 40, 'HEAL'));
        }
    }

    update() {
        if (this.flash > 0) this.flash--;
        if (this.y < this.targetY) { this.y += 2; return; }

        if (this.phase === 3) {
            this.x += this.speedX;
            this.y = this.targetY + Math.sin(frameCount * 0.08) * 20;
        } else {
            this.x += this.speedX;
        }

        if (this.x - this.width / 2 < 10 || this.x + this.width / 2 > canvas.width - 10) this.speedX *= -1;

        this.attackTimer++;
        const currentRate = Math.max(6, Math.floor(this.attackRate / (this.phase === 3 ? 1.8 : this.phase === 2 ? 1.3 : 1.0)));

        if (this.attackTimer % currentRate === 0) {
            this.attack();
        }
    }

    attack() {
        audio.playLaser(300);

        if (this.isSub) {
            enemyBullets.push(new Bullet(this.x, this.y + 20, -3, 6, false, '#ffaa00'));
            enemyBullets.push(new Bullet(this.x, this.y + 20, 3, 6, false, '#ffaa00'));
            return;
        }

        if (this.phase === 1) {
            enemyBullets.push(new Bullet(this.x, this.y + 30, 0, 6, false, '#ff0055'));
            enemyBullets.push(new Bullet(this.x - 20, this.y + 20, -2.5, 5.5, false, '#ff0055'));
            enemyBullets.push(new Bullet(this.x + 20, this.y + 20, 2.5, 5.5, false, '#ff0055'));
        }
        else if (this.phase === 2) {
            for (let i = -2; i <= 2; i++) {
                enemyBullets.push(new Bullet(this.x + i * 12, this.y + 30, i * 2, 6, false, '#ffaa00'));
            }
            this.spiralAngle += 0.4;
            const vx = Math.cos(this.spiralAngle) * 4;
            const vy = Math.sin(this.spiralAngle) * 4 + 3;
            enemyBullets.push(new Bullet(this.x, this.y + 20, vx, vy, false, '#ff00ff'));
        }
        else if (this.phase === 3) {
            for (let i = -2; i <= 2; i++) {
                enemyBullets.push(new Bullet(this.x + i * 15, this.y + 30, i * 2.5, 7.5, false, '#ff0000'));
            }
            if (this.attackTimer % (Math.max(6, Math.floor(this.attackRate / 1.8)) * 2) === 0) {
                enemyBullets.push(new Bullet(this.x, this.y + 20, (Math.random() - 0.5) * 4, 3, false, '#aa00ff', true));
            }
        }
    }

    draw() {
        ctx.save(); ctx.translate(this.x, this.y);

        let strokeColor = '#ff0055';
        if (this.isSub) strokeColor = '#ffaa00';
        else if (this.phase === 2) strokeColor = '#ffaa00';
        else if (this.phase === 3) strokeColor = '#aa00ff';

        if (VISUAL_CFG.DANGER_AURA) drawBossAura(this);
        const flashing = this.flash > 0;
        ctx.shadowBlur = this.phase === 3 ? 30 : 20;
        ctx.shadowColor = flashing ? '#ffffff' : strokeColor;
        ctx.strokeStyle = flashing ? '#ffffff' : strokeColor;
        ctx.lineWidth = 3;

        if (flashing) { ctx.fillStyle = '#ffffff'; ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height); }
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);

        if (this.phase === 3) {
            ctx.beginPath(); ctx.arc(0, 0, this.width / 3 + Math.sin(frameCount * 0.2) * 4, 0, Math.PI * 2);
            ctx.strokeStyle = flashing ? '#ffffff' : '#ff0000'; ctx.stroke();
        }

        ctx.restore();
    }
}

/* ==========================================================================
POWERUP CLASS (com atração magnética)
========================================================================== */
class PowerUp {
    constructor(x, y, forceType = null) {
        this.x = x !== undefined ? x : Math.random() * (canvas.width - 60) + 30;
        this.y = y !== undefined ? y : -20;
        this.size = 22;
        this.speed = 2.2;
        this.vx = 0; this.vy = 0;       // impulso (ex.: moedas do Loot Drone)
        this.magnet = false;
        this.trail = [];
        this.phase = Math.random() * Math.PI * 2;

        if (forceType) {
            this.type = forceType;
        } else {
            const rand = Math.random();

            if (currentBoss) {
                if (rand < 0.50) this.type = 'HEAL';
                else if (rand < 0.70) this.type = 'SHIELD';
                else if (rand < 0.85) this.type = 'TRIPLE';
                else this.type = 'HOMING';
            }
            else {
                if (rand < 0.35) this.type = 'TRIPLE';
                else if (rand < 0.55) this.type = 'SHIELD';
                else if (rand < 0.70) this.type = 'HEAL';
                else if (rand < 0.85) this.type = 'HOMING';
                else this.type = 'PENTA';
            }
        }
        if (this.type === 'CREDIT') this.size = 14;
    }

    update() {
        if (player && !player.dying) {
            const dx = player.x - this.x, dy = player.y - this.y;
            const d = Math.hypot(dx, dy) || 1;
            if (!this.magnet && d < magnetRadius()) this.magnet = true;

            if (this.magnet) {
                const nx = dx / d, ny = dy / d;
                const ratio = Math.min(1, d / magnetRadius());
                const pull = 0.7 + (1 - ratio) * 1.6;   // quanto mais perto, mais forte
                const curve = 0.9 * ratio;              // componente lateral => trajetória curva que endireita na chegada
                this.vx += (nx - ny * curve) * pull;
                this.vy += (ny + nx * curve) * pull;
                this.vx *= 0.9; this.vy *= 0.9;
                const sp = Math.hypot(this.vx, this.vy);
                if (sp > 15) { this.vx = (this.vx / sp) * 15; this.vy = (this.vy / sp) * 15; }
                this.x += this.vx; this.y += this.vy;
                this.trail.push({ x: this.x, y: this.y });
                if (this.trail.length > 7) this.trail.shift();
                return;
            }
        }
        this.vx *= 0.94; this.vy *= 0.94;
        this.x += this.vx;
        this.y += this.vy + this.speed;
    }

    isOut() {
        return this.y > canvas.height + 50 || this.x < -60 || this.x > canvas.width + 60;
    }

    draw() {
        let color = '#00e5ff';
        if (this.type === 'TRIPLE') color = '#ffcc00';
        else if (this.type === 'PENTA') color = '#ff00ff';
        else if (this.type === 'HEAL') color = '#00ff66';
        else if (this.type === 'HOMING') color = VISUAL_CFG.SPRITES ? '#ffe14a' : '#ff3300';
        else if (this.type === 'CRYSTAL') color = '#00ffcc';
        else if (this.type === 'ULT_CHARGE') color = '#aa00ff';
        else if (this.type === 'CREDIT') color = '#ffd700';

        // rastro luminoso enquanto é atraído
        if (this.trail.length > 1) {
            ctx.save();
            ctx.globalCompositeOperation = 'lighter';
            ctx.strokeStyle = color; ctx.lineCap = 'round';
            for (let i = 1; i < this.trail.length; i++) {
                ctx.globalAlpha = (i / this.trail.length) * 0.5;
                ctx.lineWidth = 1 + (i / this.trail.length) * 3;
                ctx.beginPath(); ctx.moveTo(this.trail[i - 1].x, this.trail[i - 1].y); ctx.lineTo(this.trail[i].x, this.trail[i].y); ctx.stroke();
            }
            ctx.restore();
        }

        ctx.save(); ctx.translate(this.x, this.y);
        ctx.shadowBlur = this.magnet ? 24 : 15; ctx.shadowColor = color; ctx.strokeStyle = color; ctx.lineWidth = 2;

        if (this.type === 'CREDIT') {
            const squash = Math.abs(Math.cos(frameCount * 0.12 + this.phase)); // moeda girando
            ctx.scale(0.25 + squash * 0.75, 1);
            ctx.fillStyle = '#a87400';                                   // espessura da moeda (borda)
            ctx.beginPath(); ctx.arc(2.2, 0, 8, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = '#ffd700';
            ctx.beginPath(); ctx.arc(0, 0, 8, 0, Math.PI * 2); ctx.fill();
            ctx.strokeStyle = '#fff3b0'; ctx.stroke();
            if (squash > 0.55) {                                         // símbolo em relevo na face
                ctx.shadowBlur = 0; ctx.fillStyle = '#8a5a00';
                ctx.font = '900 9px Segoe UI, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
                ctx.fillText('₡', 0, 0.5);
            }
        } else if (this.type === 'CRYSTAL') {
            ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(8, 0); ctx.lineTo(0, 10); ctx.lineTo(-8, 0); ctx.closePath();
            ctx.fillStyle = color; ctx.fill();
        } else if (VISUAL_CFG.SPRITES) {
            drawPowerUpSprite(this, color);
        } else {
            ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);
            if (this.type === 'HEAL') {
                ctx.fillStyle = '#00ff66';
                ctx.fillRect(-2, -6, 4, 12);
                ctx.fillRect(-6, -2, 12, 4);
            }
        }
        ctx.restore();
    }
}

class Particle {
    constructor(x, y, color) {
        this.x = x; this.y = y; this.color = color;
        const angle = Math.random() * Math.PI * 2, speed = Math.random() * 5 + 1;
        this.vx = Math.cos(angle) * speed; this.vy = Math.sin(angle) * speed;
        this.alpha = 1; this.decay = Math.random() * 0.03 + 0.015;
    }
    update() { this.x += this.vx; this.y += this.vy; this.alpha -= this.decay; }
    draw() {
        ctx.save(); ctx.globalAlpha = Math.max(0, this.alpha); ctx.beginPath();
        ctx.arc(this.x, this.y, 2, 0, Math.PI * 2); ctx.fillStyle = this.color; ctx.fill(); ctx.restore();
    }
}

let stars = [], obstacles = [];
function initStars() {
    stars = Array.from({ length: 80 }, () => ({
        x: Math.random() * (canvas ? canvas.width : 600),
        y: Math.random() * (canvas ? canvas.height : 900),
        size: Math.random() * 2 + 0.5, speed: Math.random() * 3 + 0.5
    }));
}

function updateStars() {
    stars.forEach(s => { s.y += s.speed; if (s.y > canvas.height) { s.y = 0; s.x = Math.random() * canvas.width; } });
}

function drawStars() {
    const theme = neonThemes[(bossLevel - 1) % neonThemes.length];
    ctx.fillStyle = theme.bg;
    stars.forEach(s => { ctx.globalAlpha = s.speed / 4; ctx.fillRect(s.x, s.y, s.size, s.size * 2); });
    ctx.globalAlpha = 1;
}


/* ==========================================================================
7. EXPANSÃO v2: RARIDADES + ROLETA, MODS DE RUN, JACKPOT, METAS, LASERS/DRONES,
   BULLET-TIME, MODO PHANTOM E GAME OVER DETALHADO
========================================================================== */

/* ---------- Estado extra da partida ---------- */
let runMods = freshRunMods();      // modificadores numéricos da run (cartas)
let runPerkLog = [];               // raridades das cartas escolhidas (escala os chefes)
let runStats = freshRunStats();    // estatísticas da corrida (Game Over e metas)
let runFrames = 0;
let jackpotCoins = [];
let camZoom = 1;
let bulletTimeOn = false, bulletTimeCd = 0;
let coinChain = 0, lastCoinT = 0;
let phantomMode = false;
let ghostData = null, ghostRec = [], ghostPos = null, ghostDone = false, ghostBeaten = false;
let runStartBest = 0;
let questToastQueue = [], questToastBusy = false;
let rouletteTimers = [];

function freshRunPerks() {
    return {
        ricochet: false, vampirism: false, overcharge: false, laserChain: false, impactNova: false, glassCannon: false,
        doubleRicochet: false, infiniteRicochet: false, chainOverdrive: false, omegaChain: false,
        fastShield: false, retaliation: false, retaliationSwarm: false, survivalDrones: false,
        novaSurge: false, bloodPact: false, gambleContract: false, goldenAge: false, phoenixCore: false,
        lensFocus: false, phoenixUsed: false
    };
}

function freshRunMods() {
    return { dmg: 1, fireRate: 1, bulletSpeed: 1, range: 1, dmgTaken: 1, credit: 1, novaMult: 1, novaDmg: 1 };
}

function freshRunStats() {
    return {
        grazes: 0, damage: 0, perfectDashes: 0, criticalDashes: 0, closeCalls: 0, kills: 0, lootKills: 0,
        bosses: 0, bossNoUlt: 0, ultUsed: 0, overloads: 0, maxStreak: 0, jackpot: 0,
        ms: 0, credits: 0, beatGhost: false, questsDone: []
    };
}

/* ---------- Helpers que dependem dos mods da run ---------- */
function chainRange() { return FX_CFG.CHAIN_RANGE * runMods.range * (activeRunPerks.chainOverdrive ? 1.25 : 1) * (activeRunPerks.omegaChain ? 1.3 : 1); }
function chainTargets() { return activeRunPerks.omegaChain ? 6 : activeRunPerks.chainOverdrive ? 4 : 2; }
function chainRatio() { return activeRunPerks.omegaChain ? 1.0 : activeRunPerks.chainOverdrive ? 0.7 : FX_CFG.CHAIN_DMG_RATIO; }
function magnetRadius() { return FX_CFG.MAGNET_RADIUS * runMods.range; }
function maxBounces() {
    if (!activeRunPerks.ricochet) return 0;
    if (activeRunPerks.infiniteRicochet) return 7;
    if (activeRunPerks.doubleRicochet) return 2;
    return 1;
}

// Cartas poderosas deixam os chefes mais duros (o jogador precisa continuar aprendendo os padrões)
function perkBossMult() {
    const w = { COMUM: 0, RARA: 0.04, EPICA: 0.09, LENDARIA: 0.18 };
    let add = 0;
    runPerkLog.forEach(r => { add += w[r] || 0; });
    return 1 + Math.min(0.9, add);
}

/* ==========================================================================
RARIDADES, NOVAS CARTAS E SINERGIAS
========================================================================== */
const CARD_RARITY_INFO = {
    COMUM: { label: 'COMUM', color: '#9fb4c8' },
    RARA: { label: 'RARA', color: '#3aa0ff' },
    EPICA: { label: 'ÉPICA', color: '#b44dff' },
    LENDARIA: { label: 'LENDÁRIA', color: '#ffcc00' }
};
const CARD_RARITY_ORDER = ['LENDARIA', 'EPICA', 'RARA', 'COMUM'];

const PERK_LABEL = {
    ricochet: 'Laser Ricochete', laserChain: 'Laser Chain', impactNova: 'Impact Nova', doubleRicochet: 'Ricochete Duplo',
    chainOverdrive: 'Laser Chain: Alta Frequência', fastShield: 'Escudo de Recarga Rápida', survivalDrones: 'Drones de Sobrevivência',
    retaliation: 'Mísseis de Retaliação', gambleContract: 'Contrato do Cassino'
};

// Raridade das cartas que já existiam
const CARD_RARITY = {
    shield_matrix: 'COMUM', ult_recharge: 'COMUM', overcharge: 'COMUM',
    ricochet: 'RARA', vampirism: 'RARA', laser_chain: 'RARA',
    impact_nova: 'EPICA', glass_cannon: 'EPICA'
};
availablePerkCards.forEach(c => { c.rarity = CARD_RARITY[c.id] || 'COMUM'; });
availablePerkCards.find(c => c.id === 'glass_cannon').excl = ['bloodPact'];

availablePerkCards.push(
    /* ----- COMUNS: melhorias modestas ----- */
    { id: 'repair_kit', rarity: 'COMUM', title: '🔧 NANO-REPARO', desc: 'Recupera 35% da vida máxima.' },
    { id: 'quick_trigger', rarity: 'COMUM', title: '🔫 GATILHO RÁPIDO', desc: '+15% de cadência de tiro (acumula até +50%).', can: () => runMods.fireRate < 1.5 },
    { id: 'credit_chip', rarity: 'COMUM', title: '💾 CHIP DE CRÉDITO', desc: 'Recebe ₡80 imediatamente.' },

    /* ----- RARAS: efeitos secundários e dilemas leves ----- */
    { id: 'fast_shield', key: 'fastShield', rarity: 'RARA', title: '🔰 ESCUDO DE RECARGA RÁPIDA', desc: 'Ganha um escudo agora. Depois de quebrado, ele se recarrega sozinho em 8s.' },
    { id: 'retaliation', key: 'retaliation', rarity: 'RARA', title: '🚀 MÍSSEIS DE RETALIAÇÃO', desc: 'Ao ser atingido, dispara 4 mísseis teleguiados.' },
    { id: 'survival_drones', key: 'survivalDrones', rarity: 'RARA', title: '🛰️ DRONES DE SOBREVIVÊNCIA', desc: '2 drones orbitais bloqueiam projéteis (3 cada, recarregam em 8s).' },
    { id: 'lens_focus', key: 'lensFocus', rarity: 'RARA', risk: true, title: '🎯 LENTE CONCENTRADA', desc: 'DILEMA: +35% velocidade dos tiros e +25% cadência, mas -40% de alcance (ímã, Nova e Chain).' },
    { id: 'gamble_contract', key: 'gambleContract', rarity: 'RARA', risk: true, title: '🎰 CONTRATO DO CASSINO', desc: 'DILEMA: +₡150 agora e créditos x2 até o fim da partida, mas você recebe +50% de dano.' },

    /* ----- ÉPICAS: sinergias fortes ----- */
    { id: 'blood_pact', key: 'bloodPact', rarity: 'EPICA', risk: true, excl: ['glassCannon'], title: '🩸 PACTO DE SANGUE', desc: 'DILEMA: perde 30% da vida máxima, mas causa +60% de dano.' },
    { id: 'double_ricochet', key: 'doubleRicochet', rarity: 'EPICA', req: ['ricochet'], title: '🔀 RICOCHETE DUPLO', desc: 'SINERGIA: seus tiros rebatem até 2 vezes nas paredes.' },
    { id: 'chain_overdrive', key: 'chainOverdrive', rarity: 'EPICA', req: ['laserChain'], title: '⚡ LASER CHAIN: ALTA FREQUÊNCIA', desc: 'SINERGIA: arcos atingem até 4 alvos com 70% de dano e um arco automático dispara a cada 0,4s.' },
    { id: 'nova_surge', key: 'novaSurge', rarity: 'EPICA', req: ['impactNova'], title: '🌌 NOVA SURTO', desc: 'SINERGIA: Nova +40% de raio e dano x2, e também dispara ao iniciar qualquer Dash (recarga 3s).' },
    { id: 'retaliation_swarm', key: 'retaliationSwarm', rarity: 'EPICA', req: ['retaliation'], title: '🐝 ENXAME DE RETALIAÇÃO', desc: 'SINERGIA: ao ser atingido, dispara 8 mísseis com +50% de dano.' },

    /* ----- LENDÁRIAS: exigem uma cadeia de cartas anteriores ----- */
    { id: 'omega_chain', key: 'omegaChain', rarity: 'LENDARIA', req: ['chainOverdrive'], title: '☄️ CADEIA ÔMEGA', desc: 'Os arcos saltam por até 6 alvos com 100% de dano e alcance ampliado.' },
    { id: 'infinity_ricochet', key: 'infiniteRicochet', rarity: 'LENDARIA', req: ['doubleRicochet'], title: '♾️ RICOCHETE INFINITO', desc: 'Os tiros rebatem até 7 vezes e ganham +25% de dano a cada rebote.' },
    { id: 'golden_age', key: 'goldenAge', rarity: 'LENDARIA', req: ['gambleContract'], title: '👑 ERA DOURADA', desc: 'Créditos x1.5 extra e todo inimigo destruído solta moedas.' },
    { id: 'phoenix_core', key: 'phoenixCore', rarity: 'LENDARIA', req: ['fastShield', 'survivalDrones'], title: '🔥 NÚCLEO FÊNIX', desc: 'Ao morrer, renasce uma vez com 60% de vida, escudo e uma Nova devastadora.' }
);

function cardEligible(c) {
    if (c.key && activeRunPerks[c.key]) return false;
    if (c.req && !c.req.every(k => activeRunPerks[k])) return false;
    if (c.excl && c.excl.some(k => activeRunPerks[k])) return false;
    if (c.can && !c.can()) return false;
    return true;
}

// 65% comum | 25% rara | 8% épica | 2% lendária
function rollRarity() {
    const r = Math.random() * 100;
    if (r < 2) return 'LENDARIA';
    if (r < 10) return 'EPICA';
    if (r < 35) return 'RARA';
    return 'COMUM';
}

function pickCardsForRoulette(n = 3) {
    const taken = new Set();
    const result = [];
    for (let slot = 0; slot < n; slot++) {
        const rolled = rollRarity();
        const start = CARD_RARITY_ORDER.indexOf(rolled);
        const poolOf = (r) => availablePerkCards.filter(c => c.rarity === r && cardEligible(c) && !taken.has(c.id));
        let candidates = [];
        // se a raridade sorteada estiver vazia (ex.: lendária sem sinergia), desce; se tudo falhar, sobe
        for (let k = start; k < CARD_RARITY_ORDER.length && !candidates.length; k++) candidates = poolOf(CARD_RARITY_ORDER[k]);
        for (let k = start - 1; k >= 0 && !candidates.length; k--) candidates = poolOf(CARD_RARITY_ORDER[k]);
        if (!candidates.length) break;
        const pick = candidates[Math.floor(Math.random() * candidates.length)];
        taken.add(pick.id);
        result.push(pick);
    }
    return result;
}

function applyExtendedPerk(id) {
    const card = availablePerkCards.find(c => c.id === id);
    if (card) runPerkLog.push(card.rarity || 'COMUM');
    const p = player;
    switch (id) {
        case 'repair_kit': if (p) p.health = Math.min(p.maxHealth, p.health + p.maxHealth * 0.35); break;
        case 'quick_trigger': runMods.fireRate *= 1.15; break;
        case 'credit_chip': addCredits(80); break;
        case 'fast_shield': activeRunPerks.fastShield = true; if (p) p.powerup = 'SHIELD'; break;
        case 'retaliation': activeRunPerks.retaliation = true; break;
        case 'survival_drones': activeRunPerks.survivalDrones = true; if (p) p.guards = [{ hp: 3, cd: 0 }, { hp: 3, cd: 0 }]; break;
        case 'lens_focus': activeRunPerks.lensFocus = true; runMods.bulletSpeed *= 1.35; runMods.fireRate *= 1.25; runMods.range *= 0.6; break;
        case 'gamble_contract': activeRunPerks.gambleContract = true; runMods.credit *= 2; runMods.dmgTaken *= 1.5; addCredits(150); break;
        case 'blood_pact':
            activeRunPerks.bloodPact = true; runMods.dmg *= 1.6;
            if (p) { p.maxHealth = Math.max(1, Math.round(p.maxHealth * 0.7)); p.health = Math.min(p.health, p.maxHealth); }
            break;
        case 'double_ricochet': activeRunPerks.doubleRicochet = true; break;
        case 'chain_overdrive': activeRunPerks.chainOverdrive = true; break;
        case 'nova_surge': activeRunPerks.novaSurge = true; runMods.novaMult *= 1.4; runMods.novaDmg *= 2; break;
        case 'retaliation_swarm': activeRunPerks.retaliationSwarm = true; break;
        case 'omega_chain': activeRunPerks.omegaChain = true; break;
        case 'infinity_ricochet': activeRunPerks.infiniteRicochet = true; break;
        case 'golden_age': activeRunPerks.goldenAge = true; runMods.credit *= 1.5; break;
        case 'phoenix_core': activeRunPerks.phoenixCore = true; break;
    }
}

/* ---------- Tela de cartas com ROLETA ---------- */
function clearRouletteTimers() {
    rouletteTimers.forEach(t => clearTimeout(t));
    rouletteTimers = [];
}

function cardHtml(c) {
    const info = CARD_RARITY_INFO[c.rarity] || CARD_RARITY_INFO.COMUM;
    const syn = c.req ? `<small class="synergy">⚡ SINERGIA: ${c.req.map(k => PERK_LABEL[k] || k).join(' + ')}</small>` : '';
    return `
        <div class="reel-card rarity-${c.rarity}${c.risk ? ' risky' : ''}" onclick="applyPerkCard('${c.id}')">
            <div class="rarity-tag" style="color:${info.color}">${info.label}</div>
            <strong>${c.title}</strong>
            <span class="card-desc">${c.desc}</span>
            ${syn}
            <button class="btn-shop">ESCOLHER</button>
        </div>`;
}

let cardWait = 0;
function showCardSelectionScreen() {
    if (!gameActive || (player && player.dying)) return;

    // Espera as moedas do jackpot chegarem na nave antes de abrir a roleta (no máx. ~4s)
    if (jackpotCoins.length > 4 && cardWait < 16) {
        cardWait++;
        rouletteTimers.push(setTimeout(showCardSelectionScreen, 250));
        return;
    }
    cardWait = 0;

    isPaused = true;
    clearRouletteTimers();

    const picks = pickCardsForRoulette(3);
    if (!picks.length) { // nada a oferecer: segue o jogo
        isPaused = false; startBonusStage(); scheduleLoop(); return;
    }

    let modal = document.getElementById('cardSelectionModal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'cardSelectionModal';
        modal.className = 'overlay-screen';
        modal.style.zIndex = '30';
        document.getElementById('game-wrapper').appendChild(modal);
    }

    modal.innerHTML = `
        <h2 class="title-secondary" style="color: #00ffcc;">CHEFÃO DERROTADO!</h2>
        <p class="subtitle" id="rouletteSubtitle">🎰 GIRANDO A ROLETA DE SISTEMAS...</p>
        <div class="roulette-row" id="rouletteRow">
            ${picks.map((c, i) => `<div class="roulette-reel" id="reel${i}"><div class="reel-face spinning" id="reelFace${i}">?</div></div>`).join('')}
        </div>
        <p class="roulette-hint" id="rouletteHint">toque para pular a animação</p>
    `;
    modal.classList.remove('legendary-flash');
    modal.classList.remove('hidden');

    const stops = [1100, 1650, 2200];
    const stopped = picks.map(() => false);
    let finished = false;
    const t0 = performance.now();

    const faceOf = (i) => document.getElementById('reelFace' + i);
    const rowEl = () => document.getElementById('rouletteRow');

    const spin = (i) => {
        if (stopped[i]) return;
        const rnd = availablePerkCards[Math.floor(Math.random() * availablePerkCards.length)];
        const info = CARD_RARITY_INFO[rnd.rarity] || CARD_RARITY_INFO.COMUM;
        const f = faceOf(i);
        if (f) { f.innerHTML = `<span style="color:${info.color}">${rnd.title}</span>`; f.className = 'reel-face spinning'; }
        audio.playRouletteTick(520 + Math.random() * 500);
        const elapsed = performance.now() - t0;
        const interval = 55 + Math.min(1, elapsed / stops[i]) * 150; // desacelera até parar
        rouletteTimers.push(setTimeout(() => spin(i), interval));
    };

    const finish = () => {
        if (finished) return;
        finished = true;
        modal.onclick = null;
        const row = rowEl(); if (row) row.classList.add('ready');
        const sub = document.getElementById('rouletteSubtitle'); if (sub) sub.innerText = 'ESCOLHA UMA MELHORIA DE SISTEMA:';
        const hint = document.getElementById('rouletteHint'); if (hint) hint.style.display = 'none';
    };

    const reveal = (i, quiet) => {
        stopped[i] = true;
        const c = picks[i];
        const reel = document.getElementById('reel' + i);
        if (reel) reel.innerHTML = cardHtml(c);
        if (!quiet) {
            audio.playRouletteStop(i);
            if (c.rarity === 'RARA' || c.rarity === 'EPICA') audio.playRareReveal(c.rarity);
        }
        if (c.rarity === 'LENDARIA') {
            audio.playLegendary();
            modal.classList.add('legendary-flash');
            rouletteTimers.push(setTimeout(() => modal.classList.remove('legendary-flash'), 1200));
        }
    };

    picks.forEach((c, i) => {
        spin(i);
        rouletteTimers.push(setTimeout(() => {
            if (stopped[i]) return;
            reveal(i, false);
            if (stopped.every(Boolean)) rouletteTimers.push(setTimeout(finish, 350));
        }, stops[i]));
    });

    // Clique/toque pula a animação
    modal.onclick = () => {
        if (finished) return;
        clearRouletteTimers();
        picks.forEach((c, i) => { if (!stopped[i]) reveal(i, true); });
        const top = picks.reduce((a, c) => (CARD_RARITY_ORDER.indexOf(c.rarity) < CARD_RARITY_ORDER.indexOf(a) ? c.rarity : a), 'COMUM');
        audio.playRouletteStop(2);
        if (top === 'RARA' || top === 'EPICA') audio.playRareReveal(top);
        finish();
    };
}

/* ==========================================================================
JACKPOT: EXPLOSÃO DE MOEDAS FÍSICAS
========================================================================== */
class JackpotCoin {
    constructor(x, y, value) {
        const a = -Math.PI / 2 + (Math.random() - 0.5) * Math.PI * 1.3;
        const sp = 5 + Math.random() * 9;
        this.x = x; this.y = y;
        this.vx = Math.cos(a) * sp; this.vy = Math.sin(a) * sp;
        this.value = value;
        this.t = 0;
        this.scatter = 40 + Math.random() * 50;   // frames "quicando" antes de voar até a nave
        this.phase = Math.random() * Math.PI * 2;
        this.seek = false;
        this.dead = false;
    }

    update() {
        this.t++;
        if (!this.seek && this.t > this.scatter && player && !player.dying) this.seek = true;

        if (this.seek && player && !player.dying) {
            const dx = player.x - this.x, dy = player.y - this.y;
            const d = Math.hypot(dx, dy) || 1;
            const nx = dx / d, ny = dy / d;
            const curve = Math.min(1, d / 260) * 0.8; // trajetória curva que endireita na chegada
            this.vx += (nx - ny * curve) * 1.3;
            this.vy += (ny + nx * curve) * 1.3;
            this.vx *= 0.9; this.vy *= 0.9;
            this.x += this.vx; this.y += this.vy;
            if (d < 24) this.collect();
        } else {
            // física: gravidade, quique no chão e nas paredes
            this.vy += 0.38;
            this.vx *= 0.995;
            this.x += this.vx; this.y += this.vy;
            const floor = canvas.height - 8;
            if (this.y > floor) {
                this.y = floor;
                this.vy *= -0.55; this.vx *= 0.8;
                if (Math.abs(this.vy) < 1) this.vy = 0;
            }
            if (this.x < 6) { this.x = 6; this.vx *= -0.7; }
            if (this.x > canvas.width - 6) { this.x = canvas.width - 6; this.vx *= -0.7; }
        }
        if (this.t > 900) this.dead = true; // segurança (ex.: nave destruída)
    }

    collect() {
        this.dead = true;
        const v = addCredits(this.value);
        runStats.jackpot += v;
        const now = performance.now();
        if (now - lastCoinT > 350) coinChain = 0;
        lastCoinT = now; coinChain++;
        audio.playCoinStack(coinChain);
        if (coinChain % 8 === 0) spawnText(player.x, player.y - 40, `+₡${runStats.jackpot}`, '#ffd700', 14, { life: 35 });
        if (coinChain % 3 === 0) burst(player.x, player.y, '#ffd700', 1);
    }

    draw() {
        const squash = Math.abs(Math.cos(this.t * 0.25 + this.phase)); // moeda girando
        ctx.save();
        ctx.translate(this.x, this.y);
        ctx.scale(0.3 + squash * 0.7, 1);
        ctx.shadowBlur = 7; ctx.shadowColor = '#ffcc00';
        ctx.fillStyle = '#ffd700';
        ctx.beginPath(); ctx.arc(0, 0, 5.5, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff6c0';
        ctx.beginPath(); ctx.arc(-1.5, -1.5, 1.8, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
    }
}

function jackpotExplosion(x, y, count = 40, value = 2) {
    audio.playJackpot();
    for (let i = 0; i < count; i++) {
        if (jackpotCoins.length > 220) break;
        jackpotCoins.push(new JackpotCoin(x, y, value));
    }
    for (let i = 0; i < 14; i++) {
        const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 8;
        sparks.push(new Spark(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 28, size: 2.5, color: '#ffd700' }));
    }
    screenShake = Math.max(screenShake, 16);
}

/* ==========================================================================
EFEITOS DE CARTAS (RETALIAÇÃO, GUARDIÕES, FÊNIX) E ESTATÍSTICAS
========================================================================== */
function fireRetaliation() {
    if (!player) return;
    const swarm = activeRunPerks.retaliationSwarm;
    const n = swarm ? 8 : 4;
    for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n - Math.PI / 2;
        const b = new Bullet(player.x, player.y, Math.cos(a) * 5, Math.sin(a) * 5, true, '#ff6a00', true);
        b.dmg = swarm ? 1.5 : 1;
        bullets.push(b);
    }
    spawnText(player.x, player.y - 55, 'RETALIAÇÃO!', '#ff6a00', 18, { life: 55 });
    audio.playZap();
}

function onPlayerHitV2() {
    if (activeRunPerks.retaliation) fireRetaliation();
}

function guardAbsorb(eb) {
    if (!player || !activeRunPerks.survivalDrones) return false;
    for (let i = 0; i < player.guards.length; i++) {
        const g = player.guards[i];
        if (g.hp <= 0) continue;
        const p = player.guardPos(i);
        if (Math.hypot(eb.x - p.x, eb.y - p.y) < 14 + eb.radius) {
            g.hp--;
            if (g.hp <= 0) g.cd = 480;
            burst(eb.x, eb.y, '#00e5ff', 4);
            audio.playHit();
            return true;
        }
    }
    return false;
}

function phoenixRevive() {
    activeRunPerks.phoenixUsed = true;
    player.health = Math.round(player.maxHealth * 0.6);
    player.invuln = 180;
    player.powerup = 'SHIELD';
    enemyBullets = [];
    spawnNova();
    flashAlpha = 1; screenShake = 30;
    spawnText(player.x, player.y - 60, 'NÚCLEO FÊNIX!', '#ff9d00', 26, { life: 90 });
    showComboCall('FÊNIX RENASCEU!', '#ff9d00', 5);
    audio.playLegendary();
    audio.announce('Phoenix rising', 5);
}

function autoArc() {
    if (!player || player.dying || overloadActive) return;
    let t = null, bd = 330;
    enemies.forEach(e => { const d = Math.hypot(e.x - player.x, e.y - player.y); if (d < bd) { bd = d; t = e; } });
    if (!t && currentBoss && currentBoss.hp > 0) t = currentBoss;
    if (!t) return;
    lightnings.push(new Lightning([{ x: player.x, y: player.y - 20 }, { x: t.x, y: t.y }]));
    audio.playZap();
    const dmg = playerDmgMult();
    if (t === currentBoss) damageBoss(dmg, { crit: false, flash: true, silent: true });
    else damageEnemy(t, dmg, { crit: false, flash: true, silent: true });
    chainLightning(t.x, t.y, t, dmg);
}

function onKillV2(e) {
    if (e.type === 'LOOT') runStats.lootKills++;
    if (activeRunPerks.goldenAge) dropLootCoins(e, 2);
    evaluateQuests();
}

function onBossDefeated(b) {
    runStats.bosses++;
    if (runStats.ultUsed === 0) runStats.bossNoUlt++;
    if (b) jackpotExplosion(b.x, b.y, 60, 2);
    evaluateQuests();
}

/* ---------- Graze sensorial, Perfect Dash crítico e Bullet-Time ---------- */
function isLethal() {
    return 20 * difficultySettings[currentDifficulty].damageMult * runMods.dmgTaken >= player.health;
}

function onGraze(eb, dist) {
    runStats.grazes++;
    lightnings.push(new Lightning([{ x: eb.x, y: eb.y }, { x: player.x, y: player.y }], { life: 7, c1: '#bff6ff', c2: '#ffffff' }));
    for (let i = 0; i < 4; i++) {
        const a = Math.atan2(player.y - eb.y, player.x - eb.x) + (Math.random() - 0.5) * 1.2;
        sparks.push(new Spark(eb.x, eb.y, { vx: Math.cos(a) * 4, vy: Math.sin(a) * 4, life: 12, size: 2, color: '#bff6ff' }));
    }
    audio.playGrazeZt();
    evaluateQuests();
}

function onCloseCall(eb, dist) {
    if (!player || player.dying || !isLethal()) return;
    runStats.closeCalls++;
    triggerBulletTime(40, 3, 'CLOSE CALL!');
}

function onPerfectDash(eb, dist) {
    runStats.perfectDashes++;
    const hpLow = player.health / player.maxHealth <= 0.35;
    const close = dist < player.width / 2 + eb.radius + 4;
    if (isLethal() || hpLow || close) {
        runStats.criticalDashes++;
        triggerBulletTime(55, 3.5, 'PERFECT CRÍTICO!');
    }
    evaluateQuests();
}

function triggerBulletTime(frames = 50, factor = 3.5, label = '') {
    if (bulletTimeOn || bulletTimeCd > 0 || !player || player.dying || slowMotionDuration > 0) return;
    bulletTimeOn = true;
    bulletTimeCd = 300;
    triggerSlowMotion(frames, factor);
    audio.setMuffle(true);
    audio.playBulletTime();
    if (wrapper) wrapper.classList.add('bullet-time');
    camZoom = Math.max(camZoom, 1.07);
    if (label) spawnText(player.x, player.y - 78, label, '#9fe8ff', 22, { life: 75 });
}

function endBulletTime(silent = false) {
    if (!bulletTimeOn && silent === false) return;
    bulletTimeOn = false;
    audio.setMuffle(false);
    if (wrapper) wrapper.classList.remove('bullet-time');
}

// Impacto visual dos combos: zoom, trepidação suave e brilho
function comboImpact(tier) {
    camZoom = Math.max(camZoom, Math.min(1.14, 1 + tier * 0.02));
    screenShake = Math.max(screenShake, 2 + tier * 1.5);
    if (tier >= 5) flashAlpha = Math.max(flashAlpha, 0.22);
}

/* ==========================================================================
METAS / MICRO-QUESTS ENCADEADAS
========================================================================== */
const QUEST_DIFF_MULT = { EASY: 1, MEDIUM: 1.5, HARD: 2, EXTREME: 3, IMPOSSIBLE: 4.5, UNPLAYABLE: 7 };
const DIFF_RANK = { EASY: 0, MEDIUM: 1, HARD: 2, EXTREME: 3, IMPOSSIBLE: 4, UNPLAYABLE: 5 };

const QUEST_CHAINS = [
    { id: 'piloto', name: 'TRILHA DO PILOTO', quests: [
        { id: 'p1', title: 'Primeiros Abates', desc: 'Destrua 25 inimigos em uma partida', base: 30, test: s => s.kills >= 25 },
        { id: 'p2', title: 'Dançarino de Balas', desc: 'Faça 15 Grazes em uma partida', base: 50, test: s => s.grazes >= 15 },
        { id: 'p3', title: 'Dash Perfeito', desc: 'Realize 5 Perfect Dashes em uma partida', base: 80, test: s => s.perfectDashes >= 5 },
        { id: 'p4', title: 'Mestre do Dash', desc: 'Realize 10 Perfect Dashes em uma partida', base: 150, test: s => s.perfectDashes >= 10 }
    ] },
    { id: 'cacador', name: 'CAÇADOR DE CHEFES', quests: [
        { id: 'c1', title: 'Primeiro Sangue', desc: 'Derrote um Chefe', base: 100, test: s => s.bosses >= 1 },
        { id: 'c2', title: 'Sem Ultimate', desc: 'Derrote o Chefe sem usar a Ultimate', base: 200, test: s => s.bossNoUlt >= 1 },
        { id: 'c3', title: 'Trio Letal', desc: 'Derrote 3 Chefes em uma partida', base: 400, test: s => s.bosses >= 3 }
    ] },
    { id: 'resistencia', name: 'RESISTÊNCIA', quests: [
        { id: 'r1', title: 'Fôlego', desc: 'Sobreviva por 90 segundos', base: 60, test: s => s.ms >= 90000 },
        { id: 'r2', title: 'Maratona Extrema', desc: 'Sobreviva por 2 minutos no modo Extremo (ou acima)', base: 250, test: s => s.ms >= 120000 && DIFF_RANK[currentDifficulty] >= 3 },
        { id: 'r3', title: 'Imortal', desc: 'Sobreviva por 5 minutos', base: 500, test: s => s.ms >= 300000 }
    ] },
    { id: 'overload', name: 'ASCENSÃO NEON', quests: [
        { id: 'o1', title: 'Sobrecarga', desc: 'Ative o Cyber Overload 1 vez', base: 80, test: s => s.overloads >= 1 },
        { id: 'o2', title: 'Febre Dourada', desc: 'Ative o Overload 3 vezes em uma partida (desbloqueia o Laser Fogo Dourado)', base: 250, unlockLaser: 'GOLD_FIRE', test: s => s.overloads >= 3 },
        { id: 'o3', title: 'Imparável', desc: 'Alcance uma sequência de 15 abates', base: 300, test: s => s.maxStreak >= 15 }
    ] },
    { id: 'cassino', name: 'CASSINO CIBERNÉTICO', quests: [
        { id: 'k1', title: 'Caçador de Tesouros', desc: 'Destrua um Loot Drone', base: 120, test: s => s.lootKills >= 1 },
        { id: 'k2', title: 'Mão Cheia', desc: 'Junte ₡300 em créditos em uma única partida', base: 150, test: s => s.credits >= 300 }
    ] },
    { id: 'phantom', name: 'CAÇA AO FANTASMA', quests: [
        { id: 'f1', title: 'Superando a Si Mesmo', desc: 'Supere seu Fantasma no Modo Phantom', base: 300, test: s => s.beatGhost }
    ] }
];

function questMult() { return QUEST_DIFF_MULT[currentDifficulty] || 1; }
function questDone(id) { return !!(metaData.quests && metaData.quests[id]); }
function activeQuest(chain) { return chain.quests.find(q => !questDone(q.id)) || null; }

function evaluateQuests() {
    if (!gameActive) return;
    runStats.credits = earnedCredits;
    QUEST_CHAINS.forEach(chain => {
        let q, guard = 0;
        while ((q = activeQuest(chain)) && guard++ < 6 && q.test(runStats)) completeQuest(q);
    });
}

function completeQuest(q) {
    metaData.quests[q.id] = true;
    const reward = Math.round(q.base * questMult());
    metaData.credits += reward; // pago na hora (não se perde se a run for abandonada)
    runStats.questsDone.push(q.title);
    if (q.unlockLaser) metaData.lasers[q.unlockLaser] = true;
    saveMetaData();
    showQuestToast(`🎯 META CUMPRIDA: ${q.title}`, `+₡${reward}${q.unlockLaser ? '  •  LASER DESBLOQUEADO!' : ''}`);
    audio.playQuest();
}

function showQuestToast(title, sub) {
    questToastQueue.push({ title, sub });
    if (!questToastBusy) nextQuestToast();
}

function nextQuestToast() {
    const el = document.getElementById('questToast');
    const item = questToastQueue.shift();
    if (!el || !item) { questToastBusy = false; return; }
    questToastBusy = true;
    el.innerHTML = `<strong>${item.title}</strong><span>${item.sub}</span>`;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    setTimeout(() => { el.classList.remove('show'); setTimeout(nextQuestToast, 250); }, 2600);
}

function renderQuests() {
    const list = document.getElementById('questsList');
    if (!list) return;
    const mult = questMult();
    list.innerHTML = QUEST_CHAINS.map(chain => {
        const act = activeQuest(chain);
        const rows = chain.quests.map(q => {
            const done = questDone(q.id);
            const isActive = !!act && act.id === q.id;
            const locked = !done && !isActive;
            const reward = Math.round(q.base * mult);
            return `<div class="shop-item quest-row${done ? ' done' : ''}${isActive ? ' active' : ''}${locked ? ' locked' : ''}">
                <div><strong>${done ? '✔ ' : locked ? '🔒 ' : '▶ '}${q.title}</strong><div class="shop-desc">${q.desc}</div></div>
                <button class="btn-shop">${done ? 'CONCLUÍDA' : '₡ ' + reward}</button>
            </div>`;
        }).join('');
        return `<div class="chain-title">${chain.name}</div>${rows}`;
    }).join('') + `<div class="shop-desc quest-note">As recompensas escalam com a dificuldade selecionada (x${mult}). Cumpra as metas em ordem para liberar as próximas.</div>`;
}

/* ==========================================================================
LOJA: ÁRVORE DE DRONES E LASERS
========================================================================== */
const LASER_DEFS = {
    DEFAULT: { name: 'LASER DA NAVE', color: null, cost: 0, desc: 'Usa a cor da skin equipada' },
    MAGENTA: { name: 'LASER NEON MAGENTA', color: '#ff2bd6', cost: 200, desc: 'Rastro longo e brilho rosa-choque' },
    PLASMA: { name: 'PLASMA VERDE', color: '#39ff6a', cost: 350, desc: 'Projétil ondulante de plasma' },
    GOLD_FIRE: { name: 'FOGO DOURADO', color: '#ffb300', cost: 900, desc: 'Rastro de brasas flamejantes. Também se desbloqueia na meta "Febre Dourada".' }
};

const DRONE_PATTERNS = {
    ORBIT: { name: 'ÓRBITA CLÁSSICA', icon: '◯', cost: 0, desc: 'Drones giram ao redor da nave e atiram em linha reta' },
    DELTA: { name: 'FORMAÇÃO DELTA', icon: '▲', cost: 250, desc: 'Drones em formação V atrás da nave com rajada paralela (requer 1 Drone)' },
    HELIX: { name: 'HÉLICE DUPLA', icon: '◆', cost: 500, desc: 'Duas órbitas contrárias que disparam mísseis teleguiados (requer Delta + 2 Drones)' }
};

function laserColor(skin) {
    const d = LASER_DEFS[metaData.equippedLaser];
    return (d && d.color) || skinColor(skin);
}

function activeDronePattern() {
    const p = metaData.equippedDronePattern;
    if (p === 'DELTA' && metaData.dronePatterns.DELTA) return 'DELTA';
    if (p === 'HELIX' && metaData.dronePatterns.HELIX) return 'HELIX';
    return 'ORBIT';
}

function patternUnlockable(key) {
    const dl = metaData.upgrades.drone || 0;
    if (key === 'DELTA') return dl >= 1;
    if (key === 'HELIX') return !!metaData.dronePatterns.DELTA && dl >= 2;
    return true;
}

function renderShopExtras() {
    const box = document.getElementById('shopExtras');
    if (!box) return;
    const eqP = activeDronePattern();

    const patternNode = (key) => {
        const def = DRONE_PATTERNS[key];
        const owned = key === 'ORBIT' || !!metaData.dronePatterns[key];
        const unlockable = patternUnlockable(key);
        let label, disabled = false;
        if (owned) label = eqP === key ? 'EQUIPADO' : 'EQUIPAR';
        else if (!unlockable) { label = '🔒'; disabled = true; }
        else { label = `₡ ${def.cost}`; disabled = metaData.credits < def.cost; }
        const state = owned ? (eqP === key ? 'equipped' : 'owned') : (unlockable ? 'available' : 'locked');
        return `<div class="tree-node ${state}"><div class="tree-icon">${def.icon}</div>
            <div class="tree-info"><strong>${def.name}</strong><div class="shop-desc">${def.desc}</div></div>
            <button class="btn-shop" data-act="pattern" data-key="${key}" ${disabled ? 'disabled' : ''}>${label}</button></div>`;
    };

    const laserNode = (key) => {
        const def = LASER_DEFS[key];
        const owned = key === 'DEFAULT' || !!metaData.lasers[key];
        const eq = metaData.equippedLaser === key;
        let label, disabled = false;
        if (owned) label = eq ? 'EQUIPADO' : 'EQUIPAR';
        else { label = `₡ ${def.cost}`; disabled = metaData.credits < def.cost; }
        const state = owned ? (eq ? 'equipped' : 'owned') : 'available';
        const swatch = def.color ? `style="background:${def.color}; box-shadow:0 0 10px ${def.color}"` : 'style="background:linear-gradient(90deg,#00e5ff,#ff007f)"';
        return `<div class="tree-node ${state}"><div class="tree-icon"><span class="laser-swatch" ${swatch}></span></div>
            <div class="tree-info"><strong>${def.name}</strong><div class="shop-desc">${def.desc}</div></div>
            <button class="btn-shop" data-act="laser" data-key="${key}" ${disabled ? 'disabled' : ''}>${label}</button></div>`;
    };

    box.innerHTML = `
        <div class="tree-title" style="color:#00ffcc;">ÁRVORE DE DRONES (PADRÃO DE ÓRBITA / TIRO)</div>
        <div class="tree-branch">${['ORBIT', 'DELTA', 'HELIX'].map(patternNode).join('')}</div>
        <div class="tree-title" style="color:#ff2bd6;">LASERS (COR E EFEITO)</div>
        <div class="tree-branch">${['DEFAULT', 'MAGENTA', 'PLASMA', 'GOLD_FIRE'].map(laserNode).join('')}</div>
    `;
}

function handleShopExtra(act, key) {
    if (act === 'pattern') {
        if (key === 'ORBIT') metaData.equippedDronePattern = 'ORBIT';
        else if (metaData.dronePatterns[key]) metaData.equippedDronePattern = metaData.equippedDronePattern === key ? 'ORBIT' : key;
        else if (patternUnlockable(key) && metaData.credits >= DRONE_PATTERNS[key].cost) {
            metaData.credits -= DRONE_PATTERNS[key].cost;
            metaData.dronePatterns[key] = true;
            metaData.equippedDronePattern = key;
        }
    } else if (act === 'laser') {
        if (key === 'DEFAULT') metaData.equippedLaser = 'DEFAULT';
        else if (metaData.lasers[key]) metaData.equippedLaser = metaData.equippedLaser === key ? 'DEFAULT' : key;
        else if (metaData.credits >= LASER_DEFS[key].cost) {
            metaData.credits -= LASER_DEFS[key].cost;
            metaData.lasers[key] = true;
            metaData.equippedLaser = key;
        }
    }
    saveMetaData();
    renderShop();
}

/* ---------- Drones auxiliares: padrões de órbita / tiro / visual ---------- */
Player.prototype.dronePos = function (i, n) {
    const t = frameCount;
    const pat = activeDronePattern();
    if (pat === 'DELTA') {
        const off = i - (n - 1) / 2;
        return { x: this.x + off * 34, y: this.y + 22 + Math.abs(off) * 9 + Math.sin(t * 0.1 + i) * 2 };
    }
    if (pat === 'HELIX') {
        const ring = i % 2;
        const rad = ring ? 56 : 33;
        const dir = ring ? -1 : 1;
        const ang = t * 0.07 * dir + Math.floor(i / 2) * Math.PI + ring * Math.PI / 2;
        return { x: this.x + Math.cos(ang) * rad, y: this.y + Math.sin(ang) * rad * 0.8 };
    }
    const angle = (t * 0.05) + (i * Math.PI * 2 / Math.max(1, n)); // ORBIT (idêntico ao original para 1-2 drones)
    return { x: this.x + Math.cos(angle) * 35, y: this.y + Math.sin(angle) * 35 };
};

Player.prototype.fireDrones = function () {
    const n = this.droneCount || 0;
    if (!n || overloadActive || this.dying) return;
    const pat = activeDronePattern();
    const rate = pat === 'HELIX' ? 22 : pat === 'DELTA' ? 14 : 16;
    if (frameCount % rate !== 0) return;
    for (let i = 0; i < n; i++) {
        const p = this.dronePos(i, n);
        if (pat === 'DELTA') {
            const off = i - (n - 1) / 2;
            bullets.push(new Bullet(p.x, p.y - 6, off * 0.5, -11, true, '#ff4dd2'));
        } else if (pat === 'HELIX') {
            const b = new Bullet(p.x, p.y, 0, -7, true, '#7dff7d', true);
            b.dmg = 0.7;
            bullets.push(b);
        } else {
            bullets.push(new Bullet(p.x, p.y, 0, -10, true, '#00ffcc'));
        }
    }
};

Player.prototype.drawDrones = function () {
    const n = this.droneCount || 0;
    const pat = activeDronePattern();
    if (n > 0) {
        ctx.save();
        ctx.strokeStyle = pat === 'HELIX' ? 'rgba(125,255,125,0.16)' : 'rgba(0,255,204,0.12)';
        ctx.lineWidth = 1;
        if (pat === 'HELIX') { ctx.beginPath(); ctx.arc(this.x, this.y, 33, 0, Math.PI * 2); ctx.stroke(); ctx.beginPath(); ctx.arc(this.x, this.y, 56, 0, Math.PI * 2); ctx.stroke(); }
        else if (pat === 'ORBIT') { ctx.beginPath(); ctx.arc(this.x, this.y, 35, 0, Math.PI * 2); ctx.stroke(); }
        ctx.restore();
    }
    for (let i = 0; i < n; i++) {
        const p = this.dronePos(i, n);
        ctx.save(); ctx.translate(p.x, p.y);
        if (pat === 'DELTA') {
            ctx.fillStyle = '#ff4dd2'; ctx.shadowBlur = 12; ctx.shadowColor = '#ff4dd2';
            ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(6, 6); ctx.lineTo(-6, 6); ctx.closePath(); ctx.fill();
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = 'rgba(255,180,255,0.7)';
            ctx.fillRect(-2, 6, 4, 3 + Math.random() * 4);
        } else if (pat === 'HELIX') {
            ctx.fillStyle = '#7dff7d'; ctx.shadowBlur = 12; ctx.shadowColor = '#7dff7d';
            ctx.beginPath(); ctx.moveTo(0, -7); ctx.lineTo(6, 0); ctx.lineTo(0, 7); ctx.lineTo(-6, 0); ctx.closePath(); ctx.fill();
        } else {
            ctx.fillStyle = '#00ffcc'; ctx.shadowBlur = 10; ctx.shadowColor = '#00ffcc';
            ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
        }
        ctx.restore();
    }
    this.drawGuards();
};

/* ---------- Drones de Sobrevivência (guardiões) ---------- */
Player.prototype.guardPos = function (i) {
    const a = frameCount * 0.04 + i * Math.PI;
    return { x: this.x + Math.cos(a) * 52, y: this.y + Math.sin(a) * 52 };
};

Player.prototype.drawGuards = function () {
    if (!this.guards || !this.guards.length) return;
    this.guards.forEach((g, i) => {
        if (g.hp <= 0) return;
        const p = this.guardPos(i);
        const col = g.hp >= 3 ? '#00e5ff' : g.hp === 2 ? '#ffee00' : '#ff3355';
        ctx.save(); ctx.translate(p.x, p.y);
        ctx.strokeStyle = col; ctx.fillStyle = 'rgba(0,229,255,0.15)'; ctx.lineWidth = 2; ctx.shadowBlur = 12; ctx.shadowColor = col;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) { const a = Math.PI / 3 * k; const px = Math.cos(a) * 9, py = Math.sin(a) * 9; if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py); }
        ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.restore();
    });
};

Player.prototype.tickV2 = function () {
    if (this.invuln > 0) this.invuln--;
    if (this.novaCd > 0) this.novaCd--;
    if (this.shieldRegen > 0) {
        this.shieldRegen--;
        if (this.shieldRegen === 0) {
            if (!this.powerup) {
                this.powerup = 'SHIELD';
                spawnText(this.x, this.y - 42, 'ESCUDO RECARREGADO', '#00e5ff', 14, { life: 55 });
                audio.playPowerup();
            } else {
                this.shieldRegen = 120; // outro power-up ocupa o slot: tenta de novo depois
            }
        }
    }
    this.guards.forEach(g => { if (g.hp <= 0 && g.cd > 0) { g.cd--; if (g.cd === 0) g.hp = 3; } });
};

/* ---------- Efeito visual dos lasers equipados ---------- */
Bullet.prototype.drawLaserFx = function () {
    const id = this.laserId;
    const tx = this.x - this.vx * 3.2, ty = this.y - this.vy * 3.2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    if (id === 'MAGENTA') {
        const g = ctx.createLinearGradient(this.x, this.y, tx, ty);
        g.addColorStop(0, 'rgba(255,43,214,0.9)'); g.addColorStop(1, 'rgba(255,43,214,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 7; ctx.shadowBlur = 16; ctx.shadowColor = '#ff2bd6';
        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(tx, ty); ctx.stroke();
        ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 2; ctx.globalAlpha = 0.8;
        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(this.x - this.vx, this.y - this.vy); ctx.stroke();
    } else if (id === 'PLASMA') {
        ctx.strokeStyle = 'rgba(57,255,106,0.75)'; ctx.lineWidth = 3; ctx.shadowBlur = 14; ctx.shadowColor = '#39ff6a';
        ctx.beginPath();
        for (let k = 0; k <= 8; k++) {
            const t = k / 8;
            const wob = Math.sin(frameCount * 0.6 + k * 1.3 + this.x) * 4 * t;
            const px = this.x + (tx - this.x) * t + wob, py = this.y + (ty - this.y) * t;
            if (k === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
    } else if (id === 'GOLD_FIRE') {
        const g = ctx.createLinearGradient(this.x, this.y, tx, ty);
        g.addColorStop(0, 'rgba(255,240,150,0.95)'); g.addColorStop(0.4, 'rgba(255,150,0,0.7)'); g.addColorStop(1, 'rgba(255,60,0,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 8; ctx.shadowBlur = 18; ctx.shadowColor = '#ff9a00';
        ctx.beginPath(); ctx.moveTo(this.x, this.y); ctx.lineTo(tx, ty); ctx.stroke();
    }
    ctx.restore();
};

/* ==========================================================================
MODO PHANTOM (FANTASMA DA MELHOR PARTIDA)
========================================================================== */
function loadGhost() {
    try {
        const g = JSON.parse(localStorage.getItem('cyber_ghost') || 'null');
        if (g && Array.isArray(g.s) && g.s.length >= 6) return g;
    } catch (e) { /* dados corrompidos: ignora */ }
    return null;
}

function saveGhostIfBest(sc) {
    if (ghostRec.length < 6) return;
    const cur = loadGhost();
    if (!cur || sc > cur.score) {
        try {
            localStorage.setItem('cyber_ghost', JSON.stringify({ score: sc, diff: currentDifficulty, skin: metaData.equippedSkin, s: ghostRec }));
        } catch (e) { /* sem espaço: segue sem gravar */ }
    }
}

function personalBest() {
    let best = metaData.bestScore || 0;
    metaData.leaderboard.forEach(e => { if (e.score > best) best = e.score; });
    const g = loadGhost();
    if (g && g.score > best) best = g.score;
    return best;
}

function updatePhantom() {
    const hud = document.getElementById('phantomHud');
    if (!phantomMode || !ghostData || !canvas) { ghostPos = null; return; }
    const s = ghostData.s;
    const n = s.length / 3;
    const f = runFrames / 4;
    let gScore;
    if (f >= n - 1) {
        gScore = s[(n - 1) * 3 + 2];
        if (!ghostDone) {
            ghostDone = true;
            const lx = s[(n - 1) * 3] / 1000 * canvas.width, ly = s[(n - 1) * 3 + 1] / 1000 * canvas.height;
            createExplosion(lx, ly, '#c8f6ff', 30);
            spawnText(lx, ly - 30, 'FANTASMA ELIMINADO', '#c8f6ff', 16, { life: 80 });
        }
        ghostPos = null;
    } else {
        const i = Math.floor(f), t = f - i, a = i * 3, b = a + 3;
        ghostPos = {
            x: (s[a] + (s[b] - s[a]) * t) / 1000 * canvas.width,
            y: (s[a + 1] + (s[b + 1] - s[a + 1]) * t) / 1000 * canvas.height
        };
        gScore = s[a + 2];
    }
    const cur = Math.floor(score);
    if (!ghostBeaten && cur > ghostData.score) {
        ghostBeaten = true; runStats.beatGhost = true;
        showQuestToast('👻 FANTASMA SUPERADO!', `Você passou os ${ghostData.score} pontos do seu fantasma`);
        audio.announce('Ghost defeated', 4);
        evaluateQuests();
    }
    if (hud) {
        const d = cur - gScore;
        hud.innerText = `👻 ${gScore}   |   VOCÊ ${d >= 0 ? '+' : ''}${d}`;
        hud.style.color = d >= 0 ? '#7dff9a' : '#ff8fa8';
    }
}

function drawPhantomGhost() {
    if (!phantomMode || !ghostData || !ghostPos || !player) return;
    ctx.save();
    ctx.translate(ghostPos.x, ghostPos.y);
    ctx.globalAlpha = 0.38 + Math.sin(frameCount * 0.1) * 0.06;
    ctx.shadowBlur = 18; ctx.shadowColor = '#c8f6ff';
    ctx.fillStyle = 'rgba(200,246,255,0.18)';
    ctx.strokeStyle = '#c8f6ff'; ctx.lineWidth = 2;
    traceShipPath(ctx, ghostData.skin || 'DEFAULT', player.width, player.height);
    ctx.fill(); ctx.stroke();
    // disparo fantasma (cosmético)
    ctx.globalAlpha = 0.18;
    ctx.fillStyle = '#c8f6ff';
    ctx.fillRect(-1.5, -player.height / 2 - 40, 3, 36);
    ctx.globalAlpha = 0.55;
    ctx.font = '800 10px Segoe UI, sans-serif'; ctx.textAlign = 'center';
    ctx.fillStyle = '#c8f6ff'; ctx.shadowBlur = 0;
    ctx.fillText('GHOST', 0, player.height / 2 + 16);
    ctx.restore();
}

/* ==========================================================================
CICLO DA PARTIDA: HOOKS v2
========================================================================== */
function v2StartRun() {
    runStats = freshRunStats();
    runFrames = 0; jackpotCoins = [];
    ghostRec = []; ghostPos = null; ghostDone = false; ghostBeaten = false; ghostData = null;
    camZoom = 1; bulletTimeOn = false; bulletTimeCd = 0; coinChain = 0;
    runStartBest = personalBest();

    if (phantomMode) {
        ghostData = loadGhost();
        if (ghostData) showQuestToast('👻 MODO PHANTOM', `Seu fantasma fez ${ghostData.score} pontos. Supere-o!`);
        else showQuestToast('👻 MODO PHANTOM', 'Nenhum fantasma gravado ainda: esta partida grava o primeiro!');
    }
    const hud = document.getElementById('phantomHud');
    if (hud) { if (phantomMode && ghostData) hud.classList.remove('hidden'); else hud.classList.add('hidden'); }
}

function resetV2Fx() {
    jackpotCoins = [];
    camZoom = 1;
    clearRouletteTimers();
    endBulletTime(true);
    ghostPos = null;
    const hud = document.getElementById('phantomHud');
    if (hud) hud.classList.add('hidden');
}

// Roda em todo frame real (inclusive em câmera lenta)
function v2Tick(dtMs) {
    if (player && !player.dying) runStats.ms += dtMs;
    if (bulletTimeCd > 0) bulletTimeCd--;
    if (bulletTimeOn && slowMotionDuration <= 0) endBulletTime();
}

// Roda a cada passo do mundo
function stepV2() {
    runFrames++;

    for (let i = jackpotCoins.length - 1; i >= 0; i--) {
        jackpotCoins[i].update();
        if (jackpotCoins[i].dead) jackpotCoins.splice(i, 1);
    }

    if (activeRunPerks.chainOverdrive && frameCount % 24 === 0) autoArc();

    if (player && !player.dying && runFrames % 4 === 0 && ghostRec.length < 12000 && canvas) {
        ghostRec.push(Math.round(player.x / canvas.width * 1000), Math.round(player.y / canvas.height * 1000), Math.floor(score));
    }

    updatePhantom();

    if (frameCount % 30 === 0) evaluateQuests();
}

/* ---------- Game Over detalhado ---------- */
function formatTime(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function buildTaunt(sc, best, st) {
    const diff = best - sc;
    let main;
    if (best <= 0) main = 'Primeira corrida registrada. O fantasma do seu futuro já está te esperando.';
    else if (sc > best) main = `NOVO RECORDE PESSOAL! Você superou seu melhor em ${sc - best} pontos. Seu eu do passado acaba de ser apagado.`;
    else if (diff <= 150 || diff <= best * 0.05) main = `Você ficou a apenas ${diff} pontos de superar seu recorde pessoal!`;
    else if (diff <= best * 0.25) main = `Quase lá: faltaram ${diff} pontos para o seu recorde. Mais um Graze e a história seria outra.`;
    else if (sc < best * 0.3) main = `Isso foi só um aquecimento. Seu recorde é ${best}; você fez ${Math.round(sc / best * 100)}% dele.`;
    else main = `Faltaram ${diff} pontos para o seu recorde de ${best}. O próximo chefe estava logo ali.`;

    let extra = '';
    if (st.perfectDashes === 0) extra = ' Zero Perfect Dashes: o Dash existe para ser usado!';
    else if (st.grazes >= 40) extra = ' Você dançou entre as balas... até a música acabar.';
    else if (st.bosses === 0) extra = ' Nenhum chefe caiu hoje. Aprenda os padrões e volte mais forte.';
    return main + extra;
}

function v2EndGame() {
    const sc = Math.floor(score);
    const tauntText = buildTaunt(sc, runStartBest, runStats);
    if (sc > (metaData.bestScore || 0)) { metaData.bestScore = sc; saveMetaData(); }
    saveGhostIfBest(sc);

    const taunt = document.getElementById('gameOverTaunt');
    if (taunt) {
        let ghostLine = '';
        if (phantomMode && ghostData) {
            ghostLine = ghostBeaten
                ? ` 👻 Você DERROTOU o fantasma por ${sc - ghostData.score} pontos!`
                : ` 👻 O fantasma ainda venceu por ${Math.max(0, ghostData.score - sc)} pontos.`;
        }
        taunt.innerText = tauntText + ghostLine;
    }

    const grid = document.getElementById('runStatsGrid');
    if (grid) {
        const cell = (label, value) => `<div class="stat-cell"><div class="stat-val">${value}</div><div class="stat-label">${label}</div></div>`;
        grid.innerHTML = [
            cell('GRAZES', runStats.grazes),
            cell('DANO TOTAL', Math.round(runStats.damage).toLocaleString('pt-BR')),
            cell('PERFECT DASHES', runStats.perfectDashes),
            cell('ABATES', runStats.kills),
            cell('CHEFES', runStats.bosses),
            cell('TEMPO', formatTime(runStats.ms)),
            cell('MAIOR SEQUÊNCIA', runStats.maxStreak),
            cell('OVERLOADS', runStats.overloads),
            cell('METAS', runStats.questsDone.length)
        ].join('');
    }
}

/* ---------- Interface extra (abas, Phantom, loja) ---------- */
function initV2UI() {
    const tabAch = document.getElementById('tabAch');
    const tabQuests = document.getElementById('tabQuests');
    const achList = document.getElementById('achievementsList');
    const questList = document.getElementById('questsList');

    const showTab = (which) => {
        const isQ = which === 'quests';
        if (achList) achList.style.display = isQ ? 'none' : '';
        if (questList) questList.style.display = isQ ? '' : 'none';
        if (tabAch) tabAch.classList.toggle('active', !isQ);
        if (tabQuests) tabQuests.classList.toggle('active', isQ);
        if (isQ) renderQuests();
    };

    if (tabAch) tabAch.addEventListener('click', () => showTab('ach'));
    if (tabQuests) tabQuests.addEventListener('click', () => showTab('quests'));
    document.getElementById('achievementsBtn')?.addEventListener('click', () => showTab('ach'));

    document.getElementById('phantomBtn')?.addEventListener('click', () => { phantomMode = true; startGame(false); });

    const extras = document.getElementById('shopExtras');
    if (extras) {
        extras.addEventListener('click', (e) => {
            const btn = e.target.closest ? e.target.closest('button[data-act]') : null;
            if (btn && !btn.disabled) handleShopExtra(btn.getAttribute('data-act'), btn.getAttribute('data-key'));
        });
    }
}



/* ==========================================================================
8. REDESIGN VISUAL (v3): SPRITES DE POWER-UPS, MINAS / NAVES-BARREIRA E AURAS DE PERIGO
   Regra de leitura rápida:
     - RECOMPENSA = azul (escudo), verde (vida), amarelo/magenta (armas), dourado (créditos)
     - PERIGO     = aura vermelha, laranja ou roxa pulsando
   (VISUAL_CFG.SPRITES = false volta ao desenho antigo dos itens e obstáculos)
========================================================================== */
const VISUAL_CFG = {
    SPRITES: true,       // sprites vetoriais de itens e obstáculos
    DANGER_AURA: true    // auras de alerta em projéteis, inimigos e chefes
};

const OBSTACLE_CFG = {
    CONTACT_DAMAGE: 25,  // dano ao encostar numa mina/barreira (0 = obstáculos voltam a ser inofensivos)
    MINE_CHANCE: 0.65    // chance de o obstáculo ser uma mina (o resto vira nave-barreira)
};

const DANGER_COLORS = { RED: '#ff2a2a', ORANGE: '#ff8a00', PURPLE: '#9b30ff' };
const ENEMY_DANGER = { FAST: 'RED', KAMIKAZE: 'RED', SHIELDED: 'ORANGE', CROSS: 'PURPLE', GOLDEN: 'ORANGE', BASIC: 'ORANGE' };

/* ---------- Utilitários de cor e aura ---------- */
function hexA(hex, a) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return `rgba(255,42,42,${a})`;
    const n = parseInt(m[1], 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

// Converte qualquer cor de projétil na cor de perigo mais próxima (vermelho, laranja ou roxo)
function dangerColorOf(hex) {
    const m = /^#?([0-9a-f]{6})$/i.exec(hex || '');
    if (!m) return DANGER_COLORS.RED;
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b);
    let h = 0;
    if (max !== min) {
        const d = max - min;
        if (max === r) h = ((g - b) / d) % 6;
        else if (max === g) h = (b - r) / d + 2;
        else h = (r - g) / d + 4;
        h *= 60; if (h < 0) h += 360;
    }
    if (h >= 20 && h < 70) return DANGER_COLORS.ORANGE;
    if (h >= 250 && h < 330) return DANGER_COLORS.PURPLE;
    return DANGER_COLORS.RED;
}

function drawDangerAura(x, y, r, color, alpha = 1) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    const g = ctx.createRadialGradient(x, y, r * 0.15, x, y, r);
    g.addColorStop(0, hexA(color, 0.55 * alpha));
    g.addColorStop(0.55, hexA(color, 0.22 * alpha));
    g.addColorStop(1, hexA(color, 0));
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

function drawEnemyBulletAura(b) {
    const col = dangerColorOf(b.color);
    const pulse = 0.75 + 0.25 * Math.sin(frameCount * 0.35 + b.x * 0.05);
    drawDangerAura(b.x, b.y, b.radius * 5.2 * pulse, col, 1.7);
    ctx.save();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(12,0,18,0.9)'; // contorno escuro separa o tiro do fundo
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius + 1.6, 0, Math.PI * 2); ctx.stroke();
    ctx.lineWidth = 1.5; ctx.strokeStyle = hexA(col, 0.95);       // anel de alerta na cor do perigo
    ctx.beginPath(); ctx.arc(b.x, b.y, b.radius + 3.8, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();
}

// contexto já transladado ao centro do inimigo
function drawEnemyAura(e) {
    const col = DANGER_COLORS[ENEMY_DANGER[e.type] || 'RED'];
    const pulse = 0.7 + 0.3 * Math.sin(frameCount * 0.2 + (e.phase || 0));
    drawDangerAura(0, 0, Math.max(e.width, e.height) * 1.9 * pulse, col, 1.5);
}

// contexto já transladado ao centro do chefe
function drawBossAura(b) {
    const col = b.isSub ? DANGER_COLORS.ORANGE : b.phase === 3 ? DANGER_COLORS.PURPLE : b.phase === 2 ? DANGER_COLORS.ORANGE : DANGER_COLORS.RED;
    const pulse = 0.8 + 0.2 * Math.sin(frameCount * (b.phase === 3 ? 0.4 : 0.2));
    drawDangerAura(0, 0, Math.max(b.width, b.height) * 1.35 * pulse + 24, col, 1.4);
}

/* ==========================================================================
SPRITES DOS POWER-UPS (desenhados no Canvas, sem letras nem blocos)
========================================================================== */
function spriteShield(t) {
    ctx.beginPath();
    ctx.moveTo(-9, -9); ctx.quadraticCurveTo(0, -5.5, 9, -9);
    ctx.lineTo(9, 0); ctx.quadraticCurveTo(8, 8, 0, 12); ctx.quadraticCurveTo(-8, 8, -9, 0);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -10, 0, 12);
    g.addColorStop(0, 'rgba(120,220,255,0.95)'); g.addColorStop(1, 'rgba(10,60,140,0.95)');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1.8; ctx.strokeStyle = '#bff3ff'; ctx.stroke();

    // brilho metálico varrendo o brasão
    ctx.save();
    ctx.clip();
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.translate(Math.sin(t) * 14, 0); ctx.rotate(0.5);
    ctx.fillRect(-2, -14, 4, 28);
    ctx.restore();

    // emblema: cruz + chevron
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(0, -6.5); ctx.lineTo(0, 7.5); ctx.moveTo(-5, -1.5); ctx.lineTo(5, -1.5); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(-4.5, 3); ctx.lineTo(0, 6.5); ctx.lineTo(4.5, 3); ctx.stroke();
}

function spriteHeart(p) {
    const s = 1 + Math.sin(frameCount * 0.25 + p.phase) * 0.14; // pulsação
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(0, 8.5);
    ctx.bezierCurveTo(-13, -1, -8.5, -11, 0, -4.5);
    ctx.bezierCurveTo(8.5, -11, 13, -1, 0, 8.5);
    ctx.closePath();
    const g = ctx.createLinearGradient(0, -9, 0, 9);
    g.addColorStop(0, '#7dffb0'); g.addColorStop(1, '#00b84a');
    ctx.fillStyle = g; ctx.fill();
    ctx.lineWidth = 1.6; ctx.strokeStyle = '#d9ffe8'; ctx.stroke();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.95)'; // cruz médica
    ctx.fillRect(-1.5, -4.5, 3, 9);
    ctx.fillRect(-4.5, -1.5, 9, 3);
}

// Leque de mísseis/projéteis pontudos (3 = tiro triplo, 5 = tiro quíntuplo)
function spriteMissileFan(count, color, accent) {
    const angles = count === 3 ? [-0.42, 0.42, 0] : [-0.8, 0.8, -0.4, 0.4, 0];  // o central é desenhado por último
    const sc = count === 3 ? 1 : 0.78;
    angles.forEach(a => {
        ctx.save();
        ctx.translate(a * (count === 3 ? 14 : 12), 8 + Math.abs(a) * 4);
        ctx.rotate(a); ctx.scale(sc, sc);
        ctx.beginPath();
        ctx.moveTo(0, -17);                                   // ponta afiada
        ctx.lineTo(2.3, -8); ctx.lineTo(2.3, 3); ctx.lineTo(0, 5); ctx.lineTo(-2.3, 3); ctx.lineTo(-2.3, -8);
        ctx.closePath();
        ctx.fillStyle = color; ctx.fill();
        ctx.lineWidth = 0.9; ctx.strokeStyle = '#ffffff'; ctx.stroke();
        ctx.fillStyle = '#ffffff';                            // brilho na ponta
        ctx.beginPath(); ctx.moveTo(0, -17); ctx.lineTo(1.3, -12); ctx.lineTo(-1.3, -12); ctx.closePath(); ctx.fill();
        ctx.fillStyle = accent;                               // aletas
        ctx.beginPath(); ctx.moveTo(-2.3, 0); ctx.lineTo(-4.6, 5); ctx.lineTo(-2.3, 3); ctx.closePath(); ctx.fill();
        ctx.beginPath(); ctx.moveTo(2.3, 0); ctx.lineTo(4.6, 5); ctx.lineTo(2.3, 3); ctx.closePath(); ctx.fill();
        ctx.restore();
    });
}

// Mira giratória com míssil teleguiado no centro
function spriteReticle(color, accent, t) {
    ctx.save();
    ctx.rotate(t * 0.8);
    ctx.strokeStyle = color; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
        ctx.save(); ctx.rotate(i * Math.PI / 2);
        ctx.beginPath(); ctx.arc(0, 0, 9, -0.55, 0.55); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(9, 0); ctx.lineTo(14, 0); ctx.stroke();
        ctx.restore();
    }
    ctx.restore();
    ctx.beginPath();
    ctx.moveTo(0, -8); ctx.lineTo(2.4, -1); ctx.lineTo(2.4, 5); ctx.lineTo(0, 7); ctx.lineTo(-2.4, 5); ctx.lineTo(-2.4, -1);
    ctx.closePath();
    ctx.fillStyle = accent; ctx.fill();
    ctx.lineWidth = 0.8; ctx.strokeStyle = '#ffffff'; ctx.stroke();
    if (Math.floor(frameCount / 10) % 2) { ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0, -1, 1.3, 0, Math.PI * 2); ctx.fill(); }
}

function spriteBolt() {
    ctx.beginPath();
    ctx.moveTo(3.5, -11); ctx.lineTo(-6, 1); ctx.lineTo(-1, 1); ctx.lineTo(-3.5, 11); ctx.lineTo(6.5, -2); ctx.lineTo(1.5, -2);
    ctx.closePath();
    ctx.fillStyle = '#c58bff'; ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#ffffff'; ctx.stroke();
}

// contexto já transladado ao centro do item
function drawPowerUpSprite(p, color) {
    const t = frameCount * 0.08 + p.phase;
    const pulse = 1 + Math.sin(t * 1.6) * 0.07;

    // placa escura + anel neon tracejado: legibilidade sobre qualquer fundo
    ctx.save();
    ctx.fillStyle = 'rgba(6,8,20,0.8)';
    ctx.beginPath(); ctx.arc(0, 0, 17 * pulse, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = color; ctx.lineWidth = 2;
    ctx.shadowBlur = p.magnet ? 24 : 14; ctx.shadowColor = color;
    ctx.setLineDash([6, 4]); ctx.lineDashOffset = -frameCount * 0.5;
    ctx.beginPath(); ctx.arc(0, 0, 17 * pulse, 0, Math.PI * 2); ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.shadowBlur = 8; ctx.shadowColor = color;
    switch (p.type) {
        case 'SHIELD': spriteShield(t); break;
        case 'HEAL': spriteHeart(p); break;
        case 'TRIPLE': spriteMissileFan(3, '#ffcc00', '#ff9d00'); break;
        case 'PENTA': spriteMissileFan(5, '#ff00ff', '#ff9bff'); break;
        case 'HOMING': spriteReticle('#ffe14a', '#ff2bd6', t); break;
        case 'ULT_CHARGE': spriteBolt(); break;
        default: ctx.strokeRect(-p.size / 2, -p.size / 2, p.size, p.size);
    }
    ctx.restore();
}

/* ==========================================================================
OBSTÁCULOS: MINAS ESPACIAIS CIBERNÉTICAS E NAVES-BARREIRA
========================================================================== */
Obstacle.prototype.drawMine = function () {
    const r = this.radius;
    const t = frameCount * 0.3 + this.seed;
    const alert = Math.sin(t) > 0;                 // luz de perigo piscando
    const col = alert ? DANGER_COLORS.RED : DANGER_COLORS.ORANGE;

    ctx.save();
    ctx.translate(this.x, this.y);
    drawDangerAura(0, 0, r * 2.7, col, 0.7 + 0.3 * Math.abs(Math.sin(t)));
    ctx.rotate(this.spin);

    // espinhos afiados
    const spikes = 10;
    ctx.shadowBlur = 10; ctx.shadowColor = col;
    for (let i = 0; i < spikes; i++) {
        ctx.save();
        ctx.rotate((i / spikes) * Math.PI * 2);
        ctx.beginPath();
        ctx.moveTo(-3.4, -r * 0.7); ctx.lineTo(0, -r * 1.42); ctx.lineTo(3.4, -r * 0.7);
        ctx.closePath();
        ctx.fillStyle = '#c9d1e6'; ctx.fill();
        ctx.strokeStyle = '#ff5a1a'; ctx.lineWidth = 1.2; ctx.stroke();
        ctx.restore();
    }

    // esfera metálica
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r * 0.95);
    g.addColorStop(0, '#7b84a3'); g.addColorStop(0.55, '#2b3046'); g.addColorStop(1, '#0c0e18');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.85, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = '#ff5a1a'; ctx.stroke();

    // faixas de perigo
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(255,138,0,0.75)'; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, r * 0.62, Math.PI + 0.3, Math.PI * 2 - 0.3); ctx.stroke();

    // luz central de alerta
    ctx.shadowBlur = alert ? 22 : 6; ctx.shadowColor = '#ff2a2a';
    ctx.fillStyle = alert ? '#ff3030' : '#661010';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, Math.PI * 2); ctx.fill();
    if (alert) {
        ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.8)';
        ctx.beginPath(); ctx.arc(-r * 0.07, -r * 0.07, r * 0.09, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
};

Obstacle.prototype.drawBarrier = function () {
    const r = this.radius;
    const t = frameCount * 0.25 + this.seed;
    const leftOn = Math.sin(t) > 0;
    const col = leftOn ? DANGER_COLORS.RED : DANGER_COLORS.ORANGE;

    ctx.save();
    ctx.translate(this.x, this.y);
    drawDangerAura(0, 0, r * 2.5, col, 0.8);

    // chama dos propulsores (a nave desce, então os motores ficam em cima)
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = hexA(DANGER_COLORS.ORANGE, 0.8);
    for (const sx of [-1, 1]) {
        const fl = 7 + Math.random() * 7;
        ctx.beginPath();
        ctx.moveTo(sx * r * 0.32 - 3.5, -r * 0.85); ctx.lineTo(sx * r * 0.32, -r * 0.85 - fl); ctx.lineTo(sx * r * 0.32 + 3.5, -r * 0.85);
        ctx.closePath(); ctx.fill();
    }
    ctx.restore();

    const metal = ctx.createLinearGradient(-r * 1.4, 0, r * 1.4, 0);
    metal.addColorStop(0, '#4a526e'); metal.addColorStop(0.5, '#a9b2cc'); metal.addColorStop(1, '#3a4057');

    // asas-barreira
    ctx.shadowBlur = 12; ctx.shadowColor = col;
    ctx.lineWidth = 2; ctx.strokeStyle = '#dfe6f7';
    for (const sx of [-1, 1]) {
        ctx.save(); ctx.scale(sx, 1);
        ctx.beginPath();
        ctx.moveTo(r * 0.5, -r * 0.25); ctx.lineTo(r * 1.45, r * 0.05); ctx.lineTo(r * 1.35, r * 0.6); ctx.lineTo(r * 0.55, r * 0.5);
        ctx.closePath();
        ctx.fillStyle = metal; ctx.fill(); ctx.stroke();
        // listras de alerta na asa
        ctx.save(); ctx.clip(); ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,50,30,0.9)';
        for (let k = 0; k < 4; k++) { ctx.save(); ctx.translate(r * 0.8 + k * 7, r * 0.2); ctx.rotate(-0.6); ctx.fillRect(-2.2, -10, 4.4, 20); ctx.restore(); }
        ctx.restore();
        ctx.restore();
    }

    // fuselagem central
    ctx.beginPath();
    ctx.moveTo(0, r * 1.15);
    ctx.lineTo(r * 0.62, r * 0.45); ctx.lineTo(r * 0.55, -r * 0.85);
    ctx.lineTo(-r * 0.55, -r * 0.85); ctx.lineTo(-r * 0.62, r * 0.45);
    ctx.closePath();
    ctx.fillStyle = metal; ctx.fill(); ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(20,24,40,0.8)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(-r * 0.5, -r * 0.45); ctx.lineTo(r * 0.5, -r * 0.45); ctx.moveTo(-r * 0.5, r * 0.3); ctx.lineTo(r * 0.5, r * 0.3); ctx.stroke();

    // núcleo de combate sem piloto (losango vermelho pulsante + anel de varredura)
    const core = 0.75 + 0.25 * Math.sin(t * 1.5);
    ctx.shadowBlur = 16; ctx.shadowColor = '#ff2a2a';
    ctx.fillStyle = '#ff2a2a';
    ctx.beginPath(); ctx.moveTo(0, -r * 0.3 * core); ctx.lineTo(r * 0.24 * core, 0); ctx.lineTo(0, r * 0.3 * core); ctx.lineTo(-r * 0.24 * core, 0); ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath(); ctx.arc(0, 0, r * 0.07, 0, Math.PI * 2); ctx.fill();

    // luzes de alerta nas pontas das asas, alternadas
    for (const [sx, on] of [[-1, leftOn], [1, !leftOn]]) {
        ctx.fillStyle = on ? '#ff3030' : '#5a1010';
        ctx.shadowBlur = on ? 16 : 0; ctx.shadowColor = '#ff2a2a';
        ctx.beginPath(); ctx.arc(sx * r * 1.3, r * 0.3, 3.4, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
};

/* ---------- Obstáculos agora machucam (só quando o visual diz "perigo") ---------- */
function checkObstacleContact(diff) {
    if (!player || player.dying || OBSTACLE_CFG.CONTACT_DAMAGE <= 0) return;
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i];
        if (Math.hypot(player.x - o.x, player.y - o.y) < player.width * 0.35 + o.radius) {
            if (player.isDashing) continue;                         // o Dash atravessa
            if (overloadActive) { damageObstacle(o, 99); continue; } // em Overload a nave destrói
            createExplosion(o.x, o.y, '#ff5a00', 25);
            obstacles.splice(i, 1);
            damagePlayer(OBSTACLE_CFG.CONTACT_DAMAGE * diff.damageMult);
            if (player.dying) return;
        }
    }
}


/* ---------- Game Over: caminho de volta ao menu (necessário para trocar de modo, ex.: Phantom) ---------- */
function initV3UI() {
    document.getElementById('gameOverMenuBtn')?.addEventListener('click', () => {
        if (gameOverScreen) gameOverScreen.classList.add('hidden');
        if (startScreen) startScreen.classList.remove('hidden');
        resetRunFx();
    });
}

/* ==========================================================================
5. LOOP E COLISÕES
========================================================================== */
let player, bullets = [], enemyBullets = [], enemies = [], particles = [], powerups = [], currentBoss = null;

function createExplosion(x, y, color, count = 15) {
    audio.playExplosion(); screenShake = Math.max(screenShake, 10);
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
    // estilhaços brilhantes
    const shards = Math.min(8, Math.floor(count / 4));
    for (let i = 0; i < shards; i++) {
        const a = Math.random() * Math.PI * 2, sp = 3 + Math.random() * 6;
        sparks.push(new Spark(x, y, { vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 18 + Math.random() * 12, size: 2, color }));
    }
    if (particles.length > 500) particles.splice(0, particles.length - 500);
    if (sparks.length > 400) sparks.splice(0, sparks.length - 400);
}

function spawnEnemies() {
    if (isBonusStage || currentBoss) return;

    if (!subBossSpawned && score >= 10000 && score < 12000) {
        subBossSpawned = true;
        currentBoss = new Boss(bossLevel, true);
        if (bossTitle) bossTitle.innerText = `ALERTA: MINI-BOSS DETECTADO`;
        if (bossHealthContainer) bossHealthContainer.classList.remove('hidden');
        audio.speak('Warning! Mini Boss!');
        enemies = []; return;
    }

    if (frameCount % 300 === 0 && Math.random() < 0.6) {
        obstacles.push(new Obstacle('ASTEROID'));
    }

    if (frameCount % 450 === 0 && Math.random() < 0.4) {
        enemies.push(new Enemy('GOLDEN'));
        triggerPowerupNotice('⚡ DRONE DOURADO DETECTADO!');
    }

    // Loot Drone: raro
    if (frameCount % 600 === 0 && Math.random() < 0.35) {
        enemies.push(new Enemy('LOOT'));
        triggerPowerupNotice('💰 LOOT DRONE DETECTADO! ATIRE NELE!');
    }

    const diff = difficultySettings[currentDifficulty];
    const rate = Math.floor(Math.max(12, 45 - (bossLevel - 1) * 5) * diff.spawnRate);

    if (frameCount % rate === 0) {
        const types = ['BASIC', 'FAST', 'KAMIKAZE', 'SHIELDED', 'CROSS'];
        enemies.push(new Enemy(types[Math.floor(Math.random() * types.length)]));
    }

    if (score >= nextBossScore) {
        currentBoss = new Boss(bossLevel, false);
        if (bossTitle) bossTitle.innerText = `ALERTA: CHEFE MK-${bossLevel} (FASE 1)`;
        if (bossHealthContainer) bossHealthContainer.classList.remove('hidden');
        if (bossHealthFill) bossHealthFill.style.width = '100%';
        audio.speak('Boss Detected!');
        enemies = []; audio.startSynthwaveMusic(true);
    }
}

function defeatBoss() {
    if (!currentBoss) return;

    createExplosion(currentBoss.x, currentBoss.y, '#ff0055', 70);

    // 🎬 Câmera lenta na vitória do Boss (não interfere na cena de morte)
    if (!(player && player.dying)) triggerSlowMotion(60);
    triggerHitstop(15);

    score += currentBoss.isSub ? 1500 : 2500 * bossLevel;
    const credits = addCredits(currentBoss.isSub ? 50 : 100 * bossLevel);
    spawnText(currentBoss.x, currentBoss.y, `+₡${credits}`, '#00ff66', 22, { life: 80 });
    addOverload(OVERLOAD_CFG.PER_BOSS_KILL);

    if (currentDifficulty === 'IMPOSSIBLE' && !currentBoss.isSub) {
        metaData.achievements.impossibleBoss = true;
        saveMetaData();
    }

    if (currentDifficulty === 'UNPLAYABLE' && !currentBoss.isSub) {
        metaData.achievements.unplayableSurvivor = true;
        saveMetaData();
    }

    onBossDefeated(currentBoss); // jackpot de moedas + estatísticas
    currentBoss = null;
    if (bossHealthContainer) bossHealthContainer.classList.add('hidden');

    nextBossScore += BOSS_INTERVAL;
    bossLevel++;

    if (!(player && player.dying)) audio.startSynthwaveMusic(false);

    // Abre a tela de cartas de melhoria (Roguelite)
    setTimeout(() => {
        showCardSelectionScreen();
    }, 1000);
}

function checkCollisions() {
    const diff = difficultySettings[currentDifficulty];

    /* ---- Tiros do jogador ---- */
    for (let bIdx = bullets.length - 1; bIdx >= 0; bIdx--) {
        const b = bullets[bIdx];
        if (!b) continue;

        let bulletDestroyed = false;
        const dmg = b.dmg * playerDmgMult();

        for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
            const e = enemies[eIdx];
            if (Math.hypot(b.x - e.x, b.y - e.y) < e.width / 2 + b.radius) {
                bullets.splice(bIdx, 1);
                bulletDestroyed = true;
                burst(b.x, b.y, '#00e5ff', 5);

                const hx = e.x, hy = e.y;
                damageEnemy(e, dmg, { crit: b.forceCrit ? true : undefined });
                if (activeRunPerks.laserChain) chainLightning(hx, hy, e, dmg);
                break;
            }
        }

        if (bulletDestroyed) continue;

        for (let oIdx = obstacles.length - 1; oIdx >= 0; oIdx--) {
            const obs = obstacles[oIdx];
            if (obs.type === 'ASTEROID' && Math.hypot(b.x - obs.x, b.y - obs.y) < obs.radius + b.radius) {
                bullets.splice(bIdx, 1);
                bulletDestroyed = true;
                damageObstacle(obs, dmg);
                break;
            }
        }

        if (bulletDestroyed) continue;

        if (currentBoss && currentBoss.hp > 0 && Math.hypot(b.x - currentBoss.x, b.y - currentBoss.y) < currentBoss.width / 2 + b.radius) {
            bullets.splice(bIdx, 1);
            burst(b.x, b.y, '#00e5ff', 5);
            ultimateEnergy = Math.min(100, ultimateEnergy + 3);
            addOverload(OVERLOAD_CFG.PER_BOSS_HIT);
            if (activeRunPerks.laserChain && frameCount % 6 === 0) chainLightning(b.x, b.y, currentBoss, dmg);
            damageBoss(dmg, { crit: b.forceCrit ? true : undefined });
        }
    }

    if (!player || player.dying) return;

    /* ---- Projéteis inimigos vs jogador ---- */
    for (let ebIdx = enemyBullets.length - 1; ebIdx >= 0; ebIdx--) {
        const eb = enemyBullets[ebIdx];
        if (!eb) continue;
        const dist = Math.hypot(player.x - eb.x, player.y - eb.y);

        // Overload: invulnerável, absorve projéteis
        if (overloadActive) {
            if (dist < player.width / 2 + eb.radius + 12) {
                burst(eb.x, eb.y, '#ffcc00', 4);
                enemyBullets.splice(ebIdx, 1);
                score += 10;
            }
            continue;
        }

        if (guardAbsorb(eb)) { enemyBullets.splice(ebIdx, 1); continue; } // Drones de Sobrevivência

        if (player.isDashing && player.perfectDashWindow > 0 && dist < player.width / 2 + eb.radius + 10) {
            enemyBullets.splice(ebIdx, 1);
            const reflected = new Bullet(eb.x, eb.y, 0, -10, true, '#ff00ff', true);
            reflected.forceCrit = true;
            bullets.push(reflected);
            player.dashCooldown = 0;
            triggerHitstop(5);
            audio.playPowerup();
            triggerPowerupNotice('⚡ PERFECT DASH! PROJÉTIL REFLETIDO!');
            spawnText(player.x, player.y - 42, 'PERFECT!', '#ff66ff', 24, { life: 60 });
            onPerfectDash(eb, dist);
            if (activeRunPerks.impactNova && !player.novaUsed) {
                player.novaUsed = true;
                spawnNova();
            }
            continue;
        }

        if (!player.isDashing) {
            if (!eb.closeCalled && dist >= player.width / 2 + eb.radius && dist < player.width / 2 + eb.radius + 6) { eb.closeCalled = true; onCloseCall(eb, dist); }
            if (dist < player.width / 2 + eb.radius) {
                createExplosion(eb.x, eb.y, eb.color, 15);
                enemyBullets.splice(ebIdx, 1);
                damagePlayer(20 * diff.damageMult);
                if (player.dying) return;
            } else if (dist < player.width / 2 + eb.radius + 18 && !eb.grazed) {
                eb.grazed = true; score += 150;
                ultimateEnergy = Math.min(100, ultimateEnergy + 2);
                addOverload(OVERLOAD_CFG.PER_GRAZE);
                metaData.stats.totalGrazes++;
                onGraze(eb, dist);
                checkAchievements();
                spawnText(player.x + (Math.random() - 0.5) * 40, player.y - 34, `GRAZE +${OVERLOAD_CFG.PER_GRAZE}%`, '#00e5ff', 13, { life: 45 });
                triggerPowerupNotice('⚡ GRAZE! +2% ULT');
            }
        }
    }

    /* ---- Inimigos vs jogador ---- */
    if (!player.isDashing) {
        for (let eIdx = enemies.length - 1; eIdx >= 0; eIdx--) {
            const e = enemies[eIdx];
            if (!e || e.type === 'LOOT') continue; // Loot Drone é inofensivo
            if (Math.hypot(player.x - e.x, player.y - e.y) < player.width / 2 + e.width / 2) {
                if (overloadActive) { onEnemyKilled(e); continue; } // atropelamento dourado
                createExplosion(e.x, e.y, e.color, 20);
                enemies.splice(eIdx, 1);
                e.dead = true;
                damagePlayer(30 * diff.damageMult);
                if (player.dying) return;
            }
        }
    }

    /* ---- Obstáculos (minas / barreiras) vs jogador ---- */
    checkObstacleContact(diff);

    /* ---- Itens ---- */
    for (let pIdx = powerups.length - 1; pIdx >= 0; pIdx--) {
        const pw = powerups[pIdx];
        if (Math.hypot(player.x - pw.x, player.y - pw.y) < player.width / 2 + pw.size) {
            const durationBonus = (metaData.upgrades.duration || 0) * 60;
            if (pw.type === 'CREDIT') {
                const v = addCredits(5);
                spawnText(pw.x, pw.y - 10, `+₡${v}`, '#ffd700', 12, { life: 35 });
                audio.playCoin();
            } else {
                audio.playPowerup();
                if (pw.type === 'HEAL') { player.health = Math.min(player.maxHealth, player.health + 35); triggerPowerupNotice('VIDA RECUPERADA (+35%)'); spawnText(pw.x, pw.y - 10, '+35 HP', '#00ff66', 16); }
                else if (pw.type === 'TRIPLE') { player.powerup = 'TRIPLE'; player.powerupTimer = 400 + durationBonus; triggerPowerupNotice('TIRO TRIPLO ATIVADO!'); }
                else if (pw.type === 'PENTA') { player.powerup = 'PENTA'; player.powerupTimer = 350 + durationBonus; triggerPowerupNotice('TIRO 5X QUÍNTUPLO ATIVADO!'); }
                else if (pw.type === 'HOMING') { player.powerup = 'HOMING'; player.powerupTimer = 400 + durationBonus; triggerPowerupNotice('MÍSSEIS PERSEGUIDORES ATIVADOS!'); }
                else if (pw.type === 'SHIELD') { player.powerup = 'SHIELD'; player.powerupTimer = 500 + durationBonus; triggerPowerupNotice('ESCUDO ATIVADO!'); }
                else if (pw.type === 'CRYSTAL') { const v = addCredits(10); triggerPowerupNotice(`CRISTAL OBTIDO (+₡${v})!`); spawnText(pw.x, pw.y - 10, `+₡${v}`, '#00ffcc', 14); }
                else if (pw.type === 'ULT_CHARGE') { ultimateEnergy = Math.min(100, ultimateEnergy + 15); triggerPowerupNotice('CARGA ULTIMATE (+15%)!'); }
            }
            powerups.splice(pIdx, 1);
        }
    }
}

/* ---------- Passo da simulação (mundo) ---------- */
function stepGame() {
    frameCount++;
    if (comboTimer > 0) { comboTimer--; if (comboTimer === 0) combo = 1; }
    if (streakTimer > 0) { streakTimer--; if (streakTimer === 0) killStreak = 0; }

    checkAdaptiveDifficulty();
    updateBonusStage();

    updateStars();
    if (player && !player.dying) player.update();

    for (let i = bullets.length - 1; i >= 0; i--) {
        const b = bullets[i]; b.update();
        if (b.y < -10 || b.y > canvas.height + 30 || b.x < -10 || b.x > canvas.width + 10) bullets.splice(i, 1);
    }
    for (let i = enemyBullets.length - 1; i >= 0; i--) {
        const eb = enemyBullets[i]; eb.update();
        if (eb.y > canvas.height + 10 || eb.y < -60 || eb.x < -30 || eb.x > canvas.width + 30) enemyBullets.splice(i, 1);
    }

    spawnEnemies();
    for (let i = enemies.length - 1; i >= 0; i--) {
        const e = enemies[i]; e.update();
        if (e.isOffscreen()) enemies.splice(i, 1);
    }
    for (let i = obstacles.length - 1; i >= 0; i--) {
        const o = obstacles[i]; o.update();
        if (o.y > canvas.height + 50) obstacles.splice(i, 1);
    }

    if (currentBoss) currentBoss.update();

    for (let i = powerups.length - 1; i >= 0; i--) {
        const p = powerups[i]; p.update();
        if (p.isOut()) powerups.splice(i, 1);
    }
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.update();
        if (p.alpha <= 0) particles.splice(i, 1);
    }
    for (let i = shockwaves.length - 1; i >= 0; i--) {
        shockwaves[i].update();
        if (shockwaves[i].done) shockwaves.splice(i, 1);
    }
    for (let i = lightnings.length - 1; i >= 0; i--) {
        lightnings[i].update();
        if (lightnings[i].life <= 0) lightnings.splice(i, 1);
    }

    updateOverloadBeam();
    checkCollisions();
    stepV2();
}

/* ---------- Efeitos que rodam em tempo real (mesmo em câmera lenta) ---------- */
function stepFx() {
    for (let i = sparks.length - 1; i >= 0; i--) {
        sparks[i].update();
        if (sparks[i].life <= 0) sparks.splice(i, 1);
    }
    for (let i = floatTexts.length - 1; i >= 0; i--) {
        floatTexts[i].update();
        if (floatTexts[i].life <= 0) floatTexts.splice(i, 1);
    }
    for (let i = ghosts.length - 1; i >= 0; i--) {
        ghosts[i].update();
        if (ghosts[i].alpha <= 0) ghosts.splice(i, 1);
    }
    if (flashAlpha > 0) flashAlpha = Math.max(0, flashAlpha - 0.04);
    updateDeathSequence();
}

function renderGame() {
    const theme = neonThemes[(bossLevel - 1) % neonThemes.length];
    ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (camZoom > 1.001) { // zoom de impacto (combos / bullet-time)
        ctx.translate(canvas.width / 2, canvas.height / 2);
        ctx.scale(camZoom, camZoom);
        ctx.translate(-canvas.width / 2, -canvas.height / 2);
        camZoom += (1 - camZoom) * 0.1;
    } else camZoom = 1;
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
        screenShake *= 0.9; if (screenShake < 0.5) screenShake = 0;
    }

    drawStars();
    drawOverloadBeam();
    drawPhantomGhost();
    ghosts.forEach(g => g.draw());
    if (player) player.draw();

    bullets.forEach(b => b.draw());
    enemyBullets.forEach(eb => eb.draw());
    enemies.forEach(e => e.draw());
    obstacles.forEach(o => o.draw());
    if (currentBoss) currentBoss.draw();
    powerups.forEach(p => p.draw());
    jackpotCoins.forEach(c => c.draw());
    particles.forEach(p => p.draw());
    shockwaves.forEach(s => s.draw());
    lightnings.forEach(l => l.draw());
    sparks.forEach(s => s.draw());
    floatTexts.forEach(t => t.draw());

    ctx.restore();

    if (flashAlpha > 0) {
        ctx.save();
        ctx.globalAlpha = Math.min(1, flashAlpha);
        ctx.fillStyle = overloadActive ? '#ffe9a0' : '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
}

function updateHud() {
    if (currentBoss) {
        if (bossTitle) {
            const phaseLabel = currentBoss.isSub ? 'MINI-BOSS' : `FASE ${currentBoss.phase}${currentBoss.phase === 3 ? ' BERSERK' : ''}`;
            bossTitle.innerText = `ALERTA: CHEFE MK-${bossLevel} (${phaseLabel})`;
        }

        if (bossHealthFill) {
            const hpPct = Math.max(0, (currentBoss.hp / currentBoss.maxHp) * 100);
            bossHealthFill.style.width = `${hpPct}%`;

            if (currentBoss.phase === 3) bossHealthFill.style.background = 'linear-gradient(90deg, #aa00ff, #ff0000)';
            else if (currentBoss.phase === 2) bossHealthFill.style.background = 'linear-gradient(90deg, #ffaa00, #ff0055)';
            else bossHealthFill.style.background = 'linear-gradient(90deg, #00ff66, #ffaa00)';
        }
    }

    if (dangerVignette && player) {
        if (player.dying || player.health / player.maxHealth <= 0.25) dangerVignette.classList.remove('hidden');
        else dangerVignette.classList.add('hidden');
    }

    if (scoreVal) scoreVal.innerText = String(Math.floor(score)).padStart(4, '0');
    if (creditsVal) creditsVal.innerText = `₡ ${metaData.credits + earnedCredits} CRÉDITOS`;
    if (healthFill && player) healthFill.style.width = `${Math.max(0, (player.health / player.maxHealth) * 100)}%`;
    if (ultFill) ultFill.style.width = `${ultimateEnergy}%`;
    if (ultPercentVal) ultPercentVal.innerText = `${Math.floor(ultimateEnergy)}%`;

    if (overloadFill) overloadFill.style.width = `${overloadActive ? (overloadTimer / OVERLOAD_CFG.DURATION_MS) * 100 : overload}%`;
    if (overloadPercentVal) {
        if (overloadActive) overloadPercentVal.innerText = `${(Math.max(0, overloadTimer) / 1000).toFixed(1)}s`;
        else if (overload >= 100) overloadPercentVal.innerText = 'PRONTO [Q]';
        else overloadPercentVal.innerText = `${Math.floor(overload)}%`;
    }
    if (overloadBox) {
        overloadBox.classList.toggle('active', overloadActive);
        overloadBox.classList.toggle('ready', !overloadActive && overload >= 100);
    }

    if (comboBadge) {
        if (combo > 1) { comboBadge.innerText = `x${combo.toFixed(1)} COMBO`; comboBadge.classList.remove('hidden'); }
        else comboBadge.classList.add('hidden');
    }
}

function gameLoop(ts) {
    if (!gameActive || isPaused) return;
    rafId = null;

    const now = ts || performance.now();
    if (!lastTs) lastTs = now;
    const dtMs = Math.min(50, now - lastTs);
    lastTs = now;

    if (hitstopFrames > 0) {
        hitstopFrames--;
        rafId = requestAnimationFrame(gameLoop);
        return;
    }

    // Overload é contado em tempo real (6s de verdade, independente do FPS)
    if (overloadActive) {
        overloadTimer -= dtMs;
        if (overloadTimer <= 0) endOverload();
    }

    v2Tick(dtMs);
    if (worldStepAllowed()) stepGame();
    stepFx();
    renderGame();
    updateHud();

    if (gameActive) rafId = requestAnimationFrame(gameLoop);
}

/* ==========================================================================
6. TELAS, INTERFACE E INICIALIZAÇÃO
========================================================================== */
function resetRunFx() {
    overload = 0; overloadActive = false; overloadTimer = 0;
    killStreak = 0; streakTimer = 0; lastCallTime = 0;
    deathSeq = null; flashAlpha = 0; slowAccum = 0;
    ghosts = []; sparks = []; floatTexts = []; shockwaves = []; lightnings = [];
    if (wrapper) wrapper.classList.remove('overload-active');
    if (comboAnnouncer) comboAnnouncer.classList.remove('show');
    resetV2Fx();
}

function startGame(isDaily = false) {
    audio.init(); score = 0; earnedCredits = 0; combo = 1; comboTimer = 0; bossLevel = 1;
    nextBossScore = BOSS_INTERVAL; currentBoss = null; isPaused = false; ultimateEnergy = 0;
    isBonusStage = false; subBossSpawned = false; isDailyMode = isDaily; hitstopFrames = 0;
    slowMotionDuration = 0; slowMotionFactor = 1;
    resetRunFx();

    activeRunPerks = freshRunPerks(); runMods = freshRunMods(); runPerkLog = [];

    if (isDaily) setDifficulty('HARD');

    adaptiveLevel = 0;
    if (currentDifficulty === 'IMPOSSIBLE') nextAdaptiveMilestone = 2000;
    else if (currentDifficulty === 'UNPLAYABLE') nextAdaptiveMilestone = 1000;
    else nextAdaptiveMilestone = ADAPTIVE_STEP;

    bullets = []; enemyBullets = []; enemies = []; particles = []; powerups = []; obstacles = [];

    player = new Player();
    gameActive = true;

    if (bossHealthContainer) bossHealthContainer.classList.add('hidden');
    if (bonusNotice) bonusNotice.classList.add('hidden');
    if (pauseScreen) pauseScreen.classList.add('hidden');
    if (startScreen) startScreen.classList.add('hidden');
    if (gameOverScreen) gameOverScreen.classList.add('hidden');
    const cardModal = document.getElementById('cardSelectionModal');
    if (cardModal) cardModal.classList.add('hidden');

    v2StartRun();
    audio.startSynthwaveMusic(false);
    audio.speak('Systems Online! Good luck!');
    scheduleLoop();
}

function endGame() {
    gameActive = false; isPaused = false;
    audio.stopMusic();
    audio.speak('Game Over!');
    if (wrapper) wrapper.classList.remove('overload-active');
    metaData.credits += earnedCredits;
    saveMetaData();

    if (finalScoreText) finalScoreText.innerText = `PONTUAÇÃO FINAL: ${Math.floor(score)}`;
    if (earnedCreditsText) earnedCreditsText.innerText = `+₡ ${earnedCredits} CRÉDITOS OBTIDOS`;
    const nameBox = document.getElementById('nameInputContainer');
    if (nameBox) nameBox.style.display = 'flex'; // o campo de nome volta a aparecer a cada Game Over
    v2EndGame();
    if (gameOverScreen) gameOverScreen.classList.remove('hidden');
}

function renderShop() {
    const shopCreditsText = document.getElementById('shopCreditsText');
    if (shopCreditsText) shopCreditsText.innerText = `SEUS CRÉDITOS: ₡ ${metaData.credits}`;

    const healthCost = getUpgradeCost('health');
    const speedCost = getUpgradeCost('speed');
    const durationCost = getUpgradeCost('duration');
    const droneCost = getUpgradeCost('drone');

    document.getElementById('healthLvlText').innerText = `Nível ${(metaData.upgrades.health || 0) + 1} (+${(metaData.upgrades.health || 0) * 25} HP)`;
    document.getElementById('speedLvlText').innerText = `Nível ${(metaData.upgrades.speed || 0) + 1} (+${((metaData.upgrades.speed || 0) * 0.8).toFixed(1)} Spd)`;
    document.getElementById('durationLvlText').innerText = `Nível ${(metaData.upgrades.duration || 0) + 1} (+${metaData.upgrades.duration || 0}s)`;
    document.getElementById('droneLvlText').innerText = `Nível ${metaData.upgrades.drone || 0} (${metaData.upgrades.drone || 0} Drones)`;

    document.getElementById('buyHealthBtn').innerText = `₡ ${healthCost}`;
    document.getElementById('buySpeedBtn').innerText = `₡ ${speedCost}`;
    document.getElementById('buyDurationBtn').innerText = `₡ ${durationCost}`;
    document.getElementById('buyDroneBtn').innerText = `₡ ${droneCost}`;

    const buySkinVBtn = document.getElementById('buySkinVBtn');
    if (buySkinVBtn) buySkinVBtn.innerText = metaData.skins.vWing ? (metaData.equippedSkin === 'V_WING' ? 'EQUIPADO' : 'EQUIPAR') : '₡ 300';

    const buySkinDualBtn = document.getElementById('buySkinDualBtn');
    if (buySkinDualBtn) buySkinDualBtn.innerText = metaData.skins.dualWing ? (metaData.equippedSkin === 'DUAL_WING' ? 'EQUIPADO' : 'EQUIPAR') : '₡ 600';

    renderShopExtras(); // árvore de drones e lasers
}

function buyUpgrade(type) {
    const cost = getUpgradeCost(type);
    if (metaData.credits >= cost) {
        metaData.credits -= cost;
        metaData.upgrades[type] = (metaData.upgrades[type] || 0) + 1;
        saveMetaData(); renderShop();
    }
}

function handleSkinBuyOrEquip(skinKey, cost) {
    if (skinKey === 'V_WING') {
        if (metaData.skins.vWing) metaData.equippedSkin = metaData.equippedSkin === 'V_WING' ? 'DEFAULT' : 'V_WING';
        else if (metaData.credits >= cost) { metaData.credits -= cost; metaData.skins.vWing = true; metaData.equippedSkin = 'V_WING'; }
    } else if (skinKey === 'DUAL_WING') {
        if (metaData.skins.dualWing) metaData.equippedSkin = metaData.equippedSkin === 'DUAL_WING' ? 'DEFAULT' : 'DUAL_WING';
        else if (metaData.credits >= cost) { metaData.credits -= cost; metaData.skins.dualWing = true; metaData.equippedSkin = 'DUAL_WING'; }
    }
    saveMetaData(); renderShop();
}

function renderAchievements() {
    const achievementsList = document.getElementById('achievementsList');
    if (!achievementsList) return;
    achievementsList.innerHTML = `
        <div class="shop-item">
            <div><strong>MESTRE DO GRAZE</strong><div class="shop-desc">Fazer 50 Grazes (${metaData.stats.totalGrazes}/50)</div></div>
            <button class="btn-shop">${metaData.achievements.grazeMaster ? 'CONCLUÍDO' : '₡ 200'}</button>
        </div>
        <div class="shop-item">
            <div><strong>DESTRUIÇÃO TOTAL</strong><div class="shop-desc">Usar Ultimate 3 vezes</div></div>
            <button class="btn-shop">${metaData.achievements.ultSpammer ? 'CONCLUÍDO' : '₡ 300'}</button>
        </div>
        <div class="shop-item">
            <div><strong>SOBREVIVENTE IMPOSSÍVEL</strong><div class="shop-desc">Derrotar Chefe no Impossível</div></div>
            <button class="btn-shop">${metaData.achievements.impossibleBoss ? 'CONCLUÍDO' : '₡ 500'}</button>
        </div>
        <div class="shop-item">
            <div><strong>LENDÁRIO INJOGÁVEL</strong><div class="shop-desc">Derrotar Chefe no modo Injogável</div></div>
            <button class="btn-shop">${metaData.achievements.unplayableSurvivor ? 'CONCLUÍDO' : '₡ 1000'}</button>
        </div>
    `;
}

function renderLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '';
    metaData.leaderboard.sort((a, b) => b.score - a.score);
    const top5 = metaData.leaderboard.slice(0, 5);
    if (top5.length === 0) { leaderboardList.innerHTML = '<div style="color:#a0a0c0;">NENHUM RECORDE REGISTADO</div>'; return; }
    top5.forEach((entry, idx) => {
        const row = document.createElement('div'); row.className = 'leader-row';
        row.innerHTML = `<span>#${idx + 1} ${entry.name}</span><span>${entry.score} PTS</span>`;
        leaderboardList.appendChild(row);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    if (canvas) ctx = canvas.getContext('2d');
    wrapper = document.getElementById('game-wrapper');
    dangerVignette = document.getElementById('dangerVignette');

    scoreVal = document.getElementById('scoreVal');
    creditsVal = document.getElementById('creditsVal');
    healthFill = document.getElementById('healthFill');
    ultFill = document.getElementById('ultFill');
    ultPercentVal = document.getElementById('ultPercentVal');
    comboBadge = document.getElementById('comboBadge');
    overloadBox = document.getElementById('overloadBox');
    overloadFill = document.getElementById('overloadFill');
    overloadPercentVal = document.getElementById('overloadPercentVal');
    overloadLabel = document.getElementById('overloadLabel');
    comboAnnouncer = document.getElementById('comboAnnouncer');

    startScreen = document.getElementById('startScreen');
    pauseScreen = document.getElementById('pauseScreen');
    gameOverScreen = document.getElementById('gameOverScreen');
    shopScreen = document.getElementById('shopScreen');
    achievementsScreen = document.getElementById('achievementsScreen');
    leaderboardScreen = document.getElementById('leaderboardScreen');

    finalScoreText = document.getElementById('finalScoreText');
    earnedCreditsText = document.getElementById('earnedCreditsText');
    powerupNotice = document.getElementById('powerupNotice');

    bossHealthContainer = document.getElementById('bossHealthContainer');
    bossHealthFill = document.getElementById('bossHealthFill');
    bossTitle = document.getElementById('bossTitle');
    bonusNotice = document.getElementById('bonusNotice');
    bonusTimerVal = document.getElementById('bonusTimerVal');
    soundToggleBtn = document.getElementById('soundToggleBtn');

    setDifficulty(currentDifficulty);

    document.querySelectorAll('.btn-diff').forEach(btn => {
        btn.addEventListener('click', (e) => setDifficulty(e.target.getAttribute('data-diff')));
    });

    resize(); window.addEventListener('resize', resize); initStars();

    window.addEventListener('keydown', e => {
        if (e.code === 'Space') { e.preventDefault(); return; }
        keys[e.code] = true;
        if (e.code === 'KeyP') togglePause();
        if (e.code === 'KeyE') triggerUltimate();
        if (e.code === 'KeyQ') activateOverload();
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') if (player) player.dash();
    });

    window.addEventListener('keyup', e => { if (e.code === 'Space') e.preventDefault(); keys[e.code] = false; });

    document.getElementById('hudPauseBtn')?.addEventListener('click', togglePause);
    document.getElementById('dashBtn')?.addEventListener('click', () => { if (player) player.dash(); });
    document.getElementById('ultBtn')?.addEventListener('click', triggerUltimate);
    if (overloadBox) overloadBox.addEventListener('click', activateOverload);
    document.getElementById('startBtn')?.addEventListener('click', () => { phantomMode = false; startGame(false); });
    document.getElementById('dailyBtn')?.addEventListener('click', () => { phantomMode = false; startGame(true); });
    document.getElementById('restartBtn')?.addEventListener('click', () => startGame(false));
    document.getElementById('resumeBtn')?.addEventListener('click', togglePause);
    if (soundToggleBtn) soundToggleBtn.addEventListener('click', toggleSound);

    document.getElementById('quitBtn')?.addEventListener('click', () => {
        gameActive = false; isPaused = false; audio.stopMusic();
        resetRunFx();
        pauseScreen.classList.add('hidden'); startScreen.classList.remove('hidden');
    });

    document.getElementById('shopBtn')?.addEventListener('click', () => {
        renderShop(); startScreen.classList.add('hidden'); shopScreen.classList.remove('hidden');
    });

    document.getElementById('closeShopBtn')?.addEventListener('click', () => {
        shopScreen.classList.add('hidden'); startScreen.classList.remove('hidden');
    });

    document.getElementById('achievementsBtn')?.addEventListener('click', () => {
        renderAchievements(); startScreen.classList.add('hidden'); achievementsScreen.classList.remove('hidden');
    });

    document.getElementById('closeAchievementsBtn')?.addEventListener('click', () => {
        achievementsScreen.classList.add('hidden'); startScreen.classList.remove('hidden');
    });

    document.getElementById('buyHealthBtn')?.addEventListener('click', () => buyUpgrade('health'));
    document.getElementById('buySpeedBtn')?.addEventListener('click', () => buyUpgrade('speed'));
    document.getElementById('buyDurationBtn')?.addEventListener('click', () => buyUpgrade('duration'));
    document.getElementById('buyDroneBtn')?.addEventListener('click', () => buyUpgrade('drone'));
    document.getElementById('buySkinVBtn')?.addEventListener('click', () => handleSkinBuyOrEquip('V_WING', 300));
    document.getElementById('buySkinDualBtn')?.addEventListener('click', () => handleSkinBuyOrEquip('DUAL_WING', 600));

    document.getElementById('leaderboardBtn')?.addEventListener('click', () => {
        renderLeaderboard(); startScreen.classList.add('hidden'); leaderboardScreen.classList.remove('hidden');
    });

    document.getElementById('closeLeaderboardBtn')?.addEventListener('click', () => {
        leaderboardScreen.classList.add('hidden'); startScreen.classList.remove('hidden');
    });

    document.getElementById('saveScoreBtn')?.addEventListener('click', () => {
        const nameInput = document.getElementById('playerNameInput');
        const name = nameInput ? nameInput.value.trim().toUpperCase() || 'PILOTO' : 'PILOTO';
        metaData.leaderboard.push({ name, score: Math.floor(score) });
        saveMetaData();
        document.getElementById('nameInputContainer').style.display = 'none';
    });

    initV2UI();
    initV3UI();

    if (canvas) {
        canvas.addEventListener('touchstart', e => {
            const rect = canvas.getBoundingClientRect();
            touchX = e.touches[0].clientX - rect.left; touchY = e.touches[0].clientY - rect.top;
        });
        canvas.addEventListener('touchmove', e => {
            if (e.touches.length > 0) {
                const rect = canvas.getBoundingClientRect();
                touchX = e.touches[0].clientX - rect.left; touchY = e.touches[0].clientY - rect.top;
            }
        });
        canvas.addEventListener('touchend', () => { touchX = null; touchY = null; });
    }
});


/* ==========================================================================
9. MODO HISTÓRIA (CAMPAIGN): 1000 FASES DETERMINÍSTICAS
   Módulo 100% complementar. Nenhuma função, classe ou variável existente foi editada:
     - tudo o que ele precisa do jogo é feito por herança (StoryEnemy extends Enemy,
       StoryBoss extends Boss) ou por "wrappers" que só agem quando storyMode === true;
     - fora do Modo História os wrappers repassam a chamada original, sem alterar nada.
   Ajustes de balanceamento: STORY_CFG, storyScale() e as tabelas de padrões abaixo.
========================================================================== */
const STORY_CFG = {
    TOTAL_STAGES: 1000,
    BOSS_EVERY: 10,
    TITAN_EVERY: 100,
    LEAD_IN_FRAMES: 90,            // 1,5s de respiro antes da primeira onda
    REWARD_BASE: 80,               // créditos base de uma fase = REWARD_BASE + REWARD_SQRT * raiz(fase)
    REWARD_SQRT: 12,
    REWARD_BOSS_MULT: 2,           // fases de chefe/Titan pagam em dobro
    REPLAY_RATE: 0.3,              // replay paga 30% (+ bônus por estrelas novas)
    STAR_MULT: [0, 1, 1.3, 1.6],   // multiplicador do prêmio por estrelas
    STAR2_MAX_HITS: 2,             // 2 estrelas: no máximo 2 hits | 3 estrelas: nenhum hit
    FAILSAFE_FRAMES: 2400          // se algo sobrar na tela 40s após a última onda, a fase é encerrada
};

const STORY_KEY = 'cyber_story_progress';

let storyMode = false;          // true enquanto a partida atual é do Modo História
let storyLaunch = false;        // sinaliza ao wrapper de startGame que o início veio do Modo História
let storyStage = 1;
let storyState = null;          // estado da fase em andamento
let storySelected = 0;          // fase selecionada na grade
let storyTimers = [];

function storyEl(id) { return document.getElementById(id); }
function storyClamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function storyPad(n) { return String(n).padStart(3, '0'); }
function storyFmtTime(ms) {
    const s = Math.floor(ms / 1000);
    return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

/* ==========================================================================
PROGRESSO (localStorage: cyber_story_progress)
   { maxStageUnlocked, stageStars: { "1": 3, ... }, bestTimes: { "1": 41230, ... } }
========================================================================== */
function loadStoryProgress() {
    let p = {};
    try { p = JSON.parse(localStorage.getItem(STORY_KEY) || '{}') || {}; } catch (e) { p = {}; }
    const T = STORY_CFG.TOTAL_STAGES;
    const stars = {}, times = {};
    Object.keys(p.stageStars || {}).forEach(k => {
        const n = parseInt(k, 10), s = parseInt(p.stageStars[k], 10);
        if (n >= 1 && n <= T && s >= 1 && s <= 3) stars[n] = s;
    });
    Object.keys(p.bestTimes || {}).forEach(k => {
        const n = parseInt(k, 10), ms = Number(p.bestTimes[k]);
        if (n >= 1 && n <= T && ms > 0) times[n] = ms;
    });
    let max = storyClamp(parseInt(p.maxStageUnlocked, 10) || 1, 1, T);
    Object.keys(stars).forEach(k => { max = Math.max(max, Math.min(T, parseInt(k, 10) + 1)); }); // coerência
    return { maxStageUnlocked: max, stageStars: stars, bestTimes: times };
}

let storyProgress = loadStoryProgress();
metaData.story = storyProgress; // entra no objeto que o gancho de nuvem (Firebase) já recebe

function saveStoryProgress() {
    try { localStorage.setItem(STORY_KEY, JSON.stringify(storyProgress)); } catch (e) { /* sem espaço */ }
    saveMetaData(); // créditos + dispara window.onMetaDataSaved (com debounce)
}

function storyTotalStars() {
    let s = 0;
    Object.keys(storyProgress.stageStars).forEach(k => { s += storyProgress.stageStars[k]; });
    return s;
}

/* ==========================================================================
GERAÇÃO DETERMINÍSTICA (a fase X é SEMPRE idêntica)
========================================================================== */
function storyMulberry(seed) {
    let a = seed >>> 0;
    return function () {
        a = (a + 0x6D2B79F5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

function storySeed(n, salt = 0) {
    return (Math.imul(n | 0, 2654435761) ^ Math.imul((salt | 0) + 0x9E3779B9, 40503) ^ 0x5bd1e995) >>> 0;
}

function storyKind(n) {
    if (n % STORY_CFG.TITAN_EVERY === 0) return 'TITAN';
    if (n % STORY_CFG.BOSS_EVERY === 0) return 'BOSS';
    return 'NORMAL';
}

// Progressão escalar: velocidade, vida, dano e velocidade dos projéteis crescem com o número da fase
function storyScale(n) {
    const k = n - 1;
    return {
        speed: 0.85 + 1.0 * (1 - Math.exp(-k / 260)),   // 0,85x  ->  ~1,83x
        hp: 1 + Math.min(1.6, k / 400),                   // 1,0x   ->  2,6x
        dmg: 0.7 + Math.min(1.5, k / 600),                // 0,7x   ->  2,2x (dano que a nave recebe)
        bullet: 0.9 + 0.6 * (1 - Math.exp(-k / 320)),     // velocidade dos projéteis inimigos
        dens: Math.min(6, Math.floor(k / 160))            // "densidade" dos padrões de chefe
    };
}

const STORY_SECTORS = ['ALFA', 'BETA', 'GAMA', 'DELTA', 'ÉPSILON', 'ZETA', 'ÉTA', 'TETA', 'IOTA', 'KAPPA', 'LAMBDA', 'MI',
    'NI', 'XI', 'ÔMICRON', 'PI', 'RÔ', 'SIGMA', 'TAU', 'ÍPSILON', 'FI', 'QUI', 'PSI', 'ÔMEGA'];
const STORY_BOSS_PREFIX = ['VORTEX', 'NEMESIS', 'HYDRA', 'SPECTRE', 'ARACHNE', 'CERBERUS', 'PHANTOM', 'LEVIATHAN', 'OBSIDIAN', 'TEMPEST',
    'WARDEN', 'CHIMERA', 'ECLIPSE', 'BANSHEE', 'JUGGERNAUT', 'MANTIS', 'OROBOROS', 'REVENANT', 'SERAPH', 'KRAKEN'];
const STORY_BOSS_SUFFIX = ['PRIME', 'MK-II', 'OMEGA', 'X', 'ZERO', 'CORE', 'ALPHA', 'NOVA', 'REX', 'VECTOR'];
const STORY_TITAN_NAMES = ['ATLAS', 'HYPERION', 'KRONOS', 'TYPHON', 'HELIOS', 'PERSEUS', 'ARES', 'OURANOS', 'CRIOS', 'PROMETHEUS'];

const STORY_PATTERN_UNLOCK = { line: 1, column: 1, rain: 2, vee: 3, diag: 5, sine: 8, pincer: 12, cross: 14, swarm: 18, mines: 20 };

const STORY_ENEMY_BASE = {
    BASIC: { speed: 2.4, hp: 3 }, FAST: { speed: 5.2, hp: 1 }, KAMIKAZE: { speed: 4.2, hp: 1 }, SHIELDED: { speed: 1.6, hp: 5 },
    CROSS: { speed: 3.0, hp: 2 }, GOLDEN: { speed: 6.0, hp: 2 }, LOOT: { speed: 8, hp: 10 }
};

function storyPickWeighted(pool, rng) {
    let total = 0;
    pool.forEach(p => { total += p.w; });
    let r = rng() * total;
    for (const p of pool) { r -= p.w; if (r <= 0) return p.type; }
    return pool[pool.length - 1].type;
}

function storyGenWave(pat, t0, size, type, mv, rng, wave) {
    const ev = [];
    const base = { kind: 'E', t: t0, type, x: 0.5, y: -40, mv, w: wave };
    const mk = (o) => ev.push(Object.assign({}, base, o));
    const clampX = (x) => Math.max(0.06, Math.min(0.94, x));
    const amp = 55 + Math.floor(rng() * 55), ph = rng() * 6.283; // sempre consome o RNG (mantém a sequência estável)
    switch (pat) {
        case 'line':
            for (let i = 0; i < size; i++) mk({ x: size === 1 ? 0.5 : 0.08 + 0.84 * i / (size - 1), amp, ph });
            break;
        case 'column': {
            const x = 0.15 + rng() * 0.7;
            for (let i = 0; i < size; i++) mk({ t: t0 + i * 16, x, amp, ph });
            break;
        }
        case 'rain':
            for (let i = 0; i < size; i++) mk({ t: t0 + i * 9, x: 0.08 + rng() * 0.84, amp, ph });
            break;
        case 'vee': {
            const c = 0.25 + rng() * 0.5, half = Math.floor(size / 2);
            for (let k = -half; k <= half; k++) mk({ x: clampX(c + k * 0.075), y: -40 - Math.abs(k) * 34, amp, ph });
            break;
        }
        case 'diag': {
            const dir = rng() < 0.5 ? 1 : -1;
            for (let i = 0; i < size; i++) {
                const f = size === 1 ? 0.5 : i / (size - 1);
                mk({ t: t0 + i * 13, x: dir > 0 ? 0.08 + 0.84 * f : 0.92 - 0.84 * f, amp, ph });
            }
            break;
        }
        case 'sine': {
            const x0 = 0.3 + rng() * 0.4;
            for (let i = 0; i < size; i++) mk({ t: t0 + i * 14, x: x0, mv: 'sine', amp: Math.max(amp, 80), ph, freq: 0.045 });
            break;
        }
        case 'pincer': {
            const half = Math.ceil(size / 2);
            for (let i = 0; i < half; i++) { mk({ t: t0 + i * 15, x: 0.1, amp, ph }); mk({ t: t0 + i * 15, x: 0.9, amp, ph }); }
            break;
        }
        case 'cross': {
            const side = rng() < 0.5 ? -1 : 1;
            const rows = Math.min(4, Math.max(2, Math.floor(size / 2)));
            for (let i = 0; i < rows; i++) mk({ type: 'CROSS', t: t0 + i * 40, side, yFrac: 0.08 + i * 0.1, mv: 'straight' });
            break;
        }
        case 'swarm':
            for (let i = 0; i < size; i++) mk({ type: 'KAMIKAZE', t: t0 + i * 8, x: 0.1 + rng() * 0.8, mv: 'straight' });
            break;
        case 'mines': {
            const m = 2 + Math.floor(rng() * 3);
            for (let i = 0; i < m; i++) ev.push({ kind: 'O', t: t0 + i * 22, x: 0.12 + rng() * 0.76, variant: rng() < 0.65 ? 'MINE' : 'BARRIER', w: wave });
            const half = Math.max(2, Math.floor(size / 2));
            for (let i = 0; i < half; i++) mk({ t: t0 + 40 + i * 14, x: 0.1 + 0.8 * i / Math.max(1, half - 1), amp, ph });
            break;
        }
    }
    return ev;
}

function storyBuildBoss(n, kind) {
    const titan = kind === 'TITAN';
    const idx = n / STORY_CFG.BOSS_EVERY;
    const r = storyMulberry(storySeed(n, 77));
    const t0 = ['fan', 'burst', 'rain', 'wall'];
    const t1 = ['ring', 'spiral', 'flower', 'lanes', 'homing'];
    const used = new Set();
    const pick = (chanceT1) => {
        let pool = (r() < chanceT1 ? t1 : t0).filter(x => !used.has(x));
        if (!pool.length) pool = t0.concat(t1).filter(x => !used.has(x));
        const p = pool[Math.floor(r() * pool.length)];
        used.add(p);
        return p;
    };
    const c1 = Math.min(0.9, 0.1 + n / 600);
    const p1 = [pick(0.05 + n / 1500), pick(c1 * 0.5)];
    const p2 = p1.concat([pick(c1)]).concat(titan ? [pick(c1)] : []);
    const p3 = p2.concat([pick(Math.min(0.95, c1 + 0.3))]).concat(titan ? [pick(0.9)] : []);
    const rate1 = storyClamp(Math.round(78 - n * 0.035 - (titan ? 12 : 0)), 34, 90);
    const name = titan
        ? `TITAN ${STORY_TITAN_NAMES[(n / STORY_CFG.TITAN_EVERY - 1) % STORY_TITAN_NAMES.length]}`
        : `${STORY_BOSS_PREFIX[(idx - 1) % STORY_BOSS_PREFIX.length]} ${STORY_BOSS_SUFFIX[Math.floor((idx - 1) / STORY_BOSS_PREFIX.length) % STORY_BOSS_SUFFIX.length]}`;
    return {
        titan, name,
        hp: Math.round((200 + 30 * Math.sqrt(n)) * (titan ? 2.1 : 1)),
        speed: (titan ? 1.9 : 2.4) + Math.min(1.8, n / 500),
        moveType: titan ? (idx % 2 ? 1 : 3) : idx % 4,
        hue: (idx * 47) % 360,
        sides: 5 + (idx % 4),
        turrets: 3 + (idx % 3),
        width: titan ? 176 : 112 + (idx % 4) * 8,
        height: titan ? 124 : 78 + (idx % 3) * 6,
        rates: [rate1, Math.max(20, Math.round(rate1 * 0.82)), Math.max(18, Math.round(rate1 * 0.64))],
        patterns: [p1, p2, p3]
    };
}

function storyBuildStage(n) {
    const rng = storyMulberry(storySeed(n));
    const ri = (a, b) => a + Math.floor(rng() * (b - a + 1));
    const kind = storyKind(n);
    const sc = storyScale(n);
    const FPS = 60;
    const targetSec = kind === 'NORMAL' ? ri(30, 44) : ri(12, 20);
    const interval = Math.max(2.6, 5.2 - (n - 1) * 0.0028) * (0.9 + rng() * 0.2);
    const waveCount = Math.max(kind === 'NORMAL' ? 5 : 3, Math.ceil(targetSec / interval));
    const patterns = Object.keys(STORY_PATTERN_UNLOCK).filter(k => STORY_PATTERN_UNLOCK[k] <= n);
    const pool = [{ type: 'BASIC', w: 5 }];
    if (n >= 4) pool.push({ type: 'FAST', w: 3 });
    if (n >= 8) pool.push({ type: 'SHIELDED', w: 2 });

    const baseSize = Math.min(9, 3 + Math.floor((n - 1) / 90));
    const sineChance = n >= 8 ? Math.min(0.5, 0.15 + n / 600) : 0;
    const shootChance = n >= 12 ? Math.min(0.55, (n - 8) / 260) : 0;
    const shotKinds = ['aim'];
    if (n >= 40) shotKinds.push('spread');
    if (n >= 90) shotKinds.push('ring');
    const lootWave = (n >= 5 && rng() < 0.12) ? ri(1, waveCount - 1) : -1;
    const goldWave = (n >= 10 && rng() < 0.08) ? ri(1, waveCount - 1) : -1;

    const events = [];
    let t = STORY_CFG.LEAD_IN_FRAMES;
    let last = '';
    for (let w = 0; w < waveCount; w++) {
        let pat = patterns[Math.floor(rng() * patterns.length)];
        for (let tries = 0; tries < 4 && pat === last && patterns.length > 1; tries++) pat = patterns[Math.floor(rng() * patterns.length)];
        last = pat;
        const size = Math.max(3, baseSize + ri(-1, 2));
        const type = storyPickWeighted(pool, rng);
        const mv = rng() < sineChance ? 'sine' : 'straight';
        const wave = storyGenWave(pat, t, size, type, mv, rng, w + 1);
        wave.forEach(e => {
            if (e.kind !== 'E') return;
            const canShoot = e.type !== 'CROSS' && e.type !== 'KAMIKAZE';
            const roll = rng(), kindPick = shotKinds[Math.floor(rng() * shotKinds.length)], every = ri(0, 30), off = ri(40, 80);
            if (canShoot && roll < shootChance) e.fire = { kind: kindPick, every: Math.max(70, Math.round(140 - n / 8)) + every, off };
        });
        wave.forEach(e => events.push(e));
        if (w === lootWave) events.push({ kind: 'E', type: 'LOOT', t: t + 30, dir: rng() < 0.5 ? 1 : -1, yFrac: rng(), mv: 'straight', w: w + 1 });
        if (w === goldWave) events.push({ kind: 'E', type: 'GOLDEN', t: t + 50, yFrac: rng(), mv: 'straight', w: w + 1 });
        t += Math.round(interval * FPS * (0.85 + rng() * 0.3));
    }

    events.forEach((e, i) => { e.sid = i; });
    events.sort((a, b) => a.t - b.t || a.sid - b.sid);
    const total = events.filter(e => e.kind === 'E').length;
    const lastT = events.length ? events[events.length - 1].t : 0;
    const boss = kind === 'NORMAL' ? null : storyBuildBoss(n, kind);

    return {
        n, kind, sc,
        name: boss ? boss.name : `SETOR ${STORY_SECTORS[(n - 1) % STORY_SECTORS.length]}-${n}`,
        theme: Math.floor((n - 1) / 10) % 4,
        events, waves: waveCount, total, lastT, boss,
        estSec: Math.round(lastT / 60 + (boss ? 4 + boss.hp / 16 : 7))
    };
}

const storyDefCache = new Map();
function getStoryStage(n) {
    n = storyClamp(n | 0, 1, STORY_CFG.TOTAL_STAGES);
    if (!storyDefCache.has(n)) {
        if (storyDefCache.size > 40) storyDefCache.delete(storyDefCache.keys().next().value);
        storyDefCache.set(n, storyBuildStage(n));
    }
    return storyDefCache.get(n);
}

/* ==========================================================================
INIMIGOS E OBSTÁCULOS DA HISTÓRIA
========================================================================== */
class StoryEnemy extends Enemy {
    constructor(ev, sc) {
        super(ev.type);
        const W = canvas.width, H = canvas.height;
        const base = STORY_ENEMY_BASE[ev.type] || STORY_ENEMY_BASE.BASIC;
        this.story = true;
        this.age = 0;
        this.bulletScale = sc.bullet;
        if (ev.type === 'LOOT') {
            this.dir = ev.dir;
            this.x = ev.dir === 1 ? -40 : W + 40;
            this.baseY = ev.yFrac * H * 0.45 + 70;
            this.y = this.baseY;
        } else {
            this.speed = base.speed * sc.speed;
            this.hp = Math.max(1, Math.ceil(base.hp * sc.hp));
            if (ev.type === 'CROSS') {
                this.x = ev.side < 0 ? -30 : W + 30;
                this.y = ev.yFrac * H * 0.4 + 50;
                if (ev.side > 0) this.speed = -this.speed;       // vem da direita
            } else if (ev.type === 'GOLDEN') {
                this.x = -30; this.y = ev.yFrac * H * 0.5 + 50;
            } else {
                this.x = ev.x * W; this.y = ev.y;
            }
        }
        this.x0 = this.x;
        this.mv = ev.mv || 'straight';
        this.amp = ev.amp || 0; this.freq = ev.freq || 0.045; this.ph = ev.ph || 0;
        this.fire = ev.fire || null;
    }

    update() {
        super.update();
        this.age++;
        if (this.mv === 'sine' && this.type !== 'KAMIKAZE' && this.type !== 'CROSS' && this.type !== 'GOLDEN' && this.type !== 'LOOT') {
            this.x = storyClamp(this.x0 + Math.sin(this.age * this.freq + this.ph) * this.amp, 22, canvas.width - 22);
        }
        const f = this.fire;
        if (f && player && !player.dying && this.y > 10 && this.y < canvas.height - 140 && this.age >= f.off && (this.age - f.off) % f.every === 0) this.shoot();
    }

    shoot() {
        const sp = 4.4 * this.bulletScale;
        const kind = this.fire.kind;
        const base = Math.atan2(player.y - this.y, player.x - this.x);
        if (kind === 'aim') {
            enemyBullets.push(new Bullet(this.x, this.y + 10, Math.cos(base) * sp, Math.sin(base) * sp, false, '#ff2a55'));
        } else if (kind === 'spread') {
            [-0.3, 0, 0.3].forEach(d => enemyBullets.push(new Bullet(this.x, this.y + 10, Math.cos(base + d) * sp, Math.sin(base + d) * sp, false, '#ff9a00')));
        } else {
            const o = this.age * 0.05;
            for (let i = 0; i < 8; i++) {
                const a = o + i * Math.PI / 4;
                enemyBullets.push(new Bullet(this.x, this.y, Math.cos(a) * sp * 0.75, Math.sin(a) * sp * 0.75, false, '#b04bff'));
            }
        }
    }
}

/* ==========================================================================
CHEFES DA HISTÓRIA (um por etapa; Titan a cada 100 fases)
========================================================================== */
function storyShot(b, x, y, angle, speed, color, homing) {
    const sp = Math.min(9, speed * b.sc.bullet);
    enemyBullets.push(new Bullet(x, y, Math.cos(angle) * sp, Math.sin(angle) * sp, false, color || b.bulletColor(), !!homing));
}

const STORY_PATTERNS = {
    // leque mirado no jogador
    fan(b) {
        const n = 5 + Math.min(4, b.sc.dens), spread = 1.15;
        const base = Math.atan2(player.y - b.y, player.x - b.x);
        for (let i = 0; i < n; i++) storyShot(b, b.x, b.y + b.height * 0.4, base + (i - (n - 1) / 2) * (spread / (n - 1)), 5.0);
    },
    // rajada de 4 tiros mirados em sequência
    burst(b) {
        for (let j = 0; j < 4; j++) {
            b.later(j * 7, () => {
                if (!player || player.dying) return;
                const a = Math.atan2(player.y - b.y, player.x - b.x);
                storyShot(b, b.x, b.y + b.height * 0.4, a, 5.6 + j * 0.5);
            });
        }
    },
    // chuva vinda do topo (posições sorteadas pelo RNG da fase)
    rain(b) {
        const n = 8 + b.sc.dens;
        for (let i = 0; i < n; i++) storyShot(b, b.rng() * canvas.width, -10 - i * 5, Math.PI / 2, 4.4 + b.rng() * 1.6);
    },
    // parede de projéteis com uma brecha
    wall(b) {
        const cols = 11, gap = 1 + Math.floor(b.rng() * (cols - 3));
        for (let c = 0; c < cols; c++) {
            if (c === gap || c === gap + 1) continue;
            storyShot(b, (c + 0.5) / cols * canvas.width, b.y + b.height * 0.5, Math.PI / 2, 4.0);
        }
    },
    // anel radial que alterna o deslocamento
    ring(b, k) {
        const n = 16 + 2 * b.sc.dens, off = (k % 2) * Math.PI / n;
        for (let i = 0; i < n; i++) storyShot(b, b.x, b.y, off + i * 2 * Math.PI / n, 4.0);
    },
    // espiral giratória
    spiral(b, k) {
        const arms = 2 + (b.sc.dens >= 3 ? 1 : 0);
        for (let j = 0; j < 22; j++) {
            b.later(j * 3, () => {
                for (let a = 0; a < arms; a++) storyShot(b, b.x, b.y, j * 0.34 + k * 0.7 + a * 2 * Math.PI / arms, 4.4);
            });
        }
    },
    // dois anéis com velocidades diferentes (flor)
    flower(b, k) {
        for (let r = 0; r < 2; r++) {
            const n = 10, sp = r ? 3.0 : 4.6, off = r * Math.PI / n + k * 0.25;
            for (let i = 0; i < n; i++) storyShot(b, b.x, b.y, off + i * 2 * Math.PI / n, sp);
        }
    },
    // três "raias" de tiros verticais
    lanes(b) {
        [-1, 0, 1].forEach(m => {
            const x = b.x + m * 72, y = b.y + b.height * 0.4;
            for (let j = 0; j < 7; j++) b.later(j * 7, () => storyShot(b, x, y, Math.PI / 2, 5.8));
        });
    },
    // mísseis teleguiados lentos (limitados)
    homing(b) {
        if (enemyBullets.filter(e => e.isHoming).length >= 3 + b.sc.dens) return;
        [-0.55, 0.55].forEach(d => storyShot(b, b.x, b.y + b.height * 0.4, Math.PI / 2 + d, 3.2, '#aa00ff', true));
    }
};

class StoryBoss extends Boss {
    constructor(stage, def, sc) {
        super(1, false);
        this.story = true;
        this.stage = stage; this.def = def; this.sc = sc; this.titan = def.titan;
        this.width = def.width; this.height = def.height;
        this.x = canvas.width / 2; this.y = -def.height; this.targetY = def.titan ? 125 : 100;
        this.maxHp = def.hp; this.hp = def.hp;
        this.baseSpeedX = def.speed; this.speedX = def.speed;
        this.t = 0; this.k = 0; this.queue = []; this.dirX = 1; this.tx = this.x;
        this.enraged = false;
        this.mvRng = storyMulberry(storySeed(stage, 5));
        this.startPhase(1);
    }

    startPhase(p) {
        this.phase = p;
        this.k = 0; this.attackTimer = 0; this.queue = [];
        this.rate = this.def.rates[p - 1];
        this.rng = storyMulberry(storySeed(this.stage, 1000 + p)); // mesma sequência a cada tentativa
    }

    bulletColor() {
        if (this.enraged) return '#ff2a2a';
        return ['#ff0055', '#ffaa00', '#aa00ff'][this.phase - 1];
    }

    later(frames, fn) { this.queue.push({ at: this.t + frames, fn }); }

    summon(n) {
        for (let i = 0; i < n; i++) {
            const ev = { type: 'FAST', x: (i + 1) / (n + 1), y: -30, mv: 'straight' };
            enemies.push(new StoryEnemy(ev, this.sc));
        }
    }

    move() {
        const W = canvas.width, t = this.t, spd = [1, 1.3, 1.65][this.phase - 1];
        const d = this.def;
        switch (d.moveType) {
            case 0: // patrulha lateral
                this.x += this.dirX * d.speed * spd;
                if (this.x - this.width / 2 < 10) { this.x = 10 + this.width / 2; this.dirX = 1; }
                if (this.x + this.width / 2 > W - 10) { this.x = W - 10 - this.width / 2; this.dirX = -1; }
                this.y = this.targetY + Math.sin(t * 0.04) * 10;
                break;
            case 1: // pairando em seno
                this.x = W / 2 + Math.sin(t * 0.012 * spd * (d.speed / 2.4)) * (W / 2 - this.width / 2 - 16);
                this.y = this.targetY + Math.sin(t * 0.03) * 16;
                break;
            case 2: // anda e para
                if (t % 120 === 1) this.tx = this.width / 2 + 16 + this.mvRng() * (W - this.width - 32);
                this.x += (this.tx - this.x) * 0.045 * spd;
                this.y = this.targetY;
                break;
            default: // oito
                this.x = W / 2 + Math.sin(t * 0.016 * spd) * (W * 0.33);
                this.y = this.targetY + Math.sin(t * 0.032 * spd) * 38;
        }
    }

    attack(secondary) {
        const list = this.def.patterns[this.phase - 1];
        const name = list[(secondary ? this.k + 2 : this.k) % list.length];
        if (!secondary) this.k++;
        audio.playLaser(300);
        STORY_PATTERNS[name](this, this.k);
    }

    update() {
        if (this.flash > 0) this.flash--;
        if (this.y < this.targetY) { this.y += this.titan ? 1.6 : 2; return; }
        this.t++;
        this.move();
        this.attackTimer++;
        if (player && !player.dying) {
            if (this.attackTimer % this.rate === 0) this.attack(false);
            if (this.titan && this.attackTimer % Math.round(this.rate * 1.7) === 0) this.attack(true); // segundo canhão
        }
        for (let i = this.queue.length - 1; i >= 0; i--) {
            const q = this.queue[i];
            if (this.t >= q.at) { this.queue.splice(i, 1); q.fn(); }
        }
    }

    advance(p) {
        this.startPhase(p);
        enemyBullets = [];
        triggerHitstop(10);
        screenShake = 22;
        powerups.push(new PowerUp(this.x, this.y + 40, 'HEAL'));
        this.summon(this.titan ? 5 : 3);
        if (p === 2) { audio.announce('Boss phase two', 3); triggerPowerupNotice('⚠️ CHEFE: FASE 2 - PADRÕES NOVOS!'); }
        else { audio.announce('Warning! Berserk mode', 4); triggerPowerupNotice('☠️ CHEFE: FASE 3 BERSERK!'); }
    }

    takeDamage(amount) {
        if (this.hp <= 0) return;
        this.hp -= amount;
        if (this.hp <= 0) { this.hp = 0; storyBossDefeated(this); return; }
        const pct = this.hp / this.maxHp;
        if (this.phase === 1 && pct <= 0.66) this.advance(2);
        else if (this.phase === 2 && pct <= 0.33) this.advance(3);
        if (this.titan && !this.enraged && pct <= 0.15) {
            this.enraged = true;
            this.rate = Math.max(16, Math.round(this.rate * 0.75));
            triggerPowerupNotice('🔥 TITAN ENFURECIDO!');
            audio.announce('Titan enraged', 5);
            screenShake = 25;
        }
    }

    draw() {
        const t = this.t;
        const hue = this.def.hue + (this.phase - 1) * 25;
        const flashing = this.flash > 0;
        const main = flashing ? '#ffffff' : `hsl(${hue},100%,60%)`;
        const dark = flashing ? '#ffffff' : `hsl(${hue},60%,12%)`;
        const w = this.width / 2, h = this.height / 2;
        ctx.save();
        ctx.translate(this.x, this.y);
        if (VISUAL_CFG.DANGER_AURA) drawBossAura(this);

        // anel externo girando
        ctx.save();
        ctx.rotate(t * 0.01 * (this.titan ? 1.5 : 1));
        ctx.strokeStyle = main; ctx.lineWidth = 2; ctx.setLineDash([14, 10]); ctx.shadowBlur = 14; ctx.shadowColor = main;
        ctx.beginPath(); ctx.ellipse(0, 0, w * 1.12, h * 1.18, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.restore();

        // casco poligonal
        const sides = this.def.sides;
        ctx.beginPath();
        for (let i = 0; i < sides; i++) {
            const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
            const px = Math.cos(a) * w, py = Math.sin(a) * h;
            if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fillStyle = dark; ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = main; ctx.shadowBlur = 20; ctx.shadowColor = main; ctx.stroke();

        // torretas apontando para baixo
        ctx.fillStyle = main; ctx.shadowBlur = 10;
        const tc = this.def.turrets;
        for (let i = 0; i < tc; i++) {
            const tx = tc === 1 ? 0 : -w * 0.7 + (w * 1.4) * i / (tc - 1);
            ctx.fillRect(tx - 4, h * 0.55, 8, 14 + (i % 2) * 4);
        }

        // núcleo pulsante
        const pulse = 0.8 + 0.2 * Math.sin(t * 0.15);
        const coreCol = flashing ? '#ffffff' : (this.phase === 3 || this.enraged ? '#ff2a2a' : '#ffffff');
        const g = ctx.createRadialGradient(0, 0, 2, 0, 0, h * 0.45 * pulse);
        g.addColorStop(0, coreCol); g.addColorStop(1, main);
        ctx.fillStyle = g; ctx.shadowBlur = 24; ctx.shadowColor = main;
        ctx.beginPath(); ctx.arc(0, 0, h * 0.4 * pulse, 0, Math.PI * 2); ctx.fill();

        // Titan: satélites orbitando
        if (this.titan) {
            ctx.fillStyle = main; ctx.shadowBlur = 14;
            for (let i = 0; i < 4; i++) {
                const a = t * 0.03 + i * Math.PI / 2;
                const sx = Math.cos(a) * w * 1.45, sy = Math.sin(a) * h * 1.4;
                ctx.beginPath(); ctx.moveTo(sx, sy - 8); ctx.lineTo(sx + 6, sy); ctx.lineTo(sx, sy + 8); ctx.lineTo(sx - 6, sy); ctx.closePath(); ctx.fill();
            }
        }
        ctx.restore();
    }
}

/* ==========================================================================
EXECUÇÃO DA FASE
========================================================================== */
function storyClearTimers() {
    storyTimers.forEach(t => clearTimeout(t));
    storyTimers = [];
}

function storyHideHud() {
    const hud = storyEl('storyHud');
    if (hud) hud.classList.add('hidden');
    if (wrapper) wrapper.classList.remove('story-active', 'story-clear');
}

function storyStart(n) {
    n = storyClamp(n | 0, 1, STORY_CFG.TOTAL_STAGES);
    if (n > storyProgress.maxStageUnlocked) return false;
    storyClearTimers();
    storyLaunch = true; storyMode = true; storyStage = n; phantomMode = false;
    ['storyScreen', 'storyResultModal'].forEach(id => { const el = storyEl(id); if (el) el.classList.add('hidden'); });
    startGame(false); // wrapper abaixo chama storyAfterStart()
    return true;
}

function storyAfterStart() {
    const n = storyStage, def = getStoryStage(n);
    frameCount = 0;                               // tempo da fase começa do zero: padrões idênticos
    bossLevel = (def.theme % 4) + 1;              // paleta de fundo por região
    adaptiveLevel = 0; nextAdaptiveMilestone = Infinity; // sem dificuldade adaptativa na campanha
    // O dano é definido pela fase, não pela dificuldade escolhida no menu
    runMods.dmgTaken = def.sc.dmg / difficultySettings[currentDifficulty].damageMult;
    storyState = { stage: n, def, t: 0, i: 0, active: [], resolved: 0, killed: 0, hits: 0, wave: 0, bossSpawned: false, bossDone: false, over: false };
    const hud = storyEl('storyHud');
    if (hud) hud.classList.remove('hidden');
    if (wrapper) wrapper.classList.add('story-active');
    storyHudRefresh();
    audio.announce(`Stage ${n}`, 2);
    triggerPowerupNotice(`FASE ${n} • ${def.name}`);
}

function storySpawnEvent(ev) {
    const S = storyState, W = canvas.width, sc = S.def.sc;
    S.wave = Math.max(S.wave, ev.w || 0);
    if (ev.kind === 'O') {
        const o = new Obstacle('ASTEROID');
        o.x = ev.x * W; o.y = -30; o.variant = ev.variant;
        if (ev.variant === 'BARRIER') { o.radius = 22; o.hp = 9; o.speed = 1.6 * sc.speed; }
        else { o.radius = 20; o.hp = 6; o.speed = 2 * sc.speed; }
        obstacles.push(o);
        return;
    }
    const e = new StoryEnemy(ev, sc);
    enemies.push(e);
    S.active.push(e);
}

function storyTrack(S) {
    for (let i = S.active.length - 1; i >= 0; i--) {
        const e = S.active[i];
        if (enemies.indexOf(e) !== -1) continue;
        S.active.splice(i, 1);
        S.resolved++;
        if (e.dead || !e.isOffscreen()) S.killed++; // destruído (tiro, EMP, Overload...) e não "escapou"
    }
}

function storySpawnBoss() {
    const S = storyState;
    S.bossSpawned = true;
    currentBoss = new StoryBoss(S.stage, S.def.boss, S.def.sc);
    enemyBullets = [];
    if (bossHealthContainer) bossHealthContainer.classList.remove('hidden');
    if (bossHealthFill) bossHealthFill.style.width = '100%';
    const titan = S.def.boss.titan;
    audio.announce(titan ? 'Titan detected' : 'Warning! Boss detected', titan ? 5 : 3);
    audio.startSynthwaveMusic(true);
    showComboCall(titan ? 'TITAN!' : 'BOSS!', titan ? '#ffd700' : '#ff0055', titan ? 6 : 4);
    triggerPowerupNotice(`${titan ? '👑' : '☠️'} ${S.def.boss.name}`);
}

// Chamado a cada passo do mundo (no lugar do spawn do Arcade)
function storyTick() {
    const S = storyState;
    if (!S || S.over) return;
    S.t++;
    const ev = S.def.events;
    while (S.i < ev.length && ev[S.i].t <= S.t) storySpawnEvent(ev[S.i++]);
    storyTrack(S);

    const allSpawned = S.i >= ev.length;
    if (S.def.boss) {
        if (!S.bossSpawned && allSpawned && (S.active.length === 0 || S.t > S.def.lastT + 720)) storySpawnBoss();
    } else if (allSpawned) {
        const stuck = S.t > S.def.lastT + STORY_CFG.FAILSAFE_FRAMES;
        if (stuck && S.active.length) {
            S.active.forEach(e => { burst(e.x, e.y, e.color, 8); const i = enemies.indexOf(e); if (i !== -1) enemies.splice(i, 1); });
            storyTrack(S);
        }
        if (S.active.length === 0 && player && !player.dying) storyStageClear();
    }
}

function storyProgressRatio() {
    const S = storyState;
    if (!S) return 0;
    const warm = S.def.total ? S.resolved / S.def.total : 1;
    if (!S.def.boss) return Math.min(1, warm);
    if (!S.bossSpawned) return 0.3 * warm;
    if (!currentBoss) return S.bossDone ? 1 : 0.3;
    return 0.3 + 0.7 * (1 - currentBoss.hp / currentBoss.maxHp);
}

function storyHudRefresh() {
    const S = storyState;
    if (!S) return;
    const a = storyEl('storyHudStage'), f = storyEl('storyHudFill'), s = storyEl('storyHudSub');
    if (a) a.innerText = `FASE ${storyPad(S.stage)} / ${STORY_CFG.TOTAL_STAGES}`;
    if (f) f.style.width = `${(storyProgressRatio() * 100).toFixed(1)}%`;
    if (s) {
        const where = S.bossSpawned ? (S.def.boss.titan ? '👑 TITAN' : '☠ CHEFE') : `ONDA ${Math.max(1, S.wave)}/${S.def.waves}`;
        s.innerText = `${where}  •  HITS ${S.hits}`;
    }
}

/* ---------- Recompensas e resultado ---------- */
function storyReward(n, kind, stars, firstClear, oldStars) {
    const base = (STORY_CFG.REWARD_BASE + STORY_CFG.REWARD_SQRT * Math.sqrt(n)) * (kind === 'NORMAL' ? 1 : STORY_CFG.REWARD_BOSS_MULT);
    const full = base * STORY_CFG.STAR_MULT[stars];
    if (firstClear) return Math.round(full);
    let r = full * STORY_CFG.REPLAY_RATE;
    if (stars > oldStars) r += base * 0.25 * (stars - oldStars);
    return Math.round(r);
}

function storyStarsFor(hits) {
    if (hits === 0) return 3;
    if (hits <= STORY_CFG.STAR2_MAX_HITS) return 2;
    return 1;
}

function storyFinalizeClear() {
    const S = storyState, n = S.stage, def = S.def;
    const timeMs = runStats.ms;
    const stars = storyStarsFor(S.hits);
    const prev = storyProgress.stageStars[n] || 0;
    const firstClear = prev === 0;
    const reward = storyReward(n, def.kind, stars, firstClear, prev);
    const killCredits = earnedCredits;

    storyProgress.stageStars[n] = Math.max(prev, stars);
    if (n >= storyProgress.maxStageUnlocked && n < STORY_CFG.TOTAL_STAGES) storyProgress.maxStageUnlocked = n + 1;
    const oldBest = storyProgress.bestTimes[n];
    const newBest = !oldBest || timeMs < oldBest;
    if (newBest) storyProgress.bestTimes[n] = Math.round(timeMs);

    metaData.credits += reward + killCredits;   // créditos da fase + os coletados durante a partida
    earnedCredits = 0;
    saveStoryProgress();
    saveMetaData();   // grava créditos (e o progresso da campanha, que também vive em metaData.story)

    return {
        ok: true, stage: n, kind: def.kind, name: def.name, stars, prevStars: prev, firstClear, reward, killCredits,
        timeMs, hits: S.hits, killed: S.killed, total: def.total, newBest, bestTime: storyProgress.bestTimes[n],
        last: n >= STORY_CFG.TOTAL_STAGES
    };
}

function storyStageClear() {
    const S = storyState;
    if (!S || S.over || !player || player.dying) return;
    S.over = true;
    const res = storyFinalizeClear();

    player.invuln = 1e9;                       // sem risco durante a comemoração
    enemyBullets = []; obstacles = [];
    enemies.forEach(e => burst(e.x, e.y, e.color, 8));
    enemies = [];
    triggerSlowMotion(100, 4);
    flashAlpha = 0.9; screenShake = Math.max(screenShake, 20);
    camZoom = Math.max(camZoom, 1.08);
    if (wrapper) wrapper.classList.add('story-clear');
    audio.playStageClear();
    audio.announce('Stage clear', 5);
    showComboCall('STAGE CLEAR!', '#00ffcc', 6);
    storyTimers.push(setTimeout(() => storyShowResult(res), 1900));
}

function storyBossDefeated(b) {
    const S = storyState;
    if (!S || S.over) return;
    createExplosion(b.x, b.y, '#ff0055', 70);
    createExplosion(b.x, b.y, '#ffffff', 40);
    triggerHitstop(15);
    score += 2500 * Math.ceil(S.stage / STORY_CFG.BOSS_EVERY);
    onBossDefeated(b);        // moedas do jackpot + estatísticas e metas (já existentes)
    currentBoss = null;
    if (bossHealthContainer) bossHealthContainer.classList.add('hidden');
    S.bossDone = true;
    storyStageClear();
}

function storyOnDeath() {
    const S = storyState;
    if (!S || S.over) return;
    S.over = true;
    gameActive = false; isPaused = false;
    audio.stopMusic();
    audio.playStageFail();
    audio.announce('System overload', 2);
    if (wrapper) wrapper.classList.remove('overload-active', 'bullet-time');
    metaData.credits += earnedCredits;       // como no Arcade, o que foi coletado fica com você
    const kc = earnedCredits;
    earnedCredits = 0;
    saveMetaData();
    storyShowResult({
        ok: false, stage: S.stage, kind: S.def.kind, name: S.def.name, killCredits: kc, timeMs: runStats.ms, hits: S.hits,
        killed: S.killed, total: S.def.total, pct: Math.round(storyProgressRatio() * 100)
    });
}

function storyShowResult(res) {
    const el = storyEl('storyResultModal');
    if (!el) return;
    gameActive = false; isPaused = false;
    if (pauseScreen) pauseScreen.classList.add('hidden');
    audio.stopMusic();
    if (wrapper) wrapper.classList.remove('story-clear');
    storyHudRefresh();

    const n = res.stage;
    const stat = (v, l) => `<div class="stat-cell"><div class="stat-val">${v}</div><div class="stat-label">${l}</div></div>`;
    let html;
    if (res.ok) {
        const starHtml = [1, 2, 3].map(i => `<span class="sr-star ${i <= res.stars ? 'on' : 'off'}" style="--d:${0.35 + i * 0.32}s">${i <= res.stars ? '★' : '☆'}</span>`).join('');
        const improved = !res.firstClear && res.stars > res.prevStars ? `<div class="sr-note">+${res.stars - res.prevStars} ESTRELA${res.stars - res.prevStars > 1 ? 'S' : ''} NOVA${res.stars - res.prevStars > 1 ? 'S' : ''}!</div>` : '';
        html = `
            <div class="story-result clear">
                <div class="sr-title ok">STAGE CLEAR!</div>
                <div class="sr-sub">FASE ${n} • ${res.name}${res.kind !== 'NORMAL' ? (res.kind === 'TITAN' ? ' 👑' : ' ☠') : ''}</div>
                <div class="sr-stars">${starHtml}</div>
                ${improved}
                <div class="run-stats-grid sr-grid">
                    ${stat(storyFmtTime(res.timeMs), 'TEMPO')}${stat(res.hits, 'HITS')}${stat(`${res.killed}/${res.total}`, 'ABATES')}
                </div>
                <div class="sr-credits">+₡ ${res.reward} ${res.firstClear ? 'PELA FASE' : 'REPLAY'}${res.kind !== 'NORMAL' ? ' (CHEFE x2)' : ''}</div>
                ${res.killCredits ? `<div class="sr-credits sub">+₡ ${res.killCredits} coletados na partida</div>` : ''}
                ${res.newBest ? `<div class="sr-note">⏱ NOVO RECORDE DE TEMPO: ${storyFmtTime(res.bestTime)}</div>` : `<div class="sr-note dim">RECORDE: ${storyFmtTime(res.bestTime)}</div>`}
                <div class="sr-btns">
                    ${res.last ? '<div class="sr-final">🏆 CAMPANHA CONCLUÍDA!</div>' : '<button class="btn-neon" data-sact="next">PRÓXIMA FASE</button>'}
                    <button class="btn-neon btn-secondary" data-sact="menu">MENU DE FASES</button>
                </div>
            </div>`;
        storyTimers.push(setTimeout(() => audio.playStar(0), 700));
        for (let i = 1; i < res.stars; i++) storyTimers.push(setTimeout(() => audio.playStar(i), 700 + i * 320));
    } else {
        html = `
            <div class="story-result fail">
                <div class="sr-title bad">SYSTEM OVERLOAD</div>
                <div class="sr-sub fail">MISSÃO FALHOU • FASE ${n} • ${res.name}</div>
                <div class="sr-progress"><div class="sr-progress-fill" style="width:${res.pct}%"></div></div>
                <div class="sr-sub">${res.pct}% DA FASE CONCLUÍDA</div>
                <div class="run-stats-grid sr-grid">
                    ${stat(storyFmtTime(res.timeMs), 'TEMPO')}${stat(res.hits, 'HITS')}${stat(`${res.killed}/${res.total}`, 'ABATES')}
                </div>
                ${res.killCredits ? `<div class="sr-credits sub">+₡ ${res.killCredits} coletados</div>` : ''}
                <div class="sr-tip">DICA: os padrões desta fase são sempre os mesmos. Memorize os ataques e tente de novo!</div>
                <div class="sr-btns">
                    <button class="btn-neon" data-sact="retry">TENTAR NOVAMENTE</button>
                    <button class="btn-neon btn-secondary" data-sact="menu">MENU DE FASES</button>
                </div>
            </div>`;
    }
    el.innerHTML = html;
    el.classList.remove('hidden');
}

/* ==========================================================================
WRAPPERS (agem só quando storyMode === true; fora disso repassam a chamada original)
========================================================================== */
(function installStoryWrappers() {
    const _startGame = startGame;
    startGame = function (isDaily) {
        if (storyLaunch) storyLaunch = false; else storyMode = false; // qualquer outro modo desliga a campanha
        _startGame.apply(this, arguments);
        if (storyMode) storyAfterStart(); else storyHideHud();
    };

    const _spawnEnemies = spawnEnemies;
    spawnEnemies = function () {
        if (storyMode) { storyTick(); return; }   // a campanha tem o seu próprio roteiro de ondas
        return _spawnEnemies.apply(this, arguments);
    };

    const _updateHud = updateHud;
    updateHud = function () {
        _updateHud.apply(this, arguments);
        if (!storyMode || !storyState) return;
        storyHudRefresh();
        if (currentBoss && currentBoss.story) {
            if (bossTitle) bossTitle.innerText = `${currentBoss.titan ? '👑' : '☠'} ${currentBoss.def.name} • FASE ${currentBoss.phase}${currentBoss.enraged ? ' ENFURECIDO' : ''}`;
            if (bossHealthFill) bossHealthFill.style.background = currentBoss.phase === 3 ? 'linear-gradient(90deg, #aa00ff, #ff0000)'
                : currentBoss.phase === 2 ? 'linear-gradient(90deg, #ffaa00, #ff0055)' : 'linear-gradient(90deg, #00ff66, #ffaa00)';
        }
    };

    const _endGame = endGame;
    endGame = function () {
        if (storyMode && storyState && !storyState.over) { storyOnDeath(); return; } // morte na campanha
        return _endGame.apply(this, arguments);
    };

    const _resetRunFx = resetRunFx;
    resetRunFx = function () {
        _resetRunFx.apply(this, arguments);
        storyClearTimers();
        storyHideHud();
    };

    const _onHit = onPlayerHitV2;
    onPlayerHitV2 = function () {
        if (storyMode && storyState && !storyState.over) storyState.hits++;
        return _onHit.apply(this, arguments);
    };
})();

/* ---------- Áudio da campanha (extensão do SoundSystem existente) ---------- */
SoundSystem.prototype.playStageClear = function () {
    [523, 659, 784, 1047, 1319].forEach((f, k) => {
        setTimeout(() => { this.tone('square', f, f, 0.2, 0.08); this.tone('triangle', f / 2, f / 2, 0.3, 0.1); }, k * 110);
    });
    this.noise(0.5, 0.15, 4000);
};
SoundSystem.prototype.playStageFail = function () {
    this.tone('sawtooth', 300, 40, 1.0, 0.18);
    this.noise(0.6, 0.2, 700);
};
SoundSystem.prototype.playStar = function (i) {
    this.tone('triangle', 660 + i * 220, 880 + i * 220, 0.22, 0.12);
};

/* ==========================================================================
INTERFACE: SELEÇÃO DE FASES, INFO, BOTÕES
========================================================================== */
function storyCellHtml(n) {
    const unlocked = n <= storyProgress.maxStageUnlocked;
    const stars = storyProgress.stageStars[n] || 0;
    const kind = storyKind(n);
    const cls = ['story-cell', kind.toLowerCase(), unlocked ? '' : 'locked', n === storyProgress.maxStageUnlocked ? 'current' : '',
        stars ? 'done' : '', n === storySelected ? 'selected' : ''].filter(Boolean).join(' ');
    const ico = !unlocked ? '🔒' : kind === 'TITAN' ? '👑' : kind === 'BOSS' ? '☠' : '';
    const st = unlocked ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '';
    return `<button class="${cls}" data-stage="${n}" ${unlocked ? '' : 'disabled'}><span class="sc-num">${n}</span><span class="sc-ico">${ico}</span><span class="sc-stars">${st}</span></button>`;
}

function renderStoryGrid() {
    const grid = storyEl('storyGrid');
    if (!grid) return;
    let html = '';
    for (let n = 1; n <= STORY_CFG.TOTAL_STAGES; n++) html += storyCellHtml(n);
    grid.innerHTML = html;
    const p = storyEl('storyProgressText');
    if (p) p.innerText = `FASE ATUAL: ${storyProgress.maxStageUnlocked} / ${STORY_CFG.TOTAL_STAGES}`;
    const s = storyEl('storyStarsTotal');
    if (s) s.innerText = `★ ${storyTotalStars()} / ${STORY_CFG.TOTAL_STAGES * 3}`;
}

function storyScrollTo(n) {
    const grid = storyEl('storyGrid');
    if (!grid || !grid.querySelector) return;
    const cell = grid.querySelector(`[data-stage="${n}"]`);
    if (cell) grid.scrollTop = Math.max(0, cell.offsetTop - grid.clientHeight / 2 + cell.offsetHeight / 2);
}

function storySelect(n) {
    n = storyClamp(n | 0, 1, STORY_CFG.TOTAL_STAGES);
    if (n > storyProgress.maxStageUnlocked) return;
    const grid = storyEl('storyGrid');
    if (grid && grid.querySelector) {
        const old = grid.querySelector('.story-cell.selected');
        if (old) old.classList.remove('selected');
        const cell = grid.querySelector(`[data-stage="${n}"]`);
        if (cell) cell.classList.add('selected');
    }
    storySelected = n;
    storyUpdateInfo();
}

function storyUpdateInfo() {
    const box = storyEl('storyInfo');
    if (!box) return;
    const n = storySelected || storyProgress.maxStageUnlocked;
    const def = getStoryStage(n);
    const stars = storyProgress.stageStars[n] || 0;
    const best = storyProgress.bestTimes[n];
    const first = stars === 0;
    const kindLabel = def.kind === 'TITAN' ? '👑 MEGA CHEFE (TITAN)' : def.kind === 'BOSS' ? '☠ CHEFE' : 'FASE COMUM';
    const reward = storyReward(n, def.kind, 3, first, stars);
    const rewardMin = storyReward(n, def.kind, 1, first, stars);
    box.innerHTML = `
        <div class="si-title">FASE ${n} • ${def.name}</div>
        <div class="si-line">${kindLabel} • ${def.waves} ondas • ${def.total} inimigos${def.boss ? ' + chefe' : ''} • ~${def.estSec}s</div>
        <div class="si-line">VELOCIDADE x${def.sc.speed.toFixed(2)} • VIDA x${def.sc.hp.toFixed(2)} • DANO x${def.sc.dmg.toFixed(2)}</div>
        <div class="si-line stars">${'★'.repeat(stars)}${'☆'.repeat(3 - stars)}${best ? ` • RECORDE ${storyFmtTime(best)}` : ''}</div>
        <div class="si-line">${first ? 'PRIMEIRA VEZ' : 'REPLAY'}: ₡ ${rewardMin}${reward !== rewardMin ? '–' + reward : ''}${def.kind !== 'NORMAL' ? ' (x2)' : ''}</div>
        <div class="si-rule">★ concluir • ★★ até ${STORY_CFG.STAR2_MAX_HITS} hits • ★★★ nenhum hit</div>`;
}

function openStoryMenu() {
    const scr = storyEl('storyScreen');
    if (!scr) return;
    if (startScreen) startScreen.classList.add('hidden');
    const res = storyEl('storyResultModal'); if (res) res.classList.add('hidden');
    if (!storySelected || storySelected > storyProgress.maxStageUnlocked) storySelected = storyProgress.maxStageUnlocked;
    renderStoryGrid();
    storyUpdateInfo();
    scr.classList.remove('hidden');
    storyScrollTo(storySelected);
}

function closeStoryMenu() {
    const scr = storyEl('storyScreen');
    if (scr) scr.classList.add('hidden');
    if (startScreen) startScreen.classList.remove('hidden');
}

function initStoryUI() {
    storyEl('storyBtn')?.addEventListener('click', openStoryMenu);
    storyEl('storyBackBtn')?.addEventListener('click', closeStoryMenu);
    storyEl('storyPlayBtn')?.addEventListener('click', () => storyStart(storySelected || storyProgress.maxStageUnlocked));
    storyEl('storyJumpBtn')?.addEventListener('click', () => { storySelect(storyProgress.maxStageUnlocked); storyScrollTo(storyProgress.maxStageUnlocked); });

    const grid = storyEl('storyGrid');
    if (grid) {
        grid.addEventListener('click', (e) => {
            const c = e.target.closest ? e.target.closest('.story-cell') : null;
            if (!c || c.disabled) return;
            const n = parseInt(c.getAttribute('data-stage'), 10);
            if (n === storySelected && c.classList.contains('selected')) { storyStart(n); return; } // 2º toque inicia
            storySelect(n);
        });
    }

    const modal = storyEl('storyResultModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            const b = e.target.closest ? e.target.closest('[data-sact]') : null;
            if (!b) return;
            const act = b.getAttribute('data-sact');
            if (act === 'next') storyStart(storyStage + 1);
            else if (act === 'retry') storyStart(storyStage);
            else if (act === 'menu') { storySelected = Math.min(storyStage + (storyProgress.stageStars[storyStage] ? 1 : 0), storyProgress.maxStageUnlocked); openStoryMenu(); }
        });
    }

    // Pausa -> MENU DE FASES (botão só aparece durante a campanha)
    storyEl('pauseStoryBtn')?.addEventListener('click', () => {
        gameActive = false; isPaused = false; audio.stopMusic();
        resetRunFx();
        if (pauseScreen) pauseScreen.classList.add('hidden');
        storySelected = storyStage;
        openStoryMenu();
    });
}

document.addEventListener('DOMContentLoaded', initStoryUI);
