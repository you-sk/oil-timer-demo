const { Engine, Render, Runner, Bodies, Composite, Events, Mouse, MouseConstraint, World } = Matter;

const canvasContainer = document.getElementById('canvas-container');
const resetButton = document.getElementById('resetButton');
const infoDisplay = document.getElementById('infoDisplay');

const MAX_PARTICLES = 100;
const PARTICLE_DROP_INTERVAL = 150;
const AUTO_FLIP_DELAY_SECONDS = 3;
const WALL_THICKNESS = 30;

let engine, world, render, runner;
let particleIntervalId;
let countdownIntervalId;
let isCanvasFlipped = false;
let currentContainerWidth;
let currentContainerHeight;
let splashEffects = [];
let particleTrails = new Map();
let currentTheme = 'default';


function setupMatterJS() {
    engine = Engine.create();
    world = engine.world;
    engine.world.gravity.x = 0;
    engine.world.gravity.y = 1; 

    currentContainerWidth = canvasContainer.clientWidth;
    currentContainerHeight = canvasContainer.clientHeight;
    
    const theme = getThemeColors();
    render = Render.create({
        element: canvasContainer,
        engine: engine,
        options: {
            width: currentContainerWidth,
            height: currentContainerHeight,
            wireframes: false,
            background: theme.bgGradient ? 'transparent' : theme.background
        }
    });

    runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    createWallsAndObstacles();
    setupMouseControls();
    setupCollisionEvents();
    setupRenderEvents();
    applyThemeBackground();
}


function createWallsAndObstacles() {
    Composite.remove(world, Composite.allBodies(world).filter(body => body.isStatic));

    const width = currentContainerWidth;
    const height = currentContainerHeight;
    const theme = getThemeColors();

    Composite.add(world, [
        Bodies.rectangle(width / 2, height + WALL_THICKNESS / 2 - 5, width, WALL_THICKNESS, { isStatic: true, label: 'floor', render: { fillStyle: theme.wallColor } }),
        Bodies.rectangle(width / 2, -WALL_THICKNESS / 2 + 5, width, WALL_THICKNESS, { isStatic: true, label: 'ceiling', render: { fillStyle: theme.wallColor } }),
        Bodies.rectangle(-WALL_THICKNESS / 2 + 5, height / 2, WALL_THICKNESS, height, { isStatic: true, label: 'leftWall', render: { fillStyle: theme.wallColor } }),
        Bodies.rectangle(width + WALL_THICKNESS / 2 - 5, height / 2, WALL_THICKNESS, height, { isStatic: true, label: 'rightWall', render: { fillStyle: theme.wallColor } })
    ]);

    const obstacleWidth = width * (0.5 + Math.random() * 0.3);
    const obstacleHeight = 20;

    const y1 = height * (0.25 + Math.random() * 0.2);
    const angle1 = (Math.random() - 0.5) * (Math.PI / 6);
    Composite.add(world, Bodies.rectangle(
        width / 2, y1, obstacleWidth, obstacleHeight,
        { isStatic: true, angle: angle1, label: 'obstacle1', render: { fillStyle: theme.obstacleColor } }
    ));

    const y2 = height * (0.55 + Math.random() * 0.2);
    const angle2 = (Math.random() - 0.5) * (Math.PI / 6);
    Composite.add(world, Bodies.rectangle(
        width / 2, y2, obstacleWidth, obstacleHeight,
        { isStatic: true, angle: angle2, label: 'obstacle2', render: { fillStyle: theme.obstacleColor } }
    ));
    
    const centerPostHeight = height * (0.15 + Math.random() * 0.15);
    const centerPostY = height / 2 + (Math.random() - 0.5) * (height * 0.1);
    Composite.add(world, Bodies.rectangle(
        width / 2, centerPostY, 15, centerPostHeight,
        { isStatic: true, label: 'centerPost', render: { fillStyle: theme.centerPostColor } }
    ));
}

