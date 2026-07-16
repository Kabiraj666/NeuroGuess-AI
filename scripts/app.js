/**
 * NeuroGuess AI - Central Application Coordinator
 * Boots modules, manages game states, links event handlers, and populates widgets.
 */


// Application Levels Parameters
const LEVELS = {
    easy: { label: 'EASY', min: 1, max: 50, tries: 10, mult: 1.0, maxHints: 3 },
    medium: { label: 'MEDIUM', min: 1, max: 100, tries: 8, mult: 1.5, maxHints: 2 },
    hard: { label: 'HARD', min: 1, max: 500, tries: 6, mult: 2.2, maxHints: 1 }
};

let gameState = {
    levelKey: null,
    target: 0,
    currentMin: 1,
    currentMax: 100,
    triesLeft: 0,
    triesMax: 0,
    guesses: [],
    startTime: 0,
    hintsUsed: 0,
    activeHintMin: null,
    activeHintMax: null
};

document.addEventListener('DOMContentLoaded', () => {
    // 0. Version-based data wipe — bump DATA_VERSION on each new deployment
    //    to clear any old browser-cached test/dev data for fresh users.
    const DATA_VERSION = 'v1.0.0';
    const storedVersion = localStorage.getItem('neuroguess_data_version');
    if (storedVersion !== DATA_VERSION) {
        localStorage.removeItem('neuroguess_leaderboard');
        localStorage.removeItem('neuroguess_matches');
        localStorage.removeItem('neuroguess_ml_profile');
        localStorage.setItem('neuroguess_data_version', DATA_VERSION);
    }

    // 1. Boot up static UI overlays & canvases
    UIManager.init();
    
    // 2. Setup standard routing and page navigation
    setupNavigation();

    // 3. Initialize state triggers
    setupGameTriggers();

    // 4. Draw basic leaderboard logs on initial load
    renderLeaderboard();

    // 5. Asynchronously synchronize with SQLite server database
    StorageManager.syncWithBackend().then(synced => {
        if (synced) {
            renderLeaderboard();
            UIManager.logTerminal("Telemetry database synchronized with SQLite server.", "eval");
        }
    });
});

/* =========================================================================
   1. VIEWPORT NAVIGATION ROUTER
   ========================================================================= */
function setupNavigation() {
    const navItems = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.view-section');

    navItems.forEach(btn => {
        btn.addEventListener('click', () => {
            const targetSecId = btn.dataset.section;
            if (!targetSecId) return;

            AudioSynth.playClick();

            // Update navigation bar active states
            navItems.forEach(n => n.classList.remove('active'));
            btn.classList.add('active');

            // Render matching target view container
            sections.forEach(sec => {
                if (sec.id === targetSecId) {
                    sec.classList.add('active');
                } else {
                    sec.classList.remove('active');
                }
            });

            // Special actions for dashboard/analytics view
            if (targetSecId === 'analytics') {
                renderAnalyticsDashboard();
            } else if (targetSecId === 'leaderboard') {
                renderLeaderboard();
            }
        });
    });

    // Support side links inside Documentation
    document.querySelectorAll('.docs-side-link').forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            AudioSynth.playClick();
            const targetId = link.getAttribute('href');
            document.querySelector(targetId)?.scrollIntoView({ behavior: 'smooth' });
            
            document.querySelectorAll('.docs-side-link').forEach(l => l.classList.remove('active'));
            link.classList.add('active');
        });
    });
}

/* =========================================================================
   2. NEURAL TRAINING / GAME CONTROLLER
   ========================================================================= */
