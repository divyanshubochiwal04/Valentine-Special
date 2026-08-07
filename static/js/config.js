import * as THREE from 'three';

export const Config = {
    // Scroll settings
    TOTAL_SCROLL_HEIGHT: 4000,
    
    // Particle Counts
    VOID_PARTICLES_COUNT: 3000,
    GALAXY_PARTICLES_COUNT: 5000,
    HEART_PARTICLES_COUNT: 3000,
    
    // Core color schemes
    COLORS: {
        trueRed: 0xff0000,
        deepRed: 0xff0040,
        pinkish: 0xff5588,
        orange: 0xffaa00,
        purple: 0xdc55ff,
        constellationLine: 0xffffff
    },

    // Spline curve nodes defining camera path
    CURVE_POINTS: [
        new THREE.Vector3(0, 0, 50),     // Start (Collision)
        new THREE.Vector3(0, 0, 0),      // Pass through center
        new THREE.Vector3(10, -10, -50), // Chaos
        new THREE.Vector3(-10, 10, -100),// Curve back
        new THREE.Vector3(0, 5, -150),   // Bloom
        new THREE.Vector3(0, 2, -190)    // Promise (End)
    ],

    // Default love notes loaded into floating cards
    LOVE_NOTES: [
        "You are my favorite notification.",
        "Every love song makes sense now.",
        "In a universe of chaos, you are my calm.",
        "I'd find you in any timeline.",
        "Your smile is my sunrise.",
        "Holding your hand is holding my world.",
        "You are the best thing I never planned.",
        "My heart beats in your rhythm.",
        "Forever is a long time, but I wouldn't mind spending it by your side.",
        "You are my happy place.",
        "I love you more than words can say.",
        "You are the reason I believe in love.",
        "Every moment with you is a treasure.",
        "You make my heart skip a beat.",
        "I fall for you more every day.",
        "You are my dream come true.",
        "Life is better with you.",
        "You are my sunshine on a cloudy day.",
        "I am so lucky to have you.",
        "You are my everything."
    ]
};
