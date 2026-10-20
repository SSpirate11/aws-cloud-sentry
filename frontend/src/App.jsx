import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, VolumeX, RotateCcw, Shield, Cloud, Terminal, 
  CheckCircle2, AlertOctagon, Sparkles, Radio, Moon, Clock, Monitor, 
  Smartphone, ChevronRight, Send, AlertTriangle, ShieldCheck, Zap
} from 'lucide-react';
import EchoRing from './components/EchoRing';
import Echo3D from './components/Echo3D';
import DisplayCard from './components/DisplayCard';
import AgentHUD from './components/AgentHUD';
import AudioWaveform from './components/AudioWaveform';

export default function App() {
  const [state, setState] = useState('STANDBY'); // STANDBY, LISTENING, THINKING, INCIDENT_ACTIVE, AWAITING_CONFIRMATION, RESOLVED
  const [echoMode, setEchoMode] = useState('3D'); // '3D' or '2D'
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [wakeWordEnabled, setWakeWordEnabled] = useState(true);
  const [wakeDetected, setWakeDetected] = useState(false);
  const [viewMode, setViewMode] = useState('DUAL'); // 'DUAL' or 'ECHO_SHOW'
  const [currentTime, setCurrentTime] = useState('03:15:00 AM');
  const [customInput, setCustomInput] = useState('');
  const [revenueLost, setRevenueLost] = useState(12825); // $142.50/s since 03:13:30 AM
  
  const [userTranscript, setUserTranscript] = useState('');
  const [spokenResponse, setSpokenResponse] = useState("AWS CloudSentry initialized. Say 'Alexa' or ask what is failing in production.");
  const [displayCard, setDisplayCard] = useState({
    title: "AWS CloudSentry Ready",
    badge: "STANDBY",
    badge_color: "blue",
    status_message: "Say 'Alexa, what is failing in production?' to inspect CloudWatch alarms."
  });
  const [toolTraces, setToolTraces] = useState([]);
  
  const recognitionRef = useRef(null);
  const stateRef = useRef(state);
  const isSpeakingRef = useRef(isSpeaking);
  const wakeWordActiveRef = useRef(wakeWordEnabled);
  const isQueryInProgressRef = useRef(false);
  const isRecognizingRef = useRef(false);
  const lastChimeTimeRef = useRef(0);
  const speechSilenceTimerRef = useRef(null);
  const wakeTriggeredRef = useRef(false);
  const audioCtxRef = useRef(null);

  // Synchronous state transition helper to eliminate React async render race conditions
  const updateState = (newState) => {
    stateRef.current = newState;
    setState(newState);
  };

  // Sync ref mirrors
  stateRef.current = state;
  isSpeakingRef.current = isSpeaking;
  wakeWordActiveRef.current = wakeWordEnabled;

  // Single source of truth: isListening is true ONLY when state is 'LISTENING'
  const isListening = (state === 'LISTENING');

  // Authentic Amazon Echo dual-tone acoustic wake chime (G5 784Hz -> C6 1046Hz) - Debounced
  const playAlexaChime = () => {
    const now = Date.now();
    // Guard against multiple noise / rapid repeating chimes within 3.5 seconds
    if (now - lastChimeTimeRef.current < 3500) return;
    lastChimeTimeRef.current = now;

    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return;
      if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.connect(gain);
      gain.connect(ctx.destination);
      
      const audioTime = ctx.currentTime;
      osc.frequency.setValueAtTime(784, audioTime); // G5 note
      osc.frequency.setValueAtTime(1046, audioTime + 0.08); // C6 note
      gain.gain.setValueAtTime(0.12, audioTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, audioTime + 0.32);
      
      osc.start(audioTime);
      osc.stop(audioTime + 0.32);
    } catch (e) {
      // AudioContext may require user gesture on first interaction
    }
  };

  // Live 3 AM digital clock ticker + FinOps Revenue Burn-Rate Ticker ($142.50/sec)
  useEffect(() => {
    let seconds = 0;
    const interval = setInterval(() => {
      seconds++;
      const s = String(seconds % 60).padStart(2, '0');
      const m = String(15 + Math.floor(seconds / 60)).padStart(2, '0');
      setCurrentTime(`03:${m}:${s} AM`);
      if (stateRef.current !== 'RESOLVED' && stateRef.current !== 'CODE_FIX_READY' && stateRef.current !== 'POSTMORTEM_GENERATED') {
        setRevenueLost(prev => prev + 142.5);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  // Proactive 3 AM PagerDuty Wake-Up Siren & Alert Push
  const triggerProactive3AMPage = async () => {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          audioCtxRef.current = new AudioCtx();
        }
        const ctx = audioCtxRef.current;
        if (ctx.state === 'suspended') ctx.resume();
        const now = ctx.currentTime;
        [0, 0.22].forEach((offset) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          osc.type = 'sawtooth';
          osc.connect(gain);
          gain.connect(ctx.destination);
          osc.frequency.setValueAtTime(880, now + offset);
          osc.frequency.setValueAtTime(660, now + offset + 0.09);
          gain.gain.setValueAtTime(0.09, now + offset);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.19);
          osc.start(now + offset);
          osc.stop(now + offset + 0.19);
        });
      }
    } catch (e) {}

    updateState('THINKING');
    setUserTranscript('[PROACTIVE 3:14 AM PAGERDUTY CLOUDWATCH SNS WAKE-UP PUSH]');
    try {
      const res = await fetch('/api/proactive-alert', { method: 'POST' });
      const data = await res.json();
      setToolTraces(data.tool_traces || []);
      setDisplayCard(data.display_card);
      setSpokenResponse(data.spoken_response);
      updateState(data.state || 'INCIDENT_ACTIVE');
      speakText(data.spoken_response);
    } catch (e) {
      updateState('INCIDENT_ACTIVE');
    }
  };

  // Auto-timeout for LISTENING state (like real Amazon Echo: returns to sleep after 8s of silence)
  useEffect(() => {
    if (state === 'LISTENING') {
      const timer = setTimeout(() => {
        if (!isQueryInProgressRef.current) {
          wakeTriggeredRef.current = false;
          updateState('STANDBY');
        }
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [state]);

  // Web Speech API with Natural "Alexa" Wake Word Detection & Intent Dispatching
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onstart = () => {
      isRecognizingRef.current = true;
    };

    recognition.onresult = (event) => {
      // Ignore audio while Alexa is speaking or backend query is in progress
      if (isSpeakingRef.current || isQueryInProgressRef.current || stateRef.current === 'THINKING') return;

      let fullTranscript = '';
      let hasFinal = false;

      for (let i = 0; i < event.results.length; ++i) {
        fullTranscript += event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          hasFinal = true;
        }
      }

      const rawText = fullTranscript.trim();
      if (!rawText) return;

      const hasWakeWord = /\b(alexa|alex|alexis|alexia|hey alexa|hey alex|echo|computer)\b/i.test(rawText);

      // Strip wake word to extract genuine command
      const commandText = rawText
        .replace(/^(hey\s+)?(alexa|alex|alexis|alexia|computer|echo)[,\s]*/i, '')
        .trim();

      // 1. Wake phrase triggered
      if (hasWakeWord) {
        if (!wakeTriggeredRef.current) {
          wakeTriggeredRef.current = true;
          playAlexaChime();
          setWakeDetected(true);
          if (stateRef.current !== 'AWAITING_CONFIRMATION') {
            updateState('LISTENING');
          }
          setTimeout(() => setWakeDetected(false), 2200);
        }
      }

      // 2. Direct Confirmation handling for Voice 2FA
      if (stateRef.current === 'AWAITING_CONFIRMATION') {
        if (/\b(confirm|yes|authorize|proceed|rollback)\b/i.test(rawText)) {
          clearTimeout(speechSilenceTimerRef.current);
          handleSendQuery(rawText);
          return;
        }
      }

      // 3. Command extraction: Only dispatch if user has spoken an ACTUAL command, NOT just the wake word!
      const isJustWakeWord = !commandText || /^(alexa|alex|alexis|alexia|echo|computer)$/i.test(commandText);

      if (!isJustWakeWord && commandText.length >= 3) {
        // User spoke an actual instruction after or with the wake word!
        clearTimeout(speechSilenceTimerRef.current);

        // Debounced dispatch after speech pause
        speechSilenceTimerRef.current = setTimeout(() => {
          if (!isQueryInProgressRef.current && (hasWakeWord || stateRef.current === 'LISTENING')) {
            handleSendQuery(rawText);
          }
        }, 950);

        // Immediate dispatch if speech engine marked this command final and it contains multiple words
        if (hasFinal && commandText.split(/\s+/).length >= 2) {
          clearTimeout(speechSilenceTimerRef.current);
          handleSendQuery(rawText);
        }
      }
    };

    recognition.onerror = (event) => {
      if (event.error !== 'no-speech') {
        console.warn('Speech recognition notice:', event.error);
      }
      if (stateRef.current === 'LISTENING' && !wakeTriggeredRef.current) {
        updateState('STANDBY');
      }
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      // Critical guard: never change state or restart if query is running or Alexa is speaking!
      if (isQueryInProgressRef.current || isSpeakingRef.current || stateRef.current === 'THINKING') {
        return;
      }

      // Automatically maintain hands-free background listening if wake word is active
      if (wakeWordActiveRef.current) {
        setTimeout(() => {
          if (!isRecognizingRef.current && !isQueryInProgressRef.current && !isSpeakingRef.current && stateRef.current !== 'THINKING') {
            try {
              recognition.start();
            } catch (e) {}
          }
        }, 250);
      }
    };

    recognitionRef.current = recognition;

    // Start background listening
    if (wakeWordEnabled && !isSpeakingRef.current && !isRecognizingRef.current) {
      try {
        recognition.start();
      } catch (e) {}
    }

    // First user gesture listener to unlock audio & mic on browser autoplay/permissions policy
    const handleFirstGesture = () => {
      try {
        if (!audioCtxRef.current || audioCtxRef.current.state === 'closed') {
          const AudioCtx = window.AudioContext || window.webkitAudioContext;
          if (AudioCtx) audioCtxRef.current = new AudioCtx();
        }
        if (audioCtxRef.current?.state === 'suspended') {
          audioCtxRef.current.resume();
        }
      } catch (e) {}

      if (wakeWordActiveRef.current && !isRecognizingRef.current && !isSpeakingRef.current && stateRef.current !== 'THINKING') {
        try {
          recognition.start();
        } catch (e) {}
      }
    };

    window.addEventListener('click', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
      try {
        recognition.stop();
      } catch (e) {}
    };
  }, [wakeWordEnabled]);

  // Text to Speech using browser SpeechSynthesis
  const speakText = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) {
      handleSpeechDone();
      return;
    }
    
    // Temporarily pause recognition while speaking to prevent self-triggering
    try {
      recognitionRef.current?.stop();
    } catch (e) {}

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    const preferredVoice = voices.find(v => 
      v.name.includes("Google US English") || 
      v.name.includes("Natural") || 
      v.name.includes("Samantha") ||
      v.lang === "en-US"
    );
    if (preferredVoice) utterance.voice = preferredVoice;

    utterance.onstart = () => {
      setIsSpeaking(true);
      isSpeakingRef.current = true;
    };

    utterance.onend = handleSpeechDone;
    utterance.onerror = handleSpeechDone;

    window.speechSynthesis.speak(utterance);
  };

  const handleSpeechDone = () => {
    setIsSpeaking(false);
    isSpeakingRef.current = false;
    isQueryInProgressRef.current = false;
    wakeTriggeredRef.current = false;

    // Safely resume wake-word listening after speech completes
    if (wakeWordActiveRef.current && recognitionRef.current && stateRef.current !== 'THINKING') {
      setTimeout(() => {
        if (!isRecognizingRef.current && !isSpeakingRef.current && !isQueryInProgressRef.current && stateRef.current !== 'THINKING') {
          try {
            recognitionRef.current.start();
          } catch (e) {}
        }
      }, 350);
    }
  };

  const toggleMic = () => {
    if (state === 'LISTENING') {
      clearTimeout(speechSilenceTimerRef.current);
      wakeTriggeredRef.current = false;
      updateState('STANDBY');
      try {
        recognitionRef.current?.stop();
      } catch (e) {}
    } else {
      playAlexaChime();
      wakeTriggeredRef.current = true;
      updateState('LISTENING');
      if (recognitionRef.current) {
        if (!isRecognizingRef.current) {
          try {
            recognitionRef.current.start();
          } catch (e) {
            console.warn('Mic start notice:', e);
          }
        }
      } else {
        alert("Web Speech API is not supported in this browser. Please use Chrome/Edge or click a voice suggestion.");
      }
    }
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Progressive cognitive agent turn-taking dispatcher
  const handleSendQuery = async (queryText) => {
    if (!queryText || !queryText.trim() || isQueryInProgressRef.current) return;
    
    clearTimeout(speechSilenceTimerRef.current);
    isQueryInProgressRef.current = true;
    updateState('THINKING');
    
    try {
      recognitionRef.current?.stop();
    } catch (e) {}

    setUserTranscript(queryText);
    setToolTraces([]);
    setSpokenResponse("Querying AWS infrastructure & analyzing telemetry...");
    setCustomInput('');

    try {
      const res = await fetch('/api/voice-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText })
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      const rawTraces = data.tool_traces || [];

      // Progressive sequential tool execution for natural SRE pacing
      const currentTraces = [];
      for (let i = 0; i < rawTraces.length; i++) {
        const item = rawTraces[i];
        
        // Show tool in EXECUTING state
        const executingItem = { ...item, status: 'EXECUTING', output: 'Connecting to AWS API...' };
        currentTraces.push(executingItem);
        setToolTraces([...currentTraces]);
        
        await sleep(550);

        // Resolve to real output
        currentTraces[i] = item;
        setToolTraces([...currentTraces]);
        await sleep(200);
      }

      await sleep(250);

      setDisplayCard(data.display_card);
      setSpokenResponse(data.spoken_response);
      const nextState = data.state || 'STANDBY';
      updateState(nextState);

      speakText(data.spoken_response);
    } catch (err) {
      console.error('Error communicating with agent backend:', err);
      setSpokenResponse("Unable to reach CloudSentry MCP backend. Check server status on port 8000.");
      updateState('STANDBY');
      isQueryInProgressRef.current = false;
      wakeTriggeredRef.current = false;
    }
  };

  const resetIncident = async () => {
    try {
      clearTimeout(speechSilenceTimerRef.current);
      isQueryInProgressRef.current = false;
      wakeTriggeredRef.current = false;
      await fetch('/api/reset', { method: 'POST' });
      setUserTranscript('');
      setSpokenResponse("Incident scenario reset. Ready for demonstration.");
      setDisplayCard({
        title: "AWS CloudSentry Ready",
        badge: "STANDBY",
        badge_color: "blue",
        status_message: "Say 'Alexa, what is failing in production?' to inspect CloudWatch alarms."
      });
      setToolTraces([]);
      updateState('STANDBY');
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  return (
    <div style={{ 
      width: '100vw',
      height: '100vh',
      maxHeight: '100vh',
      overflow: 'hidden',
      boxSizing: 'border-box',
      padding: '0.4rem 0.65rem',
      display: 'flex', 
      flexDirection: 'column',
      background: '#070a11'
    }}>
      
      {/* Top Ambient Nightstand & Operational Status Bar */}
      <header className="glass-panel" style={{
        borderRadius: '10px',
        padding: '0.35rem 0.75rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '0.6rem',
        marginBottom: '0.4rem',
        border: '1px solid rgba(255, 255, 255, 0.08)',
        flexShrink: 0
      }}>
        {/* Left: 3 AM Bedside Clock & Emergency On-Call Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '7px',
              background: 'linear-gradient(135deg, #00d2ff, #0055ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 12px rgba(0, 210, 255, 0.35)'
            }}>
              <Shield size={16} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ fontSize: '0.92rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#f8fafc' }}>
                  CloudSentry
                </span>
                <span style={{
                  fontSize: '0.58rem',
                  padding: '1px 4px',
                  borderRadius: '3px',
                  background: 'rgba(0, 210, 255, 0.15)',
                  color: '#38bdf8',
                  fontWeight: '700'
                }}>
                  Alexa+
                </span>
              </div>
              <div style={{ fontSize: '0.62rem', color: '#64748b', lineHeight: '1' }}>
                Voice Incident Commander for AWS SREs
              </div>
            </div>
          </div>

          <div style={{ height: '18px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />

          {/* Realistic 3 AM Bedside Clock & Live FinOps Revenue Bleed Ticker */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Moon size={12} color="#f59e0b" />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.78rem', fontWeight: '700', color: '#f8fafc' }}>
              {currentTime}
            </span>
            <span style={{
              fontSize: '0.64rem',
              fontFamily: 'JetBrains Mono, monospace',
              fontWeight: '700',
              padding: '2px 6px',
              borderRadius: '5px',
              background: (state === 'RESOLVED' || state === 'CODE_FIX_READY' || state === 'POSTMORTEM_GENERATED')
                ? 'rgba(16, 185, 129, 0.16)'
                : 'rgba(244, 63, 94, 0.16)',
              border: `1px solid ${(state === 'RESOLVED' || state === 'CODE_FIX_READY' || state === 'POSTMORTEM_GENERATED') ? 'rgba(16, 185, 129, 0.4)' : 'rgba(244, 63, 94, 0.4)'}`,
              color: (state === 'RESOLVED' || state === 'CODE_FIX_READY' || state === 'POSTMORTEM_GENERATED') ? '#34d399' : '#fda4af'
            }}
            title="Real-time E-Commerce Checkout Revenue Impact ($142.50/sec bleed vs 18m manual MTTR)"
            >
              {(state === 'RESOLVED' || state === 'CODE_FIX_READY' || state === 'POSTMORTEM_GENERATED')
                ? (displayCard?.revenue_saved || 'Downtime Avoided (vs 18m baseline)')
                : `Est. Loss: -$${revenueLost.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} (-$142/s)`}
            </span>
            <button
              onClick={triggerProactive3AMPage}
              style={{
                background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.25), rgba(225, 29, 72, 0.15))',
                border: '1px solid rgba(244, 63, 94, 0.5)',
                color: '#fecdd3',
                borderRadius: '6px',
                padding: '2px 7px',
                fontSize: '0.64rem',
                fontWeight: '800',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}
              title="Simulate a Proactive 3 AM Sev-1 Wake-Up Page where Alexa+ wakes up the sleeping SRE first!"
            >
              <Zap size={10} color="#fb7185" />
              <span>3 AM Page</span>
            </button>
          </div>
        </div>

        {/* Right: Wake Word Toggle, View Mode, Audio Toggle, Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
          
          {/* "Alexa" Wake Word Toggle Pill */}
          <button
            onClick={() => {
              const next = !wakeWordEnabled;
              setWakeWordEnabled(next);
              wakeWordActiveRef.current = next;
              if (next) {
                playAlexaChime();
                try {
                  if (!isRecognizingRef.current) recognitionRef.current?.start();
                } catch (e) {}
              } else {
                try {
                  recognitionRef.current?.stop();
                } catch (e) {}
              }
            }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              padding: '0.25rem 0.55rem',
              borderRadius: '9999px',
              background: wakeWordEnabled ? 'rgba(0, 210, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${wakeWordEnabled ? 'rgba(0, 210, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
              color: wakeWordEnabled ? '#00d2ff' : '#94a3b8',
              fontSize: '0.68rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="Toggle Hands-Free Voice Control"
          >
            <Radio size={11} color={wakeWordEnabled ? '#00d2ff' : '#64748b'} />
            <span>Hands-Free Mic</span>
            <span style={{
              fontSize: '0.55rem',
              padding: '1px 3px',
              borderRadius: '3px',
              background: wakeWordEnabled ? 'rgba(0, 210, 255, 0.25)' : 'rgba(255,255,255,0.08)',
              color: wakeWordEnabled ? '#e0f2fe' : '#94a3b8'
            }}>
              {wakeWordEnabled ? 'ACTIVE' : 'MUTED'}
            </span>
          </button>

          {/* Active Incident Warning Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.35rem',
            padding: '0.25rem 0.55rem',
            borderRadius: '9999px',
            background: (state === 'RESOLVED' || state === 'CODE_FIX_READY' || state === 'POSTMORTEM_GENERATED')
              ? 'rgba(16, 185, 129, 0.15)' 
              : state === 'AWAITING_CONFIRMATION'
              ? 'rgba(245, 158, 11, 0.15)'
              : state === 'STANDBY'
              ? 'rgba(0, 210, 255, 0.15)'
              : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${
              (state === 'RESOLVED' || state === 'CODE_FIX_READY' || state === 'POSTMORTEM_GENERATED')
                ? 'rgba(16, 185, 129, 0.3)' 
                : state === 'AWAITING_CONFIRMATION'
                ? 'rgba(245, 158, 11, 0.3)'
                : state === 'STANDBY'
                ? 'rgba(0, 210, 255, 0.3)'
                : 'rgba(244, 63, 94, 0.3)'
            }`,
            fontSize: '0.68rem',
            color: (state === 'RESOLVED' || state === 'CODE_FIX_READY' || state === 'POSTMORTEM_GENERATED') 
              ? '#34d399' 
              : state === 'AWAITING_CONFIRMATION' 
              ? '#fbbf24' 
              : state === 'STANDBY'
              ? '#38bdf8'
              : '#fb7185',
            fontWeight: '600'
          }}>
            <span style={{
              width: '6px',
              height: '6px',
              borderRadius: '50%',
              background: 'currentColor',
              boxShadow: '0 0 5px currentColor'
            }} />
            <span>
              {state === 'CODE_FIX_READY'
                ? 'PR Draft Ready • fix/checkout-api'
                : state === 'POSTMORTEM_GENERATED'
                ? 'Post-Mortem Published • S3 & Slack'
                : state === 'RESOLVED' 
                ? 'All Alarms OK • Service Restored' 
                : state === 'AWAITING_CONFIRMATION'
                ? 'Pending Voice 2FA Rollback'
                : state === 'STANDBY'
                ? 'Standby • Ready for Alerts'
                : 'Sev-2 Page: checkout-api High Latency'}
            </span>
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', padding: '1px' }}>
            <button
              onClick={() => setViewMode('DUAL')}
              style={{
                background: viewMode === 'DUAL' ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                color: viewMode === 'DUAL' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
              title="Dual Screen: Echo Show + SRE Inspector"
            >
              <Monitor size={11} />
              <span>SRE Console</span>
            </button>
            <button
              onClick={() => setViewMode('ECHO_SHOW')}
              style={{
                background: viewMode === 'ECHO_SHOW' ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                color: viewMode === 'ECHO_SHOW' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                padding: '0.2rem 0.5rem',
                borderRadius: '4px',
                fontSize: '0.68rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.25rem'
              }}
              title="Echo Show 10 Smart Display Focus"
            >
              <Smartphone size={11} />
              <span>Echo Show Only</span>
            </button>
          </div>

          {/* Audio Output Mute Toggle */}
          <button
            onClick={() => {
              if (ttsEnabled) window.speechSynthesis.cancel();
              setTtsEnabled(!ttsEnabled);
            }}
            style={{
              background: ttsEnabled ? 'rgba(0, 210, 255, 0.12)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${ttsEnabled ? 'rgba(0,210,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: ttsEnabled ? '#38bdf8' : '#94a3b8',
              borderRadius: '6px',
              padding: '0.25rem 0.5rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.25rem',
              fontSize: '0.68rem'
            }}
            title="Toggle Alexa Speech Synthesis"
          >
            {ttsEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
            <span>{ttsEnabled ? 'Voice ON' : 'Muted'}</span>
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: viewMode === 'DUAL' 
          ? '280px minmax(360px, 1.2fr) minmax(380px, 1.3fr)' 
          : '1fr',
        maxWidth: viewMode === 'ECHO_SHOW' ? '820px' : '100%',
        margin: viewMode === 'ECHO_SHOW' ? '0 auto' : '0',
        width: '100%',
        gap: '0.55rem',
        flex: 1,
        overflow: 'hidden',
        minHeight: 0
      }}>
        
        {/* Left Column: Ambient Echo Device & Voice Suggestions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', height: '100%', overflow: 'hidden' }}>
          
          {/* Echo Device Hardware Card */}
          <div className="glass-panel" style={{
            borderRadius: '14px',
            padding: '0.65rem 0.75rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            position: 'relative',
            background: 'linear-gradient(180deg, rgba(14, 21, 38, 0.85) 0%, rgba(9, 13, 24, 0.95) 100%)',
            boxShadow: '0 8px 30px rgba(0, 0, 0, 0.5)',
            flexShrink: 0
          }}>
            {/* Top Device Header: Ambient Nightstand Acoustic Base */}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <span style={{ width: '5px', height: '5px', borderRadius: '50%', background: '#00d2ff' }} />
                <span style={{ fontSize: '0.65rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
                  Amazon Echo Unit
                </span>
              </div>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '5px', padding: '1px' }}>
                <button
                  onClick={() => setEchoMode('3D')}
                  style={{
                    background: echoMode === '3D' ? 'rgba(0, 210, 255, 0.25)' : 'transparent',
                    color: echoMode === '3D' ? '#38bdf8' : '#94a3b8',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '0.62rem',
                    fontWeight: '700',
                    padding: '2px 6px',
                    cursor: 'pointer'
                  }}
                  title="Switch to Interactive 3D Amazon Echo"
                >
                  3D
                </button>
                <button
                  onClick={() => setEchoMode('2D')}
                  style={{
                    background: echoMode === '2D' ? 'rgba(0, 210, 255, 0.25)' : 'transparent',
                    color: echoMode === '2D' ? '#38bdf8' : '#94a3b8',
                    border: 'none',
                    borderRadius: '3px',
                    fontSize: '0.62rem',
                    fontWeight: '700',
                    padding: '2px 6px',
                    cursor: 'pointer'
                  }}
                  title="Switch to 2D Light Ring"
                >
                  2D
                </button>
              </div>
            </div>

            {/* The Authentic Echo 3D Model or 2D LED Light Ring */}
            <div style={{ margin: '0.1rem 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
              {echoMode === '3D' ? (
                <Echo3D 
                  state={state}
                  isListening={isListening}
                  isSpeaking={isSpeaking}
                  onToggleMic={toggleMic}
                />
              ) : (
                <EchoRing 
                  state={state}
                  isListening={isListening}
                  isSpeaking={isSpeaking}
                  onToggleMic={toggleMic}
                />
              )}
            </div>

            {/* Live Audio Frequency Waveform */}
            <div style={{ width: '100%', margin: '0.2rem 0' }}>
              <AudioWaveform 
                isActive={isListening} 
                isSpeaking={isSpeaking} 
                state={state} 
              />
            </div>

            {/* Microphone Interaction Button */}
            <div style={{ width: '100%', marginTop: '0.25rem' }}>
              <button
                onClick={toggleMic}
                style={{
                  width: '100%',
                  padding: '0.45rem 0.75rem',
                  borderRadius: '9px',
                  background: isListening 
                    ? 'linear-gradient(135deg, #00d2ff, #0066ff)' 
                    : 'linear-gradient(135deg, #1e293b, #0f172a)',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '0.78rem',
                  border: isListening ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.4rem',
                  boxShadow: isListening 
                    ? '0 0 20px rgba(0, 210, 255, 0.4)' 
                    : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {isListening ? <Radio size={14} color="#fff" style={{ animation: 'pulse-fast 1s infinite' }} /> : <Mic size={14} />}
                <span>
                  {isListening 
                    ? 'Listening... (Speak to Alexa)' 
                    : 'Tap to Speak (or say "Alexa")'}
                </span>
              </button>

              {/* Custom Speech / Text Input Bar */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customInput.trim()) {
                    playAlexaChime();
                    handleSendQuery(customInput);
                  }
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.35rem',
                  marginTop: '0.35rem',
                  background: 'rgba(5, 8, 16, 0.6)',
                  borderRadius: '8px',
                  padding: '0.25rem 0.45rem',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <input
                  type="text"
                  placeholder='Say "Alexa..." or type query'
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#f8fafc',
                    fontSize: '0.72rem',
                    flex: 1,
                    padding: '0.1rem 0.2rem'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: 'rgba(0, 210, 255, 0.15)',
                    border: '1px solid rgba(0, 210, 255, 0.3)',
                    color: '#38bdf8',
                    borderRadius: '5px',
                    padding: '0.2rem 0.4rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Send size={11} />
                </button>
              </form>
            </div>
          </div>

          {/* Organic Alexa Suggested Voice Prompts */}
          <div className="glass-panel" style={{
            borderRadius: '12px',
            padding: '0.55rem 0.75rem',
            background: 'rgba(11, 16, 30, 0.75)',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            overflow: 'hidden'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.35rem' }}>
              <div style={{ fontSize: '0.66rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b' }}>
                Recommended Commands
              </div>
              <button
                onClick={resetIncident}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.64rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '1px 3px'
                }}
                title="Reset simulation to initial state"
              >
                <RotateCcw size={10} />
                <span>Reset</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', flex: 1, overflowY: 'auto', paddingRight: '2px' }}>
              {/* Suggestion 1: Triage */}
              <div
                onClick={() => {
                  playAlexaChime();
                  handleSendQuery("Alexa, what is failing in production?");
                }}
                className="voice-suggestion-card"
                style={{
                  padding: '0.3rem 0.55rem',
                  borderRadius: '7px',
                  background: 'rgba(244, 63, 94, 0.08)',
                  border: '1px solid rgba(244, 63, 94, 0.22)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#fca5a5' }}>
                    "Alexa, what is failing?"
                  </div>
                  <ChevronRight size={11} color="#fca5a5" />
                </div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '1px' }}>
                  Triage 3 AM CloudWatch alarm
                </div>
              </div>

              {/* Suggestion 2: Rollback Gate */}
              <div
                onClick={() => {
                  playAlexaChime();
                  handleSendQuery("Alexa, rollback checkout-api to revision 41");
                }}
                className="voice-suggestion-card"
                style={{
                  padding: '0.3rem 0.55rem',
                  borderRadius: '7px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.22)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#fcd34d' }}>
                    "Alexa, rollback checkout-api"
                  </div>
                  <ChevronRight size={11} color="#fcd34d" />
                </div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '1px' }}>
                  Triggers Voice 2FA safety gate
                </div>
              </div>

              {/* Suggestion 3: Confirm 2FA */}
              <div
                onClick={() => {
                  playAlexaChime();
                  const pinSuffix = displayCard?.challenge_pin ? ` ${displayCard.challenge_pin}` : '';
                  handleSendQuery(`Alexa, confirm rollback${pinSuffix}`);
                }}
                className="voice-suggestion-card"
                style={{
                  padding: '0.3rem 0.55rem',
                  borderRadius: '7px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.22)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#6ee7b7' }}>
                    "Alexa, confirm rollback {displayCard?.challenge_pin || '<OTP>'}"
                  </div>
                  <ChevronRight size={11} color="#6ee7b7" />
                </div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '1px' }}>
                  Verifies Out-of-Band Slack OTP
                </div>
              </div>

              {/* Suggestion 4: Propose Code Fix (New MCP Tool) */}
              <div
                onClick={() => {
                  playAlexaChime();
                  handleSendQuery("Alexa, propose code fix");
                }}
                className="voice-suggestion-card"
                style={{
                  padding: '0.3rem 0.55rem',
                  borderRadius: '7px',
                  background: 'rgba(0, 210, 255, 0.08)',
                  border: '1px solid rgba(0, 210, 255, 0.25)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#38bdf8' }}>
                    "Alexa, propose code fix"
                  </div>
                  <ChevronRight size={11} color="#38bdf8" />
                </div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '1px' }}>
                  Bedrock Claude 3.5 Git patch & PR
                </div>
              </div>

              {/* Suggestion 5: Generate Post-Mortem (New MCP Tool) */}
              <div
                onClick={() => {
                  playAlexaChime();
                  handleSendQuery("Alexa, generate post-mortem");
                }}
                className="voice-suggestion-card"
                style={{
                  padding: '0.3rem 0.55rem',
                  borderRadius: '7px',
                  background: 'rgba(129, 140, 248, 0.08)',
                  border: '1px solid rgba(129, 140, 248, 0.25)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#a5b4fc' }}>
                    "Alexa, generate post-mortem"
                  </div>
                  <ChevronRight size={11} color="#a5b4fc" />
                </div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '1px' }}>
                  Blameless RCA & S3/Slack publish
                </div>
              </div>

              {/* Suggestion 6: Blameless COE Change Correlation */}
              <div
                onClick={() => {
                  playAlexaChime();
                  handleSendQuery("Alexa, correlate deployment changes");
                }}
                className="voice-suggestion-card"
                style={{
                  padding: '0.3rem 0.55rem',
                  borderRadius: '7px',
                  background: 'rgba(236, 72, 153, 0.08)',
                  border: '1px solid rgba(236, 72, 153, 0.28)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#f472b6' }}>
                    "Alexa, correlate deployment"
                  </div>
                  <ChevronRight size={11} color="#f472b6" />
                </div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '1px' }}>
                  Amazon Blameless COE 5-Whys Audit
                </div>
              </div>

              {/* Suggestion 7: Deterministic N-1 Rollback Pre-Flight */}
              <div
                onClick={() => {
                  playAlexaChime();
                  handleSendQuery("Alexa, verify pre-flight impact");
                }}
                className="voice-suggestion-card"
                style={{
                  padding: '0.3rem 0.55rem',
                  borderRadius: '7px',
                  background: 'rgba(20, 184, 166, 0.08)',
                  border: '1px solid rgba(20, 184, 166, 0.28)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.72rem', fontWeight: '700', color: '#2dd4bf' }}>
                    "Alexa, verify pre-flight impact"
                  </div>
                  <ChevronRight size={11} color="#2dd4bf" />
                </div>
                <div style={{ fontSize: '0.6rem', color: '#94a3b8', marginTop: '1px' }}>
                  N-1 Telemetry Delta & Scoped STS Policy
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Center Column: Authentic Echo Show Screen */}
        <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
          
          {/* Echo Show 10 Physical Hardware Bezel Shell */}
          <div className="echo-show-chassis" style={{
            padding: '8px 10px',
            borderRadius: '16px',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden'
          }}>
            {/* Front Camera Pinhole */}
            <div className="echo-camera-pinhole" style={{ margin: '0 auto 6px auto', width: '6px', height: '6px' }} />

            {/* Echo Show Screen Inner Display */}
            <div className="echo-screen-container" style={{
              padding: '0.65rem 0.8rem',
              flex: 1,
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '0.4rem'
            }}>
              
              {/* Echo Show Top Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.35rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <span style={{ fontSize: '0.74rem', fontWeight: '800', fontFamily: 'JetBrains Mono', color: '#94a3b8' }}>
                    {currentTime.slice(0, 5)} AM
                  </span>
                  <span style={{ fontSize: '0.65rem', color: '#64748b' }}>
                    • Seattle • 48° Mist
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.65rem', color: '#00d2ff' }}>
                  <Sparkles size={11} />
                  <span>Alexa+ Ambient SRE Mode</span>
                </div>
              </div>

              {/* User Voice Utterance Bubble (If Spoken) */}
              {userTranscript && (
                <div style={{
                  padding: '0.35rem 0.65rem',
                  borderRadius: '7px',
                  background: 'rgba(0, 210, 255, 0.08)',
                  borderLeft: '3px solid #00d2ff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.45rem',
                  flexShrink: 0
                }}>
                  <div style={{
                    width: '20px',
                    height: '20px',
                    borderRadius: '50%',
                    background: 'rgba(0, 210, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Mic size={11} color="#00d2ff" />
                  </div>
                  <div>
                    <span style={{ fontSize: '0.58rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: '#64748b', fontWeight: '700', marginRight: '6px' }}>
                      Spoken:
                    </span>
                    <span style={{ fontSize: '0.8rem', color: '#f1f5f9', fontWeight: '600' }}>
                      "{userTranscript}"
                    </span>
                  </div>
                </div>
              )}

              {/* Alexa+ Spoken Audio Response Output Card */}
              <div style={{
                borderRadius: '9px',
                padding: '0.55rem 0.75rem',
                background: 'linear-gradient(135deg, rgba(16, 24, 44, 0.95), rgba(8, 12, 24, 0.9))',
                border: '1px solid rgba(0, 210, 255, 0.25)',
                boxShadow: '0 3px 14px rgba(0, 0, 0, 0.3)',
                flexShrink: 0
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', color: '#00d2ff', fontSize: '0.7rem', fontWeight: '700' }}>
                    <Sparkles size={12} /> Alexa+ Voice Response:
                  </div>
                  {isSpeaking && (
                    <div style={{ fontSize: '0.65rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                      <Volume2 size={11} style={{ animation: 'pulse-fast 1s infinite' }} />
                      <span>Speaking...</span>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '0.84rem', lineHeight: '1.4', color: '#ffffff', fontWeight: '400' }}>
                  {spokenResponse}
                </div>
              </div>

              {/* Echo Show Visual Card (Telemetry, Diagnostics, Voice 2FA) */}
              <div style={{ flex: 1 }}>
                <DisplayCard card={displayCard} state={state} />
              </div>

            </div>
          </div>
        </div>

        {/* Right Column: Model Context Protocol (MCP) Live Agent Trace HUD (Only in DUAL view) */}
        {viewMode === 'DUAL' && (
          <div style={{ height: '100%', overflow: 'hidden' }}>
            <AgentHUD toolTraces={toolTraces} state={state} />
          </div>
        )}

      </div>

      {/* Production SRE Footer */}
      <footer style={{
        height: '20px',
        borderTop: '1px solid rgba(255, 255, 255, 0.06)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: '2px',
        fontSize: '0.66rem',
        color: '#64748b',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <span><strong>AWS CloudSentry Enterprise Incident Commander</strong></span>
          <span>•</span>
          <span style={{ color: '#00d2ff' }}>Model Context Protocol (Spec 2025-11-25+)</span>
          <span>•</span>
          <span style={{ color: '#10b981' }}>CloudWatch & ECS Operational</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span style={{ padding: '0.1rem 0.4rem', borderRadius: '3px', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
            Streamable HTTP
          </span>
          <span>us-east-1 Production</span>
        </div>
      </footer>
    </div>
  );
}