function setupGameTriggers() {
    // Difficulty selectors
    document.querySelectorAll('.diff-card').forEach(card => {
        card.addEventListener('click', () => {
            const diffKey = card.dataset.diff;
            if (LEVELS[diffKey]) {
                startCalibration(diffKey);
            }
        });
    });

    // Guess input event handlers
    const guessBtn = document.getElementById('guessBtn');
    const guessInput = document.getElementById('guessInput');

    guessBtn?.addEventListener('click', handleGuessSubmission);
    guessInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            handleGuessSubmission();
        }
    });

    // Smart Hint Engine trigger
    const hintBtn = document.getElementById('hintTriggerBtn');
    hintBtn?.addEventListener('click', triggerSmartHint);

    // Call sign Leaderboard save button
    const saveBtn = document.getElementById('saveBtn');
    saveBtn?.addEventListener('click', handleLeaderboardSave);

    // Play again triggers
    document.getElementById('playAgainBtn')?.addEventListener('click', () => {
        startCalibration(gameState.levelKey);
    });

    document.getElementById('backToMenuBtn')?.addEventListener('click', () => {
        AudioSynth.playClick();
        document.getElementById('resultCard').classList.add('hidden');
        document.getElementById('configCard').classList.remove('hidden');
    });

    document.getElementById('abortBtn')?.addEventListener('click', () => {
        AudioSynth.playFailure();
        UIManager.logTerminal("Cognitive calibration run aborted by user.", "error");
        document.getElementById('gameCard').classList.add('hidden');
        document.getElementById('configCard').classList.remove('hidden');
        document.getElementById('statusBadge').textContent = 'SYSTEM READY';
        document.getElementById('statusBadge').classList.remove('active');
    });

    // Document print performance report
    document.getElementById('printReportBtn')?.addEventListener('click', () => {
        AudioSynth.playClick();
        const element = document.getElementById('reportCard');
        if (!element) return;

        // Save current scroll coordinates
        const scrollX = window.scrollX;
        const scrollY = window.scrollY;

        // Scroll to origin (0, 0) to avoid html2canvas clipping/black-box offset bugs
        window.scrollTo(0, 0);

        // Custom config for beautiful landscape layout
        const opt = {
            margin:       [10, 10],
            filename:     `NeuroGuess_AI_Audit_Report_${Date.now()}.pdf`,
            image:        { type: 'jpeg', quality: 0.98 },
            html2canvas:  { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: '#030306',
                scrollX: 0,
                scrollY: 0,
                windowWidth: document.documentElement.offsetWidth,
                windowHeight: document.documentElement.offsetHeight,
                logging: false
            },
            jsPDF:        { unit: 'mm', format: 'a4', orientation: 'landscape' }
        };

        // Render PDF directly and restore scroll position after save resolves
        html2pdf().set(opt).from(element).save().then(() => {
            window.scrollTo(scrollX, scrollY);
        }).catch(err => {
            console.error("PDF generation failed:", err);
            window.scrollTo(scrollX, scrollY);
        });
    });

    // Theme Engine (Light/Dark mode)
    document.getElementById('themeToggle')?.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        document.getElementById('themeToggle').textContent = isLight ? 'THEME: LIGHT' : 'THEME: DARK';
        AudioSynth.playClick();
        
        // Re-render dashboard if active to adjust labels to the new theme background
        const activeNav = document.querySelector('.nav-item.active');
        if (activeNav && activeNav.dataset.section === 'analytics') {
            renderAnalyticsDashboard();
        }
    });


}

