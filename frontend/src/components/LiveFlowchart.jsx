import React from 'react';
import { 
  Mic, BellRing, FileText, Cpu, ShieldAlert, 
  RotateCcw, Send, CheckCircle2, AlertTriangle, ArrowRight, ArrowDown,
  Sparkles, Lock, Unlock, Check
} from 'lucide-react';

export default function LiveFlowchart({ toolTraces = [], state = 'STANDBY' }) {
  // Trace and state analysis
  const hasAlarms = toolTraces.some(t => t.tool === 'get_active_alarms');
  const isAlarmsExecuting = toolTraces.some(t => t.tool === 'get_active_alarms' && t.status === 'EXECUTING');
  
  const hasLogs = toolTraces.some(t => t.tool === 'fetch_error_logs');
  const isLogsExecuting = toolTraces.some(t => t.tool === 'fetch_error_logs' && t.status === 'EXECUTING');
  
  const hasBedrock = toolTraces.some(t => t.tool === 'diagnose_incident');
  const isBedrockExecuting = toolTraces.some(t => t.tool === 'diagnose_incident' && t.status === 'EXECUTING');
  
  const hasSafetyGate = toolTraces.some(t => t.status === 'SAFETY_GATE_TRIGGERED') || state === 'AWAITING_CONFIRMATION';
  const hasRollback = toolTraces.some(t => t.tool === 'execute_rollback' && t.status === 'SUCCESS');
  const isRollbackExecuting = toolTraces.some(t => t.tool === 'execute_rollback' && t.status === 'EXECUTING');
  
  const hasSlack = toolTraces.some(t => t.tool === 'post_slack_notification');
  const isResolved = state === 'RESOLVED' || (hasRollback && hasSlack);
  const isVoiceActive = toolTraces.length > 0 || state === 'LISTENING' || state === 'THINKING';

  // Helper for arrow connector
  const FlowArrow = ({ active = false, warning = false, success = false, vertical = false }) => {
    const color = warning ? '#f59e0b' : success ? '#10b981' : active ? '#00d2ff' : 'rgba(255,255,255,0.15)';
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: vertical ? '4px 0' : '0 4px',
        color: color,
        flexShrink: 0,
        transition: 'all 0.3s ease'
      }}>
        {vertical ? (
          <ArrowDown size={14} style={{ filter: active || warning || success ? `drop-shadow(0 0 4px ${color})` : 'none' }} />
        ) : (
          <ArrowRight size={14} style={{ filter: active || warning || success ? `drop-shadow(0 0 4px ${color})` : 'none' }} />
        )}
      </div>
    );
  };

  return (
    <div style={{
      background: 'rgba(5, 9, 18, 0.95)',
      borderRadius: '14px',
      padding: '1rem',
      border: '1px solid rgba(0, 210, 255, 0.15)',
      marginBottom: '1rem',
      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)'
    }}>
      {/* Flowchart Title & Legend Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.85rem',
        paddingBottom: '0.65rem',
        borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Sparkles size={14} color="#00d2ff" />
          <span style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#f8fafc' }}>
            Live SRE Incident Remediation Flowchart
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.68rem', color: '#64748b' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00d2ff' }} />
            Active Step
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
            Voice 2FA Gate
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            Verified
          </span>
        </div>
      </div>

      {/* =========================================================================
          TIER 1: TRIAGE & DIAGNOSIS PIPELINE (Left to Right)
          ========================================================================= */}
      <div style={{ marginBottom: '0.6rem' }}>
        <div style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
          Phase 1: Autonomous Triage & Diagnostics
        </div>
        
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          {/* Node 1: Voice Input */}
          <div style={{
            background: isVoiceActive ? 'rgba(0, 210, 255, 0.1)' : 'rgba(15, 23, 42, 0.6)',
            border: `1px solid ${isVoiceActive ? 'rgba(0, 210, 255, 0.5)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '10px',
            padding: '0.6rem 0.75rem',
            boxShadow: isVoiceActive ? '0 0 14px rgba(0, 210, 255, 0.2)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#00d2ff', fontSize: '0.72rem', fontWeight: '700' }}>
                <Mic size={13} />
                <span>1. Voice Input</span>
              </div>
              <span style={{ fontSize: '0.58rem', padding: '1px 4px', borderRadius: '3px', background: isVoiceActive ? 'rgba(0,210,255,0.2)' : 'rgba(255,255,255,0.06)', color: isVoiceActive ? '#38bdf8' : '#64748b' }}>
                Alexa+
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              Bedside SRE Query
            </div>
            <div style={{ fontSize: '0.65rem', color: '#38bdf8', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
              Streamable HTTP
            </div>
          </div>

          {/* Node 2: CloudWatch Alarms */}
          <div style={{
            background: hasAlarms ? 'rgba(244, 63, 94, 0.1)' : 'rgba(15, 23, 42, 0.6)',
            border: `1px solid ${isAlarmsExecuting ? '#00d2ff' : hasAlarms ? 'rgba(244, 63, 94, 0.5)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '10px',
            padding: '0.6rem 0.75rem',
            boxShadow: hasAlarms ? '0 0 14px rgba(244, 63, 94, 0.15)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: hasAlarms ? '#fb7185' : '#94a3b8', fontSize: '0.72rem', fontWeight: '700' }}>
                <BellRing size={13} />
                <span>2. CloudWatch</span>
              </div>
              {hasAlarms && <span style={{ fontSize: '0.58rem', padding: '1px 4px', borderRadius: '3px', background: 'rgba(244,63,94,0.25)', color: '#fda4af', fontWeight: '700' }}>ALARM</span>}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hasAlarms ? 'Sev-2 Latency Spike' : 'Check Metrics'}
            </div>
            <div style={{ fontSize: '0.65rem', color: hasAlarms ? '#fca5a5' : '#64748b', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
              get_active_alarms
            </div>
          </div>

          {/* Node 3: Container Logs */}
          <div style={{
            background: hasLogs ? 'rgba(56, 189, 248, 0.1)' : 'rgba(15, 23, 42, 0.6)',
            border: `1px solid ${isLogsExecuting ? '#00d2ff' : hasLogs ? 'rgba(56, 189, 248, 0.5)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '10px',
            padding: '0.6rem 0.75rem',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: hasLogs ? '#38bdf8' : '#94a3b8', fontSize: '0.72rem', fontWeight: '700' }}>
                <FileText size={13} />
                <span>3. Error Logs</span>
              </div>
              {hasLogs && <CheckCircle2 size={12} color="#38bdf8" />}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hasLogs ? 'OOMKill ExitCode 137' : 'Ingest Stacks'}
            </div>
            <div style={{ fontSize: '0.65rem', color: hasLogs ? '#7dd3fc' : '#64748b', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
              fetch_error_logs
            </div>
          </div>

          {/* Node 4: AWS Bedrock Diagnosis */}
          <div style={{
            background: hasBedrock ? 'rgba(192, 132, 252, 0.12)' : 'rgba(15, 23, 42, 0.6)',
            border: `1px solid ${isBedrockExecuting ? '#00d2ff' : hasBedrock ? 'rgba(192, 132, 252, 0.5)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '10px',
            padding: '0.6rem 0.75rem',
            boxShadow: hasBedrock ? '0 0 16px rgba(192, 132, 252, 0.2)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: hasBedrock ? '#c084fc' : '#94a3b8', fontSize: '0.72rem', fontWeight: '700' }}>
                <Cpu size={13} />
                <span>4. AWS Bedrock</span>
              </div>
              {hasBedrock && <span style={{ fontSize: '0.58rem', padding: '1px 4px', borderRadius: '3px', background: 'rgba(192,132,252,0.25)', color: '#e9d5ff', fontWeight: '700' }}>SONNET</span>}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hasBedrock ? 'Recommend Rollback' : 'AI Reasoning'}
            </div>
            <div style={{ fontSize: '0.65rem', color: hasBedrock ? '#e9d5ff' : '#64748b', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
              diagnose_incident
            </div>
          </div>
        </div>
      </div>

      {/* Downward Transition Conduit */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '0.5rem',
        margin: '0.4rem 0',
        padding: '0.2rem 0'
      }}>
        <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.35rem',
          fontSize: '0.64rem',
          fontWeight: '700',
          color: hasSafetyGate || hasRollback ? '#fbbf24' : '#64748b',
          fontFamily: 'JetBrains Mono',
          background: hasSafetyGate || hasRollback ? 'rgba(245, 158, 11, 0.12)' : 'rgba(255,255,255,0.04)',
          border: `1px solid ${hasSafetyGate || hasRollback ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255,255,255,0.06)'}`,
          padding: '2px 8px',
          borderRadius: '9999px'
        }}>
          <span>Bedrock Recommends Mutation</span>
          <ArrowDown size={11} />
          <span>Entering Safety Gate</span>
        </div>
        <div style={{ height: '1px', flex: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)' }} />
      </div>

      {/* =========================================================================
          TIER 2: GOVERNANCE & REMEDIATION PIPELINE
          ========================================================================= */}
      <div>
        <div style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', marginBottom: '0.4rem', letterSpacing: '0.05em' }}>
          Phase 2: Governance & Container Remediation
        </div>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '0.5rem',
          alignItems: 'center'
        }}>
          {/* Node 5: Voice 2FA Safety Gate */}
          <div style={{
            background: hasRollback 
              ? 'rgba(16, 185, 129, 0.12)' 
              : hasSafetyGate 
              ? 'rgba(245, 158, 11, 0.15)' 
              : 'rgba(15, 23, 42, 0.6)',
            border: `1px solid ${
              hasRollback 
                ? 'rgba(16, 185, 129, 0.5)' 
                : hasSafetyGate 
                ? 'rgba(245, 158, 11, 0.6)' 
                : 'rgba(255,255,255,0.08)'
            }`,
            borderRadius: '10px',
            padding: '0.6rem 0.75rem',
            boxShadow: hasSafetyGate && !hasRollback 
              ? '0 0 16px rgba(245, 158, 11, 0.25)' 
              : hasRollback 
              ? '0 0 14px rgba(16, 185, 129, 0.2)' 
              : 'none',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: hasRollback ? '#34d399' : hasSafetyGate ? '#fbbf24' : '#94a3b8', fontSize: '0.72rem', fontWeight: '700' }}>
                {hasRollback ? <Unlock size={13} /> : <Lock size={13} />}
                <span>5. Voice 2FA Gate</span>
              </div>
              <span style={{
                fontSize: '0.58rem',
                padding: '1px 4px',
                borderRadius: '3px',
                background: hasRollback ? 'rgba(16,185,129,0.25)' : hasSafetyGate ? 'rgba(245,158,11,0.25)' : 'rgba(255,255,255,0.06)',
                color: hasRollback ? '#6ee7b7' : hasSafetyGate ? '#fcd34d' : '#64748b',
                fontWeight: '700'
              }}>
                {hasRollback ? 'VERIFIED' : hasSafetyGate ? 'INTERLOCK' : 'SAFETY'}
              </span>
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hasRollback ? 'Spoken Token Accepted' : hasSafetyGate ? 'Say "Confirm"' : 'Destructive Gate'}
            </div>
            <div style={{ fontSize: '0.65rem', color: hasRollback ? '#6ee7b7' : hasSafetyGate ? '#fcd34d' : '#64748b', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
              {hasRollback ? 'confirmed=True' : 'MUTATION_HALTED'}
            </div>
          </div>

          {/* Node 6: Amazon ECS Rollback */}
          <div style={{
            background: hasRollback ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.6)',
            border: `1px solid ${isRollbackExecuting ? '#00d2ff' : hasRollback ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '10px',
            padding: '0.6rem 0.75rem',
            boxShadow: hasRollback ? '0 0 14px rgba(16, 185, 129, 0.2)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: hasRollback ? '#34d399' : '#94a3b8', fontSize: '0.72rem', fontWeight: '700' }}>
                <RotateCcw size={13} />
                <span>6. Amazon ECS</span>
              </div>
              {hasRollback && <CheckCircle2 size={12} color="#10b981" />}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hasRollback ? 'Task Def: rev 41' : 'update_service'}
            </div>
            <div style={{ fontSize: '0.65rem', color: hasRollback ? '#6ee7b7' : '#64748b', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
              execute_rollback
            </div>
          </div>

          {/* Node 7: Slack Audit Trail */}
          <div style={{
            background: hasSlack ? 'rgba(16, 185, 129, 0.12)' : 'rgba(15, 23, 42, 0.6)',
            border: `1px solid ${hasSlack ? 'rgba(16, 185, 129, 0.5)' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '10px',
            padding: '0.6rem 0.75rem',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: hasSlack ? '#34d399' : '#94a3b8', fontSize: '0.72rem', fontWeight: '700' }}>
                <Send size={13} />
                <span>7. Team Slack</span>
              </div>
              {hasSlack && <CheckCircle2 size={12} color="#10b981" />}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {hasSlack ? 'Delivered #sre' : 'Audit Broadcast'}
            </div>
            <div style={{ fontSize: '0.65rem', color: hasSlack ? '#6ee7b7' : '#64748b', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
              post_slack_notification
            </div>
          </div>

          {/* Node 8: Resolved Health Check */}
          <div style={{
            background: isResolved ? 'rgba(16, 185, 129, 0.18)' : 'rgba(15, 23, 42, 0.6)',
            border: `1px solid ${isResolved ? '#00e676' : 'rgba(255,255,255,0.08)'}`,
            borderRadius: '10px',
            padding: '0.6rem 0.75rem',
            boxShadow: isResolved ? '0 0 18px rgba(0, 230, 118, 0.25)' : 'none',
            transition: 'all 0.3s ease'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: isResolved ? '#00e676' : '#94a3b8', fontSize: '0.72rem', fontWeight: '700' }}>
                <CheckCircle2 size={13} />
                <span>8. Status 200 OK</span>
              </div>
              {isResolved && <span style={{ fontSize: '0.58rem', padding: '1px 4px', borderRadius: '3px', background: 'rgba(0,230,118,0.25)', color: '#00e676', fontWeight: '700' }}>HEALTHY</span>}
            </div>
            <div style={{ fontSize: '0.75rem', fontWeight: '600', color: isResolved ? '#00e676' : '#f1f5f9', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {isResolved ? 'Zero 5xx • 41% Mem' : 'Monitoring'}
            </div>
            <div style={{ fontSize: '0.65rem', color: isResolved ? '#34d399' : '#64748b', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
              Cluster Healthy
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
