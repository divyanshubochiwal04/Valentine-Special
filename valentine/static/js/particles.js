import * as THREE from 'three';
import { Config } from './config.js';

export function disposeObject(obj) {
    if (!obj) return;
    
    // Recursive disposal for hierarchies
    if (obj.children) {
        for (let i = obj.children.length - 1; i >= 0; i--) {
            disposeObject(obj.children[i]);
        }
    }

    if (obj.geometry) {
        obj.geometry.dispose();
    }
    
    if (obj.material) {
        if (Array.isArray(obj.material)) {
            obj.material.forEach(mat => mat.dispose());
        } else {
            obj.material.dispose();
        }
    }
    
    if (obj.material && obj.material.map) {
        obj.material.map.dispose();
    }
    
    if (obj.parent) {
        obj.parent.remove(obj);
    }
}

export function createVoidParticles(scene) {
    const particlesCount = Config.VOID_PARTICLES_COUNT;
    const geometry = new THREE.BufferGeometry();
    const posArray = new Float32Array(particlesCount * 3);
    const originalPosArray = new Float32Array(particlesCount * 3);

    for (let i = 0; i < particlesCount * 3; i++) {
        const val = (Math.random() - 0.5) * 20;
        posArray[i] = val;
        originalPosArray[i] = val;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    const material = new THREE.PointsMaterial({
        size: 0.05,
        color: Config.COLORS.trueRed,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending,
    });

    const mesh = new THREE.Points(geometry, material);
    scene.add(mesh);
    return { mesh, geometry, originalPos: originalPosArray };
}

export function createGalaxy(scene, curve) {
    const galaxyCount = Config.GALAXY_PARTICLES_COUNT;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(galaxyCount * 3);
    const colors = new Float32Array(galaxyCount * 3);

    for (let i = 0; i < galaxyCount; i++) {
        const t = Math.random();
        const pointOnCurve = curve.getPoint(t);

        const spread = 20 + Math.random() * 30;
        const angle = Math.random() * Math.PI * 2;

        const x = pointOnCurve.x + Math.cos(angle) * spread;
        const y = pointOnCurve.y + Math.sin(angle) * spread;
        const z = pointOnCurve.z + (Math.random() - 0.5) * 50;

        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;

        // Custom Gradient: transition from deep red to orange to purple
        const col = t > 0.6 ? new THREE.Color(Config.COLORS.purple) : (t > 0.3 ? new THREE.Color(Config.COLORS.orange) : new THREE.Color(Config.COLORS.deepRed));
        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({ 
        size: 0.15, 
        vertexColors: true, 
        transparent: true, 
        opacity: 0.8, 
        blending: THREE.AdditiveBlending 
    });
    
    const galaxyPoints = new THREE.Points(geometry, material);
    galaxyPoints.name = 'galaxy';
    scene.add(galaxyPoints);
    return galaxyPoints;
}

export function createProceduralHeart(scene, centerPos) {
    const count = Config.HEART_PARTICLES_COUNT;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const colorCore = new THREE.Color(Config.COLORS.deepRed);
    const colorOuter = new THREE.Color(Config.COLORS.pinkish);

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        const t = Math.random() * Math.PI * 2;
        const r = Math.random();

        // Parametric Formula
        let x = 16 * Math.pow(Math.sin(t), 3);
        let y = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
        let z = (Math.random() - 0.5) * 10;

        const scale = 0.5;
        x *= scale * r; 
        y *= scale * r; 
        z *= scale * r;

        positions[i3] = x;
        positions[i3 + 1] = y;
        positions[i3 + 2] = z;

        const mix = r > 0.8 ? colorOuter : colorCore;
        colors[i3] = mix.r;
        colors[i3 + 1] = mix.g;
        colors[i3 + 2] = mix.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false
    });

    const heartPoints = new THREE.Points(geometry, material);
    heartPoints.position.copy(centerPos);
    scene.add(heartPoints);
    return heartPoints;
}

export function createFlowerCluster(scene, centerPos, floatingFlowers) {
    const totalFlowers = 80;
    for (let i = 0; i < totalFlowers; i++) {
        const zOffset = (Math.random() - 0.5) * 60;
        const z = centerPos.z + zOffset;

        const angle = Math.random() * Math.PI * 2;
        const radius = 15 + Math.random() * 20;

        const x = centerPos.x + Math.cos(angle) * radius;
        const y = centerPos.y + Math.sin(angle) * (radius * 0.6);

        const pos = new THREE.Vector3(x, y, z);
        
        let mesh;
        if (i % 2 === 0) {
            mesh = createProceduralTulipAt(pos);
        } else {
            mesh = createProceduralOrchidAt(pos);
        }
        
        scene.add(mesh);
        floatingFlowers.push(mesh);
        
        // Dynamic GSAP entry animation
        mesh.scale.set(0, 0, 0);
        gsap.to(mesh.scale, { 
            x: 1, 
            y: 1, 
            z: 1, 
            duration: 2 + Math.random(), 
            delay: 1.5 + (Math.random() * 0.5) 
        });
    }
}

