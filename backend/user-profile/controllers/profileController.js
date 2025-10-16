const { pool } = require('../models/db');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

exports.saveProfile = async (req, res) => {
  console.log('Corps de la requête:', req.body); // Debug
  console.log('Fichier reçu:', req.file); // Debug

  try {
    const { userId, firstName, lastName } = req.body;
    
    // Validation des données
    if (!userId || !firstName || !lastName) {
      console.log('Validation failed - missing fields');
      return res.status(400).json({
        success: false,
        message: 'Tous les champs sont requis'
      });
    }

    let photoUrl = null;
    if (req.file) {
      // Créer le répertoire uploads s'il n'existe pas
      const uploadDir = path.join(__dirname, '../../public/uploads');
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
        console.log('Dossier uploads créé:', uploadDir);
      }
      photoUrl = '/uploads/' + req.file.filename;
      console.log('Fichier uploadé:', photoUrl);
    }

    // Vérifier si le profil existe déjà
    console.log('Vérification existence profil pour userId:', userId);
    const [existingProfile] = await pool.execute(
      'SELECT id FROM user_profiles WHERE user_id = ?',
      [userId]
    );

    if (existingProfile.length > 0) {
      // Mise à jour du profil existant
      console.log('Mise à jour du profil existant');
      await pool.execute(
        `UPDATE user_profiles 
         SET first_name = ?, last_name = ?, photo_url = ?
         WHERE user_id = ?`,
        [firstName, lastName, photoUrl, userId]
      );
    } else {
      // Création d'un nouveau profil
      console.log('Création nouveau profil');
      await pool.execute(
        `INSERT INTO user_profiles 
         (user_id, first_name, last_name, photo_url)
         VALUES (?, ?, ?, ?)`,
        [userId, firstName, lastName, photoUrl]
      );
    }

    console.log('Profil enregistré avec succès');
    res.status(200).json({
      success: true,
      message: 'Profil enregistré avec succès',
      profile: {
        firstName,
        lastName,
        photoUrl
      }
    });

  } catch (error) {
    console.error('Erreur détaillée:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur lors de l\'enregistrement du profil',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
exports.getProfile = async (req, res) => {
  console.log('Requête GET reçue pour userId:', req.params.userId); // Debug
  
  try {
    const userId = req.params.userId;
    
    if (!userId) {
      return res.status(400).json({ 
        success: false,
        message: 'ID utilisateur requis' 
      });
    }

    const [profile] = await pool.execute(
      `SELECT 
        first_name as firstName, 
        last_name as lastName, 
        photo_url as photo, 
        created_at as createdAt
      FROM user_profiles 
      WHERE user_id = ?`,
      [userId]
    );

    if (profile.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'Profil non trouvé'
      });
    }

    res.status(200).json({
      success: true,
      profile: profile[0]
    });

  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({
      success: false,
      message: 'Erreur serveur'
    });
  }
};