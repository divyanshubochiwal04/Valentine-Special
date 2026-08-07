import { AudioManager } from './audio.js';

export let capturedUserName = "My Love";

export function setCapturedUserName(name) {
    capturedUserName = name || "My Love";
}

export function initUIAnimations(onIgnite) {
    const titleText = document.getElementById('title-text');
    const inputContainer = document.getElementById('input-container');
    const igniteBtn = document.getElementById('ignite-btn');
    const nameInput = document.getElementById('name-input');
    const entrySection = document.getElementById('entry-section');

    // Entry fade ins
    gsap.to(titleText, { opacity: 1, duration: 2, delay: 0.5 });
    gsap.to(inputContainer, { opacity: 1, y: 0, duration: 1.5, delay: 1.5, ease: "power2.out" });

    // Show ignite button when name is typed
    nameInput.addEventListener('input', () => {
        if (nameInput.value.length > 0) {
            gsap.to(igniteBtn, { opacity: 1, y: 0, duration: 0.5, pointerEvents: "auto" });
            AudioManager.unlockAudio();
        } else {
            gsap.to(igniteBtn, { opacity: 0, y: 20, duration: 0.5, pointerEvents: "none" });
        }
    });

    igniteBtn.addEventListener('click', () => {
        const name = nameInput.value.trim();
        if (!name) return;
        setCapturedUserName(name);
        onIgnite(name);
    });
}

export function showMemoryPopup(content, label) {
    const popup = document.getElementById('memory-popup');
    const textEl = document.getElementById('memory-content');

    if (popup && textEl) {
        textEl.innerHTML = `"${content}"`;

        popup.classList.remove('hidden');
        popup.style.display = 'block';
        popup.style.pointerEvents = 'auto';

        gsap.fromTo(popup,
            { opacity: 0, scale: 0.8 },
            { opacity: 1, scale: 1, duration: 0.5, ease: "back.out(1.7)" }
        );
    }
}

export function initScrollHint() {
    const hint = document.getElementById('scroll-hint');
    if (hint) {
        gsap.to(hint, { opacity: 1, duration: 1, delay: 2 });
        const onScrollForHint = () => {
            if (window.scrollY > 50) {
                gsap.to(hint, { opacity: 0, duration: 0.5, onComplete: () => hint.remove() });
                window.removeEventListener('scroll', onScrollForHint);
            }
        };
        window.addEventListener('scroll', onScrollForHint);
    }
}

export function triggerFinaleUI(userName, onYesCallback) {
    const finaleDiv = document.getElementById('valentine-finale');
    const title = document.getElementById('finale-title');
    const btns = document.getElementById('finale-buttons');
    const yesBtn = document.getElementById('yes-btn');
    const noBtn = document.getElementById('no-btn');

    if (!finaleDiv) return;

    finaleDiv.classList.remove('hidden');
    document.body.style.overflow = 'hidden'; // Lock scrolling

    // Dim the WebGL canvas for visual UI hierarchy
    gsap.to(document.getElementById('canvas-container'), { opacity: 0.3, duration: 1.5 });

    gsap.fromTo(title,
        { scale: 0, opacity: 0, rotation: -10 },
        { scale: 1, opacity: 1, rotation: 0, duration: 1.5, ease: "elastic.out(1, 0.3)" }
    );

    gsap.to(btns, { opacity: 1, y: 0, duration: 1, delay: 1, ease: "power2.out" });

    // YES logic
    yesBtn.addEventListener('click', () => {
        gsap.to(document.getElementById('canvas-container'), { opacity: 1, duration: 0.5 });
        gsap.to(finaleDiv, { opacity: 0, duration: 0.5, pointerEvents: 'none' });

        const tyPopup = document.getElementById('thank-you-popup');
        const tyName = document.getElementById('ty-name');
        if (tyPopup && tyName) {
            tyName.innerText = userName;
            tyPopup.classList.remove('hidden');
            gsap.to(tyPopup, { opacity: 1, duration: 1.5 });
            gsap.to(document.getElementById('thank-you-content'), { scale: 1, duration: 2, ease: "power2.out" });
        }

        onYesCallback();
    });

    // "Run Away" No logic
    noBtn.addEventListener('mouseover', () => {
        const x = (Math.random() - 0.5) * 300;
        const y = (Math.random() - 0.5) * 300;
        gsap.to(noBtn, { x: x, y: y, duration: 0.2 });
    });
    
    // Add touchstart runaway support for mobile developers' convenience
    noBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        const x = (Math.random() - 0.5) * 200;
        const y = (Math.random() - 0.5) * 200;
        gsap.to(noBtn, { x: x, y: y, duration: 0.2 });
    });
}

