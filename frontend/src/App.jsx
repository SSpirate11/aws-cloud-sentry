import React, { useState, useEffect, useRef } from 'react';
import { 
  Mic, MicOff, Volume2, VolumeX, RotateCcw, Shield, Cloud, Terminal, 
  CheckCircle2, AlertOctagon, Sparkles, Radio, Moon, Clock, Monitor, 
  Smartphone, ChevronRight, Send, AlertTriangle, ShieldCheck
} from 'lucide-react';
import EchoRing from './components/EchoRing';
import DisplayCard from './components/DisplayCard';
import AgentHUD from './components/AgentHUD';
import AudioWaveform from './components/AudioWaveform';

export default function App() {
  const [state, setState] = useState('STANDBY'); // STANDBY, LISTENING, THINKING, INCIDENT_ACTIVE, AWAITING_CONFIRMATION, RESOLVED
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [viewMode, setViewMode] = useState('DUAL'); // 'DUAL' or 'ECHO_SHOW'
  const [currentTime, setCurrentTime] = useState('03:15:00 AM');
  const [customInput, setCustomInput] = useState('');
  
  const [userTranscript, setUserTranscript] = useState('');
  const [spokenResponse, setSpokenResponse] = useState("AWS CloudSentry initialized. Standing by for voice commands or CloudWatch alarms.");
  const [displayCard, setDisplayCard] = useState({
    title: "AWS CloudSentry Ready",
    badge: "STANDBY",
    badge_color: "blue",
    status_message: "Say 'Alexa, what is failing in production?' to inspect active CloudWatch alarms."
  });
  const [toolTraces, setToolTraces] = useState([]);
  
  const recognitionRef = useRef(null);

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

  // Setup Web Speech API for voice capture
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
        setState('LISTENING');
      };

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setUserTranscript(transcript);
        setIsListening(false);
        handleSendQuery(transcript);
      };

      recognition.onerror = (event) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        setState('STANDBY');
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
    }
  }, []);

  // Text to Speech using browser SpeechSynthesis
  const speakText = (text) => {
    if (!ttsEnabled || !window.speechSynthesis) return;
    
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

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    window.speechSynthesis.speak(utterance);
  };

  const toggleMic = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
        } catch (e) {
          console.warn('Mic start failed:', e);
        }
      } else {
        alert("Web Speech API is not supported in this browser. Please use Chrome/Edge or click a voice suggestion.");
      }
    }
  };

  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Progressive cognitive agent turn-taking dispatcher
  const handleSendQuery = async (queryText) => {
    if (!queryText.trim()) return;
    
    setState('THINKING');
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
        
        await sleep(650);

        // Resolve to real output
        currentTraces[i] = item;
        setToolTraces([...currentTraces]);
        await sleep(250);
      }

      await sleep(350);

      setDisplayCard(data.display_card);
      setSpokenResponse(data.spoken_response);
      setState(data.state || 'STANDBY');

      speakText(data.spoken_response);
    } catch (err) {
      console.error('Error communicating with agent backend:', err);
      setSpokenResponse("Unable to reach CloudSentry MCP backend. Check server status on port 8000.");
      setState('STANDBY');
    }
  };

  const resetIncident = async () => {
    try {
      await fetch('/api/reset', { method: 'POST' });
      setUserTranscript('');
      setSpokenResponse("Incident scenario reset. Ready for demonstration.");
      setDisplayCard({
        title: "AWS CloudSentry Ready",
        badge: "STANDBY",
        status_message: "Ready to triage AWS CloudWatch incidents."
      });
      setToolTraces([]);
      setState('STANDBY');
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

        {/* Right: View Mode Toggle, Audio Toggle, Incident Status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
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
            <span>{ttsEnabled ? 'Alexa Voice' : 'Muted'}</span>
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
                  Amazon Echo Ambient Unit
                </span>
              </div>
              <span style={{ fontSize: '0.68rem', color: '#64748b', fontFamily: 'JetBrains Mono' }}>
                Echo 10 Pro
              </span>
            </div>

            {/* The Authentic Echo LED Light Ring */}
            <div style={{ margin: '0.5rem 0' }}>
              <EchoRing 
                state={state}
                isListening={isListening}
                isSpeaking={isSpeaking}
                onToggleMic={toggleMic}
              />
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
                    ? 'linear-gradient(135deg, #f43f5e, #dc2626)' 
                    : 'linear-gradient(135deg, #00d2ff, #0066ff)',
                  color: '#fff',
                  fontWeight: '700',
                  fontSize: '0.85rem',
                  border: 'none',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '0.5rem',
                  boxShadow: isListening 
                    ? '0 0 25px rgba(244, 63, 94, 0.45)' 
                    : '0 0 25px rgba(0, 210, 255, 0.35)',
                  transition: 'all 0.2s ease'
                }}
              >
                {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                <span>{isListening ? 'Listening (Click to Stop)' : 'Click to Speak into Alexa+'}</span>
              </button>

              {/* Custom Speech / Text Input Bar */}
              <form 
                onSubmit={(e) => {
                  e.preventDefault();
                  if (customInput.trim()) handleSendQuery(customInput);
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
                  placeholder="Or type voice command..."
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
                Alexa Suggested Voice Prompts
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
                onClick={() => handleSendQuery("Alexa, what is failing in production?")}
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
                onClick={() => handleSendQuery("Rollback checkout-api to revision 41")}
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
                    "Rollback checkout-api to revision 41"
                  </div>
                  <ChevronRight size={14} color="#fcd34d" />
                </div>
                <div style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '0.15rem' }}>
                  Triggers Voice 2FA safety gate before destructive mutation
                </div>
              </div>

              {/* Suggestion 3 */}
              <div
                onClick={() => handleSendQuery("Confirm rollback")}
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
                    "Confirm rollback"
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
