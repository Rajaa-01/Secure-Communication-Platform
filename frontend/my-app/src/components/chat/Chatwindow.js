import React, { useState, useEffect, useRef, useCallback } from "react";
import { FaPaperPlane, FaRegSmile, FaLock, FaLockOpen } from "react-icons/fa";
import EmojiPicker from 'emoji-picker-react';
import socket from "./socket";
import CryptoJS from 'crypto-js';
import "../chat/chatpage.css";

// Configuration du chiffrement
const AES_CONFIG = {
  keySize: 256,
  ivSize: 128,
  iterations: 1000,
  key: process.env.REACT_APP_AES_KEY || 'votre-cle-secure-32-caracteres-123456'
};

// Fonction de chiffrement
const encryptMessage = (text) => {
  try {
    const salt = CryptoJS.lib.WordArray.random(128/8);
    const key = CryptoJS.PBKDF2(AES_CONFIG.key, salt, {
      keySize: AES_CONFIG.keySize/32,
      iterations: AES_CONFIG.iterations
    });
    const iv = CryptoJS.lib.WordArray.random(128/8);
    const encrypted = CryptoJS.AES.encrypt(text, key, { 
      iv: iv,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC
    });
    return salt.toString() + iv.toString() + encrypted.toString();
  } catch (error) {
    console.error("Erreur de chiffrement:", error);
    return text;
  }
};

// Fonction de déchiffrement
const decryptMessage = (ciphertext) => {
  try {
    if (!ciphertext || !ciphertext.startsWith('U2FsdGVkX1')) {
      return ciphertext;
    }
    const salt = CryptoJS.enc.Hex.parse(ciphertext.substr(0, 32));
    const iv = CryptoJS.enc.Hex.parse(ciphertext.substr(32, 32));
    const encrypted = ciphertext.substring(64);
    const key = CryptoJS.PBKDF2(AES_CONFIG.key, salt, {
      keySize: AES_CONFIG.keySize/32,
      iterations: AES_CONFIG.iterations
    });
    const decrypted = CryptoJS.AES.decrypt(encrypted, key, { 
      iv: iv,
      padding: CryptoJS.pad.Pkcs7,
      mode: CryptoJS.mode.CBC
    });
    const result = decrypted.toString(CryptoJS.enc.Utf8);
    if (!result) {
      console.warn("Le déchiffrement a retourné une chaîne vide");
      return ciphertext;
    }
    return result;
  } catch (error) {
    console.error("Erreur de déchiffrement:", error);
    return ciphertext;
  }
};

