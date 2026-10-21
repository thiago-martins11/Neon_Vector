/* ==========================================================================
   1. SISTEMA DE ÁUDIO SINTETIZADO E TRILHA SYNTHWAVE
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
        }
    }

    toggleMute() {
        this.muted = !this.muted;
        return this.muted;
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
            gain.connect(this.ctx.destination);
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
        osc.connect(gain); gain.connect(this.ctx.destination);
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
        noise.connect(filter); filter.connect(gain); gain.connect(this.ctx.destination);
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
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.25);
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
        osc.connect(gain); gain.connect(this.ctx.destination);
        osc.start(); osc.stop(this.ctx.currentTime + 0.6);
    }
}

const audio = new SoundSystem();

/* ==========================================================================
   2. CONFIGURAÇÃO DE DIFICULDADE E ADAPTAÇÃO DINÂMICA
   ========================================================================== */
const difficultySettings = {
    EASY: { enemySpeed: 0.65, spawnRate: 1.4, bossHp: 0.7, damageMult: 0.5 },
    MEDIUM: { enemySpeed: 1.0, spawnRate: 1.0, bossHp: 1.0, damageMult: 1.0 },
    HARD: { enemySpeed: 1.3, spawnRate: 0.8, bossHp: 1.4, damageMult: 1.25 },
    EXTREME: { enemySpeed: 1.6, spawnRate: 0.6, bossHp: 2.0, damageMult: 1.5 },
    IMPOSSIBLE: { enemySpeed: 2.1, spawnRate: 0.35, bossHp: 3.0, damageMult: 2.2 }
};

let currentDifficulty = localStorage.getItem('cyber_difficulty') || 'EASY';

// Sistema de Adaptação Dinâmica
let nextAdaptiveMilestone = 3000;
let adaptiveLevel = 0;
const ADAPTIVE_STEP = 3000;

const metaData = {
    credits: parseInt(localStorage.getItem('cyber_credits') || '0'),
    upgrades: JSON.parse(localStorage.getItem('cyber_upgrades') || '{"health":0,"speed":0,"duration":0}'),
    leaderboard: JSON.parse(localStorage.getItem('cyber_leaderboard') || '[]')
};

function saveMetaData() {
    localStorage.setItem('cyber_credits', metaData.credits);
    localStorage.setItem('cyber_upgrades', JSON.stringify(metaData.upgrades));
    localStorage.setItem('cyber_leaderboard', JSON.stringify(metaData.leaderboard));
    localStorage.setItem('cyber_difficulty', currentDifficulty);
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

const baseCosts = { health: 100, speed: 100, duration: 150 };

function getUpgradeCost(type) {
    const level = metaData.upgrades[type];
    return Math.floor(baseCosts[type] * Math.pow(1.5, level));
}

function checkAdaptiveDifficulty() {
    const step = currentDifficulty === 'IMPOSSIBLE' ? 2000 : ADAPTIVE_STEP;

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
        setTimeout(() => {
            adaptiveNotice.classList.add('hidden');
        }, 3000);
    }
}

/* ==========================================================================
   3. ENGINE PRINCIPAL DO JOGO
   ========================================================================== */
let canvas, ctx, wrapper;
let scoreVal, creditsVal, healthFill, ultFill, ultPercentVal, startScreen, gameOverScreen, pauseScreen, shopScreen, leaderboardScreen;
let finalScoreText, earnedCreditsText, powerupNotice, bossHealthContainer, bossHealthFill, bossTitle, comboBadge;
let soundToggleBtn;

let gameActive = false, isPaused = false;
let score = 0, earnedCredits = 0, combo = 1, comboTimer = 0;
let screenShake = 0, frameCount = 0;
let ultimateEnergy = 0;

const BOSS_INTERVAL = 20000;
let nextBossScore = BOSS_INTERVAL, bossLevel = 1;

const neonThemes = [
    { bg: '#080811', star: '#ffffff', accent: '#00e5ff' },
    { bg: '#110515', star: '#ff00ff', accent: '#ff007f' },
    { bg: '#05150e', star: '#00ff66', accent: '#00ffaa' },
    { bg: '#151005', star: '#ffcc00', accent: '#ffaa00' }
];

const keys = {};
let touchX = null, touchY = null;

function resize() {
    if (canvas && wrapper) {
        canvas.width = wrapper.clientWidth;
        canvas.height = wrapper.clientHeight;
    }
}

