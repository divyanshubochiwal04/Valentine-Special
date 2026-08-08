import * as THREE from 'three';
import { Config } from './config.js';
import { AudioManager } from './audio.js';
import { 
    scene, 
    camera, 
    renderer, 
    composer, 
    bloomPass,
    initScene, 
    updateCameraOffsets 
} from './scene.js';
import { 
    createVoidParticles, 
    createGalaxy, 
    createProceduralHeart, 
    createFlowerCluster, 
    createHeartExplosion, 
    createBigBangExplosion,
    create3DCrystalHeartGeometry,
    createCentralCrystalHeart,
    disposeObject 
} from './particles.js';
import { 
    initStory, 
    redStringCurve,
    redStringMesh,
    updateStoryOverlay
} from './story.js';
import { 
    capturedUserName, 
    initUIAnimations, 
    showMemoryPopup, 
    initScrollHint, 
    triggerFinaleUI, 
    showOracleMessage, 
    createNameConstellation, 
    initCosmicFeaturesUI 
} from './ui.js';
import { 
    InputState, 
    initInteraction, 
    project3DLabel 
} from './interaction.js';
import { ShootingStarManager } from './shootingStars.js';

// --- STATE MANAGEMENT ---
let animationId = null;
let clock = new THREE.Clock();
let centralCrystalHeart = null;

// Ambient quote ticker pacing state
let lastQuoteTime = 0;
const quoteInterval = 12000;

// Reusable vector singletons to eliminate GC stutters in render loops
const _tempV1 = new THREE.Vector3();
const _tempV2 = new THREE.Vector3();
const TARGET_HEART_POS = new THREE.Vector3(0, 0, -210);

// Pre-allocated particle pool for mouse trails to avoid instantiation overhead
const trailPoolSize = 40;
const trailPool = [];
let trailPoolIndex = 0;
let sharedCardMaterial = null;

// Three.js entities reference lists (for disposal and animation)
const memoryStars = []; 
const floatingFlowers = []; 
let voidParticles = null;
let galaxyPoints = null;
let heartMeshPoints = null;
let shootingStarManager = null;

// Scrolling states
let scrollProgress = 0;
let targetScrollProgress = 0;
let finaleTriggered = false;

// Optimization: pre-allocated constellation buffers
const maxConstellationLines = 200;
let constellationLines = null;
let constellationPositions = null;

// Mouse trails
const heartTrailMaterial = new THREE.PointsMaterial({
    size: 0.2,
    color: Config.COLORS.pinkish,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending
});
const heartTrailParticles = [];

// --- ENTRY POINT ---
window.addEventListener('DOMContentLoaded', () => {
    // 1. Initialize WebGL Context
    initScene();
    
    // 2. Initialize Audio Manager
    AudioManager.init();

    // 3. Initialize Interactive Listeners
    initInteraction(scene, (star) => openMemoryDetails(star));

    // 4. Create Entry Void Particles
    voidParticles = createVoidParticles(scene);
    
    // 5. Connect UI Transitions
    initUIAnimations((name) => igniteUniverse(name));

    // 6. Initialize pre-allocated trail particle pool
    initTrailPool();

    // 7. Start Void Loop
    scene.userData.phase = 'void';
    animateVoid();
});

function initTrailPool() {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array([0, 0, 0]), 3));
    
    for (let i = 0; i < trailPoolSize; i++) {
        const material = new THREE.PointsMaterial({
            size: 0.25,
            color: Config.COLORS.pinkish,
            transparent: true,
            opacity: 0,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });
        const point = new THREE.Points(geometry, material);
        point.visible = false;
        scene.add(point);
        trailPool.push(point);
    }
}

// --- RENDER LOOPS ---

