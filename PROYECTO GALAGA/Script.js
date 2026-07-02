const canvas = document.getElementById("gameCanvas");
const ctx = canvas.getContext("2d");
const scoreElement = document.getElementById("score");

// Variables de juego
let score = 0;
let isGameOver = false;

// Objeto Jugador
const player = {
    x: 220,
    y: 530,
    width: 40,
    height: 40,
    speed: 5,
    dx: 0
};

// Arreglos para disparos y enemigos
let bullets = [];
let enemies = [];

// Controles del teclado
document.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") player.dx = -player.speed;
    if (e.key === "ArrowRight") player.dx = player.speed;
    if (e.key === " " || e.key === "Spacebar") shoot();
});

document.addEventListener("keyup", (e) => {
    if (e.key === "ArrowLeft" || e.key === "ArrowRight") player.dx = 0;
});

// Función para disparar
function shoot() {
    if (isGameOver) return;
    bullets.push({
        x: player.x + player.width / 2 - 2,
        y: player.y,
        width: 4,
        height: 10,
        speed: 7
    });
}

// Generar enemigos aleatorios
function spawnEnemy() {
    const x = Math.random() * (canvas.width - 30);
    enemies.push({
        x: x,
        y: -30,
        width: 30,
        height: 30,
        speed: 2 + Math.random() * 2 // Velocidad aleatoria
    });
}

// Lógica de colisiones (Cajas)
function detectCollision(rect1, rect2) {
    return rect1.x < rect2.x + rect2.width &&
           rect1.x + rect1.width > rect2.x &&
           rect1.y < rect2.y + rect2.height &&
           rect1.y + rect1.height > rect2.y;
}

// Bucle principal del juego
function update() {
    if (isGameOver) {
        ctx.fillStyle = "red";
        ctx.font = "40px Courier New";
        ctx.fillText("FIN DEL JUEGO", 90, canvas.height / 2);
        return; // Detiene el bucle
    }

    // Limpiar el lienzo
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Mover y dibujar jugador
    player.x += player.dx;
    // Evitar que el jugador salga de los bordes
    if (player.x < 0) player.x = 0;
    if (player.x + player.width > canvas.width) player.x = canvas.width - player.width;
    
    ctx.fillStyle = "#00ffcc";
    ctx.fillRect(player.x, player.y, player.width, player.height);

    // Mover y dibujar disparos
    for (let i = 0; i < bullets.length; i++) {
        let b = bullets[i];
        b.y -= b.speed;
        ctx.fillStyle = "#ffcc00";
        ctx.fillRect(b.x, b.y, b.width, b.height);

        // Eliminar disparos fuera de pantalla
        if (b.y < 0) {
            bullets.splice(i, 1);
            i--;
        }
    }

    // Mover y dibujar enemigos
    for (let i = 0; i < enemies.length; i++) {
        let e = enemies[i];
        e.y += e.speed;
        ctx.fillStyle = "#ff3366";
        ctx.fillRect(e.x, e.y, e.width, e.height);

        // Si un enemigo toca el fondo, pierdes
        if (e.y + e.height > canvas.height) {
            isGameOver = true;
        }

        // Comprobar colisión entre disparo y enemigo
        for (let j = 0; j < bullets.length; j++) {
            let b = bullets[j];
            if (detectCollision(b, e)) {
                // Eliminar ambos y sumar puntos
                enemies.splice(i, 1);
                bullets.splice(j, 1);
                score += 10;
                scoreElement.innerText = score;
                i--; // Ajustar índice del enemigo
                break; // Salir del bucle de disparos
            }
        }
        
        // Comprobar colisión entre enemigo y jugador
        if (enemies[i] && detectCollision(enemies[i], player)) {
            isGameOver = true;
        }
    }

    // Volver a llamar a la función para el siguiente frame
    requestAnimationFrame(update);
}

// Iniciar el juego
setInterval(spawnEnemy, 1000); // Aparece un enemigo cada segundo
update(); // Inicia el bucle visual