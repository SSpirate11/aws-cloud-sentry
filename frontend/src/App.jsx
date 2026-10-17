import React, { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Volume2, VolumeX, RotateCcw, Shield, Cloud, Terminal, CheckCircle2, AlertOctagon, Sparkles, Github } from 'lucide-react';
import EchoRing from './components/EchoRing';
import DisplayCard from './components/DisplayCard';
import AgentHUD from './components/AgentHUD';

export default function App() {
  const [state, setState] = useState('STANDBY'); // STANDBY, LISTENING, THINKING, INCIDENT_ACTIVE, AWAITING_CONFIRMATION, RESOLVED
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [ttsEnabled, setTtsEnabled] = useState(true);
  
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
    
    window.speechSynthesis.cancel(); // Stop any pending speech
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    const voices = window.speechSynthesis.getVoices();
    // Prefer natural English voices
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
        alert("Web Speech API is not supported in this browser. Please use Chrome/Edge or click the Quick Scenario buttons.");
      }
    }
  };

  // Main turn-taking dispatcher to Python backend
  const handleSendQuery = async (queryText) => {
    setState('THINKING');
    setUserTranscript(queryText);

    try {
      const res = await fetch('/api/voice-turn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: queryText })
      });

      const data = await res.json();

      setSpokenResponse(data.spoken_response);
      setDisplayCard(data.display_card);
      setToolTraces(data.tool_traces || []);
      setState(data.state || 'STANDBY');

      // Speak Alexa response
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
    <div style={{ maxWidth: '1100px', margin: '0 auto', padding: '1.5rem 1rem', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      
      {/* Top Navbar */}
      <header className="glass-panel" style={{
        borderRadius: '16px',
        padding: '0.85rem 1.5rem',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '1rem',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #00d2ff, #0077ff)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 15px rgba(0, 210, 255, 0.4)'
          }}>
            <Shield size={22} color="#fff" />
          </div>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <h1 style={{ margin: 0, fontSize: '1.15rem', fontWeight: '700', letterSpacing: '-0.02em', color: '#f8fafc' }}>
                CloudSentry
              </h1>
              <span style={{ fontSize: '0.68rem', padding: '0.15rem 0.45rem', borderRadius: '4px', background: 'rgba(0,210,255,0.15)', color: '#38bdf8', fontWeight: '600' }}>
                Alexa+ Echo Simulator
              </span>
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
              Voice Incident Commander for AWS SREs via Model Context Protocol (MCP)
            </div>
          </div>
        </div>

        {/* Badges & Sound Toggle */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem',
            padding: '0.35rem 0.75rem',
            borderRadius: '9999px',
            background: 'rgba(15, 23, 42, 0.8)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            fontSize: '0.75rem',
            color: '#cbd5e1'
          }}>
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981' }}></span>
            <span>03:15 AM UTC • On-Call Active</span>
          </div>

          <button
            onClick={() => {
              if (ttsEnabled) window.speechSynthesis.cancel();
              setTtsEnabled(!ttsEnabled);
            }}
            style={{
              background: ttsEnabled ? 'rgba(0, 210, 255, 0.15)' : 'rgba(255,255,255,0.06)',
              border: `1px solid ${ttsEnabled ? 'rgba(0,210,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
              color: ttsEnabled ? '#38bdf8' : '#94a3b8',
              borderRadius: '8px',
              padding: '0.4rem 0.6rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '0.35rem',
              fontSize: '0.75rem'
            }}
            title="Toggle Voice Output (TTS)"
          >
            {ttsEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{ttsEnabled ? 'Voice ON' : 'Muted'}</span>
          </button>
        </div>
      </header>

      {/* Main Grid: Ambient Echo Ring & Voice Display */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(280px, 1fr) minmax(360px, 1.8fr)', gap: '1.5rem', flex: 1 }}>
        
        {/* Left Column: Ambient Echo Light Ring & Voice Controls */}
        <div className="glass-panel" style={{
          borderRadius: '16px',
          padding: '1.75rem 1.25rem',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.8rem', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#94a3b8', marginBottom: '0.5rem' }}>
              Echo Ambient Interface
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
              Click orb to speak or use quick demo actions
            </div>
          </div>

          {/* The Glowing Echo Light Orb */}
          <EchoRing 
            state={state}
            isListening={isListening}
            isSpeaking={isSpeaking}
            onToggleMic={toggleMic}
          />

          {/* Mic Button & Reset */}
          <div style={{ width: '100%', marginTop: '1.5rem' }}>
            <button
              onClick={toggleMic}
              style={{
                width: '100%',
                padding: '0.75rem 1rem',
                borderRadius: '10px',
                background: isListening 
                  ? 'linear-gradient(135deg, #ef4444, #dc2626)' 
                  : 'linear-gradient(135deg, #00d2ff, #0077ff)',
                color: '#fff',
                fontWeight: '600',
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.5rem',
                boxShadow: isListening 
                  ? '0 0 20px rgba(239, 68, 68, 0.4)' 
                  : '0 0 20px rgba(0, 210, 255, 0.3)'
              }}
            >
              {isListening ? <MicOff size={18} /> : <Mic size={18} />}
              <span>{isListening ? 'Stop Listening' : 'Click to Speak (Microphone)'}</span>
            </button>

            {/* Quick Demo Scenario Buttons (For Perfect Recording / Testing) */}
            <div style={{ marginTop: '1rem', textAlign: 'left' }}>
              <div style={{ fontSize: '0.72rem', fontWeight: '600', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>
                Quick Test Scenarios (1-Click Demo):
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem' }}>
                <button
                  onClick={() => handleSendQuery("Alexa, what is failing in production?")}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.12)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    color: '#fca5a5',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <AlertOctagon size={14} color="#ef4444" />
                  <span>1. "What is failing in prod?" (3 AM Alarm)</span>
                </button>

                <button
                  onClick={() => handleSendQuery("Rollback checkout-api to revision 41")}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(245, 158, 11, 0.12)',
                    border: '1px solid rgba(245, 158, 11, 0.25)',
                    color: '#fcd34d',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <RotateCcw size={14} color="#f59e0b" />
                  <span>2. "Rollback checkout-api" (Triggers 2FA)</span>
                </button>

                <button
                  onClick={() => handleSendQuery("Confirm rollback")}
                  style={{
                    padding: '0.5rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(16, 185, 129, 0.12)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    color: '#6ee7b7',
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                    textAlign: 'left',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.4rem'
                  }}
                >
                  <CheckCircle2 size={14} color="#10b981" />
                  <span>3. "Confirm rollback" (Voice 2FA Execute)</span>
                </button>

                <button
                  onClick={resetIncident}
                  style={{
                    padding: '0.45rem 0.75rem',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    color: '#94a3b8',
                    fontSize: '0.72rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '0.35rem',
                    marginTop: '0.25rem'
                  }}
                >
                  <RotateCcw size={12} />
                  <span>Reset Mock Incident</span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Spoken Audio Transcript & Echo Show Screen */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          
          {/* User Spoken Input Bubble */}
          {userTranscript && (
            <div className="glass-panel" style={{
              borderRadius: '12px',
              padding: '0.85rem 1.25rem',
              borderLeft: '4px solid #00d2ff',
              background: 'rgba(15, 23, 42, 0.5)'
            }}>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                You said:
              </div>
              <div style={{ fontSize: '1rem', color: '#f1f5f9', fontWeight: '500', marginTop: '0.2rem' }}>
                "{userTranscript}"
              </div>
            </div>
          )}

          {/* Alexa+ Spoken Voice Output Box */}
          <div className="glass-panel glass-panel-glow" style={{
            borderRadius: '14px',
            padding: '1.25rem',
            background: 'linear-gradient(135deg, rgba(15, 23, 42, 0.9), rgba(30, 41, 59, 0.8))',
            border: '1px solid rgba(0, 210, 255, 0.25)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.4rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#00d2ff', fontSize: '0.78rem', fontWeight: '600' }}>
                <Sparkles size={16} /> Alexa+ Voice Response:
              </div>
              {isSpeaking && (
                <div style={{ fontSize: '0.72rem', color: '#38bdf8', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                  <Volume2 size={14} style={{ animation: 'pulse-fast 1s infinite' }} />
                  <span>Speaking...</span>
                </div>
              )}
            </div>

            <div style={{ fontSize: '1.05rem', lineHeight: '1.5', color: '#ffffff', fontWeight: '400' }}>
              {spokenResponse}
            </div>
          </div>

          {/* Ambient Echo Show Display Card */}
          <DisplayCard card={displayCard} state={state} />

          {/* Live Agent MCP Trace HUD */}
          <AgentHUD toolTraces={toolTraces} />
        </div>
      </div>

      {/* Footer & Devpost Hackathon Metadata */}
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
          <span><strong>Build, Ship, Shape: Amazon Developer Hackathon 2026</strong></span>
          <span>•</span>
          <span style={{ color: '#00d2ff' }}>Track: Alexa+ (MCP Server & Voice Agent)</span>
          <span>•</span>
          <span style={{ color: '#fbbf24' }}>Mini-Challenges: AWS Builder + Open Source</span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ padding: '0.15rem 0.5rem', borderRadius: '4px', background: 'rgba(255,255,255,0.06)', color: '#cbd5e1' }}>
            MIT License
          </span>
          <span>Streamable HTTP Spec 2025-11-25+</span>
        </div>
      </footer>
    </div>
  );
}
