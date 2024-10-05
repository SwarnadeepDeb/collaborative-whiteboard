import React, { useState } from 'react';
import { Stage, Layer, Circle, Ellipse, Line, Arrow, Star, Ring, Arc, Text, Label, Tag } from 'react-konva';

const DrawShapes = () => {
  const [tool, setTool] = useState('circle'); // Select the shape tool
  const [shapes, setShapes] = useState([]);
  const [newShape, setNewShape] = useState(null);

  const handleMouseDown = (e) => {
    const { x, y } = e.target.getStage().getPointerPosition();
    const shape = { tool, x, y, width: 0, height: 0, points: [x, y, x, y] };

    if (tool === 'text' || tool === 'label') {
      shape.text = tool === 'text' ? 'Sample Text' : 'Label Text';
      shape.fontSize = 20;
      shape.fill = 'black';
    }

    setNewShape(shape);
  };

  const handleMouseMove = (e) => {
    if (!newShape) return;

    const { x, y } = e.target.getStage().getPointerPosition();
    const updatedShape = { ...newShape };

    if (tool === 'line' || tool === 'arrow') {
      updatedShape.points = [newShape.x, newShape.y, x, y];
    } else if (tool !== 'text' && tool !== 'label') {
      updatedShape.width = x - newShape.x;
      updatedShape.height = y - newShape.y;
    }

    setNewShape(updatedShape);
  };

  const handleMouseUp = () => {
    if (newShape) {
      setShapes([...shapes, newShape]);
      setNewShape(null);
    }
  };

  const drawShape = (shape, index) => {
    const { tool, x, y, width, height, points, text, fontSize, fill } = shape;

    switch (tool) {
      case 'circle':
        return <Circle key={index} x={x} y={y} radius={Math.abs(width)} stroke="black" />;
      case 'ellipse':
        return <Ellipse key={index} x={x} y={y} radiusX={Math.abs(width)} radiusY={Math.abs(height)} stroke="black" />;
      case 'line':
        return <Line key={index} points={points} stroke="black" />;
      case 'arrow':
        return <Arrow key={index} points={points} stroke="black" />;
      case 'star':
        return <Star key={index} x={x} y={y} numPoints={5} innerRadius={Math.abs(width)} outerRadius={Math.abs(height)} stroke="black" />;
      case 'ring':
        return <Ring key={index} x={x} y={y} innerRadius={Math.abs(width / 2)} outerRadius={Math.abs(width)} stroke="black" />;
      case 'arc':
        return <Arc key={index} x={x} y={y} innerRadius={Math.abs(width / 2)} outerRadius={Math.abs(width)} angle={120} stroke="black" />;
      case 'text':
        return <Text key={index} x={x} y={y} text={text} fontSize={fontSize} fill={fill} />;
      case 'label':
        return (
          <Label key={index} x={x} y={y}>
            <Tag fill="yellow" />
            <Text text={text} fontSize={fontSize} fill={fill} />
          </Label>
        );
      default:
        return null;
    }
  };

  return (
    <div>
      <div style={{ marginBottom: '10px' }}>
        <button onClick={() => setTool('circle')}>Circle</button>
        <button onClick={() => setTool('ellipse')}>Ellipse</button>
        <button onClick={() => setTool('line')}>Line</button>
        <button onClick={() => setTool('arrow')}>Arrow</button>
        <button onClick={() => setTool('star')}>Star</button>
        <button onClick={() => setTool('ring')}>Ring</button>
        <button onClick={() => setTool('arc')}>Arc</button>
        <button onClick={() => setTool('text')}>Text</button>
        <button onClick={() => setTool('label')}>Label</button>
      </div>
      <Stage
        width={window.innerWidth}
        height={window.innerHeight}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
      >
        <Layer>
          {shapes.map((shape, index) => drawShape(shape, index))}
          {newShape && drawShape(newShape)}
        </Layer>
      </Stage>
    </div>
  );
};

export default DrawShapes;
