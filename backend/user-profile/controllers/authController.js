const { pool } = require('../models/db');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');

exports.checkUser = async (req, res) => {
  try {
    const { ethAddress } = req.body;

    if (!ethAddress) {
      return res.status(400).json({
        success: false,
        message: 'Adresse Ethereum requise'
      });
    }

    // Normaliser l'adresse en minuscules
    const normalizedAddress = ethAddress.toLowerCase();

    // Vérifier si l'utilisateur existe
    const [user] = await pool.execute(
      `SELECT u.id, up.first_name, up.last_name, up.photo_url
       FROM users u 
       LEFT JOIN user_profiles up ON u.id = up.user_id 
       WHERE u.eth_address = ?`,
      [normalizedAddress]
    );

    if (user.length > 0) {
      // Générer un token JWT sans mot de passe
      const token = jwt.sign(
        { 
          userId: user[0].id, 
          ethAddress: normalizedAddress,
          profileComplete: !!user[0].first_name
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return res.status(200).json({
        success: true,
        exists: true,
        hasProfile: !!user[0].first_name,
        userId: user[0].id,
        token,
        profile: user[0].first_name ? {
          firstName: user[0].first_name,
          lastName: user[0].last_name,
          photoUrl: user[0].photo_url
        } : null
      });
    } else {
      // Créer un nouvel utilisateur sans mot de passe
      const [newUser] = await pool.execute(
        'INSERT INTO users (uuid, eth_address) VALUES (?, ?)',
        [uuidv4(), normalizedAddress]
      );
      
      // Token pour nouvel utilisateur
      const token = jwt.sign(
        { 
          userId: newUser.insertId, 
          ethAddress: normalizedAddress,
          profileComplete: false
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      return res.status(200).json({
        success: true,
        exists: false,
        hasProfile: false,
        userId: newUser.insertId,
        token
      });
    }
  } catch (error) {
    console.error('Error checking user:', error);
    res.status(500).json({ 
      success: false,
      message: 'Erreur serveur',
      error: error.message 
    });
  }
};