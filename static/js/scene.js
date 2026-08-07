import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Config } from './config.js';

export let scene;
export let camera;
export let renderer;
export let composer;
export let bloomPass;

export function initScene() {
    scene = new THREE.Scene();
    
    // Set perspective camera with initial values (FOV will be auto-calculated)
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2)); // Limit pixel ratio to 2 for performance
    renderer.toneMapping = THREE.ReinhardToneMapping;
    
    const container = document.getElementById('canvas-container');
    if (container) {
        container.innerHTML = ''; // Clean container
        container.appendChild(renderer.domElement);
    }

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(Config.COLORS.trueRed, 2, 100);
    pointLight.position.set(10, 10, 10);
    scene.add(pointLight);

    // Post processing for glowing effects (Bloom)
    const renderScene = new RenderPass(scene, camera);
    bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        1.5, // Bloom intensity
        0.4, // Radius
        0.85 // Threshold
    );

    composer = new EffectComposer(renderer);
    composer.addPass(renderScene);
    composer.addPass(bloomPass);

    // Bind window resize event
    window.addEventListener('resize', handleWindowResize);
    handleWindowResize(); // Set initial sizes
}

function calculateFov(aspect) {
    // Senior Math: shift from 75 FOV on landscape to ~100 on portrait
    // so the scene maintains depth and spacing on thin screens.
    const baseFov = 75;
    if (aspect > 1) return baseFov;
    return baseFov + Math.pow(1 - aspect, 2) * 30 + (1 - aspect) * 15;
}

function handleWindowResize() {
    if (!camera || !renderer || !composer) return;
    
    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / height;

    camera.aspect = aspect;
    camera.fov = calculateFov(aspect);
    camera.updateProjectionMatrix();

    renderer.setSize(width, height);
    composer.setSize(width, height);
}

export function updateCameraOffsets(scrollProgress) {
    if (scene.userData.phase === 'universe') {
        const aspect = window.innerWidth / window.innerHeight;
        const isPortrait = aspect < 1;
        
        // Senior Logic: Offset helps maintain visibility above text overlays
        const offsetX = isPortrait ? 0 : 2;
        const offsetY = isPortrait ? (1 / aspect) * 1.5 : 2;

        camera.position.x += offsetX;
        camera.position.y += offsetY;
    }
}
