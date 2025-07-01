// Global variables
let scene, camera, renderer, ocean, sharks = [], fish = [];
let mouseX = 0, mouseY = 0;
let windowHalfX = window.innerWidth / 2;
let windowHalfY = window.innerHeight / 2;

// Initialize the 3D scene
function init() {
    // Create scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0a0e1a, 1, 2000);

    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 1, 2000);
    camera.position.set(0, 100, 500);

    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0a0e1a, 0.8);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // Add renderer to DOM
    document.getElementById('ocean-container').appendChild(renderer.domElement);

    // Create ocean
    createOcean();
    
    // Create lighting
    createLighting();
    
    // Create aquatic life
    createAquaticLife();
    
    // Add event listeners
    addEventListeners();
    
    // Start animation loop
    animate();
    
    // Hide loading screen
    setTimeout(() => {
        document.getElementById('loading-screen').style.opacity = '0';
        setTimeout(() => {
            document.getElementById('loading-screen').style.display = 'none';
        }, 500);
    }, 2000);
}

// Create ocean surface with waves
function createOcean() {
    const oceanGeometry = new THREE.PlaneGeometry(2000, 2000, 100, 100);
    
    // Create custom shader material for ocean
    const oceanMaterial = new THREE.ShaderMaterial({
        uniforms: {
            time: { value: 0 },
            color1: { value: new THREE.Color(0x001122) },
            color2: { value: new THREE.Color(0x003366) },
            waveHeight: { value: 20 }
        },
        vertexShader: `
            uniform float time;
            uniform float waveHeight;
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                vPosition = position;
                
                // Create wave animation
                float wave1 = sin(position.x * 0.01 + time * 0.5) * waveHeight;
                float wave2 = cos(position.y * 0.01 + time * 0.3) * waveHeight * 0.5;
                float wave3 = sin((position.x + position.y) * 0.005 + time * 0.7) * waveHeight * 0.3;
                
                vec3 newPosition = position;
                newPosition.z += wave1 + wave2 + wave3;
                
                vNormal = normal;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
            }
        `,
        fragmentShader: `
            uniform float time;
            uniform vec3 color1;
            uniform vec3 color2;
            varying vec3 vPosition;
            varying vec3 vNormal;
            
            void main() {
                float mixFactor = sin(vPosition.x * 0.01 + vPosition.y * 0.01 + time * 0.2) * 0.5 + 0.5;
                vec3 color = mix(color1, color2, mixFactor);
                
                // Add some glow effect
                float glow = sin(time * 0.5) * 0.1 + 0.9;
                color *= glow;
                
                gl_FragColor = vec4(color, 0.8);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide
    });

    ocean = new THREE.Mesh(oceanGeometry, oceanMaterial);
    ocean.rotation.x = -Math.PI / 2;
    ocean.position.y = -50;
    scene.add(ocean);
    
    // Add underwater particles
    createUnderwaterParticles();
}

// Create underwater particle effects
function createUnderwaterParticles() {
    const particleCount = 1000;
    const particles = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);
    
    for (let i = 0; i < particleCount; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 2000;
        positions[i * 3 + 1] = Math.random() * 1000 - 200;
        positions[i * 3 + 2] = (Math.random() - 0.5) * 2000;
        
        // Blue-green particle colors
        const color = new THREE.Color();
        color.setHSL(0.5 + Math.random() * 0.2, 0.7, 0.3 + Math.random() * 0.3);
        colors[i * 3] = color.r;
        colors[i * 3 + 1] = color.g;
        colors[i * 3 + 2] = color.b;
    }
    
    particles.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particles.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    
    const particleMaterial = new THREE.PointsMaterial({
        size: 2,
        vertexColors: true,
        transparent: true,
        opacity: 0.6,
        blending: THREE.AdditiveBlending
    });
    
    const particleSystem = new THREE.Points(particles, particleMaterial);
    scene.add(particleSystem);
    
    // Animate particles
    function animateParticles() {
        const positions = particleSystem.geometry.attributes.position.array;
        
        for (let i = 0; i < particleCount; i++) {
            positions[i * 3 + 1] += Math.sin(Date.now() * 0.001 + i) * 0.1;
            
            if (positions[i * 3 + 1] > 500) {
                positions[i * 3 + 1] = -200;
            }
        }
        
        particleSystem.geometry.attributes.position.needsUpdate = true;
        requestAnimationFrame(animateParticles);
    }
    
    animateParticles();
}

// Create lighting setup
function createLighting() {
    // Ambient light
    const ambientLight = new THREE.AmbientLight(0x004080, 0.3);
    scene.add(ambientLight);
    
    // Directional light (sunlight from above)
    const directionalLight = new THREE.DirectionalLight(0x00d4ff, 0.8);
    directionalLight.position.set(100, 200, 100);
    directionalLight.castShadow = true;
    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    scene.add(directionalLight);
    
    // Point lights for underwater glow
    const pointLight1 = new THREE.PointLight(0x00ff88, 0.5, 300);
    pointLight1.position.set(-200, 50, -200);
    scene.add(pointLight1);
    
    const pointLight2 = new THREE.PointLight(0x0099ff, 0.5, 300);
    pointLight2.position.set(200, 50, 200);
    scene.add(pointLight2);
    
    // Animate point lights
    function animateLights() {
        const time = Date.now() * 0.001;
        pointLight1.intensity = 0.3 + Math.sin(time * 0.7) * 0.2;
        pointLight2.intensity = 0.3 + Math.cos(time * 0.5) * 0.2;
        
        pointLight1.position.x = Math.sin(time * 0.3) * 300;
        pointLight1.position.z = Math.cos(time * 0.3) * 300;
        
        pointLight2.position.x = Math.cos(time * 0.4) * 300;
        pointLight2.position.z = Math.sin(time * 0.4) * 300;
        
        requestAnimationFrame(animateLights);
    }
    
    animateLights();
}

// Create detailed aquatic life with interactive features
function createAquaticLife() {
    // Create detailed shark models
    for (let i = 0; i < 5; i++) {
        const shark = createDetailedShark();
        
        // Position shark
        shark.position.set(
            (Math.random() - 0.5) * 1000,
            Math.random() * 200 - 100,
            (Math.random() - 0.5) * 1000
        );
        
        shark.userData = {
            speed: 0.5 + Math.random() * 0.5,
            direction: Math.random() * Math.PI * 2,
            verticalSpeed: (Math.random() - 0.5) * 0.1,
            originalScale: shark.scale.clone(),
            isHovered: false,
            type: 'shark'
        };
        
        sharks.push(shark);
        scene.add(shark);
    }
    
    // Create fish schools with different species
    createFishSchool(50, 0x4a90e2, 'Tropical Fish', 3);
    createFishSchool(30, 0x7ed321, 'Sea Bass', 4);
    createFishSchool(40, 0xf5a623, 'Angelfish', 2.5);
    
    // Create other sea creatures
    createSeaTurtles();
    createJellyfish();
    createSeaweed();
    
    // Add click interaction
    addClickInteraction();
}

// Create detailed shark model
function createDetailedShark() {
    const sharkGroup = new THREE.Group();
    
    // Shark body (main body)
    const bodyGeometry = new THREE.SphereGeometry(12, 16, 8);
    bodyGeometry.scale(2.5, 1, 1);
    const bodyMaterial = new THREE.MeshPhongMaterial({ 
        color: 0x4a4a4a,
        shininess: 30,
        transparent: true,
        opacity: 0.9
    });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    sharkGroup.add(body);
    
    // Shark head/snout
    const headGeometry = new THREE.ConeGeometry(8, 20, 8);
    const head = new THREE.Mesh(headGeometry, bodyMaterial);
    head.position.x = 25;
    head.rotation.z = -Math.PI / 2;
    sharkGroup.add(head);
    
    // Shark tail
    const tailGeometry = new THREE.ConeGeometry(10, 25, 8);
    const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
    tail.position.x = -35;
    tail.rotation.z = Math.PI / 2;
    sharkGroup.add(tail);
    
    // Dorsal fin
    const dorsalFinGeometry = new THREE.ConeGeometry(6, 15, 6);
    const finMaterial = new THREE.MeshPhongMaterial({ color: 0x3a3a3a });
    const dorsalFin = new THREE.Mesh(dorsalFinGeometry, finMaterial);
    dorsalFin.position.set(0, 12, 0);
    dorsalFin.rotation.x = Math.PI;
    sharkGroup.add(dorsalFin);
    
    // Pectoral fins
    const pectoralFinGeometry = new THREE.ConeGeometry(4, 12, 6);
    const leftFin = new THREE.Mesh(pectoralFinGeometry, finMaterial);
    leftFin.position.set(5, -5, -10);
    leftFin.rotation.z = Math.PI / 4;
    sharkGroup.add(leftFin);
    
    const rightFin = new THREE.Mesh(pectoralFinGeometry, finMaterial);
    rightFin.position.set(5, -5, 10);
    rightFin.rotation.z = -Math.PI / 4;
    sharkGroup.add(rightFin);
    
    // Eyes
    const eyeGeometry = new THREE.SphereGeometry(2, 8, 8);
    const eyeMaterial = new THREE.MeshPhongMaterial({ color: 0x000000 });
    
    const leftEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    leftEye.position.set(15, 5, -6);
    sharkGroup.add(leftEye);
    
    const rightEye = new THREE.Mesh(eyeGeometry, eyeMaterial);
    rightEye.position.set(15, 5, 6);
    sharkGroup.add(rightEye);
    
    return sharkGroup;
}

// Create fish school
function createFishSchool(count, color, species, size) {
    const schoolCenter = new THREE.Vector3(
        (Math.random() - 0.5) * 600,
        Math.random() * 100 - 50,
        (Math.random() - 0.5) * 600
    );
    
    for (let i = 0; i < count; i++) {
        const fishGroup = new THREE.Group();
        
        // Fish body
        const bodyGeometry = new THREE.SphereGeometry(size, 8, 6);
        bodyGeometry.scale(1.5, 1, 1);
        const bodyMaterial = new THREE.MeshPhongMaterial({ 
            color: color,
            transparent: true,
            opacity: 0.8,
            shininess: 50
        });
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        fishGroup.add(body);
        
        // Fish tail
        const tailGeometry = new THREE.ConeGeometry(size * 0.6, size * 1.2, 6);
        const tail = new THREE.Mesh(tailGeometry, bodyMaterial);
        tail.position.x = -size * 1.2;
        tail.rotation.z = Math.PI / 2;
        fishGroup.add(tail);
        
        // Fish fins
        const finGeometry = new THREE.ConeGeometry(size * 0.3, size * 0.8, 4);
        const topFin = new THREE.Mesh(finGeometry, bodyMaterial);
        topFin.position.set(0, size * 0.8, 0);
        topFin.rotation.x = Math.PI;
        fishGroup.add(topFin);
        
        // Position fish around school center
        const angle = (i / count) * Math.PI * 2;
        const radius = 20 + Math.random() * 30;
        fishGroup.position.set(
            schoolCenter.x + Math.cos(angle) * radius,
            schoolCenter.y + (Math.random() - 0.5) * 20,
            schoolCenter.z + Math.sin(angle) * radius
        );
        
        fishGroup.userData = {
            speed: 1 + Math.random() * 2,
            direction: Math.random() * Math.PI * 2,
            verticalSpeed: (Math.random() - 0.5) * 0.2,
            schoolCenter: schoolCenter.clone(),
            species: species,
            originalScale: fishGroup.scale.clone(),
            type: 'fish'
        };
        
        fish.push(fishGroup);
        scene.add(fishGroup);
    }
}

// Create sea turtles
function createSeaTurtles() {
    for (let i = 0; i < 3; i++) {
        const turtleGroup = new THREE.Group();
        
        // Turtle shell
        const shellGeometry = new THREE.SphereGeometry(15, 12, 8);
        shellGeometry.scale(1, 0.6, 1.2);
        const shellMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x2d5016,
            transparent: true,
            opacity: 0.9
        });
        const shell = new THREE.Mesh(shellGeometry, shellMaterial);
        turtleGroup.add(shell);
        
        // Turtle head
        const headGeometry = new THREE.SphereGeometry(6, 8, 8);
        const headMaterial = new THREE.MeshPhongMaterial({ color: 0x4a6b2a });
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.set(18, 0, 0);
        turtleGroup.add(head);
        
        // Turtle flippers
        const flipperGeometry = new THREE.SphereGeometry(4, 6, 6);
        flipperGeometry.scale(2, 0.5, 1);
        
        const flippers = [];
        for (let j = 0; j < 4; j++) {
            const flipper = new THREE.Mesh(flipperGeometry, headMaterial);
            const angle = (j / 4) * Math.PI * 2;
            flipper.position.set(
                Math.cos(angle) * 12,
                -5,
                Math.sin(angle) * 15
            );
            turtleGroup.add(flipper);
            flippers.push(flipper);
        }
        
        turtleGroup.position.set(
            (Math.random() - 0.5) * 800,
            Math.random() * 100 - 50,
            (Math.random() - 0.5) * 800
        );
        
        turtleGroup.userData = {
            speed: 0.3 + Math.random() * 0.2,
            direction: Math.random() * Math.PI * 2,
            verticalSpeed: (Math.random() - 0.5) * 0.05,
            flippers: flippers,
            type: 'turtle'
        };
        
        scene.add(turtleGroup);
    }
}

// Create jellyfish
function createJellyfish() {
    for (let i = 0; i < 8; i++) {
        const jellyfishGroup = new THREE.Group();
        
        // Jellyfish bell
        const bellGeometry = new THREE.SphereGeometry(8, 12, 8);
        bellGeometry.scale(1, 0.7, 1);
        const bellMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x4a90e2,
            transparent: true,
            opacity: 0.3,
            emissive: 0x001122
        });
        const bell = new THREE.Mesh(bellGeometry, bellMaterial);
        jellyfishGroup.add(bell);
        
        // Jellyfish tentacles
        for (let j = 0; j < 6; j++) {
            const tentacleGeometry = new THREE.CylinderGeometry(0.2, 0.5, 20, 4);
            const tentacleMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x6bb6ff,
                transparent: true,
                opacity: 0.6
            });
            const tentacle = new THREE.Mesh(tentacleGeometry, tentacleMaterial);
            const angle = (j / 6) * Math.PI * 2;
            tentacle.position.set(
                Math.cos(angle) * 4,
                -15,
                Math.sin(angle) * 4
            );
            jellyfishGroup.add(tentacle);
        }
        
        jellyfishGroup.position.set(
            (Math.random() - 0.5) * 600,
            Math.random() * 150 - 75,
            (Math.random() - 0.5) * 600
        );
        
        jellyfishGroup.userData = {
            speed: 0.2 + Math.random() * 0.3,
            direction: Math.random() * Math.PI * 2,
            verticalSpeed: (Math.random() - 0.5) * 0.1,
            pulsePhase: Math.random() * Math.PI * 2,
            type: 'jellyfish'
        };
        
        scene.add(jellyfishGroup);
    }
}

// Create seaweed
function createSeaweed() {
    for (let i = 0; i < 15; i++) {
        const seaweedGroup = new THREE.Group();
        
        const height = 30 + Math.random() * 40;
        const segments = 8;
        
        for (let j = 0; j < segments; j++) {
            const segmentGeometry = new THREE.CylinderGeometry(
                1 + Math.random() * 0.5,
                1.5 + Math.random() * 0.5,
                height / segments,
                6
            );
            const segmentMaterial = new THREE.MeshPhongMaterial({ 
                color: 0x2d5016,
                transparent: true,
                opacity: 0.8
            });
            const segment = new THREE.Mesh(segmentGeometry, segmentMaterial);
            segment.position.y = (j * height / segments) - height / 2;
            segment.rotation.y = (j * 0.2) + Math.sin(j * 0.5) * 0.3;
            seaweedGroup.add(segment);
        }
        
        seaweedGroup.position.set(
            (Math.random() - 0.5) * 1000,
            -height / 2 - 50,
            (Math.random() - 0.5) * 1000
        );
        
        seaweedGroup.userData = {
            swayPhase: Math.random() * Math.PI * 2,
            swayAmount: 0.1 + Math.random() * 0.1,
            type: 'seaweed'
        };
        
        scene.add(seaweedGroup);
    }
}

// Add click interaction for sea creatures
function addClickInteraction() {
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    
    function onMouseClick(event) {
        mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
        
        raycaster.setFromCamera(mouse, camera);
        
        const allCreatures = [...sharks, ...fish];
        const intersects = raycaster.intersectObjects(allCreatures, true);
        
        if (intersects.length > 0) {
            const clickedObject = intersects[0].object;
            let creature = clickedObject;
            
            // Find the root group
            while (creature.parent && creature.parent.type !== 'Scene') {
                creature = creature.parent;
            }
            
            if (creature.userData) {
                // Create ripple effect
                createRippleEffect(intersects[0].point);
                
                // Show creature info
                showCreatureInfo(creature);
            }
        }
    }
    
    document.addEventListener('click', onMouseClick, false);
}

// Create ripple effect when clicking on creatures
function createRippleEffect(position) {
    const rippleGeometry = new THREE.RingGeometry(0, 1, 16);
    const rippleMaterial = new THREE.MeshBasicMaterial({ 
        color: 0x00d4ff,
        transparent: true,
        opacity: 0.8,
        side: THREE.DoubleSide
    });
    const ripple = new THREE.Mesh(rippleGeometry, rippleMaterial);
    ripple.position.copy(position);
    scene.add(ripple);
    
    // Animate ripple
    const startTime = Date.now();
    function animateRipple() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / 1000;
        
        if (progress < 1) {
            ripple.scale.setScalar(1 + progress * 20);
            ripple.material.opacity = 0.8 * (1 - progress);
            requestAnimationFrame(animateRipple);
        } else {
            scene.remove(ripple);
        }
    }
    animateRipple();
}

// Show creature information
function showCreatureInfo(creature) {
    const info = getCreatureInfo(creature.userData.type, creature.userData.species);
    
    // Create temporary info display
    const infoDiv = document.createElement('div');
    infoDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(10, 14, 26, 0.9);
        color: #00d4ff;
        padding: 15px;
        border-radius: 10px;
        border: 1px solid #00d4ff;
        z-index: 1000;
        max-width: 250px;
        font-family: 'Inter', sans-serif;
    `;
    infoDiv.innerHTML = `<h4>${info.name}</h4><p>${info.description}</p>`;
    document.body.appendChild(infoDiv);
    
    // Remove after 3 seconds
    setTimeout(() => {
        document.body.removeChild(infoDiv);
    }, 3000);
}

// Get creature information
function getCreatureInfo(type, species) {
    const info = {
        shark: {
            name: 'Great White Shark',
            description: 'Apex predator of the ocean, known for their incredible hunting abilities and important role in marine ecosystems.'
        },
        fish: {
            name: species || 'School Fish',
            description: 'These colorful fish travel in schools for protection and are vital to the ocean food chain.'
        },
        turtle: {
            name: 'Sea Turtle',
            description: 'Ancient mariners that have navigated the oceans for millions of years, playing crucial roles in marine ecosystems.'
        },
        jellyfish: {
            name: 'Jellyfish',
            description: 'Graceful drifters that have existed for over 500 million years, some species can glow in the dark.'
        }
    };
    
    return info[type] || { name: 'Sea Creature', description: 'A mysterious inhabitant of the deep ocean.' };
}

// Add event listeners
function addEventListeners() {
    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('mousemove', onDocumentMouseMove, false);
    
    // Learn More button functionality
    document.getElementById('learnMoreBtn').addEventListener('click', function() {
        // Smooth scroll to features section
        document.querySelector('.features-section').scrollIntoView({ 
            behavior: 'smooth' 
        });
    });
}

// Handle window resize
function onWindowResize() {
    windowHalfX = window.innerWidth / 2;
    windowHalfY = window.innerHeight / 2;
    
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    
    renderer.setSize(window.innerWidth, window.innerHeight);
}

// Handle mouse movement for camera interaction
function onDocumentMouseMove(event) {
    mouseX = (event.clientX - windowHalfX) * 0.1;
    mouseY = (event.clientY - windowHalfY) * 0.1;
}

// Animation loop
function animate() {
    requestAnimationFrame(animate);
    
    const time = Date.now() * 0.001;
    
    // Update ocean waves
    if (ocean && ocean.material.uniforms) {
        ocean.material.uniforms.time.value = time;
    }
    
    // Animate sharks
    sharks.forEach(shark => {
        const userData = shark.userData;
        
        // Move forward
        shark.position.x += Math.cos(userData.direction) * userData.speed;
        shark.position.z += Math.sin(userData.direction) * userData.speed;
        shark.position.y += userData.verticalSpeed;
        
        // Rotate to face direction
        shark.rotation.y = userData.direction;
        
        // Add subtle swimming motion
        shark.rotation.z = Math.sin(time * 2 + shark.position.x * 0.01) * 0.1;
        
        // Boundary checking and direction changes
        if (Math.abs(shark.position.x) > 500 || Math.abs(shark.position.z) > 500) {
            userData.direction += Math.PI + (Math.random() - 0.5) * 0.5;
        }
        
        if (shark.position.y > 100 || shark.position.y < -150) {
            userData.verticalSpeed *= -1;
        }
        
        // Random direction changes
        if (Math.random() < 0.01) {
            userData.direction += (Math.random() - 0.5) * 0.3;
        }
    });
    
    // Animate fish
    fish.forEach(fishMesh => {
        const userData = fishMesh.userData;
        
        // Move in schooling pattern
        fishMesh.position.x += Math.cos(userData.direction) * userData.speed;
        fishMesh.position.z += Math.sin(userData.direction) * userData.speed;
        fishMesh.position.y += userData.verticalSpeed;
        
        // Rotate to face direction
        fishMesh.rotation.y = userData.direction;
        
        // Add swimming motion
        fishMesh.rotation.z = Math.sin(time * 3 + fishMesh.position.x * 0.02) * 0.2;
        
        // Keep fish near their school center
        const distanceFromCenter = fishMesh.position.distanceTo(userData.schoolCenter);
        if (distanceFromCenter > 100) {
            const directionToCenter = userData.schoolCenter.clone().sub(fishMesh.position).normalize();
            userData.direction = Math.atan2(directionToCenter.z, directionToCenter.x);
        }
        
        // Random movements
        if (Math.random() < 0.02) {
            userData.direction += (Math.random() - 0.5) * 0.5;
            userData.verticalSpeed = (Math.random() - 0.5) * 0.2;
        }
        
        // Boundary checking
        if (Math.abs(fishMesh.position.y) > 200) {
            userData.verticalSpeed *= -1;
        }
    });
    
    // Animate all other sea creatures
    scene.children.forEach(child => {
        if (child.userData && child.userData.type) {
            const userData = child.userData;
            
            switch (userData.type) {
                case 'turtle':
                    // Slow, graceful movement
                    child.position.x += Math.cos(userData.direction) * userData.speed;
                    child.position.z += Math.sin(userData.direction) * userData.speed;
                    child.position.y += userData.verticalSpeed;
                    child.rotation.y = userData.direction;
                    
                    // Animate flippers
                    if (userData.flippers) {
                        userData.flippers.forEach((flipper, index) => {
                            flipper.rotation.z = Math.sin(time * 1.5 + index) * 0.3;
                        });
                    }
                    
                    // Random direction changes
                    if (Math.random() < 0.005) {
                        userData.direction += (Math.random() - 0.5) * 0.2;
                    }
                    break;
                    
                case 'jellyfish':
                    // Pulsing movement
                    child.position.x += Math.cos(userData.direction) * userData.speed;
                    child.position.z += Math.sin(userData.direction) * userData.speed;
                    child.position.y += Math.sin(time * 0.5 + userData.pulsePhase) * 0.5;
                    
                    // Pulsing scale effect
                    const pulseScale = 1 + Math.sin(time * 2 + userData.pulsePhase) * 0.1;
                    child.scale.setScalar(pulseScale);
                    
                    // Gentle rotation
                    child.rotation.y += 0.005;
                    
                    // Random direction changes
                    if (Math.random() < 0.008) {
                        userData.direction += (Math.random() - 0.5) * 0.4;
                    }
                    break;
                    
                case 'seaweed':
                    // Swaying motion
                    child.rotation.x = Math.sin(time * 0.5 + userData.swayPhase) * userData.swayAmount;
                    child.rotation.z = Math.cos(time * 0.3 + userData.swayPhase) * userData.swayAmount * 0.7;
                    break;
            }
            
            // Boundary checking for moving creatures
            if (userData.type !== 'seaweed') {
                if (Math.abs(child.position.x) > 600 || Math.abs(child.position.z) > 600) {
                    userData.direction += Math.PI + (Math.random() - 0.5) * 0.5;
                }
                
                if (child.position.y > 150 || child.position.y < -200) {
                    userData.verticalSpeed *= -1;
                }
            }
        }
    });
    
    // Camera movement based on mouse
    camera.position.x += (mouseX - camera.position.x) * 0.005;
    camera.position.y += (-mouseY - camera.position.y) * 0.005;
    camera.lookAt(scene.position);
    
    // Render the scene
    renderer.render(scene, camera);
}

// Initialize when page loads
window.addEventListener('load', init);

