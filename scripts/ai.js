/**
 * NeuroGuess AI - Prediction & Heuristic AI Engine
 * Handles confidence scoring, probability calculations, heuristic interval narrowings, and AI status logs.
 */

const AIEngine = {
    /**
     * Compute prediction confidence score (%) based on remaining guesses and search space.
     * Formula combines the entropy of remaining search space and attempts left.
     */
    calculateConfidence(currentMin, currentMax, maxRange, triesLeft, triesMax) {
        const remainingSpace = currentMax - currentMin + 1;
        const spaceRatio = remainingSpace / maxRange; // Closer to 0 means we narrow it down
        
        // Base confidence increases as search space shrinks
        let confidence = (1 - spaceRatio) * 70;

        // Tries factor: having more tries left relative to remaining space increases confidence
        const optimalTriesNeeded = Math.ceil(Math.log2(remainingSpace));
        if (triesLeft >= optimalTriesNeeded) {
            confidence += 30 * (triesLeft / triesMax);
        } else {
            confidence += 20 * (triesLeft / optimalTriesNeeded);
        }

        return Math.min(99, Math.max(5, Math.round(confidence)));
    },

    /**
     * Retrieve live predictive win probability from Python scikit-learn Flask server.
     * Integrates real-time machine learning inference with heuristic local fallback.
     */
    async getLiveWinProbability(minBound, maxBound, rangeMin, rangeMax, triesLeft, triesMax, guessNumber, guessValue, target, guesses) {
        try {
            const response = await fetch('http://localhost:5000/predict', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    min_bound: minBound,
                    max_bound: maxBound,
                    range_min: rangeMin,
                    range_max: rangeMax,
                    tries_left: triesLeft,
                    tries_max: triesMax,
                    guess_number: guessNumber,
                    guess_value: guessValue,
                    target: target,
                    guesses: guesses
                })
            });
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'ML_ONLINE') {
                    return { probability: data.probability, method: 'ML_MODEL' };
                }
            }
        } catch (e) {
            console.warn("Prediction endpoint unreachable. Using local heuristic evaluation fallback.");
        }
        
        // Fallback heuristic, not the trained model
        const fallback = this.calculateConfidence(minBound, maxBound, rangeMax - rangeMin + 1, triesLeft, triesMax);
        return { probability: fallback, method: 'HEURISTIC' };
    },

    /**
     * Generate simulated neural processing logs for terminal display
     */
    generateProcessingLogs(guess, target, min, max) {
        const delta = Math.abs(guess - target);
        const range = max - min + 1;
        const percentageOff = Math.round((delta / range) * 100);

        return [
            `[COGNITIVE] Initiating neural scan on input value: ${guess}...`,
            `[ENTROPY] Current search space bounds: [${min} - ${max}]`,
            `[MATRICES] Distance vector mismatch index: ${delta} (${percentageOff}% offset)`,
            `[PROBABILITY] Running Bayesian weight adjustment...`,
            `[HEURISTIC] Probability node density localized. Result formulated.`
        ];
    },

    /**
     * Smart Hint Engine
     * Calculates narrow intervals using a pseudo-Bayesian search heuristic.
     * Helps the user by narrowing down the interval using a dynamic confidence range.
     */
    generateSmartHint(target, min, max, guesses) {
        const range = max - min + 1;
        
        // Introduce small heuristic random offsets to make it look like AI is predicting a probability range
        const midPoint = (min + max) / 2;
        
        // Define a suggested interval containing the target.
        // The size of the suggested interval shrinks as guesses count increases.
        const numGuesses = guesses.length;
        const shrinkFactor = Math.max(0.15, 0.6 - (numGuesses * 0.08)); // Interval gets tighter as game goes
        
        let intervalWidth = Math.ceil(range * shrinkFactor);
        if (intervalWidth < 5) intervalWidth = 5;

        // Align interval around target but with some heuristic jitter so it isn't too obvious
        let intervalMin = target - Math.floor(Math.random() * (intervalWidth * 0.6));
        let intervalMax = intervalMin + intervalWidth;

        // Clamp values to current known bounds
        if (intervalMin < min) {
            intervalMin = min;
            intervalMax = Math.min(max, min + intervalWidth);
        }
        if (intervalMax > max) {
            intervalMax = max;
            intervalMin = Math.max(min, max - intervalWidth);
        }

        // Double check target lies within it (safety constraint)
        if (target < intervalMin || target > intervalMax) {
            intervalMin = Math.max(min, target - Math.floor(intervalWidth / 2));
            intervalMax = Math.min(max, intervalMin + intervalWidth);
        }

        // Calculate hint confidence score
        const hintConfidence = Math.min(98, Math.round(100 - (intervalWidth / range) * 40));

        // Recommend suggestion direction
        const direction = (target > guesses[guesses.length - 1]) 
            ? "INCREASE SEARCH INTERVAL" 
            : "DECREASE SEARCH INTERVAL";

        return {
            intervalMin,
            intervalMax,
            confidence: hintConfidence,
            direction,
            description: `Cognitive calibration recommends focusing inputs within the range of [${intervalMin} – ${intervalMax}].`
        };
    },

    /**
     * AI performance analysis generated at the end of the game
     */
    generatePerformanceReport(won, difficulty, target, guesses, maxTries, durationSecs) {
        const triesUsed = guesses.length;
        const avgMistake = guesses.reduce((acc, g) => acc + Math.abs(g - target), 0) / (triesUsed || 1);
        
        // Calculate scores for B.Tech project analytical dashboard
        const decisionQuality = won ? Math.max(30, Math.round(100 - (avgMistake * 0.8) - (triesUsed * 3))) : 10;
        const patternRecognition = won ? Math.max(20, Math.round(100 - (triesUsed * 8))) : 15;
        const searchEfficiency = won ? Math.round((Math.log2(maxTries * 50) / triesUsed) * 100) : 20; // Compare vs binary search
        const predictionStability = Math.round(100 - (guesses.slice(1).reduce((acc, g, i) => acc + Math.abs(g - guesses[i]), 0) / (triesUsed || 1)) * 0.5);

        const decisionQualityClamped = Math.min(100, Math.max(5, decisionQuality));
        const patternClamped = Math.min(100, Math.max(5, patternRecognition));
        const efficiencyClamped = Math.min(100, Math.max(5, searchEfficiency));
        const stabilityClamped = Math.min(100, Math.max(5, predictionStability));
        const reactionAnalysis = durationSecs < (triesUsed * 2) ? "OPTIMAL NEURAL RESPONSIVENESS" : "COGNITIVE DELAY DETECTED";

        let rating = "CALIBRATION INCOMPLETE";
        if (won) {
            const overallScore = (decisionQualityClamped + patternClamped + efficiencyClamped + stabilityClamped) / 4;
            if (overallScore > 85) rating = "QUANTUM INTELLIGENCE CLASS";
            else if (overallScore > 70) rating = "ADVANCED DEEP SYSTEM";
            else if (overallScore > 50) rating = "STANDARD NEURAL NODE";
            else rating = "HEURISTIC BASELINE";
        }

        return {
            rating,
            decisionQuality: decisionQualityClamped,
            patternRecognition: patternClamped,
            searchEfficiency: efficiencyClamped,
            predictionStability: stabilityClamped,
            reactionAnalysis,
            averageMistake: Math.round(avgMistake * 10) / 10
        };
    }
};

window.AIEngine = AIEngine;
