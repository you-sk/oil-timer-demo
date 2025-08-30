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


function setupMatterJS() {
    engine = Engine.create();
    world = engine.world;
    engine.world.gravity.x = 0;
    engine.world.gravity.y = 1; 

    currentContainerWidth = canvasContainer.clientWidth;
    currentContainerHeight = canvasContainer.clientHeight;
    
    render = Render.create({
        element: canvasContainer,
        engine: engine,
        options: {
            width: currentContainerWidth,
            height: currentContainerHeight,
            wireframes: false,
            background: '#ffffff'
        }
    });

    runner = Runner.create();
    Runner.run(runner, engine);
    Render.run(render);

    createWallsAndObstacles();
    setupMouseControls();
}


function createWallsAndObstacles() {
    Composite.remove(world, Composite.allBodies(world).filter(body => body.isStatic));

    const width = currentContainerWidth;
    const height = currentContainerHeight;

    Composite.add(world, [
        Bodies.rectangle(width / 2, height + WALL_THICKNESS / 2 - 5, width, WALL_THICKNESS, { isStatic: true, label: 'floor', render: { fillStyle: '#9ca3af' } }),
        Bodies.rectangle(width / 2, -WALL_THICKNESS / 2 + 5, width, WALL_THICKNESS, { isStatic: true, label: 'ceiling', render: { fillStyle: '#9ca3af' } }),
        Bodies.rectangle(-WALL_THICKNESS / 2 + 5, height / 2, WALL_THICKNESS, height, { isStatic: true, label: 'leftWall', render: { fillStyle: '#9ca3af' } }),
        Bodies.rectangle(width + WALL_THICKNESS / 2 - 5, height / 2, WALL_THICKNESS, height, { isStatic: true, label: 'rightWall', render: { fillStyle: '#9ca3af' } })
    ]);

    const obstacleWidth = width * (0.5 + Math.random() * 0.3);
    const obstacleHeight = 20;

    const y1 = height * (0.25 + Math.random() * 0.2);
    const angle1 = (Math.random() - 0.5) * (Math.PI / 6);
    Composite.add(world, Bodies.rectangle(
        width / 2, y1, obstacleWidth, obstacleHeight,
        { isStatic: true, angle: angle1, label: 'obstacle1', render: { fillStyle: '#cbd5e1' } }
    ));

    const y2 = height * (0.55 + Math.random() * 0.2);
    const angle2 = (Math.random() - 0.5) * (Math.PI / 6);
    Composite.add(world, Bodies.rectangle(
        width / 2, y2, obstacleWidth, obstacleHeight,
        { isStatic: true, angle: angle2, label: 'obstacle2', render: { fillStyle: '#cbd5e1' } }
    ));
    
    const centerPostHeight = height * (0.15 + Math.random() * 0.15);
    const centerPostY = height / 2 + (Math.random() - 0.5) * (height * 0.1);
    Composite.add(world, Bodies.rectangle(
        width / 2, centerPostY, 15, centerPostHeight,
        { isStatic: true, label: 'centerPost', render: { fillStyle: '#e2e8f0' } }
    ));
}

const particleColors = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6'];
function createParticle(x, y) {
    const radius = 8 + Math.random() * 4;
    const randomColor = particleColors[Math.floor(Math.random() * particleColors.length)];
    const particle = Bodies.circle(x, y, radius, {
        restitution: 0.4, friction: 0.05, density: 0.001, label: 'particle',
        render: { fillStyle: randomColor }
    });
    Composite.add(world, particle);
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
    const particles = Composite.allBodies(world).filter(body => body.label === 'particle');
    Composite.remove(world, particles);
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

setupMatterJS();
startParticleDropping();