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

import React, { useEffect, useMemo, useRef } from 'react';

const palette = [
  'rgba(125, 211, 252, 0.34)',
  'rgba(96, 165, 250, 0.28)',
  'rgba(192, 132, 252, 0.26)',
  'rgba(45, 212, 191, 0.24)',
];

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const ProximityBackground = ({
  containerRef,
  columns = 14,
  count = 84,
  disabled = false,
}) => {
  const rootRef = useRef(null);
  const dotRefs = useRef([]);
  const geometryRef = useRef([]);
  const frameRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const strengthRef = useRef(0);
  const activeRef = useRef(false);
  const reducedMotionRef = useRef(false);

  const dots = useMemo(
    () =>
      Array.from({ length: count }, (_, index) => ({
        id: index,
        color: palette[index % palette.length],
      })),
    [count],
  );

  useEffect(() => {
    if (typeof window !== 'undefined') {
      reducedMotionRef.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
    }
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    const container = containerRef?.current;

    if (!root || !container) {
      return undefined;
    }

    const measure = () => {
      geometryRef.current = dotRefs.current.map((node) => {
        if (!node) {
          return null;
        }

        return {
          x: node.offsetLeft + node.offsetWidth / 2,
          y: node.offsetTop + node.offsetHeight / 2,
        };
      });
    };

    const stopFrame = () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    };

    const paint = () => {
      const damping = reducedMotionRef.current ? 0.28 : 0.18;
      const pointer = pointerRef.current;
      const target = targetRef.current;

      pointer.x += (target.x - pointer.x) * damping;
      pointer.y += (target.y - pointer.y) * damping;

      const nextStrength = activeRef.current ? 1 : 0;
      strengthRef.current += (nextStrength - strengthRef.current) * 0.14;

      dotRefs.current.forEach((node, index) => {
        const geometry = geometryRef.current[index];

        if (!node || !geometry) {
          return;
        }

        const dx = pointer.x - geometry.x;
        const dy = pointer.y - geometry.y;
        const distance = Math.hypot(dx, dy);
        const influence =
          clamp(1 - distance / 210, 0, 1) * strengthRef.current;
        const scale = 0.74 + influence * 1.22;
        const opacity = 0.09 + influence * 0.72;
        const blur = 8 - influence * 5;

        node.style.setProperty('--bg-dot-scale', scale.toFixed(3));
        node.style.setProperty('--bg-dot-opacity', opacity.toFixed(3));
        node.style.setProperty('--bg-dot-blur', `${blur.toFixed(2)}px`);
      });

      if (strengthRef.current > 0.015 || activeRef.current) {
        frameRef.current = window.requestAnimationFrame(paint);
      } else {
        stopFrame();
      }
    };

    const ensureFrame = () => {
      if (!frameRef.current) {
        frameRef.current = window.requestAnimationFrame(paint);
      }
    };

    const updatePointerFromEvent = (event) => {
      const rect = root.getBoundingClientRect();
      targetRef.current = {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top,
      };
      activeRef.current = true;
      ensureFrame();
    };

    const handlePointerLeave = () => {
      activeRef.current = false;
      ensureFrame();
    };

    measure();
    dotRefs.current.forEach((node) => {
      if (!node) {
        return;
      }

      node.style.setProperty('--bg-dot-scale', '0.74');
      node.style.setProperty('--bg-dot-opacity', '0.09');
      node.style.setProperty('--bg-dot-blur', '8px');
    });

    const observer = new ResizeObserver(() => {
      measure();
      ensureFrame();
    });

    observer.observe(root);
    observer.observe(container);
    window.addEventListener('resize', measure);

    if (!disabled) {
      container.addEventListener('pointermove', updatePointerFromEvent);
      container.addEventListener('pointerleave', handlePointerLeave);
    }

    return () => {
      stopFrame();
      observer.disconnect();
      window.removeEventListener('resize', measure);

      if (!disabled) {
        container.removeEventListener('pointermove', updatePointerFromEvent);
        container.removeEventListener('pointerleave', handlePointerLeave);
      }
    };
  }, [columns, containerRef, disabled, dots.length]);

  return (
    <div
      ref={rootRef}
      className='newapi-proximity-background'
      aria-hidden='true'
      style={{ '--proximity-columns': columns }}
    >
      <div className='newapi-proximity-background__veil' />
      <div className='newapi-proximity-background__grid'>
        {dots.map((dot, index) => (
          <span
            key={dot.id}
            ref={(node) => {
              dotRefs.current[index] = node;
            }}
            className='newapi-proximity-background__dot'
            style={{ '--bg-dot-color': dot.color }}
          />
        ))}
      </div>
    </div>
  );
};

export default ProximityBackground;
