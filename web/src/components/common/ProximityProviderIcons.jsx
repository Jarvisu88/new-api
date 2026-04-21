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

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const getProviderKey = (label) =>
  `${label}`.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const ProximityProviderIcons = ({
  items = [],
  ariaLabel = '',
  disabled = false,
  className = '',
}) => {
  const containerRef = useRef(null);
  const tooltipRef = useRef(null);
  const itemRefs = useRef([]);
  const geometryRef = useRef([]);
  const frameRef = useRef(0);
  const pointerRef = useRef({ x: 0, y: 0 });
  const targetRef = useRef({ x: 0, y: 0 });
  const strengthRef = useRef(0);
  const activeRef = useRef(false);
  const activeIndexRef = useRef(-1);
  const reducedMotionRef = useRef(false);

  const visibleItems = useMemo(() => items.slice(0, 10), [items]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      reducedMotionRef.current = window.matchMedia(
        '(prefers-reduced-motion: reduce)',
      ).matches;
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    const tooltip = tooltipRef.current;

    if (!container || !tooltip) {
      return undefined;
    }

    const measure = () => {
      const containerRect = container.getBoundingClientRect();

      geometryRef.current = itemRefs.current.map((node) => {
        if (!node) {
          return null;
        }

        const rect = node.getBoundingClientRect();
        return {
          x: rect.left - containerRect.left + rect.width / 2,
          y: rect.top - containerRect.top + rect.height / 2,
        };
      });
    };

    const stopFrame = () => {
      if (frameRef.current) {
        window.cancelAnimationFrame(frameRef.current);
        frameRef.current = 0;
      }
    };

    const resetNode = (node) => {
      if (!node) {
        return;
      }

      node.style.setProperty('--icon-proximity', '0');
      node.style.setProperty('--icon-shift-x', '0px');
      node.style.setProperty('--icon-shift-y', '0px');
      node.style.setProperty('--icon-scale', '1');
      node.style.setProperty('--icon-rotate', '0deg');
      node.dataset.active = 'false';
    };

    const updateTooltip = (index, geometry) => {
      if (index < 0 || !geometry) {
        activeIndexRef.current = -1;
        container.dataset.tooltipActive = 'false';
        tooltip.textContent = '';
        return;
      }

      if (activeIndexRef.current !== index) {
        activeIndexRef.current = index;
        tooltip.textContent = visibleItems[index]?.label || '';
      }

      container.dataset.tooltipActive = 'true';
      container.style.setProperty('--tooltip-x', `${geometry.x.toFixed(2)}px`);
      container.style.setProperty(
        '--tooltip-y',
        `${(geometry.y + 32).toFixed(2)}px`,
      );
    };

    const paint = () => {
      const damping = reducedMotionRef.current ? 0.3 : 0.2;
      const pointer = pointerRef.current;
      const target = targetRef.current;

      pointer.x += (target.x - pointer.x) * damping;
      pointer.y += (target.y - pointer.y) * damping;

      const nextStrength = activeRef.current ? 1 : 0;
      strengthRef.current += (nextStrength - strengthRef.current) * 0.18;

      let nearestIndex = -1;
      let nearestInfluence = 0;
      let nearestGeometry = null;

      itemRefs.current.forEach((node, index) => {
        const geometry = geometryRef.current[index];

        if (!node || !geometry) {
          return;
        }

        const dx = pointer.x - geometry.x;
        const dy = pointer.y - geometry.y;
        const distance = Math.hypot(dx, dy);
        const influence =
          clamp(1 - distance / 152, 0, 1) * strengthRef.current;
        const shiftX = dx * 0.07 * influence;
        const shiftY = -12 * influence;
        const scale = 1 + influence * 0.32;
        const rotate = clamp(dx * 0.11 * influence, -8, 8);

        node.style.setProperty('--icon-proximity', influence.toFixed(3));
        node.style.setProperty('--icon-shift-x', `${shiftX.toFixed(2)}px`);
        node.style.setProperty('--icon-shift-y', `${shiftY.toFixed(2)}px`);
        node.style.setProperty('--icon-scale', scale.toFixed(3));
        node.style.setProperty('--icon-rotate', `${rotate.toFixed(2)}deg`);

        if (influence > nearestInfluence) {
          nearestInfluence = influence;
          nearestIndex = index;
          nearestGeometry = geometry;
        }
      });

      itemRefs.current.forEach((node, index) => {
        if (!node) {
          return;
        }

        node.dataset.active =
          nearestIndex === index && nearestInfluence > 0.16 ? 'true' : 'false';
      });

      updateTooltip(
        nearestInfluence > 0.16 ? nearestIndex : -1,
        nearestInfluence > 0.16 ? nearestGeometry : null,
      );

      if (strengthRef.current > 0.015 || activeRef.current) {
        frameRef.current = window.requestAnimationFrame(paint);
      } else {
        itemRefs.current.forEach(resetNode);
        updateTooltip(-1, null);
        stopFrame();
      }
    };

    const ensureFrame = () => {
      if (!frameRef.current) {
        frameRef.current = window.requestAnimationFrame(paint);
      }
    };

    const handlePointerMove = (event) => {
      const rect = container.getBoundingClientRect();
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

    const handleFocusIn = (event) => {
      const index = itemRefs.current.indexOf(event.target);

      if (index < 0 || !geometryRef.current[index]) {
        return;
      }

      const geometry = geometryRef.current[index];
      targetRef.current = {
        x: geometry.x,
        y: geometry.y,
      };
      activeRef.current = true;
      ensureFrame();
    };

    const handleFocusOut = () => {
      activeRef.current = false;
      ensureFrame();
    };

    measure();
    itemRefs.current.forEach(resetNode);
    container.dataset.tooltipActive = 'false';

    const observer = new ResizeObserver(measure);
    observer.observe(container);
    window.addEventListener('resize', measure);

    if (!disabled) {
      container.addEventListener('pointermove', handlePointerMove);
      container.addEventListener('pointerleave', handlePointerLeave);
    }
    container.addEventListener('focusin', handleFocusIn);
    container.addEventListener('focusout', handleFocusOut);

    return () => {
      stopFrame();
      observer.disconnect();
      window.removeEventListener('resize', measure);

      if (!disabled) {
        container.removeEventListener('pointermove', handlePointerMove);
        container.removeEventListener('pointerleave', handlePointerLeave);
      }
      container.removeEventListener('focusin', handleFocusIn);
      container.removeEventListener('focusout', handleFocusOut);
    };
  }, [disabled, visibleItems]);

  return (
    <div
      ref={containerRef}
      className={`newapi-stack-provider-icons ${className}`.trim()}
      aria-label={ariaLabel}
    >
      {visibleItems.map(({ label, Icon }, index) => (
        <span
          key={label}
          ref={(node) => {
            itemRefs.current[index] = node;
          }}
          role='button'
          className='newapi-stack-provider-icon'
          style={{ '--icon-index': index }}
          title={label}
          aria-label={label}
          data-label={label}
          data-provider={getProviderKey(label)}
          data-active='false'
          tabIndex={0}
        >
          <Icon size={22} />
        </span>
      ))}

      <span
        ref={tooltipRef}
        className='newapi-stack-provider-icons__tooltip'
        aria-hidden='true'
      />
    </div>
  );
};

export default ProximityProviderIcons;
