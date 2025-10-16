require('dotenv').config();
const express = require('express');
const fileUpload = require('express-fileupload');
const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 5050;

// Configuration améliorée
const TEMP_DIR = path.join(__dirname, 'temp');
const PYTHON_SCRIPT = path.join(__dirname, 'ids_predict.py');
const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

// Middleware sécurisé
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000'
}));
app.use(express.json());
app.use(fileUpload({
  limits: { fileSize: MAX_FILE_SIZE },
  abortOnLimit: true,
  useTempFiles: true,
  tempFileDir: TEMP_DIR,
  createParentPath: true,
  safeFileNames: true,
  preserveExtension: true
}));

// Vérification et création du dossier temp
if (!fs.existsSync(TEMP_DIR)) {
  fs.mkdirSync(TEMP_DIR, { recursive: true });
}

// Endpoint d'analyse robuste
app.post('/api/ids/analyze', async (req, res) => {
  if (!req.files?.csvFile) {
    return res.status(400).json({ 
      status: 'error',
      message: 'Aucun fichier CSV fourni',
      code: 'NO_FILE'
    });
  }

  const file = req.files.csvFile;
  const tempFilePath = path.join(TEMP_DIR, `upload_${Date.now()}${path.extname(file.name)}`);

  try {
    // Sauvegarde temporaire contrôlée
    await file.mv(tempFilePath);
    console.log(`Fichier reçu: ${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`);

    // Commande Python adaptative
    const pythonExec = process.env.PYTHON_PATH || (process.platform === 'win32' ? 'python' : 'python3');
    const command = `"${pythonExec}" "${PYTHON_SCRIPT}" "${tempFilePath}"`;
    
    console.log(`Exécution: ${command}`);
    const startTime = Date.now();

    exec(command, { maxBuffer: MAX_FILE_SIZE }, (error, stdout, stderr) => {
      const processingTime = ((Date.now() - startTime) / 1000).toFixed(2);
      
      // Nettoyage garantie
      fs.unlink(tempFilePath, (unlinkErr) => {
        if (unlinkErr) console.error('Nettoyage échoué:', unlinkErr);
      });

      if (error) {
        console.error(`[ERREUR] Python (${processingTime}s):`, {
          error: error,
          stderr: stderr?.toString(),
          stdout: stdout?.toString()
        });
        return res.status(500).json({
          status: 'error',
          message: 'Échec de l\'analyse',
          details: stderr?.toString() || stdout?.toString() || 'Erreur inconnue',
          code: 'PYTHON_ERROR',
          time: processingTime
        });
      }

      try {
        const results = JSON.parse(stdout);
        console.log(`[SUCCÈS] Traitement (${processingTime}s): ${results.stats?.total} entrées analysées`);
        
        if (results.status === 'error') {
          return res.status(400).json(results);
        }
        res.json({
          ...results,
          metadata: {
            processing_time: processingTime,
            file_name: file.name,
            file_size: file.size
          }
        });
      } catch (parseError) {
        console.error('[ERREUR] Analyse des résultats:', parseError);
        res.status(500).json({
          status: 'error',
          message: 'Format de réponse invalide',
          details: stdout,
          code: 'INVALID_OUTPUT'
        });
      }
    });
  } catch (err) {
    console.error('[ERREUR] Traitement du fichier:', err);
    if (fs.existsSync(tempFilePath)) fs.unlinkSync(tempFilePath);
    res.status(500).json({
      status: 'error',
      message: 'Erreur de traitement du fichier',
      details: err.message,
      code: 'FILE_PROCESSING'
    });
  }
});

// Gestion des erreurs centralisée
app.use((err, req, res, next) => {
  console.error('[ERREUR] Globale:', err);
  res.status(500).json({
    status: 'error',
    message: 'Erreur interne du serveur',
    code: 'SERVER_ERROR'
  });
});

// Démarrer le serveur
const server = app.listen(PORT, () => {
  console.log(`\nServeur IDS en écoute sur http://localhost:${PORT}`);
  console.log(`Environnement: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Taille max fichier: ${MAX_FILE_SIZE / 1024 / 1024} MB`);
  console.log(`Dossier temp: ${TEMP_DIR}\n`);
});

// Nettoyage élégant
['SIGINT', 'SIGTERM'].forEach(signal => {
  process.on(signal, () => {
    console.log(`\nReception ${signal} - Arrêt propre...`);
    server.close(() => {
      console.log('Nettoyage des fichiers temporaires...');
      fs.readdirSync(TEMP_DIR).forEach(file => {
        fs.unlinkSync(path.join(TEMP_DIR, file));
      });
      console.log('Serveur arrêté.');
      process.exit(0);
    });
  });
});