const themes = {
    default: {
        name: 'デフォルト',
        background: '#ffffff',
        particleColors: ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'],
        wallColor: '#9ca3af',
        obstacleColor: '#cbd5e1',
        centerPostColor: '#e2e8f0',
        bgGradient: null
    },
    ocean: {
        name: '深海',
        background: 'linear-gradient(180deg, #001e3c 0%, #003d7a 100%)',
        particleColors: ['#00bcd4', '#03a9f4', '#2196f3', '#3f51b5', '#00acc1', '#0288d1'],
        wallColor: '#1a237e',
        obstacleColor: '#3949ab',
        centerPostColor: '#5c6bc0',
        bgGradient: true
    },
    lava: {
        name: '溶岩',
        background: 'linear-gradient(180deg, #b71c1c 0%, #ff6f00 100%)',
        particleColors: ['#ff9800', '#ff5722', '#f44336', '#ffeb3b', '#ffc107', '#ff6f00'],
        wallColor: '#d84315',
        obstacleColor: '#bf360c',
        centerPostColor: '#e64a19',
        bgGradient: true
    },
    space: {
        name: '宇宙',
        background: 'linear-gradient(180deg, #0d0d2b 0%, #1a1a4e 100%)',
        particleColors: ['#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#00bcd4', '#ffeb3b'],
        wallColor: '#311b92',
        obstacleColor: '#4527a0',
        centerPostColor: '#512da8',
        bgGradient: true
    }
};

function getThemeColors() {
    return themes[currentTheme];
}
function createParticle(x, y, isSplash = false) {
    const theme = getThemeColors();
    const radius = isSplash ? 2 + Math.random() * 3 : 8 + Math.random() * 4;
    const randomColor = theme.particleColors[Math.floor(Math.random() * theme.particleColors.length)];
    const particle = Bodies.circle(x, y, radius, {
        restitution: isSplash ? 0.6 : 0.4,
        friction: 0.05,
        density: isSplash ? 0.0005 : 0.001,
        label: isSplash ? 'splash' : 'particle',
        render: { fillStyle: randomColor },
        isSplash: isSplash,
        opacity: 1.0,
        fadeStartTime: isSplash ? Date.now() + 400 : null,
        fadeDuration: 400
    });
    
    if (!isSplash) {
        particleTrails.set(particle.id, []);
    }
    
    Composite.add(world, particle);
    
    if (isSplash) {
        setTimeout(() => {
            Composite.remove(world, particle);
        }, 800);
    }
}

function updateInfoDisplay() {
    const currentParticles = Composite.allBodies(world).filter(body => body.label === 'particle').length;
    infoDisplay.textContent = `${currentParticles}/${MAX_PARTICLES}`;
}

function startParticleDropping() {
    stopParticleDropping(); 
    clearCountdown(); 
    updateInfoDisplay();

    particleIntervalId = setInterval(() => {
        const currentParticles = Composite.allBodies(world).filter(body => body.label === 'particle').length;
        
        if (currentParticles >= MAX_PARTICLES) {
            stopParticleDropping();
            if (infoDisplay.textContent !== `反転まで: 0秒`) {
                 updateInfoDisplay();
                 startCountdown();
            }
            return;
        }

        const spawnX = currentContainerWidth / 2 + (Math.random() - 0.5) * (currentContainerWidth * 0.3);
        const spawnY = isCanvasFlipped ? currentContainerHeight - 10 : 10;
        createParticle(spawnX, spawnY);
        updateInfoDisplay();

    }, PARTICLE_DROP_INTERVAL);
}

function stopParticleDropping() {
    clearInterval(particleIntervalId);
}

function startCountdown() {
    clearCountdown(); 
    let secondsRemaining = AUTO_FLIP_DELAY_SECONDS;
    infoDisplay.textContent = `反転まで: ${secondsRemaining}秒`;

    countdownIntervalId = setInterval(() => {
        secondsRemaining--;
        if (secondsRemaining >= 0) {
            infoDisplay.textContent = `反転まで: ${secondsRemaining}秒`;
        }
        if (secondsRemaining < 0) {
            clearCountdown();
            flipCanvasAndRestart();
        }
    }, 1000);
}

