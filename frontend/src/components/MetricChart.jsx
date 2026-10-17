import React, { useState } from 'react';
import { Activity, HardDrive, AlertTriangle, TrendingDown } from 'lucide-react';

export default function MetricChart({ state, currentRev }) {
  const [activeTab, setActiveTab] = useState('latency'); // 'latency' or 'memory'
  const isResolved = state === 'RESOLVED';

  // Points for Latency (p99 Response Time in ms)
  // Baseline ~45ms -> Spikes to 4,850ms at 03:12 -> Recovers to 42ms after rollback
  const latencyPoints = isResolved
    ? [
        { time: '03:00', val: 42, label: '42ms' },
        { time: '03:04', val: 48, label: '48ms' },
        { time: '03:08', val: 120, label: '120ms (v2.4.1 deployed)' },
        { time: '03:12', val: 4850, label: '4,850ms (OOM Spike)' },
        { time: '03:14', val: 3200, label: '3,200ms (Rollback initiated)' },
        { time: '03:15', val: 45, label: '45ms (v2.4.0 restored)' }
      ]
    : [
        { time: '03:00', val: 42, label: '42ms' },
        { time: '03:04', val: 48, label: '48ms' },
        { time: '03:08', val: 120, label: '120ms (v2.4.1 deployed)' },
        { time: '03:12', val: 4850, label: '4,850ms (CRITICAL ALARM)' },
        { time: '03:15', val: 4920, label: '4,920ms (Failing)' }
      ];

  // Points for Memory Utilization (%)
  const memoryPoints = isResolved
    ? [
        { time: '03:00', val: 38 },
        { time: '03:04', val: 42 },
        { time: '03:08', val: 74 },
        { time: '03:12', val: 98.4 },
        { time: '03:14', val: 68 },
        { time: '03:15', val: 36.2 }
      ]
    : [
        { time: '03:00', val: 38 },
        { time: '03:04', val: 42 },
        { time: '03:08', val: 74 },
        { time: '03:12', val: 98.4 },
        { time: '03:15', val: 99.1 }
      ];

  const points = activeTab === 'latency' ? latencyPoints : memoryPoints;
  const maxVal = activeTab === 'latency' ? 5200 : 100;
  
  // SVG coordinates calculation (width: 480, height: 120)
  const svgWidth = 480;
  const svgHeight = 120;
  const paddingX = 35;
  const paddingY = 15;

  const getX = (idx) => paddingX + (idx / (points.length - 1)) * (svgWidth - 2 * paddingX);
  const getY = (val) => svgHeight - paddingY - (val / maxVal) * (svgHeight - 2 * paddingY);

  // Generate SVG path string
  const pathD = points.reduce((acc, pt, idx) => {
    const x = getX(idx);
    const y = getY(pt.val);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  // Fill path closing at bottom
  const fillD = `${pathD} L ${getX(points.length - 1)} ${svgHeight - paddingY} L ${getX(0)} ${svgHeight - paddingY} Z`;

  // Color scheme
  const isAlarm = !isResolved;
  const strokeColor = activeTab === 'latency' 
    ? (isResolved ? '#10b981' : '#f43f5e') 
    : (isResolved ? '#38bdf8' : '#f59e0b');
  const gradientId = `grad-${activeTab}-${isResolved ? 'resolved' : 'alarm'}`;

  return (
    <div style={{
      background: 'rgba(8, 12, 22, 0.9)',
      borderRadius: '12px',
      border: '1px solid rgba(255, 255, 255, 0.07)',
      padding: '0.85rem 1rem',
      marginTop: '1rem',
      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.4)'
    }}>
      {/* Chart Header & Tab Toggles */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.6rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span style={{ fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: '700' }}>
            AWS CloudWatch Real-Time Telemetry
          </span>
          <span style={{
            fontSize: '0.65rem',
            padding: '0.1rem 0.4rem',
            borderRadius: '3px',
            background: isResolved ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
            color: isResolved ? '#34d399' : '#fb7185',
            fontWeight: '600'
          }}>
            {isResolved ? 'STATUS: HEALTHY' : 'STATUS: BREACHED'}
          </span>
        </div>

        {/* Tab Switcher */}
        <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '2px' }}>
          <button
            onClick={() => setActiveTab('latency')}
            style={{
              background: activeTab === 'latency' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeTab === 'latency' ? '#f8fafc' : '#94a3b8',
              border: 'none',
              padding: '0.2rem 0.6rem',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <Activity size={12} color={activeTab === 'latency' ? strokeColor : '#94a3b8'} />
            <span>Target Response Time</span>
          </button>
          <button
            onClick={() => setActiveTab('memory')}
            style={{
              background: activeTab === 'memory' ? 'rgba(255,255,255,0.1)' : 'transparent',
              color: activeTab === 'memory' ? '#f8fafc' : '#94a3b8',
              border: 'none',
              padding: '0.2rem 0.6rem',
              borderRadius: '4px',
              fontSize: '0.7rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.3rem'
            }}
          >
            <HardDrive size={12} color={activeTab === 'memory' ? strokeColor : '#94a3b8'} />
            <span>Memory Util</span>
          </button>
        </div>
      </div>

      {/* Primary Metric Number & Delta */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '0.5rem' }}>
        <div style={{ fontSize: '1.4rem', fontWeight: '800', color: strokeColor, fontFamily: 'JetBrains Mono, monospace' }}>
          {activeTab === 'latency' 
            ? (isResolved ? '45 ms' : '4,850 ms') 
            : (isResolved ? '36.2 %' : '98.4 %')}
        </div>
        <div style={{ fontSize: '0.75rem', color: isResolved ? '#34d399' : '#fb7185', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
          {isResolved ? (
            <>
              <TrendingDown size={14} />
              <span>-99.1% recovery post-rollback</span>
            </>
          ) : (
            <>
              <AlertTriangle size={14} />
              <span>+10,700% above 500ms p99 SLA threshold</span>
            </>
          )}
        </div>
      </div>

      {/* SVG Sparkline Graph */}
      <div style={{ position: 'relative', width: '100%', height: '110px' }}>
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} style={{ width: '100%', height: '100%', overflow: 'visible' }}>
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity="0.35" />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line x1={paddingX} y1={getY(maxVal * 0.75)} x2={svgWidth - paddingX} y2={getY(maxVal * 0.75)} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={getY(maxVal * 0.5)} x2={svgWidth - paddingX} y2={getY(maxVal * 0.5)} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />
          <line x1={paddingX} y1={getY(maxVal * 0.25)} x2={svgWidth - paddingX} y2={getY(maxVal * 0.25)} stroke="rgba(255,255,255,0.06)" strokeDasharray="3 3" />

          {/* Alarm SLA Threshold Line (500ms or 85% Mem) */}
          <line 
            x1={paddingX} 
            y1={getY(activeTab === 'latency' ? 500 : 85)} 
            x2={svgWidth - paddingX} 
            y2={getY(activeTab === 'latency' ? 500 : 85)} 
            stroke="#f43f5e" 
            strokeWidth="1" 
            strokeDasharray="4 4" 
            opacity="0.6"
          />
          <text 
            x={svgWidth - paddingX} 
            y={getY(activeTab === 'latency' ? 500 : 85) - 4} 
            fill="#f43f5e" 
            fontSize="8" 
            textAnchor="end" 
            fontFamily="JetBrains Mono"
            opacity="0.8"
          >
            {activeTab === 'latency' ? 'SLA 500ms THRESHOLD' : '85% OOM WARNING'}
          </text>

          {/* Gradient Area Fill */}
          <path d={fillD} fill={`url(#${gradientId})`} />

          {/* Metric Curve */}
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

          {/* Data Points */}
          {points.map((pt, idx) => {
            const cx = getX(idx);
            const cy = getY(pt.val);
            const isLast = idx === points.length - 1;
            const isSpike = idx === 3;

            return (
              <g key={idx}>
                <circle 
                  cx={cx} 
                  cy={cy} 
                  r={isLast ? 4 : isSpike ? 4.5 : 2.5} 
                  fill={isSpike ? '#f43f5e' : strokeColor} 
                  stroke="#080c16" 
                  strokeWidth="1.5" 
                />
                {/* Time labels below */}
                <text 
                  x={cx} 
                  y={svgHeight - 1} 
                  fill="#64748b" 
                  fontSize="8" 
                  textAnchor="middle" 
                  fontFamily="JetBrains Mono"
                >
                  {pt.time}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
