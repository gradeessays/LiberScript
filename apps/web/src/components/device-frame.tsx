'use client';

import { useEffect, useRef, useState } from 'react';

export type DeviceKind = 'phone' | 'tablet' | 'pc';

interface Spec {
  /** Logical screen size the ebook reflows to. */
  w: number;
  h: number;
  bezel: number;
  bodyRadius: number;
  screenRadius: number;
  chrome: number; // browser chrome height (pc)
  base: number; // laptop base height (pc)
  notch: boolean;
  camera: boolean;
}

const SPECS: Record<DeviceKind, Spec> = {
  phone: { w: 390, h: 800, bezel: 12, bodyRadius: 46, screenRadius: 34, chrome: 0, base: 0, notch: true, camera: false },
  tablet: { w: 820, h: 1120, bezel: 16, bodyRadius: 26, screenRadius: 14, chrome: 0, base: 0, notch: false, camera: true },
  pc: { w: 1180, h: 740, bezel: 12, bodyRadius: 12, screenRadius: 4, chrome: 30, base: 18, notch: false, camera: false },
};

export function DeviceFrame({ device, srcDoc }: { device: DeviceKind; srcDoc: string }) {
  const s = SPECS[device];
  const outerW = s.w + s.bezel * 2;
  const outerH = s.h + s.bezel * 2 + s.chrome + s.base;

  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setScale(Math.min(1, el.clientWidth / outerW)));
    ro.observe(el);
    return () => ro.disconnect();
  }, [outerW]);

  const screen = (
    <iframe
      title="Ebook device preview"
      srcDoc={srcDoc}
      sandbox="allow-same-origin"
      style={{
        width: s.w,
        height: s.h,
        border: 0,
        display: 'block',
        background: '#fff',
        borderRadius: s.screenRadius,
      }}
    />
  );

  return (
    <div
      ref={containerRef}
      className="flex justify-center overflow-hidden"
      style={{ height: outerH * scale + 8 }}
    >
      <div style={{ transform: `scale(${scale})`, transformOrigin: 'top center' }}>
        {device === 'pc' ? (
          <div>
            <div
              style={{
                width: outerW,
                background: '#111',
                borderRadius: s.bodyRadius,
                padding: s.bezel,
                boxShadow: '0 14px 50px rgba(0,0,0,0.3)',
              }}
            >
              <div
                style={{
                  height: s.chrome,
                  background: '#2a2a2c',
                  borderRadius: '8px 8px 0 0',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 6,
                  padding: '0 12px',
                }}
              >
                {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
                  <span key={c} style={{ width: 11, height: 11, borderRadius: 99, background: c }} />
                ))}
                <div style={{ flex: 1, marginLeft: 10, height: 16, background: '#3a3a3d', borderRadius: 8 }} />
              </div>
              {screen}
            </div>
            <div style={{ width: outerW * 0.62, height: s.base, background: '#c8c9cc', margin: '0 auto', borderRadius: '0 0 8px 8px' }} />
            <div style={{ width: outerW * 0.78, height: 6, background: '#a6a7ab', margin: '0 auto', borderRadius: 6 }} />
          </div>
        ) : (
          <div
            style={{
              position: 'relative',
              width: outerW,
              background: '#0b0b0c',
              borderRadius: s.bodyRadius,
              padding: s.bezel,
              boxShadow: '0 14px 50px rgba(0,0,0,0.35)',
            }}
          >
            {s.notch && (
              <div
                style={{
                  position: 'absolute',
                  top: s.bezel,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 130,
                  height: 24,
                  background: '#0b0b0c',
                  borderRadius: '0 0 14px 14px',
                  zIndex: 2,
                }}
              />
            )}
            {s.camera && (
              <div
                style={{
                  position: 'absolute',
                  top: s.bezel / 2 - 3,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  width: 7,
                  height: 7,
                  borderRadius: 99,
                  background: '#3a3a3d',
                }}
              />
            )}
            {screen}
          </div>
        )}
      </div>
    </div>
  );
}
