/**
 * NeuroGuess AI - Storage & Telemetry Manager
 * Handles local storage caching and SQLite server synchronization.
 */

const STORAGE_KEYS = {
    LEADERBOARD: 'neuroguess_leaderboard',
    MATCH_HISTORY: 'neuroguess_matches',
    ML_PROFILE: 'neuroguess_ml_profile'
};

// BACKEND_URL is defined in scripts/config.js (loaded before this file)

const StorageManager = {
    /**
     * Get leaderboard scores sorted from high to low
     */
    getLeaderboard() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.LEADERBOARD);
            return data ? JSON.parse(data).sort((a, b) => b.score - a.score).slice(0, 10) : [];
        } catch (e) {
            console.error("Error reading leaderboard:", e);
            return [];
        }
    },

    /**
     * Save score to the leaderboard and sync to server database
     */
    saveToLeaderboard(name, score, diffLabel) {
        // 1. Cache to local storage first
        try {
            const leaderboard = this.getLeaderboard();
            const record = {
                name: name.toUpperCase().slice(0, 16),
                score: parseInt(score, 10) || 0,
                diff: diffLabel,
                timestamp: Date.now()
            };
            leaderboard.push(record);
            localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(leaderboard));
            this.updateMLProfile();
        } catch (e) {
            console.error("Error caching score to local leaderboard:", e);
        }

        // 2. Sync to Python backend in background
        fetch(`${BACKEND_URL}/leaderboard`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, score, difficulty: diffLabel })
        })
        .then(res => {
            if (res.ok) console.log("Leaderboard record successfully synced with SQLite server.");
        })
        .catch(err => {
            console.warn("Server backend offline. Leaderboard saved locally.", err);
        });
    },

    /**
     * Get all match telemetry history
     */
    getMatchHistory() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.MATCH_HISTORY);
            return data ? JSON.parse(data) : [];
        } catch (e) {
            console.error("Error reading matches:", e);
            return [];
        }
    },

    /**
     * Save a completed match telemetry and sync to SQLite database
     * @param {Object} match - { difficulty, triesUsed, maxTries, won, score, target, rangeMin, rangeMax, guesses, reactionTimeMs }
     */
    saveMatch(match) {
        // 1. Cache to local storage
        try {
            const history = this.getMatchHistory();
            history.push({
                ...match,
                timestamp: Date.now()
            });
            localStorage.setItem(STORAGE_KEYS.MATCH_HISTORY, JSON.stringify(history));
            this.updateMLProfile();
        } catch (e) {
            console.error("Error caching match telemetry locally:", e);
        }

        // 2. Sync to SQLite database in the background
        fetch(`${BACKEND_URL}/log`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(match)
        })
        .then(res => {
            if (res.ok) console.log("Match telemetry successfully logged to SQLite server.");
        })
        .catch(err => {
            console.warn("Server backend offline. Telemetry cached in local browser storage.", err);
        });
    },

    /**
     * Synchronize local browser storage with the Flask SQL database
     */
    async syncWithBackend() {
        try {
            // 1. Pull latest leaderboard records
            const lbRes = await fetch(`${BACKEND_URL}/leaderboard`);
            if (lbRes.ok) {
                const scores = await lbRes.json();
                localStorage.setItem(STORAGE_KEYS.LEADERBOARD, JSON.stringify(scores));
            }

            // 2. Pull latest matches telemetry history logs
            const historyRes = await fetch(`${BACKEND_URL}/history`);
            if (historyRes.ok) {
                const history = await historyRes.json();
                localStorage.setItem(STORAGE_KEYS.MATCH_HISTORY, JSON.stringify(history));
                this.updateMLProfile();
            }
            
            console.log("Telemetry database sync cycle complete.");
            return true;
        } catch (e) {
            console.warn("Backend server offline. Operating in localized database fallback mode.", e);
            return false;
        }
    },

    /**
     * Recompute ML profiles based on match history telemetry
     */
    updateMLProfile() {
        const matches = this.getMatchHistory();
        if (matches.length === 0) return;

        let totalScore = 0;
        let wins = 0;
        let totalTriesUsed = 0;
        let avgReactionTime = 0;
        let diffPrefs = { EASY: 0, MEDIUM: 0, HARD: 0 };
        
        let binarySearchAlignCount = 0;
        let lowGuessBiasCount = 0;
        let highGuessBiasCount = 0;

        matches.forEach(m => {
            totalScore += m.score;
            if (m.won) wins++;
            totalTriesUsed += m.triesUsed;
            avgReactionTime += (m.reactionTimeMs || 5000);
            
            const diffKey = String(m.difficulty).toUpperCase();
            if (diffPrefs[diffKey] !== undefined) diffPrefs[diffKey]++;

            // ML Guessing Pattern Classifiers
            if (m.guesses && m.guesses.length > 0) {
                const firstGuess = m.guesses[0];
                const range = m.rangeMax - m.rangeMin + 1;
                const midpoint = (m.rangeMin + m.rangeMax) / 2;
                
                // If first guess is within 10% of midpoint, they are applying binary search theory
                if (Math.abs(firstGuess - midpoint) <= (range * 0.1)) {
                    binarySearchAlignCount++;
                } else if (firstGuess < midpoint) {
                    lowGuessBiasCount++;
                } else {
                    highGuessBiasCount++;
                }
            }
        });

        const totalMatches = matches.length;
        
        // Formulate a clean, natural ML classification statement
        let biasText = "Heuristic search pattern matches normal distribution.";
        if (binarySearchAlignCount / totalMatches >= 0.5) {
            biasText = "Applies optimal Binary Split partitioning strategy.";
        } else if (lowGuessBiasCount > highGuessBiasCount) {
            biasText = "Low-bound conservative search bias detected.";
        } else if (highGuessBiasCount > lowGuessBiasCount) {
            biasText = "High-bound aggressive search bias detected.";
        }

        // Determine favorite difficulty
        let favoriteDiff = "EASY";
        if (diffPrefs.MEDIUM >= diffPrefs.EASY && diffPrefs.MEDIUM >= diffPrefs.HARD) favoriteDiff = "MEDIUM";
        else if (diffPrefs.HARD >= diffPrefs.EASY && diffPrefs.HARD >= diffPrefs.MEDIUM) favoriteDiff = "HARD";

        // Calculate Learning Rate Improvement over runs
        let learningRateText = "Steady convergence state.";
        if (totalMatches >= 2) {
            const firstHalf = matches.slice(0, Math.ceil(totalMatches / 2));
            const secondHalf = matches.slice(Math.ceil(totalMatches / 2));
            
            const avgTriesFirst = firstHalf.reduce((acc, m) => acc + m.triesUsed, 0) / firstHalf.length;
            const avgTriesSecond = secondHalf.reduce((acc, m) => acc + m.triesUsed, 0) / secondHalf.length;
            
            if (avgTriesSecond < avgTriesFirst) {
                const improvement = Math.round(((avgTriesFirst - avgTriesSecond) / avgTriesFirst) * 100);
                learningRateText = `+${improvement}% search efficiency gain over runs.`;
            } else if (avgTriesSecond > avgTriesFirst) {
                learningRateText = "Adaptive search limits fluctuated.";
            }
        }

        const profile = {
            gamesPlayed: totalMatches,
            winRate: Math.round((wins / totalMatches) * 100),
            averageScore: Math.round(totalScore / totalMatches),
            averageTries: parseFloat((totalTriesUsed / totalMatches).toFixed(1)),
            averageReactionTimeMs: Math.round(avgReactionTime / totalMatches),
            favoriteDifficulty: favoriteDiff,
            firstGuessBias: biasText,
            learningRate: learningRateText,
            systemCalibrationScore: Math.min(100, Math.round((wins / totalMatches) * 70 + (wins > 0 ? (35 - (totalTriesUsed / totalMatches)) * 2 : 0)))
        };

        localStorage.setItem(STORAGE_KEYS.ML_PROFILE, JSON.stringify(profile));
    },

    /**
     * Get processed ML profile
     */
    getMLProfile() {
        try {
            const data = localStorage.getItem(STORAGE_KEYS.ML_PROFILE);
            if (data) return JSON.parse(data);
        } catch (e) {
            console.error("Error reading ML profile:", e);
        }

        // Return baseline fallback
        return {
            gamesPlayed: 0,
            winRate: 0,
            averageScore: 0,
            averageTries: 0,
            averageReactionTimeMs: 0,
            favoriteDifficulty: 'N/A',
            firstGuessBias: 'Awaiting initial calibration payload.',
            learningRate: 'Awaiting telemetry signal.',
            systemCalibrationScore: 0
        };
    },

    clearData() {
        localStorage.removeItem(STORAGE_KEYS.LEADERBOARD);
        localStorage.removeItem(STORAGE_KEYS.MATCH_HISTORY);
        localStorage.removeItem(STORAGE_KEYS.ML_PROFILE);

        // Notify server to clear DB
        fetch(`${BACKEND_URL}/reset_telemetry`, { method: 'POST' })
        .then(res => {
            if (res.ok) console.log("SQLite database records wiped successfully.");
        })
        .catch(err => {
            console.warn("Could not wipe database records from server backend:", err);
        });
    }
};

window.StorageManager = StorageManager;
