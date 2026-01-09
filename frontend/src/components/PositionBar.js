import React, { useEffect, useState, useRef } from 'react';
import './PositionBar.css';

const PositionBar = ({ landmarks, exercise }) => {
  const [position, setPosition] = useState(50);
  const [phase, setPhase] = useState('up');

  const topYRef = useRef(null);
  const bottomYRef = useRef(null);
  const firstRepCapturedRef = useRef(false);

  useEffect(() => {
    if (!landmarks || landmarks.length === 0) return;

    let currentY;

    if (exercise === 'pushups') {
      const leftShoulder = landmarks[11], rightShoulder = landmarks[12];
      const leftElbow = landmarks[13], rightElbow = landmarks[14];
      if (!leftShoulder || !rightShoulder || !leftElbow || !rightElbow) return;

      const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
      const avgElbowY = (leftElbow.y + rightElbow.y) / 2;
      currentY = avgShoulderY;

      if (!firstRepCapturedRef.current) {
        topYRef.current = avgShoulderY;
        bottomYRef.current = avgElbowY;
        firstRepCapturedRef.current = true;
      }

    } else if (exercise === 'pullups') {
      const leftShoulder = landmarks[11], rightShoulder = landmarks[12];
      const leftWrist = landmarks[15], rightWrist = landmarks[16];
      if (!leftShoulder || !rightShoulder || !leftWrist || !rightWrist) return;

      const avgShoulderY = (leftShoulder.y + rightShoulder.y) / 2;
      currentY = avgShoulderY;

      if (!firstRepCapturedRef.current) {
        topYRef.current = Math.min(leftShoulder.y, rightShoulder.y);
        bottomYRef.current = Math.max(leftWrist.y, rightWrist.y);
        firstRepCapturedRef.current = true;
      }

    } else if (exercise === 'squats') {
      const leftHip = landmarks[23], rightHip = landmarks[24];
      const leftKnee = landmarks[25], rightKnee = landmarks[26];
      if (!leftHip || !rightHip || !leftKnee || !rightKnee) return;

      const avgHipY = (leftHip.y + rightHip.y) / 2;
      currentY = avgHipY;

      if (!firstRepCapturedRef.current) {
        topYRef.current = avgHipY;
        bottomYRef.current = (leftKnee.y + rightKnee.y) / 2;
        firstRepCapturedRef.current = true;
      }
    }

    if (topYRef.current != null && bottomYRef.current != null) {
        let pct = ((currentY - bottomYRef.current) / (topYRef.current - bottomYRef.current)) * 100;
        pct = Math.max(0, Math.min(100, pct));
        setPosition(pct);
        setPhase(pct < 40 ? 'down' : 'up');
      }
      
  }, [landmarks, exercise]);

  return (
    <div className="position-bar-container">
      <div className="position-bar">
        <div className="bar-track">
          <div className="target-zone top-zone"></div>
          <div className="target-zone bottom-zone"></div>
          <div className={`position-indicator ${phase}`} style={{ bottom: `${position}%` }}>
            <div className="indicator-dot"></div>
          </div>
        </div>
        <div className="bar-labels">
          <span className="label-top">UP</span>
          <span className="label-bottom">DOWN</span>
        </div>
      </div>
    </div>
  );
};

export default PositionBar;
