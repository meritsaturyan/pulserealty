// src/components/PanoLightbox.jsx
import { useEffect, useMemo, useRef, useState } from 'react';
import styled from 'styled-components';

const Overlay = styled.div`
  position: fixed; inset: 0; z-index: 3000;
  background: rgba(0,0,0,.9);
  display: ${p => (p.$open ? 'flex' : 'none')};
  align-items: center; justify-content: center;
`;

const Wrap = styled.div`
  position: relative;
  width: min(96vw, 1200px);
  height: min(90vh, 720px);
  border-radius: 12px;
  overflow: hidden;
  background: #000;
  box-shadow: 0 10px 30px rgba(0,0,0,.5);
`;

const Close = styled.button`
  position: absolute; top: 10px; right: 10px;
  width: 40px; height: 40px; border-radius: 10px;
  border: none; background: rgba(17,24,39,.6); color: #fff;
  font-size: 20px; font-weight: 700; cursor: pointer;
`;

const NavBtn = styled.button`
  position: absolute; top: 50%; transform: translateY(-50%);
  width: 44px; height: 44px; border-radius: 9999px;
  border: 1px solid rgba(255,255,255,.3);
  background: rgba(0,0,0,.35); color:#fff; font-size: 24px; cursor: pointer;
  ${p => (p.$left ? 'left: 10px;' : 'right: 10px;')}
`;

const Counter = styled.div`
  position: absolute; bottom: 10px; left: 50%; transform: translateX(-50%);
  background: rgba(17,24,39,.6); color:#fff; padding: 6px 10px; border-radius: 999px;
  font-weight: 700; font-size: 13px;
`;

export default function PanoLightbox({ isOpen, onClose, images }) {

  const list = useMemo(() => {
    if (!images) return [];
    return Array.isArray(images) ? images.filter(Boolean) : [String(images)];
  }, [images]);

  const [idx, setIdx] = useState(0);
  useEffect(() => { setIdx(0); }, [isOpen]);

  const src = list[idx] || '';
  const viewerRef = useRef(null);
  const boxRef = useRef(null);


  useEffect(() => {
    const root = document.documentElement;
    if (isOpen) root.style.overflow = 'hidden';
    else root.style.overflow = '';
    return () => { root.style.overflow = ''; };
  }, [isOpen]);


  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e) => { if (e.key === 'Escape') onClose?.(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  useEffect(() => {
    if (!isOpen || !src) return;
    const { pannellum } = window || {};
    const el = viewerRef.current;
    if (!el) return;


    el.innerHTML = '';


    if (!pannellum || typeof pannellum.viewer !== 'function') {
      const img = new Image();
      img.src = src;
      img.alt = '360 preview';
      img.style.width = '100%';
      img.style.height = '100%';
      img.style.objectFit = 'contain';
      el.appendChild(img);
      return;
    }

    let v = null;
    try {
      v = pannellum.viewer(el, {
        type: 'equirectangular',
        panorama: src,
        autoLoad: true,
        showZoomCtrl: true,
        compass: false,
        hfov: 100,
        autoRotate: -2,
      });
    } catch { /* ignore */ }

    const onResize = () => { try { v?.resize?.(); } catch {} };
    const ro = new ResizeObserver(onResize);
    if (boxRef.current) ro.observe(boxRef.current);

    return () => {
      try { v?.destroy?.(); } catch {}
      ro.disconnect();
    };
  }, [isOpen, src]);

  if (!isOpen) return <Overlay $open={false} />;

  const prev = () => setIdx(i => (i - 1 + list.length) % list.length);
  const next = () => setIdx(i => (i + 1) % list.length);

  return (
    <Overlay $open onClick={onClose}>
      <Wrap ref={boxRef} onClick={(e) => e.stopPropagation()}>
        <div ref={viewerRef} style={{ width: '100%', height: '100%' }} />
        <Close onClick={onClose} aria-label="Close">✕</Close>
        {list.length > 1 && <>
          <NavBtn $left onClick={prev} aria-label="Prev">‹</NavBtn>
          <NavBtn onClick={next} aria-label="Next">›</NavBtn>
          <Counter>{idx + 1} / {list.length}</Counter>
        </>}
      </Wrap>
    </Overlay>
  );
}