function clearCountdown() {
    clearInterval(countdownIntervalId);
}


function flipCanvasAndRestart() {
    isCanvasFlipped = !isCanvasFlipped;
    canvasContainer.style.transform = isCanvasFlipped ? 'rotate(180deg)' : 'rotate(0deg)';
    
    if (isCanvasFlipped) {
        engine.world.gravity.y = -1; 
    } else {
        engine.world.gravity.y = 1;  
    }
    engine.world.gravity.x = 0; 
    
    clearAllParticles();
    startParticleDropping(); 
}

function clearAllParticles() {
    const particles = Composite.allBodies(world).filter(body => body.label === 'particle' || body.label === 'splash');
    particles.forEach(particle => {
        if (particleTrails.has(particle.id)) {
            particleTrails.delete(particle.id);
        }
    });
    Composite.remove(world, particles);
    splashEffects = [];
}

function resetSimulation() {
    stopParticleDropping();
    clearCountdown(); 
    clearAllParticles();
    
    isCanvasFlipped = false; 
    canvasContainer.style.transform = 'rotate(0deg)';
    
    engine.world.gravity.x = 0;
    engine.world.gravity.y = 1;

    createWallsAndObstacles();
    startParticleDropping();
}
resetButton.addEventListener('click', resetSimulation);

const themeSelector = document.getElementById('themeSelector');
themeSelector.addEventListener('change', (e) => {
    switchTheme(e.target.value);
    document.body.className = e.target.value === 'default' ? '' : `theme-${e.target.value}`;
    canvasContainer.className = e.target.value === 'default' ? '' : `theme-${e.target.value}`;
});

function setupMouseControls() {
    const mouse = Mouse.create(render.canvas);
    const mouseConstraint = MouseConstraint.create(engine, {
        mouse: mouse,
        constraint: { stiffness: 0.2, render: { visible: false } }
    });
    Composite.add(world, mouseConstraint);

    Events.on(mouseConstraint, 'mousedown', (event) => {
        const mousePosition = event.mouse.position; 
        let particleX = mousePosition.x;
        let particleY = mousePosition.y;

        if (isCanvasFlipped) {
            particleX = currentContainerWidth - mousePosition.x;
            particleY = currentContainerHeight - mousePosition.y;
        }

        if (mousePosition.x > 0 && mousePosition.x < currentContainerWidth &&
            mousePosition.y > 0 && mousePosition.y < currentContainerHeight) {
            createParticle(particleX, particleY);
            if (!countdownIntervalId) {
                updateInfoDisplay();
            }
        }
    });
}

window.addEventListener('resize', () => {
    stopParticleDropping(); 
    clearCountdown();

    currentContainerWidth = canvasContainer.clientWidth;
    currentContainerHeight = canvasContainer.clientHeight;

    render.bounds.max.x = currentContainerWidth;
    render.bounds.max.y = currentContainerHeight;
    render.options.width = currentContainerWidth;
    render.options.height = currentContainerHeight;
    Render.setPixelRatio(render, window.devicePixelRatio); 
    
    createWallsAndObstacles(); 
    
    if (isCanvasFlipped) {
        engine.world.gravity.y = -1;
    } else {
        engine.world.gravity.y = 1;
    }
    engine.world.gravity.x = 0;

    clearAllParticles(); 
    startParticleDropping(); 
});