function triggerUltimate() {
    if (!gameActive || isPaused || ultimateEnergy < 100) return;
    
    ultimateEnergy = 0;
    audio.playUlt();
    screenShake = 25;

    enemyBullets = [];

    enemies.forEach(e => {
        createExplosion(e.x, e.y, e.color, 25);
    });
    enemies = [];

    if (currentBoss) {
        currentBoss.hp -= 150;
        createExplosion(currentBoss.x, currentBoss.y, '#ff00ff', 40);
        if (currentBoss.hp <= 0) defeatBoss();
    }

    triggerPowerupNotice('BOMBA EMP ATIVADA!');
}

function togglePause() {
    if (!gameActive) return;
    isPaused = !isPaused;
    if (isPaused) {
        if (pauseScreen) pauseScreen.classList.remove('hidden');
    } else {
        if (pauseScreen) pauseScreen.classList.add('hidden');
        requestAnimationFrame(gameLoop);
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
   4. ENTIDADES DO JOGO
   ========================================================================== */
class Player {
    constructor() {
        this.width = 40; this.height = 45;
        this.x = canvas ? canvas.width / 2 : 300; 
        this.y = canvas ? canvas.height - 100 : 700;
        this.speed = 7 + metaData.upgrades.speed * 0.8;
        this.maxHealth = 100 + metaData.upgrades.health * 25;
        this.health = this.maxHealth;
        this.powerup = null; this.powerupTimer = 0; this.shootCooldown = 0;
        this.isDashing = false; this.dashTimer = 0; this.dashCooldown = 0;
    }

    dash() {
        if (this.dashCooldown === 0) {
            this.isDashing = true; this.dashTimer = 12; this.dashCooldown = 60;
            audio.playPowerup();
        }
    }

    update() {
        if (this.dashCooldown > 0) this.dashCooldown--;
        if (this.dashTimer > 0) {
            this.dashTimer--;
            if (this.dashTimer === 0) this.isDashing = false;
        }

        const currentSpeed = this.isDashing ? this.speed * 2.2 : this.speed;

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

        this.shootCooldown++;
        if (this.shootCooldown >= 8) { this.shoot(); this.shootCooldown = 0; }

        if (this.powerupTimer > 0) {
            this.powerupTimer--;
            if (this.powerupTimer === 0) { this.powerup = null; if (powerupNotice) powerupNotice.style.opacity = '0'; }
        }
    }

    shoot() {
        audio.playLaser(800);
        if (this.powerup === 'PENTA') {
            bullets.push(new Bullet(this.x, this.y - 20, 0, -12, true, '#ff00ff'));
            bullets.push(new Bullet(this.x - 12, this.y - 15, -2.5, -11.5, true, '#ff00ff'));
            bullets.push(new Bullet(this.x + 12, this.y - 15, 2.5, -11.5, true, '#ff00ff'));
            bullets.push(new Bullet(this.x - 22, this.y - 10, -5, -10.5, true, '#ff00ff'));
            bullets.push(new Bullet(this.x + 22, this.y - 10, 5, -10.5, true, '#ff00ff'));
        } else if (this.powerup === 'TRIPLE') {
            bullets.push(new Bullet(this.x, this.y - 20, 0, -12, true));
            bullets.push(new Bullet(this.x - 15, this.y - 10, -3, -11, true));
            bullets.push(new Bullet(this.x + 15, this.y - 10, 3, -11, true));
        } else {
            bullets.push(new Bullet(this.x, this.y - 20, 0, -12, true));
        }
    }

    draw() {
        ctx.save();
        ctx.translate(this.x, this.y);

        if (this.isDashing) ctx.globalAlpha = 0.5;

        if (this.powerup === 'SHIELD') {
            ctx.beginPath(); ctx.arc(0, 0, 35, 0, Math.PI * 2);
            ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 3; ctx.shadowBlur = 15; ctx.shadowColor = '#00e5ff'; ctx.stroke();
        }

        ctx.shadowBlur = 15; ctx.shadowColor = '#00e5ff';
        ctx.beginPath(); ctx.moveTo(0, -this.height / 2);
        ctx.lineTo(this.width / 2, this.height / 2); ctx.lineTo(0, this.height / 3);
        ctx.lineTo(-this.width / 2, this.height / 2); ctx.closePath();
        ctx.fillStyle = '#050508'; ctx.fill();
        ctx.strokeStyle = '#00e5ff'; ctx.lineWidth = 2.5; ctx.stroke();

        ctx.restore();
    }
}

class Bullet {
    constructor(x, y, vx, vy, isPlayer = true, color = '#00e5ff') {
        this.x = x; this.y = y; this.vx = vx; this.vy = vy;
        this.radius = isPlayer ? 3 : 5; this.isPlayer = isPlayer; this.color = color;
    }
    update() { this.x += this.vx; this.y += this.vy; }
    draw() {
        ctx.save(); ctx.beginPath(); ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color; ctx.shadowBlur = 10; ctx.shadowColor = this.color; ctx.fill(); ctx.restore();
    }
}

class Enemy {
    constructor(type) {
        this.type = type;
        this.x = type === 'CROSS' ? -30 : Math.random() * (canvas.width - 60) + 30;
        this.y = type === 'CROSS' ? Math.random() * (canvas.height * 0.4) + 50 : -40;

        const diff = difficultySettings[currentDifficulty];
        const adaptiveSpeedBoost = 1 + adaptiveLevel * 0.08; 
        const mult = (1 + (bossLevel - 1) * 0.12) * diff.enemySpeed * adaptiveSpeedBoost;

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
        } else {
            this.width = 44; this.height = 40; this.speed = (Math.random() * 1.2 + 2) * mult;
            this.hp = 3; this.color = '#ffaa00';
        }
    }

    update() {
        if (this.type === 'KAMIKAZE' && player) {
            const angle = Math.atan2(player.y - this.y, player.x - this.x);
            this.x += Math.cos(angle) * this.speed;
            this.y += Math.sin(angle) * this.speed;
        } else if (this.type === 'CROSS') {
            this.x += this.speed;
            if (frameCount % 40 === 0) enemyBullets.push(new Bullet(this.x, this.y, 0, 4, false, '#aa00ff'));
        } else {
            this.y += this.speed;
        }
    }

    draw() {
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.shadowBlur = 12; ctx.shadowColor = this.color;
        ctx.strokeStyle = this.color; ctx.lineWidth = 2; ctx.fillStyle = '#080811';

        ctx.beginPath(); ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }
}

class Boss {
    constructor(level) {
        this.level = level;
        this.width = Math.min(130, 90 + level * 5); this.height = Math.min(95, 70 + level * 4);
        this.x = canvas.width / 2; this.y = -80; this.targetY = 100;

        const diff = difficultySettings[currentDifficulty];
        const adaptiveHpBonus = 1 + adaptiveLevel * 0.12;
        this.maxHp = Math.floor((100 + level * 75) * diff.bossHp * adaptiveHpBonus); 
        this.hp = this.maxHp;
        this.speedX = Math.min(7, (3 + level * 0.7) * diff.enemySpeed * (1 + adaptiveLevel * 0.04));
        
        this.attackRate = Math.max(12, Math.floor((45 - level * 4) * diff.spawnRate * Math.max(0.6, 1 - adaptiveLevel * 0.05))); 
        this.attackTimer = 0;
        this.patternStep = 0;
    }

    update() {
        if (this.y < this.targetY) { this.y += 2; return; }
        this.x += this.speedX;
        if (this.x - this.width / 2 < 10 || this.x + this.width / 2 > canvas.width - 10) this.speedX *= -1;
        
        this.attackTimer++;
        if (this.attackTimer % this.attackRate === 0) {
            this.attack();
            this.patternStep++;
        }
    }

    attack() {
        audio.playLaser(400 - Math.min(200, this.level * 20));

        if (this.level === 1) {
            enemyBullets.push(new Bullet(this.x, this.y + 30, 0, 5.5, false, '#ff0055'));
            enemyBullets.push(new Bullet(this.x - 20, this.y + 20, -2.5, 5, false, '#ff0055'));
            enemyBullets.push(new Bullet(this.x + 20, this.y + 20, 2.5, 5, false, '#ff0055'));

        } else if (this.level === 2) {
            if (this.patternStep % 2 === 0) {
                enemyBullets.push(new Bullet(this.x - 30, this.y + 20, -3.5, 5.5, false, '#ff00ff'));
                enemyBullets.push(new Bullet(this.x + 30, this.y + 20, 3.5, 5.5, false, '#ff00ff'));
                enemyBullets.push(new Bullet(this.x - 10, this.y + 30, 0, 6, false, '#ff00ff'));
                enemyBullets.push(new Bullet(this.x + 10, this.y + 30, 0, 6, false, '#ff00ff'));
            } else {
                let angle = 0;
                if (player) angle = Math.atan2(player.y - this.y, player.x - this.x);
                const spd = 6;
                enemyBullets.push(new Bullet(this.x, this.y + 30, Math.cos(angle) * spd, Math.sin(angle) * spd, false, '#ffcc00'));
            }

        } else if (this.level === 3) {
            const count = 8 + Math.min(4, adaptiveLevel);
            const bulletSpeed = 4.5;
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i + (this.patternStep * 0.2);
                const vx = Math.cos(angle) * bulletSpeed;
                const vy = Math.sin(angle) * bulletSpeed;
                enemyBullets.push(new Bullet(this.x, this.y + 10, vx, vy, false, '#00ff66'));
            }

        } else {
            const count = 10;
            const bulletSpeed = 5 + Math.min(2, this.level * 0.3);
            
            for (let i = 0; i < count; i++) {
                const angle = (Math.PI * 2 / count) * i;
                enemyBullets.push(new Bullet(this.x, this.y, Math.cos(angle) * bulletSpeed, Math.sin(angle) * bulletSpeed, false, '#ff0055'));
            }

            if (player) {
                const anglePlayer = Math.atan2(player.y - this.y, player.x - this.x);
                enemyBullets.push(new Bullet(this.x, this.y + 20, Math.cos(anglePlayer) * (bulletSpeed + 2), Math.sin(anglePlayer) * (bulletSpeed + 2), false, '#00e5ff'));
            }
        }
    }

    draw() {
        ctx.save(); ctx.translate(this.x, this.y);
        ctx.shadowBlur = 20; ctx.shadowColor = '#ff0055'; ctx.strokeStyle = '#ff0055'; ctx.lineWidth = 3;
        ctx.strokeRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    }
}

