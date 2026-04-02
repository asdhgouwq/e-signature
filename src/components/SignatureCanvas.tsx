import { useRef, useEffect, useState, useCallback } from "react";

interface SignatureCanvasProps {
  onSignatureChange: (hasDrawn: boolean) => void;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
}

export default function SignatureCanvas({ onSignatureChange, canvasRef }: SignatureCanvasProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  const getCtx = useCallback(() => canvasRef.current?.getContext("2d"), [canvasRef]);

  // 캔버스 크기 설정
  const resizeCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    const wrapper = wrapperRef.current;
    if (!canvas || !wrapper) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = wrapper.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    ctx.strokeStyle = "#1e293b";
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
  }, [canvasRef]);

  useEffect(() => {
    resizeCanvas();
    window.addEventListener("resize", resizeCanvas);
    return () => window.removeEventListener("resize", resizeCanvas);
  }, [resizeCanvas]);

  // 좌표 추출
  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if ("touches" in e) {
      const touch = e.touches[0] || e.changedTouches[0];
      return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const startDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(true);
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    if (!isDrawing) return;
    const ctx = getCtx();
    if (!ctx) return;
    const pos = getPos(e);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();

    if (!hasDrawn) {
      setHasDrawn(true);
      onSignatureChange(true);
    }
  };

  const endDraw = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    setIsDrawing(false);
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = getCtx();
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    onSignatureChange(false);
    resizeCanvas();
  };

  return (
    <div>
      <div
        ref={wrapperRef}
        className="relative border-[1.5px] border-slate-200 rounded-lg bg-gray-50 overflow-hidden cursor-crosshair hover:border-indigo-600 transition-colors"
      >
        {!hasDrawn && (
          <div className="absolute inset-0 flex items-center justify-center text-slate-300 text-sm pointer-events-none select-none">
            🖊️ 여기에 마우스 또는 손가락으로 서명하세요
          </div>
        )}
        <canvas
          ref={canvasRef}
          className="block w-full h-[220px] touch-none max-[480px]:h-[180px]"
          onMouseDown={startDraw}
          onMouseMove={draw}
          onMouseUp={endDraw}
          onMouseLeave={endDraw}
          onTouchStart={startDraw}
          onTouchMove={draw}
          onTouchEnd={endDraw}
        />
      </div>
      <button
        type="button"
        onClick={clear}
        className="mt-3 px-4 py-2.5 bg-gray-50 text-slate-500 border-[1.5px] border-slate-200 rounded-lg text-sm font-semibold hover:bg-slate-200 transition-all"
      >
        🗑️ 지우기
      </button>
    </div>
  );
}
