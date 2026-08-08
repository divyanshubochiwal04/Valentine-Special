import * as THREE from 'three';
import { camera } from './scene.js';

export const InputState = {
    mouseX: 0,
    mouseY: 0,
    targetX: 0,
    targetY: 0,
    mouseNormalized: new THREE.Vector2(),
    raycaster: new THREE.Raycaster()
};

let cursorEl = null;

export function initInteraction(scene, onMemoryStarClicked) {
    cursorEl = document.getElementById('custom-cursor');
    
    // Mouse Move listener
    window.addEventListener('mousemove', (e) => {
        handleMoveInput(e.clientX, e.clientY, scene);
        
        // Render custom cursor if element exists
        if (cursorEl) {
            gsap.to(cursorEl, {
                x: e.clientX,
                y: e.clientY,
                xPercent: -50,
                yPercent: -50,
                duration: 0.1,
                opacity: 1
            });
        }
        
        // Move hover tooltip if it exists
        const tooltip = document.getElementById('hover-tooltip');
        if (tooltip) {
            gsap.to(tooltip, {
                x: e.clientX + 15,
                y: e.clientY + 15,
                duration: 0.05
            });
        }
        
        // Spawn sparkles with 15% probability to avoid DOM congestion
        if (Math.random() > 0.85) {
            createCursorSparkle(e.clientX, e.clientY);
        }
    });

    // Touch Move support (throttled)
    window.addEventListener('touchmove', (e) => {
        if (e.touches.length > 0) {
            handleMoveInput(e.touches[0].clientX, e.touches[0].clientY, scene);
        }
    }, { passive: true });

    // Click Detection on 3D Objects
    window.addEventListener('click', (e) => {
        detectIntersections(e.clientX, e.clientY, scene, onMemoryStarClicked);
    });

    // Mobile touch Click Detection (increases raycaster threshold for fat fingers)
    window.addEventListener('touchend', (e) => {
        if (e.changedTouches.length === 0) return;
        
        InputState.raycaster.params.Points.threshold = 0.5;
        InputState.raycaster.params.Mesh.threshold = 0.5;
        
        detectIntersections(
            e.changedTouches[0].clientX, 
            e.changedTouches[0].clientY, 
            scene, 
            onMemoryStarClicked
        );
    });
}

function handleMoveInput(clientX, clientY, scene) {
    InputState.mouseX = clientX;
    InputState.mouseY = clientY;
    InputState.targetX = clientX / window.innerWidth - 0.5;
    InputState.targetY = clientY / window.innerHeight - 0.5;
    
    InputState.mouseNormalized.x = (clientX / window.innerWidth) * 2 - 1;
    InputState.mouseNormalized.y = -(clientY / window.innerHeight) * 2 + 1;

    // Raycast hover detection for interactive stars, cards, and shooting stars
    if (scene && scene.userData.phase === 'universe') {
        InputState.raycaster.setFromCamera(InputState.mouseNormalized, camera);
        const memoryStars = scene.userData.memoryStars || [];
        
        // Find shooting star hitMeshes in scene
        const hitMeshes = scene.children.filter(child => child.userData && child.userData.type === 'shooting-star');
        
        // Find central crystal heart if exists
        const centralHeart = scene.children.find(child => child.name === 'central-crystal-heart');
        
        const allTargets = [...memoryStars, ...hitMeshes];
        if (centralHeart) {
            allTargets.push(centralHeart);
        }
        
        const intersects = InputState.raycaster.intersectObjects(allTargets);

        if (intersects.length > 0) {
            cursorEl?.classList.add('clickable');
            
            const hitObject = intersects[0].object;
            // Only scale memory cards, not shooting star hit boxes or central heart
            if (hitObject && !hitObject.userData.isHovered && hitObject.userData.type !== 'shooting-star' && hitObject.name !== 'central-crystal-heart') {
                hitObject.userData.isHovered = true;
                gsap.to(hitObject.scale, { x: 1.4, y: 1.4, z: 1.4, duration: 0.3 });
                
                // Show tooltip with memory label/author
                const tooltip = document.getElementById('hover-tooltip');
                if (tooltip && hitObject.userData.label) {
                    tooltip.innerText = hitObject.userData.label;
                    gsap.to(tooltip, { opacity: 1, duration: 0.2 });
                }
            } else if (hitObject && hitObject.name === 'central-crystal-heart' && !hitObject.userData.isHovered) {
                hitObject.userData.isHovered = true;
                
                // Show click indicator tooltip for central heart
                const tooltip = document.getElementById('hover-tooltip');
                if (tooltip) {
                    tooltip.innerText = "✨ CLICK ME ✨";
                    gsap.to(tooltip, { opacity: 1, duration: 0.2 });
                }
            }
        } else {
            cursorEl?.classList.remove('clickable');
            
            // Restore scale of any previously hovered cards
            let hoveredObjectFound = false;
            memoryStars.forEach(star => {
                if (star.userData.isHovered) {
                    star.userData.isHovered = false;
                    gsap.to(star.scale, { x: 1.0, y: 1.0, z: 1.0, duration: 0.3 });
                    hoveredObjectFound = true;
                }
            });
            
            if (centralHeart && centralHeart.userData.isHovered) {
                centralHeart.userData.isHovered = false;
                hoveredObjectFound = true;
            }
            
            if (hoveredObjectFound) {
                const tooltip = document.getElementById('hover-tooltip');
                if (tooltip) {
                    gsap.to(tooltip, { opacity: 0, duration: 0.2 });
                }
            }
        }
    }
}