class PowerUp {
    constructor(x, y, forceType = null) {
        this.x = x !== undefined ? x : Math.random() * (canvas.width - 60) + 30;
        this.y = y !== undefined ? y : -20;
        this.size = 22; this.speed = 2.2;
        
        if (forceType) {
            this.type = forceType;
        } else {
            const rand = Math.random();
            if (rand < 0.45) this.type = 'TRIPLE';
            else if (rand < 0.70) this.type = 'SHIELD';
            else if (rand < 0.88) this.type = 'HEAL';
            else this.type = 'PENTA';
        }
    }
    update() { this.y += this.speed; }
    draw() {
        ctx.save(); ctx.translate(this.x, this.y);
        let color = this.type === 'TRIPLE' ? '#ffcc00' : this.type === 'PENTA' ? '#ff00ff' : this.type === 'HEAL' ? '#00ff66' : '#00e5ff';
        ctx.shadowBlur = 15; ctx.shadowColor = color; ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.strokeRect(-this.size / 2, -this.size / 2, this.size, this.size);
        
        if (this.type === 'HEAL') {
            ctx.fillStyle = '#00ff66';
            ctx.fillRect(-2, -6, 4, 12);
            ctx.fillRect(-6, -2, 12, 4);
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

let stars = [];
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
    ctx.fillStyle = theme.star;
    stars.forEach(s => { ctx.globalAlpha = s.speed / 4; ctx.fillRect(s.x, s.y, s.size, s.size * 2); });
    ctx.globalAlpha = 1;
}

/* ==========================================================================
   5. LOOP E COLISÕES
   ========================================================================== */
let player, bullets = [], enemyBullets = [], enemies = [], particles = [], powerups = [], currentBoss = null;

function createExplosion(x, y, color, count = 15) {
    audio.playExplosion(); screenShake = 10;
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, color));
}

