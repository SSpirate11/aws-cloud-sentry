import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';
import EchoRing from './EchoRing';

export default function Echo3D({ state, isListening, isSpeaking, onToggleMic }) {
  const containerRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [isInteracting, setIsInteracting] = useState(false);
  const [webglError, setWebglError] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Dimensions
    const width = container.clientWidth || 280;
    const height = container.clientHeight || 280;

    // Scene
    const scene = new THREE.Scene();

    // Camera
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 4.2);
    camera.lookAt(0, 0, 0);

    // Renderer (wrapped in try/catch for browsers without hardware WebGL)
    let renderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e) {
      setWebglError(true);
      return;
    }
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Root Group for Rotation & Interaction
    const echoGroup = new THREE.Group();
    scene.add(echoGroup);

    // 1. Charcoal Acoustic Fabric Material for Echo 4th Gen Sphere
    // Procedural canvas bump texture for acoustic weave mesh
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 128, 128);
    for (let x = 0; x < 128; x += 4) {
      for (let y = 0; y < 128; y += 4) {
        ctx.fillStyle = (x + y) % 8 === 0 ? '#334155' : '#0f172a';
        ctx.fillRect(x, y, 2, 2);
      }
    }
    const fabricTexture = new THREE.CanvasTexture(canvas);
    fabricTexture.wrapS = THREE.RepeatWrapping;
    fabricTexture.wrapT = THREE.RepeatWrapping;
    fabricTexture.repeat.set(16, 16);

    const bodyMaterial = new THREE.MeshStandardMaterial({
      color: 0x182030,
      roughness: 0.88,
      metalness: 0.12,
      bumpMap: fabricTexture,
      bumpScale: 0.04
    });

    // 2. Main Spherical Acoustic Body (Classic Echo 4th Gen Orb)
    const sphereGeometry = new THREE.SphereGeometry(1.2, 64, 48);
    // Squash slightly on Y axis for authentic Amazon Echo profile
    sphereGeometry.scale(1, 0.92, 1);
    const sphereMesh = new THREE.Mesh(sphereGeometry, bodyMaterial);
    sphereMesh.position.y = 0.28;
    sphereMesh.castShadow = true;
    sphereMesh.receiveShadow = true;
    echoGroup.add(sphereMesh);

    // 3. Top Button Panel Cap (Volume +, Volume -, Action, Mic Mute)
    const topCapGeometry = new THREE.CylinderGeometry(0.38, 0.42, 0.05, 32);
    const topCapMaterial = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.5,
      metalness: 0.4
    });
    const topCap = new THREE.Mesh(topCapGeometry, topCapMaterial);
    topCap.position.y = 1.34;
    echoGroup.add(topCap);

    // Top Tactile Buttons (4 small pill/cylinder shapes)
    const buttonMaterial = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    const btnOffsets = [
      { x: 0, z: 0.2 },   // Action (dot)
      { x: 0, z: -0.2 },  // Mic Mute (circle)
      { x: 0.2, z: 0 },   // Vol +
      { x: -0.2, z: 0 }   // Vol -
    ];
    btnOffsets.forEach((b) => {
      const btnGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16);
      const btnMesh = new THREE.Mesh(btnGeo, buttonMaterial);
      btnMesh.position.set(b.x, 1.37, b.z);
      echoGroup.add(btnMesh);
    });

    // 4. Base Pedestal / Foot Ring (Non-slip dark matte base)
    const baseGeometry = new THREE.CylinderGeometry(0.72, 0.68, 0.12, 48);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x070b14,
      roughness: 0.9,
      metalness: 0.1
    });
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.y = -0.74;
    baseMesh.receiveShadow = true;
    echoGroup.add(baseMesh);

    // 5. THE ICONIC AMAZON ECHO BASE LIGHT RING
    // Torus geometry wrapping the base with dynamic emissive glow
    const ringGeometry = new THREE.TorusGeometry(0.75, 0.045, 24, 72);
    ringGeometry.rotateX(Math.PI / 2);

    const ringMaterial = new THREE.MeshStandardMaterial({
      color: 0x00d2ff,
      emissive: 0x00d2ff,
      emissiveIntensity: 2.2,
      roughness: 0.2,
      metalness: 0.1
    });
    const ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.position.y = -0.72;
    echoGroup.add(ringMesh);

    // 6. Ambient Tabletop Reflector Disc (Echo Light Diffusion on Bedside Surface)
    const floorGeometry = new THREE.CircleGeometry(1.6, 48);
    floorGeometry.rotateX(-Math.PI / 2);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x080c18,
      roughness: 0.6,
      metalness: 0.2
    });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.position.y = -0.80;
    floorMesh.receiveShadow = true;
    echoGroup.add(floorMesh);

    // 7. Dynamic LED Point Light (Casts state colors onto table & room)
    const ringLight = new THREE.PointLight(0x00d2ff, 3.5, 3.8);
    ringLight.position.set(0, -0.65, 0);
    echoGroup.add(ringLight);

    // 8. Studio Ambient & Key Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x94a3b8, 1.4);
    keyLight.position.set(3, 4, 3);
    keyLight.castShadow = true;
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00d2ff, 0.8);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

    // Mouse Drag Rotation Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let targetRotationY = 0.35;
    let targetRotationX = 0.12;

    const onMouseDown = (e) => {
      isDragging = true;
      setIsInteracting(true);
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const onMouseMove = (e) => {
      if (!isDragging) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      targetRotationY += deltaX * 0.012;
      targetRotationX = Math.max(-0.25, Math.min(0.45, targetRotationX + deltaY * 0.01));
    };

    const onMouseUp = () => {
      isDragging = false;
      setTimeout(() => setIsInteracting(false), 1200);
    };

    const domEl = renderer.domElement;
    domEl.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    // Touch Support for Mobile / Tablet
    const onTouchStart = (e) => {
      if (e.touches.length === 1) {
        isDragging = true;
        setIsInteracting(true);
        prevMouseX = e.touches[0].clientX;
        prevMouseY = e.touches[0].clientY;
      }
    };
    const onTouchMove = (e) => {
      if (!isDragging || e.touches.length !== 1) return;
      const deltaX = e.touches[0].clientX - prevMouseX;
      const deltaY = e.touches[0].clientY - prevMouseY;
      prevMouseX = e.touches[0].clientX;
      prevMouseY = e.touches[0].clientY;
      targetRotationY += deltaX * 0.012;
      targetRotationX = Math.max(-0.25, Math.min(0.45, targetRotationX + deltaY * 0.01));
    };
    const onTouchEnd = () => {
      isDragging = false;
      setTimeout(() => setIsInteracting(false), 1200);
    };
    domEl.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: true });
    window.addEventListener('touchend', onTouchEnd);

    // State Color Mapping
    const getStateColor = (s) => {
      switch (s) {
        case 'LISTENING':
          return 0x00ffff; // Bright Cyan
        case 'THINKING':
          return 0x0099ff; // Electric Blue Spinner
        case 'AWAITING_CONFIRMATION':
          return 0xffb700; // Voice 2FA Amber
        case 'RESOLVED':
          return 0x00e676; // Remediated Green
        case 'INCIDENT_ACTIVE':
          return 0xff334b; // Sev-2 Red
        default:
          return 0x00d2ff; // Calm Standby Cyan
      }
    };

    // Animation Loop
    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Smooth Rotation Interpolation
      if (!isDragging) {
        targetRotationY += 0.003; // Gentle idle rotation
      }
      echoGroup.rotation.y += (targetRotationY - echoGroup.rotation.y) * 0.08;
      echoGroup.rotation.x += (targetRotationX - echoGroup.rotation.x) * 0.08;

      // Dynamic LED Ring Behavior by State
      const curState = stateRef.current;
      const currentColor = getStateColor(curState);
      ringMaterial.color.setHex(currentColor);
      ringMaterial.emissive.setHex(currentColor);
      ringLight.color.setHex(currentColor);
      rimLight.color.setHex(currentColor);

      if (curState === 'LISTENING') {
        // Fast lively pulsing listening beam
        const pulse = 1.8 + Math.sin(elapsedTime * 6.0) * 0.9;
        ringMaterial.emissiveIntensity = pulse;
        ringLight.intensity = pulse * 1.8;
      } else if (curState === 'THINKING') {
        // Dual-beam fast spinning light
        const pulse = 2.0 + Math.sin(elapsedTime * 9.0) * 1.1;
        ringMesh.rotation.z = elapsedTime * 4.5;
        ringMaterial.emissiveIntensity = pulse;
        ringLight.intensity = pulse * 1.6;
      } else if (curState === 'AWAITING_CONFIRMATION') {
        // Pulsing urgent amber warning
        const pulse = 2.2 + Math.sin(elapsedTime * 4.5) * 1.0;
        ringMaterial.emissiveIntensity = pulse;
        ringLight.intensity = pulse * 2.0;
      } else if (curState === 'RESOLVED') {
        // Serene steady emerald green
        ringMaterial.emissiveIntensity = 2.4;
        ringLight.intensity = 3.6;
      } else if (curState === 'INCIDENT_ACTIVE') {
        // Red alarm pulse
        const pulse = 2.0 + Math.sin(elapsedTime * 5.0) * 1.0;
        ringMaterial.emissiveIntensity = pulse;
        ringLight.intensity = pulse * 1.8;
      } else {
        // Calm Standby Breathing
        const breathe = 1.2 + Math.sin(elapsedTime * 1.8) * 0.45;
        ringMaterial.emissiveIntensity = breathe;
        ringLight.intensity = breathe * 1.2;
      }

      renderer.render(scene, camera);
    };

    animate();

    // Resize Handler
    const handleResize = () => {
      if (!container) return;
      const newW = container.clientWidth || 280;
      const newH = container.clientHeight || 280;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      domEl.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);

      sphereGeometry.dispose();
      topCapGeometry.dispose();
      baseGeometry.dispose();
      ringGeometry.dispose();
      floorGeometry.dispose();
      bodyMaterial.dispose();
      topCapMaterial.dispose();
      buttonMaterial.dispose();
      baseMaterial.dispose();
      ringMaterial.dispose();
      floorMaterial.dispose();
      fabricTexture.dispose();
      renderer.dispose();
      if (domEl.parentNode) {
        domEl.parentNode.removeChild(domEl);
      }
    };
  }, []);

  if (webglError) {
    return <EchoRing state={state} isListening={isListening} isSpeaking={isSpeaking} onToggleMic={onToggleMic} />;
  }

  const getStatusLabel = () => {
    if (isSpeaking) return 'Alexa+ Speaking...';
    if (state === 'THINKING') return 'Alexa+ Reasoning via MCP...';
    if (state === 'LISTENING') return 'Listening to you...';
    if (state === 'AWAITING_CONFIRMATION') return '⚠️ Voice 2FA Authorization Required';
    if (state === 'RESOLVED') return '✅ Incident Remediated (Healthy)';
    if (state === 'INCIDENT_ACTIVE') return '🚨 Sev-2 CloudWatch Alarm Active';
    return 'Alexa+ Ready (Say "Alexa" or Tap)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%' }}>
      {/* 3D Canvas Viewport */}
      <div 
        ref={containerRef}
        onClick={onToggleMic}
        style={{
          width: '180px',
          height: '180px',
          cursor: isInteracting ? 'grabbing' : 'grab',
          position: 'relative',
          borderRadius: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          overflow: 'hidden'
        }}
        title="Click to speak, or drag to rotate 3D Echo"
      />

      {/* Interactive Helper Hint */}
      <div style={{
        position: 'absolute',
        top: '4px',
        right: '8px',
        fontSize: '0.58rem',
        color: '#64748b',
        background: 'rgba(15, 23, 42, 0.7)',
        padding: '1px 6px',
        borderRadius: '9999px',
        pointerEvents: 'none',
        border: '1px solid rgba(255, 255, 255, 0.06)'
      }}>
        3D Drag
      </div>

      {/* Status indicator badge */}
      <div style={{
        marginTop: '0.25rem',
        padding: '0.2rem 0.65rem',
        borderRadius: '9999px',
        fontSize: '0.72rem',
        fontWeight: '600',
        letterSpacing: '0.02em',
        backgroundColor: state === 'AWAITING_CONFIRMATION' 
          ? 'rgba(255, 153, 0, 0.15)' 
          : state === 'RESOLVED' 
          ? 'rgba(0, 230, 118, 0.15)'
          : state === 'INCIDENT_ACTIVE'
          ? 'rgba(255, 51, 75, 0.15)'
          : state === 'THINKING'
          ? 'rgba(0, 210, 255, 0.15)'
          : 'rgba(56, 189, 248, 0.12)',
        border: `1px solid ${
          state === 'AWAITING_CONFIRMATION'
            ? 'rgba(255, 153, 0, 0.45)'
            : state === 'RESOLVED'
            ? 'rgba(0, 230, 118, 0.45)'
            : state === 'INCIDENT_ACTIVE'
            ? 'rgba(255, 51, 75, 0.45)'
            : state === 'THINKING'
            ? 'rgba(0, 210, 255, 0.45)'
            : 'rgba(56, 189, 248, 0.3)'
        }`,
        color: state === 'AWAITING_CONFIRMATION'
          ? '#ffb700'
          : state === 'RESOLVED'
          ? '#00e676'
          : state === 'INCIDENT_ACTIVE'
          ? '#ff4d61'
          : state === 'THINKING'
          ? '#00d2ff'
          : '#38bdf8',
        display: 'flex',
        alignItems: 'center',
        gap: '0.35rem',
        boxShadow: '0 2px 8px rgba(0,0,0,0.3)'
      }}>
        <span style={{
          width: '6px',
          height: '6px',
          borderRadius: '50%',
          backgroundColor: 'currentColor',
          display: 'inline-block',
          boxShadow: '0 0 6px currentColor'
        }}></span>
        {getStatusLabel()}
      </div>
    </div>
  );
}

