import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, Layers, CheckCircle2, AlertTriangle, Code2, Cpu, ArrowUpRight, Copy } from 'lucide-react';
import FlowPipeline from './FlowPipeline';

export default function AgentHUD({ toolTraces = [], state = 'STANDBY' }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copiedIdx, setCopiedIdx] = useState(null);

  const handleCopy = (trace, idx) => {
    navigator.clipboard.writeText(JSON.stringify(trace, null, 2));
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="glass-panel" style={{
      borderRadius: '16px',
      overflow: 'hidden',
      marginTop: '1.25rem',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(9, 14, 26, 0.85)'
    }}>
      {/* HUD Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '0.9rem 1.25rem',
          background: 'rgba(4, 7, 15, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.06)' : 'none',
          userSelect: 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
          <div style={{
            width: '26px',
            height: '26px',
            borderRadius: '6px',
            background: 'rgba(0, 210, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Layers size={15} color="#00d2ff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <span style={{ fontWeight: '700', fontSize: '0.88rem', color: '#f1f5f9' }}>
                MCP Streamable HTTP Agent Telemetry
              </span>
              <span style={{
                fontSize: '0.65rem',
                padding: '0.1rem 0.4rem',
                borderRadius: '4px',
                background: 'rgba(0, 210, 255, 0.1)',
                color: '#38bdf8',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: '600'
              }}>
                Spec 2025-11-25+
              </span>
            </div>
            <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
              Real-time JSON-RPC 2.0 tool invocation stream across AWS Boto3 & Bedrock
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{
            fontSize: '0.72rem',
            padding: '0.2rem 0.55rem',
            borderRadius: '9999px',
            background: toolTraces && toolTraces.length > 0 ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255,255,255,0.05)',
            color: toolTraces && toolTraces.length > 0 ? '#38bdf8' : '#94a3b8',
            fontFamily: 'JetBrains Mono',
            fontWeight: '600'
          }}>
            {toolTraces ? toolTraces.length : 0} Calls
          </span>
          {isExpanded ? <ChevronUp size={16} color="#94a3b8" /> : <ChevronDown size={16} color="#94a3b8" />}
        </div>
      </div>

      {/* Trace Items List */}
      {isExpanded && (
        <div style={{ padding: '0.85rem 1rem', background: 'rgba(4, 7, 15, 0.4)' }}>
          {/* Visual Architecture & Interaction Flow Pipeline */}
          <FlowPipeline toolTraces={toolTraces} state={state} />

          {(!toolTraces || toolTraces.length === 0) ? (
            <div style={{ color: '#64748b', fontSize: '0.78rem', fontStyle: 'italic', padding: '0.75rem', textAlign: 'center' }}>
              Standing by. Ask Alexa or select a voice prompt to monitor real-time Model Context Protocol execution.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {toolTraces.map((trace, idx) => {
                const isSafety = trace.status === 'SAFETY_GATE_TRIGGERED';
                const isExecuting = trace.status === 'EXECUTING';
                
                return (
                  <div 
                    key={idx}
                    style={{
                      background: 'rgba(11, 17, 30, 0.75)',
                      borderRadius: '8px',
                      padding: '0.75rem 0.9rem',
                      border: `1px solid ${
                        isExecuting 
                          ? 'rgba(0, 210, 255, 0.4)' 
                          : isSafety 
                          ? 'rgba(245, 158, 11, 0.35)' 
                          : 'rgba(255, 255, 255, 0.06)'
                      }`,
                      fontFamily: 'JetBrains Mono, monospace',
                      boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ color: '#64748b', fontSize: '0.72rem', fontWeight: '700' }}>
                          [{idx + 1}]
                        </span>
                        <Code2 size={13} color="#00d2ff" />
                        <span style={{ color: '#e2e8f0', fontWeight: '700', fontSize: '0.82rem' }}>
                          {trace.tool}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                        <div style={{
                          fontSize: '0.68rem',
                          fontWeight: '700',
                          padding: '0.15rem 0.5rem',
                          borderRadius: '4px',
                          background: isExecuting 
                            ? 'rgba(0, 210, 255, 0.18)' 
                            : isSafety 
                            ? 'rgba(245, 158, 11, 0.2)' 
                            : 'rgba(16, 185, 129, 0.2)',
                          color: isExecuting 
                            ? '#38bdf8' 
                            : isSafety 
                            ? '#fbbf24' 
                            : '#34d399',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '0.3rem'
                        }}>
                          {isExecuting ? <Layers size={11} style={{ animation: 'spin-glow 1.5s infinite linear' }} /> : isSafety ? <AlertTriangle size={11} /> : <CheckCircle2 size={11} />}
                          {isExecuting ? 'EXECUTING...' : trace.status}
                        </div>

                        <button
                          onClick={() => handleCopy(trace, idx)}
                          title="Copy JSON-RPC Trace"
                          style={{
                            background: 'transparent',
                            border: 'none',
                            color: copiedIdx === idx ? '#34d399' : '#64748b',
                            cursor: 'pointer',
                            padding: '2px 4px',
                            display: 'flex',
                            alignItems: 'center',
                            fontSize: '0.65rem'
                          }}
                        >
                          <Copy size={11} />
                        </button>
                      </div>
                    </div>

                    {/* Parameters Preview */}
                    {trace.parameters && Object.keys(trace.parameters).length > 0 && (
                      <div style={{ marginTop: '0.35rem', fontSize: '0.72rem', color: '#94a3b8' }}>
                        <span style={{ color: '#64748b' }}>input: </span>
                        <code style={{ color: '#cbd5e1' }}>{JSON.stringify(trace.parameters)}</code>
                      </div>
                    )}

                    {/* Output Preview */}
                    {trace.output && (
                      <div style={{ marginTop: '0.25rem', fontSize: '0.7rem', color: '#94a3b8', overflowX: 'auto' }}>
                        <span style={{ color: '#64748b' }}>output: </span>
                        <code style={{ color: isSafety ? '#fed7aa' : '#93c5fd' }}>
                          {typeof trace.output === 'object' 
                            ? JSON.stringify(trace.output).slice(0, 160) + (JSON.stringify(trace.output).length > 160 ? '...' : '')
                            : String(trace.output).slice(0, 160) + '...'}
                        </code>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