function spawnEnemies() {
    if (currentBoss) {
        if (frameCount % 180 === 0) {
            const spawnX = Math.random() * (canvas.width - 80) + 40;
            powerups.push(new PowerUp(spawnX, -20, 'HEAL'));
        }
        return;
    }

    const diff = difficultySettings[currentDifficulty];
    const baseRate = Math.max(12, 45 - (bossLevel - 1) * 5);
    const adaptiveRateBonus = Math.max(0.5, 1 - adaptiveLevel * 0.08); 
    const rate = Math.floor(baseRate * diff.spawnRate * adaptiveRateBonus);

    if (frameCount % rate === 0) {
        const types = ['BASIC', 'FAST', 'KAMIKAZE', 'SHIELDED', 'CROSS'];
        const chosen = types[Math.floor(Math.random() * types.length)];
        enemies.push(new Enemy(chosen));
    }

    if (score >= nextBossScore) {
        currentBoss = new Boss(bossLevel);
        if (bossTitle) bossTitle.innerText = `ALERTA: CHEFE MK-${bossLevel} (AMEAÇA NÍVEL ${bossLevel})`;
        if (bossHealthContainer) bossHealthContainer.classList.remove('hidden');
        enemies = [];
        audio.startSynthwaveMusic(true);
    }
}

