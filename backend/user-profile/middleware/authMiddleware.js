const jwt = require('jsonwebtoken');
const { pool } = require('../models/db');

module.exports = async (req, res, next) => {
  try {
    // 1. Vérifier le token dans les headers
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ 
        success: false,
        message: 'Authentification requise' 
      });
    }

    // 2. Vérifier et décoder le token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // 3. Vérifier que l'utilisateur existe toujours
    const [user] = await pool.execute(
      'SELECT id FROM users WHERE id = ? AND eth_address = ?',
      [decoded.userId, decoded.ethAddress]
    );

    if (user.length === 0) {
      return res.status(401).json({ 
        success: false,
        message: 'Utilisateur non trouvé' 
      });
    }

    // 4. Ajouter les infos utilisateur à la requête
    req.user = {
      id: decoded.userId,
      ethAddress: decoded.ethAddress
    };

    next();
  } catch (error) {
    console.error('Erreur d\'authentification:', error);
    
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        success: false,
        message: 'Session expirée' 
      });
    }
    
    return res.status(401).json({ 
      success: false,
      message: 'Authentification invalide' 
    });
  }
};