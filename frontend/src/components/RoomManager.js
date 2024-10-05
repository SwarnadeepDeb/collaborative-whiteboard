import React, { useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { Link, useNavigate } from "react-router-dom";
import { useSocket } from "../context";

function RoomManager() {
  const { user } = useAuth0();
  const navigate = useNavigate();
  const Id = useSocket();
  const [roomId, setRoomId] = useState("");
  const [isRoomCreated, setIsRoomCreated] = useState(false);
  const [currentRoomId, setCurrentRoomId] = useState("");

  const handleCreateRoom = () => {
    const newRoomId = Math.random().toString(36).substring(2, 9); // Generate a random room ID
    Id.socket.emit("joinRoom", { roomId: newRoomId, user: user });
    Id.socket.on("host", (roomUsers) => {
      alert(`Room Created with the ID: ${newRoomId}`);
      Id.setHost(true);
      Id.setUsers(roomUsers);
      Id.setRoomId(newRoomId);
      setCurrentRoomId(newRoomId);
      setIsRoomCreated(true);
    });
  };

  const handleJoinRoom = () => {
    if (roomId) {
      Id.socket.emit("joinRoom", { roomId: roomId, user: user });
      Id.socket.on("joinAccepted", (roomUsers) => {
        alert(`Request accepted by the host on the room ID: ${roomId}`);
        if (Id.currentUser) {
          console.log(roomUsers[0]);
          const temp={...roomUsers[0]};
          Id.setCurrentUser(temp);
          console.log("Yes :-", Id.currentUser);
        }
        console.log("outside :-", Id.currentUser);
        Id.setUsers(roomUsers);
        Id.setRoomId(roomId);
        console.log(Id.roomId);
        setCurrentRoomId(roomId);
        navigate(`/classroom/${roomId}`);
      });
      Id.socket.on("joinDenied", ({ roomId }) => {
        alert(`join denied by the host on the roomId : ${roomId}`);
      });
    }
  };

  return (
    <div className="room-manager-container">
      <h2>Room Manager</h2>

      {isRoomCreated ? (
        <div>
          <p>Room created! Share this link with others:</p>
          <input
            type="text"
            value={`http://localhost:3000/classroom/${currentRoomId}`}
            readOnly
            onClick={(e) => e.target.select()}
          />
          <Link to={`classroom/${currentRoomId}`}>
            <button>Enter to the Room</button>
          </Link>
        </div>
      ) : (
        <>
          <div>
            <input
              type="text"
              placeholder="Enter Room ID"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
            />
            <button onClick={handleJoinRoom}>Join Room</button>
          </div>

          <hr />

          <button onClick={handleCreateRoom}>Create Room</button>
        </>
      )}
    </div>
  );
}

export default RoomManager;