function defeatBoss() {
    createExplosion(currentBoss.x, currentBoss.y, '#ff0055', 70);
    score += 2500 * bossLevel;
    earnedCredits += 100 * bossLevel;
    powerups.push(new PowerUp(currentBoss.x, currentBoss.y));
    currentBoss = null;
    if (bossHealthContainer) bossHealthContainer.classList.add('hidden');
    nextBossScore += BOSS_INTERVAL;
    bossLevel++;
    audio.startSynthwaveMusic(false);
}

function checkCollisions() {
    const diff = difficultySettings[currentDifficulty];

    bullets.forEach((b, bIdx) => {
        enemies.forEach((e, eIdx) => {
            if (Math.hypot(b.x - e.x, b.y - e.y) < e.width / 2 + b.radius) {
                e.hp--; bullets.splice(bIdx, 1);
                createExplosion(b.x, b.y, '#00e5ff', 5);
                if (e.hp <= 0) {
                    if (Math.random() < 0.25) powerups.push(new PowerUp(e.x, e.y));
                    createExplosion(e.x, e.y, e.color, 20);
                    score += 100 * combo; earnedCredits += 5;
                    
                    ultimateEnergy = Math.min(100, ultimateEnergy + 10);
                    
                    comboTimer = 120; combo = Math.min(5, combo + 0.2);
                    enemies.splice(eIdx, 1);
                }
            }
        });

        if (currentBoss && Math.hypot(b.x - currentBoss.x, b.y - currentBoss.y) < currentBoss.width / 2 + b.radius) {
            currentBoss.hp--; bullets.splice(bIdx, 1);
            createExplosion(b.x, b.y, '#00e5ff', 5);
            
            ultimateEnergy = Math.min(100, ultimateEnergy + 3);
            
            if (currentBoss.hp <= 0) defeatBoss();
        }
    });

    if (player && !player.isDashing) {
        enemyBullets.forEach((eb, ebIdx) => {
            if (Math.hypot(player.x - eb.x, player.y - eb.y) < player.width / 2 + eb.radius) {
                createExplosion(eb.x, eb.y, eb.color, 15); enemyBullets.splice(ebIdx, 1);
                combo = 1;
                if (player.powerup === 'SHIELD') {
                    player.powerup = null; if (powerupNotice) powerupNotice.style.opacity = '0';
                } else {
                    player.health -= 20 * diff.damageMult; if (player.health <= 0) endGame();
                }
            }
        });

        enemies.forEach((e, eIdx) => {
            if (Math.hypot(player.x - e.x, player.y - e.y) < player.width / 2 + e.width / 2) {
                createExplosion(e.x, e.y, e.color, 20); enemies.splice(eIdx, 1);
                combo = 1;
                if (player.powerup === 'SHIELD') {
                    player.powerup = null; if (powerupNotice) powerupNotice.style.opacity = '0';
                } else {
                    player.health -= 30 * diff.damageMult; if (player.health <= 0) endGame();
                }
            }
        });
    }

    if (player) {
        powerups.forEach((pw, pIdx) => {
            if (Math.hypot(player.x - pw.x, player.y - pw.y) < player.width / 2 + pw.size) {
                audio.playPowerup();
                const durationBonus = metaData.upgrades.duration * 60;

                if (pw.type === 'HEAL') {
                    player.health = Math.min(player.maxHealth, player.health + 35);
                    triggerPowerupNotice('VIDA RECUPERADA (+35%)');
                } else if (pw.type === 'TRIPLE') {
                    player.powerup = 'TRIPLE';
                    player.powerupTimer = 400 + durationBonus;
                    triggerPowerupNotice('TIRO TRIPLO ATIVADO!');
                } else if (pw.type === 'PENTA') {
                    player.powerup = 'PENTA';
                    player.powerupTimer = 350 + durationBonus;
                    triggerPowerupNotice('TIRO 5X QUÍNTUPLO ATIVADO!');
                } else if (pw.type === 'SHIELD') {
                    player.powerup = 'SHIELD';
                    player.powerupTimer = 500 + durationBonus;
                    triggerPowerupNotice('ESCUDO ATIVADO!');
                }

                powerups.splice(pIdx, 1);
            }
        });
    }
}

