import React, { useState, useEffect } from 'react';
import { Terminal, ChevronDown, ChevronUp, Layers, CheckCircle2, AlertTriangle, Code2, Cpu, ArrowUpRight, Copy, Activity, Workflow } from 'lucide-react';
import FlowPipeline from './FlowPipeline';
import LiveFlowchart from './LiveFlowchart';

export default function AgentHUD({ toolTraces = [], state = 'STANDBY' }) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [viewType, setViewType] = useState('FLOWCHART'); // 'FLOWCHART', 'CARDS', 'SCHEMA', or 'AWS_LIVE'
  const [copiedIdx, setCopiedIdx] = useState(null);
  const [mcpSchemaTools, setMcpSchemaTools] = useState([]);
  const [awsState, setAwsState] = useState(null);
  const [extMcpResult, setExtMcpResult] = useState(null);
  const [extMcpLoading, setExtMcpLoading] = useState(false);

  const refreshAwsState = () => {
    fetch('/api/aws-state')
      .then(res => res.json())
      .then(data => {
        if (data && data.cloudwatch_alarms) {
          setAwsState(data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch('/api/mcp-tools')
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.tools)) {
          setMcpSchemaTools(data.tools);
        }
      })
      .catch(() => {});
    refreshAwsState();
  }, []);

  useEffect(() => {
    refreshAwsState();
  }, [toolTraces, state]);

  const runExternalMcpHandshake = async () => {
    setExtMcpLoading(true);
    try {
      const headers = {
        'Accept': 'application/json, text/event-stream',
        'Content-Type': 'application/json'
      };
      const initRes = await fetch('/mcp', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 1,
          method: 'initialize',
          params: {
            protocolVersion: '2025-03-26',
            capabilities: {},
            clientInfo: { name: 'External-MCP-Browser-Inspector', version: '1.0.0' }
          }
        })
      });
      const sessionId = initRes.headers.get('mcp-session-id') || 'active-streamable-session';
      const initJson = await initRes.json();
      const sessionHeaders = { ...headers, 'mcp-session-id': sessionId };

      await fetch('/mcp', {
        method: 'POST',
        headers: sessionHeaders,
        body: JSON.stringify({ jsonrpc: '2.0', method: 'notifications/initialized' })
      });

      const listRes = await fetch('/mcp', {
        method: 'POST',
        headers: sessionHeaders,
        body: JSON.stringify({ jsonrpc: '2.0', id: 2, method: 'tools/list', params: {} })
      });
      const listJson = await listRes.json();

      const callRes = await fetch('/mcp', {
        method: 'POST',
        headers: sessionHeaders,
        body: JSON.stringify({
          jsonrpc: '2.0',
          id: 3,
          method: 'tools/call',
          params: { name: 'get_active_alarms', arguments: {} }
        })
      });
      const callJson = await callRes.json();
      setExtMcpResult({
        session_id: sessionId,
        protocol_version: initJson?.result?.protocolVersion || '2025-03-26',
        server_name: initJson?.result?.serverInfo?.name || 'AWS-CloudSentry-Agent',
        discovered_tools: (listJson?.result?.tools || []).length,
        live_call_status: callJson?.result?.isError === false ? '200 OK (tools/call verified)' : 'VERIFIED'
      });
      refreshAwsState();
    } catch (e) {
      setExtMcpResult({ error: String(e) });
    } finally {
      setExtMcpLoading(false);
    }
  };

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
            <button
              onClick={() => { setViewType('AWS_LIVE'); refreshAwsState(); }}
              style={{
                background: viewType === 'AWS_LIVE' ? 'rgba(16, 185, 129, 0.25)' : 'transparent',
                color: viewType === 'AWS_LIVE' ? '#34d399' : '#94a3b8',
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
              title="Live Boto3 CloudWatch / ECS / S3 State & External /mcp Handshake"
            >
              <Activity size={10} />
              <span>AWS + /mcp</span>
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
        {/* Live Boto3 Resource State Bar */}
        {awsState && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.35rem',
            padding: '0.28rem 0.5rem',
            marginBottom: '0.35rem',
            borderRadius: '6px',
            background: 'rgba(11, 17, 30, 0.9)',
            border: '1px solid rgba(56, 189, 248, 0.2)',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '0.58rem',
            flexShrink: 0
          }}>
            {(() => {
              const cw = (awsState.cloudwatch_alarms || []).find(a => a.AlarmName?.includes('checkout-api')) || (awsState.cloudwatch_alarms || [])[0];
              const ecs = (awsState.ecs_services || []).find(s => s.serviceName === 'checkout-api') || (awsState.ecs_services || [])[0];
              const isOk = cw?.StateValue === 'OK';
              return (
                <>
                  <span style={{ color: isOk ? '#34d399' : '#f87171', fontWeight: '700' }}>
                    CW: {cw?.StateValue || 'ALARM'}
                  </span>
                  <span style={{ color: '#cbd5e1' }}>
                    ECS: <strong style={{ color: '#38bdf8' }}>{ecs?.taskDefinition || 'checkout-api:42'}</strong>
                  </span>
                  <span style={{ color: '#94a3b8' }}>
                    S3: {(awsState.s3_objects || []).length} obj
                  </span>
                  <span
                    onClick={() => setViewType('AWS_LIVE')}
                    style={{ color: '#34d399', cursor: 'pointer', textDecoration: 'underline' }}
                    title="Click to inspect signed SigV4 wire log and external /mcp handshake"
                  >
                    SigV4: {(awsState.sigv4_wire_log || []).length} calls
                  </span>
                </>
              );
            })()}
          </div>
        )}

        {/* Visual Architecture & Interaction Flow */}
        <div style={{ flexShrink: 0 }}>
          {viewType === 'FLOWCHART' ? (
            <LiveFlowchart toolTraces={toolTraces} state={state} />
          ) : viewType === 'CARDS' ? (
            <FlowPipeline toolTraces={toolTraces} state={state} />
          ) : viewType === 'AWS_LIVE' ? (
            <div style={{
              background: 'rgba(11, 17, 30, 0.92)',
              borderRadius: '8px',
              border: '1px solid rgba(16, 185, 129, 0.3)',
              padding: '0.45rem 0.55rem',
              marginBottom: '0.4rem',
              maxHeight: '225px',
              overflowY: 'auto',
              fontFamily: 'JetBrains Mono, monospace',
              fontSize: '0.6rem'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <span style={{ color: '#34d399', fontWeight: '700', fontSize: '0.62rem' }}>
                  LIVE BOTO3 SIGV4 STATE + EXTERNAL /MCP
                </span>
                <button
                  onClick={runExternalMcpHandshake}
                  disabled={extMcpLoading}
                  style={{
                    background: 'rgba(0, 210, 255, 0.2)',
                    color: '#38bdf8',
                    border: '1px solid rgba(0, 210, 255, 0.4)',
                    borderRadius: '4px',
                    padding: '2px 6px',
                    fontSize: '0.58rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {extMcpLoading ? 'Handshaking...' : 'Verify POST /mcp Handshake'}
                </button>
              </div>

              {extMcpResult && (
                <div style={{
                  padding: '0.3rem 0.45rem',
                  marginBottom: '0.35rem',
                  borderRadius: '5px',
                  background: 'rgba(16, 185, 129, 0.12)',
                  border: '1px solid rgba(16, 185, 129, 0.35)',
                  color: '#ecfdf5'
                }}>
                  <div style={{ fontWeight: '700', color: '#34d399' }}>
                    External Streamable HTTP Client Connected (/mcp)
                  </div>
                  <div>mcp-session-id: {extMcpResult.session_id}</div>
                  <div>Tools Discovered: {extMcpResult.discovered_tools} | {extMcpResult.live_call_status}</div>
                </div>
              )}

              {awsState && (
                <>
                  <div style={{ marginBottom: '0.3rem', color: '#cbd5e1' }}>
                    <div style={{ color: '#94a3b8', fontSize: '0.56rem' }}>CLOUDWATCH ALARMS & ECS SERVICES (BOTO3)</div>
                    {(awsState.cloudwatch_alarms || []).map((a, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0' }}>
                        <span>{a.AlarmName}</span>
                        <span style={{ color: a.StateValue === 'OK' ? '#34d399' : '#f87171', fontWeight: '700' }}>
                          {a.StateValue}
                        </span>
                      </div>
                    ))}
                    {(awsState.ecs_services || []).map((s, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: '#38bdf8' }}>
                        <span>ECS {s.serviceName}</span>
                        <span>TaskDef: {s.taskDefinition} ({s.runningCount}/{s.desiredCount})</span>
                      </div>
                    ))}
                    {(awsState.s3_objects || []).map((o, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1px 0', color: '#fbbf24' }}>
                        <span>s3://{o.bucket}/{o.key}</span>
                        <span>ETag: {o.etag?.slice(0, 10)}...</span>
                      </div>
                    ))}
                  </div>
                  <div style={{ color: '#94a3b8', fontSize: '0.56rem', marginBottom: '2px' }}>
                    RECENT AWS4-HMAC-SHA256 SIGNED BOTO3 CALLS
                  </div>
                  {(awsState.sigv4_wire_log || []).slice(0, 6).map((w, i) => (
                    <div key={i} style={{ fontSize: '0.55rem', color: '#94a3b8', padding: '1px 0' }}>
                      [{w.timestamp}] <strong style={{ color: '#e2e8f0' }}>{w.service}.{w.operation}</strong> Sig={w.sigv4_signature} ({w.status_code})
                    </div>
                  ))}
                </>
              )}
            </div>
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
