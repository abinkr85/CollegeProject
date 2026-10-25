import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

/**
 * ThreeDDonutChart - Interactive 3D Segmented Donut Chart rendered with Three.js
 *
 * Preserves the exact status color themes:
 * - Open: #ef4444 (red-500)
 * - In Progress: #f59e0b (amber-500)
 * - Resolved: #10b981 (emerald-500)
 *
 * Provides:
 * - 3D extruded beveled torus slices with studio three-point lighting
 * - Interactive raycasting: hovered slice smoothly explodes outwards with tooltip
 * - Gentle continuous 3D idle rotation with interactive mouse tilt
 * - Matching clean legend with counts and percentages
 * - Full WebGL memory disposal on unmount
 */
export default function ThreeDDonutChart({
  data = [],
  colors = {
    Open: '#ef4444',
    'In Progress': '#f59e0b',
    Resolved: '#10b981'
  },
  height = 210
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, name: '', value: 0, percentage: 0 });

  const total = Array.isArray(data) ? data.reduce((acc, curr) => acc + (curr.value || 0), 0) : 0;

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let width = container.clientWidth || 280;
    let chartHeight = typeof height === 'number' ? height : parseInt(height, 10) || 210;

    // --- Scene, Camera, Renderer ---
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(40, width / chartHeight, 0.1, 100);
    camera.position.set(0, 0, 6.2);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, chartHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 1.4);
    dirLight1.position.set(5, 8, 6);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xffffff, 0.5);
    dirLight2.position.set(-6, -4, -3);
    scene.add(dirLight2);

    // --- Donut Slices Construction ---
    const donutGroup = new THREE.Group();
    // Tilt donut forward slightly for 3D perspective
    donutGroup.rotation.x = -0.58;
    donutGroup.rotation.y = 0.18;
    scene.add(donutGroup);

    const slices = [];
    const R_OUT = 1.85;
    const R_IN = 1.22;
    const DEPTH = 0.42;

    const createArcShape = (startAngle, endAngle) => {
      const shape = new THREE.Shape();
      const numSegments = 32;

      // Outer arc
      for (let i = 0; i <= numSegments; i++) {
        const theta = startAngle + ((endAngle - startAngle) * i) / numSegments;
        const x = R_OUT * Math.cos(theta);
        const y = R_OUT * Math.sin(theta);
        if (i === 0) shape.moveTo(x, y);
        else shape.lineTo(x, y);
      }

      // Inner arc (counter-clockwise back to start)
      for (let i = numSegments; i >= 0; i--) {
        const theta = startAngle + ((endAngle - startAngle) * i) / numSegments;
        const x = R_IN * Math.cos(theta);
        const y = R_IN * Math.sin(theta);
        shape.lineTo(x, y);
      }

      shape.closePath();
      return shape;
    };

    if (total === 0) {
      // Empty placeholder ring when no complaints exist
      const shape = createArcShape(0, Math.PI * 2);
      const geometry = new THREE.ExtrudeGeometry(shape, {
        depth: DEPTH,
        bevelEnabled: true,
        bevelSegments: 3,
        steps: 1,
        bevelSize: 0.03,
        bevelThickness: 0.04
      });
      geometry.center();
      const material = new THREE.MeshStandardMaterial({
        color: 0xe2e8f0,
        roughness: 0.4,
        metalness: 0.1
      });
      const mesh = new THREE.Mesh(geometry, material);
      donutGroup.add(mesh);
      slices.push(mesh);
    } else {
      let currentAngle = 0;
      const gap = data.filter((d) => d.value > 0).length > 1 ? 0.05 : 0;

      data.forEach((entry) => {
        if (!entry.value || entry.value <= 0) return;

        const sliceAngle = (entry.value / total) * Math.PI * 2;
        const start = currentAngle + gap / 2;
        const end = currentAngle + sliceAngle - gap / 2;
        const midAngle = (start + end) / 2;
        currentAngle += sliceAngle;

        const shape = createArcShape(start, end);
        const geometry = new THREE.ExtrudeGeometry(shape, {
          depth: DEPTH,
          bevelEnabled: true,
          bevelSegments: 4,
          steps: 1,
          bevelSize: 0.035,
          bevelThickness: 0.045
        });

        const colorHex = colors[entry.name] || '#9ca3af';
        const material = new THREE.MeshStandardMaterial({
          color: new THREE.Color(colorHex),
          roughness: 0.28,
          metalness: 0.12,
          emissive: new THREE.Color(0x000000),
          emissiveIntensity: 0.35
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.userData = {
          name: entry.name,
          value: entry.value,
          percentage: Math.round((entry.value / total) * 100),
          colorHex,
          midAngle,
          exploded: false
        };

        donutGroup.add(mesh);
        slices.push(mesh);
      });
    }

    // --- Mouse & Raycasting ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-1000, -1000);
    let hoveredSlice = null;
    let targetTiltX = -0.58;
    let targetTiltY = 0.18;

    const onPointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      mouse.x = (clientX / rect.width) * 2 - 1;
      mouse.y = -(clientY / rect.height) * 2 + 1;

      targetTiltX = -0.58 + mouse.y * 0.25;
      targetTiltY = 0.18 + mouse.x * 0.3;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(slices);

      if (intersects.length > 0 && intersects[0].object.userData.name) {
        const hit = intersects[0].object;
        if (hoveredSlice !== hit) {
          if (hoveredSlice) {
            hoveredSlice.material.emissive.setHex(0x000000);
            hoveredSlice.userData.exploded = false;
          }
          hoveredSlice = hit;
          hoveredSlice.material.emissive.set(hoveredSlice.userData.colorHex);
          hoveredSlice.userData.exploded = true;
          canvas.style.cursor = 'pointer';
        }

        setTooltip({
          visible: true,
          x: clientX,
          y: clientY - 12,
          name: hit.userData.name,
          value: hit.userData.value,
          percentage: hit.userData.percentage
        });
      } else {
        if (hoveredSlice) {
          hoveredSlice.material.emissive.setHex(0x000000);
          hoveredSlice.userData.exploded = false;
          hoveredSlice = null;
          canvas.style.cursor = 'default';
        }
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }
    };

    const onPointerLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
      targetTiltX = -0.58;
      targetTiltY = 0.18;
      if (hoveredSlice) {
        hoveredSlice.material.emissive.setHex(0x000000);
        hoveredSlice.userData.exploded = false;
        hoveredSlice = null;
      }
      canvas.style.cursor = 'default';
      setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);

    // --- Resize Handling ---
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 280;
      chartHeight = typeof height === 'number' ? height : parseInt(height, 10) || 210;
      camera.aspect = width / chartHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(width, chartHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // --- Animation Loop ---
    let animationFrameId;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Subtle slow continuous idle rotation
      donutGroup.rotation.z += 0.003;

      // Parallax mouse tilt
      donutGroup.rotation.x += (targetTiltX - donutGroup.rotation.x) * 0.08;
      donutGroup.rotation.y += (targetTiltY - donutGroup.rotation.y) * 0.08;

      // Smooth slice explosion outward animation when hovered
      slices.forEach((slice) => {
        if (!slice.userData.name) return;
        const targetOffset = slice.userData.exploded ? 0.2 : 0;
        const currentOffset = slice.userData.currentOffset || 0;
        const newOffset = THREE.MathUtils.lerp(currentOffset, targetOffset, 0.15);
        slice.userData.currentOffset = newOffset;

        slice.position.x = Math.cos(slice.userData.midAngle) * newOffset;
        slice.position.y = Math.sin(slice.userData.midAngle) * newOffset;
      });

      renderer.render(scene, camera);
    };

    animate();

    // --- Memory Cleanup ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);

      slices.forEach((slice) => {
        slice.geometry.dispose();
        slice.material.dispose();
      });
      renderer.dispose();
    };
  }, [data, colors, height, total]);

  return (
    <div ref={containerRef} className="relative w-full flex flex-col items-center select-none" style={{ height }}>
      {/* 3D WebGL Canvas */}
      <canvas ref={canvasRef} className="w-full h-full block outline-none" />

      {/* Floating Interactive 3D Raycast Tooltip */}
      {tooltip.visible && (
        <div
          className="absolute pointer-events-none z-30 transform -translate-x-1/2 -translate-y-full transition-opacity duration-150"
          style={{ left: `${tooltip.x}px`, top: `${tooltip.y}px` }}
        >
          <div className="bg-[#0a1422]/95 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-xl border border-slate-700/60 text-center min-w-[100px]">
            <div className="text-[11px] font-semibold text-slate-300 truncate">{tooltip.name}</div>
            <div className="text-sm font-bold text-white font-mono mt-0.5">
              {tooltip.value} <span className="text-[10px] font-normal text-slate-400">({tooltip.percentage}%)</span>
            </div>
          </div>
        </div>
      )}

      {/* Custom Clean Status Legend */}
      <div className="flex justify-center flex-wrap gap-4 text-xs mt-1">
        {data.map((entry) => {
          const pct = total > 0 ? Math.round(((entry.value || 0) / total) * 100) : 0;
          return (
            <div key={entry.name} className="flex items-center gap-1.5 font-medium text-gray-600">
              <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: colors[entry.name] || '#9ca3af' }} />
              <span>
                {entry.name}: <strong className="text-primary font-mono">{entry.value}</strong> <span className="text-[10px] text-gray-400">({pct}%)</span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