function startCalibration(levelKey) {
    const params = LEVELS[levelKey];
    
    // Configure internal game state params
    gameState = {
        levelKey,
        target: Math.floor(Math.random() * (params.max - params.min + 1)) + params.min,
        currentMin: params.min,
        currentMax: params.max,
        triesMax: params.tries,
        triesLeft: params.tries,
        guesses: [],
        startTime: Date.now(),
        hintsUsed: 0
    };

    // Swap configurations cards
    document.getElementById('configCard').classList.add('hidden');
    document.getElementById('resultCard').classList.add('hidden');
    document.getElementById('gameCard').classList.remove('hidden');

    // Reset UI displays
    document.getElementById('statusBadge').textContent = 'CALIBRATION ACTIVE';
    document.getElementById('statusBadge').classList.add('active');

    document.getElementById('calibrationRangeTitle').textContent = `CALIBRATE RANGE: ${params.min}–${params.max}`;
    document.getElementById('attemptsLeftLabel').textContent = params.tries;
    document.getElementById('attemptsMaxLabel').textContent = params.tries;
    document.getElementById('rangeLimitsLabel').textContent = `${params.min}–${params.max}`;
    document.getElementById('levelIndicatorLabel').textContent = params.label;

    document.getElementById('gaugeMin').textContent = params.min;
    document.getElementById('gaugeMax').textContent = params.max;
    
    // Clear guess text / list states
    const input = document.getElementById('guessInput');
    if (input) {
        input.value = '';
        input.disabled = false;
    }
    document.getElementById('guessBtn').disabled = false;
    document.getElementById('historyRow').innerHTML = '';
    
    // Initialize state-based hints limits
    const hintBtn = document.getElementById('hintTriggerBtn');
    if (hintBtn) {
        hintBtn.disabled = true;
        hintBtn.textContent = 'Awaiting Guess';
    }
    document.getElementById('hintsLeftCounter').textContent = params.maxHints;
    
    gameState.activeHintMin = null;
    gameState.activeHintMax = null;
    
    const hintStatusDot = document.getElementById('hintStatusDot');
    if (hintStatusDot) {
        hintStatusDot.className = 'status-dot pulse yellow';
    }

    const hintContainer = document.getElementById('hintContainerBox');
    if (hintContainer) {
        hintContainer.className = 'hint-container';
        document.getElementById('smartHintBoxText').textContent = "Telemetry idle. Submit at least one guess coordinate to activate Bayesian inference models.";
        document.getElementById('smartHintConfidence').textContent = '--';
        document.getElementById('smartHintDirection').textContent = '--';
    }

    // Reset gauge visual value representation
    document.getElementById('dialGaugeVal').textContent = '?';
    document.getElementById('dialGaugeVal').style.color = '';
    document.getElementById('dialGaugeHint').textContent = 'awaiting synapse';

    const progressArc = document.getElementById('gaugeProgressArc');
    if (progressArc) {
        progressArc.style.strokeDashoffset = 521.5;
        progressArc.style.stroke = 'var(--neon-cyan)';
        progressArc.style.filter = 'drop-shadow(0 0 4px var(--neon-cyan))';
    }

    // Clear and write initial log line
    const logBox = document.getElementById('aiLogs');
    if (logBox) logBox.innerHTML = '';
    writeAILog(`Heuristic engine calibrating range constraints [${params.min} - ${params.max}]. Tries allowed: ${params.tries}.`, 'system');

    UIManager.logTerminal(`[SYSTEM] Starting calibration session. Level: ${params.label.toUpperCase()}. Target generated.`);
    AudioSynth.playClick();
    
    setTimeout(() => input?.focus(), 250);
}

