import React from 'react';
import { 
  Mic, BellRing, FileText, Cpu, ShieldAlert, 
  RotateCcw, Send, CheckCircle2, ArrowRight, Sparkles 
} from 'lucide-react';

export default function FlowPipeline({ toolTraces = [], state = 'STANDBY' }) {
  // Determine active stages based on executed tool traces and agent state
  const hasAlarms = toolTraces.some(t => t.tool === 'get_active_alarms');
  const hasLogs = toolTraces.some(t => t.tool === 'fetch_error_logs');
  const hasBedrock = toolTraces.some(t => t.tool === 'diagnose_incident');
  const hasSafetyGate = toolTraces.some(t => t.status === 'SAFETY_GATE_TRIGGERED') || state === 'AWAITING_CONFIRMATION';
  const hasRollback = toolTraces.some(t => t.tool === 'execute_rollback' && t.status === 'SUCCESS');
  const hasSlack = toolTraces.some(t => t.tool === 'post_slack_notification');

  const stages = [
    {
      id: 'voice',
      label: '1. Voice Input',
      subtext: 'Alexa+ MCP Transport',
      icon: Mic,
      isActive: toolTraces.length > 0 || state === 'LISTENING' || state === 'THINKING',
      isPending: false,
      isWarning: false,
      isSuccess: false,
      color: '#00d2ff'
    },
    {
      id: 'alarms',
      label: '2. CloudWatch',
      subtext: 'describe_alarms',
      icon: BellRing,
      isActive: hasAlarms,
      isPending: toolTraces.some(t => t.tool === 'get_active_alarms' && t.status === 'EXECUTING'),
      isWarning: false,
      isSuccess: hasAlarms && !toolTraces.some(t => t.tool === 'get_active_alarms' && t.status === 'EXECUTING'),
      color: '#38bdf8'
    },
    {
      id: 'logs',
      label: '3. Container Logs',
      subtext: 'filter_log_events',
      icon: FileText,
      isActive: hasLogs,
      isPending: toolTraces.some(t => t.tool === 'fetch_error_logs' && t.status === 'EXECUTING'),
      isWarning: false,
      isSuccess: hasLogs && !toolTraces.some(t => t.tool === 'fetch_error_logs' && t.status === 'EXECUTING'),
      color: '#60a5fa'
    },
    {
      id: 'bedrock',
      label: '4. AWS Bedrock',
      subtext: 'Claude 3.5 Sonnet',
      icon: Cpu,
      isActive: hasBedrock,
      isPending: toolTraces.some(t => t.tool === 'diagnose_incident' && t.status === 'EXECUTING'),
      isWarning: false,
      isSuccess: hasBedrock && !toolTraces.some(t => t.tool === 'diagnose_incident' && t.status === 'EXECUTING'),
      color: '#c084fc'
    },
    {
      id: 'safety',
      label: '5. Voice 2FA Gate',
      subtext: hasRollback ? 'Authorized & Verified' : 'Safety Interlock',
      icon: ShieldAlert,
      isActive: hasSafetyGate || hasRollback,
      isPending: false,
      isWarning: hasSafetyGate && !hasRollback,
      isSuccess: hasRollback,
      color: hasRollback ? '#10b981' : '#f59e0b'
    },
    {
      id: 'remediation',
      label: '6. ECS & Slack',
      subtext: hasSlack ? 'Service Restored' : 'update_service',
      icon: hasSlack ? CheckCircle2 : RotateCcw,
      isActive: hasRollback || hasSlack,
      isPending: toolTraces.some(t => t.tool === 'execute_rollback' && t.status === 'EXECUTING'),
      isWarning: false,
      isSuccess: hasRollback && hasSlack,
      color: '#10b981'
    }
  ];

  return (
    <div style={{
      background: 'rgba(5, 8, 16, 0.75)',
      borderRadius: '12px',
      padding: '0.85rem 1rem',
      border: '1px solid rgba(255, 255, 255, 0.06)',
      marginBottom: '0.85rem'
    }}>
      {/* Top Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.75rem',
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <Sparkles size={13} color="#00d2ff" />
          <span style={{ fontSize: '0.74rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#94a3b8' }}>
            Live Autonomous MCP Execution Flow
          </span>
        </div>
        <div style={{
          fontSize: '0.66rem',
          color: '#64748b',
          fontFamily: 'JetBrains Mono',
          background: 'rgba(255, 255, 255, 0.04)',
          padding: '2px 8px',
          borderRadius: '4px'
        }}>
          AWS CloudWatch ➔ Bedrock ➔ ECS Safety Gate
        </div>
      </div>

      {/* Nodes Pipeline */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '0.5rem',
        alignItems: 'stretch'
      }}>
        {stages.map((stage, idx) => {
          const IconComponent = stage.icon;
          const bg = stage.isWarning
            ? 'rgba(245, 158, 11, 0.12)'
            : stage.isSuccess
            ? 'rgba(16, 185, 129, 0.1)'
            : stage.isActive
            ? 'rgba(0, 210, 255, 0.1)'
            : 'rgba(255, 255, 255, 0.02)';
          
          const borderColor = stage.isWarning
            ? 'rgba(245, 158, 11, 0.45)'
            : stage.isSuccess
            ? 'rgba(16, 185, 129, 0.4)'
            : stage.isActive
            ? 'rgba(0, 210, 255, 0.35)'
            : 'rgba(255, 255, 255, 0.06)';

          const textColor = stage.isWarning
            ? '#fcd34d'
            : stage.isSuccess
            ? '#6ee7b7'
            : stage.isActive
            ? '#38bdf8'
            : '#64748b';

          return (
            <div
              key={stage.id}
              style={{
                background: bg,
                border: `1px solid ${borderColor}`,
                borderRadius: '8px',
                padding: '0.6rem 0.65rem',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                transition: 'all 0.3s ease',
                boxShadow: stage.isWarning
                  ? '0 0 14px rgba(245, 158, 11, 0.2)'
                  : stage.isActive
                  ? '0 0 12px rgba(0, 210, 255, 0.15)'
                  : 'none'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
                <div style={{
                  width: '24px',
                  height: '24px',
                  borderRadius: '6px',
                  background: stage.isActive ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}>
                  <IconComponent size={13} color={textColor} />
                </div>
                {stage.isPending && (
                  <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00d2ff', animation: 'pulse-fast 0.8s infinite' }} />
                )}
                {stage.isSuccess && (
                  <CheckCircle2 size={12} color="#10b981" />
                )}
                {stage.isWarning && (
                  <span style={{ fontSize: '0.58rem', fontWeight: '800', background: 'rgba(245, 158, 11, 0.25)', color: '#fbbf24', padding: '1px 5px', borderRadius: '4px' }}>
                    GATE
                  </span>
                )}
              </div>

              <div>
                <div style={{ fontSize: '0.74rem', fontWeight: '700', color: stage.isActive ? '#f1f5f9' : '#64748b', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {stage.label}
                </div>
                <div style={{ fontSize: '0.62rem', color: textColor, fontFamily: 'JetBrains Mono', marginTop: '0.1rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {stage.subtext}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

