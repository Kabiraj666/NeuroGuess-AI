import os
import pickle
import sqlite3
import numpy as np
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_PATH = os.path.join(os.path.dirname(__file__), 'telemetry.db')
MODEL_PATH = os.path.join(os.path.dirname(__file__), 'model.pkl')
SCALER_PATH = os.path.join(os.path.dirname(__file__), 'scaler.pkl')

# Global variables for model state
ml_model = None
ml_scaler = None

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    """
    Auto-initialize database tables for real persistent leaderboard and match logs.
    """
    with get_db() as db:
        db.execute('''
            CREATE TABLE IF NOT EXISTS gameplay_logs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                difficulty TEXT,
                tries_used INTEGER,
                max_tries INTEGER,
                won INTEGER,
                score INTEGER,
                target INTEGER,
                guesses_vector TEXT,
                reaction_time_ms INTEGER,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        db.execute('''
            CREATE TABLE IF NOT EXISTS leaderboard (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT,
                score INTEGER,
                difficulty TEXT,
                timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        db.commit()

def load_ml_model():
    global ml_model, ml_scaler
    if os.path.exists(MODEL_PATH) and os.path.exists(SCALER_PATH):
        try:
            with open(MODEL_PATH, 'rb') as f:
                ml_model = pickle.load(f)
            with open(SCALER_PATH, 'rb') as f:
                ml_scaler = pickle.load(f)
            print("Successfully loaded scikit-learn model and scaler pipeline.")
        except Exception as e:
            print(f"Error loading model pickle files: {e}")
            ml_model, ml_scaler = None, None
    else:
        print("Pickled model files not found. Inference endpoints will fall back gracefully.")

# Initialize system resources
init_db()
load_ml_model()

@app.route('/predict', methods=['POST'])
def predict():
    """
    Runs model inference on current gameplay features to calculate win probability.
    """
    if ml_model is None or ml_scaler is None:
        return jsonify({
            'status': 'ML_OFFLINE',
            'error': 'ML model not trained or pickled files missing.',
            'probability': 0
        }), 503

    try:
        data = request.get_json() or {}
        
        # Pull parameters sent from frontend client
        min_bound = int(data.get('min_bound', 1))
        max_bound = int(data.get('max_bound', 100))
        range_min = int(data.get('range_min', 1))
        range_max = int(data.get('range_max', 100))
        tries_left = int(data.get('tries_left', 8))
        tries_max = int(data.get('tries_max', 8))
        guess_number = int(data.get('guess_number', 1))
        guess_value = int(data.get('guess_value', 50))
        target = int(data.get('target', 42))
        guesses = data.get('guesses', [])

        # 1. Feature Engineering
        initial_range = range_max - range_min + 1
        current_range = max_bound - min_bound + 1
        
        dist = abs(guess_value - target)
        normalized_distance = dist / initial_range
        tries_left_ratio = tries_left / tries_max
        entropy_reduction = current_range / initial_range
        
        # Calculate search efficiency deviation from binary midpoint
        midpoint = (min_bound + max_bound) // 2
        search_efficiency_deviation = abs(guess_value - midpoint) / (current_range if current_range > 0 else 1)
        
        # Direction consistency logic
        direction_consistent = 1
        if len(guesses) > 1:
            prev_guess = guesses[-2]
            if prev_guess < target and guess_value < prev_guess:
                direction_consistent = 0
            elif prev_guess > target and guess_value > prev_guess:
                direction_consistent = 0
                
        # Arrange features vector
        features = np.array([[
            normalized_distance,
            tries_left_ratio,
            guess_number,
            entropy_reduction,
            direction_consistent,
            search_efficiency_deviation
        ]])

        # 2. Pipeline Transform & Predict
        features_scaled = ml_scaler.transform(features)
        win_proba = ml_model.predict_proba(features_scaled)[0][1] # P(win | features)
        
        # Round and clamp
        win_percentage = min(99, max(5, int(round(win_proba * 100))))

        return jsonify({
            'status': 'ML_ONLINE',
            'probability': win_percentage
        })

    except Exception as e:
        return jsonify({
            'status': 'ERROR',
            'error': str(e),
            'probability': 0
        }), 400

@app.route('/log', methods=['POST'])
def log_match():
    """
    Logs gameplay results to SQLite telemetry db to build historical dataset.
    """
    try:
        data = request.get_json() or {}
        difficulty = data.get('difficulty')
        tries_used = int(data.get('triesUsed', 0))
        max_tries = int(data.get('maxTries', 0))
        won = 1 if data.get('won') else 0
        score = int(data.get('score', 0))
        target = int(data.get('target', 0))
        guesses = data.get('guesses', [])
        reaction_time = int(data.get('reactionTimeMs', 0))

        guesses_str = ",".join(map(str, guesses))

        with get_db() as db:
            db.execute('''
                INSERT INTO gameplay_logs (difficulty, tries_used, max_tries, won, score, target, guesses_vector, reaction_time_ms)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            ''', (difficulty, tries_used, max_tries, won, score, target, guesses_str, reaction_time))
            db.commit()

        return jsonify({'status': 'SUCCESS', 'message': 'Match telemetry archived in SQLite database.'})

    except Exception as e:
        return jsonify({'status': 'ERROR', 'error': str(e)}), 400

@app.route('/history', methods=['GET'])
def get_history():
    """
    Returns the recent matches database logs.
    """
    try:
        with get_db() as db:
            cursor = db.execute('SELECT * FROM gameplay_logs ORDER BY id DESC LIMIT 15')
            rows = cursor.fetchall()
            
        matches = []
        for r in rows:
            guesses = [int(x) for x in r['guesses_vector'].split(',')] if r['guesses_vector'] else []
            matches.append({
                'difficulty': r['difficulty'],
                'triesUsed': r['tries_used'],
                'maxTries': r['max_tries'],
                'won': bool(r['won']),
                'score': r['score'],
                'target': r['target'],
                'guesses': guesses,
                'reactionTimeMs': r['reaction_time_ms'],
                'timestamp': r['timestamp']
            })
        return jsonify(matches)
    except Exception as e:
        return jsonify({'status': 'ERROR', 'error': str(e)}), 500

@app.route('/leaderboard', methods=['GET', 'POST'])
def handle_leaderboard():
    """
    Exposes persistent endpoints for saving and viewing registry leaderboards.
    """
    if request.method == 'POST':
        try:
            data = request.get_json() or {}
            name = data.get('name', 'ANONYMOUS').upper()
            score = int(data.get('score', 0))
            difficulty = data.get('difficulty')

            with get_db() as db:
                db.execute('INSERT INTO leaderboard (name, score, difficulty) VALUES (?, ?, ?)', (name, score, difficulty))
                db.commit()
            return jsonify({'status': 'SUCCESS', 'message': 'Leaderboard record logged.'})
        except Exception as e:
            return jsonify({'status': 'ERROR', 'error': str(e)}), 400
    else:
        # GET request: return top 10 records
        try:
            with get_db() as db:
                cursor = db.execute('SELECT name, score, difficulty FROM leaderboard ORDER BY score DESC, id ASC LIMIT 10')
                rows = cursor.fetchall()
            scores = [{'name': r['name'], 'score': r['score'], 'diff': r['difficulty']} for r in rows]
            return jsonify(scores)
        except Exception as e:
            return jsonify([]), 500

@app.route('/reset_telemetry', methods=['POST'])
def reset_telemetry():
    """
    Wipes both gameplay_logs and leaderboard databases.
    """
    try:
        with get_db() as db:
            db.execute('DELETE FROM gameplay_logs')
            db.execute('DELETE FROM leaderboard')
            db.commit()
        return jsonify({'status': 'SUCCESS', 'message': 'All persistent telemetry cache deleted.'})
    except Exception as e:
        return jsonify({'status': 'ERROR', 'error': str(e)}), 500

if __name__ == '__main__':
    # Try reloading model in case it was trained during app cycle
    load_ml_model()
    app.run(host='0.0.0.0', port=5000, debug=True)