function handleGuessSubmission() {
    const input = document.getElementById('guessInput');
    if (!input || input.disabled) return;

    const val = parseInt(input.value, 10);
    if (isNaN(val) || val < gameState.currentMin || val > gameState.currentMax) {
        input.style.borderColor = 'var(--neon-magenta)';
        setTimeout(() => input.style.borderColor = '', 450);
        writeAILog(`Input target error. Selected guess ${input.value} lies outside boundary filters.`, 'eval');
        AudioSynth.playFailure();
        return;
    }

    gameState.guesses.push(val);
    gameState.triesLeft--;

    // If first guess, enable hint system
    if (gameState.guesses.length === 1) {
        const hintBtn = document.getElementById('hintTriggerBtn');
        const params = LEVELS[gameState.levelKey];
        if (hintBtn && gameState.hintsUsed < params.maxHints) {
            hintBtn.disabled = false;
            hintBtn.textContent = 'Trigger AI Hint';
            
            const hintStatusDot = document.getElementById('hintStatusDot');
            if (hintStatusDot) hintStatusDot.className = 'status-dot pulse green';
            
            document.getElementById('smartHintBoxText').textContent = "Telemetry locked. Hint module ready to resolve prediction limits.";
        }
    }

    // Update attempts left widgets
    document.getElementById('attemptsLeftLabel').textContent = gameState.triesLeft;

    // Update dynamic gauge progress circular arc based on initial level range parameters
    const progressArc = document.getElementById('gaugeProgressArc');
    if (progressArc) {
        const params = LEVELS[gameState.levelKey];
        const span = params.max - params.min;
        const normalizedVal = val - params.min;
        const pct = span > 0 ? (normalizedVal / span) : 0;
        const circumference = 521.5;
        const offset = circumference - (circumference * pct);
        progressArc.style.strokeDashoffset = offset;
        
        if (val === gameState.target) {
            progressArc.style.stroke = 'var(--neon-green)';
            progressArc.style.filter = 'drop-shadow(0 0 6px var(--neon-green))';
        } else {
            progressArc.style.stroke = 'var(--neon-cyan)';
            progressArc.style.filter = 'drop-shadow(0 0 6px var(--neon-cyan))';
        }
    }

    // Check if guess entered the active AI hint interval
    if (gameState.activeHintMin !== null && val >= gameState.activeHintMin && val <= gameState.activeHintMax) {
        UIManager.showToast("COGNITIVE LOCK: Guess inside AI recommended interval!", "success");
        writeAILog("[ALIGNMENT] Guess coordinates matched with predicted target interval.", "system");
        
        // Clear active hint bounds to prevent repeated alerts on the same suggestion
        gameState.activeHintMin = null;
        gameState.activeHintMax = null;
    }

    // Call UI gauge updates
    const dialVal = document.getElementById('dialGaugeVal');
    const dialHint = document.getElementById('dialGaugeHint');
    dialVal.textContent = val;

    // Write terminal node logs
    const processingLogs = AIEngine.generateProcessingLogs(val, gameState.target, gameState.currentMin, gameState.currentMax);
    processingLogs.forEach((log, index) => {
        setTimeout(() => writeAILog(log), index * 100);
    });

    // Check game condition: WIN
    if (val === gameState.target) {
        setTimeout(() => endCalibration(true), 600);
        return;
    }

    // Adjust current min/max boundaries recursively
    const isLow = val < gameState.target;
    if (isLow) {
        gameState.currentMin = Math.max(gameState.currentMin, val + 1);
        dialVal.style.color = 'var(--neon-cyan)';
        dialHint.textContent = 'INCREASE VALUE';
        writeAILog(`[FEEDBACK] Node guess ${val} is LOWER than target vector.`, 'eval');
        AudioSynth.playAlertLow();
    } else {
        gameState.currentMax = Math.min(gameState.currentMax, val - 1);
        dialVal.style.color = 'var(--neon-magenta)';
        dialHint.textContent = 'DECREASE VALUE';
        writeAILog(`[FEEDBACK] Node guess ${val} is HIGHER than target vector.`, 'eval');
        AudioSynth.playAlertHigh();
    }

    // Add visual chip log
    const chip = document.createElement('div');
    chip.className = `history-chip ${isLow ? 'low' : 'high'}`;
    chip.textContent = `${val} ${isLow ? '↑' : '↓'}`;
    document.getElementById('historyRow').appendChild(chip);

    // Update boundary widgets
    document.getElementById('gaugeMin').textContent = gameState.currentMin;
    document.getElementById('gaugeMax').textContent = gameState.currentMax;

    // Calculate real-time prediction confidence score using Flask ML backend model
    const params = LEVELS[gameState.levelKey];
    AIEngine.getLiveWinProbability(
        gameState.currentMin,
        gameState.currentMax,
        params.min,
        params.max,
        gameState.triesLeft,
        gameState.triesMax,
        gameState.guesses.length,
        val,
        gameState.target,
        gameState.guesses
    ).then(res => {
        document.getElementById('liveConfidenceGauge').textContent = `${res.probability}%`;
        
        // Write inference log detail to developer shell logs
        if (res.method === 'ML_MODEL') {
            writeAILog(`[INFERENCE] scikit-learn Logistic Regression probability: ${res.probability}%`);
        } else {
            writeAILog(`[HEURISTIC] Fallback logic bounds estimation: ${res.probability}%`);
        }
    });

    input.value = '';
    input.focus();

    // Check game condition: LOSE
    if (gameState.triesLeft <= 0) {
        setTimeout(() => endCalibration(false), 600);
    }
}