function animateVoid() {
    if (scene.userData.phase !== 'void') return;
    
    animationId = requestAnimationFrame(animateVoid);
    const elapsedTime = clock.getElapsedTime();

    if (voidParticles && voidParticles.mesh) {
        // Subtle rotational spin
        voidParticles.mesh.rotation.y += 0.002;
        voidParticles.mesh.rotation.x += 0.001;

        // Interactive mouse parallax shift
        voidParticles.mesh.rotation.x += 0.05 * (InputState.targetY - voidParticles.mesh.rotation.x);
        voidParticles.mesh.rotation.y += 0.05 * (InputState.targetX - voidParticles.mesh.rotation.y);

        // Fluid ripple particle computation
        const positions = voidParticles.geometry.attributes.position.array;
        for (let i = 0; i < Config.VOID_PARTICLES_COUNT; i++) {
            const i3 = i * 3;
            const x = voidParticles.originalPos[i3];
            positions[i3 + 1] = voidParticles.originalPos[i3 + 1] + Math.sin(elapsedTime + x) * 0.2 + (InputState.targetX * 2);
        }
        voidParticles.geometry.attributes.position.needsUpdate = true;
    }

    composer.render();
}

const colorCollision = new THREE.Color(0x0f0005);
const colorChaos = new THREE.Color(0x070014);
const colorBloom = new THREE.Color(0x160010);
const colorPromise = new THREE.Color(0x1c0500);

function updateNebulaSky(progress) {
    if (!scene || !scene.fog) return;
    
    let currentFogColor = new THREE.Color();
    if (progress < 0.33) {
        const ratio = progress / 0.33;
        currentFogColor.lerpColors(colorCollision, colorChaos, ratio);
    } else if (progress < 0.66) {
        const ratio = (progress - 0.33) / 0.33;
        currentFogColor.lerpColors(colorChaos, colorBloom, ratio);
    } else {
        const ratio = Math.min(1.0, (progress - 0.66) / 0.34);
        currentFogColor.lerpColors(colorBloom, colorPromise, ratio);
    }

    scene.fog.color.copy(currentFogColor);
    
    // Update CSS body background variables
    const hexStr = '#' + currentFogColor.getHexString();
    document.documentElement.style.setProperty('--nebula-color-1', hexStr);
    
    const secondaryColor = currentFogColor.clone().multiplyScalar(0.3);
    document.documentElement.style.setProperty('--nebula-color-2', '#' + secondaryColor.getHexString());
}

function animateScrollStory() {
    if (scene.userData.phase !== 'universe') return;

    animationId = requestAnimationFrame(animateScrollStory);

    // 1. Interpolate Scroll Progress for smooth fluid movement
    scrollProgress += (targetScrollProgress - scrollProgress) * 0.05;

    // Update Nebula sky transitions
    updateNebulaSky(scrollProgress);

    // Update Shooting Stars
    if (shootingStarManager) {
        shootingStarManager.update();
    }

    // 2. Calculate Camera Vectors along the Red String Spline Path
    updateCameraAlongPath(scrollProgress);

    // 3. Coordinate CSS Overlays
    updateStoryOverlay(scrollProgress);

    // 4. Map 3D Coordinate tags of the Hero's Name Label onto 2D screen coordinates
    const heroLabel = document.getElementById('hero-name-label');
    if (heroLabel && heartMeshPoints) {
        const visible = project3DLabel('hero-name-label', heartMeshPoints.position);
        if (visible && scrollProgress > 0.9) {
            heroLabel.style.opacity = '1';
        } else {
            heroLabel.style.opacity = '0';
        }
    }

    // 5. Spin Flowers
    floatingFlowers.forEach(f => {
        f.rotation.y += 0.01;
    });

    // 5. Rotate red string mesh slowly for moiré pattern dynamic shift
    if (redStringMesh) {
        redStringMesh.rotation.z += 0.0003;
    }

    // 6. Parametric Heart pulse beat computation
    if (heartMeshPoints) {
        const time = Date.now() * 0.002;
        const pulse = 1 + Math.sin(time) * 0.05 + Math.sin(time * 3) * 0.02;
        heartMeshPoints.scale.set(pulse, pulse, pulse);
        heartMeshPoints.rotation.y += 0.002;
        
        if (centralCrystalHeart) {
            centralCrystalHeart.scale.set(4 * pulse, 4 * pulse, 4 * pulse);
            centralCrystalHeart.rotation.y += 0.004;
            centralCrystalHeart.rotation.x = Math.sin(time * 0.5) * 0.08;
        }
    }

    // Audio Reactive Star Field & Bloom pulsing
    const avgFreq = AudioManager.getAverageFrequency();
    const normalizedFreq = avgFreq / 255; // 0 to 1
    if (galaxyPoints && galaxyPoints.material) {
        galaxyPoints.material.size = 0.15 + normalizedFreq * 0.2;
    }
    if (bloomPass) {
        bloomPass.strength = 1.3 + normalizedFreq * 1.5;
    }

    // 7. Update Audio Level matches scroll depth
    AudioManager.syncVolumeWithScroll(scrollProgress);

    // 8. Connect Constellations dynamically
    updateConstellationNetwork();

    // 9. Check terminal triggers
    if (scrollProgress > 0.94 && !finaleTriggered) {
        triggerFinale();
    }

    // 10. Mid-journey name banner flash
    if (scrollProgress > 0.5 && scrollProgress < 0.6 && !scene.userData.nameShown) {
        createNameConstellation(capturedUserName);
        scene.userData.nameShown = true;
    }

    // 11. Update ambient database quotes in ticker subtitle
    updateAmbientQuotes();

    composer.render();
}

