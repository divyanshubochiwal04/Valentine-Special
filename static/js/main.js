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
    disposeObject 
} from './particles.js';
import { 
    initStory, 
    redStringCurve,
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

// --- STATE MANAGEMENT ---
let animationId = null;
let clock = new THREE.Clock();

// Three.js entities reference lists (for disposal and animation)
const memoryStars = []; 
const floatingFlowers = []; 
let voidParticles = null;
let galaxyPoints = null;
let heartMeshPoints = null;

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

    // 6. Start Void Loop
    scene.userData.phase = 'void';
    animateVoid();
});

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

function animateScrollStory() {
    if (scene.userData.phase !== 'universe') return;

    animationId = requestAnimationFrame(animateScrollStory);

    // 1. Interpolate Scroll Progress for smooth fluid movement
    scrollProgress += (targetScrollProgress - scrollProgress) * 0.05;

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

    // 6. Parametric Heart pulse beat computation
    if (heartMeshPoints) {
        const time = Date.now() * 0.002;
        const pulse = 1 + Math.sin(time) * 0.05 + Math.sin(time * 3) * 0.02;
        heartMeshPoints.scale.set(pulse, pulse, pulse);
        heartMeshPoints.rotation.y += 0.002;
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

    // 1. Lock scrolling during Big Bang intro transition
    document.body.style.overflowY = 'hidden';
    document.getElementById('story-container').classList.remove('hidden');

    // 2. Setup Camera at the zoomed-in center of the void (0, 0, 0.1)
    camera.position.set(0, 0, 0.1);

    // 3. Spline Curve Setup
    initStory(scene);

    // 4. Galaxies
    galaxyPoints = createGalaxy(scene, redStringCurve);

    // 5. Procedural Crystal Heart
    heartMeshPoints = createProceduralHeart(scene, new THREE.Vector3(0, 0, -210));
    
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
        lookAtPos = new THREE.Vector3(0, 0, -210); // Look at Crystal Heart
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
        const v1 = new THREE.Vector3(positions[idx], positions[idx + 1], positions[idx + 2]);

        for (let j = 0; j < 5; j++) {
            if (lineIdx >= maxConstellationLines) break;

            const idx2 = Math.floor(Math.random() * count) * 3;
            if (idx === idx2) continue;

            const v2 = new THREE.Vector3(positions[idx2], positions[idx2 + 1], positions[idx2 + 2]);

            if (v1.distanceTo(v2) < connectDistance) {
                const i6 = lineIdx * 6;
                
                // Write into our pre-allocated typed buffer directly
                constellationPositions[i6] = v1.x;
                constellationPositions[i6 + 1] = v1.y;
                constellationPositions[i6 + 2] = v1.z;
                constellationPositions[i6 + 3] = v2.x;
                constellationPositions[i6 + 4] = v2.y;
                constellationPositions[i6 + 5] = v2.z;
                
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
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array([pos.x, pos.y, pos.z]);
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    
    const particle = new THREE.Points(geometry, heartTrailMaterial.clone());
    scene.add(particle);
    heartTrailParticles.push(particle);

    gsap.to(particle.position, {
        duration: 1.2,
        y: pos.y + 0.6,
        opacity: 0,
        onUpdate: () => {
            if (particle.material) {
                particle.material.opacity = 0.7 * (1 - (particle.position.y - pos.y) / 0.6);
            }
        },
        onComplete: () => {
            // Clean resources
            disposeObject(particle);
            const index = heartTrailParticles.indexOf(particle);
            if (index > -1) heartTrailParticles.splice(index, 1);
        }
    });
}

// --- HOLOGRAM CARD BUILDERS ---

function createHolographicCard(pos, emoji, noteIndex, label, customMessage = null) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Draw background
    ctx.fillStyle = 'rgba(15, 0, 8, 0.9)'; 
    ctx.fillRect(0, 0, 512, 512);

    // Border
    ctx.strokeStyle = '#ff0055';
    ctx.lineWidth = 16;
    ctx.strokeRect(10, 10, 492, 492);

    // Emoji glyph center
    ctx.font = '220px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(emoji, 256, 256);

    const texture = new THREE.CanvasTexture(canvas);
    const geometry = new THREE.PlaneGeometry(3, 3);
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending
    });

    const card = new THREE.Mesh(geometry, material);
    card.lookAt(camera.position);
    card.position.copy(pos);
    
    card.userData = {
        type: 'love-note',
        index: noteIndex,
        label: label,
        message: customMessage
    };

    // Bouncing Finger child mesh pointing to the card
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
    card.add(fingerMesh);
    
    // Animate finger bouncing
    gsap.to(fingerMesh.position, {
        y: 2.4,
        duration: 0.6,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
    });

    scene.add(card);
    memoryStars.push(card);

    // Hover float
    gsap.to(card.position, {
        y: pos.y + 0.8,
        duration: 2 + Math.random(),
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
    });

    // Wobble spin
    gsap.to(card.rotation, {
        y: card.rotation.y + 0.4,
        duration: 3 + Math.random() * 2,
        yoyo: true,
        repeat: -1,
        ease: "sine.inOut"
    });
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