function triggerSmartHint() {
    const params = LEVELS[gameState.levelKey];
    if (gameState.guesses.length === 0) {
        writeAILog("Cannot compute prediction intervals without baseline guess coordinates.", "eval");
        AudioSynth.playFailure();
        return;
    }

    if (gameState.hintsUsed >= params.maxHints) {
        writeAILog("[ABORT] Hint budget depleted for this session run.", "error");
        AudioSynth.playFailure();
        return;
    }

    const hintBtn = document.getElementById('hintTriggerBtn');
    hintBtn.disabled = true;
    hintBtn.textContent = 'Processing...';
    gameState.hintsUsed++;

    // Update status dot and container styling to active (blue)
    const hintStatusDot = document.getElementById('hintStatusDot');
    if (hintStatusDot) hintStatusDot.className = 'status-dot pulse blue';
    
    const hintContainer = document.getElementById('hintContainerBox');
    if (hintContainer) hintContainer.classList.add('glow-active');

    // Update hints left counter widget
    const remainingHints = params.maxHints - gameState.hintsUsed;
    document.getElementById('hintsLeftCounter').textContent = remainingHints;

    writeAILog("Bayesian heuristic engine generating suggested search space matrix...", "system");
    AudioSynth.playClick();
    
    setTimeout(() => {
        const hint = AIEngine.generateSmartHint(
            gameState.target, 
            gameState.currentMin, 
            gameState.currentMax, 
            gameState.guesses
        );

        // Render hint to dashboard
        const hintTextEl = document.getElementById('smartHintBoxText');
        const hintDirEl = document.getElementById('smartHintDirection');
        const hintConfEl = document.getElementById('smartHintConfidence');

        // Store computed target interval boundaries
        gameState.activeHintMin = hint.intervalMin;
        gameState.activeHintMax = hint.intervalMax;

        if (hintTextEl) {
            hintTextEl.textContent = hint.description;
            hintDirEl.textContent = hint.direction;
            hintConfEl.textContent = `${hint.confidence}%`;
            
            // Highlight direction indicator color
            hintDirEl.style.color = hint.direction.includes('INCREASE') ? 'var(--neon-cyan)' : 'var(--neon-magenta)';
        }

        writeAILog(`[SUGGESTION] Target interval computed: [${hint.intervalMin} - ${hint.intervalMax}] with ${hint.confidence}% confidence index.`, "system");
        AudioSynth.playHint();
        
        // Remove active glow styling
        if (hintContainer) hintContainer.classList.remove('glow-active');

        // Apply next state condition based on remaining hints
        if (gameState.hintsUsed >= params.maxHints) {
            if (hintStatusDot) hintStatusDot.className = 'status-dot pulse red';
            if (hintContainer) hintContainer.classList.add('glow-depleted');
            if (hintTextEl) hintTextEl.textContent = "Maximum hint allocation exhausted for this calibration run.";
            hintBtn.disabled = true;
            hintBtn.textContent = 'DEPLETED';
        } else {
            if (hintStatusDot) hintStatusDot.className = 'status-dot pulse green';
            
            // Re-enable after cooldown delay
            setTimeout(() => {
                if (gameState.triesLeft > 0 && document.getElementById('gameCard').classList.contains('hidden') === false) {
                    hintBtn.disabled = false;
                    hintBtn.textContent = 'Trigger AI Hint';
                }
            }, 1500);
        }
    }, 600);
}

