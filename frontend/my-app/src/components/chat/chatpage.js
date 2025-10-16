import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Home from "../chat/Home";
import Login from "../chat/Login";
import "../chat/chatpage.css";
import socket from "../chat/socket";

function App() {
  const [userName, setUserName] = useState("");
  const [userId, setUserId] = useState(null);
  const [usersList, setUsersList] = useState([]);
  const [messages, setMessages] = useState([]);
  const [conversations, setConversations] = useState([]);
  const navigate = useNavigate();

  useEffect(() => {
    const handleUsers = (users) => {
      const updatedUsers = users.sort((a, b) => {
        if (a.self) return -1;
        if (b.self) return 1;
        return a.username.localeCompare(b.username);
      });
      setUsersList(updatedUsers);
    };

    const handleUserConnected = (user) => {
      setUsersList(prev => [...prev.filter(u => u.id !== user.id), user]);
    };

    const handleUserDisconnected = (userId) => {
      setUsersList(prev => prev.filter(user => user.id !== userId));
    };

    const handlePrivateMessage = (msg) => {
      setMessages(prev => [...prev, {
        ...msg,
        fromSelf: msg.from === socket.id,
        messageId: msg.messageId,
        conversationId: msg.conversationId
      }]);
    };

    socket.on("users", handleUsers);
    socket.on("user connected", handleUserConnected);
    socket.on("user disconnected", handleUserDisconnected);
    socket.on("private message", handlePrivateMessage);

    return () => {
      socket.off("users", handleUsers);
      socket.off("user connected", handleUserConnected);
      socket.off("user disconnected", handleUserDisconnected);
      socket.off("private message", handlePrivateMessage);
    };
  }, []);

const getUsername = async (username) => {
  try {
    // URL absolue en développement
    const apiUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:4200/api/users' 
      : '/api/users';

    const response = await fetch(`${apiUrl}?username=${encodeURIComponent(username)}`, {
      credentials: 'include',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur serveur: ${errorText}`);
    }

    const userData = await response.json();
    
    // Validation des données
    if (!userData.id) {
      throw new Error('Données utilisateur invalides');
    }

    // Mise à jour de l'état et stockage
    localStorage.setItem('username', username);
    localStorage.setItem('userId', userData.id);
    
    setUserName(username);
    setUserId(userData.id);
    
    socket.auth = { 
      fetched_userName: username,
      userId: userData.id
    };
    socket.connect();

  } catch (err) {
    console.error('Erreur de connexion:', err);
    alert(`Échec de la connexion: ${err.message}`);
  }
};

  const handleBackClick = () => navigate("/central");

  return (
    <div className="App">
      {!userName ? (
        <Login submit={getUsername} />
      ) : (
        <Home 
          user={userName}
          userId={userId}
          connectedUsers={usersList}
          messages={messages}
          setMessages={setMessages}
          conversations={conversations}
        />
      )}
      
      <button onClick={handleBackClick} className="back-button">
        Retour
      </button>
    </div>
  );
}

export default App;