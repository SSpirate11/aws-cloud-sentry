import React from 'react';
import { Mic, MicOff, Volume2, ShieldAlert, CheckCircle, Brain, Radio } from 'lucide-react';

export default function EchoRing({ state, isListening, isSpeaking, onToggleMic }) {
  // Determine state class for ring styling
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

  const getStatusLabel = () => {
    if (isListening) return 'Listening to you...';
    if (isSpeaking) return 'Alexa+ Speaking...';
    switch (state) {
      case 'THINKING':
        return 'MCP Agent Reasoning & Querying AWS...';
      case 'AWAITING_CONFIRMATION':
        return '⚠️ Voice 2FA Authorization Required';
      case 'RESOLVED':
        return '✅ Incident Remediated (Healthy)';
      case 'INCIDENT_ACTIVE':
        return '🚨 Sev-2 CloudWatch Alarm Active';
      default:
        return 'Alexa+ Standby (Say "Alexa...")';
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '1.5rem 0' }}>
      {/* Outer Pulse Ring */}
      <div 
        onClick={onToggleMic}
        className={`alexa-orb ${getStateClass()}`}
        style={{
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          userSelect: 'none'
        }}
        title="Click to toggle microphone"
      >
        {/* Core Center Icon */}
        <div style={{
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          backgroundColor: '#0f172a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          border: '2px solid rgba(255, 255, 255, 0.2)',
          boxShadow: 'inset 0 2px 8px rgba(0,0,0,0.6)'
        }}>
          {isListening ? (
            <Radio size={36} color="#00d2ff" style={{ animation: 'pulse-fast 1s infinite' }} />
          ) : isSpeaking ? (
            <Volume2 size={36} color="#38bdf8" />
          ) : state === 'AWAITING_CONFIRMATION' ? (
            <ShieldAlert size={36} color="#f59e0b" />
          ) : state === 'RESOLVED' ? (
            <CheckCircle size={36} color="#10b981" />
          ) : state === 'THINKING' ? (
            <Brain size={36} color="#c084fc" />
          ) : (
            <Mic size={36} color="#94a3b8" />
          )}
        </div>
      </div>

      {/* Status indicator pill */}
      <div style={{
        marginTop: '1.25rem',
        padding: '0.4rem 1rem',
        borderRadius: '9999px',
        fontSize: '0.85rem',
        fontWeight: '500',
        letterSpacing: '0.025em',
        backgroundColor: state === 'AWAITING_CONFIRMATION' 
          ? 'rgba(245, 158, 11, 0.15)' 
          : state === 'RESOLVED' 
          ? 'rgba(16, 185, 129, 0.15)'
          : state === 'INCIDENT_ACTIVE'
          ? 'rgba(239, 68, 68, 0.15)'
          : 'rgba(56, 189, 248, 0.12)',
        border: `1px solid ${
          state === 'AWAITING_CONFIRMATION'
            ? 'rgba(245, 158, 11, 0.4)'
            : state === 'RESOLVED'
            ? 'rgba(16, 185, 129, 0.4)'
            : state === 'INCIDENT_ACTIVE'
            ? 'rgba(239, 68, 68, 0.4)'
            : 'rgba(56, 189, 248, 0.3)'
        }`,
        color: state === 'AWAITING_CONFIRMATION'
          ? '#fbbf24'
          : state === 'RESOLVED'
          ? '#34d399'
          : state === 'INCIDENT_ACTIVE'
          ? '#f87171'
          : '#38bdf8',
        display: 'flex',
        alignItems: 'center',
        gap: '0.5rem'
      }}>
        <span style={{
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          display: 'inline-block'
        }}></span>
        {getStatusLabel()}
      </div>
    </div>
  );
}