function endCalibration(won) {
    const params = LEVELS[gameState.levelKey];
    const durationSec = Math.round((Date.now() - gameState.startTime) / 1000);
    
    // Calculate final Calibration Score
    const triesUsed = gameState.triesMax - gameState.triesLeft;
    let score = 0;
    if (won) {
        score = Math.round((gameState.triesLeft / gameState.triesMax) * 1000 * params.mult) + 100;
        // Apply tiny penalty if they relied heavily on AI hints
        score = Math.max(100, score - (gameState.hintsUsed * 45));
    }

    // Toggle panels
    document.getElementById('gameCard').classList.add('hidden');
    document.getElementById('resultCard').classList.remove('hidden');

    // Populate result card details
    const targetValEl = document.getElementById('resultTargetVal');
    targetValEl.textContent = gameState.target;
    targetValEl.className = `result-target-value ${won ? 'win' : 'lose'}`;

    document.getElementById('resultTitleLabel').textContent = won ? 'NEURAL LOCK STABLE' : 'CALIBRATION FAIL';
    document.getElementById('resultVerdictText').textContent = won ? 'TARGET VECTOR RETRIEVED SUCCESSFULLY' : 'TARGET VECTOR DISSIPATED INTO BACKGROUND ENTROPY';
    
    document.getElementById('resScore').textContent = score;
    document.getElementById('resTries').textContent = `${triesUsed}/${gameState.triesMax}`;
    document.getElementById('resDiff').textContent = params.label;

    // Toggle Leaderboard callsign box
    const callsignSection = document.getElementById('callsignSaveRow');
    if (won && score > 0) {
        callsignSection.classList.remove('hidden');
        document.getElementById('callsignInput').value = '';
    } else {
        callsignSection.classList.add('hidden');
    }

    // Store state variable in app memory cache
    gameState.finalScore = score;
    gameState.won = won;
    gameState.durationSec = durationSec;

    // Generate comprehensive AI Performance Report
    const report = AIEngine.generatePerformanceReport(won, params.label, gameState.target, gameState.guesses, params.tries, durationSec);
    
    // Render print card report data details
    document.getElementById('reportCard').classList.add('active');
    document.getElementById('rptRating').textContent = report.rating;
    document.getElementById('rptScore').textContent = score;
    document.getElementById('rptDate').textContent = new Date().toLocaleString();
    
    updateReportBar('barQuality', report.decisionQuality);
    updateReportBar('barPattern', report.patternRecognition);
    updateReportBar('barEfficiency', report.searchEfficiency);
    updateReportBar('barStability', report.predictionStability);

    // Evaluation text summary
    const summaryText = won 
        ? `Operator navigated search bounds efficiently, maintaining target offset of ±${report.averageMistake}. System logs verify '${report.reactionAnalysis}' during critical nodes.`
        : `Operator failed to sync synapse coordinates. Target vector average delta remained high at ±${report.averageMistake}. Critical pattern: attempts exhausted.`;
    document.getElementById('rptEvaluationSummaryText').textContent = summaryText;

    // Commit telemetry object to localStorage
    StorageManager.saveMatch({
        difficulty: params.label,
        triesUsed,
        maxTries: params.tries,
        won,
        score,
        target: gameState.target,
        rangeMin: params.min,
        rangeMax: params.max,
        guesses: gameState.guesses,
        reactionTimeMs: Math.round((durationSec * 1000) / (triesUsed || 1))
    });

    // Notify Status Badge & Console
    document.getElementById('statusBadge').textContent = won ? 'CALIBRATION LOCKED' : 'CORE INACTIVE';
    document.getElementById('statusBadge').classList.toggle('active', won);

    UIManager.logTerminal(`[REPORT] Match completed. Target: ${gameState.target}. Attempts used: ${triesUsed}. Result Score: ${score}.`);
    
    if (won) {
        AudioSynth.playSuccess();
    } else {
        AudioSynth.playFailure();
    }
}

function updateReportBar(elementId, value) {
    const fillEl = document.querySelector(`#${elementId} .report-score-bar-fill`);
    const valEl = document.querySelector(`#${elementId} .score-bar-val`);
    if (fillEl && valEl) {
        fillEl.style.width = `${value}%`;
        valEl.textContent = `${value}%`;
    }
}

function writeAILog(text, type = 'normal') {
    const logBox = document.getElementById('aiLogs');
    if (!logBox) return;

    const line = document.createElement('div');
    line.className = `ai-log-line ${type}`;
    line.textContent = `[${new Date().toLocaleTimeString().split(' ')[0]}] ${text}`;
    
    logBox.appendChild(line);
    logBox.scrollTop = logBox.scrollHeight;
}

/* =========================================================================
   3. LEADERBOARD RENDERING
   ========================================================================= */
function handleLeaderboardSave() {
    const input = document.getElementById('callsignInput');
    const name = input?.value.trim() || 'ANONYMOUS';
    
    if (gameState.finalScore !== undefined) {
        const params = LEVELS[gameState.levelKey];
        StorageManager.saveToLeaderboard(name, gameState.finalScore, params.label);
        document.getElementById('callsignSaveRow').classList.add('hidden');
        renderLeaderboard();
        UIManager.logTerminal(`[LEADERBOARD] calls sign operator logged: ${name.toUpperCase()} - Score: ${gameState.finalScore}`);
        AudioSynth.playSuccess();
    }
}

