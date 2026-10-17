import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck, Activity, Cpu, HardDrive, Terminal, Clock, Sparkles } from 'lucide-react';

export default function DisplayCard({ card, state }) {
  if (!card) return null;

  const isAlarm = state === 'INCIDENT_ACTIVE';
  const isAwaiting = state === 'AWAITING_CONFIRMATION';
  const isResolved = state === 'RESOLVED';

  return (
    <div className="glass-panel" style={{
      borderRadius: '16px',
      padding: '1.5rem',
      margin: '1rem 0',
      borderLeft: `4px solid ${
        isAwaiting ? '#f59e0b' : isResolved ? '#10b981' : isAlarm ? '#ef4444' : '#38bdf8'
      }`
    }}>
      {/* Header with Title and Badge */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#94a3b8' }}>
              AWS Echo Show Ambient Display
            </span>
            {card.service && (
              <span style={{ fontSize: '0.75rem', padding: '0.1rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1' }}>
                {card.cluster || 'us-east-1'}
              </span>
            )}
          </div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: '600', margin: '0', color: '#f8fafc' }}>
            {card.title}
          </h2>
        </div>

        {/* Status Badge */}
        <div style={{
          padding: '0.35rem 0.85rem',
          borderRadius: '9999px',
          fontSize: '0.75rem',
          fontWeight: '700',
          letterSpacing: '0.05em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          background: isAwaiting ? 'rgba(245, 158, 11, 0.2)' : isResolved ? 'rgba(16, 185, 129, 0.2)' : isAlarm ? 'rgba(239, 68, 68, 0.2)' : 'rgba(56, 189, 248, 0.2)',
          color: isAwaiting ? '#fbbf24' : isResolved ? '#34d399' : isAlarm ? '#f87171' : '#38bdf8',
          border: `1px solid ${isAwaiting ? '#f59e0b' : isResolved ? '#10b981' : isAlarm ? '#ef4444' : '#38bdf8'}`
        }}>
          {isAwaiting && <AlertTriangle size={14} />}
          {isResolved && <CheckCircle2 size={14} />}
          {isAlarm && <AlertTriangle size={14} />}
          {card.badge}
        </div>
      </div>

      {/* CloudWatch Telemetry Grid */}
      {card.metrics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          marginTop: '1.25rem'
        }}>
          {card.metrics.MemoryUtilization && (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                <HardDrive size={14} /> Memory Util
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: parseFloat(card.metrics.MemoryUtilization) > 90 ? '#f87171' : '#34d399', marginTop: '0.2rem' }}>
                {card.metrics.MemoryUtilization}
              </div>
            </div>
          )}
          {card.metrics.CPUUtilization && (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                <Cpu size={14} /> CPU Util
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#38bdf8', marginTop: '0.2rem' }}>
                {card.metrics.CPUUtilization}
              </div>
            </div>
          )}
          {card.metrics.ActiveConnections && (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                <Activity size={14} /> Connections
              </div>
              <div style={{ fontSize: '1.2rem', fontWeight: '700', color: '#cbd5e1', marginTop: '0.2rem' }}>
                {card.metrics.ActiveConnections}
              </div>
            </div>
          )}
          {card.current_revision && (
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#94a3b8', fontSize: '0.75rem' }}>
                <Clock size={14} /> ECS Task Rev
              </div>
              <div style={{ fontSize: '1.1rem', fontWeight: '700', color: '#e2e8f0', marginTop: '0.2rem', fontFamily: 'monospace' }}>
                {card.current_revision}
              </div>
            </div>
          )}
        </div>
      )}

      {/* AWS Bedrock Automated Root Cause Analysis Box */}
      {card.bedrock_diagnosis && (
        <div style={{
          marginTop: '1.25rem',
          padding: '1rem',
          borderRadius: '10px',
          background: 'rgba(88, 28, 135, 0.18)',
          border: '1px solid rgba(168, 85, 247, 0.35)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#d8b4fe', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.4rem' }}>
            <Sparkles size={16} /> AWS Bedrock Automated Diagnostics (Claude 3.5 Sonnet)
          </div>
          <pre style={{
            margin: '0',
            fontSize: '0.8rem',
            lineHeight: '1.5',
            color: '#f3e8ff',
            whiteSpace: 'pre-wrap',
            fontFamily: 'Inter, sans-serif'
          }}>
            {card.bedrock_diagnosis}
          </pre>
        </div>
      )}

      {/* Voice 2FA Authorization Banner */}
      {isAwaiting && (
        <div style={{
          marginTop: '1.25rem',
          padding: '1rem',
          borderRadius: '10px',
          background: 'rgba(245, 158, 11, 0.15)',
          border: '1px solid rgba(245, 158, 11, 0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem'
        }}>
          <ShieldCheck size={32} color="#fbbf24" style={{ flexShrink: 0 }} />
          <div>
            <div style={{ fontWeight: '600', color: '#fbbf24', fontSize: '0.95rem' }}>
              Voice 2FA Confirmation Required
            </div>
            <div style={{ color: '#fed7aa', fontSize: '0.85rem', marginTop: '0.15rem' }}>
              Target: Rollback <code>{card.service}</code> to <code>{card.target_revision}</code>.
            </div>
            <div style={{ fontWeight: '700', color: '#fff', fontSize: '0.9rem', marginTop: '0.35rem' }}>
              👉 Speak into mic: <span style={{ color: '#fbbf24', textDecoration: 'underline' }}>"Confirm rollback"</span> or click the Confirm button below.
            </div>
          </div>
        </div>
      )}

      {/* Recent CloudWatch Stack Trace Snippet */}
      {card.logs_preview && card.logs_preview.length > 0 && (
        <div style={{ marginTop: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#94a3b8', fontSize: '0.75rem', marginBottom: '0.35rem' }}>
            <Terminal size={12} /> CloudWatch Log Stream /ecs/{card.service}
          </div>
          <div style={{
            background: '#020617',
            padding: '0.75rem',
            borderRadius: '6px',
            fontSize: '0.72rem',
            fontFamily: 'JetBrains Mono, monospace',
            color: '#f87171',
            lineHeight: '1.4',
            overflowX: 'auto',
            border: '1px solid rgba(255,255,255,0.05)'
          }}>
            {card.logs_preview.map((line, idx) => (
              <div key={idx} style={{ marginBottom: '0.2rem' }}>{line}</div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

