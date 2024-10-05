import React, { useEffect, useRef, useState } from "react";
import { useSocket } from "../context";
import "./Whiteboard.css";
import {
  Stage,
  Layer,
  Ellipse,
  Rect,
  Line,
  Arrow,
  Star,
  Ring,
  Arc,
  Text,
  Label,
  Transformer,
  Tag,
} from "react-konva";
import { ACTIONS } from "./constants";

function Whiteboard({ users, isAdmin }) {
  console.log("entered in the whiteboard");
  const containerRef = useRef(null);
  const transformerRef = useRef();
  const stageRef = useRef();
  const Id = useSocket();

  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  const [action, setAction] = useState(ACTIONS.SELECT);
  const [fillColor, setFillColor] = useState("#ff0000");
  const [strokeColor, setStrokeColor] = useState("#000");
  const [shapes, setShapes] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [selectionBox, setSelectionBox] = useState(null);
  const [editingText, setEditingText] = useState(null);
  const [textInput, setTextInput] = useState("");
  const [selectedUser, setSelectedUser] = useState(null);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const isDraggable = action === ACTIONS.SELECT;

  // Undo/Redo states
  const [undoStack, setUndoStack] = useState([]);
  const [redoStack, setRedoStack] = useState([]);

  const toggleDropdown = () => {
    setIsDropdownOpen((prev) => !prev);
  };

  useEffect(() => {
    document
      .querySelectorAll(".icon-btn")
      ?.forEach((btn) => btn?.classList.remove("active"));
    if (action) {
      document.getElementById(`${action}`)?.classList.add("active");
    }
  }, [action]);

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight,
        });
      }
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);

    return () => {
      window.removeEventListener("resize", updateDimensions);
    };
  }, []);

  // Receiving and Handling Shapes from Socket.io
  useEffect(() => {
    // Listen for new shapes
    Id.socket.on("shapeCreated", ({ shape }) => {
      const newShape = {
        ...shape,
        nodeRef: React.createRef(), // Initialize nodeRef only once when the shape is received
      };
      setShapes((prevShapes) => [...prevShapes, newShape]);
    });

    // Listen for updated shapes
    Id.socket.on("shapeUpdated", ({ shapes }) => {
      const updatedShapes = shapes.map((shape) => ({
        ...shape,
        nodeRef:
          shapes.find((s) => s.id === shape.id)?.nodeRef || React.createRef(), // Maintain the original nodeRef
      }));
      setShapes(updatedShapes);
    });

    // Listen for selection box updates
    Id.socket.on("selectionBoxUpdate", ({ selectionBox }) => {
      setSelectionBox(selectionBox);
    });

    // Listen for selection completion
    Id.socket.on("selectionComplete", ({ selectedShapes }) => {
      const updatedSelectedShapes = selectedShapes.map((shape) => ({
        ...shape,
        nodeRef:
          shapes.find((s) => s.id === shape.id)?.nodeRef || React.createRef(), // Maintain the original nodeRef
      }));
      transformerRef.current.nodes(
        updatedSelectedShapes.map((shape) => shape.nodeRef.current)
      );
      transformerRef.current.getLayer().batchDraw();
      setSelectionBox(null);
    });

    // Listen for text updates
    Id.socket.on("textUpdated", ({ shapeId, text }) => {
      setShapes((prevShapes) =>
        prevShapes.map((shape) => {
          if (shape.id === shapeId) {
            return { ...shape, text };
          }
          return shape;
        })
      );
    });
    Id.socket.on("clearShapes", () => {
      setShapes([]);
    });

    // Listen for shape transformation (resize, rotate) from others
    Id.socket.on("shapeTransformed", ({ updatedShape }) => {
      console.log("Got it inside shapeTransformed!");
      setShapes((prevShapes) =>
        prevShapes.map((shape) => {
          if (shape.id === updatedShape.id) {
            return {
              ...shape,
              x: updatedShape.x,
              y: updatedShape.y,
              width: updatedShape.width,
              height: updatedShape.height,
              points: updatedShape.points,
              fillColor: updatedShape.fillColor,
              strokeColor: updatedShape.strokeColor,
              tool: updatedShape.tool,
              text: updatedShape.tool,
            };
          } else {
            return shape;
          }
        })
      );
    });

    // Listen for shape drag from others
    Id.socket.on("shapeDragged", ({ updatedShape }) => {
      console.log("Got it inside shapeDragged!");
      setShapes((prevShapes) =>
        prevShapes.map((shape) => {
          if (shape.id === updatedShape.id) {
            return {
              ...shape,
              x: updatedShape.x,
              y: updatedShape.y,
              width: updatedShape.width,
              height: updatedShape.height,
              points: updatedShape.points,
              fillColor: updatedShape.fillColor,
              strokeColor: updatedShape.strokeColor,
              tool: updatedShape.tool,
              text: updatedShape.tool,
            };
          } else {
            return shape;
          }
        })
      );
    });
    // // Listen for undo events
    // Id.socket.on("undo", ({ shapes: newShapes }) => {
    //   // const updatedShapes = newShapes.map((shape) => ({
    //   //   ...shape,
    //   //   nodeRef:
    //   //     shapes.find((s) => s.id === shape.id)?.nodeRef || React.createRef(), // Maintain the original nodeRef
    //   // }));
    //   // setShapes(updatedShapes);
    //   if (undoStack.length < 2) return; // Ensure at least two states exist
    //   const previousState = undoStack[undoStack.length - 2]; // Get the second-to-last state
    //   setRedoStack([shapes, ...redoStack]); // Push the current state to the redoStack
    //   setShapes(previousState); // Restore the second-to-last state
    //   setUndoStack(undoStack.slice(0, -1)); // Remove the last item from undoStack
    // });

    // // Listen for redo events
    // Id.socket.on("redo", ({ shapes: newShapes }) => {
    //   // const updatedShapes = newShapes.map((shape) => ({
    //   //   ...shape,
    //   //   nodeRef:
    //   //     shapes.find((s) => s.id === shape.id)?.nodeRef || React.createRef(), // Maintain the original nodeRef
    //   // }));
    //   // setShapes(updatedShapes);

    //   if (redoStack.length === 0) return; // Ensure there's something to redo
    //   const nextState = redoStack[0]; // Get the next state to restore
    //   setUndoStack([...undoStack, nextState]); // Push current shapes to undoStack
    //   setShapes(nextState); // Restore the next state
    //   setRedoStack(redoStack.slice(1)); // Remove the first item from redoStack
    // });

    Id.socket.on(
      "undo",
      ({
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        shapes: newShapes,
      }) => {
        // Update the local stacks and shapes with the received data
        console.log("I invoked in the undo event");
        setUndoStack(newUndoStack);
        setRedoStack(newRedoStack);
        setShapes(newShapes);
      }
    );

    // Listen for redo events
    Id.socket.on(
      "redo",
      ({
        undoStack: newUndoStack,
        redoStack: newRedoStack,
        shapes: newShapes,
      }) => {
        // Update the local stacks and shapes with the received data
        console.log("I invoked in the redo event");
        setUndoStack(newUndoStack);
        setRedoStack(newRedoStack);
        setShapes(newShapes);
      }
    );

    Id.socket.on("shapesChange", ({ shapes: newShapes }) => {
      console.log("I also invoked inside event listener shapesChange");
      const updatedShapes = newShapes.map((shape) => ({
        ...shape,
        nodeRef:
          shapes.find((s) => s.id === shape.id)?.nodeRef || React.createRef(), // Maintain the original nodeRef
      }));
      setUndoStack([...undoStack, updatedShapes]);
      setShapes(updatedShapes);
      setRedoStack([]);
    });

    return () => {
      Id.socket.off("shapesChange");
      Id.socket.off("undo");
      Id.socket.off("redo");
      Id.socket.off("shapeCreated");
      Id.socket.off("shapeUpdated");
      Id.socket.off("selectionBoxUpdate");
      Id.socket.off("selectionComplete");
      Id.socket.off("textUpdated");
      Id.socket.off("clearShapes");
      Id.socket.off("shapeTransformed");
      Id.socket.off("shapeDragged");
    };
  }, [shapes]);

  useEffect(() => {
    shapes.forEach((shape) => {
      const node = shape.nodeRef.current;
      if (node) {
        node.on("transform", onTransform);
        node.on("dragmove", onDragMove);
      }
    });

    return () => {
      shapes.forEach((shape) => {
        const node = shape.nodeRef.current;
        if (node) {
          node.off("transform", onTransform);
          node.off("dragmove", onDragMove);
        }
      });
    };
  }, [shapes]); // Runs whenever shapes change

  useEffect(() => {
    // Listen for canvas zoom updates from other users
    Id.socket.on("updateCanvasZoom", ({ scale, position }) => {
      const stage = stageRef.current;

      // Apply the received scale and position
      stage.scale({ x: scale, y: scale });
      stage.position(position);
      stage.batchDraw();
    });

    // Listen for canvas drag updates from other users
    Id.socket.on("updateCanvasDrag", ({ position }) => {
      const stage = stageRef.current;

      // Apply the received position
      stage.position(position);
      stage.batchDraw();
    });

    // Clean up event listeners on component unmount
    return () => {
      Id.socket.off("updateCanvasZoom");
      Id.socket.off("updateCanvasDrag");
    };
  }, []);

  const handleUserAction = (adminAction) => {
    console.log(Id.roomId);
    if (!selectedUser) return;
    switch (adminAction) {
      case "call":
        break;
      case "quitCall":
        break;
      case "grantPermission":
        Id.socket.emit("grantPermission", Id.currentUser);
        break;
      case "revokePermission":
        Id.socket.emit("revokePermission", Id.currentUser);
        break;
      case "kickUser":
        Id.socket.emit("disconnectUser", Id.roomId, Id.currentUser.socketId);
        break;
      default:
        break;
    }
  };

  // const handleUndo = () => {
  //   if (undoStack.length < 2) return; // Ensure at least two states exist
  //   const previousState = undoStack[undoStack.length - 2]; // Get the second-to-last state
  //   setRedoStack([shapes, ...redoStack]); // Push the current state to the redoStack
  //   setShapes(previousState); // Restore the second-to-last state
  //   setUndoStack(undoStack.slice(0, -1)); // Remove the last item from undoStack

  //   Id.socket.emit("undo", { shapes: previousState , }, Id.roomId);
  // };

  // const handleRedo = () => {
  //   if (redoStack.length === 0) return; // Ensure there's something to redo
  //   const nextState = redoStack[0]; // Get the next state to restore
  //   setUndoStack([...undoStack, nextState]); // Push current shapes to undoStack
  //   setShapes(nextState); // Restore the next state
  //   setRedoStack(redoStack.slice(1)); // Remove the first item from redoStack

  //   Id.socket.emit("redo", { shapes: nextState }, Id.roomId);
  // };

  const handleUndo = () => {
    setAction(ACTIONS.UNDO);
    if (undoStack.length < 2) return; // Ensure at least two states exist

    const previousState = undoStack[undoStack.length - 2]; // Get the second-to-last state

    // Update redo stack with the current shapes state
    setRedoStack([undoStack[undoStack.length - 1], ...redoStack]);

    // Update shapes to the previous state
    setShapes(previousState);

    // Update undo stack by removing the last state
    setUndoStack(undoStack.slice(0, -1));

    // Emit the updated stacks and shapes to other clients
    Id.socket.emit(
      "undo",
      {
        undoStack: undoStack.slice(0, -1),
        redoStack: [undoStack[undoStack.length - 1], ...redoStack],
        shapes: previousState,
      },
      Id.roomId
    );
  };

  const handleRedo = () => {
    setAction(ACTIONS.REDO);
    if (redoStack.length === 0) return; // Ensure there's something to redo

    const nextState = redoStack[0]; // Get the next state to restore

    // Update undo stack with the current state
    setUndoStack([...undoStack, nextState]);

    // Update shapes to the next state
    setShapes(nextState);

    // Update redo stack by removing the first state
    setRedoStack(redoStack.slice(1));

    // Emit the updated stacks and shapes to other clients
    Id.socket.emit(
      "redo",
      {
        undoStack: [...undoStack, nextState],
        redoStack: redoStack.slice(1),
        shapes: nextState,
      },
      Id.roomId
    );
  };

  // Pointer Down Event
  let startShapes;
  const onPointerDown = (e) => {
    if (action === ACTIONS.DRAG) return;
    startShapes = [...shapes];
    // const { x, y } = e.target.getStage().getPointerPosition();
    const { x, y } = stageRef.current.getRelativePointerPosition();
    setIsDrawing(true);

    if (action === ACTIONS.GROUPSELECT) {
      const initialSelectionBox = { x, y, width: 0, height: 0 };
      setSelectionBox(initialSelectionBox);

      // Emit initial selection box to the server
      Id.socket.emit(
        "selectionBoxUpdate",
        { selectionBox: initialSelectionBox },
        Id.roomId
      );
    } else if (action !== ACTIONS.SELECT) {
      const shape = {
        id: `${action}-${Date.now()}`,
        x,
        y,
        width: 0,
        height: 0,
        points: [x, y, x, y],
        fillColor,
        strokeColor,
        strokeWidth,
        tool: action,
        text: action === ACTIONS.TEXT ? "Sample Text" : "",
        nodeRef: React.createRef(), // Initialize nodeRef once when the shape is created
      };
      setShapes([...shapes, shape]);

      // Emit new shape to other users without nodeRef
      Id.socket.emit(
        "shapeCreated",
        { shape: { ...shape, nodeRef: null } },
        Id.roomId
      );
    }
  };

  // Pointer Move Event
  const onPointerMove = (e) => {
    if (!isDrawing) return;

    // const { x, y } = e.target.getStage().getPointerPosition();
    const { x, y } = stageRef.current.getRelativePointerPosition();
    if (action === ACTIONS.GROUPSELECT && selectionBox) {
      const updatedBox = {
        ...selectionBox,
        width: x - selectionBox.x,
        height: y - selectionBox.y,
      };
      setSelectionBox(updatedBox);

      // Emit updated selection box while dragging
      Id.socket.emit(
        "selectionBoxUpdate",
        { selectionBox: updatedBox },
        Id.roomId
      );
    } else if (shapes.length !== 0 && action !== ACTIONS.SELECT) {
      const updatedShapes = shapes.map((shape, index) => {
        if (index === shapes.length - 1) {
          if (shape.tool === ACTIONS.LINE || shape.tool === ACTIONS.ARROW) {
            shape.points = [shape.x, shape.y, x, y];
          } else if (shape.tool === ACTIONS.SCRIBBLE) {
            shape.points = [...shape.points, x, y];
          } else {
            shape.width = x - shape.x;
            shape.height = y - shape.y;
          }
        }
        return shape;
      });
      setShapes(updatedShapes);

      // Emit updated shapes without nodeRef
      Id.socket.emit(
        "shapeUpdated",
        { shapes: updatedShapes.map((s) => ({ ...s, nodeRef: null })) },
        Id.roomId
      );
    }
  };

  // Pointer Up Event
  const onPointerUp = () => {
    setIsDrawing(false);
    // Check if the current state differs from the start state
    const shapesChanged =
      JSON.stringify(startShapes) !== JSON.stringify(shapes);

    if (shapesChanged) {
      console.log("I invoked inside shapeChanged");
      // If shapes have changed, push the current state to the undo stack
      let newUndoStack;
      newUndoStack = [...undoStack, shapes];
      setUndoStack(newUndoStack);
      setRedoStack([]); // Clear redo stack after a new change
      Id.socket.emit("shapesChange", { shapes }, Id.roomId);
    }
    if (action === ACTIONS.GROUPSELECT && selectionBox) {
      const selectedShapes = shapes.filter((shape) => {
        const shapeBounds = {
          x1: shape.x,
          y1: shape.y,
          x2: shape.x + (shape.width || 0),
          y2: shape.y + (shape.height || 0),
        };
        const selectionBounds = {
          x1: Math.min(selectionBox.x, selectionBox.x + selectionBox.width),
          y1: Math.min(selectionBox.y, selectionBox.y + selectionBox.height),
          x2: Math.max(selectionBox.x, selectionBox.x + selectionBox.width),
          y2: Math.max(selectionBox.y, selectionBox.y + selectionBox.height),
        };

        return (
          shapeBounds.x1 >= selectionBounds.x1 &&
          shapeBounds.y1 >= selectionBounds.y1 &&
          shapeBounds.x2 <= selectionBounds.x2 &&
          shapeBounds.y2 <= selectionBounds.y2
        );
      });

      transformerRef.current.nodes(
        selectedShapes.map((shape) => shape.nodeRef.current)
      );
      transformerRef.current.getLayer().batchDraw();

      // Emit selection complete to other users
      Id.socket.emit(
        "selectionComplete",
        {
          selectedShapes: selectedShapes.map((s) => ({ ...s, nodeRef: null })),
        },
        Id.roomId
      );

      setSelectionBox(null);
    }

    if (shapes.length > 0) {
      const lastShape = shapes[shapes.length - 1];
      if (
        lastShape.tool !== "ARROW" &&
        lastShape.tool !== "LINE" &&
        lastShape.tool !== "SCRIBBLE" &&
        lastShape.width === 0 &&
        lastShape.height === 0
      ) {
        setShapes(shapes.slice(0, -1));
      }
    }
  };

  const onClick = (e) => {
    const target = e.target;
    if (action === ACTIONS.SELECT) {
      transformerRef.current.nodes([target]);
      transformerRef.current.getLayer().batchDraw();
    } else {
      return;
    }
    Id.socket.emit("onClick", { shapes, target }, Id.roomId);
  };

  // Handle text editing
  // const handleDoubleClick = (e) => {
  //   const shapeId = e.target.id();
  //   console.log(shapeId);
  //   const shapeIndex = shapes.findIndex((shape) => shape.id === shapeId);
  //   const shape = shapes[shapeIndex];
  //   // console.log(shape);

  //   if (shape?.tool === ACTIONS.TEXT ) {
  //     setEditingText(shapeId);
  //     setTextInput(shape.text || "");
  //     Id.socket.emit("textUpdated", { shapeId, text: shape.text }, Id.roomId);

  //   }
  //   else if( shape?.tool === ACTIONS.LABEL)
  //   {
  //     setEditingText(shapeId);
  //     setTextInput(shape.text || "");
  //     Id.socket.emit("textUpdated", { shapeId, text: shape.text }, Id.roomId);
  //   }
  // };
  const handleDoubleClick = (e) => {
    // Get the target shape
    const target = e.target.getParent(); // Get the parent Label
    let shapeId = target.id(); // Get the ID from the Label
    if(!shapeId)
    {
      shapeId = e.target.id();
    }
    console.log('Double-clicked shape ID:', shapeId); // Log the shape ID
    
    const shapeIndex = shapes.findIndex((shape) => shape.id === shapeId);
    const shape = shapes[shapeIndex];
  
    if (shape?.tool === ACTIONS.TEXT) {
      setEditingText(shapeId);
      setTextInput(shape.text || "");
      Id.socket.emit("textUpdated", { shapeId, text: shape.text }, Id.roomId);
    } else if (shape?.tool === ACTIONS.LABEL) {
      setEditingText(shapeId);
      setTextInput(shape.text || "");
      Id.socket.emit("textUpdated", { shapeId, text: shape.text }, Id.roomId);
    }
  };
  // const handleTextChange = (e) => {
  //   setTextInput(e.target.value);
  //   Id.socket.emit("handleTextChange", { textInput }, Id.roomId);
  // };

  const handleTextChange = (e) => {
    setTextInput(e.target.value);
  };

  // Handle text blur and update shape text
  const handleTextBlur = () => {
    const shapeIndex = shapes.findIndex((shape) => shape.id === editingText);
    if (shapeIndex !== -1) {
      const updatedShapes = shapes.map((shape, index) => {
        if (index === shapeIndex) {
          return { ...shape, text: textInput };
        }
        return shape;
      });
      setShapes(updatedShapes);
      Id.socket.emit(
        "textUpdated",
        { shapeId: editingText, text: textInput },
        Id.roomId
      );
      // Id.socket.current.emit(
      //   "textUpdated",
      //   { shapeId: editingText, text: textInput },
      //   Id.roomId
      // );
    }
    setEditingText(null);
    setTextInput("");
  };

  // // Listen for transformations (resize/rotate)
  // const onTransform = (e) => {
  //   const node = e.target;
  //   console.log(node);
  //   const shapeId = node.id();
  //   const shapeIndex = shapes.findIndex((shape) => shape.id === shapeId);
  //   if (shapeIndex === -1) return;

  //   // const shape = {
  //   //   id: `${action}-${Date.now()}`,
  //   //   x,
  //   //   y,
  //   //   width: 0,
  //   //   height: 0,
  //   //   points: [x, y, x, y],
  //   //   fillColor,
  //   //   strokeColor,
  //   //   tool: action,
  //   //   text: action === ACTIONS.TEXT ? "Sample Text" : "",
  //   //   nodeRef: React.createRef(), // Initialize nodeRef once when the shape is created
  //   // };

  //   const updatedShape = {
  //     ...shapes[shapeIndex],
  //     x: node.x(),
  //     y: node.y(),
  //     width: node.width(),
  //     height: node.height(),
  //     // scaleX: node.scaleX(),
  //     // scaleY: node.scaleY(),
  //     // rotation: node.rotation(),
  //   };

  //   const updatedShapes = shapes.map((shape, index) =>
  //     index === shapeIndex ? updatedShape : shape
  //   );

  //   setShapes(updatedShapes);
  //   // Id.socket.current.emit("shapeTransformed", { updatedShape }, Id.roomId);
  //   Id.socket.emit("shapeTransformed", { updatedShape }, Id.roomId);
  //   console.log("Hiiiiiiiiiiiiiiiiiiiiiiiiii!");
  // };

  // Listen for transformations (resize/rotate)
  // const onTransform = (e) => {
  //   const node = e.target;
  //   const shapeId = node.id();
  //   const shapeIndex = shapes.findIndex((shape) => shape.id === shapeId);
  //   if (shapeIndex === -1) return;

  //   const updatedShape = {
  //     ...shapes[shapeIndex],
  //     x: node.x(),
  //     y: node.y(),
  //     width: node.width() * node.scaleX(), // Capture the transformed width
  //     height: node.height() * node.scaleY(), // Capture the transformed height
  //     scaleX: node.scaleX(), // Store the scale factor
  //     scaleY: node.scaleY(), // Store the scale factor
  //     rotation: node.rotation(), // Capture the rotation
  //   };

  //   const updatedShapes = shapes.map((shape, index) =>
  //     index === shapeIndex ? updatedShape : shape
  //   );

  //   setShapes(updatedShapes);
  //   Id.socket.emit("shapeTransformed", { updatedShape }, Id.roomId);
  // };

  // const onTransform = (e) => {
  //   const node = e.target;
  //   const shapeId = node.id();
  //   const shapeIndex = shapes.findIndex((shape) => shape.id === shapeId);
  //   if (shapeIndex === -1) return;

  //   // Get the shape's node attributes and directly send them
  //   const updatedShape = {
  //     ...shapes[shapeIndex],
  //     x: node.x(),
  //     y: node.y(),
  //     scaleX: node.scaleX(), // Directly capture scaleX
  //     scaleY: node.scaleY(), // Directly capture scaleY
  //     rotation: node.rotation(),
  //     width: node.width() * node.scaleX(), // Capture width
  //     height: node.height() * node.scaleY(), // Capture height if applicable
  //     radius: node.radius ? node.radius() : undefined, // Capture radius if it's a circle
  //     points: node.points ? node.points() : undefined, // For lines/arrows
  //     // Handle Ellipse-specific properties
  //     radiusX: node.radiusX ? node.radiusX() * node.scaleX() : undefined, // Ellipse radiusX
  //     radiusY: node.radiusY ? node.radiusY() * node.scaleY() : undefined, // Ellipse radiusY
  //   };

  //   const updatedShapes = shapes.map((shape, index) =>
  //     index === shapeIndex ? updatedShape : shape
  //   );

  //   setShapes(updatedShapes);

  //   // Emit the updated shape to the server and other users
  //   Id.socket.emit("shapeTransformed", { updatedShape }, Id.roomId);
  // };

  const onTransform = (e) => {
    const node = e.target;
    console.log(node);
    const shapeId = node.id();
    const shapeIndex = shapes.findIndex((shape) => shape.id === shapeId);
    if (shapeIndex === -1) return;

    // Get the current scale factors
    const scaleX = node.scaleX();
    const scaleY = node.scaleY();

    // Prepare the updated shape object
    let updatedShape = {
      ...shapes[shapeIndex],
      x: node.x(),
      y: node.y(),
      rotation: node.rotation(),
      scaleX: scaleX, // Store the current scale factors
      scaleY: scaleY,
    };
    if (shapes[shapeIndex].tool === "TEXT" || shapes[shapeIndex].tool === "LABEL") {
      // Scale font size based on both scales, but use a minimum to avoid text getting too small
      const baseFontSize = shapes[shapeIndex].fontSize || 20; // default font size if not set
      updatedShape.fontSize = Math.max(baseFontSize * scaleY, baseFontSize); // scale font size based on y scale
      updatedShape.text = node.text(); // Ensure the text content is preserved
      updatedShape.width = node.width() * scaleX; // Update width if necessary
      updatedShape.height = node.height() * scaleY; // Update height if necessary
    }
    // Handle scaling for different shapes
    if (node.width && node.height && shapes[shapeIndex].tool === "RECTANGLE") {
      updatedShape.width = node.width() * scaleX;
      updatedShape.height = node.height() * scaleY;
    }

    if (node.radius) {
      updatedShape.radius = node.radius() * Math.max(scaleX, scaleY);
    }

    if (node.radiusX && node.radiusY) {
      updatedShape.radiusX = node.radiusX() * scaleX;
      updatedShape.radiusY = node.radiusY() * scaleY;
    }

    if (node.points) {
      const newPoints = node
        .points()
        .map((point, index) =>
          index % 2 === 0 ? point * scaleX : point * scaleY
        );
      updatedShape.points = newPoints;
    }

    if (node.innerRadius && node.outerRadius) {
      updatedShape.innerRadius = node.innerRadius() * scaleX;
      updatedShape.outerRadius = node.outerRadius() * scaleY;
    }

    // Update the shape in the state
    const updatedShapes = shapes.map((shape, index) =>
      index === shapeIndex ? updatedShape : shape
    );
    setShapes(updatedShapes);

    // Emit the updated shape with the current scale
    Id.socket.emit("shapeTransformed", { updatedShape }, Id.roomId);
  };

  // const onTransform = (e) => {
  //   const node = e.target;
  //   console.log(node);
  //   const shapeId = node.id();
  //   const shapeIndex = shapes.findIndex((shape) => shape.id === shapeId);
  //   if (shapeIndex === -1) return;

  //   // Get the shape's node attributes
  //   let updatedShape = {
  //     ...shapes[shapeIndex],
  //     x: node.x(),
  //     y: node.y(),
  //     rotation: node.rotation(),
  //   };

  //   // Handle scaling for different shapes
  //   if (node.width && node.height && shapes[shapeIndex].tool==='RECTANGLE') {
  //     updatedShape.width = node.width() * node.scaleX();
  //     updatedShape.height = node.height() * node.scaleY();
  //   }

  //   if (node.radius) {
  //     updatedShape.radius = node.radius() * Math.max(node.scaleX(), node.scaleY());
  //   }

  //   if (node.radiusX && node.radiusY) {
  //     updatedShape.radiusX = node.radiusX() * node.scaleX();
  //     updatedShape.radiusY = node.radiusY() * node.scaleY();
  //   }

  //   if (node.points) {
  //     const scaleX = node.scaleX();
  //     const scaleY = node.scaleY();

  //     // Adjust points according to the scale
  //     const newPoints = node.points().map((point, index) =>
  //       index % 2 === 0 ? point * scaleX : point * scaleY
  //     );

  //     updatedShape.points = newPoints;
  //     console.log(updatedShape.points,node.points());

  //   }

  //   if(node.innerRadius && node.outerRadius)
  //   {
  //     updatedShape.innerRadius = node.innerRadius() * node.scaleX();
  //     updatedShape.outerRadius = node.outerRadius() * node.scaleY();
  //   }
  //   // Update the shape in the state
  //   const updatedShapes = shapes.map((shape, index) =>
  //     index === shapeIndex ? updatedShape : shape
  //   );

  //   setShapes(updatedShapes);

  //   // Emit the updated shape to the server and other users
  //   Id.socket.emit("shapeTransformed", { updatedShape }, Id.roomId);
  // };

  // Listen for dragging (moving shapes)
  const onDragMove = (e) => {
    const node = e.target;
    const shapeId = node.id();
    const shapeIndex = shapes.findIndex((shape) => shape.id === shapeId);
    if (shapeIndex === -1) return;

    const updatedShape = {
      ...shapes[shapeIndex],
      x: node.x(),
      y: node.y(),
    };

    const updatedShapes = shapes.map((shape, index) =>
      index === shapeIndex ? updatedShape : shape
    );

    setShapes(updatedShapes);
    // Id.socket.current.emit("shapeDragged", { updatedShape }, Id.roomId);
    Id.socket.emit("shapeDragged", { updatedShape }, Id.roomId);

    console.log("Hiiiiiiiiiiiiiiiiiiiiiiiiii!44444444444444444");
  };

  const handleDownload = () => {
    // Get the canvas as a data URL
    const dataURL = stageRef.current.toDataURL(); // Assuming you have a ref to the Konva stage

    // Create a temporary anchor element to trigger the download
    const link = document.createElement("a");
    link.href = dataURL;
    link.download = "canvas-image.png"; // You can change the file name and extension as needed
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const drawShape = (shape) => {
    const {
      id,
      x,
      y,
      width,
      height,
      points,
      tool,
      fillColor,
      strokeColor,
      nodeRef,
      text,
      radiusX,
      radiusY,
      innerRadius,
      outerRadius,
      strokeWidth,
      fontSize
    } = shape;
    switch (tool) {
      case ACTIONS.CIRCLE:
        return (
          <Ellipse
            key={id}
            id={id}
            x={x}
            y={y}
            // radius={radiusX || radiusY ? undefined: Math.abs(width)}
            radiusX={radiusX ? radiusX : Math.abs(width)}
            radiusY={radiusY ? radiusY : Math.abs(width)}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            draggable={isDraggable}
            onClick={onClick}
            onTransform={onTransform}
            onDragMove={onDragMove}
            ref={nodeRef}
          />
        );
      case ACTIONS.ELLIPSE:
        return (
          <Ellipse
            key={id}
            id={id}
            x={x}
            y={y}
            radiusX={radiusX ? radiusX : Math.abs(width)}
            radiusY={radiusY ? radiusY : Math.abs(height)}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            draggable={isDraggable}
            onClick={onClick}
            onTransform={onTransform}
            onDragMove={onDragMove}
            ref={nodeRef}
          />
        );
      case ACTIONS.RECTANGLE:
        return (
          <Rect
            key={id}
            id={id}
            x={x}
            y={y}
            width={width}
            height={height}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            draggable={isDraggable}
            onClick={onClick}
            onTransform={onTransform}
            onDragMove={onDragMove}
            ref={nodeRef}
          />
        );
      case ACTIONS.LINE:
        return (
          <Line
            key={id}
            id={id}
            points={points}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            draggable={isDraggable}
            onClick={onClick}
            onTransform={onTransform}
            onDragMove={onDragMove}
            ref={nodeRef}
          />
        );
      case ACTIONS.ARROW:
        return (
          <Arrow
            key={id}
            id={id}
            points={points}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            draggable={isDraggable}
            onClick={onClick}
            onTransform={onTransform}
            onDragMove={onDragMove}
            ref={nodeRef}
          />
        );
      case ACTIONS.STAR:
        return (
          <Star
            key={id}
            id={id}
            x={x}
            y={y}
            numPoints={5}
            innerRadius={innerRadius ? innerRadius : Math.abs(width)}
            outerRadius={outerRadius ? outerRadius : Math.abs(height)}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            draggable={isDraggable}
            onClick={onClick}
            onTransform={onTransform}
            onDragMove={onDragMove}
            ref={nodeRef}
          />
        );
      case ACTIONS.RING:
        return (
          <Ring
            key={id}
            id={id}
            x={x}
            y={y}
            innerRadius={innerRadius ? innerRadius : Math.abs(width / 2)}
            outerRadius={outerRadius ? outerRadius : Math.abs(width)}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            draggable={isDraggable}
            onClick={onClick}
            onTransform={onTransform}
            onDragMove={onDragMove}
            ref={nodeRef}
          />
        );
      case ACTIONS.ARC:
        return (
          <Arc
            key={id}
            id={id}
            x={x}
            y={y}
            innerRadius={innerRadius ? innerRadius : Math.abs(width / 2)}
            outerRadius={outerRadius ? outerRadius : Math.abs(width)}
            angle={120}
            fill={fillColor}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            draggable={isDraggable}
            onClick={onClick}
            onTransform={onTransform}
            onDragMove={onDragMove}
            ref={nodeRef}
          />
        );
      case ACTIONS.TEXT:
        return (
          <Text
            key={id}
            id={id}
            x={x}
            y={y}
            text={text || "Sample Text"}
            fontSize={fontSize||20}
            width={width?width:undefined}
            height={height?height:undefined}
            fill={strokeColor}
            draggable={isDraggable}
            onClick={onClick}
            onTransform={onTransform}
            onDragMove={onDragMove}
            ref={nodeRef}
            onDblClick={handleDoubleClick}
          />
        );
      case ACTIONS.LABEL:
        return (
          <Label
            key={id}
            id={id}
            x={x}
            y={y}
            draggable={isDraggable}
            onClick={onClick}
            onTransform={onTransform}
            onDragMove={onDragMove}
            ref={nodeRef}
            onDblClick={handleDoubleClick}
          >
            <Tag fill={fillColor} />
            <Text
              text={text || "Label Text"}
              fontSize={fontSize||20}
              width={width?width:undefined}
              height={height?height:undefined}
              fill={strokeColor}
            />
          </Label>
        );

      case ACTIONS.SCRIBBLE:
        return (
          <Line
            key={id}
            id={id}
            points={points}
            stroke={strokeColor}
            strokeWidth={strokeWidth}
            tension={0.5}
            lineCap="round"
            lineJoin="round"
            draggable={isDraggable}
            onClick={onClick}
            onTransform={onTransform}
            onDragMove={onDragMove}
            ref={nodeRef}
          />
        );
      default:
        return null;
    }
  };

  const clearHandler = (e) => {
    setAction(ACTIONS.CLEAR);
    setShapes([]);
    Id.socket.emit("clearShapes", Id.roomId);
  };

  const scaleBy = 1.05; // Zoom factor
  const MIN_ZOOM = 0.000001;
  const MAX_ZOOM = 50;

  // Emit to socket when zooming
  const handleWheel = (e) => {
    e.evt.preventDefault();

    const stage = stageRef.current;
    const oldScale = stage.scaleX();
    const pointer = stage.getPointerPosition();

    const mousePointTo = {
      x: (pointer.x - stage.x()) / oldScale,
      y: (pointer.y - stage.y()) / oldScale,
    };

    const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;
    const finalScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));

    stage.scale({ x: finalScale, y: finalScale });

    const newPos = {
      x: pointer.x - mousePointTo.x * finalScale,
      y: pointer.y - mousePointTo.y * finalScale,
    };

    stage.position(newPos);
    stage.batchDraw();

    // Emit zoom and position to server
    Id.socket.emit(
      "canvasZoomed",
      { scale: finalScale, position: newPos },
      Id.roomId
    );
  };

  // Emit to socket when dragging
  const handleDragMove = (e) => {
    const stage = stageRef.current;
    const { x, y } = stage.position();

    const newPos = { x, y };

    // Emit the new position to the server
    Id.socket.emit("canvasDragged", { position: newPos }, Id.roomId);

    // Optional logic to restrict panning limits
    stage.position(newPos);
    stage.batchDraw();
  };

  // const scaleBy = 1.05; // Zoom factor
  // const MIN_ZOOM = 0.5;
  // const MAX_ZOOM = 10;

  // const handleWheel = (e) => {
  //   e.evt.preventDefault();

  //   const stage = stageRef.current;
  //   const oldScale = stage.scaleX();
  //   const pointer = stage.getPointerPosition();

  //   const mousePointTo = {
  //     x: (pointer.x - stage.x()) / oldScale,
  //     y: (pointer.y - stage.y()) / oldScale,
  //   };

  //   const newScale = e.evt.deltaY > 0 ? oldScale * scaleBy : oldScale / scaleBy;
  //   const finalScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, newScale));

  //   stage.scale({ x: finalScale, y: finalScale });

  //   const newPos = {
  //     x: pointer.x - mousePointTo.x * finalScale,
  //     y: pointer.y - mousePointTo.y * finalScale,
  //   };

  //   stage.position(newPos);
  //   stage.batchDraw();
  // };

  // const handleDragMove = (e) => {
  //   // To allow panning while dragging the stage
  //   const stage = stageRef.current;
  //   const { x, y } = stage.position();
  //   const newPos = { x, y };

  //   // Optional logic to restrict panning limits
  //   stage.position(newPos);
  //   stage.batchDraw();
  // };

  return (
    <div className="whiteboard-container">
      <div className="toolbar">
        {/* Add more toolbar buttons here to select actions */}
        <button onClick={clearHandler} className="icon-btn" id="CLEAR">
          <i class="fa-solid fa-arrows-rotate"></i>
        </button>

        <button
          onClick={() => setAction(ACTIONS.SELECT)}
          className="icon-btn"
          id="SELECT"
        >
          <i className="fa-solid fa-arrow-pointer"></i>
        </button>
        {/* <button
          onClick={() => setAction(ACTIONS.GROUPSELECT)}
          className="icon-btn"
          id="group-selector"
        >
          <img
            src={`${process.env.PUBLIC_URL}/group-selector.png`}
            alt="Icon"
            className="icon"
          />
        </button> */}
        <button onClick={handleUndo} className="icon-btn" id="UNDO">
          <i class="fa-solid fa-rotate-left"></i>
        </button>

        <button onClick={handleRedo} className="icon-btn" id="REDO">
          <i class="fa-solid fa-rotate-right"></i>
        </button>
        <button
          onClick={() => setAction(ACTIONS.CIRCLE)}
          className="icon-btn"
          id="CIRCLE"
        >
          <i className="fa-regular fa-circle"></i>
        </button>
        <button
          onClick={() => setAction(ACTIONS.ELLIPSE)}
          className="icon-btn"
          id="ELLIPSE"
        >
          <img
            src={`${process.env.PUBLIC_URL}/ellipse.png`}
            alt="Icon"
            className="icon"
          />
        </button>
        <button
          onClick={() => setAction(ACTIONS.RECTANGLE)}
          className="icon-btn"
          id="RECTANGLE"
        >
          <i className="fas fa-square"></i>
        </button>
        <button
          onClick={() => setAction(ACTIONS.LINE)}
          className="icon-btn"
          id="LINE"
        >
          <i className="fas fa-minus"></i>
        </button>
        <button
          onClick={() => setAction(ACTIONS.ARROW)}
          className="icon-btn"
          id="ARROW"
        >
          <i className="fas fa-long-arrow-alt-right"></i>
        </button>
        <button
          onClick={() => setAction(ACTIONS.STAR)}
          className="icon-btn"
          id="STAR"
        >
          <i className="fas fa-star"></i>
        </button>
        <button
          onClick={() => setAction(ACTIONS.RING)}
          className="icon-btn"
          id="RING"
        >
          <i class="fa-solid fa-circle-dot"></i>
        </button>
        <button
          onClick={() => setAction(ACTIONS.ARC)}
          className="icon-btn"
          id="ARC"
        >
          <img
            src={`${process.env.PUBLIC_URL}/Arc.png`}
            alt="Icon"
            className="icon"
          />
        </button>
        <button
          onClick={() => setAction(ACTIONS.TEXT)}
          className="icon-btn"
          id="TEXT"
        >
          <i className="fas fa-font"></i>
        </button>
        <button
          onClick={() => setAction(ACTIONS.LABEL)}
          className="icon-btn"
          id="LABEL"
        >
          <i className="fas fa-tag"></i>
        </button>
        <button
          onClick={() => setAction(ACTIONS.SCRIBBLE)}
          className="icon-btn"
          id="SCRIBBLE"
        >
          <i className="fas fa-pencil-alt"></i>
        </button>
        <div className="color-picker">
          <button className="icon-btn" id="fill-drip">
            <i className="fas fa-fill-drip"></i>
          </button>

          <input
            type="color"
            id="fill-color"
            value={fillColor}
            onChange={(e) => setFillColor(e.target.value)}
          />
        </div>
        <div className="color-picker">
          <button className="icon-btn" id="paint-brush">
            <i className="fas fa-paint-brush"></i>
          </button>
          <input
            type="color"
            id="stroke-color"
            value={strokeColor}
            onChange={(e) => setStrokeColor(e.target.value)}
          />
        </div>
        <div className="stroke-width-slider">
          <button className="icon-btn" id="slider">
            <i className="fas fa-sliders-h"></i>
          </button>
          <input
            type="range"
            id="stroke-width"
            min="1"
            max="20"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(e.target.value)}
          />
        </div>
        {/* <button class="icon-btn" id="import-image">
          <i class="fas fa-image"></i>
        </button> */}
        <button
          class="icon-btn"
          id="DRAG"
          onClick={() => setAction(ACTIONS.DRAG)}
        >
          <i class="fa-regular fa-hand"></i>
        </button>
        <button
          className="export-btn"
          id="export-image"
          onClick={handleDownload}
        >
          <i className="fas fa-file-image"></i>
        </button>

        <div className="dropdown">
          <button className="icon-btn dropdown-toggle" onClick={toggleDropdown}>
            <i className="fas fa-users"></i>
          </button>
          {isDropdownOpen && (
            <div className="dropdown-content">
              {users.map((user) => (
                <div key={user.id} className="dropdown-item">
                  <span onClick={() => setSelectedUser(user)}>{user.name}</span>
                  {isAdmin && selectedUser === user && (
                    <div className="admin-controls">
                      <button
                        onClick={() => {
                          Id.setCurrentUser(user);
                          handleUserAction("call");
                          Id.setCall(1);
                        }}
                        className="admin-action-btn"
                      >
                        <i className="fas fa-phone"></i> Call
                      </button>
                      <button
                        onClick={() => {
                          Id.setCurrentUser(user);
                          handleUserAction("grantPermission");
                        }}
                        className="admin-action-btn"
                      >
                        <i className="fas fa-check"></i> Grant Permission
                      </button>
                      <button
                        onClick={() => {
                          Id.setCurrentUser(user);
                          handleUserAction("revokePermission");
                        }}
                        className="admin-action-btn"
                      >
                        <i className="fas fa-times"></i> Revoke Permission
                      </button>
                      <button
                        onClick={() => {
                          Id.setCurrentUser(user);
                          handleUserAction("kickUser");
                        }}
                        className="admin-action-btn"
                      >
                        <i className="fas fa-user-times"></i> Kick Out
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="board">
        <div id="whiteboard" ref={containerRef}>
          <Stage
            ref={stageRef}
            width={dimensions.width}
            height={dimensions.height}
            onPointerDown={onPointerDown}
            onPointerUp={onPointerUp}
            onPointerMove={onPointerMove}
            onMouseDown={(e) => {
              if (e.target === e.target.getStage()) {
                transformerRef.current.nodes([]);
              }
            }}
            draggable={action === ACTIONS.DRAG}
            onWheel={handleWheel}
            onDragMove={handleDragMove}
          >
            <Layer>
              {shapes.map((shape) => drawShape(shape))}
              {selectionBox && (
                <Rect
                  x={selectionBox.x}
                  y={selectionBox.y}
                  width={selectionBox.width}
                  height={selectionBox.height}
                  stroke="black"
                  strokeWidth={1}
                  dash={[10, 5]}
                  fill="rgba(0,0,255,0.1)"
                />
              )}
              <Transformer ref={transformerRef} />
            </Layer>
          </Stage>
          {editingText && (
            <textarea
              type="text"
              value={textInput}
              onChange={handleTextChange}
              onBlur={handleTextBlur}
              autoFocus
              style={{
                position: "absolute",
                top: stageRef.current?.getPointerPosition()?.y || 0,
                left: stageRef.current?.getPointerPosition()?.x || 0,
                fontSize: `${20}px`,
                border: "1px solid black",
              }}
            />
          )}
        </div>
      </div>
    </div>
  );
}
export default Whiteboard;
