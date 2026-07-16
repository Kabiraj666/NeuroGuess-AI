/**
 * NeuroGuess AI - Analytics Charts Handler
 * Configures and maintains Chart.js telemetry dashboards.
 */

let chartInstances = {};

/**
 * Set Chart.js global defaults once for crisp rendering and themed tooltips.
 * Called once when ChartHandler first builds charts.
 */
function applyChartGlobalDefaults() {
    if (!window.Chart) return;
    const isLight = document.body.classList.contains('light-theme');

    // Render at native device pixel ratio for sharp canvas text
    Chart.defaults.devicePixelRatio = window.devicePixelRatio || 2;

    // Tooltip styling — matches current theme, no dark box in light mode
    Chart.defaults.plugins.tooltip.backgroundColor = isLight
        ? 'rgba(255, 255, 255, 0.95)'
        : 'rgba(8, 10, 20, 0.92)';
    Chart.defaults.plugins.tooltip.titleColor  = isLight ? '#1e293b' : '#e2e8f0';
    Chart.defaults.plugins.tooltip.bodyColor   = isLight ? '#334155' : '#94a3b8';
    Chart.defaults.plugins.tooltip.borderColor = isLight ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.08)';
    Chart.defaults.plugins.tooltip.borderWidth = 1;
    Chart.defaults.plugins.tooltip.cornerRadius = 8;
    Chart.defaults.plugins.tooltip.padding = 10;
    Chart.defaults.plugins.tooltip.titleFont = { family: 'Space Grotesk', weight: '600', size: 11 };
    Chart.defaults.plugins.tooltip.bodyFont  = { family: 'JetBrains Mono', size: 10 };

    // Legend label sharpness
    Chart.defaults.plugins.legend.labels.font = { family: 'Space Grotesk', size: 10 };
    Chart.defaults.plugins.legend.labels.color = isLight ? '#475569' : '#888ea3';
    Chart.defaults.plugins.legend.labels.boxWidth  = 10;
    Chart.defaults.plugins.legend.labels.boxHeight = 10;
}



