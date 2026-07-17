# 🧠 NeuroGuess AI

<p align="center">
  <h3 align="center">A Futuristic AI-Powered Number Guessing Game</h3>
  <p align="center">
    Experience a cyberpunk-inspired number guessing game with AI aesthetics, real-time analytics, and an interactive interface.
  </p>
</p>



## 📖 Overview

**NeuroGuess AI** is an AI-themed number guessing game built using **HTML, CSS, JavaScript, and Python (Flask)**.

The project features a futuristic cyberpunk interface, interactive gameplay, score tracking, visual analytics, and backend support for storing game telemetry.



## ✨ Features

- 🎮 Interactive Number Guessing Game
- 🤖 AI-inspired futuristic interface
- 📊 Performance analytics using Chart.js
- 🔊 Sound effects and immersive UI
- ⚡ Fast and responsive design
- 💾 Backend telemetry storage
- 📈 Machine Learning model integration
- 📱 Modern user interface



## 🛠️ Tech Stack

### Frontend
- HTML5
- CSS3
- JavaScript (ES6)

### Backend
- Python
- Flask
- Flask-CORS

### Libraries
- Chart.js
- html2pdf.js
- NumPy
- Pandas
- Scikit-learn

---

## 📂 Project Structure

```
NeuroGuess-AI
│
├── assets
│   ├── logo.jpg
│   ├── chart.umd.min.js
│   └── html2pdf.bundle.min.js
│
├── backend
│   ├── app.py
│   ├── train_model.py
│   ├── model.pkl
│   ├── scaler.pkl
│   ├── telemetry.db
│   ├── requirements.txt
│   └── Procfile
│
├── scripts
│   ├── config.js
│   ├── ai.js
│   ├── app.js
│   ├── audio.js
│   ├── charts.js
│   ├── storage.js
│   └── ui.js
│
├── styles
│   └── main.css
│
├── index.html
├── render.yaml
├── .gitignore
└── README.md
```

---

## 🚀 Installation

### 1. Clone the repository

```bash
git clone https://github.com/Kabiraj666/NeuroGuess-AI.git
```

### 2. Move into the project

```bash
cd NeuroGuess-AI
```

### 3. Install Python dependencies

```bash
pip install -r backend/requirements.txt
```

### 4. Start the Flask server

```bash
python backend/app.py
```

### 5. Launch the game

Open **index.html** in your browser. By default `scripts/config.js` points the frontend at `http://localhost:5000` when running locally.



## ☁️ Deploying to Render

This repo includes a `render.yaml` Blueprint that deploys two services:

- **neuroguess-ai-backend** — the Flask API (`backend/`), run with `gunicorn`
- **neuroguess-ai-frontend** — the static site (`index.html`, `scripts/`, `styles/`, `assets/`)

### Steps

1. Push this repo to GitHub (see below).
2. On [Render](https://dashboard.render.com), click **New +** → **Blueprint**, and select this repository. Render will read `render.yaml` and create both services automatically.
3. Once the backend deploys, copy its URL (e.g. `https://neuroguess-ai-backend.onrender.com`).
4. Open `scripts/config.js` and replace the placeholder URL with your backend's real URL:
   ```js
   return 'https://neuroguess-ai-backend.onrender.com';
   ```
5. Commit and push that change — the frontend service will redeploy automatically and start talking to your live backend.

> Note: on Render's free plan, the backend spins down after inactivity, so the first `/predict` request after idling may take a few seconds while it wakes up. The frontend already falls back to a local heuristic if the API is briefly unreachable.

### Pushing this project to GitHub

```bash
git add .
git commit -m "Prepare project for GitHub and Render"
git push origin main
```

If you're starting fresh (no existing remote):

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/<your-username>/<your-repo>.git
git push -u origin main
```



## 🎯 Gameplay

- The AI generates a secret number.
- Guess the correct number.
- Receive intelligent hints.
- Track your performance.
- Improve your score with every round.



## 📊 Technologies Used

| Technology | Purpose |
|------------|---------|
| HTML5 | Structure |
| CSS3 | Styling |
| JavaScript | Game Logic |
| Python | Backend |
| Flask | API Server |
| Chart.js | Analytics |
| SQLite | Telemetry Storage |
| Scikit-learn | Machine Learning |



## 📸 Preview

Add screenshots of the game here.

Example:

- Home Screen
- Gameplay
- Analytics Dashboard



## 🔮 Future Improvements

- Multiplayer Mode
- Online Leaderboard
- User Authentication
- Difficulty Levels
- AI Difficulty Prediction
- Mobile Version



## 👨‍💻 Developer

**Kushal Kabiraj**

🎓 B.Tech – Computer Science & Engineering (AI & ML)

🏫 Asansol Engineering College

GitHub: https://github.com/Kabiraj666



## ⭐ Show Your Support

If you like this project,

⭐ Star this repository

🍴 Fork it

📢 Share it with others


## 📄 License

This project is created for educational and learning purposes.
by Kushal Kabiraj.
