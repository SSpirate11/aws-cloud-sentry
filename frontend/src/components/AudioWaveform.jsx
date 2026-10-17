import React from 'react';

export default function AudioWaveform({ isActive, isSpeaking, state }) {
  // Determine color based on state
  const getColor = () => {
    switch (state) {
      case 'AWAITING_CONFIRMATION':
        return '#f59e0b';
      case 'RESOLVED':
        return '#10b981';
      case 'INCIDENT_ACTIVE':
        return '#f43f5e';
      case 'THINKING':
        return '#00d2ff';
      default:
        return '#38bdf8';
    }
  };

  const color = getColor();
  const bars = [18, 42, 65, 85, 45, 95, 70, 30, 80, 100, 60, 40, 90, 75, 50, 85, 35, 60, 95, 40, 20];

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '3px',
      height: '32px',
      padding: '0 8px',
      opacity: isActive || isSpeaking ? 1 : 0.25,
      transition: 'opacity 0.3s ease'
    }}>
      {bars.map((defaultHeight, idx) => {
        // Calculate dynamic height based on animation
        const animDelay = (idx * 0.07).toFixed(2);
        const animDuration = (0.5 + (idx % 4) * 0.15).toFixed(2);
        
        return (
          <div
            key={idx}
            style={{
              width: '3px',
              height: isActive || isSpeaking ? `${defaultHeight}%` : '4px',
              backgroundColor: color,
              borderRadius: '2px',
              boxShadow: isActive || isSpeaking ? `0 0 8px ${color}` : 'none',
              animation: (isActive || isSpeaking) ? `waveform-bounce ${animDuration}s infinite ease-in-out alternate` : 'none',
              animationDelay: `${animDelay}s`,
              transition: 'height 0.2s ease, background-color 0.4s ease'
            }}
          />
        );
      })}
    </div>
  );
}
