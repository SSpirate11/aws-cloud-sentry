import React from 'react';
import { 
  AlertTriangle, CheckCircle2, ShieldCheck, Activity, Cpu, HardDrive, 
  Terminal, Clock, Sparkles, Server, Check, ArrowRight, ShieldAlert,
  GitPullRequest, GitBranch, ExternalLink, FileText, Share2
} from 'lucide-react';
import MetricChart from './MetricChart';

export default function DisplayCard({ card, state }) {
  if (!card) return null;

  const isAlarm = state === 'INCIDENT_ACTIVE';
  const isAwaiting = state === 'AWAITING_CONFIRMATION';
  const isResolved = state === 'RESOLVED';
  const isCodeFix = state === 'CODE_FIX_READY' || !!card.git_patch;
  const isPostMortem = state === 'POSTMORTEM_GENERATED' || !!card.postmortem_markdown;
  const isCulprit = state === 'CULPRIT_IDENTIFIED' || !!card.culprit_data;
  const isBlastRadius = state === 'BLAST_RADIUS_VERIFIED' || !!card.blast_radius_data;

  const borderColor = isCodeFix 
    ? '#00d2ff' 
    : isPostMortem 
    ? '#818cf8' 
    : isAwaiting 
    ? '#f59e0b' 
    : isResolved 
    ? '#10b981' 
    : isAlarm 
    ? '#f43f5e' 
    : '#00d2ff';

  const badgeBg = isCodeFix
    ? 'rgba(0, 210, 255, 0.15)'
    : isPostMortem
    ? 'rgba(129, 140, 248, 0.15)'
    : isAwaiting
    ? 'rgba(245, 158, 11, 0.15)'
    : isResolved
    ? 'rgba(16, 185, 129, 0.15)'
    : isAlarm
    ? 'rgba(244, 63, 94, 0.15)'
    : 'rgba(0, 210, 255, 0.15)';

  const badgeColor = isCodeFix
    ? '#38bdf8'
    : isPostMortem
    ? '#a5b4fc'
    : isAwaiting
    ? '#fbbf24'
    : isResolved
    ? '#34d399'
    : isAlarm
    ? '#fb7185'
    : '#38bdf8';

  return (
    <div className="glass-panel" style={{
      borderRadius: '12px',
      padding: '0.65rem 0.85rem',
      borderLeft: `4px solid ${borderColor}`,
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
          background: badgeBg,
          color: badgeColor,
          border: `1px solid ${borderColor}`
        }}>
          {isCodeFix && <GitPullRequest size={12} />}
          {isPostMortem && <FileText size={12} />}
          {isAwaiting && <ShieldAlert size={12} />}
          {isResolved && <CheckCircle2 size={12} />}
          {isAlarm && <AlertTriangle size={12} />}
          {card.badge || 'STANDBY'}
        </div>
      </div>

      {/* VIEW A: Automated Unified Git Diff Patch Card */}
      {card.git_patch && (
        <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {/* Patch Meta Header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(5, 8, 16, 0.7)',
            padding: '0.35rem 0.55rem',
            borderRadius: '6px',
            border: '1px solid rgba(0, 210, 255, 0.25)',
            fontSize: '0.68rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <GitBranch size={12} color="#00d2ff" />
              <span style={{ color: '#94a3b8' }}>Branch:</span>
              <span style={{ color: '#38bdf8', fontFamily: 'JetBrains Mono', fontWeight: '700' }}>
                {card.branch}
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
              <span style={{
                fontSize: '0.6rem',
                padding: '1px 5px',
                borderRadius: '3px',
                background: 'rgba(16, 185, 129, 0.15)',
                color: '#34d399',
                fontWeight: '600'
              }}>
                {card.estimated_memory_reduction}
              </span>
            </div>
          </div>

          {/* Unified Diff Box with Syntax Coloring */}
          <div style={{
            background: '#040711',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0.4rem 0.6rem',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.68rem',
            lineHeight: '1.45',
            maxHeight: '125px',
            overflowY: 'auto'
          }}>
            {card.git_patch.split('\n').map((line, idx) => {
              const isAddition = line.startsWith('+') && !line.startsWith('+++');
              const isDeletion = line.startsWith('-') && !line.startsWith('---');
              const isHunk = line.startsWith('@@');
              const isHeader = line.startsWith('---') || line.startsWith('+++');

              return (
                <div
                  key={idx}
                  style={{
                    color: isAddition ? '#4ade80' : isDeletion ? '#f87171' : isHunk ? '#38bdf8' : isHeader ? '#c084fc' : '#cbd5e1',
                    background: isAddition ? 'rgba(34, 197, 94, 0.12)' : isDeletion ? 'rgba(239, 68, 68, 0.12)' : 'transparent',
                    padding: '0 2px',
                    borderRadius: '2px'
                  }}
                >
                  {line}
                </div>
              );
            })}
          </div>

          {/* Explanation & Action Footer */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(5, 8, 16, 0.5)',
            padding: '0.35rem 0.55rem',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.06)'
          }}>
            <div style={{ fontSize: '0.68rem', color: '#cbd5e1', flex: 1, marginRight: '0.5rem' }}>
              💡 <strong>Fix:</strong> {card.explanation}
            </div>
            {card.pr_url && (
              <a
                href={card.pr_url}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  fontSize: '0.65rem',
                  fontWeight: '700',
                  padding: '0.25rem 0.55rem',
                  borderRadius: '5px',
                  background: 'rgba(0, 210, 255, 0.2)',
                  color: '#38bdf8',
                  border: '1px solid rgba(0, 210, 255, 0.4)',
                  textDecoration: 'none',
                  cursor: 'pointer'
                }}
              >
                <GitPullRequest size={11} />
                <span>Create PR Draft</span>
                <ExternalLink size={9} />
              </a>
            )}
          </div>
        </div>
      )}

      {/* VIEW B: Blameless SRE Post-Mortem Report Card */}
      {card.postmortem_markdown && (
        <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          {/* Post-Mortem Key Metrics Banner */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.35rem'
          }}>
            <div style={{ background: 'rgba(5, 8, 16, 0.7)', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.58rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>MTTA (Acknowledge)</div>
              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#38bdf8', fontFamily: 'JetBrains Mono' }}>{card.mtta || '12s'}</div>
            </div>
            <div style={{ background: 'rgba(5, 8, 16, 0.7)', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.58rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>MTTR (Remediate)</div>
              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#34d399', fontFamily: 'JetBrains Mono' }}>{card.mttr || '42s'}</div>
            </div>
            <div style={{ background: 'rgba(5, 8, 16, 0.7)', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.06)' }}>
              <div style={{ fontSize: '0.58rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>Audit Deliveries</div>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#a78bfa', marginTop: '2px' }}>S3 & #sre-postmortems</div>
            </div>
          </div>

          {/* S3 URI + Slack Tag */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'rgba(99, 102, 241, 0.1)',
            padding: '0.3rem 0.55rem',
            borderRadius: '6px',
            border: '1px solid rgba(99, 102, 241, 0.3)',
            fontSize: '0.64rem'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#c7d2fe' }}>
              <FileText size={11} color="#a5b4fc" />
              <span>S3 Archive:</span>
              <code style={{ color: '#e0e7ff', fontFamily: 'JetBrains Mono' }}>{card.s3_report_url}</code>
            </div>
            <span style={{ fontSize: '0.6rem', padding: '1px 4px', borderRadius: '3px', background: 'rgba(99, 102, 241, 0.25)', color: '#e0e7ff', fontWeight: '600' }}>
              Slack Delivered
            </span>
          </div>

          {/* Formatted Markdown Content Viewer */}
          <div style={{
            background: '#040711',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0.5rem 0.7rem',
            fontSize: '0.68rem',
            lineHeight: '1.45',
            color: '#e2e8f0',
            maxHeight: '125px',
            overflowY: 'auto'
          }}>
            {card.postmortem_markdown.split('\n\n').map((paragraph, idx) => {
              if (paragraph.startsWith('# ')) {
                return <h3 key={idx} style={{ fontSize: '0.8rem', fontWeight: '800', color: '#f8fafc', margin: '0 0 0.3rem 0' }}>{paragraph.replace('# ', '')}</h3>;
              }
              if (paragraph.startsWith('### ')) {
                return <h4 key={idx} style={{ fontSize: '0.72rem', fontWeight: '700', color: '#38bdf8', margin: '0.35rem 0 0.15rem 0' }}>{paragraph.replace('### ', '')}</h4>;
              }
              return <div key={idx} style={{ marginBottom: '0.3rem', color: '#cbd5e1' }}>{paragraph}</div>;
            })}
          </div>
        </div>
      )}

      {/* VIEW B2: 3 AM Forensic Git Blame & SRE Coffee Bounty Card */}
      {card.culprit_data && (
        <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '0.35rem'
          }}>
            <div style={{ background: 'rgba(5, 8, 16, 0.75)', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(245, 158, 11, 0.3)' }}>
              <div style={{ fontSize: '0.56rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Offending Commit</div>
              <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#fbbf24', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
                {card.culprit_data.commit_sha} ({card.culprit_data.pr_number})
              </div>
              <div style={{ fontSize: '0.62rem', color: '#cbd5e1', marginTop: '1px' }}>{card.culprit_data.author}</div>
            </div>
            <div style={{ background: 'rgba(5, 8, 16, 0.75)', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(244, 63, 94, 0.3)' }}>
              <div style={{ fontSize: '0.56rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>PR Review Speed</div>
              <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#fb7185', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
                ⚡ {card.culprit_data.pr_approval_time}
              </div>
              <div style={{ fontSize: '0.62rem', color: '#fda4af', marginTop: '1px' }}>"{card.culprit_data.pr_comment}"</div>
            </div>
            <div style={{ background: 'rgba(5, 8, 16, 0.75)', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(168, 85, 247, 0.3)' }}>
              <div style={{ fontSize: '0.56rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Deploy Timestamp</div>
              <div style={{ fontSize: '0.7rem', fontWeight: '800', color: '#c084fc', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
                {card.culprit_data.deployed_at}
              </div>
              <div style={{ fontSize: '0.6rem', color: '#e9d5ff', marginTop: '1px' }}>{card.culprit_data.ci_skipped}</div>
            </div>
          </div>

          <div style={{
            background: '#040711',
            borderRadius: '6px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '0.4rem 0.6rem',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.68rem',
            color: '#f8fafc'
          }}>
            <div style={{ color: '#94a3b8', fontSize: '0.6rem', marginBottom: '2px' }}>git log -n 1 --stat {card.culprit_data.commit_sha}</div>
            <div style={{ color: '#fcd34d', fontWeight: '700' }}>"{card.culprit_data.commit_message}"</div>
            <div style={{ color: '#fb7185', fontSize: '0.63rem', marginTop: '4px' }}>
              😴 Sleep Disruption Index: <strong>{card.culprit_data.sleep_disruption_score}</strong> • Reviewer: <strong>{card.culprit_data.pr_reviewer}</strong>
            </div>
          </div>

          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.16), rgba(16, 185, 129, 0.12))',
            padding: '0.4rem 0.6rem',
            borderRadius: '6px',
            border: '1px solid rgba(245, 158, 11, 0.4)',
            fontSize: '0.68rem'
          }}>
            <div>
              <div style={{ color: '#fef3c7', fontWeight: '800' }}>
                ☕ SRE Reparation Bounty: <span style={{ color: '#34d399' }}>{card.culprit_data.coffee_bounty}</span>
              </div>
              <div style={{ color: '#cbd5e1', fontSize: '0.62rem', marginTop: '2px' }}>
                🛡️ Guardrail Enforced: {card.culprit_data.automated_guardrail}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* VIEW B3: Digital Twin Canary Pre-Flight & JIT IAM Session Policy Card */}
      {card.blast_radius_data && (
        <div style={{ marginTop: '0.4rem', display: 'flex', flexDirection: 'column', gap: '0.35rem' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(4, 1fr)',
            gap: '0.35rem'
          }}>
            <div style={{ background: 'rgba(5, 8, 16, 0.75)', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0, 210, 255, 0.25)' }}>
              <div style={{ fontSize: '0.56rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Synthetic Traffic</div>
              <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#38bdf8', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>12,400 RPS</div>
            </div>
            <div style={{ background: 'rgba(5, 8, 16, 0.75)', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ fontSize: '0.56rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>OOM Risk</div>
              <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#34d399', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>
                {card.blast_radius_data.oom_probability}
              </div>
            </div>
            <div style={{ background: 'rgba(5, 8, 16, 0.75)', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.25)' }}>
              <div style={{ fontSize: '0.56rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Predicted RAM</div>
              <div style={{ fontSize: '0.76rem', fontWeight: '800', color: '#34d399', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>39.8% Peak</div>
            </div>
            <div style={{ background: 'rgba(5, 8, 16, 0.75)', padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0, 210, 255, 0.25)' }}>
              <div style={{ fontSize: '0.56rem', color: '#94a3b8', textTransform: 'uppercase', fontWeight: '700' }}>Canary p99</div>
              <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#38bdf8', fontFamily: 'JetBrains Mono', marginTop: '2px' }}>34ms</div>
            </div>
          </div>

          {card.blast_radius_data.jit_iam_session && (
            <div style={{
              background: '#040711',
              borderRadius: '6px',
              border: '1px solid rgba(16, 185, 129, 0.35)',
              padding: '0.45rem 0.65rem',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.64rem',
              color: '#cbd5e1'
            }}>
              <div style={{ color: '#34d399', fontWeight: '700', marginBottom: '3px' }}>
                🔒 Just-In-Time (JIT) Alarm-Scoped AWS STS Session Policy Armed (TTL: {card.blast_radius_data.jit_iam_session.ttl_seconds}s)
              </div>
              <div>Role ARN: <span style={{ color: '#38bdf8' }}>{card.blast_radius_data.jit_iam_session.role_arn}</span></div>
              <div>Resource: <span style={{ color: '#e2e8f0' }}>{card.blast_radius_data.jit_iam_session.scoped_resource}</span></div>
              <div>Guardrail: <span style={{ color: '#fbbf24' }}>{card.blast_radius_data.jit_iam_session.alarm_condition}</span></div>
            </div>
          )}
        </div>
      )}

      {/* VIEW C: Real-time Telemetry & CloudWatch Metrics (Default Incident View) */}
      {!card.git_patch && !card.postmortem_markdown && !card.culprit_data && !card.blast_radius_data && (
        <>
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
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: '700', color: '#fbbf24', fontSize: '0.78rem' }}>
                    VOICE 2FA AUTHORIZATION GATE
                  </span>
                  <span style={{ fontSize: '0.62rem', padding: '1px 4px', borderRadius: '3px', background: 'rgba(245,158,11,0.25)', color: '#fef3c7', fontWeight: '700' }}>
                    MUTATION INTERLOCK
                  </span>
                  <span style={{ fontSize: '0.6rem', padding: '1px 5px', borderRadius: '3px', background: 'rgba(16, 185, 129, 0.2)', color: '#6ee7b7', fontWeight: '700', border: '1px solid rgba(16, 185, 129, 0.35)' }}>
                    ✓ {card.voice_biometric || 'VoiceID: SRE-Primary-OnCall (99.4%)'}
                  </span>
                </div>

                <div style={{ color: '#fed7aa', fontSize: '0.72rem', marginTop: '0.1rem' }}>
                  Target: Rollback <strong>{card.service}</strong> to <code>{card.target_revision}</code>.
                </div>

                <div style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.45rem',
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
                  <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>or PIN</span>
                  <code style={{ color: '#38bdf8', fontWeight: '800', background: 'rgba(0, 210, 255, 0.12)', padding: '1px 4px', borderRadius: '3px' }}>
                    {card.challenge_pin || '4921'}
                  </code>
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
        </>
      )}
    </div>
  );
}
