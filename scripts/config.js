/**
 * NeuroGuess AI - Runtime Configuration
 * Single source of truth for the backend API base URL.
 *
 * Locally (localhost/127.0.0.1) it points at your local Flask dev server.
 * Everywhere else (e.g. GitHub Pages, Render static site) it points at your
 * deployed Render backend. Replace the URL below with your actual Render
 * backend service URL after you deploy it.
 */
const BACKEND_URL = (() => {
    const isLocal = ['localhost', '127.0.0.1', ''].includes(window.location.hostname);
    if (isLocal) return 'http://localhost:5000';

    // TODO: replace with your deployed Render backend URL, e.g.
    // 'https://neuroguess-ai-backend.onrender.com'
    return 'https://neuroguess-ai-backend.onrender.com';
})();
