import React ,{useEffect}from "react";
import Whiteboard from "./Whiteboard";
import Videocall from "./Videocall";
import GroupChat from "./GroupChat";
import { useSocket } from "../context";
const ClassRoom = () => {
  const Id = useSocket();

  useEffect(() => {
    // Define the event handlers
    const handleJoinRequest = ({ roomId, socketId, user }) => {
      console.log("Aya aya");
      console.log(user);
      const userConfirmed = true;
      user["socketId"] = socketId;
      Id.setCurrentUser(user);
      if (userConfirmed) {
        Id.socket.emit("handleJoinRequest", {
          roomId: roomId,
          socketId: socketId,
          accept: true,
          user: user,
        });
      } else {
        Id.socket.emit("handleJoinRequest", {
          roomId: roomId,
          socketId: socketId,
          accept: false,
          user: user,
        });
      }
    };
  
    const handleNewUser = ({ roomUsers, newUser }) => {
      Id.setUsers(roomUsers);
      alert(`${newUser.name} entered the room`);
    };
  
    // Register the event listeners
    Id.socket.on("joinRequest", handleJoinRequest);
    Id.socket.on("newUser", handleNewUser);
  
    // Cleanup event listeners on unmount
    return () => {
      Id.socket.off("joinRequest", handleJoinRequest);
      Id.socket.off("newUser", handleNewUser);
    };
  }, []);
  
  return (
    <div className="main-app-container">
      <div className="app-container">
        <div className="whiteboard-container">
          <Whiteboard users={Id.users} isAdmin={Id.host} />
        </div>
        <div className="main-right-container">
          <div className="right-container">
            <Videocall />
            <GroupChat />
          </div>
        </div>
      </div>
    </div>
  );
};
export default ClassRoom;
