// src/components/Panorama360.jsx
import { useEffect, useRef } from 'react';

export default function Panorama360({ src, height = 420, hfov = 100 }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!window.pannellum || !ref.current || !src) return;


    if (ref.current._viewer?.destroy) ref.current._viewer.destroy();

    ref.current._viewer = window.pannellum.viewer(ref.current, {
      type: 'equirectangular',
      panorama: src,         
      autoLoad: true,
      showZoomCtrl: true,
      compass: false,
      hfov,                    


    });

    return () => {
      if (ref.current?._viewer?.destroy) ref.current._viewer.destroy();
    };
  }, [src, hfov]);

  return <div ref={ref} style={{ width: '100%', height }} />;
}
