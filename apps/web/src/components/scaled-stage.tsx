'use client';

import { useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Render fixed-size content (a device frame, a cover wrap) scaled to fit the
 * available width and a max height — occupying only its *scaled* footprint so
 * the page never overflows. A CSS transform alone keeps the unscaled layout box;
 * here the outer box is sized to width*scale / height*scale and the inner is
 * absolutely positioned + transformed.
 */
export function ScaledStage({
  width,
  height,
  maxHeight = 600,
  children,
}: {
  width: number;
  height: number;
  maxHeight?: number;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => {
      const availW = el.clientWidth;
      if (availW <= 0) return;
      setScale(Math.min(availW / width, maxHeight / height));
    };
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [width, height, maxHeight]);

  return (
    <div ref={ref} className="flex w-full justify-center">
      <div
        style={{
          width: width * scale,
          height: height * scale,
          overflow: 'hidden',
          position: 'relative',
        }}
      >
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width,
            height,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
          }}
        >
          {children}
        </div>
      </div>
    </div>
  );
}
