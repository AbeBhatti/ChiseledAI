import React, { useEffect } from 'react';
import './WorkoutTracker.css';
import PositionBar from './PositionBar';

const WorkoutTracker = ({ repCount, feedback, exercise, onDone, landmarks }) => {
  let exerciseName;
  switch (exercise) {
    case 'pushups':
      exerciseName = 'Push-Ups';
      break;
    case 'pullups':
      exerciseName = 'Pull-Ups';
      break;
    case 'squats':
      exerciseName = 'Squats';
      break;
    default:
      exerciseName = 'Exercise';
  }

  const formatFeedback = (feedbackString) => {
    if (!feedbackString) return 'Good job!';
    return feedbackString.replace(/,/g, ' •');
  };

  useEffect(() => {
    if (!feedback || feedback.toLowerCase().includes('good job')) return;

    window.speechSynthesis.cancel();

    const utterance = new SpeechSynthesisUtterance(feedback);
    utterance.rate = 1.3;
    utterance.pitch = 1.0;
    window.speechSynthesis.speak(utterance);

    return () => window.speechSynthesis.cancel();
  }, [feedback]);

  return (
    <div className="workout-tracker">
      <div className="tracker-header">
        <h3>{exerciseName}</h3>
      </div>

      <div className="rep-counter">
        <div className="rep-label">REPS</div>
        <div className="rep-number">{repCount}</div>
      </div>

      <PositionBar landmarks={landmarks} exercise={exercise} />

      <div className="feedback-section">
        <div className="feedback-label">FORM CHECK</div>
        <div
          className={`feedback-text ${
            feedback && feedback.length > 0 ? 'has-feedback' : 'good-form'
          }`}
        >
          {formatFeedback(feedback)}
        </div>
      </div>

      <button className="done-button" onClick={onDone}>
        Finish Workout
      </button>
    </div>
  );
};

export default WorkoutTracker;