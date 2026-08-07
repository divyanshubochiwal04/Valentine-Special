export const AudioManager = {
    audioStarted: false,
    bgMusic: null,

    init() {
        this.bgMusic = document.getElementById('bg-music');
    },

    unlockAudio() {
        if (this.audioStarted) return;
        
        if (this.bgMusic) {
            // Initial user gesture to unlock audio context on mobile safely
            this.bgMusic.play().then(() => {
                this.bgMusic.pause();
                this.bgMusic.currentTime = 0;
                console.log("[Audio] System unlocked successfully.");
            }).catch(e => {
                console.warn("[Audio] Unlock gesture deferred.", e);
            });
        }
    },

    play(id, volume = 0.5) {
        const audio = document.getElementById(id);
        if (audio) {
            try {
                audio.volume = volume;
                audio.currentTime = 0;
                audio.play().catch(e => console.warn(`[Audio] Blocked playing sound '${id}':`, e));
            } catch (err) {
                console.error(`[Audio] Failed to play sound '${id}':`, err);
            }
        }
    },

    audioCtx: null,
    analyser: null,
    dataArray: null,
    source: null,

    initAnalyser() {
        if (this.analyser) return;

        try {
            const AudioContextClass = window.AudioContext || window.webkitAudioContext;
            this.audioCtx = new AudioContextClass();
            this.analyser = this.audioCtx.createAnalyser();
            this.analyser.fftSize = 256;
            
            // Connect bgMusic element to AudioContext
            this.source = this.audioCtx.createMediaElementSource(this.bgMusic);
            this.source.connect(this.analyser);
            this.analyser.connect(this.audioCtx.destination);

            const bufferLength = this.analyser.frequencyBinCount;
            this.dataArray = new Uint8Array(bufferLength);
            console.log("[Audio] Analyser initialized successfully.");
        } catch (e) {
            console.warn("[Audio] Could not initialize Web Audio Analyser:", e);
        }
    },

    getAverageFrequency() {
        if (!this.analyser || !this.dataArray) return 0;
        
        if (this.audioCtx && this.audioCtx.state === 'suspended') {
            this.audioCtx.resume();
        }

        this.analyser.getByteFrequencyData(this.dataArray);
        
        let sum = 0;
        for (let i = 0; i < this.dataArray.length; i++) {
            sum += this.dataArray[i];
        }
        return sum / this.dataArray.length; // 0 to 255
    },

    startBackgroundMusic() {
        if (!this.bgMusic) return;
        
        this.unlockAudio();
        
        this.bgMusic.volume = 0;
        this.bgMusic.play().then(() => {
            // Initialize analyser node
            this.initAnalyser();

            // Fade in music smoothly
            let vol = 0;
            const targetVolume = 0.4;
            const fadeInterval = setInterval(() => {
                if (vol < targetVolume) {
                    vol += 0.02;
                    this.bgMusic.volume = Math.min(targetVolume, vol);
                } else {
                    clearInterval(fadeInterval);
                }
            }, 100);
            this.audioStarted = true;
        }).catch(err => {
            console.warn("[Audio] Music play blocked until explicit user interaction.", err);
            // Setup a fallback event listener for click to start background music
            const startOnInteraction = () => {
                this.startBackgroundMusic();
                window.removeEventListener('click', startOnInteraction);
            };
            window.addEventListener('click', startOnInteraction, { once: true });
        });
    },

    syncVolumeWithScroll(scrollProgress) {
        if (this.bgMusic && !this.bgMusic.paused) {
            let volume = 0.3;
            if (scrollProgress > 0.7) {
                // Fade up the music volume as the user scrolls closer to the finale
                volume = 0.3 + ((scrollProgress - 0.7) / 0.3) * 0.7;
            }
            this.bgMusic.volume = Math.min(1.0, Math.max(0.0, volume));
        }
    }
};
