import * as THREE from 'three';

export class ShootingStarManager {
    constructor(scene, camera) {
        this.scene = scene;
        this.camera = camera;
        this.stars = [];
        this.lastSpawnTime = Date.now();
        this.spawnInterval = 5000 + Math.random() * 5000; // spawn first one early, then every 8-15s
    }

    spawn() {
        if (this.scene.userData.phase !== 'universe') return;

        const camZ = this.camera.position.z;
        
        // Spawn shooting stars relative to the camera to ensure visibility
        const side = Math.random() > 0.5 ? 1 : -1;
        const startX = side * (10 + Math.random() * 20);
        const startY = 10 + Math.random() * 15;
        const startZ = camZ - 40 - Math.random() * 40;

        const endX = startX - side * (25 + Math.random() * 20);
        const endY = startY - (15 + Math.random() * 15);
        const endZ = startZ + (Math.random() - 0.5) * 15;

        // Line geometry for the visual trail
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array([
            startX, startY, startZ,
            startX, startY, startZ
        ]);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));

        const material = new THREE.LineBasicMaterial({
            color: 0xffaa44, // Golden warm stardust color
            transparent: true,
            opacity: 0.9,
            blending: THREE.AdditiveBlending,
            linewidth: 2 // Note: Windows browsers typically don't support line widths > 1, so length creates visual weight
        });

        const line = new THREE.Line(geometry, material);
        
        // Create an invisible sphere mesh for click detection (larger raycasting hit-box)
        const hitGeometry = new THREE.SphereGeometry(1.5, 8, 8);
        const hitMaterial = new THREE.MeshBasicMaterial({ visible: false });
        const hitMesh = new THREE.Mesh(hitGeometry, hitMaterial);
        hitMesh.position.set(startX, startY, startZ);
        hitMesh.userData = { type: 'shooting-star', parentStar: null };
        
        const star = {
            mesh: line,
            hitMesh: hitMesh,
            start: new THREE.Vector3(startX, startY, startZ),
            end: new THREE.Vector3(endX, endY, endZ),
            progress: 0,
            speed: 0.015 + Math.random() * 0.015,
            length: 6 + Math.random() * 8
        };

        hitMesh.userData.parentStar = star;

        this.scene.add(line);
        this.scene.add(hitMesh);
        this.stars.push(star);
    }

    destroyStar(star, index) {
        this.scene.remove(star.mesh);
        this.scene.remove(star.hitMesh);
        star.mesh.geometry.dispose();
        star.mesh.material.dispose();
        star.hitMesh.geometry.dispose();
        star.hitMesh.material.dispose();
        if (index !== undefined) {
            this.stars.splice(index, 1);
        }
    }

    update() {
        const now = Date.now();
        if (now - this.lastSpawnTime > this.spawnInterval) {
            this.spawn();
            this.lastSpawnTime = now;
            this.spawnInterval = 8000 + Math.random() * 7000;
        }

        for (let i = this.stars.length - 1; i >= 0; i--) {
            const star = this.stars[i];
            star.progress += star.speed;

            if (star.progress >= 1.0) {
                this.destroyStar(star, i);
                continue;
            }

            const currentX = THREE.MathUtils.lerp(star.start.x, star.end.x, star.progress);
            const currentY = THREE.MathUtils.lerp(star.start.y, star.end.y, star.progress);
            const currentZ = THREE.MathUtils.lerp(star.start.z, star.end.z, star.progress);

            // Update hit-box position to follow the star's head
            star.hitMesh.position.set(currentX, currentY, currentZ);

            const totalDist = star.start.distanceTo(star.end);
            const tailProgress = Math.max(0, star.progress - (star.length / totalDist));
            const tailX = THREE.MathUtils.lerp(star.start.x, star.end.x, tailProgress);
            const tailY = THREE.MathUtils.lerp(star.start.y, star.end.y, tailProgress);
            const tailZ = THREE.MathUtils.lerp(star.start.z, star.end.z, tailProgress);

            const positions = star.mesh.geometry.attributes.position.array;
            positions[0] = tailX;
            positions[1] = tailY;
            positions[2] = tailZ;
            positions[3] = currentX;
            positions[4] = currentY;
            positions[5] = currentZ;
            star.mesh.geometry.attributes.position.needsUpdate = true;

            // Fade out near end of progress
            if (star.progress > 0.7) {
                star.mesh.material.opacity = (1.0 - star.progress) / 0.3 * 0.9;
            }
        }
    }
}