export function showOracleMessage(msg) {
    const bubble = document.getElementById('oracle-bubble');
    if (!bubble) return;

    gsap.to(bubble, {
        opacity: 0, x: 10, duration: 0.5, onComplete: () => {
            bubble.innerText = `"${msg}"`;
            gsap.to(bubble, { opacity: 1, x: 0, duration: 1 });
        }
    });
}

export function createNameConstellation(name) {
    const overlay = document.createElement('div');
    overlay.innerText = `✨ ${name} ✨`;
    overlay.className = "fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 text-6xl md:text-9xl text-red-500 font-bold opacity-0 z-40 cinzel text-shadow-glow pointer-events-none";
    document.body.appendChild(overlay);

    gsap.fromTo(overlay,
        { scale: 0.5, opacity: 0, rotation: -5 },
        {
            scale: 1.2, opacity: 1, rotation: 0, duration: 2, ease: "power2.out", onComplete: () => {
                gsap.to(overlay, { opacity: 0, scale: 2, filter: 'blur(20px)', duration: 1.5, delay: 1, onComplete: () => overlay.remove() });
            }
        }
    );
}

export function initCosmicFeaturesUI(onSubmitEcho) {
    const echoBtn = document.getElementById('echo-btn');
    const echoModal = document.getElementById('echo-modal');
    const echoModalContent = document.getElementById('echo-modal-content');
    const cancelEcho = document.getElementById('cancel-echo');
    const submitEcho = document.getElementById('submit-echo');
    const emojiPicker = document.getElementById('emoji-picker');
    let selectedEmoji = '✨';

    if (!echoBtn || !echoModal) return;

    // Emoji Selection state management
    const emojis = emojiPicker.querySelectorAll('span');
    emojis.forEach(e => {
        e.addEventListener('click', () => {
            emojis.forEach(opt => opt.classList.remove('selected', 'opacity-100'));
            emojis.forEach(opt => opt.classList.add('opacity-50'));
            e.classList.add('selected', 'opacity-100');
            e.classList.remove('opacity-50');
            selectedEmoji = e.dataset.emoji;
        });
    });

    echoBtn.addEventListener('click', () => {
        echoModal.classList.remove('hidden');
        gsap.to(echoModalContent, { scale: 1, opacity: 1, duration: 0.5, ease: "back.out(1.7)" });
    });

    const closeEcho = () => {
        gsap.to(echoModalContent, {
            scale: 0.9, opacity: 0, duration: 0.3, onComplete: () => {
                echoModal.classList.add('hidden');
            }
        });
    };

    cancelEcho.addEventListener('click', closeEcho);

    submitEcho.addEventListener('click', () => {
        const name = document.getElementById('echo-name').value.trim();
        const msg = document.getElementById('echo-message').value.trim();

        if (!msg) {
            alert("Space requires a message to echo.");
            return;
        }

        onSubmitEcho(name, msg, selectedEmoji, closeEcho);
    });
}

// Memory popup close listener
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('close-memory')?.addEventListener('click', () => {
        const popup = document.getElementById('memory-popup');
        if (popup) {
            gsap.to(popup, {
                opacity: 0,
                scale: 0.9,
                duration: 0.3,
                onComplete: () => {
                    popup.classList.add('hidden');
                    popup.style.display = 'none';
                }
            });
        }
    });
});
