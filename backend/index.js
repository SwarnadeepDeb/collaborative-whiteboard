require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();
app.use(cors());
const server = require("http").createServer(app);
const io = require("socket.io")(server, {
  cors: { origin: "http://localhost:3000" },
});

const roomHosts = {};
const activeCalls = {};
const roomUsers = {};
const permission = {};

io.on("connection", (socket) => {
  console.log("Connected");

  socket.on("joinRoom", (user) => {
    if (user.roomId) socket.roomId = user.roomId;
    if (user.user && !roomHosts[user.roomId]) {
      roomHosts[user.roomId] = socket.id;
      user.user["socketId"] = socket.id;
      roomUsers[user.roomId] = [user.user];
      permission[socket.id] = true;
      socket.join(user.roomId);
      console.log(`${socket.id} joined room as host: ${user.roomId}`);
      socket.emit("host", roomUsers[user.roomId]);
    } else {
      io.to(roomHosts[user.roomId]).emit("joinRequest", {
        roomId: user.roomId,
        socketId: socket.id,
        user: user.user,
      });
    }
  });

  socket.on("handleJoinRequest", ({ roomId, socketId, accept, user }) => {
    if (accept) {
      user["socketId"] = socketId;
      roomUsers[roomId].push(user);
      io.sockets.sockets.get(socketId).join(roomId);
      io.to(socketId).emit("joinAccepted", roomUsers[roomId]);
      io.to(roomId).emit("newUser", {
        roomUsers: roomUsers[roomId],
        newUser: user,
      });
      console.log(`User ${socketId} joined room: ${roomId}`);
    } else {
      io.to(socketId).emit("joinDenied", roomId);
      console.log(`User ${socketId} was denied access to room: ${roomId}`);
    }
  });

  socket.on("callUser", ({ roomId, targetSocketId }) => {
    if (activeCalls[roomId]) {
      socket.emit("callFailed", "Another call is already active.");
      return;
    }

    if (
      socket.id === roomHosts[roomId] ||
      targetSocketId === roomHosts[roomId]
    ) {
      // Host can call anyone, and others can only call the host
      activeCalls[roomId] = { caller: socket.id, receiver: targetSocketId };
      io.to(targetSocketId).emit("incomingCall", { from: socket.id });
      console.log(
        `Call initiated by ${socket.id} to ${targetSocketId} in room: ${roomId}`
      );
    } else {
      socket.emit("callFailed", "You can only call the host.");
    }
  });

  socket.on("answerCall", ({ roomId, fromSocketId, accept }) => {
    if (
      activeCalls[roomId] &&
      activeCalls[roomId].caller === fromSocketId.from
    ) {
      if (accept) {
        console.log(fromSocketId.from);
        io.to(fromSocketId.from).emit("callAccepted", { to: socket.id });
        console.log(`Call accepted by ${socket.id} in room: ${roomId}`);
      } else {
        io.to(fromSocketId).emit("callRejected");
        delete activeCalls[roomId];
        console.log(`Call rejected by ${socket.id} in room: ${roomId}`);
      }
    }
  });

  socket.on("quitCall", (roomId) => {
    if (activeCalls[roomId]) {
      const { caller, receiver } = activeCalls[roomId];
      io.to(caller).emit("callEnded");
      io.to(receiver).emit("callEnded");
      delete activeCalls[roomId];
      console.log(`Call ended in room: ${roomId}`);
    }
  });

  socket.on("message", (e) => {
    if (activeCalls[socket.roomId]) {
      const { caller, receiver } = activeCalls[socket.roomId];

      if (socket.id === caller) {
        io.to(receiver).emit("message", e);
      } else if (socket.id === receiver) {
        io.to(caller).emit("message", e);
      }
    }
  });

  socket.on("disconnectUser", (roomId, socketId) => {
    if (roomHosts[roomId] === socket.id) {
      io.to(socketId).emit("disconnectedByHost");
      io.sockets.sockets.get(socketId).leave(roomId);
      console.log(`User ${socketId} was disconnected from room: ${roomId}`);
    }
  });

  socket.on("grantPermission", (message) => {
    permission[message.socketId] = true;
    console.log(permission[message.socketId]);
  });

  socket.on("revokePermission", (message) => {
    permission[message.socketId] = false;
    console.log(permission[message.socketId]);
  });











  // Broadcast new shape creation to other users in the room
  socket.on("shapeCreated", ({ shape}, roomId ) => {
    socket.to(roomId).emit("shapeCreated", { shape });
  });

  // Broadcast shape updates (move, resize, etc.) to other users in the room
  socket.on("shapeUpdated", ({ shapes}, roomId) => {
    socket.to(roomId).emit("shapeUpdated", { shapes });
  });

  // Broadcast selection box updates to other users in the room
  socket.on("selectionBoxUpdate", ({ selectionBox}, roomId) => {
    socket.to(roomId).emit("selectionBoxUpdate", { selectionBox });
  });

  // Broadcast selected shapes after group selection to other users in the room
  socket.on("selectionComplete", ({ selectedShapes}, roomId) => {
    socket.to(roomId).emit("selectionComplete", { selectedShapes });
  });

  // Broadcast text updates to other users in the room
  socket.on("textUpdated", ({ shapeId, text}, roomId) => {
    socket.to(roomId).emit("textUpdated", { shapeId, text });
  });

  // Broadcast text updates to other users in the room
  socket.on("shapeTransformed", ({ updatedShape}, roomId) => {
    console.log("Hiiiiiiiiiiiiiiiiiiiiiiiiii!")
    socket.to(roomId).emit("shapeTransformed", { updatedShape});
  });


  // Broadcast text updates to other users in the room
  socket.on("shapeDragged", ({updatedShape}, roomId) => {
    console.log("Hiiiiiiiiiiiiiiiiiiiiiiiiii!44444444444444444")
    socket.to(roomId).emit("shapeDragged", { updatedShape});
  });

  socket.on('undo', (data, roomId) => {
    socket.to(roomId).emit('undo', data); // Broadcast the undo event to other users
  });
  
  socket.on('redo', (data, roomId) => {
    socket.to(roomId).emit('redo', data); // Broadcast the redo event to other users
  });


  socket.on('shapesChange', (data, roomId) => {
    socket.to(roomId).emit('shapesChange', data); // Broadcast to all other clients
  });


  socket.on("canvasZoomed", ({ scale, position }, roomId) => {
    // Broadcast the zoom update to everyone else in the room
    socket.to(roomId).emit("updateCanvasZoom", { scale, position });
  });

  // Listen for canvas drag event
  socket.on("canvasDragged", ({ position }, roomId) => {
    // Broadcast the drag update to everyone else in the room
    socket.to(roomId).emit("updateCanvasDrag", { position });
  });
  









  socket.on("onPointerDown", (message, roomId) => {
    socket.to(roomId).emit("onPointerDown", message);
  });

  socket.on("onPointerMove", (message, roomId) => {
    console.log();
      socket.to(roomId).emit("onPointerMove", message);
  });

  socket.on("onPointerUp", (message, roomId) => {
      socket.to(roomId).emit("onPointerUp", message);
  });

  socket.on("onClick", (message, roomId) => {
      socket.to(roomId).emit("onClick", message);
  });
  socket.on("clearShapes", (roomId) => {
    socket.to(roomId).emit("clearShapes");
});

  socket.on("handleDoubleClick", (message, roomId) => {
      socket.to(roomId).emit("handleDoubleClick", message);
  });

  socket.on("handleTextChange", (message, roomId) => {
      socket.to(roomId).emit("handleTextChange", message);
  });

  socket.on("handleTextBlur", (message, roomId) => {
      socket.to(roomId).emit("handleTextBlur", message);
  });

  socket.on("handleSendMessage", (message, roomId) => {
      socket.to(roomId).emit("handleSendMessage", message);
  });

  socket.on("disconnect", () => {
    for (const roomId in roomHosts) {
      if (roomHosts[roomId] === socket.id) {
        delete roomHosts[roomId];
        delete activeCalls[roomId];
        io.in(roomId).emit("roomDestroyed");
        io.socketsLeave(roomId);
        console.log(`Host disconnected, room destroyed: ${roomId}`);
        break;
      }
    }
    console.log(`Disconnected user ${socket.id}`);
  });
});

function error(err, req, res, next) {
  if (!test) console.error(err.stack);

  res.status(500);
  res.send("Internal Server Error");
}
app.use(error);
server.listen(5000, () => {
  console.log("listening on Port 5000");
});