function gameLoop() {
    if (!gameActive || isPaused) return;
    frameCount++;
    if (comboTimer > 0) { comboTimer--; if (comboTimer === 0) combo = 1; }

    checkAdaptiveDifficulty();

    const theme = neonThemes[(bossLevel - 1) % neonThemes.length];
    ctx.fillStyle = theme.bg; ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    if (screenShake > 0) {
        ctx.translate((Math.random() - 0.5) * screenShake, (Math.random() - 0.5) * screenShake);
        screenShake *= 0.9; if (screenShake < 0.5) screenShake = 0;
    }

    updateStars(); drawStars();
    if (player) { player.update(); player.draw(); }

    bullets.forEach((b, i) => { b.update(); b.draw(); if (b.y < -10) bullets.splice(i, 1); });
    enemyBullets.forEach((eb, i) => { eb.update(); eb.draw(); if (eb.y > canvas.height + 10) enemyBullets.splice(i, 1); });

    spawnEnemies();
    enemies.forEach((e, i) => { e.update(); e.draw(); if (e.y > canvas.height + 50 || e.x > canvas.width + 50) enemies.splice(i, 1); });

    if (currentBoss) {
        currentBoss.update(); currentBoss.draw();
        if (bossHealthFill) bossHealthFill.style.width = `${Math.max(0, (currentBoss.hp / currentBoss.maxHp) * 100)}%`;
    }

    powerups.forEach((p, i) => { p.update(); p.draw(); if (p.y > canvas.height + 50) powerups.splice(i, 1); });
    particles.forEach((p, i) => { p.update(); p.draw(); if (p.alpha <= 0) particles.splice(i, 1); });

    checkCollisions();

    if (scoreVal) scoreVal.innerText = String(Math.floor(score)).padStart(4, '0');
    if (creditsVal) creditsVal.innerText = `₡ ${metaData.credits + earnedCredits} CRÉDITOS`;
    if (healthFill && player) healthFill.style.width = `${Math.max(0, (player.health / player.maxHealth) * 100)}%`;
    
    if (ultFill) ultFill.style.width = `${ultimateEnergy}%`;
    if (ultPercentVal) ultPercentVal.innerText = `${Math.floor(ultimateEnergy)}%`;

    if (comboBadge) {
        if (combo > 1) { comboBadge.innerText = `x${combo.toFixed(1)} COMBO`; comboBadge.classList.remove('hidden'); }
        else comboBadge.classList.add('hidden');
    }

    ctx.restore();
    requestAnimationFrame(gameLoop);
}

/* ==========================================================================
   6. TELAS, LOJA, RANKING E INICIALIZAÇÃO
   ========================================================================== */
function startGame() {
    audio.init(); score = 0; earnedCredits = 0; combo = 1; bossLevel = 1;
    nextBossScore = BOSS_INTERVAL; currentBoss = null; isPaused = false; ultimateEnergy = 0;

    adaptiveLevel = 0;
    nextAdaptiveMilestone = currentDifficulty === 'IMPOSSIBLE' ? 2000 : ADAPTIVE_STEP;

    bullets = []; enemyBullets = []; enemies = []; particles = []; powerups = [];
    
    player = new Player();
    gameActive = true;

    if (bossHealthContainer) bossHealthContainer.classList.add('hidden');
    if (pauseScreen) pauseScreen.classList.add('hidden');
    if (startScreen) startScreen.classList.add('hidden');
    if (gameOverScreen) gameOverScreen.classList.add('hidden');

    audio.startSynthwaveMusic(false);
    requestAnimationFrame(gameLoop);
}