function setupCollisionEvents() {
    Events.on(engine, 'collisionStart', function(event) {
        const pairs = event.pairs;
        
        pairs.forEach(pair => {
            const { bodyA, bodyB } = pair;
            
            if ((bodyA.label === 'particle' && bodyB.isStatic) || 
                (bodyB.label === 'particle' && bodyA.isStatic)) {
                
                const particle = bodyA.label === 'particle' ? bodyA : bodyB;
                const impact = Math.sqrt(
                    Math.pow(particle.velocity.x, 2) + 
                    Math.pow(particle.velocity.y, 2)
                );
                
                if (impact > 2) {
                    createSplashEffect(particle.position.x, particle.position.y, impact);
                }
            }
        });
    });
}

function createSplashEffect(x, y, intensity) {
    const splashCount = Math.min(Math.floor(intensity * 2), 8);
    
    for (let i = 0; i < splashCount; i++) {
        const angle = (Math.PI * 2 * i) / splashCount + Math.random() * 0.5;
        const velocity = intensity * 0.5 + Math.random() * 2;
        const splashX = x + Math.cos(angle) * 5;
        const splashY = y + Math.sin(angle) * 5;
        
        createParticle(splashX, splashY, true);
        
        const splash = Composite.allBodies(world).find(body => 
            body.position.x === splashX && body.position.y === splashY
        );
        
        if (splash) {
            Matter.Body.setVelocity(splash, {
                x: Math.cos(angle) * velocity,
                y: Math.sin(angle) * velocity - 2
            });
        }
    }
}

function setupRenderEvents() {
    Events.on(render, 'beforeRender', function() {
        const currentTime = Date.now();
        
        Composite.allBodies(world).forEach(body => {
            if (body.label === 'splash' && body.fadeStartTime) {
                if (currentTime >= body.fadeStartTime) {
                    const elapsed = currentTime - body.fadeStartTime;
                    const fadeProgress = Math.min(elapsed / body.fadeDuration, 1);
                    body.opacity = 1 - fadeProgress;
                    
                    const opacity = body.opacity;
                    const baseColor = body.render.fillStyle;
                    if (baseColor.startsWith('#')) {
                        const r = parseInt(baseColor.slice(1, 3), 16);
                        const g = parseInt(baseColor.slice(3, 5), 16);
                        const b = parseInt(baseColor.slice(5, 7), 16);
                        body.render.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`;
                    }
                }
            }
        });
    });
    
    Events.on(render, 'afterRender', function() {
        const context = render.context;
        
        Composite.allBodies(world).forEach(body => {
            if (body.label === 'particle' && particleTrails.has(body.id)) {
                const trail = particleTrails.get(body.id);
                
                trail.push({ x: body.position.x, y: body.position.y });
                
                if (trail.length > 15) {
                    trail.shift();
                }
                
                if (trail.length > 1) {
                    context.save();
                    context.globalAlpha = 0.3;
                    context.strokeStyle = body.render.fillStyle;
                    context.lineWidth = body.circleRadius * 0.5;
                    context.lineCap = 'round';
                    context.beginPath();
                    
                    trail.forEach((point, index) => {
                        if (index === 0) {
                            context.moveTo(point.x, point.y);
                        } else {
                            context.globalAlpha = 0.3 * (index / trail.length);
                            context.lineTo(point.x, point.y);
                        }
                    });
                    
                    context.stroke();
                    context.restore();
                }
            }
        });
    });
}

function applyThemeBackground() {
    const theme = getThemeColors();
    if (theme.bgGradient) {
        canvasContainer.style.background = theme.background;
    } else {
        canvasContainer.style.background = theme.background;
    }
}

function switchTheme(themeName) {
    if (themes[themeName]) {
        currentTheme = themeName;
        applyThemeBackground();
        
        const theme = getThemeColors();
        render.options.background = theme.bgGradient ? 'transparent' : theme.background;
        
        createWallsAndObstacles();
        
        Composite.allBodies(world).forEach(body => {
            if (body.label === 'particle' || body.label === 'splash') {
                body.render.fillStyle = theme.particleColors[
                    Math.floor(Math.random() * theme.particleColors.length)
                ];
            }
        });
    }
}

setupMatterJS();
startParticleDropping();