function renderLeaderboard() {
    const list = document.getElementById('leaderboardList');
    if (!list) return;

    list.innerHTML = '';
    const scores = StorageManager.getLeaderboard();

    if (scores.length === 0) {
        list.innerHTML = '<div class="lb-empty">SYSTEM ARCHIVE CLEAR. AWAITING INITIAL OPERATIONAL ENTRY.</div>';
        return;
    }

    scores.forEach((item, index) => {
        let medalClass = '';
        if (index === 0) medalClass = 'gold';
        else if (index === 1) medalClass = 'silver';
        else if (index === 2) medalClass = 'bronze';

        const row = document.createElement('div');
        row.className = 'lb-row';
        row.innerHTML = `
            <div class="rank ${medalClass}">${index + 1}</div>
            <div class="name">${escapeHTML(item.name)}</div>
            <div class="diff-tag">${item.diff}</div>
            <div class="score">${item.score}</div>
        `;
        list.appendChild(row);
    });
}

function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

/* =========================================================================
   4. ANALYTICS & MACHINE LEARNING DASHBOARD POPULATOR
   ========================================================================= */
function renderAnalyticsDashboard() {
    const matches = StorageManager.getMatchHistory();
    const profile = StorageManager.getMLProfile();

    // Bind ML Profile details cards
    document.getElementById('statGames').textContent = profile.gamesPlayed;
    document.getElementById('statWinRate').textContent = `${profile.winRate}%`;
    document.getElementById('statAvgScore').textContent = profile.averageScore;
    document.getElementById('statAvgTries').textContent = profile.averageTries;
    document.getElementById('statAvgSpeed').textContent = profile.gamesPlayed > 0 
        ? `${(profile.averageReactionTimeMs / 1000).toFixed(2)}s` 
        : 'N/A';
    document.getElementById('statFavDiff').textContent = profile.favoriteDifficulty;
    document.getElementById('statBias').textContent = profile.firstGuessBias;
    document.getElementById('statLearningRate').textContent = profile.learningRate;
    document.getElementById('statNeuroRating').textContent = `${profile.systemCalibrationScore}/100`;

    // Trigger Chart.js graph drawing
    ChartHandler.buildDashboardCharts(matches, profile);

    // Render the match history execution logs list
    renderMatchLogs();
}

function renderMatchLogs() {
    const listEl = document.getElementById('matchLogsList');
    if (!listEl) return;
    
    const matches = StorageManager.getMatchHistory();
    listEl.innerHTML = '';
    
    if (matches.length === 0) {
        listEl.innerHTML = '<div style="color:var(--text-dim); text-align:center; padding:15px;">No execution data logged yet. Complete calibration runs to populate.</div>';
        return;
    }
    
    // Show last 5 matches in reverse chronological order
    const recent = [...matches].reverse().slice(0, 5);
    recent.forEach((m, idx) => {
        const row = document.createElement('div');
        row.style.border = '1px solid var(--panel-border)';
        row.style.borderRadius = '10px';
        row.style.padding = '12px 18px';
        row.style.background = 'rgba(255,255,255,0.01)';
        row.style.cursor = 'pointer';
        row.style.transition = 'all 0.2s';
        
        row.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <span style="color: ${m.won ? 'var(--neon-green)' : 'var(--neon-magenta)'}">● ${m.won ? 'STABLE' : 'FAIL'}</span>
                    <span style="color: var(--text-muted); margin-left: 10px;">Level: ${m.difficulty}</span>
                    <span style="color: var(--text-dim); margin-left: 10px;">Target: ${m.target}</span>
                </div>
                <div style="color: var(--text-muted);">
                    <span>Score: ${m.score}</span>
                    <span style="margin-left: 15px;">Tries: ${m.triesUsed}/${m.maxTries}</span>
                </div>
            </div>
            <div class="guesses-sublist hidden" style="margin-top: 10px; border-top: 1px dashed var(--panel-border); padding-top: 8px; color: var(--text-dim); line-height: 1.4;">
                Vector Path Coordinate Logs: [ ${m.guesses.join(' → ')} ]
            </div>
        `;
        
        row.addEventListener('click', () => {
            AudioSynth.playClick();
            const sublist = row.querySelector('.guesses-sublist');
            sublist.classList.toggle('hidden');
        });
        
        listEl.appendChild(row);
    });
}