// --- TRANSITIONS & ENGINE ACTIONS ---

async function igniteUniverse(userName) {
    scene.userData.phase = 'igniting';
    
    // Play Background theme
    AudioManager.startBackgroundMusic();

    // Hide Entry Page UI
    const entrySection = document.getElementById('entry-section');
    gsap.to(entrySection, {
        opacity: 0, 
        duration: 1, 
        onComplete: () => {
            entrySection.style.display = 'none';
        }
    });

    // Camera zooms deep into the center of the void
    gsap.to(camera.position, {
        z: 0.1, 
        duration: 2.5, 
        ease: "power4.in", 
        onComplete: async () => {
            // Clean up entry entities
            if (voidParticles) {
                disposeObject(voidParticles.mesh);
                voidParticles = null;
            }
            if (animationId) cancelAnimationFrame(animationId);

            // POST to database backend
            try {
                await fetch('/api/enter', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name: userName })
                });
            } catch (err) {
                console.warn("[Backend] Local db submission bypassed.", err);
            }

            // Load main universe
            initUniverseScene(userName);
        }
    });
}

function initUniverseScene(userName) {
    scene.userData.phase = 'universe';
    scene.userData.memoryStars = memoryStars;

    // Initialize Shooting Star Manager
    shootingStarManager = new ShootingStarManager(scene, camera);
    scene.userData.shootingStarManager = shootingStarManager;

    // 1. Lock scrolling during Big Bang intro transition
    document.body.style.overflowY = 'hidden';
    document.getElementById('story-container').classList.remove('hidden');

    // 2. Setup Camera at the zoomed-in center of the void (0, 0, 0.1)
    camera.position.set(0, 0, 0.1);

    // 3. Spline Curve Setup
    initStory(scene);

    // 4. Galaxies
    galaxyPoints = createGalaxy(scene, redStringCurve);

    // 5. Procedural Crystal Heart & Grand Central 3D Crystal Heart Mesh
    heartMeshPoints = createProceduralHeart(scene, new THREE.Vector3(0, 0, -210));
    centralCrystalHeart = createCentralCrystalHeart(scene, new THREE.Vector3(0, 0, -210));
    
    // Create DOM element tag for the name
    let label = document.getElementById('hero-name-label');
    if (!label) {
        label = document.createElement('div');
        label.id = 'hero-name-label';
        label.className = 'absolute text-center opacity-0 transition-opacity duration-1000 cinzel font-bold text-red-500 text-shadow-glow pointer-events-none';
        label.style.fontSize = 'clamp(2rem, 8vw, 4rem)';
        document.getElementById('ui-layer').appendChild(label);
    }
    label.innerText = userName;

    // 6. Bloom Flowers Cluster
    createFlowerCluster(scene, new THREE.Vector3(0, 5, -150), floatingFlowers);

    // 7. Build Constellation line segment mesh
    constellationPositions = new Float32Array(maxConstellationLines * 2 * 3);
    const constellationGeometry = new THREE.BufferGeometry();
    constellationGeometry.setAttribute('position', new THREE.BufferAttribute(constellationPositions, 3));
    constellationGeometry.setDrawRange(0, 0);
    
    const constellationMaterial = new THREE.LineBasicMaterial({
        color: Config.COLORS.constellationLine,
        transparent: true,
        opacity: 0.12,
        blending: THREE.AdditiveBlending
    });
    constellationLines = new THREE.LineSegments(constellationGeometry, constellationMaterial);
    scene.add(constellationLines);

    // 8. Holograms & Memories loading
    createStaticFloatingNotes();
    fetchAndSpawnUserMemories();

    // 9. Interactive UI initialization
    initCosmicFeaturesUI((name, message, emoji, onSuccess) => submitEchoMemory(name, message, emoji, onSuccess));

    // 10. Cinematic Big Bang Expansion Transition
    createBigBangExplosion(scene, new THREE.Vector3(0, 0, 0));
    AudioManager.play('sound-shimmer', 0.9); // Play audio cue for expansion
    bloomPass.strength = 5.0; // Ignition flash
    
    const transitionTimeline = gsap.timeline({
        onUpdate: () => {
            // Subtle rotation of galaxy for dynamic motion
            if (galaxyPoints) galaxyPoints.rotation.y += 0.001;
            
            // Keep looking at the center as the camera moves out
            camera.lookAt(new THREE.Vector3(0, 0, 0));
            composer.render();
        },
        onComplete: () => {
            // Restore scroll and initiate normal loop
            document.body.style.overflowY = 'auto';
            document.body.style.height = `${Config.TOTAL_SCROLL_HEIGHT}px`;
            
            scrollProgress = 0;
            targetScrollProgress = 0;
            
            initScrollHint();
            
            // Reveal Hidden UI (Cosmic Oracle and Message Board)
            const memoryBoard = document.getElementById('memory-board-ui');
            const cosmicOracle = document.getElementById('cosmic-oracle');
            const oracleBubble = document.getElementById('oracle-bubble');
            
            if (memoryBoard) {
                memoryBoard.classList.remove('hidden');
                gsap.fromTo(memoryBoard, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1.5, ease: "power2.out" });
            }
            if (cosmicOracle) {
                cosmicOracle.classList.remove('hidden');
                if (oracleBubble) {
                    gsap.fromTo(oracleBubble, { opacity: 0, x: 20 }, { opacity: 1, x: 0, duration: 1.5, ease: "power2.out", delay: 0.5 });
                }
            }
            
            window.addEventListener('scroll', handlePageScroll);
            animateScrollStory();
        }
    });

    // Camera flies back out to the beginning of the Red String Curve (0, 0, 50)
    transitionTimeline.to(camera.position, {
        x: 0,
        y: 0,
        z: 50,
        duration: 3.5,
        ease: "power2.out"
    });

    // Fade the flash back to normal bloom strength
    transitionTimeline.to(bloomPass, {
        strength: 1.5,
        duration: 3.5,
        ease: "power2.out"
    }, "<");
}

