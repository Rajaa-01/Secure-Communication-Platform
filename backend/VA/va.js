require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const assistantRouter = require('./assistant');
const path = require('path');

const app = express();

// Configuration de la sécurité
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Limitation du taux de requêtes
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100,
  message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard.'
});
app.use(limiter);

// Middleware pour parser le JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serveur de fichiers statiques pour le frontend
app.use(express.static(path.join(__dirname, '../frontend/build')));

// Routes
app.use('/api/assistant', assistantRouter);

// Route de test
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// Gestion des erreurs
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    error: 'Une erreur interne est survenue',
    details: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Pour le SPA
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/build/index.html'));
});

// Lancement du serveur
const PORT = process.env.PORT || 5010;
app.listen(PORT, () => {
  console.log(`Serveur backend en cours d'exécution sur le port ${PORT}`);
  console.log(`Test route: http://localhost:${PORT}/api/health`);
  console.log(`Modèle Ollama: ${process.env.OLLAMA_MODEL || 'mistral'}`);
});

module.exports = app;