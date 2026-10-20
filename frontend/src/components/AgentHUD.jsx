import React, { useState, useEffect } from 'react';
import { Terminal, ChevronDown, ChevronUp, Layers, CheckCircle2, AlertTriangle, Code2, Cpu, ArrowUpRight, Copy, Activity, Workflow } from 'lucide-react';
import FlowPipeline from './FlowPipeline';
import LiveFlowchart from './LiveFlowchart';

export default function AgentHUD({ toolTraces = [], state = 'STANDBY' }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewType, setViewType] = useState('FLOWCHART'); // 'FLOWCHART', 'CARDS', or 'SCHEMA'
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [mcpSchemaTools, setMcpSchemaTools] = useState([]);

  useEffect(() => {
    fetch('/api/mcp-tools')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.tools)) {
          setMcpSchemaTools(data.tools);
        }
      })
      .catch(() => {});
  }, []);

  const handleCopy = (trace, idx) => {
    navigator.clipboard.writeText(JSON.stringify(trace, null, 2));
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  return (
    <div className="glass-panel" style={{
      borderRadius: '14px',
      overflow: 'hidden',
      height: '100%',
      display: 'flex',
      flexDirection: 'column',
      border: '1px solid rgba(255, 255, 255, 0.08)',
      background: 'rgba(9, 14, 26, 0.85)'
    }}>
      {/* HUD Header */}
      <div 
        style={{
          padding: '0.45rem 0.75rem',
          background: 'rgba(4, 7, 15, 0.7)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
          userSelect: 'none',
          flexShrink: 0
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          <div style={{
            width: '22px',
            height: '22px',
            borderRadius: '5px',
            background: 'rgba(0, 210, 255, 0.12)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <Layers size={13} color="#00d2ff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
              <span style={{ fontWeight: '700', fontSize: '0.78rem', color: '#f1f5f9' }}>
                MCP Agent Telemetry
              </span>
              <span style={{
                fontSize: '0.58rem',
                padding: '1px 4px',
                borderRadius: '3px',
                background: 'rgba(0, 210, 255, 0.1)',
                color: '#38bdf8',
                fontFamily: 'JetBrains Mono, monospace',
                fontWeight: '600'
              }}>
                Spec 2025-11-25+
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
          {/* Flow Diagram View Toggle */}
          <div 
            onClick={(e) => e.stopPropagation()} 
            style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '5px', padding: '1px' }}
          >
            <button
              onClick={() => setViewType('FLOWCHART')}
              style={{
                background: viewType === 'FLOWCHART' ? 'rgba(0, 210, 255, 0.25)' : 'transparent',
                color: viewType === 'FLOWCHART' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                borderRadius: '3px',
                fontSize: '0.62rem',
                fontWeight: '700',
                padding: '2px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title="Interactive Live Flowchart DAG"
            >
              <Workflow size={10} />
              <span>Flow</span>
            </button>
            <button
              onClick={() => setViewType('CARDS')}
              style={{
                background: viewType === 'CARDS' ? 'rgba(0, 210, 255, 0.25)' : 'transparent',
                color: viewType === 'CARDS' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                borderRadius: '3px',
                fontSize: '0.62rem',
                fontWeight: '700',
                padding: '2px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title="Compact Node Cards"
            >
              <Layers size={10} />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewType('SCHEMA')}
              style={{
                background: viewType === 'SCHEMA' ? 'rgba(0, 210, 255, 0.25)' : 'transparent',
                color: viewType === 'SCHEMA' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                borderRadius: '3px',
                fontSize: '0.62rem',
                fontWeight: '700',
                padding: '2px 6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '3px'
              }}
              title="Inspect Live Registered MCP Tool Schemas"
            >
              <Code2 size={10} />
              <span>MCP ({mcpSchemaTools.length || 9})</span>
            </button>
          </div>

          <span style={{
            fontSize: '0.65rem',
            padding: '1px 6px',
            borderRadius: '9999px',
            background: toolTraces && toolTraces.length > 0 ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255,255,255,0.05)',
            color: toolTraces && toolTraces.length > 0 ? '#38bdf8' : '#94a3b8',
            fontFamily: 'JetBrains Mono',
            fontWeight: '600'
          }}>
            {toolTraces ? toolTraces.length : 0} Calls
          </span>
        </div>
      </div>

      {/* Content Area: Pinned Flowchart + Scrollable Traces */}
      <div style={{
        padding: '0.45rem',
        background: 'rgba(4, 7, 15, 0.4)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        minHeight: 0
      }}>
        {/* Visual Architecture & Interaction Flow */}
        <div style={{ flexShrink: 0 }}>
          {viewType === 'FLOWCHART' ? (
            <LiveFlowchart toolTraces={toolTraces} state={state} />
          ) : viewType === 'CARDS' ? (
            <FlowPipeline toolTraces={toolTraces} state={state} />
          ) : (
            <div style={{
              background: 'rgba(11, 17, 30, 0.9)',
              borderRadius: '8px',
              border: '1px solid rgba(0, 210, 255, 0.25)',
              padding: '0.45rem 0.55rem',
              marginBottom: '0.4rem',
              maxHeight: '215px',
              overflowY: 'auto',
              fontFamily: 'JetBrains Mono, monospace'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                <span style={{ fontSize: '0.62rem', color: '#38bdf8', fontWeight: '700' }}>
                  GET /api/mcp-tools • Live MCPServer Registry
                </span>
                <span style={{ fontSize: '0.58rem', color: '#34d399' }}>Bedrock toolConfig Ready</span>
              </div>
              {mcpSchemaTools.map((t, i) => (
                <div key={i} style={{
                  padding: '0.28rem 0.4rem',
                  marginBottom: '0.25rem',
                  borderRadius: '5px',
                  background: 'rgba(4, 7, 15, 0.8)',
                  border: '1px solid rgba(255,255,255,0.06)'
                }}>
                  <div style={{ fontSize: '0.66rem', color: '#f8fafc', fontWeight: '700' }}>
                    {i + 1}. {t.name}
                  </div>
                  <div style={{ fontSize: '0.58rem', color: '#94a3b8', fontFamily: 'Inter, sans-serif' }}>
                    {t.description}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Real-time Tool Trace Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0.2rem 0.25rem 0.35rem 0.25rem',
          borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
          marginBottom: '0.35rem',
          flexShrink: 0
        }}>
          <span style={{ fontSize: '0.62rem', fontWeight: '700', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.05em' }}>
            Live JSON-RPC 2.0 Invocations
          </span>
          <span style={{ fontSize: '0.6rem', color: '#94a3b8', fontFamily: 'JetBrains Mono' }}>
            {toolTraces.length} recorded
          </span>
        </div>

        {/* Scrollable Trace Items List */}
        {(!toolTraces || toolTraces.length === 0) ? (
          <div style={{ color: '#64748b', fontSize: '0.72rem', fontStyle: 'italic', padding: '0.75rem', textAlign: 'center', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            Standing by. Ask Alexa to trigger Model Context Protocol tools.
          </div>
        ) : (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '0.35rem',
            flex: 1,
            overflowY: 'auto',
            paddingRight: '2px'
          }}>
            {toolTraces.map((trace, idx) => {
              const isSafety = trace.status === 'SAFETY_GATE_TRIGGERED';
              const isExecuting = trace.status === 'EXECUTING';
              
              return (
                <div 
                  key={idx}
                  style={{
                    background: 'rgba(11, 17, 30, 0.75)',
                    borderRadius: '6px',
                    padding: '0.4rem 0.6rem',
                    border: `1px solid ${
                      isExecuting 
                        ? 'rgba(0, 210, 255, 0.4)' 
                        : isSafety 
                        ? 'rgba(245, 158, 11, 0.35)' 
                        : 'rgba(255, 255, 255, 0.06)'
                    }`,
                    fontFamily: 'JetBrains Mono, monospace',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.25)'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.3rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                      <span style={{ color: '#64748b', fontSize: '0.65rem', fontWeight: '700' }}>
                        [{idx + 1}]
                      </span>
                      <Code2 size={11} color="#00d2ff" />
                      <span style={{ color: '#e2e8f0', fontWeight: '700', fontSize: '0.74rem' }}>
                        {trace.tool}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <div style={{
                        fontSize: '0.62rem',
                        fontWeight: '700',
                        padding: '1px 5px',
                        borderRadius: '3px',
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
                        gap: '0.2rem'
                      }}>
                        {isExecuting ? <Layers size={9} style={{ animation: 'spin-glow 1.5s infinite linear' }} /> : isSafety ? <AlertTriangle size={9} /> : <CheckCircle2 size={9} />}
                        {isExecuting ? 'RUNNING' : trace.status}
                      </div>

                      <button
                        onClick={() => handleCopy(trace, idx)}
                        title="Copy JSON-RPC Trace"
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: copiedIdx === idx ? '#34d399' : '#64748b',
                          cursor: 'pointer',
                          padding: '1px 3px',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        <Copy size={10} />
                      </button>
                    </div>
                  </div>

                  {/* Parameters Preview */}
                  {trace.parameters && Object.keys(trace.parameters).length > 0 && (
                    <div style={{ marginTop: '0.2rem', fontSize: '0.65rem', color: '#94a3b8' }}>
                      <span style={{ color: '#64748b' }}>in: </span>
                      <code style={{ color: '#cbd5e1' }}>{JSON.stringify(trace.parameters)}</code>
                    </div>
                  )}

                  {/* Output Preview */}
                  {trace.output && (
                    <div style={{ marginTop: '0.15rem', fontSize: '0.64rem', color: '#94a3b8', overflowX: 'auto' }}>
                      <span style={{ color: '#64748b' }}>out: </span>
                      <code style={{ color: isSafety ? '#fed7aa' : '#93c5fd' }}>
                        {typeof trace.output === 'object' 
                          ? JSON.stringify(trace.output).slice(0, 140) + (JSON.stringify(trace.output).length > 140 ? '...' : '')
                          : String(trace.output).slice(0, 140) + '...'}
                      </code>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
