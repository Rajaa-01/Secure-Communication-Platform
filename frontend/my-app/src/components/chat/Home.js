import React, { useState, useEffect } from "react";
import Chatwindow from "./Chatwindow";

const Home = (props) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [conversationId, setConversationId] = useState(null);

  useEffect(() => {
    if (selectedUser) {
      const findConversation = async () => {
        try {
          const response = await fetch(`/api/conversations/find?userId1=${props.userId}&userId2=${selectedUser.userId}`);
          const data = await response.json();
          setConversationId(data.conversationId);
        } catch (err) {
          console.error('Error finding conversation:', err);
        }
      };
      
      findConversation();
    }
  }, [selectedUser, props.userId]);

  return (
    <div className="chat-app">
      <div className="user-list">
        {props.connectedUsers.map(user => (
          <div 
            key={user.id}
            className={`user-card ${selectedUser?.id === user.id ? 'active' : ''}`}
            onClick={() => setSelectedUser(user)}
          >
            {user.username} {user.self && '(You)'}
          </div>
        ))}
      </div>

      {selectedUser ? (
        <Chatwindow
          selectedUser={selectedUser}
          user={props.user}
          userId={props.userId}
          messages={props.messages}
          setMessages={props.setMessages}
          conversationId={conversationId}
        />
      ) : (
        <div className="select-user-prompt">
          Sélectionnez un utilisateur pour chatter
        </div>
      )}
    </div>
  );
};

export default Home;