function handlePageScroll() {
    const scrollY = window.scrollY;
    const maxScroll = Config.TOTAL_SCROLL_HEIGHT - window.innerHeight;
    let progress = scrollY / maxScroll;
    targetScrollProgress = Math.max(0, Math.min(1, progress));
}

function updateCameraAlongPath(progress) {
    if (!redStringCurve) return;
    
    const camPos = redStringCurve.getPointAt(progress);
    let lookAtPos;

    if (progress > 0.9) {
        lookAtPos = TARGET_HEART_POS; // Reuse constant singleton
    } else {
        lookAtPos = redStringCurve.getPointAt(Math.min(1.0, progress + 0.08));
    }

    camera.position.copy(camPos);
    updateCameraOffsets(progress);
    camera.lookAt(lookAtPos);
}

// --- OPTIMIZED CONSTELLATION NETWORK BUILDER ---
function updateConstellationNetwork() {
    if (!galaxyPoints || !constellationLines) return;

    const positions = galaxyPoints.geometry.attributes.position.array;
    const count = positions.length / 3;
    const connectDistance = 4.5;
    let lineIdx = 0;

    // Use dynamic sample indexes to avoid nested loop lag (Throttled O(N) evaluation)
    const subsetSize = 80;
    
    for (let i = 0; i < subsetSize; i++) {
        if (lineIdx >= maxConstellationLines) break;

        const idx = Math.floor(Math.random() * count) * 3;
        _tempV1.set(positions[idx], positions[idx + 1], positions[idx + 2]);

        for (let j = 0; j < 5; j++) {
            if (lineIdx >= maxConstellationLines) break;

            const idx2 = Math.floor(Math.random() * count) * 3;
            if (idx === idx2) continue;

            _tempV2.set(positions[idx2], positions[idx2 + 1], positions[idx2 + 2]);

            if (_tempV1.distanceTo(_tempV2) < connectDistance) {
                const i6 = lineIdx * 6;
                
                // Write into our pre-allocated typed buffer directly
                constellationPositions[i6] = _tempV1.x;
                constellationPositions[i6 + 1] = _tempV1.y;
                constellationPositions[i6 + 2] = _tempV1.z;
                constellationPositions[i6 + 3] = _tempV2.x;
                constellationPositions[i6 + 4] = _tempV2.y;
                constellationPositions[i6 + 5] = _tempV2.z;
                
                lineIdx++;
            }
        }
    }

    constellationLines.geometry.attributes.position.needsUpdate = true;
    constellationLines.geometry.setDrawRange(0, lineIdx * 2);
}

