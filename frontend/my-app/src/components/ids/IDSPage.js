import React, { useState, useCallback } from 'react';
import axios from 'axios';
import './IDSPage.css';
import { useNavigate } from 'react-router-dom';

const IDSPage = () => {
  const [file, setFile] = useState(null);
  const [results, setResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [progress, setProgress] = useState(0);
  const navigate = useNavigate();

  const handleFileChange = useCallback((e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type !== 'text/csv' && !selectedFile.name.endsWith('.csv')) {
        setError({
          message: 'Veuillez sélectionner un fichier CSV valide',
          type: 'file_type'
        });
        return;
      }
      setFile(selectedFile);
      setError(null);
      setResults(null);
    }
  }, []);

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    if (!file) {
      setError({
        message: 'Veuillez sélectionner un fichier CSV',
        type: 'no_file'
      });
      return;
    }

    setIsLoading(true);
    setError(null);
    setProgress(0);

    const formData = new FormData();
    formData.append('csvFile', file);

    try {
      const response = await axios.post(
        'http://localhost:5050/api/ids/analyze',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          },
          onUploadProgress: (progressEvent) => {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setProgress(percentCompleted);
          },
          timeout: 120000
        }
      );

      if (response.data.status === 'success') {
        setResults(response.data);
      } else {
        setError({
          message: response.data.message || 'Erreur lors de l\'analyse',
          details: response.data.details,
          type: 'analysis_error'
        });
      }
    } catch (err) {
      const errorData = err.response?.data || {};
      setError({
        message: errorData.message || 'Erreur de connexion au serveur',
        details: errorData.details,
        code: errorData.code,
        type: 'server_error'
      });
      console.error('Erreur API:', err);
    } finally {
      setIsLoading(false);
      setProgress(100);
    }
  }, [file]);

  return (
    <div className="ids-container">
      <div className="ids-header">
        <h1>🛡️ Détection d'intrusion - UNSW-NB15 avec XGBoost</h1>
        <p className="ids-subtitle">
          Ce modèle prédit si un trafic réseau est <strong>normal</strong> ou <strong>malveillant</strong> (attaque)
        </p>
        <button 
          className="back-button"
          onClick={() => navigate('/central')}
        >
          ← Retour 
        </button>
      </div>

      <div className="upload-section">
        <form onSubmit={handleSubmit} className="upload-form">
          <div className="file-input-container">
            <label className="file-label">
              <span>📂 Charger un fichier CSV préparé (UNSW-NB15)</span>
              <input
                type="file"
                accept=".csv,text/csv"
                onChange={handleFileChange}
                disabled={isLoading}
                className="file-input"
              />
              {file && (
                <div className="file-info">
                  <span>{file.name}</span>
                  <span>{(file.size / 1024 / 1024).toFixed(2)} MB</span>
                </div>
              )}
            </label>
          </div>

          <button
            type="submit"
            disabled={!file || isLoading}
            className={`analyze-button ${isLoading ? 'loading' : ''}`}
          >
            {isLoading ? (
              <>
                <span className="spinner"></span>
                Analyse en cours... ({progress}%)
              </>
            ) : (
              'Lancer l\'analyse'
            )}
          </button>
        </form>

        {error && (
          <div className={`error-box ${error.type}`}>
            <div className="error-header">
              <span>⚠️</span>
              <h3>{error.message}</h3>
            </div>
            {error.details && (
              <div className="error-details">
                <p>{error.details}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {results && (
        <div className="results-section">
          <div className="results-header">
            <h2>🔍 Résultats de l'analyse</h2>
            <div className="metadata">
              <span>Fichier: {results.metadata?.file_name}</span>
              <span>Temps: {results.metadata?.processing_time}s</span>
            </div>
          </div>

          <div className="stats-grid">
            <StatCard
              title="Total"
              value={results.stats.total}
              icon="📊"
              description="Entrées analysées"
            />
            <StatCard
              title="Normal"
              value={results.stats.normal}
              percentage={(results.stats.normal / results.stats.total * 100).toFixed(1)}
              icon="✅"
              type="normal"
              description="Connexions sûres"
            />
            <StatCard
              title="Attaques"
              value={results.stats.attack}
              percentage={results.stats.attack_percentage.toFixed(1)}
              icon="⚠️"
              type="attack"
              description="Activités malveillantes"
            />
          </div>

          <div className="predictions-container">
            <h3>Détails des prédictions</h3>
            <div className="predictions-grid">
              {results.predictions.slice(0, 100).map((pred, index) => (
                <PredictionBadge
                  key={index}
                  index={index + 1}
                  isAttack={pred === 1}
                />
              ))}
              {results.predictions.length > 100 && (
                <div className="more-items">
                  + {results.predictions.length - 100} autres résultats...
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon, percentage, type, description }) => (
  <div className={`stat-card ${type || ''}`}>
    <div className="stat-header">
      <span className="stat-icon">{icon}</span>
      <h4>{title}</h4>
    </div>
    <div className="stat-main">
      <div className="stat-value">{value}</div>
      {percentage && <div className="stat-percentage">{percentage}%</div>}
    </div>
    {description && <div className="stat-description">{description}</div>}
  </div>
);

const PredictionBadge = ({ index, isAttack }) => (
  <div className={`prediction-badge ${isAttack ? 'attack' : 'normal'}`}>
    <span className="prediction-index">#{index}</span>
    <span className="prediction-label">
      {isAttack ? 'ATTACK' : 'Normal'}
    </span>
  </div>
);

export default IDSPage;