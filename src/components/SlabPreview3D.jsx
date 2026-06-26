// src/components/SlabPreview3D.jsx
import React, { useRef, useEffect } from 'react';

const SlabPreview3D = ({ length, width, thickness }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const l = parseFloat(length) || 5;
    const w = parseFloat(width) || 4;
    const t = Math.min(Math.max(parseFloat(thickness) / 1000, 0.05), 0.3) || 0.175;
    
    // Set canvas size
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    
    // Scale factor
    const scale = 24;
    
    // Center the slab properly
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2 + 15;
    
    // Isometric projection angles
    const angleX = 0.785; // 45 degrees
    const angleY = 0.524; // 30 degrees
    
    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Calculate isometric projection
    const project = (x, y, z) => {
      const screenX = centerX + (x - z) * Math.cos(angleX) * scale;
      const screenY = centerY + (x + z) * Math.sin(angleY) * scale - y * scale;
      return { x: screenX, y: screenY };
    };
    
    // Slab dimensions
    const xMax = l;
    const zMax = w;
    const yMax = t * 2.8; // Exaggerated thickness
    
    // Find center offset to center the slab
    const centerOffsetX = (xMax - zMax) * Math.cos(angleX) * scale / 2;
    const centerOffsetY = (xMax + zMax) * Math.sin(angleY) * scale / 2;
    
    // Adjusted center to keep slab centered
    const adjustedCenterX = centerX - centerOffsetX;
    const adjustedCenterY = centerY - centerOffsetY;
    
    // Recalculate project with adjusted center
    const projectCentered = (x, y, z) => {
      const screenX = adjustedCenterX + (x - z) * Math.cos(angleX) * scale;
      const screenY = adjustedCenterY + (x + z) * Math.sin(angleY) * scale - y * scale;
      return { x: screenX, y: screenY };
    };
    
    // Define all 8 corners
    const corners = {
      bottomFrontLeft:  { x: 0, y: 0, z: 0 },
      bottomFrontRight: { x: xMax, y: 0, z: 0 },
      bottomBackRight:  { x: xMax, y: 0, z: zMax },
      bottomBackLeft:   { x: 0, y: 0, z: zMax },
      topFrontLeft:     { x: 0, y: yMax, z: 0 },
      topFrontRight:    { x: xMax, y: yMax, z: 0 },
      topBackRight:     { x: xMax, y: yMax, z: zMax },
      topBackLeft:      { x: 0, y: yMax, z: zMax },
    };
    
    // Project all corners
    const p = {};
    Object.keys(corners).forEach(key => {
      p[key] = projectCentered(corners[key].x, corners[key].y, corners[key].z);
    });
    
    // Check if dark mode
    const isDarkMode = document.documentElement.classList.contains('dark');
    
    // Define faces (back to front for correct z-ordering)
    const faces = [
      { 
        name: 'back',
        corners: [p.bottomBackRight, p.bottomBackLeft, p.topBackLeft, p.topBackRight],
        color: isDarkMode ? '#1e3a4a' : '#cce1eb',
        stroke: '#0A2F44'
      },
      { 
        name: 'left',
        corners: [p.bottomBackLeft, p.bottomFrontLeft, p.topFrontLeft, p.topBackLeft],
        color: isDarkMode ? '#4a7a8a' : '#66a4c2',
        stroke: '#0A2F44'
      },
      { 
        name: 'right',
        corners: [p.bottomFrontRight, p.bottomBackRight, p.topBackRight, p.topFrontRight],
        color: isDarkMode ? '#3a6a7a' : '#99c2d6',
        stroke: '#0A2F44'
      },
      { 
        name: 'front',
        corners: [p.bottomFrontLeft, p.bottomFrontRight, p.topFrontRight, p.topFrontLeft],
        color: isDarkMode ? '#2a4a5a' : '#e6f0f5',
        stroke: '#0A2F44'
      },
      { 
        name: 'top',
        corners: [p.topFrontLeft, p.topFrontRight, p.topBackRight, p.topBackLeft],
        color: isDarkMode ? '#0A2F44' : '#0A2F44',
        stroke: '#0A2F44'
      },
    ];
    
    // Draw all faces (back to front)
    faces.forEach(face => {
      if (face.corners.every(c => c && typeof c.x === 'number')) {
        ctx.beginPath();
        ctx.moveTo(face.corners[0].x, face.corners[0].y);
        for (let i = 1; i < face.corners.length; i++) {
          ctx.lineTo(face.corners[i].x, face.corners[i].y);
        }
        ctx.closePath();
        ctx.fillStyle = face.color;
        ctx.fill();
        ctx.strokeStyle = face.stroke;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }
    });
    
    // Draw dimension lines on top surface
    ctx.beginPath();
    const startDim = projectCentered(0, yMax + 0.08, 0);
    const endDim = projectCentered(xMax, yMax + 0.08, 0);
    ctx.moveTo(startDim.x, startDim.y);
    ctx.lineTo(endDim.x, endDim.y);
    ctx.strokeStyle = isDarkMode ? '#9ca3af' : '#6b7280';
    ctx.lineWidth = 1;
    ctx.stroke();
    
    // Dimension arrows
    ctx.beginPath();
    ctx.moveTo(endDim.x - 4, endDim.y - 2);
    ctx.lineTo(endDim.x, endDim.y);
    ctx.lineTo(endDim.x - 4, endDim.y + 2);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(startDim.x + 4, startDim.y - 2);
    ctx.lineTo(startDim.x, startDim.y);
    ctx.lineTo(startDim.x + 4, startDim.y + 2);
    ctx.stroke();
    
    // Length label
    ctx.font = '10px monospace';
    ctx.fillStyle = isDarkMode ? '#66a4c2' : '#0A2F44';
    ctx.fillText(`${l}m`, (startDim.x + endDim.x) / 2 - 8, startDim.y - 5);
    
    // Width dimension
    ctx.beginPath();
    const startDimW = projectCentered(xMax + 0.12, yMax + 0.08, 0);
    const endDimW = projectCentered(xMax + 0.12, yMax + 0.08, zMax);
    ctx.moveTo(startDimW.x, startDimW.y);
    ctx.lineTo(endDimW.x, endDimW.y);
    ctx.stroke();
    
    ctx.fillText(`${w}m`, endDimW.x + 5, (startDimW.y + endDimW.y) / 2);
    
    // Thickness label on side
    const thicknessPos = projectCentered(xMax - 0.8, yMax / 2, 0.5);
    ctx.fillStyle = isDarkMode ? '#66a4c2' : '#0A2F44';
    ctx.font = '9px monospace';
    ctx.fillText(`${Math.round(parseFloat(thickness) * 1000)}mm`, thicknessPos.x - 20, thicknessPos.y);
    
    // Draw small support indicators at bottom corners
    const supports = [
      projectCentered(0, -0.05, 0),
      projectCentered(xMax, -0.05, 0),
      projectCentered(0, -0.05, zMax),
      projectCentered(xMax, -0.05, zMax),
    ];
    
    supports.forEach(pos => {
      ctx.beginPath();
      ctx.moveTo(pos.x - 5, pos.y + 3);
      ctx.lineTo(pos.x, pos.y + 10);
      ctx.lineTo(pos.x + 5, pos.y + 3);
      ctx.fillStyle = isDarkMode ? '#6b7280' : '#9ca3af';
      ctx.fill();
    });
    
  }, [length, width, thickness]);

  return (
    <canvas 
      ref={canvasRef} 
      className="w-full h-auto rounded-lg"
      style={{ background: 'transparent', minHeight: '200px', width: '100%' }}
    />
  );
};

export default SlabPreview3D;