function detectIntersections(clientX, clientY, scene, callback) {
    if (scene.userData.phase !== 'universe') return;

    // Set normalized coordinates
    const mouseNorm = new THREE.Vector2(
        (clientX / window.innerWidth) * 2 - 1,
        -(clientY / window.innerHeight) * 2 + 1
    );

    InputState.raycaster.setFromCamera(mouseNorm, camera);
    
    // 1. Check shooting stars first
    const hitMeshes = scene.children.filter(child => child.userData && child.userData.type === 'shooting-star');
    const starIntersects = InputState.raycaster.intersectObjects(hitMeshes);
    if (starIntersects.length > 0) {
        const hitMesh = starIntersects[0].object;
        const star = hitMesh.userData.parentStar;
        if (star) {
            import('./particles.js').then(module => {
                module.createSparkleExplosion(scene, hitMesh.position);
            });
            import('./audio.js').then(module => {
                module.AudioManager.play('sound-twinkle', 0.8);
            });
            
            const manager = scene.userData.shootingStarManager;
            if (manager) {
                manager.destroyStar(star);
                const idx = manager.stars.indexOf(star);
                if (idx > -1) manager.stars.splice(idx, 1);
            }
            return;
        }
    }

    // 2. Check central crystal heart click
    const centralHeart = scene.children.find(child => child.name === 'central-crystal-heart');
    if (centralHeart) {
        const heartIntersects = InputState.raycaster.intersectObject(centralHeart);
        if (heartIntersects.length > 0) {
            import('./particles.js').then(module => {
                module.createHeartExplosion(scene, centralHeart.position);
            });
            import('./audio.js').then(module => {
                module.AudioManager.play('sound-shimmer', 0.8);
            });
            
            // Pop/scale animation bounce
            const currentScale = centralHeart.scale.x;
            gsap.killTweensOf(centralHeart.scale);
            gsap.fromTo(centralHeart.scale, 
                { x: currentScale * 1.5, y: currentScale * 1.5, z: currentScale * 1.5 },
                { x: currentScale, y: currentScale, z: currentScale, duration: 0.8, ease: "elastic.out(1, 0.3)" }
            );
            return;
        }
    }

    // 3. Fallback to memory stars
    const memoryStars = scene.userData.memoryStars || [];
    const intersects = InputState.raycaster.intersectObjects(memoryStars);

    if (intersects.length > 0) {
        // Return closest intersected mesh
        callback(intersects[0].object);
    }
}

function createCursorSparkle(x, y) {
    const s = document.createElement('div');
    s.innerHTML = "✨";
    s.className = "fixed pointer-events-none text-xs z-[9998] text-red-500/80";
    s.style.left = x + 'px';
    s.style.top = y + 'px';
    s.style.transform = 'translate(-50%, -50%)';
    document.body.appendChild(s);

    gsap.to(s, {
        y: y - 50 - (Math.random() * 30),
        x: x + (Math.random() - 0.5) * 60,
        opacity: 0,
        scale: 1.8,
        duration: 0.8 + Math.random() * 0.4,
        ease: "power1.out",
        onComplete: () => s.remove()
    });
}

export function project3DLabel(elementId, position) {
    const label = document.getElementById(elementId);
    if (!label || !camera) return;

    const vec = position.clone();
    vec.project(camera);

    // Verify it is in front of the camera
    if (vec.z < 1) {
        const x = (vec.x * 0.5 + 0.5) * window.innerWidth;
        const y = (-(vec.y * 0.5) + 0.5) * window.innerHeight;
        label.style.transform = `translate(-50%, -50%) translate(${x}px, ${y}px)`;
        return true;
    }
    return false;
}
