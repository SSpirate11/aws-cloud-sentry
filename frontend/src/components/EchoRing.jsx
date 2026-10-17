import React from 'react';
import { Mic, Volume2, ShieldAlert, CheckCircle, Radio, Sparkles } from 'lucide-react';

export default function EchoRing({ state, isListening, isSpeaking, onToggleMic }) {
  // Determine state class for authentic Echo LED light ring
  const getStateClass = () => {
    switch (state) {
      case 'LISTENING':
        return 'listening';
      case 'THINKING':
        return 'thinking';
      case 'AWAITING_CONFIRMATION':
        return 'awaiting_confirmation';
      case 'RESOLVED':
        return 'resolved';
      case 'INCIDENT_ACTIVE':
        return 'incident_active';
      default:
        return 'standby';
    }
  };

  const stateClass = getStateClass();

  const getStatusLabel = () => {
    if (isSpeaking) return 'Alexa+ Speaking...';
    if (state === 'THINKING') return 'Alexa+ Reasoning via MCP...';
    if (state === 'LISTENING') return 'Listening to you...';
    if (state === 'AWAITING_CONFIRMATION') return '⚠️ Voice 2FA Authorization Required';
    if (state === 'RESOLVED') return '✅ Incident Remediated (Healthy)';
    if (state === 'INCIDENT_ACTIVE') return '🚨 Sev-2 CloudWatch Alarm Active';
    return 'Alexa+ Ready (Say "Alexa" or Tap)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.25rem 0' }}>
      
      {/* Authentic Amazon Echo Light Ring Assembly */}
      <div 
        onClick={onToggleMic}
        className={`echo-ring-wrapper echo-state-${stateClass}`}
        title="Tap to speak with Alexa+"
      >
        {/* 1. Outer Neon Ambient Diffusion Bloom */}
        <div className="echo-bloom" />

        {/* 2. Authentic Rotating/Pulsing LED Conic Gradient Ring */}
        <div className="echo-light-ring" />

        {/* 3. Matte Acoustic Inner Core (Echo Speaker Cap) */}
        <div className="echo-inner-core">
          {/* Subtle acoustic micro-perforation speaker grille */}
          <div className="echo-speaker-grille" />

          {/* Center Alexa Glyph / Status Icon */}
          <div style={{ position: 'relative', zIndex: 5, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {isSpeaking ? (
              <Volume2 size={40} color="#38bdf8" style={{ filter: 'drop-shadow(0 0 10px #38bdf8)' }} />
            ) : state === 'THINKING' ? (
              <Sparkles size={40} color="#00d2ff" style={{ filter: 'drop-shadow(0 0 12px #00d2ff)', animation: 'spin-glow 2s infinite linear' }} />
            ) : state === 'LISTENING' ? (
              <Radio size={40} color="#00d2ff" style={{ filter: 'drop-shadow(0 0 10px #00d2ff)', animation: 'pulse-fast 1s infinite' }} />
            ) : state === 'AWAITING_CONFIRMATION' ? (
              <ShieldAlert size={40} color="#ffb700" style={{ filter: 'drop-shadow(0 0 12px #ff9900)' }} />
            ) : state === 'RESOLVED' ? (
              <CheckCircle size={40} color="#00e676" style={{ filter: 'drop-shadow(0 0 12px #00e676)' }} />
            ) : (
              <Mic size={38} color="#94a3b8" />
            )}
          </div>
        </div>
      </div>

      {/* Status indicator badge */}
      <div style={{
        marginTop: '1.4rem',
        padding: '0.45rem 1.1rem',
        borderRadius: '9999px',
        fontSize: '0.85rem',
        fontWeight: '600',
        letterSpacing: '0.025em',
        backgroundColor: state === 'AWAITING_CONFIRMATION' 
          ? 'rgba(255, 153, 0, 0.15)' 
          : state === 'RESOLVED' 
          ? 'rgba(0, 230, 118, 0.15)'
          : state === 'INCIDENT_ACTIVE'
          ? 'rgba(255, 51, 75, 0.15)'
          : state === 'THINKING'
          ? 'rgba(0, 210, 255, 0.15)'
          : 'rgba(56, 189, 248, 0.12)',
        border: `1px solid ${
          state === 'AWAITING_CONFIRMATION'
            ? 'rgba(255, 153, 0, 0.45)'
            : state === 'RESOLVED'
            ? 'rgba(0, 230, 118, 0.45)'
            : state === 'INCIDENT_ACTIVE'
            ? 'rgba(255, 51, 75, 0.45)'
            : state === 'THINKING'
            ? 'rgba(0, 210, 255, 0.45)'
            : 'rgba(56, 189, 248, 0.3)'
        }`,
        color: state === 'AWAITING_CONFIRMATION'
          ? '#ffb700'
          : state === 'RESOLVED'
          ? '#00e676'
          : state === 'INCIDENT_ACTIVE'
          ? '#ff4d61'
          : state === 'THINKING'
          ? '#00d2ff'
          : '#38bdf8',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem',
        boxShadow: '0 4px 12px rgba(0,0,0,0.3)'
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          display: 'inline-block',
          boxShadow: '0 0 8px currentColor'
        }}></span>
        {getStatusLabel()}
      </div>
    </div>
  );
}