function createProceduralTulipAt(pos) {
    const particles = 500;
    const geometry = new THREE.BufferGeometry();
    const posArr = new Float32Array(particles * 3);
    const colArr = new Float32Array(particles * 3);
    
    const colorInside = new THREE.Color(Config.COLORS.deepRed);
    const colorEdge = new THREE.Color(Config.COLORS.orange);

    for (let i = 0; i < particles; i++) {
        const i3 = i * 3;
        const u = Math.random() * Math.PI; 
        const v = Math.random() * Math.PI * 2;
        const radius = Math.sin(u) * 2;
        
        const x = radius * Math.cos(v); 
        const y = u * 3 - 2; 
        const z = radius * Math.sin(v);
        
        posArr[i3] = x * 0.5; 
        posArr[i3 + 1] = y * 0.5; 
        posArr[i3 + 2] = z * 0.5;
        
        const mixColor = Math.random() > 0.7 ? colorEdge : colorInside;
        colArr[i3] = mixColor.r; 
        colArr[i3 + 1] = mixColor.g; 
        colArr[i3 + 2] = mixColor.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    
    const material = new THREE.PointsMaterial({ 
        size: 0.05, 
        vertexColors: true, 
        transparent: true, 
        opacity: 0.8, 
        blending: THREE.AdditiveBlending 
    });
    
    const mesh = new THREE.Points(geometry, material);
    mesh.position.copy(pos);
    return mesh;
}

function createProceduralOrchidAt(pos) {
    const particles = 600;
    const geometry = new THREE.BufferGeometry();
    const posArr = new Float32Array(particles * 3);
    const colArr = new Float32Array(particles * 3);
    
    const c1 = new THREE.Color(0xffffff); 
    const c2 = new THREE.Color(Config.COLORS.purple);
    
    for (let i = 0; i < particles; i++) {
        const i3 = i * 3;
        const angle = Math.random() * Math.PI * 2; 
        const r = Math.pow(Math.random(), 0.5) * 3;
        const lobedR = r * (0.8 + 0.2 * Math.sin(5 * angle));
        
        const x = lobedR * Math.cos(angle); 
        const y = (Math.random() - 0.5); 
        const z = lobedR * Math.sin(angle);
        
        posArr[i3] = x * 0.6; 
        posArr[i3 + 1] = y * 0.6; 
        posArr[i3 + 2] = z * 0.6;
        
        const c = r < 1 ? c1 : c2; 
        colArr[i3] = c.r; 
        colArr[i3 + 1] = c.g; 
        colArr[i3 + 2] = c.b;
    }
    
    geometry.setAttribute('position', new THREE.BufferAttribute(posArr, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colArr, 3));
    
    const material = new THREE.PointsMaterial({ 
        size: 0.04, 
        vertexColors: true, 
        transparent: true, 
        opacity: 0.8, 
        blending: THREE.AdditiveBlending 
    });
    
    const mesh = new THREE.Points(geometry, material);
    mesh.position.copy(pos);
    return mesh;
}

export function createHeartExplosion(scene, pos) {
    const count = 1000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3] = pos.x;
        positions[i3 + 1] = pos.y;
        positions[i3 + 2] = pos.z;

        colors[i3] = 1;
        colors[i3 + 1] = 0;
        colors[i3 + 2] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({ 
        size: 0.5, 
        vertexColors: true, 
        blending: THREE.AdditiveBlending, 
        transparent: true 
    });
    
    const explosionPoints = new THREE.Points(geometry, material);
    scene.add(explosionPoints);

    const positionsAttribute = geometry.getAttribute('position');
    const array = positionsAttribute.array;

    const tl = gsap.timeline();
    const obj = { t: 0 };

    tl.to(obj, {
        t: 1,
        duration: 2.5,
        ease: "power2.out",
        onUpdate: () => {
            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                const angle = Math.random() * Math.PI * 2;
                const r = Math.random() * 50 * obj.t;
                array[i3] = pos.x + (Math.random() - 0.5) * r;
                array[i3 + 1] = pos.y + (Math.random() - 0.5) * r;
                array[i3 + 2] = pos.z + (Math.random() - 0.5) * r;
            }
            positionsAttribute.needsUpdate = true;
        },
        onComplete: () => {
            disposeObject(explosionPoints);
        }
    });
}
