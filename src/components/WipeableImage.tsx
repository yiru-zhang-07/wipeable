import React, { useEffect, useRef, useState } from 'react';

interface WipeableImageProps {
  topImage: string;
  bottomContent: React.ReactNode;
  className?: string;
  containedMode?: boolean;
  nameCardStyle?: boolean;
}

const WipeableImage: React.FC<WipeableImageProps> = ({ 
  topImage, 
  bottomContent,
  className = '',
  containedMode = false,
  nameCardStyle = false
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const [isErasing, setIsErasing] = useState(false);
  const [isMobileOrTablet, setIsMobileOrTablet] = useState(false);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const watercolorBrushes = useRef<HTMLCanvasElement[]>([]);
  const scratchAreaRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const checkDevice = () => {
      setIsMobileOrTablet(window.innerWidth < 1024);
    };
    
    checkDevice();
    window.addEventListener('resize', checkDevice);
    
    return () => {
      window.removeEventListener('resize', checkDevice);
    };
  }, []);

  useEffect(() => {
    const createWatercolorBrush = (size: number, opacity: number) => {
      const canvas = document.createElement('canvas');
      canvas.width = size * 2;
      canvas.height = size * 2;
      const ctx = canvas.getContext('2d');
      if (!ctx) return canvas;

      ctx.globalAlpha = opacity;
      for (let i = 0; i < 20; i++) {
        const radius = Math.random() * size * 0.4 + size * 0.6;
        const angle = Math.random() * Math.PI * 2;
        const distance = Math.random() * (size * 0.4);
        
        ctx.beginPath();
        ctx.arc(
          size + Math.cos(angle) * distance, 
          size + Math.sin(angle) * distance, 
          radius, 0, Math.PI * 2
        );
        ctx.fill();
      }
      
      return canvas;
    };

    watercolorBrushes.current = [
      createWatercolorBrush(40, 0.4),
      createWatercolorBrush(60, 0.35),
      createWatercolorBrush(80, 0.3),
      createWatercolorBrush(100, 0.25),
    ];
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return;
    
    contextRef.current = context;
    
    const image = new Image();
    image.crossOrigin = "anonymous";
    image.src = topImage;
    imageRef.current = image;
    
    image.onload = () => {
      if (!containerRef.current) return;
      
      let width, height;
      
      if (containedMode && scratchAreaRef.current) {
        const scratchRect = scratchAreaRef.current.getBoundingClientRect();
        width = scratchRect.width;
        height = scratchRect.height;
      } else {
        const containerRect = containerRef.current.getBoundingClientRect();
        width = containerRect.width;
        height = containerRect.height;
      }
      
      canvas.width = width;
      canvas.height = height;
      
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      context.drawImage(image, 0, 0, width, height);
      setIsLoaded(true);
    };
  }, [topImage, containedMode]);

  useEffect(() => {
    const handleResize = () => {
      if (!canvasRef.current || !imageRef.current || !contextRef.current) return;
      
      let width, height;
      
      if (containedMode && scratchAreaRef.current) {
        const scratchRect = scratchAreaRef.current.getBoundingClientRect();
        width = scratchRect.width;
        height = scratchRect.height;
      } else if (containerRef.current) {
        const containerRect = containerRef.current.getBoundingClientRect();
        width = containerRect.width;
        height = containerRect.height;
      } else {
        return;
      }
      
      const canvas = canvasRef.current;
      const context = contextRef.current;
      
      canvas.width = width;
      canvas.height = height;
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      
      context.drawImage(imageRef.current, 0, 0, width, height);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [containedMode]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    if ((!containedMode && !containerRef.current) || 
        (containedMode && !scratchAreaRef.current) || 
        !isLoaded) return;
    
    let containerRect;
    
    if (containedMode && scratchAreaRef.current) {
      containerRect = scratchAreaRef.current.getBoundingClientRect();
    } else if (containerRef.current) {
      containerRect = containerRef.current.getBoundingClientRect();
    } else {
      return;
    }
    
    let clientX, clientY;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    
    const x = clientX - containerRect.left;
    const y = clientY - containerRect.top;
    
    setMousePosition({ x, y });
    
    if (isErasing && contextRef.current) {
      applyWatercolorErase(x, y);
    }
  };

  const applyWatercolorErase = (x: number, y: number) => {
    if (!contextRef.current || watercolorBrushes.current.length === 0) return;
    
    const context = contextRef.current;
    
    const brushIndex = Math.floor(Math.random() * watercolorBrushes.current.length);
    const brush = watercolorBrushes.current[brushIndex];
    
    context.globalCompositeOperation = 'destination-out';
    
    const randomScale = 0.8 + Math.random() * 0.4;
    const size = brush.width / 2 * randomScale;
    
    context.drawImage(
      brush, 
      x - size, 
      y - size, 
      size * 2, 
      size * 2
    );
  };

  const handleStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    setIsErasing(true);
    handleMouseMove(e);
  };

  const handleEnd = () => {
    setIsErasing(false);
  };

  return (
    <div 
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
    >
      <div className="absolute inset-0 z-0 flex items-center justify-center">
        {bottomContent}
      </div>
      
      {containedMode ? (
        <div 
          ref={scratchAreaRef}
          className={`absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 ${
            nameCardStyle 
              ? 'w-[350px] sm:w-[400px] h-[200px] sm:h-[225px]' 
              : 'w-1/2 aspect-video'
          } z-10 rounded-lg overflow-hidden border-4 border-white/20 shadow-xl`}
          style={{ maxWidth: nameCardStyle ? "400px" : "600px" }}
          onMouseMove={handleMouseMove}
          onMouseDown={handleStart}
          onMouseUp={handleEnd}
          onMouseLeave={handleEnd}
          onTouchMove={handleMouseMove}
          onTouchStart={handleStart}
          onTouchEnd={handleEnd}
        >
          <canvas 
            ref={canvasRef} 
            className="absolute inset-0 z-10 touch-none"
          />
          
          {isLoaded && (
            <div 
              className={`absolute z-20 transition-opacity duration-500 ${isErasing ? 'opacity-0' : 'opacity-100'}`}
              style={{ 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="px-4 py-2 rounded-full bg-black/60 text-white text-sm backdrop-blur-sm">
                {isMobileOrTablet ? 'Touch to reveal' : 'Scratch to reveal'}
              </div>
            </div>
          )}
        </div>
      ) : (
        <>
          <canvas 
            ref={canvasRef} 
            className="absolute inset-0 z-10 touch-none"
          />
          
          {isLoaded && (
            <div 
              className={`absolute z-20 transition-opacity duration-500 ${isErasing ? 'opacity-0' : 'opacity-100'}`}
              style={{ 
                top: '50%', 
                left: '50%', 
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="px-4 py-2 rounded-full bg-black/60 text-white text-sm backdrop-blur-sm">
                {isMobileOrTablet ? 'Touch and paint to reveal' : 'Click and paint to reveal'}
              </div>
            </div>
          )}
        </>
      )}
      
      {!isLoaded && (
        <div className="absolute inset-0 z-20 flex items-center justify-center bg-gray-100">
          <div className="animate-pulse-slow w-6 h-6 bg-primary rounded-full"></div>
        </div>
      )}
    </div>
  );
};

export default WipeableImage;
