import React from 'react';
import dumbbellImg from './components/dumbbell.png';
import './DumbbellBackground.css';

export default function DumbbellBackground() {
  const dumbbells = [];
  const rows = 40;
  const cols = 20;
  const spacing = 120;

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const offsetX = row % 2 === 0 ? 0 : spacing / 2;
      dumbbells.push({
        id: `${row}-${col}`,
        top: row * spacing - spacing * 2,
        left: col * spacing + offsetX,
      });
    }
  }

  return (
    <div className="dumbbell-background">
      <div className="dumbbell-container">
        {dumbbells.map((d) => (
          <img
            key={d.id}
            src={dumbbellImg}
            alt="dumbbell"
            className="dumbbell"
            style={{
              top: `${d.top}px`,
              left: `${d.left}px`,
            }}
          />
        ))}
      </div>

      <div
        className="dumbbell-container"
        style={{ transform: `translateY(${spacing}px)` }}
      >
        {dumbbells.map((d) => (
          <img
            key={`dup-${d.id}`}
            src={dumbbellImg}
            alt="dumbbell"
            className="dumbbell"
            style={{
              top: `${d.top}px`,
              left: `${d.left}px`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
