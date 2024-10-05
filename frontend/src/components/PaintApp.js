import React, { useRef, useState, useEffect } from "react";
import io from "socket.io-client";

const socket = io.connect("http://localhost:5000");

const PaintApp = () => {
  const canvasRef = useRef(null);
  const contextRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [tool, setTool] = useState("pencil");
  const [color, setColor] = useState("#000000");
  const [lineWidth, setLineWidth] = useState(5);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [offsetXX, setOffsetXX] = useState(0);
  const [offsetYY, setOffsetYY] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    canvas.width = window.innerWidth * 2;
    canvas.height = window.innerHeight * 2;
    canvas.style.width = `${window.innerWidth}px`;
    canvas.style.height = `${window.innerHeight}px`;

    const context = canvas.getContext("2d");
    context.scale(2, 2);
    context.lineCap = "round";
    context.strokeStyle = color;
    context.lineWidth = lineWidth;
    contextRef.current = context;

    // Listen for drawing events from the server
    socket.on("draw", ({ tool, color, lineWidth, startX, startY, offsetX, offsetY }) => {

      if (tool === "eraser") {
        contextRef.current.globalCompositeOperation = "destination-out";
        contextRef.current.lineWidth = lineWidth; // Set eraser size
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();
      } else if (tool === "pencil") {
        contextRef.current.globalCompositeOperation = "source-over";
        contextRef.current.strokeStyle = color;
        contextRef.current.lineWidth = lineWidth;
        contextRef.current.lineTo(offsetX, offsetY);
        contextRef.current.stroke();
      } else if (tool === "rectangle") {
        // setOffsetXX(offsetX);
        // setOffsetYY(offsetY);

      }
    });

    // Listen for clearCanvas events from the server
    socket.on("clearCanvas", () => {
      handleClearCanvas(); // Clear the canvas when this event is received
    });

    socket.on("finishDrawing", ({ tool, offsetXX, offsetYY, startX, startY }) => {
      // console.log(match);
      if (tool === "rectangle") {
        console.log(tool);
        const rectWidth = offsetXX - startX;
        const rectHeight = offsetYY - startY;
        contextRef.current.strokeStyle = color;
        contextRef.current.lineWidth = lineWidth;
        // console.log(offsetXX,offsetYY,startX,startY)
        contextRef.current.strokeRect(startX, startY, rectWidth, rectHeight);
      } else {
        contextRef.current.closePath();
      }
      setIsDrawing(false);
    });

    socket.on("handleColorChange", (val) => {
      setColor(val)
    });

    socket.on("handleLineWidthChange", (val) => {
      setLineWidth(val);
    });

    socket.on("startDrawing", (offsetX, offsetY) => {
      setStartX(offsetX);
      setStartY(offsetY);

      if (tool !== "rectangle") {
        contextRef.current.beginPath();
        contextRef.current.moveTo(offsetX, offsetY);
      }
    })
  }, []);

  const startDrawing = ({ nativeEvent }) => {
    const { offsetX, offsetY } = nativeEvent;
    setStartX(offsetX);
    setStartY(offsetY);

    if (tool !== "rectangle") {
      contextRef.current.beginPath();
      contextRef.current.moveTo(offsetX, offsetY);
    }

    setIsDrawing(true);
    socket.emit("startDrawing", {
      offsetX,
      offsetY,
    });
  };

  const draw = ({ nativeEvent }) => {
    if (!isDrawing) return;
    const { offsetX, offsetY } = nativeEvent;

    if (tool === "eraser") {
      contextRef.current.globalCompositeOperation = "destination-out";
      contextRef.current.lineWidth = lineWidth; // Set eraser size
      contextRef.current.lineTo(offsetX, offsetY);
      contextRef.current.stroke();
    } else if (tool === "pencil") {
      contextRef.current.globalCompositeOperation = "source-over";
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = lineWidth;
      contextRef.current.lineTo(offsetX, offsetY);
      contextRef.current.stroke();
    } else if (tool === "rectangle") {
      setOffsetXX(offsetX);
      setOffsetYY(offsetY);
    }
    // Emit drawing data to the server
    socket.emit("draw", {
      tool,
      color,
      lineWidth,
      startX,
      startY,
      offsetX,
      offsetY,
    });
  };

  const finishDrawing = (nativeEvent) => {
    if (tool === "rectangle") {
      // Finalize rectangle on mouse up
      if (!isDrawing) return;
      const rectWidth = offsetXX - startX;
      const rectHeight = offsetYY - startY;
      contextRef.current.strokeStyle = color;
      contextRef.current.lineWidth = lineWidth;
      contextRef.current.strokeRect(startX, startY, rectWidth, rectHeight);
    } else {
      contextRef.current.closePath();
    }
    setIsDrawing(false);
    socket.emit("finishDrawing", { tool, offsetXX, offsetYY, startX, startY });
  };

  const handleColorChange = (e) => {
    setColor(e.target.value);
    socket.emit("handleColorChange",
      e.target.value,
    );
  }

  const handleLineWidthChange = (e) => {
    setLineWidth(e.target.value);
    socket.emit("handleLineWidthChange",
      e.target.value,
    );
  }
  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.clearRect(0, 0, canvas.width, canvas.height);
  };

  const clearCanvas = () => {
    handleClearCanvas(); // Clear the canvas locally
    socket.emit("clearCanvas"); // Emit a clear canvas event to the server
  };

  const saveImage = () => {
    const canvas = canvasRef.current;
    const link = document.createElement("a");
    link.download = "canvas_image.png";
    link.href = canvas.toDataURL();
    link.click();
  };

  return (
    <div className="paint-app">
      <div className="toolbar">
        <button onClick={() => setTool("pencil")}>Pencil</button>
        <button onClick={() => setTool("rectangle")}>Rectangle</button>
        <button onClick={() => setTool("eraser")}>Eraser</button>
        <input type="color" onChange={handleColorChange} value={color} />
        <input
          type="range"
          min="1"
          max="50"
          value={lineWidth}
          onChange={handleLineWidthChange}
        />
        <button onClick={clearCanvas}>Clear Canvas</button>
        <button onClick={saveImage}>Save Image</button>
      </div>

      <canvas
        onMouseDown={startDrawing}
        onMouseUp={finishDrawing}
        onMouseMove={draw}
        ref={canvasRef}
        style={{ border: "1px solid black", cursor: "crosshair" }}
      />
    </div>
  );
};

export default PaintApp;
