const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

// Contenedores de interfaces
const menuScreen = document.getElementById('menu-screen');
const gameoverScreen = document.getElementById('gameover-screen');
const hud = document.getElementById('hud');
const scoreDisplay = document.getElementById('score-display');
const difficultyDisplay = document.getElementById('difficulty-display');
const timeDisplay = document.getElementById('time-display');

// Configuración de naves disponibles (Diseños vectoriales nativos)
const shipTemplates = {
    striker: {
        color: '#00ffff',
        speed: 5.5,
        fireRate: 250,
        draw: (ctx, x, y) => {
            ctx.fillStyle = '#00ffff';
            ctx.beginPath();
            ctx.moveTo(x, y - 15);
            ctx.lineTo(x - 15, y + 15);
            ctx.lineTo(x - 6, y + 8);
            ctx.lineTo(x + 6, y + 8);
            ctx.lineTo(x + 15, y + 15);
            ctx.closePath();
            ctx.fill();
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(x - 3, y - 2, 6, 6);
        }
    },
    vanguard: {
        color: '#ff00ff',
        speed: 4.5,
        fireRate: 180, // Dispara más rápido
        draw: (ctx, x, y) => {
            ctx.fillStyle = '#ff00ff';
            ctx.fillRect(x - 12, y - 5, 24, 15);
            ctx.fillRect(x - 4, y - 15, 8, 10);
            ctx.fillStyle = '#ffff00';
            ctx.fillRect(x - 16, y + 2, 4, 12);
            ctx.fillRect(x + 12, y + 2, 4, 12);
        }
    },
    phantom: {
        color: '#00ff00',
        speed: 7, // Muy veloz
        fireRate: 320,
        draw: (ctx, x, y) => {
            ctx.fillStyle = '#00ff00';
            ctx.beginPath();
            ctx.moveTo(x, y - 18);
            ctx.lineTo(x - 12, y + 5);
            ctx.lineTo(x, y);
            ctx.lineTo(x + 12, y + 5);
            ctx.closePath();
            ctx.fill();
            ctx.strokeStyle = '#fff';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(x - 12, y + 5);
            ctx.lineTo(x - 18, y + 15);
            ctx.moveTo(x + 12, y + 5);
            ctx.lineTo(x + 18, y + 15);
            ctx.stroke();
        }
    }
};

let selectedShipType = 'striker';

// Variables de estado del bucle e inputs
let gameActive = false;
let score = 0;
let startTime = 0;
let elapsedTime = 0; 
let lastTime = 0;
let keys = {};

// Entidades del juego
let player;
let bullets = [];
let enemies = [];
let particles = [];
let enemySpawnTimer = 0;

// Estrellas de fondo infinitas
let stars = [];
for (let i = 0; i < 60; i++) {
    stars.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        speed: Math.random() * 2 + 0.5,
        size: Math.random() * 2
    });
}

// Renderizar miniaturas en el menú de selección
function drawPreviews() {
    Object.keys(shipTemplates).forEach(key => {
        const c = document.getElementById(`preview-${key}`);
        const context = c.getContext('2d');
        context.clearRect(0, 0, 40, 40);
        shipTemplates[key].draw(context, 20, 20);
    });
}
drawPreviews();

// Manejo de interacción de selección en el menú
document.querySelectorAll('.ship-option').forEach(option => {
    option.addEventListener('click', (e) => {
        document.querySelectorAll('.ship-option').forEach(o => o.classList.remove('selected'));
        const target = e.currentTarget;
        target.classList.add('selected');
        selectedShipType = target.dataset.type;
    });
});

// Listeners de controles del teclado
window.addEventListener('keydown', e => keys[e.key] = true);
window.addEventListener('keyup', e => keys[e.key] = false);

// Clase del Jugador
class Player {
    constructor(type) {
        this.type = type;
        this.x = canvas.width / 2;
        this.y = canvas.height - 50;
        this.width = 30;
        this.height = 30;
        this.speed = shipTemplates[type].speed;
        this.fireRate = shipTemplates[type].fireRate;
        this.lastShot = 0;
    }

    update() {
        if (keys['ArrowLeft'] || keys['a'] || keys['A']) this.x -= this.speed;
        if (keys['ArrowRight'] || keys['d'] || keys['D']) this.x += this.speed;

        // Límites de pantalla
        if (this.x < this.width) this.x = this.width;
        if (this.x > canvas.width - this.width) this.x = canvas.width - this.width;

        // Mecánica de disparo automático al mantener presionado espacio
        if (keys[' '] && Date.now() - this.lastShot > this.fireRate) {
            bullets.push(new Bullet(this.x, this.y - 15));
            this.lastShot = Date.now();
        }
    }

