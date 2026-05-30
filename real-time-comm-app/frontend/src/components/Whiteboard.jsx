import React, { useEffect, useRef, useState } from 'react';

const Whiteboard = ({ socket, roomId }) => {
  const canvasRef = useRef();
  const ctxRef = useRef();
  const [drawing, setDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [brushSize, setBrushSize] = useState(5);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = canvas.offsetWidth;
    canvas.height = canvas.offsetHeight;
    const ctx = canvas.getContext('2d');
    ctx.lineCap = 'round';
    ctx.strokeStyle = color;
    ctx.lineWidth = brushSize;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctxRef.current = ctx;

    socket.on('draw', (data) => {
      drawOnCanvas(data, false);
    });
    return () => socket.off('draw');
  }, [socket]);

  const drawOnCanvas = (data, emit = true) => {
    const ctx = ctxRef.current;
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(data.prevX, data.prevY);
    ctx.lineTo(data.x, data.y);
    ctx.strokeStyle = data.color;
    ctx.lineWidth = data.brushSize;
    ctx.stroke();
    if (emit) socket.emit('draw', { ...data, roomId });
  };

  const startDrawing = (e) => {
    setDrawing(true);
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
  };
  const draw = (e) => {
    if (!drawing) return;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    drawOnCanvas({ prevX: x, x, y, color, brushSize }, true);
  };
  const clearCanvas = () => {
    const canvas = canvasRef.current;
    ctxRef.current.clearRect(0, 0, canvas.width, canvas.height);
    ctxRef.current.fillStyle = '#ffffff';
    ctxRef.current.fillRect(0, 0, canvas.width, canvas.height);
    socket.emit('whiteboard-save', { roomId, data: '' });
  };

  return (
    <div className="flex flex-col h-full bg-gray-100 rounded-xl shadow-md">
      <div className="flex gap-2 p-2 bg-white border-b">
        <input type="color" value={color} onChange={e => setColor(e.target.value)} className="w-8 h-8 rounded cursor-pointer" />
        <input type="range" min="1" max="20" value={brushSize} onChange={e => setBrushSize(e.target.value)} />
        <button onClick={clearCanvas} className="px-3 py-1 bg-red-500 text-white rounded-lg hover:bg-red-600">Clear</button>
      </div>
      <canvas ref={canvasRef} onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={() => setDrawing(false)} onMouseLeave={() => setDrawing(false)} className="flex-1 border cursor-crosshair bg-white" />
    </div>
  );
};
export default Whiteboard;