// --- MOUSE MOVEMENT INTERACTION TRAIL ---
window.addEventListener('mousemove', (event) => {
    if (scene.userData.phase !== 'universe') return;

    // Convert screen coordinates to WebGL world position
    const vector = new THREE.Vector3(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1,
        0.5
    );
    vector.unproject(camera);

    const dir = vector.sub(camera.position).normalize();
    const distance = -camera.position.z / dir.z; 
    const pos = camera.position.clone().add(dir.multiplyScalar(distance));

    createHeartTrail(pos);
});

function createHeartTrail(pos) {
    if (trailPool.length === 0) return;
    
    const particle = trailPool[trailPoolIndex];
    trailPoolIndex = (trailPoolIndex + 1) % trailPoolSize;

    particle.position.copy(pos);
    particle.visible = true;

    // Reset GSAP animations on this pooled mesh to avoid conflicts
    gsap.killTweensOf(particle.position);
    gsap.killTweensOf(particle.material);

    particle.material.opacity = 0.8;

    gsap.to(particle.position, {
        duration: 1.2,
        y: pos.y + 0.8,
        ease: "sine.out"
    });

    gsap.to(particle.material, {
        opacity: 0,
        duration: 1.2,
        ease: "sine.inOut",
        onComplete: () => {
            particle.visible = false;
        }
    });
}

// --- HOLOGRAM CARD BUILDERS ---

function getSharedCardMaterial() {
    if (sharedCardMaterial) return sharedCardMaterial;
    sharedCardMaterial = new THREE.MeshPhysicalMaterial({
        color: 0xff3366,
        emissive: 0x330005,
        roughness: 0.1,
        metalness: 0.1,
        transmission: 0.6,
        thickness: 0.8,
        ior: 1.5,
        transparent: true,
        opacity: 0.9,
        side: THREE.DoubleSide
    });
    return sharedCardMaterial;
}

