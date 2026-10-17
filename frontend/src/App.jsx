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
  
  const [userTranscript, setUserTranscript] = useState('');
  const [spokenResponse, setSpokenResponse] = useState("AWS CloudSentry initialized. Say 'Alexa' or ask what is failing in production.");
  const [displayCard, setDisplayCard] = useState({
    title: "AWS CloudSentry Ready",
    badge: "STANDBY",
    badge_color: "blue",
    status_message: "Wake phrase 'Alexa' is active. Say 'Alexa, what is failing in production?' to inspect CloudWatch alarms."
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

  // Live 3 AM digital clock ticker
  useEffect(() => {
    let seconds = 0;
    const interval = setInterval(() => {
      seconds++;
      const s = String(seconds % 60).padStart(2, '0');
      const m = String(15 + Math.floor(seconds / 60)).padStart(2, '0');
      setCurrentTime(`03:${m}:${s} AM`);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

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
        status_message: "Wake phrase 'Alexa' is active. Say 'Alexa, what is failing in production?' to inspect CloudWatch alarms."
      });
      setToolTraces([]);
      updateState('STANDBY');
    } catch (err) {
      console.error('Reset failed:', err);
    }
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '1.25rem 1rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Ambient Nightstand & Operational Status Bar */}
      <header className="glass-panel" style={{
        borderRadius: '16px',
        padding: '0.75rem 1.25rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.25rem',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}>
        {/* Left: 3 AM Bedside Clock & Emergency On-Call Badge */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '9px',
              background: 'linear-gradient(135deg, #00d2ff, #0055ff)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 15px rgba(0, 210, 255, 0.35)'
            }}>
              <Shield size={20} color="#fff" />
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#f8fafc' }}>
                  CloudSentry
                </span>
                <span style={{
                  fontSize: '0.65rem',
                  padding: '0.1rem 0.4rem',
                  borderRadius: '4px',
                  background: 'rgba(0, 210, 255, 0.15)',
                  color: '#38bdf8',
                  fontWeight: '700'
                }}>
                  Alexa+
                </span>
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Voice Incident Commander for AWS SREs
              </div>
            </div>
          </div>

          <div style={{ height: '24px', width: '1px', background: 'rgba(255,255,255,0.1)' }} />

          {/* Realistic 3 AM Bedside Clock */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
            <Moon size={14} color="#f59e0b" />
            <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: '0.85rem', fontWeight: '700', color: '#f8fafc' }}>
              {currentTime}
            </span>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
              • Bedside Stand
            </span>
          </div>
        </div>

        {/* Right: Wake Word Toggle, View Mode, Audio Toggle, Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem', flexWrap: 'wrap' }}>
          
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
              gap: '0.45rem',
              padding: '0.35rem 0.75rem',
              borderRadius: '9999px',
              background: wakeWordEnabled ? 'rgba(0, 210, 255, 0.12)' : 'rgba(255, 255, 255, 0.05)',
              border: `1px solid ${wakeWordEnabled ? 'rgba(0, 210, 255, 0.4)' : 'rgba(255, 255, 255, 0.1)'}`,
              color: wakeWordEnabled ? '#00d2ff' : '#94a3b8',
              fontSize: '0.72rem',
              fontWeight: '700',
              cursor: 'pointer',
              transition: 'all 0.2s ease'
            }}
            title="Toggle Hands-Free 'Alexa' Wake Word Detection"
          >
            <Radio size={13} color={wakeWordEnabled ? '#00d2ff' : '#64748b'} />
            <span>Wake Word: "Alexa"</span>
            <span style={{
              fontSize: '0.62rem',
              padding: '0.1rem 0.35rem',
              borderRadius: '4px',
              background: wakeWordEnabled ? 'rgba(0, 210, 255, 0.25)' : 'rgba(255,255,255,0.08)',
              color: wakeWordEnabled ? '#e0f2fe' : '#94a3b8'
            }}>
              {wakeDetected ? 'TRIGGERED' : wakeWordEnabled ? 'READY' : 'OFF'}
            </span>
          </button>

          {/* Active Incident Warning Indicator */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.3rem 0.7rem',
            borderRadius: '9999px',
            background: state === 'RESOLVED' 
              ? 'rgba(16, 185, 129, 0.15)' 
              : state === 'AWAITING_CONFIRMATION'
              ? 'rgba(245, 158, 11, 0.15)'
              : 'rgba(244, 63, 94, 0.15)',
            border: `1px solid ${
              state === 'RESOLVED' 
                ? 'rgba(16, 185, 129, 0.3)' 
                : state === 'AWAITING_CONFIRMATION'
                ? 'rgba(245, 158, 11, 0.3)'
                : 'rgba(244, 63, 94, 0.3)'
            }`,
            fontSize: '0.72rem',
            color: state === 'RESOLVED' ? '#34d399' : state === 'AWAITING_CONFIRMATION' ? '#fbbf24' : '#fb7185',
            fontWeight: '600'
          }}>
            <span style={{
              width: '7px',
              height: '7px',
              borderRadius: '50%',
              background: 'currentColor',
              boxShadow: '0 0 6px currentColor'
            }} />
            <span>
              {state === 'RESOLVED' 
                ? 'All CloudWatch Alarms OK' 
                : state === 'AWAITING_CONFIRMATION'
                ? 'Pending Voice 2FA Rollback'
                : 'Sev-2 Page: checkout-api High Latency'}
            </span>
          </div>

          {/* View Mode Toggle */}
          <div style={{ display: 'flex', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', padding: '2px' }}>
            <button
              onClick={() => setViewMode('DUAL')}
              style={{
                background: viewMode === 'DUAL' ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                color: viewMode === 'DUAL' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
              title="Dual Screen: Echo Show + SRE Inspector"
            >
              <Monitor size={13} />
              <span>SRE Console</span>
            </button>
            <button
              onClick={() => setViewMode('ECHO_SHOW')}
              style={{
                background: viewMode === 'ECHO_SHOW' ? 'rgba(0, 210, 255, 0.2)' : 'transparent',
                color: viewMode === 'ECHO_SHOW' ? '#38bdf8' : '#94a3b8',
                border: 'none',
                padding: '0.25rem 0.6rem',
                borderRadius: '6px',
                fontSize: '0.72rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.3rem'
              }}
              title="Echo Show 10 Smart Display Focus"
            >
              <Smartphone size={13} />
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
              borderRadius: '8px',
              padding: '0.35rem 0.65rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.72rem'
            }}
            title="Toggle Alexa Speech Synthesis"
          >
            {ttsEnabled ? <Volume2 size={14} /> : <VolumeX size={14} />}
            <span>{ttsEnabled ? 'Voice ON' : 'Muted'}</span>
          </button>
        </div>
      </header>

      {/* Main Layout Area */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: viewMode === 'DUAL' ? 'minmax(320px, 1fr) minmax(420px, 1.8fr)' : '1fr',
        maxWidth: viewMode === 'ECHO_SHOW' ? '820px' : '100%',
        margin: viewMode === 'ECHO_SHOW' ? '0 auto' : '0',
        width: '100%',
        gap: '1.25rem',
        flex: 1
      }}>
        
        {/* Left Column: Ambient Echo Device & Voice Suggestions */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Echo Device Hardware Card */}
          <div className="glass-panel" style={{
            borderRadius: '20px',
            padding: '1.5rem 1.25rem',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'space-between',
            position: 'relative',
            background: 'linear-gradient(180deg, rgba(14, 21, 38, 0.85) 0%, rgba(9, 13, 24, 0.95) 100%)',
            boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)'
          }}>
            {/* Top Device Header: Ambient Nightstand Acoustic Base */}
            <div style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#00d2ff' }} />
                <span style={{ fontSize: '0.7rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
                  Amazon Echo Unit
                </span>
              </div>
              <div style={{ display: 'flex', background: 'rgba(255,255,255,0.06)', borderRadius: '6px', padding: '2px' }}>
                <button
                  onClick={() => setEchoMode('3D')}
                  style={{
                    background: echoMode === '3D' ? 'rgba(0, 210, 255, 0.25)' : 'transparent',
                    color: echoMode === '3D' ? '#38bdf8' : '#94a3b8',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    fontWeight: '700',
                    padding: '2px 7px',
                    cursor: 'pointer'
                  }}
                  title="Switch to Interactive 3D Amazon Echo"
                >
                  3D Model
                </button>
                <button
                  onClick={() => setEchoMode('2D')}
                  style={{
                    background: echoMode === '2D' ? 'rgba(0, 210, 255, 0.25)' : 'transparent',
                    color: echoMode === '2D' ? '#38bdf8' : '#94a3b8',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '0.65rem',
                    fontWeight: '700',
                    padding: '2px 7px',
                    cursor: 'pointer'
                  }}
                  title="Switch to 2D Light Ring"
                >
                  2D Ring
                </button>
              </div>
            </div>

            {/* Wake Word Recognition Flash Banner */}
            {wakeDetected && (
              <div style={{
                position: 'absolute',
                top: '12px',
                zIndex: 10,
                padding: '0.3rem 0.85rem',
                borderRadius: '9999px',
                background: 'rgba(0, 210, 255, 0.25)',
                border: '1px solid rgba(0, 210, 255, 0.6)',
                color: '#00d2ff',
                fontSize: '0.74rem',
                fontWeight: '800',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                boxShadow: '0 0 20px rgba(0, 210, 255, 0.5)',
                animation: 'pulse-fast 0.8s infinite'
              }}>
                <Zap size={13} fill="#00d2ff" />
                <span>"Alexa" Wake Word Recognized</span>
              </div>
            )}

            {/* The Authentic Echo 3D Model or 2D LED Light Ring */}
            <div style={{ margin: '0.2rem 0', width: '100%', display: 'flex', justifyContent: 'center' }}>
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
            <div style={{ width: '100%', margin: '0.4rem 0' }}>
              <AudioWaveform 
                isActive={isListening} 
                isSpeaking={isSpeaking} 
                state={state} 
              />
            </div>

              {/* Microphone Interaction Button */}
            <div style={{ width: '100%', marginTop: '0.5rem' }}>
              <button
                onClick={toggleMic}
                style={{
                  width: '100%',
                  padding: '0.75rem 1rem',
                  borderRadius: '12px',
                  background: isListening 
                    ? 'linear-gradient(135deg, #00d2ff, #0066ff)' 
                    : 'linear-gradient(135deg, #1e293b, #0f172a)',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  border: isListening ? 'none' : '1px solid rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: isListening 
                    ? '0 0 25px rgba(0, 210, 255, 0.4)' 
                    : 'none',
                  transition: 'all 0.2s ease'
                }}
              >
                {isListening ? <Radio size={18} color="#fff" style={{ animation: 'pulse-fast 1s infinite' }} /> : <Mic size={18} />}
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
                  gap: '0.4rem',
                  marginTop: '0.65rem',
                  background: 'rgba(5, 8, 16, 0.6)',
                  borderRadius: '10px',
                  padding: '0.35rem 0.5rem',
                  border: '1px solid rgba(255, 255, 255, 0.08)'
                }}
              >
                <input
                  type="text"
                  placeholder='Say "Alexa..." or type voice query'
                  value={customInput}
                  onChange={(e) => setCustomInput(e.target.value)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    outline: 'none',
                    color: '#f8fafc',
                    fontSize: '0.78rem',
                    flex: 1,
                    padding: '0.2rem 0.4rem'
                  }}
                />
                <button
                  type="submit"
                  style={{
                    background: 'rgba(0, 210, 255, 0.15)',
                    border: '1px solid rgba(0, 210, 255, 0.3)',
                    color: '#38bdf8',
                    borderRadius: '6px',
                    padding: '0.3rem 0.5rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                >
                  <Send size={13} />
                </button>
              </form>
            </div>
          </div>

          {/* Organic Alexa Suggested Voice Prompts */}
          <div className="glass-panel" style={{
            borderRadius: '16px',
            padding: '1.15rem',
            background: 'rgba(11, 16, 30, 0.75)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.65rem' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.07em', color: '#64748b' }}>
                Try Saying with Wake Phrase "Alexa"
              </div>
              <button
                onClick={resetIncident}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#64748b',
                  fontSize: '0.7rem',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.3rem',
                  padding: '2px 4px'
                }}
                title="Reset simulation to initial state"
              >
                <RotateCcw size={11} />
                <span>Reset Demo</span>
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
              {/* Suggestion 1 */}
              <div
                onClick={() => {
                  playAlexaChime();
                  handleSendQuery("Alexa, what is failing in production?");
                }}
                className="voice-suggestion-card"
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(244, 63, 94, 0.08)',
                  border: '1px solid rgba(244, 63, 94, 0.22)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fca5a5' }}>
                    "Alexa, what is failing in production?"
                  </div>
                  <ChevronRight size={14} color="#fca5a5" />
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                  Triage 3 AM CloudWatch alarm & inspect dying ECS containers
                </div>
              </div>

              {/* Suggestion 2 */}
              <div
                onClick={() => {
                  playAlexaChime();
                  handleSendQuery("Alexa, rollback checkout-api to revision 41");
                }}
                className="voice-suggestion-card"
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(245, 158, 11, 0.08)',
                  border: '1px solid rgba(245, 158, 11, 0.22)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#fcd34d' }}>
                    "Alexa, rollback checkout-api to revision 41"
                  </div>
                  <ChevronRight size={14} color="#fcd34d" />
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                  Triggers Voice 2FA safety gate before destructive mutation
                </div>
              </div>

              {/* Suggestion 3 */}
              <div
                onClick={() => {
                  playAlexaChime();
                  handleSendQuery("Alexa, confirm rollback");
                }}
                className="voice-suggestion-card"
                style={{
                  padding: '0.65rem 0.85rem',
                  borderRadius: '10px',
                  background: 'rgba(16, 185, 129, 0.08)',
                  border: '1px solid rgba(16, 185, 129, 0.22)',
                  cursor: 'pointer'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#6ee7b7' }}>
                    "Alexa, confirm rollback"
                  </div>
                  <ChevronRight size={14} color="#6ee7b7" />
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                  Authorizes mutation, restores service & notifies Slack
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Authentic Echo Show Screen & Live MCP Inspector */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* Echo Show 10 Physical Hardware Bezel Shell */}
          <div className="echo-show-chassis">
            {/* Front Camera Pinhole */}
            <div className="echo-camera-pinhole" />

            {/* Echo Show Screen Inner Display */}
            <div className="echo-screen-container" style={{ padding: '1.25rem' }}>
              
              {/* Echo Show Top Bar */}
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: '0.75rem',
                borderBottom: '1px solid rgba(255, 255, 255, 0.06)',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: '800', fontFamily: 'JetBrains Mono', color: '#94a3b8' }}>
                    {currentTime.slice(0, 5)} AM
                  </span>
                  <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    • Seattle • 48° Mist
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.7rem', color: '#00d2ff' }}>
                  <Sparkles size={12} />
                  <span>Alexa+ Ambient SRE Mode</span>
                </div>
              </div>

              {/* User Voice Utterance Bubble (If Spoken) */}
              {userTranscript && (
                <div style={{
                  marginBottom: '0.85rem',
                  padding: '0.75rem 1rem',
                  borderRadius: '10px',
                  background: 'rgba(0, 210, 255, 0.08)',
                  borderLeft: '3px solid #00d2ff',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.65rem'
                }}>
                  <div style={{
                    width: '28px',
                    height: '28px',
                    borderRadius: '50%',
                    background: 'rgba(0, 210, 255, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}>
                    <Mic size={14} color="#00d2ff" />
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.06em', color: '#64748b', fontWeight: '700' }}>
                      You asked:
                    </div>
                    <div style={{ fontSize: '0.92rem', color: '#f1f5f9', fontWeight: '600' }}>
                      "{userTranscript}"
                    </div>
                  </div>
                </div>
              )}

              {/* Alexa+ Spoken Audio Response Output Card */}
              <div style={{
                borderRadius: '12px',
                padding: '1rem 1.15rem',
                background: 'linear-gradient(135deg, rgba(16, 24, 44, 0.95), rgba(8, 12, 24, 0.9))',
                border: '1px solid rgba(0, 210, 255, 0.25)',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.4)',
                marginBottom: '1rem'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#00d2ff', fontSize: '0.75rem', fontWeight: '700' }}>
                    <Sparkles size={14} /> Alexa+ Voice Response:
                  </div>
                  {isSpeaking && (
                    <div style={{ fontSize: '0.7rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                      <Volume2 size={13} style={{ animation: 'pulse-fast 1s infinite' }} />
                      <span>Speaking via SpeechSynthesis...</span>
                    </div>
                  )}
                </div>

                <div style={{ fontSize: '1rem', lineHeight: '1.5', color: '#ffffff', fontWeight: '400' }}>
                  {spokenResponse}
                </div>
              </div>

              {/* Echo Show Visual Card (Telemetry, Diagnostics, Voice 2FA) */}
              <DisplayCard card={displayCard} state={state} />

            </div>
          </div>

          {/* Model Context Protocol (MCP) Live Agent Trace HUD (Only in DUAL view) */}
          {viewMode === 'DUAL' && (
            <AgentHUD toolTraces={toolTraces} />
          )}

        </div>
      </div>

      {/* Production SRE Footer */}
      <footer style={{
        marginTop: '2rem',
        paddingTop: '1rem',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '0.75rem',
        fontSize: '0.75rem',
        color: '#64748b'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
          <span><strong>AWS CloudSentry Enterprise Incident Commander</strong></span>
          <span>•</span>
          <span style={{ color: '#00d2ff' }}>Model Context Protocol v2.3</span>
          <span>•</span>
          <span style={{ color: '#10b981' }}>CloudWatch & ECS Operational</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
            Streamable HTTP
          </span>
          <span>us-east-1 Production</span>
        </div>
      </footer>
    </div>
  );
}
