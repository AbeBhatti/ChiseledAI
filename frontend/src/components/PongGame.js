import React, { useRef, useEffect, useState } from 'react';
import './PongGame.css';

const calculateAngle = (a, b, c) => {
  if (!a || !b || !c) return 0;
  
  const ba = [a.x - b.x, a.y - b.y, (a.z || 0) - (b.z || 0)];
  const bc = [c.x - b.x, c.y - b.y, (c.z || 0) - (c.z || 0)];
  
  const dot = ba[0] * bc[0] + ba[1] * bc[1] + ba[2] * bc[2];
  const magBa = Math.sqrt(ba[0] ** 2 + ba[1] ** 2 + ba[2] ** 2);
  const magBc = Math.sqrt(bc[0] ** 2 + bc[1] ** 2 + bc[2] ** 2);
  
  if (magBa === 0 || magBc === 0) return 0;
  
  const cosAngle = Math.max(-1, Math.min(1, dot / (magBa * magBc)));
  return Math.acos(cosAngle) * (180 / Math.PI);
};

const PongGame = ({ exercise, landmarks, onExit }) => {
  const canvasRef = useRef(null);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [timeAlive, setTimeAlive] = useState(0);
  const [countdown, setCountdown] = useState(10);
  const [gameStarted, setGameStarted] = useState(false);
  
  const gameStateRef = useRef({
    ball: { x: 400, y: 300, dx: 4, dy: 4, size: 12 },
    playerPaddle: { x: 20, y: 250, width: 15, height: 100 },
    aiPaddle: { x: 765, y: 250, width: 15, height: 100 },
    score: 0,
    startTime: null,
    animationId: null
  });

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => {
        setCountdown(countdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    } else if (countdown === 0 && !gameStarted) {
      setGameStarted(true);
      gameStateRef.current.startTime = Date.now();
    }
  }, [countdown, gameStarted]);

  useEffect(() => {
    if (!gameStarted) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const gameState = gameStateRef.current;

    const gameLoop = () => {
      if (gameOver) return;

      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 800, 600);

      ctx.strokeStyle = '#a855f7';
      ctx.setLineDash([10, 10]);
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(400, 0);
      ctx.lineTo(400, 600);
      ctx.stroke();
      ctx.setLineDash([]);

      gameState.ball.x += gameState.ball.dx;
      gameState.ball.y += gameState.ball.dy;

      if (gameState.ball.y - gameState.ball.size < 0 || 
          gameState.ball.y + gameState.ball.size > 600) {
        gameState.ball.dy *= -1;
      }

      if (gameState.ball.x - gameState.ball.size < gameState.playerPaddle.x + gameState.playerPaddle.width &&
          gameState.ball.x + gameState.ball.size > gameState.playerPaddle.x &&
          gameState.ball.y > gameState.playerPaddle.y &&
          gameState.ball.y < gameState.playerPaddle.y + gameState.playerPaddle.height) {
        gameState.ball.dx = Math.abs(gameState.ball.dx);
        gameState.score++;
        setScore(gameState.score);
        
        gameState.ball.dx *= 1.05;
        gameState.ball.dy *= 1.05;
      }

      if (gameState.ball.x + gameState.ball.size > gameState.aiPaddle.x &&
          gameState.ball.x - gameState.ball.size < gameState.aiPaddle.x + gameState.aiPaddle.width &&
          gameState.ball.y > gameState.aiPaddle.y &&
          gameState.ball.y < gameState.aiPaddle.y + gameState.aiPaddle.height) {
        gameState.ball.dx = -Math.abs(gameState.ball.dx);
      }

      const aiCenter = gameState.aiPaddle.y + gameState.aiPaddle.height / 2;
      const diff = gameState.ball.y - aiCenter;
      gameState.aiPaddle.y += diff * 0.3;
      gameState.aiPaddle.y = Math.max(0, Math.min(600 - gameState.aiPaddle.height, gameState.aiPaddle.y));

      if (gameState.ball.x < 0) {
        setGameOver(true);
        const timeAliveSeconds = Math.floor((Date.now() - gameState.startTime) / 1000);
        setTimeAlive(timeAliveSeconds);
        return;
      }

      if (gameState.ball.x > 800) {
        gameState.ball.x = 400;
        gameState.ball.y = 300;
        gameState.ball.dx = -4;
        gameState.ball.dy = 4;
      }

      ctx.fillStyle = '#a855f7';
      ctx.shadowBlur = 20;
      ctx.shadowColor = '#a855f7';
      ctx.fillRect(
        gameState.playerPaddle.x,
        gameState.playerPaddle.y,
        gameState.playerPaddle.width,
        gameState.playerPaddle.height
      );

      ctx.fillStyle = '#ffffff';
      ctx.shadowBlur = 10;
      ctx.shadowColor = '#ffffff';
      ctx.fillRect(
        gameState.aiPaddle.x,
        gameState.aiPaddle.y,
        gameState.aiPaddle.width,
        gameState.aiPaddle.height
      );

      ctx.beginPath();
      ctx.arc(gameState.ball.x, gameState.ball.y, gameState.ball.size, 0, Math.PI * 2);
      ctx.fillStyle = '#c084fc';
      ctx.shadowBlur = 25;
      ctx.shadowColor = '#c084fc';
      ctx.fill();

      ctx.shadowBlur = 0;

      ctx.fillStyle = '#a855f7';
      ctx.font = 'bold 48px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(gameState.score, 400, 60);

      gameState.animationId = requestAnimationFrame(gameLoop);
    };

    gameLoop();

    return () => {
      if (gameState.animationId) {
        cancelAnimationFrame(gameState.animationId);
      }
    };
  }, [gameOver, gameStarted]);

  useEffect(() => {
    if (!landmarks || landmarks.length === 0 || gameOver || !gameStarted) return;

    const gameState = gameStateRef.current;
    let angle = 90;
    let minAngle = 70;
    let maxAngle = 170;

    if (exercise === 'pushups') {
      const ls = landmarks[11];
      const le = landmarks[13];
      const lw = landmarks[15];
      const rs = landmarks[12];
      const re = landmarks[14];
      const rw = landmarks[16];
      
      if (ls && le && lw && rs && re && rw) {
        const leftElbow = calculateAngle(ls, le, lw);
        const rightElbow = calculateAngle(rs, re, rw);
        angle = (leftElbow + rightElbow) / 2;
        
        minAngle = 70;  
        maxAngle = 160; 
      }
    } else if (exercise === 'pullups') {
      const ls = landmarks[11];
      const le = landmarks[13];
      const lw = landmarks[15];
      const rs = landmarks[12];
      const re = landmarks[14];
      const rw = landmarks[16];
      
      if (ls && le && lw && rs && re && rw) {
        const leftElbow = calculateAngle(ls, le, lw);
        const rightElbow = calculateAngle(rs, re, rw);
        angle = (leftElbow + rightElbow) / 2;
        
        minAngle = 60;
        maxAngle = 160;
      }
    } else if (exercise === 'squats') {
      // Hip angle
      const ls = landmarks[11];
      const lh = landmarks[23];
      const lk = landmarks[25];
      const rs = landmarks[12];
      const rh = landmarks[24];
      const rk = landmarks[26];
      
      if (ls && lh && lk && rs && rh && rk) {
        const leftHip = calculateAngle(ls, lh, lk);
        const rightHip = calculateAngle(rs, rh, rk);
        angle = (leftHip + rightHip) / 2;
        
        minAngle = 90;
        maxAngle = 170;
      }
    }

    const clampedAngle = Math.max(minAngle, Math.min(maxAngle, angle));
    
    const normalized = (clampedAngle - minAngle) / (maxAngle - minAngle);
    
    const paddlePosition = normalized; 
    
    const canvasHeight = 600;
    const paddleHeight = gameState.playerPaddle.height;
    
    gameState.playerPaddle.y = paddlePosition * (canvasHeight - paddleHeight);
    
  }, [landmarks, exercise, gameOver, gameStarted]);

  const exerciseName = exercise === 'pushups' ? 'Push-Up' : exercise === 'pullups' ? 'Pull-Up' : 'Squat';

  return (
    <div className="pong-game">
      {countdown > 0 ? (
        <div className="game-countdown">
          <h2 className="countdown-title">Get Ready!</h2>
          <div className="countdown-circle">
            <div className="countdown-number">{countdown}</div>
          </div>
          <p className="countdown-instruction">
            Get into {exerciseName} starting position
          </p>
        </div>
      ) : !gameOver ? (
        <>
          <div className="game-header">
            <h2 className="game-title">{exerciseName} Challenge</h2>
            <p className="game-instruction">
              Control your paddle by holding your position depending on the exercise!
            </p>
          </div>
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={600}
            className="pong-canvas"
          />
          <button className="exit-button" onClick={onExit}>
            Exit Game
          </button>
        </>
      ) : (
        <div className="game-over">
          <h2 className="game-over-title">Game Over!</h2>
          <div className="game-stats">
            <div className="stat">
              <span className="stat-label">Score</span>
              <span className="stat-value">{score}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Time Survived</span>
              <span className="stat-value">{timeAlive}s</span>
            </div>
          </div>
          <button className="play-again-button" onClick={() => window.location.reload()}>
            Play Again
          </button>
          <button className="exit-button" onClick={onExit}>
            Back to Menu
          </button>
        </div>
      )}
    </div>
  );
};

export default PongGame;
