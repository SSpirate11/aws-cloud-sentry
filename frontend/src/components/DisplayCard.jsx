import React from 'react';
import { AlertTriangle, CheckCircle2, ShieldCheck, Activity, Cpu, HardDrive, Terminal, Clock, Sparkles, Server, Check, ArrowRight, ShieldAlert } from 'lucide-react';
import MetricChart from './MetricChart';

export default function DisplayCard({ card, state }) {
  if (!card) return null;

  const isAlarm = state === 'INCIDENT_ACTIVE';
  const isAwaiting = state === 'AWAITING_CONFIRMATION';
  const isResolved = state === 'RESOLVED';

  return (
    <div className="glass-panel" style={{
      borderRadius: '12px',
      padding: '0.65rem 0.85rem',
      borderLeft: `4px solid ${
        isAwaiting ? '#f59e0b' : isResolved ? '#10b981' : isAlarm ? '#f43f5e' : '#00d2ff'
      }`,
      background: 'rgba(11, 17, 30, 0.85)',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)'
    }}>
      {/* Echo Show Header with Service & Environment Breadcrumbs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginBottom: '0.15rem' }}>
            <span style={{ fontSize: '0.62rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: '700' }}>
              Echo Show 10 • Smart Display
            </span>
            <span style={{
              fontSize: '0.62rem',
              padding: '1px 4px',
              borderRadius: '3px',
              background: 'rgba(255,255,255,0.06)',
              color: '#94a3b8',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              arn:aws:ecs:us-east-1:prod
            </span>
          </div>

          <h2 style={{ fontSize: '1.05rem', fontWeight: '700', margin: '0', color: '#f8fafc', letterSpacing: '-0.015em' }}>
            {card.title}
          </h2>
          
          <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '0.1rem' }}>
            {card.status_message}
          </div>
        </div>

        {/* Status Badge */}
        <div style={{
          padding: '0.2rem 0.6rem',
          borderRadius: '9999px',
          fontSize: '0.68rem',
          fontWeight: '700',
          letterSpacing: '0.04em',
          display: 'flex',
          alignItems: 'center',
          gap: '0.3rem',
          background: isAwaiting ? 'rgba(245, 158, 11, 0.15)' : isResolved ? 'rgba(16, 185, 129, 0.15)' : isAlarm ? 'rgba(244, 63, 94, 0.15)' : 'rgba(0, 210, 255, 0.15)',
          color: isAwaiting ? '#fbbf24' : isResolved ? '#34d399' : isAlarm ? '#fb7185' : '#38bdf8',
          border: `1px solid ${isAwaiting ? '#f59e0b' : isResolved ? '#10b981' : isAlarm ? '#f43f5e' : '#00d2ff'}`
        }}>
          {isAwaiting && <ShieldAlert size={12} />}
          {isResolved && <CheckCircle2 size={12} />}
          {isAlarm && <AlertTriangle size={12} />}
          {card.badge || 'STANDBY'}
        </div>
      </div>

      {/* Real-time Interactive SVG CloudWatch Metric Graph */}
      <MetricChart state={state} currentRev={card.current_revision} />

      {/* CloudWatch Key Telemetry Indicators */}
      {card.metrics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '0.35rem',
          marginTop: '0.4rem'
        }}>
          <div style={{ background: 'rgba(5, 8, 16, 0.65)', padding: '0.35rem 0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.62rem', fontWeight: '600', textTransform: 'uppercase' }}>
              <HardDrive size={11} /> Memory Peak
            </div>
            <div style={{ fontSize: '0.98rem', fontWeight: '800', color: parseFloat(card.metrics.MemoryUtilization) > 90 ? '#fb7185' : '#34d399', marginTop: '0.1rem', fontFamily: 'JetBrains Mono' }}>
              {card.metrics.MemoryUtilization}
            </div>
          </div>

          <div style={{ background: 'rgba(5, 8, 16, 0.65)', padding: '0.35rem 0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.62rem', fontWeight: '600', textTransform: 'uppercase' }}>
              <Cpu size={11} /> CPU Load
            </div>
            <div style={{ fontSize: '0.98rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.1rem', fontFamily: 'JetBrains Mono' }}>
              {card.metrics.CPUUtilization || '24.1%'}
            </div>
          </div>

          <div style={{ background: 'rgba(5, 8, 16, 0.65)', padding: '0.35rem 0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.62rem', fontWeight: '600', textTransform: 'uppercase' }}>
              <Activity size={11} /> Active Conns
            </div>
            <div style={{ fontSize: '0.98rem', fontWeight: '800', color: '#e2e8f0', marginTop: '0.1rem', fontFamily: 'JetBrains Mono' }}>
              {card.metrics.ActiveConnections || '1,420'}
            </div>
          </div>

          <div style={{ background: 'rgba(5, 8, 16, 0.65)', padding: '0.35rem 0.5rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem', color: '#64748b', fontSize: '0.62rem', fontWeight: '600', textTransform: 'uppercase' }}>
              <Clock size={11} /> Task Rev
            </div>
            <div style={{ fontSize: '0.98rem', fontWeight: '800', color: '#f1f5f9', marginTop: '0.1rem', fontFamily: 'JetBrains Mono' }}>
              {card.current_revision || 'Rev 41'}
            </div>
          </div>
        </div>
      )}

      {/* AWS Bedrock Automated Root Cause Analysis Box */}
      {card.bedrock_diagnosis && (
        <div style={{
          marginTop: '0.4rem',
          padding: '0.45rem 0.65rem',
          borderRadius: '8px',
          background: 'radial-gradient(ellipse at top left, rgba(147, 51, 234, 0.15), rgba(76, 29, 149, 0.08))',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          boxShadow: '0 2px 12px rgba(147, 51, 234, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#c084fc', fontSize: '0.72rem', fontWeight: '700' }}>
              <Sparkles size={13} /> AWS Bedrock RCA (Claude 3.5 Sonnet)
            </div>
            <span style={{ fontSize: '0.62rem', padding: '1px 4px', borderRadius: '3px', background: 'rgba(168,85,247,0.2)', color: '#e9d5ff', fontWeight: '600' }}>
              claude-3-5-sonnet
            </span>
          </div>
          <div style={{
            fontSize: '0.74rem',
            lineHeight: '1.4',
            color: '#f3e8ff',
            fontFamily: 'Inter, sans-serif'
          }}>
            {card.bedrock_diagnosis}
          </div>
        </div>
      )}

      {/* Voice 2FA Authorization Banner */}
      {isAwaiting && (
        <div style={{
          marginTop: '0.4rem',
          padding: '0.45rem 0.65rem',
          borderRadius: '8px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.08))',
          border: '1px solid rgba(245, 158, 11, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.6rem',
          boxShadow: '0 0 16px rgba(245, 158, 11, 0.18)'
        }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid rgba(245, 158, 11, 0.4)'
          }}>
            <ShieldCheck size={18} color="#fbbf24" />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <span style={{ fontWeight: '700', color: '#fbbf24', fontSize: '0.78rem' }}>
                VOICE 2FA AUTHORIZATION GATE
              </span>
              <span style={{ fontSize: '0.62rem', padding: '1px 4px', borderRadius: '3px', background: 'rgba(245,158,11,0.25)', color: '#fef3c7', fontWeight: '700' }}>
                MUTATION INTERLOCK
              </span>
            </div>

            <div style={{ color: '#fed7aa', fontSize: '0.72rem', marginTop: '0.1rem' }}>
              Target: Rollback <strong>{card.service}</strong> to <code>{card.target_revision}</code>.
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.35rem',
              marginTop: '0.25rem',
              padding: '0.2rem 0.55rem',
              borderRadius: '4px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px dashed rgba(245, 158, 11, 0.6)',
              fontSize: '0.74rem',
              color: '#fff'
            }}>
              <span>👉 Speak into Alexa:</span>
              <span style={{ color: '#fbbf24', fontWeight: '700' }}>"Confirm rollback"</span>
            </div>
          </div>
        </div>
      )}

      {/* CloudWatch Stack Trace Snippet */}
      {card.logs_preview && card.logs_preview.length > 0 && (
        <div style={{ marginTop: '0.4rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase' }}>
              <Terminal size={12} /> Log Stream (/ecs/{card.service})
            </div>
            <span style={{ fontSize: '0.62rem', color: '#f87171', fontFamily: 'JetBrains Mono', fontWeight: '600' }}>
              Kernel OOMKill Triggered
            </span>
          </div>
          
          <div style={{
            background: '#040711',
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            fontSize: '0.68rem',
            fontFamily: 'JetBrains Mono, monospace',
            color: '#fca5a5',
            lineHeight: '1.4',
            maxHeight: '65px',
            overflowY: 'auto',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            {card.logs_preview.map((line, idx) => (
              <div key={idx} style={{ marginBottom: '0.15rem' }}>
                <span style={{ color: '#64748b', marginRight: '0.35rem' }}>{idx + 1}</span>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