const ChartHandler = {
    /**
     * Destroys existing charts to allow redrawing with new telemetry data.
     */
    destroyAllCharts() {
        Object.keys(chartInstances).forEach(key => {
            if (chartInstances[key]) {
                chartInstances[key].destroy();
                chartInstances[key] = null;
            }
        });
    },

    /**
     * Build all charts using match telemetry and ML profile
     */
    buildDashboardCharts(matches, profile) {
        applyChartGlobalDefaults();
        this.destroyAllCharts();


        // Detect current theme to load appropriate visual palette
        const isLight = document.body.classList.contains('light-theme');
        const labelColor = isLight ? '#2e3142' : '#888ea3';
        const tickColor = isLight ? '#3e4152' : '#565b70';
        const gridColor = isLight ? 'rgba(0, 0, 0, 0.08)' : 'rgba(255, 255, 255, 0.02)';
        const radarGridColor = isLight ? 'rgba(0, 0, 0, 0.12)' : 'rgba(255, 255, 255, 0.05)';

        if (!matches || matches.length === 0) {
            this.drawPlaceholderCharts();
            return;
        }

        // Restore canvases in case they were hidden by drawPlaceholderCharts
        ['accuracyLineChart','attemptsBarChart','winRateDoughnutChart','cognitiveRadarChart'].forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) {
                canvas.style.display = '';
                const existing = canvas.parentElement?.querySelector('.chart-empty-state');
                if (existing) existing.remove();
            }
        });


        const last8Matches = matches.slice(-8);
        const gameLabels = last8Matches.map((_, index) => `Run #${index + 1}`);

        // 1. Line Chart: Precision Index (%) Over Runs
        const precisionData = last8Matches.map(m => {
            const range = m.rangeMax - m.rangeMin + 1;
            const avgDistance = m.guesses.reduce((acc, g) => acc + Math.abs(g - m.target), 0) / (m.guesses.length || 1);
            return Math.max(10, Math.round(100 - (avgDistance / range) * 100));
        });

        const ctxLine = document.getElementById('accuracyLineChart')?.getContext('2d');
        if (ctxLine) {
            chartInstances.accuracy = new Chart(ctxLine, {
                type: 'line',
                data: {
                    labels: gameLabels,
                    datasets: [{
                        label: 'Operator Search Accuracy (%)',
                        data: precisionData,
                        borderColor: isLight ? '#0ea5e9' : '#2be3ff',
                        backgroundColor: isLight ? 'rgba(14, 165, 233, 0.06)' : 'rgba(43, 227, 255, 0.08)',
                        borderWidth: 2,
                        tension: 0.35,
                        fill: true,
                        pointBackgroundColor: isLight ? '#0ea5e9' : '#2be3ff',
                        pointBorderColor: '#fff',
                        pointRadius: 4
                    }]
                },
                options: this.getChartOptions(tickColor, gridColor, 100)
            });
        }

        // 2. Bar Chart: Double-bar (Operator Attempts vs Theoretical Binary Limit)
        const ctxBar = document.getElementById('attemptsBarChart')?.getContext('2d');
        if (ctxBar) {
            const operatorSteps = last8Matches.map(m => m.triesUsed);
            const optimalLimits = last8Matches.map(m => {
                const range = m.rangeMax - m.rangeMin + 1;
                return Math.ceil(Math.log2(range));
            });

            chartInstances.attempts = new Chart(ctxBar, {
                type: 'bar',
                data: {
                    labels: gameLabels,
                    datasets: [
                        {
                            label: 'Operator Steps',
                            data: operatorSteps,
                            backgroundColor: isLight ? 'rgba(225, 29, 72, 0.85)' : 'rgba(255, 47, 110, 0.8)',
                            borderColor: isLight ? '#e11d48' : '#ff2f6e',
                            borderWidth: 1,
                            borderRadius: 4
                        },
                        {
                            label: 'Theoretical Binary Limit',
                            data: optimalLimits,
                            backgroundColor: isLight ? 'rgba(16, 185, 129, 0.25)' : 'rgba(57, 255, 157, 0.3)',
                            borderColor: isLight ? '#10b981' : 'rgba(57, 255, 157, 0.8)',
                            borderWidth: 1,
                            borderRadius: 4
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: true,
                            position: 'top',
                            labels: { color: labelColor, font: { family: 'Space Grotesk', size: 9 } }
                        }
                    },
                    scales: {
                        x: {
                            grid: { color: gridColor },
                            ticks: { color: tickColor, font: { family: 'JetBrains Mono', size: 9 } }
                        },
                        y: {
                            grid: { color: gridColor },
                            ticks: { color: tickColor, font: { family: 'JetBrains Mono', size: 9 } },
                            min: 0,
                            max: 12
                        }
                    }
                }
            });
        }

        // 3. Doughnut Chart: Calibration Win Rate Ratio
        const ctxDoughnut = document.getElementById('winRateDoughnutChart')?.getContext('2d');
        if (ctxDoughnut) {
            const wins = matches.filter(m => m.won).length;
            const losses = matches.length - wins;

            chartInstances.winRate = new Chart(ctxDoughnut, {
                type: 'doughnut',
                data: {
                    labels: ['Acquired Target', 'System Overload'],
                    datasets: [{
                        data: [wins, losses],
                        backgroundColor: [
                            isLight ? 'rgba(16, 185, 129, 0.8)' : 'rgba(57, 255, 157, 0.8)',
                            isLight ? 'rgba(225, 29, 72, 0.8)' : 'rgba(255, 47, 110, 0.8)'
                        ],
                        borderColor: [
                            isLight ? '#10b981' : '#39ff9d',
                            isLight ? '#e11d48' : '#ff2f6e'
                        ],
                        borderWidth: 1,
                        cutout: '70%',
                        borderRadius: 4
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { color: labelColor, font: { family: 'Space Grotesk', size: 10 } }
                        }
                    }
                }
            });
        }

        // 4. Radar Chart: Cognitive player profile
        const ctxRadar = document.getElementById('cognitiveRadarChart')?.getContext('2d');
        if (ctxRadar) {
            const winsCount = matches.filter(m => m.won).length;
            const winRateMetric = Math.min(100, Math.round((winsCount / matches.length) * 100));

            const optimalSum = matches.reduce((acc, m) => acc + Math.ceil(Math.log2(m.rangeMax - m.rangeMin + 1)), 0);
            const actualSum = matches.reduce((acc, m) => acc + m.triesUsed, 0);
            const precisionMetric = Math.min(100, Math.max(10, Math.round((optimalSum / (actualSum || 1)) * 100)));

            const avgSpeedMs = matches.reduce((acc, m) => acc + (m.reactionTimeMs || 5000), 0) / matches.length;
            const speedMetric = Math.min(100, Math.max(15, Math.round(100 - (avgSpeedMs / 180))));

            const strategyMetric = Math.min(100, Math.max(15, Math.round(profile.systemCalibrationScore || 50)));
            const adaptabilityMetric = Math.min(100, Math.max(20, Math.min(99, 20 + matches.length * 10)));

            chartInstances.radar = new Chart(ctxRadar, {
                type: 'radar',
                data: {
                    labels: ['Win Stability', 'Search Precision', 'Processing Speed', 'Binary Strategy', 'Model Adaptability'],
                    datasets: [{
                        label: 'Operator Profile',
                        data: [winRateMetric, precisionMetric, speedMetric, strategyMetric, adaptabilityMetric],
                        backgroundColor: isLight ? 'rgba(124, 58, 237, 0.1)' : 'rgba(139, 107, 255, 0.12)',
                        borderColor: isLight ? '#7c3aed' : '#8b6bff',
                        borderWidth: 2,
                        pointBackgroundColor: isLight ? '#7c3aed' : '#8b6bff',
                        pointBorderColor: '#fff',
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        r: {
                            grid: { color: radarGridColor },
                            angleLines: { color: radarGridColor },
                            pointLabels: { color: labelColor, font: { family: 'Space Grotesk', size: 9 } },
                            ticks: { display: false },
                            min: 0,
                            max: 100
                        }
                    },
                    plugins: {
                        legend: { display: false }
                    }
                }
            });
        }
    },

    /**
     * Show empty-state overlay on each chart canvas when no telemetry data exists.
     * No fake/sample data is shown — users generate real data by playing.
     */
    drawPlaceholderCharts() {
        const isLight = document.body.classList.contains('light-theme');

        const canvasIds = [
            'accuracyLineChart',
            'attemptsBarChart',
            'winRateDoughnutChart',
            'cognitiveRadarChart'
        ];

        const messages = [
            'Search Precision will\nappear after calibration runs.',
            'Steps calibration data\nwill populate after gameplay.',
            'Win/Loss ratio unlocks\nafter completing matches.',
            'Neural profile builds\nfrom your match history.'
        ];

        canvasIds.forEach((id, i) => {
            const canvas = document.getElementById(id);
            if (!canvas) return;

            // Hide canvas, show text overlay inside parent wrapper
            canvas.style.display = 'none';

            const wrap = canvas.parentElement;
            // Remove existing placeholder if re-rendering
            const existing = wrap.querySelector('.chart-empty-state');
            if (existing) existing.remove();

            const empty = document.createElement('div');
            empty.className = 'chart-empty-state';
            empty.style.cssText = `
                height: 100%;
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                gap: 10px;
                text-align: center;
            `;

            const icon = document.createElement('div');
            icon.textContent = '◌';
            icon.style.cssText = `
                font-size: 28px;
                opacity: 0.25;
                color: ${isLight ? '#94a3b8' : '#4a5568'};
            `;

            const label = document.createElement('div');
            label.textContent = messages[i].replace('\\n', ' ');
            label.style.cssText = `
                font-family: 'JetBrains Mono', monospace;
                font-size: 10.5px;
                line-height: 1.55;
                color: ${isLight ? '#94a3b8' : '#3d4454'};
                max-width: 160px;
            `;

            const hint = document.createElement('div');
            hint.textContent = '— Play a match to unlock —';
            hint.style.cssText = `
                font-family: 'JetBrains Mono', monospace;
                font-size: 9px;
                letter-spacing: 0.06em;
                color: ${isLight ? '#cbd5e1' : '#2a2f3a'};
            `;

            empty.appendChild(icon);
            empty.appendChild(label);
            empty.appendChild(hint);
            wrap.appendChild(empty);
        });
    },

    /**
     * Standard UI styling options for Chart.js
     */
    getChartOptions(tickColor, gridColor, maxVal) {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                title: { display: false }
            },
            scales: {
                x: {
                    grid: { color: gridColor },
                    ticks: { color: tickColor, font: { family: 'JetBrains Mono', size: 9 } }
                },
                y: {
                    grid: { color: gridColor },
                    ticks: { color: tickColor, font: { family: 'JetBrains Mono', size: 9 } },
                    min: 0,
                    max: maxVal
                }
            }
        };
    }
};

window.ChartHandler = ChartHandler;
