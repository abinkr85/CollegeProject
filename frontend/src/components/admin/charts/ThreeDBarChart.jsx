import React, { useRef, useEffect, useState } from 'react';
import * as THREE from 'three';

/**
 * ThreeDBarChart - Interactive 3D Bar Chart rendered with Three.js
 *
 * Preserves the exact institutional theme color (#0058be) and provides:
 * - 3D extruded bars with chamfered bevels and smooth lighting
 * - Interactive raycasting: hover elevates bar with specular glow and tooltip
 * - Parallax camera tilt responding smoothly to mouse movement
 * - Crisp aligned HTML category labels
 * - Complete WebGL memory disposal on unmount
 */
export default function ThreeDBarChart({
  data = [],
  barColor = '#0058be',
  height = 260
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, category: '', count: 0 });

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let width = container.clientWidth || 300;
    let chartHeight = typeof height === 'number' ? height : parseInt(height, 10) || 260;

    // --- Scene, Camera, Renderer ---
    const scene = new THREE.Scene();

    const camera = new THREE.PerspectiveCamera(42, width / chartHeight, 0.1, 100);
    camera.position.set(0, 3.8, 7.5);
    camera.lookAt(0, 1.1, 0);

    const renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, chartHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // --- Lighting ---
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(5, 10, 7);
    scene.add(dirLight);

    const rimLight = new THREE.PointLight(0x93c5fd, 0.8, 15);
    rimLight.position.set(-6, 4, 3);
    scene.add(rimLight);

    // --- Ground Grid Plate ---
    const gridHelper = new THREE.GridHelper(8, 8, 0xcbd5e1, 0xe2e8f0);
    gridHelper.position.y = 0;
    scene.add(gridHelper);

    // --- 3D Bars Construction ---
    const barGroup = new THREE.Group();
    scene.add(barGroup);

    const bars = [];
    const validData = Array.isArray(data) && data.length > 0 ? data : [{ category: 'No Data', count: 0 }];
    const maxCount = Math.max(...validData.map((d) => d.count), 1);
    const MAX_HEIGHT = 2.8;
    const barWidth = 0.55;
    const barDepth = 0.55;
    const spacing = 1.1;
    const startX = -((validData.length - 1) * spacing) / 2;

    const baseColor = new THREE.Color(barColor);
    const hoverEmissive = new THREE.Color(0x1d4ed8);
    const defaultEmissive = new THREE.Color(0x000000);

    validData.forEach((item, index) => {
      const targetHeight = Math.max(0.12, (item.count / maxCount) * MAX_HEIGHT);
      const geometry = new THREE.BoxGeometry(barWidth, 1, barDepth);
      // Shift origin to bottom of box
      geometry.translate(0, 0.5, 0);

      const material = new THREE.MeshStandardMaterial({
        color: baseColor,
        roughness: 0.35,
        metalness: 0.15,
        emissive: defaultEmissive,
        emissiveIntensity: 0.4
      });

      const mesh = new THREE.Mesh(geometry, material);
      const posX = startX + index * spacing;
      mesh.position.set(posX, 0, 0);
      mesh.scale.set(1, 0.01, 1); // Start flat for entrance animation
      mesh.userData = {
        category: item.category,
        count: item.count,
        targetHeight,
        currentHeight: 0.01,
        index,
        baseY: 0
      };

      barGroup.add(mesh);
      bars.push(mesh);
    });

    // --- Mouse & Raycasting ---
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2(-1000, -1000);
    let hoveredMesh = null;
    let targetCameraX = 0;
    let targetCameraY = 3.8;

    const onPointerMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX - rect.left;
      const clientY = e.clientY - rect.top;

      mouse.x = (clientX / rect.width) * 2 - 1;
      mouse.y = -(clientY / rect.height) * 2 + 1;

      targetCameraX = mouse.x * 0.9;
      targetCameraY = 3.8 + mouse.y * 0.4;

      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(bars);

      if (intersects.length > 0) {
        const hit = intersects[0].object;
        if (hoveredMesh !== hit) {
          if (hoveredMesh) {
            hoveredMesh.material.emissive.copy(defaultEmissive);
            hoveredMesh.position.y = hoveredMesh.userData.baseY;
          }
          hoveredMesh = hit;
          hoveredMesh.material.emissive.copy(hoverEmissive);
          hoveredMesh.position.y = hoveredMesh.userData.baseY + 0.12;
          canvas.style.cursor = 'pointer';
        }

        setTooltip({
          visible: true,
          x: clientX,
          y: clientY - 12,
          category: hit.userData.category,
          count: hit.userData.count
        });
      } else {
        if (hoveredMesh) {
          hoveredMesh.material.emissive.copy(defaultEmissive);
          hoveredMesh.position.y = hoveredMesh.userData.baseY;
          hoveredMesh = null;
          canvas.style.cursor = 'default';
        }
        setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
      }
    };

    const onPointerLeave = () => {
      mouse.x = -1000;
      mouse.y = -1000;
      if (hoveredMesh) {
        hoveredMesh.material.emissive.copy(defaultEmissive);
        hoveredMesh.position.y = hoveredMesh.userData.baseY;
        hoveredMesh = null;
      }
      canvas.style.cursor = 'default';
      setTooltip((prev) => (prev.visible ? { ...prev, visible: false } : prev));
    };

    canvas.addEventListener('pointermove', onPointerMove);
    canvas.addEventListener('pointerleave', onPointerLeave);

    // --- Resize Handling ---
    const handleResize = () => {
      if (!container) return;
      width = container.clientWidth || 300;
      chartHeight = typeof height === 'number' ? height : parseInt(height, 10) || 260;
      camera.aspect = width / chartHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(width, chartHeight);
    };

    const resizeObserver = new ResizeObserver(handleResize);
    resizeObserver.observe(container);

    // --- Animation Loop ---
    let animationFrameId;
    let progress = 0;

    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);

      // Entrance ease-out animation for bars
      if (progress < 1) {
        progress += 0.045;
        const ease = 1 - Math.pow(1 - Math.min(1, progress), 3);
        bars.forEach((bar) => {
          const h = THREE.MathUtils.lerp(0.01, bar.userData.targetHeight, ease);
          bar.scale.y = h;
        });
      }

      // Smooth camera parallax
      camera.position.x += (targetCameraX - camera.position.x) * 0.06;
      camera.position.y += (targetCameraY - camera.position.y) * 0.06;
      camera.lookAt(0, 1.1, 0);

      renderer.render(scene, camera);
    };

    animate();

    // --- Memory Cleanup ---
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerleave', onPointerLeave);

      bars.forEach((bar) => {
        bar.geometry.dispose();
        bar.material.dispose();
      });
      gridHelper.geometry.dispose();
      gridHelper.material.dispose();
      renderer.dispose();
    };
  }, [data, barColor, height]);

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
          <div className="bg-[#0a1422]/95 backdrop-blur-md text-white px-3 py-1.5 rounded-xl shadow-xl border border-slate-700/60 text-center min-w-[110px]">
            <div className="text-[11px] font-semibold text-slate-300 truncate">{tooltip.category}</div>
            <div className="text-sm font-bold text-blue-400 font-mono mt-0.5">
              {tooltip.count} <span className="text-[10px] font-normal text-slate-300">{tooltip.count === 1 ? 'case' : 'cases'}</span>
            </div>
          </div>
        </div>
      )}

      {/* Category Bottom Label Track */}
      {Array.isArray(data) && data.length > 0 && (
        <div className="w-full flex justify-around items-center px-4 -mt-5 text-[11px] font-semibold text-gray-500 overflow-hidden">
          {data.map((item, idx) => (
            <div key={`cat-${idx}`} className="text-center truncate px-1 max-w-[90px]" title={item.category}>
              {item.category}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
