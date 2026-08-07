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

export function createSparkleExplosion(scene, pos) {
    const count = 300;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = [];

    const palette = [
        new THREE.Color('#ffaa44'), // Gold
        new THREE.Color('#ffdd66'), // Twinkle Yellow
        new THREE.Color('#ffffff'), // White
        new THREE.Color('#ff7700')  // Warm Orange
    ];

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3] = pos.x;
        positions[i3 + 1] = pos.y;
        positions[i3 + 2] = pos.z;

        const col = palette[Math.floor(Math.random() * palette.length)];
        colors[i3] = col.r;
        colors[i3 + 1] = col.g;
        colors[i3 + 2] = col.b;

        // Random velocities in sphere
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const speed = 2 + Math.random() * 8;
        
        velocities.push({
            x: Math.sin(phi) * Math.cos(theta) * speed,
            y: Math.sin(phi) * Math.sin(theta) * speed,
            z: Math.cos(phi) * speed
        });
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.3,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        blending: THREE.AdditiveBlending
    });

    const points = new THREE.Points(geometry, material);
    scene.add(points);

    const posAttr = geometry.getAttribute('position');
    const arr = posAttr.array;
    const startTime = Date.now();
    const duration = 1200; // ms

    function animateSparkle() {
        const elapsed = Date.now() - startTime;
        const progress = elapsed / duration;

        if (progress >= 1.0) {
            disposeObject(points);
            return;
        }

        for (let i = 0; i < count; i++) {
            const i3 = i * 3;
            arr[i3] += velocities[i].x * 0.016;
            arr[i3 + 1] += velocities[i].y * 0.016;
            arr[i3 + 2] += velocities[i].z * 0.016;
            
            // Add gravity pull downwards
            velocities[i].y -= 0.1;
        }
        posAttr.needsUpdate = true;
        material.opacity = 1 - progress;

        requestAnimationFrame(animateSparkle);
    }
    animateSparkle();
}

export function createBigBangExplosion(scene, pos) {
    const count = 5000;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const velocities = [];

    // Vivid Big Bang color palette: true red, electric orange, hot pink, deep purple
    const palette = [
        new THREE.Color('#ff0040'), 
        new THREE.Color('#ff5500'), 
        new THREE.Color('#9b00e8'), 
        new THREE.Color('#ff00aa')
    ];

    for (let i = 0; i < count; i++) {
        const i3 = i * 3;
        positions[i3] = pos.x;
        positions[i3 + 1] = pos.y;
        positions[i3 + 2] = pos.z;

        const col = palette[Math.floor(Math.random() * palette.length)];
        colors[i3] = col.r;
        colors[i3 + 1] = col.g;
        colors[i3 + 2] = col.b;

        // Spherical expansion velocity vector
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos((Math.random() * 2) - 1);
        const speed = 12 + Math.random() * 38; // Expansion speed range

        velocities.push(new THREE.Vector3(
            Math.sin(phi) * Math.cos(theta) * speed,
            Math.sin(phi) * Math.sin(theta) * speed,
            Math.cos(phi) * speed
        ));
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
        size: 0.35,
        vertexColors: true,
        transparent: true,
        opacity: 1.0,
        blending: THREE.AdditiveBlending
    });

    const explosion = new THREE.Points(geometry, material);
    scene.add(explosion);

    const positionsAttr = geometry.getAttribute('position');
    const array = positionsAttr.array;

    const timeline = gsap.timeline({
        onComplete: () => {
            disposeObject(explosion);
        }
    });

    // Ease opacity out slowly over 4.5 seconds
    timeline.to(material, {
        opacity: 0.0,
        duration: 4.5,
        ease: "power2.inOut"
    });

    // Update positions along trajectory vectors
    timeline.to({}, {
        duration: 4.5,
        onUpdate: () => {
            const progress = timeline.progress();
            for (let i = 0; i < count; i++) {
                const i3 = i * 3;
                const vel = velocities[i];
                array[i3] = pos.x + vel.x * progress;
                array[i3 + 1] = pos.y + vel.y * progress;
                array[i3 + 2] = pos.z + vel.z * progress;
            }
            positionsAttr.needsUpdate = true;
        }
    }, "<");
}

export function create3DCrystalHeartGeometry() {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0.8);
    shape.bezierCurveTo(0, 1.2, 0.5, 1.8, 1.3, 1.8);
    shape.bezierCurveTo(2.3, 1.8, 2.3, 0.8, 2.3, 0.8);
    shape.bezierCurveTo(2.3, 0.2, 1.5, -0.6, 0, -1.6);
    shape.bezierCurveTo(-1.5, -0.6, -2.3, 0.2, -2.3, 0.8);
    shape.bezierCurveTo(-2.3, 0.8, -2.3, 1.8, -1.3, 1.8);
    shape.bezierCurveTo(-0.5, 1.8, 0, 1.2, 0, 0.8);

    const extrudeSettings = {
        depth: 0.4,
        bevelEnabled: true,
        bevelSegments: 2,
        steps: 1,
        bevelSize: 0.1,
        bevelThickness: 0.1
    };

    const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    geometry.center();
    return geometry;
}
