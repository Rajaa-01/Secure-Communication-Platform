require('dotenv').config();
const multer = require('multer');
const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const app = express();

// Import des routes
const authRoutes = require('./routes/auth');
const profileRoutes = require('./routes/profileRoutes');

// =============================================
// CONFIGURATION DE BASE & MIDDLEWARES ESSENTIELS
// =============================================

// Sécurité de base avec Helmet
app.use(helmet());

// Configuration CORS plus stricte
const corsOptions = {
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// Protection contre les attaques brute force
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: {
    success: false,
    message: 'Trop de requêtes depuis cette IP, veuillez réessayer plus tard'
  }
});

// =============================================
// MIDDLEWARES DE REQUÊTE
// =============================================

// Parseur de corps avec sécurité renforcée
app.use(express.json({
  limit: '10kb',
  verify: (req, res, buf, encoding) => {
    try {
      JSON.parse(buf.toString());
    } catch (e) {
      throw new Error('JSON invalide');
    }
  }
}));
const upload = multer({ dest: 'public/uploads/' });

// =============================================
// GESTION DES ROUTES
// =============================================

// Routes d'authentification (avec limite de taux)
app.use('/api/auth', apiLimiter, authRoutes);

// Routes de profil
app.use('/api/profiles', upload.single('photo'), profileRoutes);

// Endpoint de test
app.get('/api/healthcheck', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'API opérationnelle',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version
  });
});

// =============================================
// GESTION DES FICHIERS STATIQUES
// =============================================

// Configuration avancée des fichiers statiques
const staticFileOptions = {
  maxAge: '1d',
  setHeaders: (res, filePath) => {
    if (path.extname(filePath) === '.jpg') {
      res.setHeader('Content-Type', 'image/jpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');
    }
  }
};

app.use('/uploads', express.static(path.join(__dirname, 'public/uploads'), staticFileOptions));

// =============================================
// GESTION DES ERREURS
// =============================================

// Capture des 404
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: 'Endpoint non trouvé'
  });
});

// Gestionnaire d'erreurs global
app.use((err, req, res, next) => {
  console.error(`[${new Date().toISOString()}] Erreur:`, err.stack);

  const statusCode = err.statusCode || 500;
  const message = statusCode === 500 ? 'Erreur interne du serveur' : err.message;

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// =============================================
// DÉMARRAGE DU SERVEUR
// =============================================

const PORT = process.env.PORT || 5001;
const server = app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] Serveur démarré sur le port ${PORT}`);
  console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
});

// Gestion propre des arrêts
process.on('SIGTERM', () => {
  console.log('Reçu SIGTERM. Arrêt gracieux du serveur...');
  server.close(() => {
    console.log('Serveur arrêté');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Reçu SIGINT. Arrêt du serveur...');
  server.close(() => {
    console.log('Serveur arrêté');
    process.exit(0);
  });
});

module.exports = server; // Pour les tests