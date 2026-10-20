import React, { useEffect, useState } from 'react';
import {
  BellRing, FileText, Cpu, GitBranch, Gauge,
  RotateCcw, Lock, Unlock, CheckCircle2, ArrowDown,
  Sparkles, FileCode2
} from 'lucide-react';

export default function LiveFlowchart({ toolTraces = [], state = 'STANDBY' }) {
  const [completedTools, setCompletedTools] = useState({});

  useEffect(() => {
    if (state === 'STANDBY' && (!toolTraces || toolTraces.length === 0)) {
      setCompletedTools({});
      return;
    }
    if (toolTraces && toolTraces.length > 0) {
      setCompletedTools(prev => {
        const next = { ...prev };
        toolTraces.forEach(t => {
          if (t.tool === 'execute_rollback' && t.status === 'SAFETY_GATE_TRIGGERED') {
            next['safety_gate'] = true;
          } else if (t.tool === 'execute_rollback' && t.status === 'SUCCESS') {
            next['safety_gate'] = true;
            next['execute_rollback'] = true;
          } else if (t.tool) {
            next[t.tool] = true;
          }
        });
        return next;
      });
    }
  }, [toolTraces, state]);

  const currentTools = new Set(
    (toolTraces || []).map(t =>
      t.tool === 'execute_rollback' && t.status === 'SAFETY_GATE_TRIGGERED'
        ? 'safety_gate'
        : t.tool
    )
  );

  const isDone = (key) => Boolean(completedTools[key]);
  const isCurrent = (key) => currentTools.has(key);

  const renderNode = ({ step, title, subtitle, code, icon: Icon, done, current, color = '#00d2ff', badgeText }) => {
    const activeBorder = current
      ? color
      : done
      ? 'rgba(16, 185, 129, 0.45)'
      : 'rgba(255, 255, 255, 0.08)';
    const bg = current
      ? `${color}22`
      : done
      ? 'rgba(16, 185, 129, 0.10)'
      : 'rgba(15, 23, 42, 0.6)';
    const iconColor = current ? color : done ? '#34d399' : '#94a3b8';

    return (
      <div style={{
        background: bg,
        border: `1px solid ${activeBorder}`,
        borderRadius: '8px',
        padding: '0.32rem 0.42rem',
        boxShadow: current ? `0 0 12px ${color}40` : done ? '0 0 6px rgba(16, 185, 129, 0.12)' : 'none',
        transition: 'all 0.25s ease'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.12rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.22rem', color: iconColor, fontSize: '0.63rem', fontWeight: '700' }}>
            <Icon size={11} />
            <span>{step}. {title}</span>
          </div>
          {(current || done) && (
            <span style={{
              fontSize: '0.52rem',
              padding: '1px 3px',
              borderRadius: '2px',
              background: current ? `${color}33` : 'rgba(16, 185, 129, 0.22)',
              color: current ? '#f8fafc' : '#6ee7b7',
              fontWeight: '700'
            }}>
              {current ? (badgeText || 'ACTIVE') : 'DONE'}
            </span>
          )}
        </div>
        <div style={{ fontSize: '0.66rem', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {subtitle}
        </div>
        <div style={{ fontSize: '0.56rem', color: current ? color : done ? '#6ee7b7' : '#64748b', fontFamily: 'JetBrains Mono, monospace', marginTop: '1px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {code}
        </div>
      </div>
    );
  };

  const hasGate = isDone('safety_gate') || state === 'AWAITING_CONFIRMATION';
  const hasRollback = isDone('execute_rollback') || state === 'RESOLVED';
  const hasFixOrPm = isDone('propose_code_fix') || isDone('generate_incident_postmortem');
  const currentFixOrPm = isCurrent('propose_code_fix') || isCurrent('generate_incident_postmortem');

  return (
    <div style={{
      background: 'rgba(5, 9, 18, 0.95)',
      borderRadius: '10px',
      padding: '0.45rem 0.6rem',
      border: '1px solid rgba(0, 210, 255, 0.15)',
      marginBottom: '0.35rem',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Flowchart Title & Legend Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.32rem',
        paddingBottom: '0.22rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        flexWrap: 'wrap',
        gap: '0.3rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
          <Sparkles size={12} color="#00d2ff" />
          <span style={{ fontSize: '0.68rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#f8fafc' }}>
            Live MCP Incident Workflow (Tracks Every Command)
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.6rem', color: '#64748b' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00d2ff' }} />
            Current Step
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '3px' }}>
            <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#10b981' }} />
            Completed
          </span>
        </div>
      </div>

      {/* PHASE 1: TRIAGE, RCA & CHANGE CORRELATION */}
      <div style={{ marginBottom: '0.22rem' }}>
        <div style={{ fontSize: '0.58rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.2rem', letterSpacing: '0.04em' }}>
          Phase 1: Triage, Root Cause & Blameless COE Correlation
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.28rem', alignItems: 'center' }}>
          {renderNode({
            step: 1,
            title: 'Alarms',
            subtitle: isDone('get_active_alarms') ? 'Sev-2 Active' : 'CloudWatch',
            code: 'get_active_alarms',
            icon: BellRing,
            done: isDone('get_active_alarms'),
            current: isCurrent('get_active_alarms'),
            color: '#f43f5e',
            badgeText: 'ALARM'
          })}
          {renderNode({
            step: 2,
            title: 'Logs',
            subtitle: isDone('fetch_error_logs') ? 'OOMKill 137' : 'Container Logs',
            code: 'fetch_error_logs',
            icon: FileText,
            done: isDone('fetch_error_logs'),
            current: isCurrent('fetch_error_logs'),
            color: '#38bdf8',
            badgeText: 'LOGS'
          })}
          {renderNode({
            step: 3,
            title: 'Diagnose',
            subtitle: isDone('diagnose_incident') ? 'Rev 42 Leak' : 'Bedrock RCA',
            code: 'diagnose_incident',
            icon: Cpu,
            done: isDone('diagnose_incident'),
            current: isCurrent('diagnose_incident'),
            color: '#c084fc',
            badgeText: 'RCA'
          })}
          {renderNode({
            step: 4,
            title: 'COE Audit',
            subtitle: isDone('trace_deployment_culprit') ? 'Commit e8f41c' : '5-Whys & Git',
            code: 'trace_culprit',
            icon: GitBranch,
            done: isDone('trace_deployment_culprit'),
            current: isCurrent('trace_deployment_culprit'),
            color: '#f59e0b',
            badgeText: '5-WHYS'
          })}
        </div>
      </div>

      {/* Transition Conduit */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', margin: '0.18rem 0' }}>
        <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.25rem',
          fontSize: '0.56rem',
          fontWeight: '700',
          color: isDone('simulate_blast_radius') || hasGate || hasRollback ? '#38bdf8' : '#64748b',
          fontFamily: 'JetBrains Mono, monospace',
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.07)',
          padding: '1px 6px',
          borderRadius: '9999px'
        }}>
          <span>Pre-Flight Verification</span>
          <ArrowDown size={9} />
          <span>Out-of-Band OTP Rollback</span>
        </div>
        <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />
      </div>

      {/* PHASE 2: PRE-FLIGHT, 2FA ROLLBACK & CLOSURE */}
      <div>
        <div style={{ fontSize: '0.58rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.2rem', letterSpacing: '0.04em' }}>
          Phase 2: Pre-Flight STS, Out-of-Band 2FA Rollback & Post-Mortem
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.28rem', alignItems: 'center' }}>
          {renderNode({
            step: 5,
            title: 'Pre-Flight',
            subtitle: isDone('simulate_blast_radius') ? '-58.2% RAM' : 'N-1 & STS IAM',
            code: 'simulate_blast',
            icon: Gauge,
            done: isDone('simulate_blast_radius'),
            current: isCurrent('simulate_blast_radius'),
            color: '#00d2ff',
            badgeText: 'DELTA'
          })}
          {renderNode({
            step: 6,
            title: 'Slack OTP',
            subtitle: hasRollback ? 'OTP Verified' : hasGate ? 'Check Slack PIN' : '2FA Gate',
            code: hasRollback ? 'pin_verified' : 'oob_otp_gate',
            icon: hasRollback ? Unlock : Lock,
            done: hasGate || hasRollback,
            current: isCurrent('safety_gate') && !hasRollback,
            color: '#f59e0b',
            badgeText: 'GATE'
          })}
          {renderNode({
            step: 7,
            title: 'Rollback',
            subtitle: hasRollback ? 'ECS Rev 41 OK' : 'Update ECS',
            code: 'execute_rollback',
            icon: RotateCcw,
            done: hasRollback,
            current: isCurrent('execute_rollback'),
            color: '#10b981',
            badgeText: '200 OK'
          })}
          {renderNode({
            step: 8,
            title: 'Fix & S3',
            subtitle: isDone('generate_incident_postmortem')
              ? 'S3 Published'
              : isDone('propose_code_fix')
              ? 'Git Diff Ready'
              : 'Patch & Report',
            code: isDone('generate_incident_postmortem') ? 's3_postmortem' : 'propose_fix',
            icon: isDone('generate_incident_postmortem') ? CheckCircle2 : FileCode2,
            done: hasFixOrPm,
            current: currentFixOrPm,
            color: '#38bdf8',
            badgeText: 'CLOSED'
          })}
        </div>
      </div>
    </div>
  );
}
