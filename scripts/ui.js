/**
 * NeuroGuess AI - UI & Interaction Controller
 * Manages canvas nodes background, biometric login simulation, developer terminal, voice assistant, and page transitions.
 */


// Voice Assistant Configuration
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;

// Terminal Configuration
const termCommands = {
    HELP: 'help',
    STATUS: 'status',
    START: 'start',
    DASHBOARD: 'dashboard',
    CLEAR: 'clear',
    SCAN: 'scan',
    AI: 'ai',
    PREDICT: 'predict',
    REPORT: 'report',
    TELEMETRY: 'telemetry'
};

const UIManager = {
    canvas: null,
    ctx: null,
    nodes: [],
    binaryData: [],
    mouse: { x: null, y: null },
    terminalLogs: [],
    voiceActive: false,

    init() {
        this.setupBackground();
        this.setupBiometricScanner();
        this.setupTerminal();
        this.setupCursorGlow();
        this.setupScrollReveal();
    },

    setupCursorGlow() {
        const glow = document.getElementById('cursorGlow');
        if (!glow) return;
        
        window.addEventListener('mousemove', (e) => {
            glow.style.left = e.clientX + 'px';
            glow.style.top = e.clientY + 'px';
            if (!glow.classList.contains('active')) {
                glow.classList.add('active');
            }
        });
        
        window.addEventListener('mouseleave', () => {
            glow.classList.remove('active');
        });
    },

    updateNodeDensity(density) {
        if (!this.canvas) return;
        const count = parseInt(density, 10) || 60;
        this.nodes = [];
        for (let i = 0; i < count; i++) {
            this.nodes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 2 + 1,
                pulse: Math.random() * Math.PI
            });
        }
    },

    /* =========================================================================
       1. NEURAL CORE BACKGROUND CANVAS
       ========================================================================= */
    setupBackground() {
        this.canvas = document.getElementById('bg');
        if (!this.canvas) return;
        this.ctx = this.canvas.getContext('2d');
        
        this.resizeCanvas();
        window.addEventListener('resize', () => this.resizeCanvas());
        
        window.addEventListener('mousemove', e => {
            this.mouse.x = e.clientX;
            this.mouse.y = e.clientY;
        });
        window.addEventListener('mouseleave', () => {
            this.mouse.x = null;
            this.mouse.y = null;
        });

        // Initialize node particles
        const nodeCount = Math.min(60, Math.floor((this.canvas.width * this.canvas.height) / 25000));
        this.nodes = [];
        for (let i = 0; i < nodeCount; i++) {
            this.nodes.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                vx: (Math.random() - 0.5) * 0.4,
                vy: (Math.random() - 0.5) * 0.4,
                r: Math.random() * 2 + 1,
                pulse: Math.random() * Math.PI
            });
        }

        // Initialize falling probability strings (floating matrices)
        for (let i = 0; i < 20; i++) {
            this.binaryData.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                val: (Math.random()).toFixed(4),
                speed: Math.random() * 0.5 + 0.2,
                opacity: Math.random() * 0.2 + 0.05,
                fontSize: Math.floor(Math.random() * 6 + 9)
            });
        }

        // Start animation frame loop
        const loop = () => {
            this.drawBackground();
            requestAnimationFrame(loop);
        };
        loop();
    },

    resizeCanvas() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
    },

    drawBackground() {
        const ctx = this.ctx;
        const W = this.canvas.width;
        const H = this.canvas.height;
        ctx.clearRect(0, 0, W, H);

        // Draw radial glowing aurora background
        const gradient = ctx.createRadialGradient(W/2, 0, 10, W/2, 0, W);
        gradient.addColorStop(0, 'rgba(139, 107, 255, 0.09)');
        gradient.addColorStop(0.5, 'rgba(255, 47, 110, 0.05)');
        gradient.addColorStop(1, 'rgba(5, 5, 8, 1)');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, W, H);

        // Draw HUD grid line overlay
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.015)';
        ctx.lineWidth = 1;
        const gridSize = 80;
        for (let x = 0; x < W; x += gridSize) {
            ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
        }
        for (let y = 0; y < H; y += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
        }

        // Draw falling probability floaters
        ctx.fillStyle = 'rgba(43, 227, 255, 0.15)';
        this.binaryData.forEach(d => {
            ctx.font = `${d.fontSize}px 'JetBrains Mono'`;
            ctx.fillStyle = `rgba(43, 227, 255, ${d.opacity})`;
            ctx.fillText(d.val, d.x, d.y);
            d.y += d.speed;
            if (d.y > H) {
                d.y = -20;
                d.x = Math.random() * W;
                d.val = (Math.random()).toFixed(4);
            }
        });

        // Update & Draw nodes
        const LINK_DIST = 140;
        this.nodes.forEach(n => {
            n.x += n.vx;
            n.y += n.vy;
            n.pulse += 0.01;

            if (n.x < 0 || n.x > W) n.vx *= -1;
            if (n.y < 0 || n.y > H) n.vy *= -1;

            // Draw glowing node
            const glow = n.r + Math.sin(n.pulse) * 0.8;
            ctx.beginPath();
            ctx.arc(n.x, n.y, glow, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(139, 107, 255, 0.6)';
            ctx.fill();
        });

        // Draw links between nodes
        ctx.lineWidth = 0.5;
        for (let i = 0; i < this.nodes.length; i++) {
            for (let j = i + 1; j < this.nodes.length; j++) {
                const a = this.nodes[i];
                const b = this.nodes[j];
                const dx = a.x - b.x;
                const dy = a.y - b.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < LINK_DIST) {
                    const alpha = (1 - dist / LINK_DIST) * 0.13;
                    ctx.strokeStyle = `rgba(139, 107, 255, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.stroke();
                }
            }

            // Interactive mouse connections
            if (this.mouse.x !== null) {
                const dx = this.nodes[i].x - this.mouse.x;
                const dy = this.nodes[i].y - this.mouse.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < 180) {
                    const alpha = (1 - dist / 180) * 0.28;
                    ctx.strokeStyle = `rgba(255, 47, 110, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(this.nodes[i].x, this.nodes[i].y);
                    ctx.lineTo(this.mouse.x, this.mouse.y);
                    ctx.stroke();
                }
            }
        }
    },

    /* =========================================================================
       2. BIOMETRIC AUTH SYSTEM & BOOT SYSTEM
       ========================================================================= */
    setupBiometricScanner() {
        const loginOverlay = document.getElementById('loginOverlay');
        const loginBtn = document.getElementById('authScanner');
        const authProgress = document.getElementById('authProgress');
        const authStatus = document.getElementById('authStatus');
        const self = this;

        if (!loginBtn) return;

        loginBtn.addEventListener('click', () => {
            loginBtn.classList.add('scanning');
            authStatus.innerHTML = 'ACQUIRING NEURAL PROFILE...';
            AudioSynth.playScan();

            let width = 0;
            const interval = setInterval(() => {
                width += 8;
                authProgress.style.width = Math.min(100, width) + '%';

                if (width >= 40 && width < 70) {
                    authStatus.innerHTML = 'SYNCING PROBABILITY SYNAPSES...';
                }
                if (width >= 70 && width < 90) {
                    authStatus.innerHTML = 'COMMUNICATION STABLE. SHIELD INITIATED...';
                }

                if (width >= 100) {
                    clearInterval(interval);
                    authStatus.innerHTML = '<span style="color: #39ff9d">ACCESS GRANTED ✓</span>';
                    loginBtn.classList.remove('scanning');
                    loginBtn.classList.add('access-granted');
                    AudioSynth.playSuccess();

                    setTimeout(() => {
                        loginOverlay.style.opacity = '0';
                        loginOverlay.style.transition = 'opacity 0.6s ease';
                        setTimeout(() => {
                            loginOverlay.style.display = 'none';
                            self.runBootSequence();
                        }, 650);
                    }, 900);
                }
            }, 150);
        });
    },

    runBootSequence() {
        const boot = document.getElementById('boot');
        const bootLinesEl = document.getElementById('bootLines');
        if (!boot) return;

        const bootMsgs = [
            'LOADER CORE SYSTEM: v4.11.08_BUILD',
            'CONNECTING TO COGNITIVE NEURAL VECTOR...',
            'LAUNCHING SMART CALIBRATION HEURISTICS... [OK]',
            'INITIALIZING ADAPTIVE PATTERN STORAGE TELEMETRY...',
            'SYSTEM NEUROGUESS AI CORE INSTANTIATED SUCCESSFULLY.'
        ];

        bootLinesEl.innerHTML = '';
        bootMsgs.forEach((msg, i) => {
            const line = document.createElement('div');
            line.innerHTML = `> ${msg}`;
            line.style.animationDelay = (i * 0.4) + 's';
            bootLinesEl.appendChild(line);
        });

        setTimeout(() => {
            boot.classList.add('done');
            UIManager.logTerminal("Cognitive system initialized. Boot sequence nominal.");
        }, 2800);
    },

    /* =========================================================================
       4. INTERACTIVE TERMINAL CONSOLE
       ========================================================================= */
    setupTerminal() {
        const terminalToggle = document.getElementById('terminalToggle');
        const terminalPanel = document.getElementById('terminalConsole');
        const termInput = document.getElementById('termInput');

        if (!terminalToggle || !terminalPanel) return;

        // Press ~ (tilde) key to toggle terminal
        window.addEventListener('keydown', (e) => {
            if (e.key === '`' || e.key === '~') {
                e.preventDefault();
                terminalPanel.classList.toggle('hidden');
                AudioSynth.playClick();
                if (!terminalPanel.classList.contains('hidden')) {
                    termInput.focus();
                }
            }
        });

        terminalToggle.addEventListener('click', () => {
            terminalPanel.classList.toggle('hidden');
            AudioSynth.playClick();
            if (!terminalPanel.classList.contains('hidden')) {
                termInput.focus();
            }
        });

        document.getElementById('termCloseBtn')?.addEventListener('click', () => {
            terminalPanel.classList.add('hidden');
            AudioSynth.playClick();
        });

        termInput?.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                const commandText = termInput.value.trim();
                termInput.value = '';
                if (commandText) {
                    this.executeTerminalCommand(commandText);
                }
            }
        });

        // Initialize baseline line output
        this.logTerminal("NEUROGUESS OS DEVELOPER WORKSTATION // ROOT");
        this.logTerminal("Type 'help' to review list of AI system registers.");
    },

    logTerminal(text, type = 'normal') {
        const outputEl = document.getElementById('termOutput');
        if (!outputEl) return;

        const time = new Date().toLocaleTimeString().split(' ')[0];
        const line = document.createElement('div');
        line.className = `term-line ${type}`;

        // Dynamic syntax highlighting for premium terminal logs feed
        let formatted = text;
        
        // Highlight [TAGS] (e.g. [INFERENCE], [REPORT], [VOICE])
        formatted = formatted.replace(/(\[[A-Z0-9\s_-]+\])/g, '<span class="term-tag">$1</span>');
        
        // Highlight system constants
        formatted = formatted.replace(/(ONLINE|SUCCESS|NOMINAL|STABLE|nominal|stable)/g, '<span class="term-success">$1</span>');
        formatted = formatted.replace(/(OFFLINE|ERROR|FAIL|aborted|invalid|WIPING|wiping)/gi, '<span class="term-error">$1</span>');
        
        // Highlight command registers listed in help menu
        formatted = formatted.replace(/^(\s{2})([a-z_]+(?:\s+\[[1-3|]+\])?|clear|ai|help|status|start|dashboard|scan|report|telemetry)(\s+-)/g, 
            '$1<span class="term-cmd-keyword">$2</span>$3');

        line.innerHTML = `<span class="time">[${time}]</span> ${formatted}`;
        
        outputEl.appendChild(line);
        outputEl.scrollTop = outputEl.scrollHeight;
    },

    clearTerminal() {
        const outputEl = document.getElementById('termOutput');
        if (outputEl) outputEl.innerHTML = '';
    },

    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `hud-toast ${type}`;
        toast.textContent = message;
        
        container.appendChild(toast);
        
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 400);
        }, 3200);
    },

    executeTerminalCommand(inputLine) {
        this.logTerminal(`$ ${inputLine}`, 'cmd');
        AudioSynth.playClick();

        const parts = inputLine.toLowerCase().split(' ');
        const mainCmd = parts[0];
        const arg = parts[1];

        switch (mainCmd) {
            case termCommands.HELP:
                this.logTerminal("Core System Commands:");
                this.logTerminal("  help             - Output list of active system commands");
                this.logTerminal("  status           - Retrieve structural core metrics and model status");
                this.logTerminal("  start [1|2|3]    - Initiate neural calibration level 1, 2, or 3");
                this.logTerminal("  dashboard        - Route viewport display layout to Dashboard");
                this.logTerminal("  scan [num]       - Submit guess evaluation direct node scan");
                this.logTerminal("  ai               - Force trigger Bayesian interval hint generation");
                this.logTerminal("  report           - Display last match cognitive execution logs");
                this.logTerminal("  telemetry        - Reset telemetry statistics buffer database");
                this.logTerminal("  clear            - Wipe active terminal terminal lines buffer");
                break;

            case termCommands.STATUS:
                this.logTerminal("--- CORE HARDWARE STATUS ---");
                this.logTerminal("COGNITIVE KERNEL: ONLINE");
                this.logTerminal(`STABILITY INDEX: ${(85 + Math.random() * 14).toFixed(2)}%`);
                this.logTerminal("HARDWARE SYNC: QUANTUM ENVELOPE MODULATOR ACTIVE");
                break;

            case termCommands.START:
                const level = parseInt(arg, 10);
                if (level === 1) {
                    document.querySelector('[data-diff="easy"]')?.click();
                    this.logTerminal("CALIBRATING MODE EASY: [1 - 50]");
                } else if (level === 2) {
                    document.querySelector('[data-diff="medium"]')?.click();
                    this.logTerminal("CALIBRATING MODE MEDIUM: [1 - 100]");
                } else if (level === 3) {
                    document.querySelector('[data-diff="hard"]')?.click();
                    this.logTerminal("CALIBRATING MODE HARD: [1 - 500]");
                } else {
                    this.logTerminal("INVALID MODE. Syntax: 'start 1' (easy), 'start 2' (medium), 'start 3' (hard)", "error");
                }
                break;

            case termCommands.DASHBOARD:
                document.getElementById('navDashboard')?.click();
                this.logTerminal("Viewport focus transitioned to Dashboard.");
                break;

            case termCommands.SCAN:
                const guessVal = parseInt(arg, 10);
                if (isNaN(guessVal)) {
                    this.logTerminal("INVALID DATA VALUE. Syntax: 'scan [integer]'", "error");
                } else {
                    const input = document.getElementById('guessInput');
                    const gameActive = !document.getElementById('gameCard').classList.contains('hidden');
                    if (gameActive && input) {
                        input.value = guessVal;
                        document.getElementById('guessBtn')?.click();
                        this.logTerminal(`Evaluation node registered for input guess: ${guessVal}`);
                    } else {
                        this.logTerminal("COGNITIVE CALIBRATION LEVEL INACTIVE. Start system first.", "error");
                    }
                }
                break;

            case termCommands.AI:
                const hintBtn = document.getElementById('hintTriggerBtn');
                if (hintBtn && !hintBtn.disabled) {
                    hintBtn.click();
                    this.logTerminal("Heuristic Bayesian module successfully updated parameters.");
                } else {
                    this.logTerminal("AI engine hint unavailable. Check game activation status.", "error");
                }
                break;

            case termCommands.REPORT:
                const reportTab = document.getElementById('navAnalytics');
                if (reportTab) {
                    reportTab.click();
                    this.logTerminal("Initiating rendering sequence for cognitive audit reports.");
                }
                break;

            case termCommands.TELEMETRY:
                localStorage.clear();
                this.logTerminal("WIPING HARD DISK CACHE DATABASE... REBOOT RECOMMENDED.");
                break;

            case termCommands.CLEAR:
                this.clearTerminal();
                break;

            default:
                this.logTerminal(`Command not identified: "${mainCmd}". Type 'help' for support.`, 'error');
                break;
        }
    },

    setupScrollReveal() {
        const revealElements = document.querySelectorAll('.reveal-on-scroll');
        if ('IntersectionObserver' in window) {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('revealed');
                    }
                });
            }, {
                threshold: 0.05,
                rootMargin: '0px 0px -15px 0px'
            });

            revealElements.forEach(el => observer.observe(el));
        } else {
            revealElements.forEach(el => el.classList.add('revealed'));
        }
    }
};

window.UIManager = UIManager;
