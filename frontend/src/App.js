import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css';
import ExerciseSelector from './components/ExerciseSelector';
import CameraFeed from './components/CameraFeed';
import WorkoutTracker from './components/WorkoutTracker';
import Countdown from './components/Countdown';
import WorkoutSummary from './components/WorkoutSummary';
import PongGame from './components/PongGame';
import DumbbellBackground from './DumbbellBackground';

function App() {
  const [selectedExercise, setSelectedExercise] = useState(null);
  const [gameMode, setGameMode] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [landmarks, setLandmarks] = useState([]);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const [showCountdown, setShowCountdown] = useState(false);
  const [countdownComplete, setCountdownComplete] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState(null);
  const socketRef = useRef(null);

  useEffect(() => {
    if (!selectedExercise || !countdownComplete || showSummary) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setConnectionStatus('disconnected');
      return;
    }

    if (socketRef.current) return;

    const socket = io('http://localhost:8765', {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setConnectionStatus('connected');
      setTimeout(() => {
        socket.emit('select_exercise', { exercise: selectedExercise });
      }, 100);
    });

    socket.on('update', (data) => {
      setRepCount(data.rep_count);
      setFeedback(data.feedback);
      setLandmarks(data.landmarks || []);
    });

    socket.on('workout_summary', (data) => {
      setSummaryData(data);
      setShowSummary(true);
    });

    socket.on('disconnect', () => setConnectionStatus('disconnected'));
    socket.on('connect_error', () => setConnectionStatus('error'));

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [selectedExercise, countdownComplete, showSummary]);

  const handleSelectExercise = (exercise) => {
    setSelectedExercise(exercise);
    setGameMode(false);
    setShowCountdown(true);
    setCountdownComplete(false);
    setShowSummary(false);
    setSummaryData(null);
    setRepCount(0);
    setFeedback('');
    setLandmarks([]);
  };

  const handleSelectGame = (exercise) => {
    console.log('Game mode selected:', exercise);
    setSelectedExercise(exercise);
    setGameMode(true);
    setShowCountdown(false);
    setCountdownComplete(true);
    setShowSummary(false);
    setSummaryData(null);
  };

  const handleCountdownComplete = () => {
    setShowCountdown(false);
    setCountdownComplete(true);
  };

  const handleGoBack = () => {
    setSelectedExercise(null);
    setGameMode(false);
    setShowCountdown(false);
    setCountdownComplete(false);
    setShowSummary(false);
    setSummaryData(null);
    setRepCount(0);
    setFeedback('');
    setLandmarks([]);
  };

  const handleDone = () => {
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('end_workout');
    }
  };

  return (
    <>
      <DumbbellBackground />
  
      <div className="App">
        <header className="App-header">
          <h1>ChiseledAI</h1>
          {selectedExercise && countdownComplete && !showSummary && (
            <div className="connection-status">
              <span className={`status-dot ${connectionStatus}`}></span>
              <span className="status-text">{connectionStatus}</span>
            </div>
          )}
        </header>
  
        <main>
          {!selectedExercise ? (
            <ExerciseSelector 
              onSelectExercise={handleSelectExercise}
              onSelectGame={handleSelectGame}
            />
          ) : gameMode ? (
            <div className="game-mode-container">
              <div className="game-camera-feed">
                <CameraFeed socket={socketRef.current} landmarks={landmarks} />
              </div>
              
              <PongGame 
                exercise={selectedExercise}
                landmarks={landmarks}
                onExit={handleGoBack}
              />
            </div>
          ) : showCountdown ? (
            <Countdown
              exercise={selectedExercise}
              onComplete={handleCountdownComplete}
              onCancel={handleGoBack}
            />
          ) : showSummary ? (
            <WorkoutSummary
              data={summaryData}
              exercise={selectedExercise}
              onClose={handleGoBack}
            />
          ) : (
            <div className="workout-container">
              <div className="camera-container">
                <CameraFeed socket={socketRef.current} landmarks={landmarks} />
                <button onClick={handleGoBack} className="back-button">
                  Back
                </button>
              </div>
              <WorkoutTracker 
                repCount={repCount} 
                feedback={feedback}
                exercise={selectedExercise}
                onDone={handleDone}
                landmarks={landmarks}
              />
            </div>
          )}
        </main>
      </div>
    </>
  );  
}

export default App;