function endGame() {
    gameActive = false; isPaused = false;
    audio.stopMusic();
    metaData.credits += earnedCredits;
    saveMetaData();

    if (finalScoreText) finalScoreText.innerText = `PONTUAÇÃO FINAL: ${Math.floor(score)}`;
    if (earnedCreditsText) earnedCreditsText.innerText = `+₡ ${earnedCredits} CRÉDITOS OBTIDOS`;
    if (gameOverScreen) gameOverScreen.classList.remove('hidden');
}

function renderShop() {
    const shopCreditsText = document.getElementById('shopCreditsText');
    if (shopCreditsText) shopCreditsText.innerText = `SEUS CRÉDITOS: ₡ ${metaData.credits}`;

    const healthCost = getUpgradeCost('health');
    const speedCost = getUpgradeCost('speed');
    const durationCost = getUpgradeCost('duration');

    document.getElementById('healthLvlText').innerText = `Nível ${metaData.upgrades.health} (+${metaData.upgrades.health * 25} HP)`;
    document.getElementById('speedLvlText').innerText = `Nível ${metaData.upgrades.speed} (+${(metaData.upgrades.speed * 0.8).toFixed(1)} Spd)`;
    document.getElementById('durationLvlText').innerText = `Nível ${metaData.upgrades.duration} (+${metaData.upgrades.duration}s)`;

    document.getElementById('buyHealthBtn').innerText = `₡ ${healthCost}`;
    document.getElementById('buySpeedBtn').innerText = `₡ ${speedCost}`;
    document.getElementById('buyDurationBtn').innerText = `₡ ${durationCost}`;
}

function buyUpgrade(type) {
    const cost = getUpgradeCost(type);
    if (metaData.credits >= cost) {
        metaData.credits -= cost;
        metaData.upgrades[type]++;
        saveMetaData();
        renderShop();
    }
}

function renderLeaderboard() {
    const leaderboardList = document.getElementById('leaderboardList');
    if (!leaderboardList) return;
    leaderboardList.innerHTML = '';

    metaData.leaderboard.sort((a, b) => b.score - a.score);
    const top5 = metaData.leaderboard.slice(0, 5);

    if (top5.length === 0) {
        leaderboardList.innerHTML = '<div style="color:#a0a0c0;">NENHUM RECORDE REGISTADO</div>';
        return;
    }

    top5.forEach((entry, idx) => {
        const row = document.createElement('div');
        row.className = 'leader-row';
        row.innerHTML = `<span>#${idx + 1} ${entry.name}</span><span>${entry.score} PTS</span>`;
        leaderboardList.appendChild(row);
    });
}

