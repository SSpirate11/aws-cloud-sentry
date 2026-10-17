import React, { useState } from 'react';
import { Terminal, ChevronDown, ChevronUp, Layers, CheckCircle, AlertTriangle, Code2 } from 'lucide-react';

export default function AgentHUD({ toolTraces }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [selectedTool, setSelectedTool] = useState(null);

  return (
    <div className="glass-panel" style={{
      borderRadius: '16px',
      overflow: 'hidden',
      marginTop: '1.5rem',
      border: '1px solid rgba(255, 255, 255, 0.08)'
    }}>
      {/* HUD Header */}
      <div 
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '0.85rem 1.25rem',
          background: 'rgba(2, 6, 23, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          cursor: 'pointer',
          borderBottom: isExpanded ? '1px solid rgba(255, 255, 255, 0.06)' : 'none'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <Layers size={18} color="#00d2ff" />
          <span style={{ fontWeight: '600', fontSize: '0.9rem', color: '#f1f5f9' }}>
            Model Context Protocol (MCP) Live Agent Trace
          </span>
          <span style={{
            fontSize: '0.7rem',
            padding: '0.15rem 0.5rem',
            borderRadius: '4px',
            background: 'rgba(0, 210, 255, 0.12)',
            color: '#38bdf8',
            fontFamily: 'JetBrains Mono, monospace'
          }}>
            Spec 2025-11-25+ (Streamable HTTP)
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#94a3b8', fontSize: '0.8rem' }}>
          <span>{toolTraces ? toolTraces.length : 0} tool calls</span>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {/* Trace Items List */}
      {isExpanded && (
        <div style={{ padding: '1rem', background: 'rgba(2, 6, 23, 0.4)' }}>
          {(!toolTraces || toolTraces.length === 0) ? (
            <div style={{ color: '#64748b', fontSize: '0.8rem', fontStyle: 'italic', padding: '0.5rem' }}>
              No active tool calls. Speak to Alexa+ or trigger a quick scenario to view live MCP execution.
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
                            background: 'rgba(15, 23, 42, 0.7)',
                            borderRadius: '8px',
                            padding: '0.75rem',
                            border: `1px solid ${isExecuting ? 'rgba(0, 210, 255, 0.4)' : isSafety ? 'rgba(245, 158, 11, 0.3)' : 'rgba(255, 255, 255, 0.05)'}`,
                            fontFamily: 'JetBrains Mono, monospace'
                          }}
                        >
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                              <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>#{idx + 1}</span>
                              <Code2 size={14} color="#00d2ff" />
                              <span style={{ color: '#38bdf8', fontWeight: '600', fontSize: '0.85rem' }}>
                                {trace.tool}
                              </span>
                            </div>

                            <div style={{
                              fontSize: '0.7rem',
                              fontWeight: '600',
                              padding: '0.15rem 0.5rem',
                              borderRadius: '4px',
                              background: isExecuting ? 'rgba(0, 210, 255, 0.18)' : isSafety ? 'rgba(245, 158, 11, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                              color: isExecuting ? '#38bdf8' : isSafety ? '#fbbf24' : '#34d399',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '0.3rem',
                              animation: isExecuting ? 'pulse-fast 1s infinite' : 'none'
                            }}>
                              {isExecuting ? <Layers size={12} style={{ animation: 'spin-glow 1.5s infinite linear' }} /> : isSafety ? <AlertTriangle size={12} /> : <CheckCircle size={12} />}
                              {isExecuting ? 'EXECUTING...' : trace.status}
                            </div>
                          </div>

                    {/* Parameters Preview */}
                    {trace.parameters && Object.keys(trace.parameters).length > 0 && (
                      <div style={{ marginTop: '0.4rem', fontSize: '0.75rem', color: '#94a3b8' }}>
                        <span style={{ color: '#64748b' }}>Input: </span>
                        <code>{JSON.stringify(trace.parameters)}</code>
                      </div>
                    )}

                    {/* Output Preview */}
                    {trace.output && (
                      <div style={{ marginTop: '0.3rem', fontSize: '0.72rem', color: '#cbd5e1', overflowX: 'auto' }}>
                        <span style={{ color: '#64748b' }}>Output: </span>
                        <code>
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

