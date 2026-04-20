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

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';

const colors = ['#38bdf8', '#818cf8', '#2dd4bf', '#c084fc'];

const pickColor = () => colors[Math.floor(Math.random() * colors.length)];

const ProximityBackground = ({
  containerRef,
  diameter = 56,
  fadeDelay = 520,
  disabled = false,
}) => {
  const rootRef = useRef(null);
  const sizeRef = useRef({ width: 0, height: 0 });
  const activeTimeoutsRef = useRef(new Map());
  const lastCellRef = useRef(-1);
  const [grid, setGrid] = useState({ cols: 0, rows: 0 });
  const [activeDots, setActiveDots] = useState({});

  const dotCount = grid.cols * grid.rows;

  const dots = useMemo(
    () => Array.from({ length: dotCount }, (_, index) => index),
    [dotCount],
  );

  useEffect(() => {
    const root = rootRef.current;

    if (!root) {
      return undefined;
    }

    const measure = () => {
      const rect = root.getBoundingClientRect();
      sizeRef.current = {
        width: rect.width,
        height: rect.height,
      };

      const cols = Math.max(1, Math.ceil(rect.width / diameter));
      const rows = Math.max(1, Math.ceil(rect.height / diameter));
      setGrid((prev) =>
        prev.cols === cols && prev.rows === rows ? prev : { cols, rows },
      );
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(root);
    window.addEventListener('resize', measure);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', measure);
    };
  }, [diameter]);

  useEffect(() => {
    activeTimeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
    activeTimeoutsRef.current.clear();
    setActiveDots({});
    lastCellRef.current = -1;
  }, [dotCount]);

  useEffect(() => {
    const container = containerRef?.current;
    const root = rootRef.current;

    if (!container || !root || disabled || !grid.cols || !grid.rows) {
      return undefined;
    }

    const activateDot = (index) => {
      if (index < 0 || index >= dotCount) {
        return;
      }

      setActiveDots((prev) => ({
        ...prev,
        [index]: pickColor(),
      }));

      const existing = activeTimeoutsRef.current.get(index);
      if (existing) {
        window.clearTimeout(existing);
      }

      const timeout = window.setTimeout(() => {
        setActiveDots((prev) => {
          if (!(index in prev)) {
            return prev;
          }

          const next = { ...prev };
          delete next[index];
          return next;
        });
        activeTimeoutsRef.current.delete(index);
      }, fadeDelay);

      activeTimeoutsRef.current.set(index, timeout);
    };

    const handlePointerMove = (event) => {
      const rect = root.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;

      if (x < 0 || y < 0 || x > rect.width || y > rect.height) {
        return;
      }

      const col = Math.max(
        0,
        Math.min(grid.cols - 1, Math.floor(x / diameter)),
      );
      const row = Math.max(
        0,
        Math.min(grid.rows - 1, Math.floor(y / diameter)),
      );
      const index = row * grid.cols + col;

      if (index !== lastCellRef.current) {
        lastCellRef.current = index;
        activateDot(index);
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
  }, [containerRef, diameter, disabled, dotCount, fadeDelay, grid.cols, grid.rows]);

  useEffect(
    () => () => {
      activeTimeoutsRef.current.forEach((timer) => window.clearTimeout(timer));
      activeTimeoutsRef.current.clear();
    },
    [],
  );

  return (
    <div ref={rootRef} className='newapi-proximity-background' aria-hidden='true'>
      <div
        className='newapi-proximity-background__grid'
        style={{
          gridTemplateColumns: `repeat(${grid.cols}, minmax(0, ${diameter}px))`,
          gridAutoRows: `${diameter}px`,
        }}
      >
        {dots.map((index) => {
          const glowColor = activeDots[index];
          const isActive = Boolean(glowColor);

          return (
            <motion.div
              key={index}
              className='newapi-proximity-background__cell'
              animate={{
                backgroundColor: isActive ? '#06090f' : '#05070d',
                boxShadow: isActive
                  ? `0 0 0 1px ${glowColor} inset, 0 0 18px 1px ${glowColor}`
                  : '0 0 0 1px rgba(148, 163, 184, 0.08) inset, 0 0 0 0 rgba(0, 0, 0, 0)',
              }}
              transition={{
                duration: 0.18,
                ease: [0.22, 1, 0.36, 1],
              }}
            >
              <motion.div
                className='newapi-proximity-background__dot'
                animate={{
                  backgroundColor: isActive ? glowColor : '#0f172a',
                  scale: isActive ? 1 : 0.84,
                }}
                transition={{
                  duration: 0.18,
                  ease: [0.22, 1, 0.36, 1],
                }}
              />
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ProximityBackground;
