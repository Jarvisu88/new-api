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

import React, { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';

const normalizeSentences = (sentences) =>
  (sentences || []).map((sentence) =>
    (sentence?.parts || []).map((part) =>
      typeof part === 'string'
        ? { text: part, highlight: false }
        : {
            text: part?.text || '',
            highlight: Boolean(part?.highlight),
          },
    ),
  );

const SentenceFlip = ({ sentences = [], className = '', interval = 2600 }) => {
  const normalizedSentences = useMemo(
    () => normalizeSentences(sentences),
    [sentences],
  );
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setCurrentIndex(0);
  }, [normalizedSentences]);

  useEffect(() => {
    if (normalizedSentences.length <= 1) {
      return undefined;
    }

    const timer = window.setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % normalizedSentences.length);
    }, interval);

    return () => window.clearInterval(timer);
  }, [interval, normalizedSentences.length]);

  const maxParts = useMemo(
    () =>
      normalizedSentences.reduce(
        (max, sentence) => Math.max(max, sentence.length),
        0,
      ),
    [normalizedSentences],
  );

  const slotWidths = useMemo(
    () =>
      Array.from({ length: maxParts }, (_, partIndex) =>
        normalizedSentences.reduce(
          (max, sentence) =>
            Math.max(max, (sentence[partIndex]?.text || '').length),
          1,
        ),
      ),
    [maxParts, normalizedSentences],
  );

  const activeSentence =
    normalizedSentences[currentIndex] || normalizedSentences[0] || [];
  const activeSentenceLabel = activeSentence
    .map((part) => part.text)
    .filter(Boolean)
    .join(' ');

  if (!normalizedSentences.length) {
    return null;
  }

  return (
    <div
      className={`newapi-sentence-flip ${className}`.trim()}
      aria-label={activeSentenceLabel}
      aria-live='polite'
    >
      {Array.from({ length: maxParts }).map((_, partIndex) => {
        const part = activeSentence[partIndex] || {
          text: '',
          highlight: false,
        };

        return (
          <span
            key={`slot-${partIndex}`}
            className='newapi-sentence-flip__slot'
            style={{ '--sentence-slot-ch': slotWidths[partIndex] }}
          >
            <AnimatePresence mode='wait' initial={false}>
              <motion.span
                key={`${currentIndex}-${partIndex}-${part.text || 'blank'}`}
                initial={{ opacity: 0, filter: 'blur(12px)', y: 22 }}
                animate={{
                  opacity: part.text ? 1 : 0,
                  filter: 'blur(0px)',
                  y: 0,
                }}
                exit={{ opacity: 0, filter: 'blur(12px)', y: -22 }}
                transition={{
                  duration: 0.28,
                  ease: [0.22, 1, 0.36, 1],
                  delay: partIndex * 0.09,
                }}
                className={`newapi-sentence-flip__word${part.highlight ? ' is-highlighted' : ''}${part.text ? '' : ' is-placeholder'}`}
                aria-hidden='true'
              >
                {part.text || '\u00A0'}
              </motion.span>
            </AnimatePresence>
          </span>
        );
      })}
    </div>
  );
};

export default SentenceFlip;