document.addEventListener('DOMContentLoaded', () => {
    canvas = document.getElementById('gameCanvas');
    if (canvas) ctx = canvas.getContext('2d');
    wrapper = document.getElementById('game-wrapper');

    scoreVal = document.getElementById('scoreVal');
    creditsVal = document.getElementById('creditsVal');
    healthFill = document.getElementById('healthFill');
    ultFill = document.getElementById('ultFill');
    ultPercentVal = document.getElementById('ultPercentVal');
    comboBadge = document.getElementById('comboBadge');

    startScreen = document.getElementById('startScreen');
    pauseScreen = document.getElementById('pauseScreen');
    gameOverScreen = document.getElementById('gameOverScreen');
    shopScreen = document.getElementById('shopScreen');
    leaderboardScreen = document.getElementById('leaderboardScreen');

    finalScoreText = document.getElementById('finalScoreText');
    earnedCreditsText = document.getElementById('earnedCreditsText');
    powerupNotice = document.getElementById('powerupNotice');

    bossHealthContainer = document.getElementById('bossHealthContainer');
    bossHealthFill = document.getElementById('bossHealthFill');
    bossTitle = document.getElementById('bossTitle');

    soundToggleBtn = document.getElementById('soundToggleBtn');

    setDifficulty(currentDifficulty);

    document.querySelectorAll('.btn-diff').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const diff = e.target.getAttribute('data-diff');
            setDifficulty(diff);
        });
    });

    resize();
    window.addEventListener('resize', resize);
    initStars();

    window.addEventListener('keydown', e => {
        if (e.code === 'Space') {
            e.preventDefault();
            return;
        }

        keys[e.code] = true;
        if (e.code === 'KeyP') togglePause();
        if (e.code === 'KeyE') triggerUltimate();
        if (e.code === 'ShiftLeft' || e.code === 'ShiftRight') if (player) player.dash();
    });

    window.addEventListener('keyup', e => {
        if (e.code === 'Space') {
            e.preventDefault();
            return;
        }
        keys[e.code] = false;
    });

    const hudPauseBtn = document.getElementById('hudPauseBtn');
    if (hudPauseBtn) hudPauseBtn.addEventListener('click', togglePause);

    const dashBtn = document.getElementById('dashBtn');
    if (dashBtn) dashBtn.addEventListener('click', () => { if (player) player.dash(); });

    const ultBtn = document.getElementById('ultBtn');
    if (ultBtn) ultBtn.addEventListener('click', triggerUltimate);

    const startBtn = document.getElementById('startBtn');
    if (startBtn) startBtn.addEventListener('click', startGame);

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) restartBtn.addEventListener('click', startGame);

    const resumeBtn = document.getElementById('resumeBtn');
    if (resumeBtn) resumeBtn.addEventListener('click', togglePause);

    if (soundToggleBtn) soundToggleBtn.addEventListener('click', toggleSound);

    const quitBtn = document.getElementById('quitBtn');
    if (quitBtn) {
        quitBtn.addEventListener('click', () => {
            gameActive = false; isPaused = false; audio.stopMusic();
            if (pauseScreen) pauseScreen.classList.add('hidden');
            if (startScreen) startScreen.classList.remove('hidden');
        });
    }

    const shopBtn = document.getElementById('shopBtn');
    if (shopBtn) {
        shopBtn.addEventListener('click', () => {
            renderShop();
            if (startScreen) startScreen.classList.add('hidden');
            if (shopScreen) shopScreen.classList.remove('hidden');
        });
    }

    const closeShopBtn = document.getElementById('closeShopBtn');
    if (closeShopBtn) {
        closeShopBtn.addEventListener('click', () => {
            if (shopScreen) shopScreen.classList.add('hidden');
            if (startScreen) startScreen.classList.remove('hidden');
        });
    }

    const buyHealthBtn = document.getElementById('buyHealthBtn');
    if (buyHealthBtn) buyHealthBtn.addEventListener('click', () => buyUpgrade('health'));

    const buySpeedBtn = document.getElementById('buySpeedBtn');
    if (buySpeedBtn) buySpeedBtn.addEventListener('click', () => buyUpgrade('speed'));

    const buyDurationBtn = document.getElementById('buyDurationBtn');
    if (buyDurationBtn) buyDurationBtn.addEventListener('click', () => buyUpgrade('duration'));

    const leaderboardBtn = document.getElementById('leaderboardBtn');
    if (leaderboardBtn) {
        leaderboardBtn.addEventListener('click', () => {
            renderLeaderboard();
            if (startScreen) startScreen.classList.add('hidden');
            if (leaderboardScreen) leaderboardScreen.classList.remove('hidden');
        });
    }

    const closeLeaderboardBtn = document.getElementById('closeLeaderboardBtn');
    if (closeLeaderboardBtn) {
        closeLeaderboardBtn.addEventListener('click', () => {
            if (leaderboardScreen) leaderboardScreen.classList.add('hidden');
            if (startScreen) startScreen.classList.remove('hidden');
        });
    }

    const saveScoreBtn = document.getElementById('saveScoreBtn');
    if (saveScoreBtn) {
        saveScoreBtn.addEventListener('click', () => {
            const nameInput = document.getElementById('playerNameInput');
            const name = nameInput ? nameInput.value.trim().toUpperCase() || 'PILOTO' : 'PILOTO';
            metaData.leaderboard.push({ name, score: Math.floor(score) });
            saveMetaData();
            const container = document.getElementById('nameInputContainer');
            if (container) container.style.display = 'none';
        });
    }

    if (canvas) {
        canvas.addEventListener('touchstart', e => {
            const rect = canvas.getBoundingClientRect();
            touchX = e.touches[0].clientX - rect.left;
            touchY = e.touches[0].clientY - rect.top;
        });

        canvas.addEventListener('touchmove', e => {
            if (e.touches.length > 0) {
                const rect = canvas.getBoundingClientRect();
                touchX = e.touches[0].clientX - rect.left;
                touchY = e.touches[0].clientY - rect.top;
            }
        });

        canvas.addEventListener('touchend', () => { touchX = null; touchY = null; });
    }
});
