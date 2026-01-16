// Advanced Runner Game
(function() {
    const canvas = document.getElementById('dino-canvas');
    if (!canvas) return;

    // Adjust canvas size for mobile devices to make the game appear larger (zoom in)
    if (window.innerWidth < 850) {
        // Set logical width to match specific screen width (minus padding)
        // This prevents the browser from scaling down the 850px wide canvas,
        // effectively making the game elements appear larger (1:1 pixel ratio)
        canvas.width = Math.min(window.innerWidth - 32, 850);
        // Increase height on mobile for better visibility (making it "bigger" vertically)
        canvas.height = 300;
    }

    // Config
    const CONFIG = {
        GRAVITY: 0.6,
        JUMP_FORCE: -11,
        START_SPEED: 4,
        MAX_SPEED: 25,
        SPEED_INC: 0.003,
        GroundY: canvas.height - 30,
        WATER_DRAG: 0.1
    };

    const ctx = canvas.getContext('2d');
    let frame = 0;
    
    // State
    let state = {
        isRunning: false,
        isGameOver: false,
        score: 0,
        highScore: parseInt(localStorage.getItem('runner-high-score') || '0'),
        targetSpeed: CONFIG.START_SPEED,
        currentSpeed: CONFIG.START_SPEED,
        distance: 0
    };

    // Entities
    let dino = { 
        x: 50, 
        y: CONFIG.GroundY - 47,
        w: 44, 
        h: 47, 
        vy: 0, 
        grounded: true,
        ducking: false 
    };
    
    let obstacles = [];
    let clouds = [];
    let lastObstacleTime = 0;
    let animationFrameId;

    // Input Handling
    function handleInput(e) {
        // Prevent scroll for game keys
        const isGameKey = (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'ArrowDown');
        
        if (state.isRunning && !state.isGameOver && isGameKey) {
            e.preventDefault();
        }

        // Action logic
        if (!state.isRunning) {
            // Any interaction to start
            if (e.type === 'keydown' || e.type === 'touchstart' || e.type === 'mousedown') {
                if (e.type !== 'keydown' || isGameKey || e.code === 'Enter') {
                    // Prevent default touches
                    if (e.type !== 'keydown') e.preventDefault();
                    startGame();
                }
            }
        } 
        else if (state.isGameOver) {
             if (e.code === 'Enter' || e.type === 'touchstart' || e.type === 'mousedown') {
                 if (e.type !== 'keydown') e.preventDefault();
                 resetGame();
             }
        }
        else {
            // Gameplay inputs
            if (e.type === 'keydown') {
                if (e.code === 'Space' || e.code === 'ArrowUp') jump();
                if (e.code === 'ArrowDown') dino.ducking = true;
            } else if (e.type === 'keyup') {
                if (e.code === 'ArrowDown') dino.ducking = false;
            } else if (e.type === 'touchstart' || e.type === 'mousedown') {
                // Determine tap vs hold? Just jump on tap.
                e.preventDefault();
                jump();
            }
        }
    }

    document.addEventListener('keydown', handleInput);
    document.addEventListener('keyup', handleInput);
    canvas.addEventListener('touchstart', handleInput, { passive: false });
    canvas.addEventListener('mousedown', handleInput);

    function jump() {
        if (dino.grounded) {
            dino.vy = CONFIG.JUMP_FORCE;
            dino.grounded = false;
        }
    }

    function startGame() {
        if (!state.isRunning) {
            resetGame();
        }
    }

    function resetGame() {
        state.isGameOver = false;
        state.score = 0;
        state.targetSpeed = CONFIG.START_SPEED;
        state.currentSpeed = CONFIG.START_SPEED;
        state.distance = 0;
        state.isRunning = true;
        
        dino.y = CONFIG.GroundY - dino.h;
        dino.vy = 0;
        dino.grounded = true;
        
        obstacles = [];
        clouds = [];
        lastObstacleTime = Date.now();
        
        // Clouds
        for(let i=0; i<3; i++) {
            clouds.push(createCloud(Math.random() * canvas.width));
        }
        
        if (animationFrameId) cancelAnimationFrame(animationFrameId);
        loop();
    }

    function createCloud(x) {
        return {
            x: x || canvas.width,
            y: 10 + Math.random() * 60,
            w: 30 + Math.random() * 20,
            h: 15 + Math.random() * 10,
            speed: 0.2 + Math.random() * 0.3
        };
    }

    function spawnObstacle() {
        const now = Date.now();
        // Gap management
        // 1 second gap at speed 5 = 300px (60fps * 5)
        // 1 second gap at speed 10 = 600px
        const minDistance = state.targetSpeed * 40; 
        
        let lastObs = obstacles[obstacles.length - 1];
        let distanceToLast = lastObs ? (canvas.width - (lastObs.x + lastObs.w)) : Infinity;
        
        if (distanceToLast > minDistance) {
            if (Math.random() < 0.04) {
                 const rand = Math.random();
                 let type = 'cactus';
                 let y = CONFIG.GroundY;
                 let w = 25, h = 45;

                 if (state.score > 200 && rand < 0.20) {
                     type = 'bird';
                     w = 40; h = 30;
                     // Two bird heights: high (no jump needed) and low (must jump)
                     const isHighBird = Math.random() > 0.5;
                     const flyHeight = isHighBird ? 90 : 25;
                     y = CONFIG.GroundY - flyHeight;
                 } else if (state.score > 100 && rand < 0.40) {
                     type = 'water';
                     w = 120 + Math.random() * 80;
                     h = 10;
                     y = CONFIG.GroundY;
                 } else {
                     if (Math.random() > 0.6) {
                         type = 'cactus_large';
                         w = 30; h = 50;
                     } else {
                         type = 'cactus_small';
                         w = 20; h = 35;
                     }
                     y = CONFIG.GroundY - h;
                 }
                 
                 obstacles.push({ x: canvas.width, y, w, h, type, seed: Math.random() });
            }
        }
    }

    function update() {
        if (!state.isRunning || state.isGameOver) return;
        frame++;

        // Speed Progression
        if (state.targetSpeed < CONFIG.MAX_SPEED) {
            state.targetSpeed += CONFIG.SPEED_INC;
        }

        // Apply Drag if on Water
        let onWater = false;
        
        // Physics
        dino.vy += CONFIG.GRAVITY;
        dino.y += dino.vy;
        
        const groundY = CONFIG.GroundY - dino.h;
        if (dino.y >= groundY) {
            dino.y = groundY;
            dino.vy = 0;
            dino.grounded = true;
        }

        // Obstacles collision & logic
        spawnObstacle();
        
        // Collision check
        for (let i = 0; i < obstacles.length; i++) {
            let o = obstacles[i];
            
            if (o.type === 'water') {
                // Specific water collision (less padding, check feet)
                const padX = 15; // Forgive edge touches
                if (dino.x < o.x + o.w - padX && dino.x + dino.w - padX > o.x) {
                    // Check if low enough (grounded or landing)
                    if (dino.y + dino.h >= o.y) {
                        onWater = true;
                    }
                }
            } else {
                const pad = 8;
                let collision =
                    (dino.x < o.x + o.w - pad &&
                    dino.x + dino.w - pad > o.x &&
                    dino.y < o.y + o.h - pad &&
                    dino.y + dino.h - pad > o.y);

                if (collision) {
                    gameOver();
                }
            }
        }

        // Speed Update
        if (onWater) {
            // Drag effect: move towards drag speed
            state.currentSpeed = state.currentSpeed * 0.5 + (state.targetSpeed * CONFIG.WATER_DRAG) * 0.5;
        } else {
            // Recovery
            state.currentSpeed = state.currentSpeed * 0.9 + state.targetSpeed * 0.1;
        }

        state.distance += state.currentSpeed;
        state.score = Math.floor(state.distance / 10);

        // Movement
        obstacles.forEach(o => { o.x -= state.currentSpeed; });
        obstacles = obstacles.filter(o => o.x + o.w > -100);

        clouds.forEach(c => { c.x -= (c.speed + state.currentSpeed * 0.1); });
        if (Math.random() < 0.01) clouds.push(createCloud());
        clouds = clouds.filter(c => c.x + c.w > -50);
    }

    function gameOver() {
        state.isGameOver = true;
        if (state.score > state.highScore) {
            state.highScore = state.score;
            localStorage.setItem('runner-high-score', state.highScore);
        }
    }

    function getThemeColors() {
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        return {
            sky: isDark ? '#1a1a1a' : '#f0f0f0',
            ground: isDark ? '#666' : '#535353',
            dino: isDark ? '#e0e0e0' : '#2c3e50',
            dinoGameOver: '#e74c3c',
            cloud: isDark ? '#333' : '#ddd',
            obstacle: isDark ? '#888' : '#535353',
            text: isDark ? '#e0e0e0' : '#535353',
            bird: isDark ? '#999' : '#555',
            birdWing: isDark ? '#888' : '#444'
        };
    }

    function drawDinoModel(x, y) {
        // Draw a somewhat cute T-Rex shape using rectangles
        // Flip color if game over
        const colors = getThemeColors();
        ctx.fillStyle = state.isGameOver ? colors.dinoGameOver : colors.dino;
        
        // Main Body / Torso
        ctx.fillRect(x + 10, y + 18, 24, 25);
        
        // Tail
        ctx.fillRect(x + 2, y + 25, 8, 12);
        ctx.fillRect(x, y + 22, 4, 8); // Tip
        
        // Head
        ctx.fillRect(x + 18, y, 26, 20);
        // Snout
        ctx.fillRect(x + 40, y + 8, 8, 12);
        
        // Mouth area / Eye
        const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
        if (state.isGameOver) {
            // Dead
            ctx.fillStyle = isDark ? '#1a1a1a' : '#fff';
            ctx.fillRect(x + 28, y + 4, 6, 6); // Eye white
            ctx.fillStyle = colors.dino;
            ctx.fillText("x", x+29, y+10);
        } else {
            // Alive
            ctx.fillStyle = isDark ? '#1a1a1a' : '#fff';
            ctx.fillRect(x + 28, y + 4, 4, 4);
        }

        ctx.fillStyle = state.isGameOver ? colors.dinoGameOver : colors.dino;
        
        // Arms
        ctx.fillRect(x + 36, y + 24, 6, 4);
        ctx.fillRect(x + 40, y + 22, 4, 4);
        
        // Legs (Animated)
        const runAnim = Math.floor(frame / 6) % 2;
        if (dino.grounded && !state.isGameOver) {
            if (runAnim === 0) {
                ctx.fillRect(x + 12, y + 43, 6, 4); // Back leg planted
                ctx.fillRect(x + 24, y + 40, 6, 4); // Front leg raised
            } else {
                ctx.fillRect(x + 12, y + 40, 6, 4); // Back leg raised
                ctx.fillRect(x + 24, y + 43, 6, 4); // Front leg planted
            }
        } else {
            // Jump pose
             ctx.fillRect(x + 12, y + 40, 6, 4);
             ctx.fillRect(x + 24, y + 42, 6, 4);
        }
    }

    function drawBird(o) {
        const colors = getThemeColors();
        ctx.fillStyle = colors.bird;
        const wingAnim = Math.floor(frame / 10) % 2;
        const x = o.x, y = o.y;

        // Body
        ctx.fillRect(x + 10, y + 10, 20, 10);
        // Head
        ctx.fillRect(x, y + 5, 12, 10);
        // Beak
        ctx.fillRect(x - 5, y + 8, 5, 4);
        // Tail
        ctx.fillRect(x + 30, y + 12, 5, 6);

        // Wings
        ctx.fillStyle = colors.birdWing;
        if (wingAnim === 0) {
            // Up
            ctx.beginPath();
            ctx.moveTo(x + 15, y + 10);
            ctx.lineTo(x + 10, y - 5);
            ctx.lineTo(x + 25, y + 10);
            ctx.fill();
        } else {
            // Down
             ctx.beginPath();
            ctx.moveTo(x + 15, y + 10);
            ctx.lineTo(x + 10, y + 25);
            ctx.lineTo(x + 25, y + 10);
            ctx.fill();
        }
    }

    function draw() {
        const colors = getThemeColors();

        // Sky
        ctx.fillStyle = colors.sky;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Ground
        ctx.fillStyle = colors.ground;
        ctx.fillRect(0, CONFIG.GroundY, canvas.width, 2);

        // Clouds
        ctx.fillStyle = colors.cloud;
        clouds.forEach(c => {
             ctx.beginPath();
             ctx.arc(c.x, c.y, c.h, 0, Math.PI * 2); 
             ctx.fill();
             ctx.beginPath();
             ctx.arc(c.x + 15, c.y - 5, c.h * 1.3, 0, Math.PI * 2);
             ctx.fill();
        });

        // Obstacles
        obstacles.forEach(o => {
            if (o.type === 'water') {
                ctx.fillStyle = 'rgba(52, 152, 219, 0.5)';
                ctx.fillRect(o.x, o.y + 2, o.w, 8);
                
                // Details
                ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.fillRect(o.x + 10, o.y + 4, o.w - 20, 2);
            } else if (o.type === 'bird') {
                drawBird(o);
            } else {
                ctx.fillStyle = colors.obstacle;
                
                const seed = o.seed || 0.5;
                const cx = o.x + o.w / 2;
                // Move foliage center slighty up so trunk is visible
                const cy = o.y + o.h / 2 - 5; 

                // Trunk
                const trunkW = Math.max(4, o.w / 3.5);
                ctx.fillRect(cx - trunkW/2, cy, trunkW, (o.y + o.h) - cy);

                // BEAUTIFUL BUSH (TREE TOP)
                ctx.beginPath();
                
                // Base
                ctx.arc(cx, cy, o.w/2, 0, Math.PI * 2);

                const numLeaves = o.type === 'cactus_large' ? 10 : 7;
                for (let i = 0; i < numLeaves; i++) {
                     // Deterministic random
                     const r = ((seed * (i + 1.2) * 9301 + 49297) % 233280) / 233280;
                     const angle = r * Math.PI * 2;
                     const dist = (o.w / 2) * (0.5 + r * 0.5);
                     const size = (o.w / 3) * (0.8 + r * 0.4);
                     
                     ctx.moveTo(cx + Math.cos(angle)*dist + size, cy + Math.sin(angle)*dist);
                     ctx.arc(cx + Math.cos(angle)*dist, cy + Math.sin(angle)*dist, size, 0, Math.PI * 2);
                }
                ctx.fill();
            }
        });

        // Dino
        drawDinoModel(dino.x, dino.y);

        // UI
        ctx.fillStyle = colors.text;
        ctx.textAlign = 'right';
        ctx.font = 'bold 20px monospace';
        ctx.fillText(`${state.score.toString().padStart(5, '0')}`, canvas.width - 20, 30);
        ctx.font = '14px monospace';
        ctx.fillText(`HI ${state.highScore}`, canvas.width - 20, 50);

        if (!state.isRunning) {
            ctx.fillStyle = colors.text;
            ctx.textAlign = 'center';
            ctx.font = '20px monospace';
            ctx.fillText("PRESS SPACE TO START", canvas.width/2, canvas.height/2);
        } else if (state.isGameOver) {
             ctx.fillStyle = colors.dinoGameOver;
             ctx.textAlign = 'center';
             ctx.font = '30px monospace';
             ctx.fillText("GAME OVER", canvas.width/2, canvas.height/2 - 10);
             ctx.font = '16px monospace';
             ctx.fillStyle = colors.text;
             ctx.fillText("PRESS ENTER TO RETRY", canvas.width/2, canvas.height/2 + 20);
        }
    }

    function loop() {
        if (state.isRunning && !state.isGameOver) {
            update();
            draw();
            animationFrameId = requestAnimationFrame(loop);
        } else {
            draw();
        }
    }

    // Listen for theme changes and redraw
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'data-theme') {
                draw();
            }
        });
    });

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ['data-theme']
    });

    // Handle window resize dynamically without reload
    window.addEventListener('resize', () => {
        const oldGroundY = CONFIG.GroundY;

        if (window.innerWidth < 850) {
            canvas.width = Math.min(window.innerWidth - 32, 850);
            canvas.height = 300;
        } else {
            canvas.width = 850;
            canvas.height = 300;
        }

        // Update ground level
        CONFIG.GroundY = canvas.height - 30;
        const deltaY = CONFIG.GroundY - oldGroundY;

        // Shift existing obstacles so they don't float/sink
        if (deltaY !== 0) {
            obstacles.forEach(o => {
                o.y += deltaY;
            });
        }

        // If game is waiting to start, adjust dino position and redraw immediately
        if (!state.isRunning) {
            dino.y = CONFIG.GroundY - dino.h;
            draw();
        }
    });

    // Init
    draw();
})();