function createHolographicCard(pos, emoji, noteIndex, label, customMessage = null) {
    // 1. Create 3D Heart Mesh
    const geometry = create3DCrystalHeartGeometry();
    const material = getSharedCardMaterial();

    const heartMesh = new THREE.Mesh(geometry, material);
    heartMesh.lookAt(camera.position);
    heartMesh.position.copy(pos);
    
    heartMesh.userData = {
        type: 'love-note',
        index: noteIndex,
        label: label,
        message: customMessage
    };

    // 2. Create Floating Emoji Child Mesh
    const emojiCanvas = document.createElement('canvas');
    emojiCanvas.width = 256;
    emojiCanvas.height = 256;
    const emojiCtx = emojiCanvas.getContext('2d');
    emojiCtx.font = '160px serif';
    emojiCtx.textAlign = 'center';
    emojiCtx.textBaseline = 'middle';
    emojiCtx.fillText(emoji, 128, 128);

    const emojiTex = new THREE.CanvasTexture(emojiCanvas);
    const emojiGeo = new THREE.PlaneGeometry(1.6, 1.6);
    const emojiMat = new THREE.MeshBasicMaterial({
        map: emojiTex,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
    });
    const emojiMesh = new THREE.Mesh(emojiGeo, emojiMat);
    emojiMesh.position.set(0, 0, 0.35); // Float slightly in front
    heartMesh.add(emojiMesh);

    // 3. Bouncing Finger child mesh pointing to the card
    const fingerCanvas = document.createElement('canvas');
    fingerCanvas.width = 128;
    fingerCanvas.height = 128;
    const fingerCtx = fingerCanvas.getContext('2d');
    fingerCtx.font = '70px serif';
    fingerCtx.textAlign = 'center';
    fingerCtx.textBaseline = 'middle';
    fingerCtx.fillText('👇', 64, 64);
    
    const fingerTex = new THREE.CanvasTexture(fingerCanvas);
    const fingerGeo = new THREE.PlaneGeometry(0.8, 0.8);
    const fingerMat = new THREE.MeshBasicMaterial({
        map: fingerTex,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });
    
    const fingerMesh = new THREE.Mesh(fingerGeo, fingerMat);
    fingerMesh.position.set(0, 2.0, 0); // Above the card locally
    heartMesh.add(fingerMesh);
    
    // Animate finger bouncing
    gsap.to(fingerMesh.position, {
        y: 2.4,
        duration: 0.6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
    });

    scene.add(heartMesh);
    memoryStars.push(heartMesh);

    // Hover float
    gsap.to(heartMesh.position, {
        y: pos.y + 0.8,
        duration: 2 + Math.random(),
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
    });

    // Wobble spin
    gsap.to(heartMesh.rotation, {
        y: heartMesh.rotation.y + 0.4,
        duration: 3 + Math.random() * 2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
    });

    return heartMesh;
}

function findClosestPointOnCurve(point, curve) {
    if (!curve) return new THREE.Vector3(0, 0, point.z);
    let minDistance = Infinity;
    let closestPoint = null;
    const samples = 100;
    
    for (let i = 0; i <= samples; i++) {
        const t = i / samples;
        const curvePoint = curve.getPointAt(t);
        const dist = point.distanceTo(curvePoint);
        if (dist < minDistance) {
            minDistance = dist;
            closestPoint = curvePoint;
        }
    }
    return closestPoint || new THREE.Vector3(0, 0, point.z);
}

