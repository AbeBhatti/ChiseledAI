import React, { useState, useEffect } from 'react';
import './Countdown.css';

const Countdown = ({ exercise, onComplete, onCancel }) => {
  const [count, setCount] = useState(5);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraError, setCameraError] = useState(false);

  useEffect(() => {
    const requestCamera = async () => {
      try {
        await navigator.mediaDevices.getUserMedia({ video: true });
        setCameraReady(true);
      } catch (err) {
        console.error('Camera access denied', err);
        setCameraError(true);
      }
    };
    requestCamera();
  }, []);

  useEffect(() => {
    if (!cameraReady) return;
    if (count === 0) {
      onComplete();
      return;
    }

    const timer = setTimeout(() => {
      setCount(count - 1);
    }, 1000);

    return () => clearTimeout(timer);
  }, [count, cameraReady, onComplete]);

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

  if (cameraError) {
    return (
      <div className="countdown-container">
        <p style={{ color: 'red', textAlign: 'center' }}>
          Camera access is required to start the workout.
        </p>
        <button className="countdown-cancel" onClick={onCancel}>
          Go Back
        </button>
      </div>
    );
  }

  if (!cameraReady) {
    return (
      <div className="countdown-container">
        <p style={{ color: '#fff', textAlign: 'center' }}>
          Waiting for camera permission...
        </p>
      </div>
    );
  }

  return (
    <div className="countdown-container">
      <button className="countdown-cancel" onClick={onCancel}>
        Cancel
      </button>
      <div className="countdown-content">
        <h2 className="countdown-title">Get Ready for {exerciseName}!</h2>
        <div className="countdown-circle">
          <div className="countdown-number">{count === 0 ? 'GO!' : count}</div>
        </div>
        <p className="countdown-instruction">Position yourself in frame</p>
      </div>
    </div>
  );
};

export default Countdown;
