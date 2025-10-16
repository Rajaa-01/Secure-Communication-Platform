import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './SecurityAssistant.css';

const SecurityAssistant = () => {
  const [input, setInput] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [serverStatus, setServerStatus] = useState({ status: 'LOADING' });
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();

  const api = axios.create({
    baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:5010',
    timeout: 15000
  });

  useEffect(() => {
    const checkServerStatus = async () => {
      try {
        const response = await api.get('/api/assistant/status');
        setServerStatus({
          ...response.data,
          status: response.data.status === 'DEGRADED' ? 'DEGRADED' : 'OK'
        });
      } catch (err) {
        console.error('Erreur de connexion au serveur:', err);
        setServerStatus({ 
          status: 'ERROR',
          fallbackMode: true 
        });
      }
    };
    checkServerStatus();
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const trimmedInput = input.trim();
    if (!trimmedInput || isLoading) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await api.post('/api/assistant/chat', {
        message: trimmedInput,
        chatHistory
      });

      setChatHistory(response.data?.chatHistory || []);
      setInput('');
    } catch (err) {
      console.error('Erreur:', err);
      setError(
        err.response?.data?.error || 
        err.message || 
        'Erreur de communication avec le serveur'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const isFallbackMode = serverStatus?.status !== 'OK';

  return (
    <div className="sa-container">
      <h1>Security Assistant</h1>
      <p>Posez vos questions sur la cybersécurité et les attaques informatiques</p>

      {isFallbackMode && (
        <div className="sa-fallback-warning">
          {serverStatus?.status === 'DEGRADED' 
            ? 'Mode dégradé - Ollama indisponible, utilisant les réponses locales' 
            : 'Erreur de connexion au serveur - Mode local activé'}
        </div>
      )}

      <div className="sa-chat-box">
        <div className="sa-messages">
          {chatHistory.length === 0 && !isLoading && (
            <div className="sa-message assistant">
              Bonjour ! Je suis votre assistant en sécurité. Posez-moi vos questions sur les attaques informatiques, les vulnérabilités ou les mesures de protection.
            </div>
          )}

          {chatHistory.map((msg, index) => (
            <div 
              key={`msg-${index}`} 
              className={`sa-message ${msg.role}`}
              data-source={msg.source || 'fallback'}
            >
              {msg.content}
              {msg.role === 'assistant' && (
                <span className={`sa-badge ${msg.source || 'fallback'}`}>
                  {msg.source === 'ollama' ? 'Mistral' : 
                   msg.source === 'local' ? 'Local' : 'Fallback'}
                </span>
              )}
            </div>
          ))}

          {isLoading && (
            <div className="sa-loading">SecurityGPT réfléchit...</div>
          )}

          {error && (
            <div className="sa-message error">
              Erreur : {error}
              <button onClick={() => setError(null)} className="sa-error-close">
                ×
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="sa-input-form">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Posez votre question sur la sécurité..."
            disabled={isLoading}
            maxLength={500}
          />
          <button 
            type="submit" 
            disabled={isLoading || !input.trim()}
            aria-busy={isLoading}
          >
            {isLoading ? 'Envoi...' : 'Envoyer'}
          </button>
        </form>
      </div>

      <button 
        className="sa-back-button" 
        onClick={() => navigate('/central')}
        disabled={isLoading}
      >
        Retour
      </button>
    </div>
  );
};

export default SecurityAssistant;