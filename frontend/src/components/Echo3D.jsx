import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

export default function Echo3D({ state, isListening, isSpeaking, onToggleMic }) {
  const containerRef = useRef(null);
  const stateRef = useRef(state);
  stateRef.current = state;
  const [isInteracting, setIsInteracting] = useState(false);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const width = container.clientWidth || 180;
    const height = container.clientHeight || 180;

    const getStateHex = (s) => {
      switch (s) {
        case 'LISTENING': return 0x00ffff;
        case 'THINKING': return 0x0099ff;
        case 'AWAITING_CONFIRMATION': return 0xffb700;
        case 'RESOLVED': return 0x00e676;
        case 'INCIDENT_ACTIVE': return 0xff334b;
        default: return 0x00d2ff;
      }
    };

    const getStateCss = (s) => {
      switch (s) {
        case 'LISTENING': return { main: '#00ffff', rgb: '0, 255, 255' };
        case 'THINKING': return { main: '#0099ff', rgb: '0, 153, 255' };
        case 'AWAITING_CONFIRMATION': return { main: '#ffb700', rgb: '255, 183, 0' };
        case 'RESOLVED': return { main: '#00e676', rgb: '0, 230, 118' };
        case 'INCIDENT_ACTIVE': return { main: '#ff334b', rgb: '255, 51, 75' };
        default: return { main: '#00d2ff', rgb: '0, 210, 255' };
      }
    };

    // Try WebGL Renderer first; if browser disables WebGL, use built-in 3D Software Sphere Renderer
    let renderer = null;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch (e1) {
      try {
        renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
      } catch (e2) {
        renderer = null;
      }
    }

    // =========================================================================
    // FALLBACK: 3D Software Projection Renderer on HTML5 2D Canvas
    // Renders the interactive draggable 3D Amazon Echo 4th-Gen Orb even when
    // WebGL hardware context is disabled in the browser.
    // =========================================================================
    if (!renderer) {
      const canvas = document.createElement('canvas');
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      container.innerHTML = '';
      container.appendChild(canvas);
      const ctx = canvas.getContext('2d');
      ctx.scale(dpr, dpr);

      let isDragging = false;
      let prevX = 0;
      let prevY = 0;
      let rotY = 0.4;
      let rotX = 0.28;
      let targetRotY = 0.4;
      let targetRotX = 0.28;

      const onDown = (e) => {
        isDragging = true;
        setIsInteracting(true);
        prevX = e.clientX ?? e.touches?.[0]?.clientX ?? 0;
        prevY = e.clientY ?? e.touches?.[0]?.clientY ?? 0;
      };
      const onMove = (e) => {
        if (!isDragging) return;
        const cx = e.clientX ?? e.touches?.[0]?.clientX ?? prevX;
        const cy = e.clientY ?? e.touches?.[0]?.clientY ?? prevY;
        targetRotY += (cx - prevX) * 0.015;
        targetRotX = Math.max(-0.15, Math.min(0.65, targetRotX + (cy - prevY) * 0.012));
        prevX = cx;
        prevY = cy;
      };
      const onUp = () => {
        isDragging = false;
        setTimeout(() => setIsInteracting(false), 800);
      };

      canvas.addEventListener('mousedown', onDown);
      window.addEventListener('mousemove', onMove);
      window.addEventListener('mouseup', onUp);
      canvas.addEventListener('touchstart', onDown, { passive: true });
      window.addEventListener('touchmove', onMove, { passive: true });
      window.addEventListener('touchend', onUp);

      let animId;
      const startTime = performance.now();

      const render3DCanvas = (now) => {
        animId = requestAnimationFrame(render3DCanvas);
        const t = (now - startTime) * 0.001;
        if (!isDragging) targetRotY += 0.006;
        rotY += (targetRotY - rotY) * 0.1;
        rotX += (targetRotX - rotX) * 0.1;

        const curState = stateRef.current;
        const col = getStateCss(curState);
        const pulse = curState === 'LISTENING' || curState === 'THINKING'
          ? 0.85 + Math.sin(t * 7) * 0.15
          : curState === 'INCIDENT_ACTIVE' || curState === 'AWAITING_CONFIRMATION'
          ? 0.8 + Math.sin(t * 5) * 0.2
          : 0.75 + Math.sin(t * 2) * 0.15;

        ctx.clearRect(0, 0, width, height);
        const cx = width / 2;
        const cy = height / 2 + 2;
        const R = 58;

        // 1. Tabletop Ambient Glow Reflection Pool
        const floorGrad = ctx.createRadialGradient(cx, cy + R * 0.82, 4, cx, cy + R * 0.82, R * 1.15);
        floorGrad.addColorStop(0, `rgba(${col.rgb}, ${0.55 * pulse})`);
        floorGrad.addColorStop(0.5, `rgba(${col.rgb}, ${0.18 * pulse})`);
        floorGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
        ctx.fillStyle = floorGrad;
        ctx.beginPath();
        ctx.ellipse(cx, cy + R * 0.84, R * 1.05, R * 0.32, 0, 0, Math.PI * 2);
        ctx.fill();

        // 2. 3D Spherical Body (Echo 4th-Gen Charcoal Acoustic Sphere)
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, R, R * 0.93, 0, 0, Math.PI * 2);
        ctx.clip();

        const bodyGrad = ctx.createRadialGradient(cx - R * 0.32, cy - R * 0.35, R * 0.08, cx, cy, R * 1.05);
        bodyGrad.addColorStop(0, '#334155');
        bodyGrad.addColorStop(0.45, '#1b2436');
        bodyGrad.addColorStop(0.82, '#0b101d');
        bodyGrad.addColorStop(1, '#050811');
        ctx.fillStyle = bodyGrad;
        ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

        // 3D Projected Acoustic Fabric Mesh Dots (rotates with mouse drag)
        const cosX = Math.cos(rotX);
        const sinX = Math.sin(rotX);
        for (let lat = -1.1; lat <= 1.1; lat += 0.22) {
          const rLat = Math.cos(lat);
          const y0 = Math.sin(lat);
          for (let lon = 0; lon < Math.PI * 2; lon += 0.28) {
            const a = lon + rotY;
            const x3 = rLat * Math.sin(a);
            const z0 = rLat * Math.cos(a);
            const y3 = y0 * cosX - z0 * sinX;
            const z3 = y0 * sinX + z0 * cosX;
            if (z3 > 0.05) {
              const sx = cx + x3 * R * 0.96;
              const sy = cy - y3 * R * 0.90;
              ctx.fillStyle = `rgba(148, 163, 184, ${z3 * 0.22})`;
              ctx.beginPath();
              ctx.arc(sx, sy, 1.15 * z3 + 0.3, 0, Math.PI * 2);
              ctx.fill();
            }
          }
        }

        // Bottom Rim Light Reflection on Sphere
        const rimGrad = ctx.createLinearGradient(cx, cy + R * 0.35, cx, cy + R * 0.95);
        rimGrad.addColorStop(0, 'rgba(0,0,0,0)');
        rimGrad.addColorStop(1, `rgba(${col.rgb}, ${0.55 * pulse})`);
        ctx.fillStyle = rimGrad;
        ctx.fillRect(cx - R, cy + R * 0.3, R * 2, R * 0.7);
        ctx.restore();

        // Sphere Subtle Rim Outline
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.16)';
        ctx.lineWidth = 1.2;
        ctx.beginPath();
        ctx.ellipse(cx, cy, R, R * 0.93, 0, 0, Math.PI * 2);
        ctx.stroke();

        // 3. 3D Top Control Cap & 4 Tactile Echo Buttons (Action, Mute, Vol+, Vol-)
        const topY = cy - R * 0.80 * Math.cos(rotX * 0.55);
        const tiltRx = 20;
        const tiltRy = Math.max(4.5, 11 * Math.sin(rotX + 0.25));
        ctx.fillStyle = '#090e1a';
        ctx.strokeStyle = 'rgba(148, 163, 184, 0.28)';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.ellipse(cx, topY, tiltRx, tiltRy, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        [0, Math.PI / 2, Math.PI, (3 * Math.PI) / 2].forEach((ang, idx) => {
          const bx = cx + Math.cos(ang + rotY) * (tiltRx * 0.58);
          const by = topY + Math.sin(ang + rotY) * (tiltRy * 0.58);
          ctx.fillStyle = idx === 1 && curState === 'INCIDENT_ACTIVE' ? '#ff334b' : '#64748b';
          ctx.beginPath();
          ctx.arc(bx, by, 2.1, 0, Math.PI * 2);
          ctx.fill();
        });

        // 4. Iconic Amazon Echo Glowing 3D Base LED Light Ring
        const ringY = cy + R * 0.74;
        const ringRx = R * 0.68;
        const ringRy = Math.max(6, R * 0.19 * Math.sin(rotX + 0.35));

        ctx.save();
        ctx.shadowColor = col.main;
        ctx.shadowBlur = 14 * pulse;
        ctx.strokeStyle = col.main;
        ctx.lineWidth = 4.5;
        ctx.beginPath();
        ctx.ellipse(cx, ringY, ringRx, ringRy, 0, -0.15, Math.PI + 0.15);
        ctx.stroke();

        // Spinning highlight energy arc on the LED ring
        const spinStart = (t * 3.5) % (Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.ellipse(cx, ringY, ringRx, ringRy, 0, spinStart * 0.5, (spinStart * 0.5) + 0.7);
        ctx.stroke();
        ctx.restore();
      };

      animId = requestAnimationFrame(render3DCanvas);

      return () => {
        cancelAnimationFrame(animId);
        canvas.removeEventListener('mousedown', onDown);
        window.removeEventListener('mousemove', onMove);
        window.removeEventListener('mouseup', onUp);
        canvas.removeEventListener('touchstart', onDown);
        window.removeEventListener('touchmove', onMove);
        window.removeEventListener('touchend', onUp);
      };
    }

    // =========================================================================
    // PRIMARY: Three.js WebGL 3D Renderer
    // =========================================================================
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 1.4, 4.2);
    camera.lookAt(0, 0, 0);

    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    const echoGroup = new THREE.Group();
    scene.add(echoGroup);

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

    const sphereGeometry = new THREE.SphereGeometry(1.2, 64, 48);
    sphereGeometry.scale(1, 0.92, 1);
    const sphereMesh = new THREE.Mesh(sphereGeometry, bodyMaterial);
    sphereMesh.position.y = 0.28;
    echoGroup.add(sphereMesh);

    const topCapGeometry = new THREE.CylinderGeometry(0.38, 0.42, 0.05, 32);
    const topCapMaterial = new THREE.MeshStandardMaterial({
      color: 0x090d16,
      roughness: 0.5,
      metalness: 0.4
    });
    const topCap = new THREE.Mesh(topCapGeometry, topCapMaterial);
    topCap.position.y = 1.34;
    echoGroup.add(topCap);

    const buttonMaterial = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4 });
    [
      { x: 0, z: 0.2 },
      { x: 0, z: -0.2 },
      { x: 0.2, z: 0 },
      { x: -0.2, z: 0 }
    ].forEach((b) => {
      const btnGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.03, 16);
      const btnMesh = new THREE.Mesh(btnGeo, buttonMaterial);
      btnMesh.position.set(b.x, 1.37, b.z);
      echoGroup.add(btnMesh);
    });

    const baseGeometry = new THREE.CylinderGeometry(0.72, 0.68, 0.12, 48);
    const baseMaterial = new THREE.MeshStandardMaterial({
      color: 0x070b14,
      roughness: 0.9,
      metalness: 0.1
    });
    const baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.position.y = -0.74;
    echoGroup.add(baseMesh);

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

    const floorGeometry = new THREE.CircleGeometry(1.6, 48);
    floorGeometry.rotateX(-Math.PI / 2);
    const floorMaterial = new THREE.MeshStandardMaterial({
      color: 0x080c18,
      roughness: 0.6,
      metalness: 0.2
    });
    const floorMesh = new THREE.Mesh(floorGeometry, floorMaterial);
    floorMesh.position.y = -0.80;
    echoGroup.add(floorMesh);

    const ringLight = new THREE.PointLight(0x00d2ff, 3.5, 3.8);
    ringLight.position.set(0, -0.65, 0);
    echoGroup.add(ringLight);

    const ambientLight = new THREE.AmbientLight(0xffffff, 0.65);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0x94a3b8, 1.4);
    keyLight.position.set(3, 4, 3);
    scene.add(keyLight);

    const rimLight = new THREE.DirectionalLight(0x00d2ff, 0.8);
    rimLight.position.set(-3, 2, -2);
    scene.add(rimLight);

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

    let animationFrameId;
    const clock = new THREE.Clock();

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (!isDragging) {
        targetRotationY += 0.003;
      }
      echoGroup.rotation.y += (targetRotationY - echoGroup.rotation.y) * 0.08;
      echoGroup.rotation.x += (targetRotationX - echoGroup.rotation.x) * 0.08;

      const curState = stateRef.current;
      const currentColor = getStateHex(curState);
      ringMaterial.color.setHex(currentColor);
      ringMaterial.emissive.setHex(currentColor);
      ringLight.color.setHex(currentColor);
      rimLight.color.setHex(currentColor);

      const pulse = 1.8 + Math.sin(elapsedTime * 5.0) * 0.8;
      ringMaterial.emissiveIntensity = curState === 'RESOLVED' ? 2.4 : pulse;
      ringLight.intensity = curState === 'RESOLVED' ? 3.6 : pulse * 1.6;

      renderer.render(scene, camera);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      domEl.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      renderer.dispose();
    };
  }, []);

  const getStatusLabel = () => {
    if (isSpeaking) return 'Alexa+ Speaking...';
    if (state === 'THINKING') return 'Alexa+ Reasoning via MCP...';
    if (state === 'LISTENING') return 'Listening to you...';
    if (state === 'AWAITING_CONFIRMATION') return 'Out-of-Band Slack OTP Required';
    if (state === 'RESOLVED') return 'Incident Remediated (Healthy)';
    if (state === 'INCIDENT_ACTIVE') return 'Sev-2 CloudWatch Alarm Active';
    return 'Alexa+ Ready (Say "Alexa" or Tap)';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', position: 'relative', width: '100%' }}>
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
          : 'rgba(56, 189, 248, 0.12)',
        border: `1px solid ${
          state === 'AWAITING_CONFIRMATION'
            ? 'rgba(255, 153, 0, 0.45)'
            : state === 'RESOLVED'
            ? 'rgba(0, 230, 118, 0.45)'
            : state === 'INCIDENT_ACTIVE'
            ? 'rgba(255, 51, 75, 0.45)'
            : 'rgba(56, 189, 248, 0.3)'
        }`,
        color: state === 'AWAITING_CONFIRMATION'
          ? '#ffb700'
          : state === 'RESOLVED'
          ? '#00e676'
          : state === 'INCIDENT_ACTIVE'
          ? '#ff4d61'
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
        }} />
        {getStatusLabel()}
      </div>
    </div>
  );
}
