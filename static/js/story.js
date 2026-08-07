import * as THREE from 'three';
import { Config } from './config.js';
import { camera, updateCameraOffsets } from './scene.js';

export let redStringCurve;
export let redStringMesh;

export function initStory(scene) {
    // 1. Create spline path
    redStringCurve = new THREE.CatmullRomCurve3(Config.CURVE_POINTS);

    // 2. Render spline path as a stylized glowing wireframe tube
    const tubeGeo = new THREE.TubeGeometry(redStringCurve, 100, 0.1, 8, false);
    const tubeMat = new THREE.MeshBasicMaterial({
        color: Config.COLORS.trueRed,
        transparent: true,
        opacity: 0.6,
        wireframe: true
    });
    
    redStringMesh = new THREE.Mesh(tubeGeo, tubeMat);
    redStringMesh.name = 'redString';
    scene.add(redStringMesh);
}

export function updateCameraAlongPath(scrollProgress) {
    if (!redStringCurve || !camera) return;

    // Get position on the curve corresponding to the scroll percentage
    const camPos = redStringCurve.getPointAt(scrollProgress);
    let lookAtPos;

    if (scrollProgress > 0.9) {
        // At the end of the journey, focus on the terminal node (Crystal Heart)
        lookAtPos = redStringCurve.getPointAt(1.0);
    } else {
        // Look slightly ahead along the path for dynamic camera movement
        lookAtPos = redStringCurve.getPointAt(Math.min(1.0, scrollProgress + 0.08));
    }

    camera.position.copy(camPos);
    
    // Apply viewport-adaptive landscape/portrait offsets
    updateCameraOffsets(scrollProgress);
    
    camera.lookAt(lookAtPos);
}

export function updateStoryOverlay(scrollProgress) {
    const chapters = [
        document.getElementById('chapter-1'),
        document.getElementById('chapter-2'),
        document.getElementById('chapter-3'),
        document.getElementById('chapter-4')
    ];

    const checkPoints = [0.05, 0.35, 0.75, 0.92];

    chapters.forEach((chap, idx) => {
        if (!chap) return;
        const point = checkPoints[idx];
        const dist = Math.abs(scrollProgress - point);
        
        // If camera is close to the chapter node, show the overlay text
        if (dist < 0.18) {
            chap.classList.add('active');
        } else {
            chap.classList.remove('active');
        }
    });
}
