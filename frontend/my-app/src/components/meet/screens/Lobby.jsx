import React, { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useSocket } from "../context/SocketProvider";
import { useTheme } from "../context/ThemeContext";
import { FaArrowLeft } from "react-icons/fa";

const LobbyScreen = () => {
  const [email, setEmail] = useState("");
  const [room, setRoom] = useState("");
  const { theme, primaryColor } = useTheme();
  const socket = useSocket();
  const navigate = useNavigate();

  const handleSubmitForm = useCallback(
    (e) => {
      e.preventDefault();
      socket.emit("room:join", { email, room });
    },
    [email, room, socket]
  );

  const handleJoinRoom = useCallback(
    (data) => {
      const { email, room } = data;
      navigate(`/meetapp/room/${room}`);
    },
    [navigate]
  );

  useEffect(() => {
    socket.on("room:join", handleJoinRoom);
    return () => {
      socket.off("room:join", handleJoinRoom);
    };
  }, [socket, handleJoinRoom]);

  return (
    <div className={theme}>      
      {/* Bouton de retour */}
      <button 
        className="btn btn-primary back-button"
        onClick={() => navigate("/central")}
        style={{ backgroundColor: primaryColor }}
      >
        <FaArrowLeft />Retour
      </button>
      
      <div style={{
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  height: "100vh",
  flexDirection: "column",
  background: theme === 'dark' 
    ? 'linear-gradient(135deg, #000000 0%, #FF0000 40%, #FFFFFF 70%, #000000 100%)' 
    : 'linear-gradient(135deg, #ffffff 0%, #f5f5f5 50%, #ffffff 100%)'
}}>
      
        <form onSubmit={handleSubmitForm} style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          width: "400px",
          padding: "40px",
          borderRadius: "20px",
          background: theme === 'dark' ? 'rgba(40, 40, 40, 0.8)' : 'rgba(255, 255, 255, 0.9)',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          backdropFilter: 'blur(10px)'
        }}>
          <label htmlFor="email" style={{ fontSize: '1.2rem' }}>Email ID</label>
          <input
            type="email"
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ 
              padding: "15px",
              borderRadius: "50px",
              border: "none",
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              color: 'inherit',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
            required
          />
          <label htmlFor="room" style={{ fontSize: '1.2rem' }}>Room Number</label>
          <input
            type="text"
            id="room"
            value={room}
            onChange={(e) => setRoom(e.target.value)}
            style={{ 
              padding: "15px",
              borderRadius: "50px",
              border: "none",
              background: theme === 'dark' ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
              color: 'inherit',
              outline: 'none',
              transition: 'all 0.3s ease'
            }}
            required
          />
          <br />
          <button 
            className="btn btn-primary" 
            type="submit"
            style={{ 
              backgroundColor: primaryColor,
              padding: "15px",
              fontSize: "1.2rem"
            }}
          >
            Join Room
          </button>
        </form>
      </div>
    </div>
  );
};

export default LobbyScreen;