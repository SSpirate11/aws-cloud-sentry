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
      borderRadius: '16px',
      padding: '1.4rem',
      borderLeft: `4px solid ${
        isAwaiting ? '#f59e0b' : isResolved ? '#10b981' : isAlarm ? '#f43f5e' : '#00d2ff'
      }`,
      background: 'rgba(11, 17, 30, 0.85)',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Echo Show Header with Service & Environment Breadcrumbs */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.75rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.35rem' }}>
            <span style={{ fontSize: '0.68rem', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b', fontWeight: '700' }}>
              Amazon Echo Show 10 • Smart Display Card
            </span>
            <span style={{
              fontSize: '0.68rem',
              padding: '0.1rem 0.45rem',
              borderRadius: '4px',
              background: 'rgba(255,255,255,0.06)',
              color: '#94a3b8',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              arn:aws:ecs:us-east-1:prod-cluster
            </span>
          </div>

          <h2 style={{ fontSize: '1.25rem', fontWeight: '700', margin: '0', color: '#f8fafc', letterSpacing: '-0.015em' }}>
            {card.title}
          </h2>
          
          <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '0.2rem' }}>
            {card.status_message}
          </div>
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
          gap: '0.4rem',
          background: isAwaiting ? 'rgba(245, 158, 11, 0.15)' : isResolved ? 'rgba(16, 185, 129, 0.15)' : isAlarm ? 'rgba(244, 63, 94, 0.15)' : 'rgba(0, 210, 255, 0.15)',
          color: isAwaiting ? '#fbbf24' : isResolved ? '#34d399' : isAlarm ? '#fb7185' : '#38bdf8',
          border: `1px solid ${isAwaiting ? '#f59e0b' : isResolved ? '#10b981' : isAlarm ? '#f43f5e' : '#00d2ff'}`
        }}>
          {isAwaiting && <ShieldAlert size={14} />}
          {isResolved && <CheckCircle2 size={14} />}
          {isAlarm && <AlertTriangle size={14} />}
          {card.badge || 'STANDBY'}
        </div>
      </div>

      {/* Real-time Interactive SVG CloudWatch Metric Graph */}
      <MetricChart state={state} currentRev={card.current_revision} />

      {/* CloudWatch Key Telemetry Indicators */}
      {card.metrics && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
          gap: '0.75rem',
          marginTop: '1rem'
        }}>
          <div style={{ background: 'rgba(5, 8, 16, 0.65)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase' }}>
              <HardDrive size={13} /> Memory Peak
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: parseFloat(card.metrics.MemoryUtilization) > 90 ? '#fb7185' : '#34d399', marginTop: '0.2rem', fontFamily: 'JetBrains Mono' }}>
              {card.metrics.MemoryUtilization}
            </div>
          </div>

          <div style={{ background: 'rgba(5, 8, 16, 0.65)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase' }}>
              <Cpu size={13} /> CPU Load
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#38bdf8', marginTop: '0.2rem', fontFamily: 'JetBrains Mono' }}>
              {card.metrics.CPUUtilization || '24.1%'}
            </div>
          </div>

          <div style={{ background: 'rgba(5, 8, 16, 0.65)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase' }}>
              <Activity size={13} /> Active Conns
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#e2e8f0', marginTop: '0.2rem', fontFamily: 'JetBrains Mono' }}>
              {card.metrics.ActiveConnections || '1,420'}
            </div>
          </div>

          <div style={{ background: 'rgba(5, 8, 16, 0.65)', padding: '0.75rem', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#64748b', fontSize: '0.72rem', fontWeight: '600', textTransform: 'uppercase' }}>
              <Clock size={13} /> Active Task Rev
            </div>
            <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#f1f5f9', marginTop: '0.2rem', fontFamily: 'JetBrains Mono' }}>
              {card.current_revision || 'Rev 41'}
            </div>
          </div>
        </div>
      )}

      {/* AWS Bedrock Automated Root Cause Analysis Box */}
      {card.bedrock_diagnosis && (
        <div style={{
          marginTop: '1rem',
          padding: '1rem 1.15rem',
          borderRadius: '12px',
          background: 'radial-gradient(ellipse at top left, rgba(147, 51, 234, 0.15), rgba(76, 29, 149, 0.08))',
          border: '1px solid rgba(168, 85, 247, 0.35)',
          boxShadow: '0 4px 20px rgba(147, 51, 234, 0.1)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', color: '#c084fc', fontSize: '0.8rem', fontWeight: '700' }}>
              <Sparkles size={16} /> AWS Bedrock Root Cause Engine (Anthropic Claude 3.5 Sonnet)
            </div>
            <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(168,85,247,0.2)', color: '#e9d5ff', fontWeight: '600' }}>
              Model: claude-3-5-sonnet-20241022
            </span>
          </div>
          <div style={{
            fontSize: '0.82rem',
            lineHeight: '1.55',
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
          marginTop: '1rem',
          padding: '1.15rem',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.18), rgba(217, 119, 6, 0.08))',
          border: '1px solid rgba(245, 158, 11, 0.5)',
          display: 'flex',
          alignItems: 'center',
          gap: '1rem',
          boxShadow: '0 0 25px rgba(245, 158, 11, 0.2)'
        }}>
          <div style={{
            width: '44px',
            height: '44px',
            borderRadius: '50%',
            background: 'rgba(245, 158, 11, 0.2)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            border: '1px solid rgba(245, 158, 11, 0.4)'
          }}>
            <ShieldCheck size={24} color="#fbbf24" />
          </div>

          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: '700', color: '#fbbf24', fontSize: '0.92rem' }}>
                VOICE 2FA AUTHORIZATION GATE
              </span>
              <span style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', borderRadius: '4px', background: 'rgba(245,158,11,0.25)', color: '#fef3c7', fontWeight: '700' }}>
                ACTION: ECS SERVICE MUTATION
              </span>
            </div>

            <div style={{ color: '#fed7aa', fontSize: '0.82rem', marginTop: '0.2rem' }}>
              Target: Rollback <strong>{card.service}</strong> from <code>{card.current_revision}</code> to <code>{card.target_revision}</code>.
            </div>

            <div style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '0.5rem',
              marginTop: '0.45rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '6px',
              background: 'rgba(0, 0, 0, 0.4)',
              border: '1px dashed rgba(245, 158, 11, 0.6)',
              fontSize: '0.82rem',
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
        <div style={{ marginTop: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#64748b', fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase' }}>
              <Terminal size={13} /> CloudWatch Log Stream (/ecs/{card.service})
            </div>
            <span style={{ fontSize: '0.68rem', color: '#f87171', fontFamily: 'JetBrains Mono', fontWeight: '600' }}>
              Kernel OOMKill Triggered
            </span>
          </div>
          
          <div style={{
            background: '#040711',
            padding: '0.85rem 1rem',
            borderRadius: '8px',
            fontSize: '0.74rem',
            fontFamily: 'JetBrains Mono, monospace',
            color: '#fca5a5',
            lineHeight: '1.5',
            overflowX: 'auto',
            border: '1px solid rgba(255,255,255,0.06)'
          }}>
            {card.logs_preview.map((line, idx) => (
              <div key={idx} style={{ marginBottom: '0.2rem' }}>
                <span style={{ color: '#64748b', marginRight: '0.5rem' }}>{idx + 1}</span>
                {line}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
