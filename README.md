# Another Universe: A Premium Interactive WebGL Journey

An interactive, 3D WebGL storyboarding experience detailing a journey along the "Red String of Fate" in a dynamic star-field universe. Built with **Flask**, **MySQL**, **Three.js (WebGL)**, and **GSAP**, this project showcases expert-level engineering practices across backend architecture, database connection resilience, WebGL memory optimization, and modular UI engineering.

---

## 🛠️ Tech Stack Overview

- **Backend**: Python 3.12+, Flask (Application Factory Pattern)
- **Database**: MySQL (Thread-Safe Connection Pooling)
- **Frontend Core**: Vanilla HTML5, CSS Variables, Tailwind CSS (via CDN utilities)
- **3D Graphics & Animations**: Three.js (r160), GSAP (GreenSock Animation Platform)
- **Environment & Hosting**: Dotenv configurations, fully prepped for Gunicorn/WSGI and Railway deployments

---

## 📐 Software Architecture & Production Standards

This project has been built to conform to production-ready guidelines, replacing typical beginner patterns with senior-level software designs:

### 1. Flask Application Factory Pattern
Instead of allocating a global Flask app object that limits scale and testing, [app.py](valentine/app.py) implements `create_app()`. This isolates configurations, registers endpoints cleanly, maps global custom error handlers (`400`, `404`, `500` reporting in JSON/HTML), and integrates standard Python `logging` to capture audit trails.

### 2. Thread-Safe Database Connection Pooling
In [database.py](valentine/database.py), connections are managed using `mysql.connector.pooling.MySQLConnectionPool`.
- **Why?** Opening and closing raw TCP connections on every HTTP request is highly expensive and easily crashes under load.
- **Resilience**: The connection pool automatically recycles inactive sockets, resets sessions, and implements a soft-fail graceful degradation to direct connections if the pool gets clogged.

### 3. Modular ES6 Frontend Architecture
The frontend has been modularized from a massive single file into cohesive, decoupled ES Modules under `static/js/`:
- **`main.js`**: Central orchestrator. Manages page render loops and event delegates.
- **`config.js`**: Single source of truth for assets, coordinates, colors, and notes.
- **`audio.js`**: Wraps the HTML5 Audio interface, unlocking contexts on mobile gesture requirements, and smoothing volumes in response to scroll positions.
- **`scene.js`**: Controls the WebGL camera, renderer sizing, lighting, and post-processing Bloom composers.
- **`story.js`**: Computes the Catmull-Rom path curve and adjusts camera vectors along the spline path.
- **`particles.js`**: Procedural mesh builders (Tulips, Orchids, Crystal Heart, explosions).
- **`ui.js`**: Integrates GSAP animations and drives overlay transitions and modal fields.
- **`interaction.js`**: Decoupled input logic, including click raycasting and screen coordinates projection.

### 4. High-Performance WebGL Optimizations

#### 🚯 Garbage Collection & Stutter Prevention
In WebGL rendering loops, allocating memory causes JavaScript's garbage collector to trigger, leading to frame stutters.
- **Optimization**: For constellation lines, we pre-allocate a typed buffer (`Float32Array`) in memory once. During renders, we update this buffer's values and call `needsUpdate = true` alongside `setDrawRange()`. This completely bypasses frame allocation costs and guarantees a locked 60 FPS.

#### 💧 WebGL Memory Leak Prevention
Removing meshes from a Three.js scene does *not* release GPU buffer memory, which accumulates into severe browser memory leaks.
- **Fix**: We implemented a recursive garbage disposal helper `disposeObject()` in [particles.js](valentine/static/js/particles.js). When clearing items (e.g. mouse trail particles or scene resets), it explicitly disposes of the geometries, materials, and textures.

#### 📱 Adaptive FOV Viewport Math
To ensure the 3D canvas elements do not clip on ultra-tall mobile viewports or wide monitors, [scene.js](valentine/static/js/scene.js) computes a viewport-adaptive FOV:
$$\text{FOV} = \text{baseFov} + (1 - \text{aspect})^2 \times 30 + (1 - \text{aspect}) \times 15$$
This quadratic formula ensures beautiful perspective framing across all viewport aspect ratios.

---

## 🚀 Installation & Local Execution

### 1. Database Provisioning
Configure a MySQL server instance and create a `.env` file inside the `valentine` folder with details (see `.env.example` or below):
```env
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=yourpassword
DB_NAME=valentine_universe
SECRET_KEY=generate_a_secure_random_key
```

### 2. Python Environment Setup
Install dependencies:
```bash
pip install -r valentine/requirements.txt
```

### 3. Initialize & Seed Database Schema
Build schema tables (Idempotent seeds: skips if already populated):
```bash
python valentine/setup_db.py
```

### 4. Run Development Server
Fire up the Flask web app:
```bash
python valentine/app.py
```
Visit `http://localhost:5000` in your web browser.

---

## 🔍 Codebase Navigation

- [app.py](valentine/app.py): Application factory entry and API routes.
- [database.py](valentine/database.py): Pool manager and resilience controller.
- [styles.css](valentine/static/css/styles.css): Complete custom styling definitions.
- [main.js](valentine/static/js/main.js): WebGL orchestration.
- [particles.js](valentine/static/js/particles.js): WebGL mesh generation and cleanup routines.
