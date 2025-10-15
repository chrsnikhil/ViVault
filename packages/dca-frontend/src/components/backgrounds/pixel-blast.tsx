import React, { useEffect, useRef } from 'react';

type PixelBlastProps = {
  pixelSize?: number;
  color?: string;
  className?: string;
  style?: React.CSSProperties;
  speed?: number;
};

const PixelBlast: React.FC<PixelBlastProps> = ({
  pixelSize = 3,
  color = '#B19EEF',
  className,
  style,
  speed = 0.5,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create a simple animated background using CSS
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.position = 'absolute';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.pointerEvents = 'none';
    container.appendChild(canvas);

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    let animationId: number;
    let time = 0;

    const animate = () => {
      time += speed * 0.01;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Create a simple animated pattern
      const cellSize = pixelSize * 4;
      const cols = Math.ceil(canvas.width / cellSize);
      const rows = Math.ceil(canvas.height / cellSize);

      for (let x = 0; x < cols; x++) {
        for (let y = 0; y < rows; y++) {
          const noise = Math.sin(x * 0.1 + time) * Math.cos(y * 0.1 + time);
          const alpha = (noise + 1) * 0.5 * 0.3;

          if (alpha > 0.1) {
            ctx.fillStyle =
              color +
              Math.floor(alpha * 255)
                .toString(16)
                .padStart(2, '0');
            ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
          }
        }
      }

      animationId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      cancelAnimationFrame(animationId);
      if (canvas.parentElement) {
        canvas.parentElement.removeChild(canvas);
      }
    };
  }, [pixelSize, color, speed]);

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden ${className ?? ''}`}
      style={style}
      aria-label="PixelBlast interactive background"
    />
  );
};

export default PixelBlast;
