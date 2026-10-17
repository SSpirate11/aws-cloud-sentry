import React from 'react';
import { 
  Mic, Radio, BellRing, FileText, Cpu, ShieldAlert, 
  RotateCcw, Send, CheckCircle2, AlertTriangle, Sparkles, Activity
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
  const isMcpActive = toolTraces.length > 0;

  return (
    <div style={{
      background: 'rgba(6, 10, 20, 0.92)',
      borderRadius: '14px',
      padding: '1rem 1.15rem',
      border: '1px solid rgba(0, 210, 255, 0.18)',
      marginBottom: '1rem',
      position: 'relative',
      overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.45)'
    }}>
      {/* Background ambient grid overlay */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundImage: 'radial-gradient(rgba(0, 210, 255, 0.04) 1px, transparent 1px)',
        backgroundSize: '16px 16px',
        pointerEvents: 'none'
      }} />

      {/* Header Bar */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '0.85rem',
        position: 'relative',
        zIndex: 2,
        flexWrap: 'wrap',
        gap: '0.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Activity size={14} color="#00d2ff" style={{ animation: isVoiceActive ? 'pulse-fast 1.2s infinite' : 'none' }} />
          <span style={{ fontSize: '0.78rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#f1f5f9' }}>
            Live Autonomous MCP Execution Flowchart
          </span>
          <span style={{
            fontSize: '0.62rem',
            padding: '2px 6px',
            borderRadius: '4px',
            background: 'rgba(0, 210, 255, 0.15)',
            color: '#38bdf8',
            fontFamily: 'JetBrains Mono',
            fontWeight: '700'
          }}>
            STREAMABLE HTTP
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '0.68rem', color: '#64748b', fontFamily: 'JetBrains Mono' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00d2ff' }} />
            Active Trace
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#f59e0b' }} />
            Safety Interlock
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#10b981' }} />
            Remediated
          </span>
        </div>
      </div>

      {/* Interactive SVG Flowchart DAG */}
      <div style={{ width: '100%', overflowX: 'auto', position: 'relative', zIndex: 2 }}>
        <svg
          viewBox="0 0 940 240"
          style={{ width: '100%', minWidth: '780px', height: 'auto', display: 'block' }}
        >
          <defs>
            {/* Glow Filters */}
            <filter id="glow-cyan" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-amber" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
            <filter id="glow-green" x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>

            {/* Line Gradients */}
            <linearGradient id="grad-cyan" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#00d2ff" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="grad-purple" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#c084fc" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad-curve-down" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.9" />
            </linearGradient>
            <linearGradient id="grad-amber" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.8" />
            </linearGradient>
            <linearGradient id="grad-green" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#34d399" stopOpacity="0.8" />
            </linearGradient>
          </defs>

          {/* ==================== SVG CONNECTOR PATHS ==================== */}
          {/* Path 1: Voice -> Alexa+ MCP */}
          <path
            d="M 165 55 L 205 55"
            stroke={isVoiceActive ? 'url(#grad-cyan)' : 'rgba(255,255,255,0.1)'}
            strokeWidth={isVoiceActive ? '2.5' : '1.5'}
            strokeDasharray={isVoiceActive ? '4,4' : 'none'}
            className={isVoiceActive ? 'flow-line-active' : ''}
          />

          {/* Path 2: Alexa+ MCP -> CloudWatch Alarms */}
          <path
            d="M 355 55 L 395 55"
            stroke={hasAlarms || isAlarmsExecuting ? 'url(#grad-cyan)' : 'rgba(255,255,255,0.1)'}
            strokeWidth={hasAlarms || isAlarmsExecuting ? '2.5' : '1.5'}
            strokeDasharray={hasAlarms || isAlarmsExecuting ? '4,4' : 'none'}
            className={isAlarmsExecuting ? 'flow-line-active' : ''}
          />

          {/* Path 3: CloudWatch Alarms -> Container Logs */}
          <path
            d="M 545 55 L 585 55"
            stroke={hasLogs || isLogsExecuting ? 'url(#grad-cyan)' : 'rgba(255,255,255,0.1)'}
            strokeWidth={hasLogs || isLogsExecuting ? '2.5' : '1.5'}
            strokeDasharray={hasLogs || isLogsExecuting ? '4,4' : 'none'}
            className={isLogsExecuting ? 'flow-line-active' : ''}
          />

          {/* Path 4: Container Logs -> AWS Bedrock */}
          <path
            d="M 735 55 L 775 55"
            stroke={hasBedrock || isBedrockExecuting ? 'url(#grad-purple)' : 'rgba(255,255,255,0.1)'}
            strokeWidth={hasBedrock || isBedrockExecuting ? '2.5' : '1.5'}
            strokeDasharray={hasBedrock || isBedrockExecuting ? '4,4' : 'none'}
            className={isBedrockExecuting ? 'flow-line-active' : ''}
          />

          {/* Path 5: Bedrock -> Curved Bezier Down to Voice 2FA Gate */}
          <path
            d="M 850 85 C 850 140, 770 175, 740 185"
            fill="none"
            stroke={hasSafetyGate || hasRollback ? 'url(#grad-curve-down)' : 'rgba(255,255,255,0.08)'}
            strokeWidth={hasSafetyGate || hasRollback ? '2.5' : '1.5'}
            strokeDasharray={hasSafetyGate || hasRollback ? '4,4' : 'none'}
            className={hasSafetyGate && !hasRollback ? 'flow-line-active' : ''}
          />

          {/* Path 6: Voice 2FA Gate -> Amazon ECS */}
          <path
            d="M 580 185 L 540 185"
            stroke={hasRollback ? 'url(#grad-green)' : hasSafetyGate ? '#f59e0b' : 'rgba(255,255,255,0.1)'}
            strokeWidth={hasRollback ? '3' : '1.5'}
            strokeDasharray={hasSafetyGate && !hasRollback ? '3,3' : 'none'}
          />

          {/* Path 7: Amazon ECS -> Slack Audit */}
          <path
            d="M 390 185 L 350 185"
            stroke={hasSlack ? 'url(#grad-green)' : 'rgba(255,255,255,0.1)'}
            strokeWidth={hasSlack ? '2.5' : '1.5'}
            strokeDasharray={hasRollback && !hasSlack ? '4,4' : 'none'}
          />

          {/* Path 8: Slack Audit -> Remediated Status */}
          <path
            d="M 200 185 L 160 185"
            stroke={isResolved ? 'url(#grad-green)' : 'rgba(255,255,255,0.1)'}
            strokeWidth={isResolved ? '2.5' : '1.5'}
          />

          {/* ==================== ROW 1: TRIAGE & DIAGNOSIS NODES ==================== */}
          {/* Node 1: On-Call Voice Input */}
          <g transform="translate(15, 25)">
            <rect
              width="150" height="60" rx="8"
              fill={isVoiceActive ? 'rgba(0, 210, 255, 0.12)' : 'rgba(15, 23, 42, 0.7)'}
              stroke={isVoiceActive ? '#00d2ff' : 'rgba(255,255,255,0.12)'}
              strokeWidth="1.5"
              filter={isVoiceActive ? 'url(#glow-cyan)' : 'none'}
            />
            <circle cx="28" cy="30" r="14" fill="rgba(0, 210, 255, 0.15)" />
            <text x="28" y="34" textAnchor="middle" fill="#00d2ff" fontSize="13">🗣️</text>
            <text x="50" y="27" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">1. Voice Command</text>
            <text x="50" y="42" fill="#38bdf8" fontSize="9" fontFamily="JetBrains Mono">"Alexa, what's failing?"</text>
          </g>

          {/* Node 2: Alexa+ MCP Server */}
          <g transform="translate(205, 25)">
            <rect
              width="150" height="60" rx="8"
              fill={isMcpActive ? 'rgba(0, 210, 255, 0.12)' : 'rgba(15, 23, 42, 0.7)'}
              stroke={isMcpActive ? '#38bdf8' : 'rgba(255,255,255,0.12)'}
              strokeWidth="1.5"
            />
            <circle cx="28" cy="30" r="14" fill="rgba(0, 210, 255, 0.15)" />
            <text x="28" y="34" textAnchor="middle" fill="#38bdf8" fontSize="13">🎙️</text>
            <text x="50" y="27" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">2. Alexa+ Agent</text>
            <text x="50" y="42" fill="#94a3b8" fontSize="9" fontFamily="JetBrains Mono">MCP Spec 2025-11-25+</text>
          </g>

          {/* Node 3: CloudWatch Alarms */}
          <g transform="translate(395, 25)">
            <rect
              width="150" height="60" rx="8"
              fill={hasAlarms ? 'rgba(244, 63, 94, 0.12)' : 'rgba(15, 23, 42, 0.7)'}
              stroke={isAlarmsExecuting ? '#00d2ff' : hasAlarms ? '#f43f5e' : 'rgba(255,255,255,0.12)'}
              strokeWidth="1.5"
              filter={isAlarmsExecuting ? 'url(#glow-cyan)' : 'none'}
            />
            <circle cx="28" cy="30" r="14" fill={hasAlarms ? 'rgba(244, 63, 94, 0.2)' : 'rgba(255,255,255,0.06)'} />
            <text x="28" y="34" textAnchor="middle" fontSize="13">{hasAlarms ? '🚨' : '⚡'}</text>
            <text x="50" y="27" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">3. CloudWatch</text>
            <text x="50" y="42" fill={hasAlarms ? '#fb7185' : '#64748b'} fontSize="9" fontFamily="JetBrains Mono">get_active_alarms</text>
          </g>

          {/* Node 4: Container Logs */}
          <g transform="translate(585, 25)">
            <rect
              width="150" height="60" rx="8"
              fill={hasLogs ? 'rgba(56, 189, 248, 0.12)' : 'rgba(15, 23, 42, 0.7)'}
              stroke={isLogsExecuting ? '#00d2ff' : hasLogs ? '#38bdf8' : 'rgba(255,255,255,0.12)'}
              strokeWidth="1.5"
              filter={isLogsExecuting ? 'url(#glow-cyan)' : 'none'}
            />
            <circle cx="28" cy="30" r="14" fill="rgba(56, 189, 248, 0.15)" />
            <text x="28" y="34" textAnchor="middle" fontSize="13">📜</text>
            <text x="50" y="27" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">4. Error Logs</text>
            <text x="50" y="42" fill={hasLogs ? '#38bdf8' : '#64748b'} fontSize="9" fontFamily="JetBrains Mono">fetch_error_logs</text>
          </g>

          {/* Node 5: AWS Bedrock Diagnosis */}
          <g transform="translate(775, 25)">
            <rect
              width="150" height="60" rx="8"
              fill={hasBedrock ? 'rgba(192, 132, 252, 0.15)' : 'rgba(15, 23, 42, 0.7)'}
              stroke={isBedrockExecuting ? '#00d2ff' : hasBedrock ? '#c084fc' : 'rgba(255,255,255,0.12)'}
              strokeWidth="1.5"
              filter={isBedrockExecuting ? 'url(#glow-cyan)' : hasBedrock ? 'url(#glow-cyan)' : 'none'}
            />
            <circle cx="28" cy="30" r="14" fill="rgba(192, 132, 252, 0.2)" />
            <text x="28" y="34" textAnchor="middle" fontSize="13">🧠</text>
            <text x="50" y="27" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">5. AWS Bedrock</text>
            <text x="50" y="42" fill={hasBedrock ? '#e9d5ff' : '#64748b'} fontSize="9" fontFamily="JetBrains Mono">Claude 3.5 Sonnet</text>
          </g>

          {/* ==================== ROW 2: GOVERNANCE & REMEDIATION ==================== */}
          {/* Node 6: Voice 2FA Safety Gate (Amber Checkpoint) */}
          <g transform="translate(580, 155)">
            <rect
              width="160" height="60" rx="8"
              fill={hasRollback ? 'rgba(16, 185, 129, 0.12)' : hasSafetyGate ? 'rgba(245, 158, 11, 0.16)' : 'rgba(15, 23, 42, 0.7)'}
              stroke={hasRollback ? '#10b981' : hasSafetyGate ? '#f59e0b' : 'rgba(255,255,255,0.12)'}
              strokeWidth={hasSafetyGate && !hasRollback ? '2' : '1.5'}
              filter={hasSafetyGate && !hasRollback ? 'url(#glow-amber)' : 'none'}
            />
            <circle cx="28" cy="30" r="14" fill={hasSafetyGate ? 'rgba(245, 158, 11, 0.25)' : 'rgba(255,255,255,0.06)'} />
            <text x="28" y="34" textAnchor="middle" fontSize="13">{hasRollback ? '🔓' : '🔒'}</text>
            <text x="50" y="27" fill={hasRollback ? '#6ee7b7' : hasSafetyGate ? '#fcd34d' : '#f8fafc'} fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">
              6. Voice 2FA Gate
            </text>
            <text x="50" y="42" fill={hasRollback ? '#34d399' : hasSafetyGate ? '#fbbf24' : '#64748b'} fontSize="9" fontFamily="JetBrains Mono">
              {hasRollback ? 'AUTHORIZED (CONFIRMED)' : hasSafetyGate ? 'AWAITING SPOKEN 2FA' : 'MUTATION INTERLOCK'}
            </text>
          </g>

          {/* Node 7: Amazon ECS Rollback */}
          <g transform="translate(390, 155)">
            <rect
              width="150" height="60" rx="8"
              fill={hasRollback ? 'rgba(16, 185, 129, 0.15)' : 'rgba(15, 23, 42, 0.7)'}
              stroke={isRollbackExecuting ? '#00d2ff' : hasRollback ? '#10b981' : 'rgba(255,255,255,0.12)'}
              strokeWidth="1.5"
              filter={hasRollback ? 'url(#glow-green)' : 'none'}
            />
            <circle cx="28" cy="30" r="14" fill={hasRollback ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)'} />
            <text x="28" y="34" textAnchor="middle" fontSize="13">🚀</text>
            <text x="50" y="27" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">7. Amazon ECS</text>
            <text x="50" y="42" fill={hasRollback ? '#6ee7b7' : '#64748b'} fontSize="9" fontFamily="JetBrains Mono">checkout-api:41</text>
          </g>

          {/* Node 8: Slack Audit Trail */}
          <g transform="translate(200, 155)">
            <rect
              width="150" height="60" rx="8"
              fill={hasSlack ? 'rgba(16, 185, 129, 0.15)' : 'rgba(15, 23, 42, 0.7)'}
              stroke={hasSlack ? '#10b981' : 'rgba(255,255,255,0.12)'}
              strokeWidth="1.5"
            />
            <circle cx="28" cy="30" r="14" fill={hasSlack ? 'rgba(16, 185, 129, 0.2)' : 'rgba(255,255,255,0.06)'} />
            <text x="28" y="34" textAnchor="middle" fontSize="13">💬</text>
            <text x="50" y="27" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">8. Team Slack</text>
            <text x="50" y="42" fill={hasSlack ? '#6ee7b7' : '#64748b'} fontSize="9" fontFamily="JetBrains Mono">#sre-incidents</text>
          </g>

          {/* Node 9: Remediated / Healthy Outcome */}
          <g transform="translate(15, 155)">
            <rect
              width="145" height="60" rx="8"
              fill={isResolved ? 'rgba(16, 185, 129, 0.2)' : 'rgba(15, 23, 42, 0.7)'}
              stroke={isResolved ? '#00e676' : 'rgba(255,255,255,0.12)'}
              strokeWidth={isResolved ? '2' : '1.5'}
              filter={isResolved ? 'url(#glow-green)' : 'none'}
            />
            <circle cx="28" cy="30" r="14" fill={isResolved ? 'rgba(0, 230, 118, 0.25)' : 'rgba(255,255,255,0.06)'} />
            <text x="28" y="34" textAnchor="middle" fontSize="13">✅</text>
            <text x="50" y="27" fill="#f8fafc" fontSize="11" fontWeight="700" fontFamily="Inter, sans-serif">9. Status 200 OK</text>
            <text x="50" y="42" fill={isResolved ? '#00e676' : '#64748b'} fontSize="9" fontFamily="JetBrains Mono">Zero 5xx • 41% Mem</text>
          </g>
        </svg>
      </div>
    </div>
  );
}