    draw() {
        shipTemplates[this.type].draw(ctx, this.x, this.y);
    }
}

// Clase de los Proyectiles
class Bullet {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        this.speed = 8;
        this.radius = 3;
    }
    update() { this.y -= this.speed; }
    draw() {
        ctx.fillStyle = '#ffff00';
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fill();
    }
}

// Clase de los Enemigos Galaga con lógicas dinámicas de patrones
class Enemy {
    constructor(patternType, speedMultiplier) {
        this.width = 24;
        this.height = 24;
        this.patternType = patternType; // 'sine', 'swoop', 'zigzag'
        this.speedMultiplier = speedMultiplier;

        // Punto de origen/Generación
        this.startX = Math.random() * (canvas.width - 60) + 30;
        this.x = this.startX;
        this.y = -30;
        
        // Variables de control de trayectoria
        this.angle = 0;
        this.baseSpeed = Math.random() * 1.5 + 1;
        this.phase = Math.random() * 100; // Desfase aleatorio para romper simetrías
    }

    update() {
        this.angle += 0.04;
        this.y += this.baseSpeed * this.speedMultiplier;

        // Modificación del comportamiento según el patrón asignado
        if (this.patternType === 'sine') {
            // Movimiento senoidal estándar suave
            this.x = this.startX + Math.sin(this.angle + this.phase) * 60;
        } 
        else if (this.patternType === 'swoop') {
            // Bucles pronunciados agresivos hacia los lados
            this.x = this.startX + Math.sin(this.angle * 1.5) * 110;
        } 
        else if (this.patternType === 'zigzag') {
            // Cambios lineales agudos simulados trigonométricamente
            let offset = Math.asin(Math.sin(this.angle + this.phase)) * 70;
            this.x = this.startX + offset;
        }
    }

    draw() {
        // Renderizado vectorial del alien
        ctx.fillStyle = this.patternType === 'sine' ? '#ff3333' : 
                        this.patternType === 'swoop' ? '#ff9900' : '#cc00ff';
        
        ctx.beginPath();
        ctx.moveTo(this.x, this.y + 12);
        ctx.lineTo(this.x - 12, this.y - 4);
        ctx.lineTo(this.x - 6, this.y - 12);
        ctx.lineTo(this.x + 6, this.y - 12);
        ctx.lineTo(this.x + 12, this.y - 4);
        ctx.closePath();
        ctx.fill();

        // Ojos brillantes
        ctx.fillStyle = '#fff';
        ctx.fillRect(this.x - 5, this.y - 4, 2, 4);
        ctx.fillRect(this.x + 3, this.y - 4, 2, 4);
    }
}

// Sistema óptico de partículas explosivas
class Particle {
    constructor(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.vx = (Math.random() - 0.5) * 6;
        this.vy = (Math.random() - 0.5) * 6;
        this.alpha = 1;
    }
    update() {
        this.x += this.vx;
        this.y += this.vy;
        this.alpha -= 0.03;
    }
    draw() {
        ctx.save();
        ctx.globalAlpha = this.alpha;
        ctx.fillStyle = this.color;
        ctx.fillRect(this.x, this.y, 3, 3);
        ctx.restore();
    }
}

// Gestión y progresión de los modos temporales solicitados
function getDifficultySettings() {
    let minutes = elapsedTime / 60000;

    if (minutes < 3) {
        // Modo Fácil (0 a 3 minutos)
        return { mode: 'FÁCIL', spawnRate: 1500, speed: 1.0, patterns: ['sine'] };
    } else if (minutes < 5) {
        // Modo Medio (3 a 5 minutos)
        return { mode: 'MEDIO', spawnRate: 900, speed: 1.4, patterns: ['sine', 'zigzag'] };
    } else {
        // Modo Difícil (Infinito desde minuto 5 en adelante)
        // Escalabilidad progresiva automática cada minuto posterior para hacerlo interminable
        let extraScale = Math.min(2.5, 1 + (minutes - 5) * 0.15);
        return { mode: 'DIFICIL+', spawnRate: 500, speed: 2.0 * extraScale, patterns: ['sine', 'swoop', 'zigzag'] };
    }
}