function drawConstellationConnection(startPoint, endPoint, animate = true) {
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([
        startPoint.x, startPoint.y, startPoint.z,
        animate ? startPoint.x : endPoint.x,
        animate ? startPoint.y : endPoint.y,
        animate ? startPoint.z : endPoint.z
    ]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const material = new THREE.LineBasicMaterial({
        color: 0xff3366, // Romantic pinkish-red constellation path
        transparent: true,
        opacity: 0.5,
        blending: THREE.AdditiveBlending
    });

    const line = new THREE.Line(geometry, material);
    scene.add(line);

    if (animate) {
        const lineData = { progress: 0 };
        gsap.to(lineData, {
            progress: 1,
            duration: 2.0,
            ease: "sine.out",
            onUpdate: () => {
                const arr = geometry.attributes.position.array;
                arr[3] = THREE.MathUtils.lerp(startPoint.x, endPoint.x, lineData.progress);
                arr[4] = THREE.MathUtils.lerp(startPoint.y, endPoint.y, lineData.progress);
                arr[5] = THREE.MathUtils.lerp(startPoint.z, endPoint.z, lineData.progress);
                geometry.attributes.position.needsUpdate = true;
            }
        });
    }
    return line;
}

function createStaticFloatingNotes() {
    const positions = [
        { z: -20, emoji: '🧸' },
        { z: -60, emoji: '🌹' },
        { z: -100, emoji: '💌' },
        { z: -140, emoji: '🚀' }
    ];

    positions.forEach((item, index) => {
        // Spread cards 6 to 14 units away from the center path
        const side = Math.random() > 0.5 ? 1 : -1;
        const pos = new THREE.Vector3(
            side * (6 + Math.random() * 8),
            (Math.random() - 0.5) * 8,
            item.z
        );
        createHolographicCard(pos, item.emoji, index, "A LOVE NOTES FRAGMENT");
        const closestPoint = findClosestPointOnCurve(pos, redStringCurve);
        drawConstellationConnection(closestPoint, pos, false);
    });
}

async function fetchAndSpawnUserMemories() {
    try {
        const response = await fetch('/api/memories');
        if (!response.ok) return;
        
        const memories = await response.json();
        memories.forEach((m, idx) => {
            // Spread cards 7 to 15 units away from the center path
            const side = Math.random() > 0.5 ? 1 : -1;
            const pos = new THREE.Vector3(
                side * (7 + Math.random() * 8),
                (Math.random() - 0.5) * 8,
                -20 - (idx * 15) // Spread depth slightly further
            );
            createHolographicCard(pos, m.emoji || '✨', idx, m.user_name || "A MEMORY", m.message);
            const closestPoint = findClosestPointOnCurve(pos, redStringCurve);
            drawConstellationConnection(closestPoint, pos, false);
        });
    } catch (err) {
        console.warn("[Backend] Failed to load custom memories database.", err);
    }
}

// --- POPUP DETAILS ---
async function openMemoryDetails(star) {
    gsap.to(star.scale, { x: 1.8, y: 1.8, z: 1.8, duration: 0.3, yoyo: true, repeat: 1 });
    AudioManager.play('sound-twinkle', 0.4);

    let content = "You are loved.";
    const label = star.userData.label || "A MEMORY FRAGMENT";

    if (star.userData.message) {
        content = star.userData.message;
    } else if (star.userData.type === 'love-note') {
        const index = star.userData.index % Config.LOVE_NOTES.length;
        content = Config.LOVE_NOTES[index];
    } else {
        // Grab randomly from database quote library
        try {
            const res = await fetch('/api/quotes');
            if (res.ok) {
                const quotes = await res.json();
                const q = quotes[Math.floor(Math.random() * quotes.length)];
                content = q.content;
            }
        } catch (e) {
            console.warn("API quotes fetch bypassed");
        }
    }

    showMemoryPopup(content, label);
}

// --- DB ACTION FOR MEMORY MODAL ---
async function submitEchoMemory(name, message, emoji, onSuccessCallback) {
    try {
        const response = await fetch('/api/memories', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_name: name || "Anonymous", message: message, emoji: emoji })
        });

        if (response.ok) {
            AudioManager.play('sound-shimmer', 0.6);

            // Instantly spawn hologram card in WebGL view space
            const pos = new THREE.Vector3(
                (Math.random() - 0.5) * 14,
                (Math.random() - 0.5) * 8,
                camera.position.z - 10
            );
            createHolographicCard(pos, emoji, Math.floor(Math.random() * 100), name || "A MEMORY", message);
            const closestPoint = findClosestPointOnCurve(pos, redStringCurve);
            drawConstellationConnection(closestPoint, pos, true);

            onSuccessCallback();
            alert("Your memory has been etched in the stars! ✨");
            showOracleMessage("A new memory fragment has entered our universe.");
        } else {
            const err = await response.json();
            alert("The cosmos rejected your echo: " + (err.error || "Unknown error"));
        }
    } catch (err) {
        console.error("Error submitting memory", err);
        alert("Loss of database uplink. Check setup.");
    }
}

