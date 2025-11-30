import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface FlipClockProps {
  value: number;
  label: string;
}

function FlipDigit({ value }: { value: number }) {
  const [currentValue, setCurrentValue] = useState(value);
  const [previousValue, setPreviousValue] = useState(value);

  useEffect(() => {
    if (value !== currentValue) {
      setPreviousValue(currentValue);
      setCurrentValue(value);
    }
  }, [value, currentValue]);

  return (
    <div className="relative w-20 h-28 perspective-1000">
      <div className="absolute inset-0 rounded-lg overflow-hidden bg-gradient-to-b from-gray-800 to-gray-900 shadow-xl">
        {/* Top half - current */}
        <div className="absolute top-0 left-0 right-0 h-1/2 overflow-hidden">
          <div className="flex items-start justify-center w-full h-full pt-3">
            <span className="text-6xl font-bold text-white tabular-nums">
              {String(currentValue).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Bottom half - current */}
        <div className="absolute bottom-0 left-0 right-0 h-1/2 overflow-hidden border-t border-black/30">
          <div className="flex items-end justify-center w-full h-full pb-3">
            <span className="text-6xl font-bold text-white/80 tabular-nums">
              {String(currentValue).padStart(2, '0')}
            </span>
          </div>
        </div>

        {/* Flipping animation */}
        <AnimatePresence>
          {previousValue !== currentValue && (
            <>
              {/* Top flipping card */}
              <motion.div
                className="absolute top-0 left-0 right-0 h-1/2 overflow-hidden origin-bottom"
                style={{
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                }}
                initial={{ rotateX: 0 }}
                animate={{ rotateX: -90 }}
                exit={{ rotateX: -90 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900">
                  <div className="flex items-start justify-center w-full h-full pt-3">
                    <span className="text-6xl font-bold text-white tabular-nums">
                      {String(previousValue).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </motion.div>

              {/* Bottom flipping card */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 h-1/2 overflow-hidden origin-top border-t border-black/30"
                style={{
                  transformStyle: 'preserve-3d',
                  backfaceVisibility: 'hidden',
                }}
                initial={{ rotateX: 90 }}
                animate={{ rotateX: 0 }}
                exit={{ rotateX: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
              >
                <div className="w-full h-full bg-gradient-to-b from-gray-800 to-gray-900">
                  <div className="flex items-end justify-center w-full h-full pb-3">
                    <span className="text-6xl font-bold text-white/80 tabular-nums">
                      {String(currentValue).padStart(2, '0')}
                    </span>
                  </div>
                </div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Shine effect */}
        <div className="absolute inset-0 bg-gradient-to-br from-white/5 via-transparent to-transparent pointer-events-none" />
      </div>
    </div>
  );
}

function FlipNumber({ value, digits = 2 }: { value: number; digits?: number }) {
  const numStr = String(value).padStart(digits, '0');
  const digitArray = numStr.split('').map(Number);

  return (
    <div className="flex gap-1">
      {digitArray.map((digit, index) => (
        <FlipDigit key={index} value={digit} />
      ))}
    </div>
  );
}

export default function FlipClock({ value, label }: FlipClockProps) {
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const seconds = value % 60;

  return (
    <div className="flex items-center justify-center gap-6">
      {/* Hours */}
      <div className="flex flex-col items-center gap-3">
        <FlipNumber value={hours} digits={4} />
        <div className="text-sm font-medium text-gray-500 uppercase tracking-widest">
          {label === 'timer' ? 'Hours' : label}
        </div>
      </div>

      {/* Separator */}
      <div className="flex flex-col gap-4 pb-8">
        <div className="w-3 h-3 rounded-full bg-gray-700" />
        <div className="w-3 h-3 rounded-full bg-gray-700" />
      </div>

      {/* Minutes */}
      <div className="flex flex-col items-center gap-3">
        <FlipNumber value={minutes} digits={2} />
        <div className="text-sm font-medium text-gray-500 uppercase tracking-widest">
          Minutes
        </div>
      </div>

      {/* Separator */}
      <div className="flex flex-col gap-4 pb-8">
        <div className="w-3 h-3 rounded-full bg-gray-700" />
        <div className="w-3 h-3 rounded-full bg-gray-700" />
      </div>

      {/* Seconds */}
      <div className="flex flex-col items-center gap-3">
        <FlipNumber value={seconds} digits={2} />
        <div className="text-sm font-medium text-gray-500 uppercase tracking-widest">
          Seconds
        </div>
      </div>
    </div>
  );
}