function createExplosion(x, y, color) {
    for (let i = 0; i < 12; i++) {
        particles.push(new Particle(x, y, color));
    }
}

// Inicializador del entorno de juego limpio
function startGame() {
    score = 0;
    bullets = [];
    enemies = [];
    particles = [];
    startTime = Date.now();
    elapsedTime = 0;
    enemySpawnTimer = 0;
    
    player = new Player(selectedShipType);
    gameActive = true;

    menuScreen.classList.add('hidden');
    gameoverScreen.classList.add('hidden');
    hud.classList.remove('hidden');

    lastTime = Date.now();
    requestAnimationFrame(gameLoop);
}

function gameOver() {
    gameActive = false;
    hud.classList.add('hidden');
    gameoverScreen.classList.remove('hidden');
    
    document.getElementById('final-score').innerText = `PUNTUACIÓN: ${score.toString().padStart(5, '0')}`;
    document.getElementById('final-time').innerText = `TIEMPO DE VUELO: ${formatTime(elapsedTime)}`;
}

function formatTime(ms) {
    let totalSeconds = Math.floor(ms / 1000);
    let min = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
    let sec = (totalSeconds % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
}

// Bucle Principal del Motor Gráfico (Loop)
function gameLoop() {
    if (!gameActive) return;

    let now = Date.now();
    let dt = now - lastTime;
    lastTime = now;
    elapsedTime = now - startTime;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 1. Renderizado de Fondo Cósmico
    stars.forEach(star => {
        star.y += star.speed;
        if (star.y > canvas.height) {
            star.y = 0;
            star.x = Math.random() * canvas.width;
        }
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.fillRect(star.x, star.y, star.size, star.size);
    });

    // 2. Obtención dinámica de reglas por tiempo
    let diff = getDifficultySettings();
    difficultyDisplay.innerText = `MODO: ${diff.mode}`;
    timeDisplay.innerText = `TIEMPO: ${formatTime(elapsedTime)}`;
    scoreDisplay.innerText = `SCORE: ${score.toString().padStart(5, '0')}`;

    // Control de Spawns de enemigos en base al timer interno
    enemySpawnTimer += dt;
    if (enemySpawnTimer >= diff.spawnRate) {
        let randomPattern = diff.patterns[Math.floor(Math.random() * diff.patterns.length)];
        enemies.push(new Enemy(randomPattern, diff.speed));
        enemySpawnTimer = 0;
    }

    // 3. Actualización de Entidades
    player.update();
    player.draw();

    // Balas
    bullets.forEach((bullet, bIdx) => {
        bullet.update();
        bullet.draw();
        if (bullet.y < -10) bullets.splice(bIdx, 1);
    });

    // Partículas
    particles.forEach((p, pIdx) => {
        p.update();
        p.draw();
        if (p.alpha <= 0) particles.splice(pIdx, 1);
    });

    // Enemigos
    enemies.forEach((enemy, eIdx) => {
        enemy.update();
        enemy.draw();

        if (enemy.y > canvas.height + 20) {
            enemies.splice(eIdx, 1);
        }

        // Detector de colisión estructural: Enemigo contra el Jugador
        let distPlayer = Math.hypot(enemy.x - player.x, enemy.y - player.y);
        if (distPlayer < (enemy.width / 2 + player.width / 2)) {
            createExplosion(player.x, player.y, '#ffffff');
            createExplosion(enemy.x, enemy.y, '#ff3333');
            gameOver();
        }

        // Detector de colisión cruzada: Balas contra Enemigos
        bullets.forEach((bullet, bIdx) => {
            let distBullet = Math.hypot(enemy.x - bullet.x, enemy.y - bullet.y);
            if (distBullet < (enemy.width / 2 + bullet.radius)) {
                let explosionColor = enemy.patternType === 'sine' ? '#ff3333' : enemy.patternType === 'swoop' ? '#ff9900' : '#cc00ff';
                createExplosion(enemy.x, enemy.y, explosionColor);
                enemies.splice(eIdx, 1);
                bullets.splice(bIdx, 1);
                score += 100;
            }
        });
    });

    requestAnimationFrame(gameLoop);
}

// Eventos disparadores de arranque
document.getElementById('start-btn').addEventListener('click', startGame);
document.getElementById('restart-btn').addEventListener('click', () => {
    gameoverScreen.classList.add('hidden');
    menuScreen.classList.remove('hidden');
    drawPreviews();
});