// --- FINALE ---
function triggerFinale() {
    finaleTriggered = true;

    triggerFinaleUI(capturedUserName, () => {
        // Yes Trigger Callback: execute production celebration
        igniteFinaleFireworks();
        
        setTimeout(() => {
            const label = document.getElementById('hero-name-label');
            if (label) {
                label.innerText = "❤️ FOREVER ❤️";
                label.style.fontSize = "clamp(3rem, 12vw, 6rem)";
            }
        }, 2000);
    });
}

function igniteFinaleFireworks() {
    if (galaxyPoints && heartMeshPoints) {
        galaxyPoints.position.copy(heartMeshPoints.position);
        
        gsap.to(galaxyPoints.material, { size: 0.8, opacity: 1, duration: 0.5 });
        gsap.to(galaxyPoints.scale, { x: 2.2, y: 2.2, z: 2.2, duration: 1.5, ease: "elastic.out" });

        const colors = galaxyPoints.geometry.attributes.color.array;
        for (let i = 0; i < colors.length; i += 3) {
            colors[i] = 1;      // Force colors to Gold and Deep Orange
            colors[i + 1] = Math.random() * 0.5;
            colors[i + 2] = 0;
        }
        galaxyPoints.geometry.attributes.color.needsUpdate = true;

        gsap.to(galaxyPoints.rotation, { y: galaxyPoints.rotation.y + 12, duration: 6, ease: "power3.out" });
    }

    if (heartMeshPoints) {
        createHeartExplosion(scene, heartMeshPoints.position);
    }
}

// --- ORACLE TIMED WHISPERS ---
setInterval(() => {
    if (scene.userData.phase === 'universe') {
        const oracleTexts = [
            "The stars whisper of a destined connection...",
            "In every timeline, I'd find you.",
            "The universe is vast, but you are its center.",
            "Even the void glows when you are near.",
            "A thousand galaxies, yet only one you.",
            "Love is the only thing that transcends space and time.",
            "The red string of fate is glowing brightly."
        ];
        const msg = oracleTexts[Math.floor(Math.random() * oracleTexts.length)];
        showOracleMessage(msg);
    }
}, 16000);

function updateAmbientQuotes() {
    const now = Date.now();
    if (now - lastQuoteTime < quoteInterval) return;
    lastQuoteTime = now;

    const quoteContainer = document.getElementById('quote-container');
    const quoteText = document.getElementById('quote-text');
    if (!quoteContainer || !quoteText) return;

    fetch('/api/quotes')
        .then(res => {
            if (res.ok) return res.json();
            throw new Error();
        })
        .then(quotes => {
            if (quotes && quotes.length > 0) {
                const q = quotes[Math.floor(Math.random() * quotes.length)];
                
                // Show container if hidden
                quoteContainer.classList.remove('hidden');
                
                // Fade out old text, replace, and fade in
                gsap.to(quoteText, {
                    opacity: 0,
                    y: -10,
                    duration: 0.8,
                    onComplete: () => {
                        quoteText.innerText = `"${q.content}"`;
                        gsap.fromTo(quoteText, 
                            { opacity: 0, y: 10 },
                            { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }
                        );
                    }
                });
            }
        })
        .catch(() => {
            // Fallback quote if API/database link fails
            quoteContainer.classList.remove('hidden');
            gsap.to(quoteText, {
                opacity: 0,
                y: -10,
                duration: 0.8,
                onComplete: () => {
                    quoteText.innerText = "\"In a universe of chaos, you are my calm.\"";
                    gsap.fromTo(quoteText, 
                        { opacity: 0, y: 10 },
                        { opacity: 1, y: 0, duration: 1.2, ease: "power2.out" }
                    );
                }
            });
        });
}