const Chatwindow = (props) => {
  const [message, setMessage] = useState("");
  const [showEmojis, setShowEmojis] = useState(false);
  const [conversationHistory, setConversationHistory] = useState([]);
  const [isAutoScroll, setIsAutoScroll] = useState(true);
  const [encryptionEnabled, setEncryptionEnabled] = useState(true);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null);

  // Charger l'historique de la conversation
  useEffect(() => {
    if (props.selectedUser && props.conversationId) {
      const loadHistory = async () => {
        try {
          const response = await fetch(`/api/conversations/${props.conversationId}`, {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('token')}`
            }
          });
          
          if (!response.ok) throw new Error('Failed to load history');
          
          const data = await response.json();
          
          const decryptedMessages = data.messages.map(msg => ({
            ...msg,
            content: msg.isEncrypted ? decryptMessage(msg.content) : msg.content
          }));
          
          setConversationHistory(decryptedMessages);
        } catch (err) {
          console.error('Error loading conversation history:', err);
        }
      };
      
      loadHistory();
    }
  }, [props.selectedUser, props.conversationId]);

  // Gestion du scroll automatique
  useEffect(() => {
    if (isAutoScroll && messagesEndRef.current) {
      scrollToBottom();
    }
  }, [props.messages, conversationHistory, isAutoScroll]);

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  const handleScroll = useCallback(() => {
    if (messagesContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = messagesContainerRef.current;
      const isNearBottom = scrollHeight - scrollTop <= clientHeight + 100;
      setIsAutoScroll(isNearBottom);
    }
  }, []);

  // Envoi de message sécurisé
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim() || !props.selectedUser) return;

    try {
      const messageContent = encryptionEnabled ? encryptMessage(message) : message;

      socket.emit("private message", {
        content: messageContent,
        to: props.selectedUser.id,
        isEncrypted: encryptionEnabled
      }, (ack) => {
        if (ack?.error) {
          console.error("Erreur:", ack.error);
        } else {
          props.setMessages(prev => [...prev, {
            content: message,
            to: props.selectedUser.id,
            senderUsername: props.user,
            senderId: props.userId,
            fromSelf: true,
            messageId: ack.messageId,
            conversationId: ack.conversationId,
            timestamp: new Date(),
            isEncrypted: encryptionEnabled
          }]);
        }
      });

      setMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  // Gestion des emojis
  const onEmojiClick = (emojiData) => {
    setMessage(prev => prev + emojiData.emoji);
    setShowEmojis(false);
  };

  // Combiner et trier les messages avec déchiffrement
  const allMessages = [...conversationHistory, ...props.messages]
    .filter(msg => 
      (msg.from === props.selectedUser?.id || msg.to === props.selectedUser?.id) &&
      (msg.fromSelf || msg.from !== socket.id)
    )
    .map(msg => ({
      ...msg,
      content: msg.isEncrypted ? decryptMessage(msg.content) : msg.content
    }))
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

  // Rendu d'un seul message
  const renderMessage = (msg, i) => (
    <div key={msg.messageId || `msg-${i}`} className={`message ${msg.fromSelf ? 'sent' : 'received'}`}>
      <div className="message-header">
        {!msg.fromSelf && <span className="sender">{msg.senderUsername}</span>}
        {msg.isEncrypted && (
          <span className="encryption-badge" title="Message chiffré">
            <FaLock size={12} />
          </span>
        )}
        <span className="time">
          {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>
      
      <div className="message-content">
        <p>{msg.content}</p>
      </div>
    </div>
  );

  return (
    <div className="chat-container">
      <div 
        className="chat-window"
        ref={messagesContainerRef}
        onScroll={handleScroll}
      >
        <div className="messages">
          {allMessages.map(renderMessage)}
          <div ref={messagesEndRef} />
        </div>
        
        {!isAutoScroll && (
          <button 
            className="scroll-to-bottom"
            onClick={() => {
              setIsAutoScroll(true);
              scrollToBottom();
            }}
            aria-label="Scroll to bottom"
          >
            Nouveaux messages ↓
          </button>
        )}
      </div>

      <form onSubmit={handleSendMessage} className="chat-input-container">
        <div className="input-actions">
          <button 
            type="button" 
            onClick={() => setShowEmojis(!showEmojis)}
            className="emoji-button"
            aria-label="Select emoji"
          >
            <FaRegSmile />
          </button>
          
          <button
            type="button"
            onClick={() => setEncryptionEnabled(!encryptionEnabled)}
            className={`encryption-toggle ${encryptionEnabled ? 'active' : ''}`}
            aria-label={encryptionEnabled ? 'Disable encryption' : 'Enable encryption'}
            title={encryptionEnabled ? 'Chiffrement activé' : 'Chiffrement désactivé'}
          >
            {encryptionEnabled ? <FaLock /> : <FaLockOpen />}
          </button>
        </div>
        
        <input
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Écrivez un message..."
          className="message-input"
          aria-label="Message input"
        />
        
        <button 
          type="submit" 
          disabled={!message.trim()}
          className="send-button"
          aria-label="Send message"
        >
          <FaPaperPlane />
        </button>
      </form>
      
      {showEmojis && (
        <div className="emoji-picker-container">
          <EmojiPicker 
            onEmojiClick={onEmojiClick} 
            width={300}
            height={400}
            previewConfig={{ showPreview: false }}
            searchDisabled={false}
            skinTonesDisabled={true}
            lazyLoadEmojis={true}
          />
        </div>
      )}
    </div>
  );
};

export default React.memo(Chatwindow);