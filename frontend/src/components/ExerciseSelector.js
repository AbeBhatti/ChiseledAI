import React from 'react';
import './ExerciseSelector.css';

const ExerciseSelector = ({ onSelectExercise, onSelectGame }) => {
  const exercises = [
    { 
      id: 'pushups', 
      name: 'Push-Ups',
    },
    { 
      id: 'pullups', 
      name: 'Pull-Ups',
    },
    {
      id: 'squats',
      name: 'Squats',
    }
  ];

  return (
    <div className="exercise-selector">
      <div className="selector-content">
        <div className="section-container">
          <h2 className="section-title">Form Tracker</h2>
          <div className="exercise-grid">
            {exercises.map((exercise) => (
              <button 
                key={exercise.id} 
                className="exercise-card"
                onClick={() => onSelectExercise(exercise.id)}
              >
                <h3 className="exercise-name">{exercise.name}</h3>
                <p className="exercise-description">{exercise.description}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="section-container">
          <h2 className="section-title">Ping Pong Challenge</h2>
          <div className="exercise-grid">
            {exercises.map((exercise) => (
              <button 
                key={`game-${exercise.id}`}
                className="exercise-card game-card"
                onClick={() => onSelectGame(exercise.id)}
              >
                <h3 className="exercise-name">{exercise.name}</h3>
              </button>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
};

export default ExerciseSelector;