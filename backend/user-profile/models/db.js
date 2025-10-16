const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root', // À remplacer par un utilisateur dédié en production
  password: 'root', // À remplacer par un mot de passe fort en production
  database: 'secure_user_profiles',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper pour générer des UUID sécurisés
const generateUUID = () => crypto.randomUUID();

// Helper pour hacher les mots de passe
const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(12);
  return await bcrypt.hash(password, salt);
};

// Helper pour vérifier les mots de passe
const verifyPassword = async (password, hashedPassword) => {
  return await bcrypt.compare(password, hashedPassword);
};

module.exports = {
  pool,
  generateUUID,
  hashPassword,
  verifyPassword
};