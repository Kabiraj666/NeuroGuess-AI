import os
import pickle
import numpy as np
import pandas as pd
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

def generate_simulated_data(num_samples=5000):
    """
    Generates high-fidelity user gameplay decision states to train the Random Forest predictor.
    """
    np.random.seed(42)
    
    data = []
    for _ in range(num_samples):
        # Pick random level boundaries
        difficulty = np.random.choice(['easy', 'medium', 'hard'])
        if difficulty == 'easy':
            min_val, max_val, max_tries = 1, 50, 10
        elif difficulty == 'medium':
            min_val, max_val, max_tries = 1, 100, 8
        else:
            min_val, max_val, max_tries = 1, 500, 6
            
        target = np.random.randint(min_val, max_val + 1)
        
        # Simulate strategic operator paths (75% binary splitter, 25% erratic guesser)
        is_rational = np.random.rand() < 0.75
        
        current_min, current_max = min_val, max_val
        guesses = []
        
        for g_idx in range(1, max_tries + 1):
            tries_left = max_tries - g_idx + 1
            midpoint = (current_min + current_max) // 2
            
            # Generate guess coordinate
            if is_rational:
                # Rational binary splitting with normal distribution noise
                jitter = int(np.random.normal(0, max(1, (current_max - current_min) // 12)))
                guess = np.clip(midpoint + jitter, current_min, current_max)
            else:
                # Erratic/random sampling within known boundaries
                guess = np.random.randint(current_min, current_max + 1)
            
            guesses.append(guess)
            
            # Feature calculations
            initial_range = max_val - min_val + 1
            current_range = current_max - current_min + 1
            
            dist = abs(guess - target)
            normalized_distance = dist / initial_range
            tries_left_ratio = tries_left / max_tries
            guess_number = g_idx
            entropy_reduction = current_range / initial_range
            
            # Feature: Search efficiency deviation from optimal midpoint
            search_efficiency_deviation = abs(guess - midpoint) / (current_range if current_range > 0 else 1)
            
            # Check direction consistency of guesses
            direction_consistent = 1
            if len(guesses) > 1:
                prev_guess = guesses[-2]
                if prev_guess < target and guess < prev_guess:
                    direction_consistent = 0
                elif prev_guess > target and guess > prev_guess:
                    direction_consistent = 0
            
            won_this_round = (guess == target)
            
            # Eventual win indicator (Target matched within remaining tries budget)
            eventual_win = 1 if (target in guesses or (is_rational and tries_left >= 2)) else 0
            if won_this_round:
                eventual_win = 1
            
            data.append({
                'normalized_distance': normalized_distance,
                'tries_left_ratio': tries_left_ratio,
                'guess_number': guess_number,
                'entropy_reduction': entropy_reduction,
                'direction_consistency': direction_consistent,
                'search_efficiency_deviation': search_efficiency_deviation,
                'won': eventual_win
            })
            
            if won_this_round:
                break
                
            # Update boundaries
            if guess < target:
                current_min = max(current_min, guess + 1)
            else:
                current_max = min(current_max, guess - 1)
                
    return pd.DataFrame(data)

def train_and_evaluate():
    print("--------------------------------------------------")
    print("NeuroGuess ML Model Training Pipeline Initializing")
    print("--------------------------------------------------")
    
    # 1. Generate telemetry training data
    df = generate_simulated_data()
    print(f"Generated {len(df)} gameplay state profiles for model training.")
    
    # 2. Extract features and target labels
    feature_cols = [
        'normalized_distance', 
        'tries_left_ratio', 
        'guess_number', 
        'entropy_reduction', 
        'direction_consistency', 
        'search_efficiency_deviation'
    ]
    X = df[feature_cols]
    y = df['won']
    
    # 3. Stratified Train-Test Split (80/20)
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)
    
    # 4. Standard Scaling
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    
    # 5. Initialize & Train Random Forest Classifier
    # Perfect for representing tree-based decision boundary splits (Binary Search)
    print("Training Random Forest Classifier (100 estimators, max depth 6)...")
    model = RandomForestClassifier(n_estimators=100, max_depth=6, class_weight='balanced', random_state=42)
    model.fit(X_train_scaled, y_train)
    
    # 6. Evaluate model
    y_pred = model.predict(X_test_scaled)
    accuracy = accuracy_score(y_test, y_pred)
    conf_matrix = confusion_matrix(y_test, y_pred)
    class_report = classification_report(y_test, y_pred)
    
    print("\n=== Model Performance Evaluation ===")
    print(f"Validation Testing Accuracy Score: {accuracy:.4f}")
    print("\nConfusion Matrix:")
    print(conf_matrix)
    print("\nDetailed Classification Report:")
    print(class_report)
    
    # Save scaler and trained model
    os.makedirs('backend', exist_ok=True)
    with open('backend/scaler.pkl', 'wb') as f:
        pickle.dump(scaler, f)
    with open('backend/model.pkl', 'wb') as f:
        pickle.dump(model, f)
        
    print("Model 'model.pkl' and Scaler 'scaler.pkl' successfully compiled and pickled.")
    print("--------------------------------------------------")

if __name__ == '__main__':
    train_and_evaluate()
