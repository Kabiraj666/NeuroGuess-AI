/**
 * NeuroGuess AI - Web Audio API Synthesizer
 * Generates futuristic sci-fi/arcade sound effects dynamically.
 * Eliminates text-to-speech voice synthesis and replaces it with immersive game audio.
 */

let audioCtx = null;
let masterVolume = 0.5; // Shared master volume state (0.0 to 1.0)

function getAudioContext() {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

const AudioSynth = {
    /**
     * Update master volume state
     */
    setVolume(value) {
        masterVolume = Math.min(1.0, Math.max(0.0, parseFloat(value) || 0.0));
    },

    /**
     * Play a high-tech mechanical click sound
     */
    playClick() {
        try {
            const ctx = getAudioContext();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sine';
            osc.frequency.setValueAtTime(1200, ctx.currentTime);
            osc.frequency.exponentialRampToValueAtTime(300, ctx.currentTime + 0.08);

            gain.gain.setValueAtTime(0.08 * masterVolume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.08);

            osc.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 0.08);
        } catch (e) {
            console.warn("Web Audio not initiated:", e);
        }
    },

    /**
     * Play an oscillating rising hum scan sound (Biometrics verification)
     */
    playScan() {
        try {
            const ctx = getAudioContext();
            const osc = ctx.createOscillator();
            const filter = ctx.createBiquadFilter();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(100, ctx.currentTime);
            osc.frequency.linearRampToValueAtTime(800, ctx.currentTime + 1.2);

            filter.type = 'lowpass';
            filter.frequency.setValueAtTime(300, ctx.currentTime);
            filter.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 1.2);

            gain.gain.setValueAtTime(0.06 * masterVolume, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.12 * masterVolume, ctx.currentTime + 0.4);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.25);

            osc.connect(filter);
            filter.connect(gain);
            gain.connect(ctx.destination);

            osc.start();
            osc.stop(ctx.currentTime + 1.25);
        } catch (e) {
            console.warn("Audio issue:", e);
        }
    },

    /**
     * Play a glorious ascending chord arpeggio (Success Calibration)
     */
    playSuccess() {
        try {
            const ctx = getAudioContext();
            const notes = [261.63, 329.63, 392.00, 523.25, 659.25, 783.99]; // C4, E4, G4, C5, E5, G5
            
            notes.forEach((freq, index) => {
                const startTime = ctx.currentTime + (index * 0.08);
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, startTime);
                
                // Warm cyber vibrato
                const vibrato = ctx.createOscillator();
                const vibratoGain = ctx.createGain();
                vibrato.frequency.value = 6;
                vibratoGain.gain.value = 4;
                vibrato.connect(vibratoGain);
                vibratoGain.connect(osc.frequency);
                vibrato.start(startTime);

                gain.gain.setValueAtTime(0.04 * masterVolume, startTime);
                gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.6);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(startTime);
                osc.stop(startTime + 0.65);
                vibrato.stop(startTime + 0.65);
            });
        } catch (e) {
            console.warn("Audio issue:", e);
        }
    },

    /**
     * Play a dramatic sci-fi descending power-down buzzer (Calibration Failure)
     */
    playFailure() {
        try {
            const ctx = getAudioContext();
            const osc1 = ctx.createOscillator();
            const osc2 = ctx.createOscillator();
            const gain = ctx.createGain();

            osc1.type = 'sawtooth';
            osc1.frequency.setValueAtTime(220, ctx.currentTime);
            osc1.frequency.linearRampToValueAtTime(55, ctx.currentTime + 1.2);

            osc2.type = 'triangle';
            osc2.frequency.setValueAtTime(223, ctx.currentTime);
            osc2.frequency.linearRampToValueAtTime(56, ctx.currentTime + 1.2);

            gain.gain.setValueAtTime(0.12 * masterVolume, ctx.currentTime);
            gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.25);

            osc1.connect(gain);
            osc2.connect(gain);
            gain.connect(ctx.destination);

            osc1.start();
            osc2.start();
            
            osc1.stop(ctx.currentTime + 1.25);
            osc2.stop(ctx.currentTime + 1.25);
        } catch (e) {
            console.warn("Audio issue:", e);
        }
    },

    /**
     * Play a futuristic dual chime (Bayesian prediction recommendation)
     */
    playHint() {
        try {
            const ctx = getAudioContext();
            const times = [0, 0.12];
            const freqs = [587.33, 880.00]; // D5, A5

            times.forEach((t, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'sine';
                osc.frequency.setValueAtTime(freqs[index], ctx.currentTime + t);

                gain.gain.setValueAtTime(0.06 * masterVolume, ctx.currentTime + t);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.4);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime + t);
                osc.stop(ctx.currentTime + t + 0.45);
            });
        } catch (e) {
            console.warn("Audio issue:", e);
        }
    },

    /**
     * Play alert sound when guess is too low (Needs to go Higher)
     * Rising double-beep
     */
    playAlertLow() {
        try {
            const ctx = getAudioContext();
            const times = [0, 0.08];
            const freqs = [350, 480];

            times.forEach((t, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freqs[index], ctx.currentTime + t);

                gain.gain.setValueAtTime(0.08 * masterVolume, ctx.currentTime + t);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime + t);
                osc.stop(ctx.currentTime + t + 0.16);
            });
        } catch (e) {
            console.warn("Audio issue:", e);
        }
    },

    /**
     * Play alert sound when guess is too high (Needs to go Lower)
     * Falling double-beep
     */
    playAlertHigh() {
        try {
            const ctx = getAudioContext();
            const times = [0, 0.08];
            const freqs = [480, 350];

            times.forEach((t, index) => {
                const osc = ctx.createOscillator();
                const gain = ctx.createGain();

                osc.type = 'triangle';
                osc.frequency.setValueAtTime(freqs[index], ctx.currentTime + t);

                gain.gain.setValueAtTime(0.08 * masterVolume, ctx.currentTime + t);
                gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.15);

                osc.connect(gain);
                gain.connect(ctx.destination);

                osc.start(ctx.currentTime + t);
                osc.stop(ctx.currentTime + t + 0.16);
            });
        } catch (e) {
            console.warn("Audio issue:", e);
        }
    }
};

window.AudioSynth = AudioSynth;
