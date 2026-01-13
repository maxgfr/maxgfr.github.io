// Simple T-Rex runner game (offline friendly)
(function() {
    const canvas = document.getElementById('dino-canvas');
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    
    // Game constants
    const GRAVITY = 0.6;
    const JUMP_FORCE = -10;
    const GROUND_Y = canvas.height - 20;
    
    // Game state
    let dino = {
        x: 50,
        y: GROUND_Y,
        width: 40,
        height: 40,
        velocityY: 0,
        isJumping: false
    };
    
    let obstacles = [];
    let score = 0;
    let gameSpeed = 5;
    let isGameOver = false;
    let lastObstacleTime = 0;
    
    // Controls
    let keys = {};
    
    document.addEventListener('keydown', (e) => {
        keys[e.code] = true;
        if ((e.code === 'Space' || e.code === 'ArrowUp') && !dino.isJumping && !isGameOver) {
            dino.velocityY = JUMP_FORCE;
            dino.isJumping = true;
        }
        if (e.code === 'Enter' && isGameOver) {
            resetGame();
        }
    });
    
    document.addEventListener('keyup', (e) => {
        keys[e.code] = false;
    });
    
    // Touch support
    canvas.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!dino.isJumping && !isGameOver) {
            dino.velocityY = JUMP_FORCE;
            dino.isJumping = true;
        }
        if (isGameOver) {
            resetGame();
        }
    });
    
    function resetGame() {
        dino.y = GROUND_Y;
        dino.velocityY = 0;
        dino.isJumping = false;
        obstacles = [];
        score = 0;
        gameSpeed = 5;
        isGameOver = false;
        lastObstacleTime = 0;
    }
    
    function spawnObstacle() {
        const now = Date.now();
        if (now - lastObstacleTime > 1500 + Math.random() * 1000) {
            obstacles.push({
                x: canvas.width,
                y: GROUND_Y - 25,
                width: 20 + Math.random() * 20,
                height: 25 + Math.random() * 15
            });
            lastObstacleTime = now;
        }
    }
    
    function update() {
        if (isGameOver) return;
        
        // Update dino
        dino.velocityY += GRAVITY;
        dino.y += dino.velocityY;
        
        if (dino.y >= GROUND_Y) {
            dino.y = GROUND_Y;
            dino.velocityY = 0;
            dino.isJumping = false;
        }
        
        // Spawn obstacles
        spawnObstacle();
        
        // Update obstacles
        for (let i = obstacles.length - 1; i >= 0; i--) {
            obstacles[i].x -= gameSpeed;
            
            // Collision detection
            if (dino.x < obstacles[i].x + obstacles[i].width &&
                dino.x + dino.width > obstacles[i].x &&
                dino.y < obstacles[i].y + obstacles[i].height &&
                dino.y + dino.height > obstacles[i].y) {
                isGameOver = true;
            }
            
            // Remove off-screen obstacles
            if (obstacles[i].x + obstacles[i].width < 0) {
                obstacles.splice(i, 1);
                score++;
                if (score % 5 === 0) {
                    gameSpeed += 0.5;
                }
            }
        }
    }
    
    function draw() {
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw ground
        ctx.fillStyle = '#535353';
        ctx.fillRect(0, GROUND_Y, canvas.width, 2);
        
        // Draw dino
        ctx.fillStyle = isGameOver ? '#ff0000' : '#535353';
        ctx.fillRect(dino.x, dino.y, dino.width, dino.height);
        
        // Draw obstacles
        ctx.fillStyle = '#535353';
        obstacles.forEach(obs => {
            ctx.fillRect(obs.x, obs.y, obs.width, obs.height);
        });
        
        // Draw score
        ctx.fillStyle = '#535353';
        ctx.font = '20px monospace';
        ctx.fillText(`Score: ${score}`, 10, 30);
        
        // Draw game over message
        if (isGameOver) {
            ctx.fillStyle = '#ff0000';
            ctx.font = '30px monospace';
            ctx.textAlign = 'center';
            ctx.fillText('GAME OVER - Press Enter to restart', canvas.width / 2, canvas.height / 2);
        }
    }
    
    function gameLoop() {
        update();
        draw();
        requestAnimationFrame(gameLoop);
    }
    
    // Start game
    gameLoop();
})();
