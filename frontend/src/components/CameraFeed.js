import React, { useRef, useEffect } from 'react';
import './CameraFeed.css';

const POSE_CONNECTIONS = [
  [11, 12], [11, 23], [12, 24], [23, 24],
  [11, 13], [13, 15], [12, 14], [14, 16],
  [23, 25], [25, 27], [24, 26], [26, 28],
];

const CameraFeed = ({ socket, landmarks }) => {
  const videoRef = useRef(null);
  const captureCanvasRef = useRef(null);
  const drawCanvasRef = useRef(null);
  const frameCountRef = useRef(0);

  useEffect(() => {
    const setupCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ 
          video: { 
            width: 640, 
            height: 480 
          } 
        });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
      } catch (err) {
      }
    };
    setupCamera();
  }, []);

  useEffect(() => {
    if (!socket) {
      return;
    }

    frameCountRef.current = 0;

    const interval = setInterval(() => {
      if (
        socket.connected &&
        videoRef.current &&
        videoRef.current.videoWidth > 0 &&
        videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA
      ) {
        const canvas = captureCanvasRef.current;
        const context = canvas.getContext('2d');

        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;

        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

        const frame = canvas.toDataURL('image/jpeg', 0.8);
        socket.emit('video_frame', { frame });
        
        frameCountRef.current++;
      }
    }, 100);

    return () => {
      clearInterval(interval);
    };
  }, [socket]);

  useEffect(() => {
    if (landmarks && landmarks.length > 0 && videoRef.current) {
      const canvas = drawCanvasRef.current;
      const ctx = canvas.getContext('2d');

      canvas.width = videoRef.current.videoWidth;
      canvas.height = videoRef.current.videoHeight;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.strokeStyle = '#a855f7';
      ctx.lineWidth = 3;

      POSE_CONNECTIONS.forEach(([start, end]) => {
        const s = landmarks[start];
        const e = landmarks[end];
        if (s && e && s.visibility > 0.5 && e.visibility > 0.5) {
          ctx.beginPath();
          ctx.moveTo(s.x * canvas.width, s.y * canvas.height);
          ctx.lineTo(e.x * canvas.width, e.y * canvas.height);
          ctx.stroke();
        }
      });

      ctx.fillStyle = '#c084fc';
      landmarks.forEach(l => {
        if (l.visibility > 0.5) {
          ctx.beginPath();
          ctx.arc(l.x * canvas.width, l.y * canvas.height, 5, 0, 2 * Math.PI);
          ctx.fill();
        }
      });
    }
  }, [landmarks]);

  return (
    <div className="camera-wrapper">
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="camera-video"
      />
      <canvas ref={captureCanvasRef} style={{ display: 'none' }} />
      <canvas
        ref={drawCanvasRef}
        className="camera-overlay"
      />
    </div>
  );
};

export default CameraFeed;
