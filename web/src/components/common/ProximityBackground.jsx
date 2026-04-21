/*
Copyright (C) 2025 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/

import React, { useEffect, useRef, useCallback } from 'react';

const COLORS = [
  [56, 189, 248],   // sky-400
  [129, 140, 248],  // indigo-400
  [45, 212, 191],   // teal-400
  [192, 132, 252],  // purple-400
  [251, 146, 60],   // orange-400
  [52, 211, 153],   // emerald-400
];

const pickColor = () => COLORS[Math.floor(Math.random() * COLORS.length)];

const ProximityBackground = ({
  containerRef,
  diameter = 56,
  fadeDelay = 520,
  disabled = false,
}) => {
  const canvasRef = useRef(null);
  const frameRef = useRef(0);
  const activeCellsRef = useRef(new Map());
  const lastCellRef = useRef(-1);
  const gridRef = useRef({ cols: 0, rows: 0 });
  const sizeRef = useRef({ width: 0, height: 0 });
  const dprRef = useRef(1);

  const paint = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = dprRef.current;
    const { width, height } = sizeRef.current;
    const { cols, rows } = gridRef.current;
    const now = Date.now();
    const cells = activeCellsRef.current;

    ctx.clearRect(0, 0, width * dpr, height * dpr);

    // Draw base grid dots
    const dotRadius = diameter * 0.11;
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const cx = (col + 0.5) * diameter;
        const cy = (row + 0.5) * diameter;

        ctx.beginPath();
        ctx.arc(cx * dpr, cy * dpr, dotRadius * dpr, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(148, 163, 184, 0.06)';
        ctx.fill();
      }
    }

    // Draw active glowing cells
    let hasActive = false;
    cells.forEach((cell, index) => {
      const elapsed = now - cell.start;
      const progress = Math.min(elapsed / fadeDelay, 1);

      if (progress >= 1) {
        cells.delete(index);
        return;
      }

      hasActive = true;

      // Smooth ease-out curve
      const fadeOut = 1 - progress * progress;
      const col = index % cols;
      const row = Math.floor(index / cols);
      const cx = (col + 0.5) * diameter;
      const cy = (row + 0.5) * diameter;
      const [r, g, b] = cell.color;

      // Outer glow
      const glowRadius = diameter * 1.2;
      const gradient = ctx.createRadialGradient(
        cx * dpr, cy * dpr, 0,
        cx * dpr, cy * dpr, glowRadius * dpr,
      );
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${0.35 * fadeOut})`);
      gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${0.15 * fadeOut})`);
      gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${0.04 * fadeOut})`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

      ctx.beginPath();
      ctx.arc(cx * dpr, cy * dpr, glowRadius * dpr, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      // Inner bright dot
      const innerRadius = dotRadius * (1.6 + fadeOut * 0.8);
      ctx.beginPath();
      ctx.arc(cx * dpr, cy * dpr, innerRadius * dpr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${0.85 * fadeOut})`;
      ctx.fill();

      // Cell border glow
      const cellX = col * diameter;
      const cellY = row * diameter;
      ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${0.12 * fadeOut})`;
      ctx.lineWidth = 1 * dpr;
      ctx.strokeRect(
        cellX * dpr + 0.5,
        cellY * dpr + 0.5,
        diameter * dpr,
        diameter * dpr,
      );
    });

    if (hasActive) {
      frameRef.current = requestAnimationFrame(paint);
    } else {
      frameRef.current = 0;
    }
  }, [diameter, fadeDelay]);

  const ensureFrame = useCallback(() => {
    if (!frameRef.current) {
      frameRef.current = requestAnimationFrame(paint);
    }
  }, [paint]);

  // Setup canvas sizing
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;

    const measure = () => {
      const parent = canvas.parentElement;
      if (!parent) return;

      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      dprRef.current = dpr;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      sizeRef.current = { width: rect.width, height: rect.height };
      gridRef.current = {
        cols: Math.max(1, Math.ceil(rect.width / diameter)),
        rows: Math.max(1, Math.ceil(rect.height / diameter)),
      };

      // Redraw base grid
      activeCellsRef.current.clear();
      lastCellRef.current = -1;
      ensureFrame();
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(canvas.parentElement);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [diameter, ensureFrame]);

  // Mouse interaction
  useEffect(() => {
    const container = containerRef?.current;
    const canvas = canvasRef.current;

    if (!container || !canvas || disabled) return undefined;

    const activateCell = (index) => {
      const { cols, rows } = gridRef.current;
      const totalCells = cols * rows;
      if (index < 0 || index >= totalCells) return;

      activeCellsRef.current.set(index, {
        color: pickColor(),
        start: Date.now(),
      });

      ensureFrame();
    };

    const handlePointerMove = (event) => {
      const rect = canvas.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (x < 0 || y < 0 || x > rect.width || y > rect.height) return;

      const { cols, rows } = gridRef.current;
      const col = Math.max(0, Math.min(cols - 1, Math.floor(x / diameter)));
      const row = Math.max(0, Math.min(rows - 1, Math.floor(y / diameter)));
      const index = row * cols + col;

      if (index !== lastCellRef.current) {
        lastCellRef.current = index;
        activateCell(index);

        // Also activate adjacent cells with slight delay for ripple effect
        const adjacentOffsets = [
          [-1, 0], [1, 0], [0, -1], [0, 1],
        ];
        adjacentOffsets.forEach(([dx, dy]) => {
          const adjCol = col + dx;
          const adjRow = row + dy;
          if (adjCol >= 0 && adjCol < cols && adjRow >= 0 && adjRow < rows) {
            const adjIndex = adjRow * cols + adjCol;
            if (!activeCellsRef.current.has(adjIndex)) {
              setTimeout(() => {
                activeCellsRef.current.set(adjIndex, {
                  color: pickColor(),
                  start: Date.now(),
                });
                ensureFrame();
              }, 40);
            }
          }
        });
      }
    };

    const handlePointerLeave = () => {
      lastCellRef.current = -1;
    };

    container.addEventListener('pointermove', handlePointerMove);
    container.addEventListener('pointerleave', handlePointerLeave);

    return () => {
      container.removeEventListener('pointermove', handlePointerMove);
      container.removeEventListener('pointerleave', handlePointerLeave);
    };
  }, [containerRef, diameter, disabled, ensureFrame]);

  // Cleanup
  useEffect(
    () => () => {
      if (frameRef.current) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    },
    [],
  );

  return (
    <div className='newapi-proximity-background' aria-hidden='true'>
      <canvas
        ref={canvasRef}
        className='newapi-proximity-background__canvas'
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
        }}
      />
    </div>
  );
};

export default ProximityBackground;
