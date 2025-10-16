// api.js
const express = require('express');
const mysql = require('mysql2/promise');
const router = express.Router();

const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'secure_user_profiles'
};

// Trouver un utilisateur par username/email
router.get('/users', async (req, res) => {
  try {
    const { username } = req.query;
    const connection = await mysql.createConnection(dbConfig);
    
    // Requête unifiée avec la logique de serv.js
    const [users] = await connection.execute(
      `SELECT u.id, u.email 
       FROM users u
       JOIN user_profiles up ON u.id = up.user_id
       WHERE u.email = ? OR u.uuid = ? OR up.first_name = ? OR up.last_name = ?`,
      [username, username, username, username]
    );
    
    await connection.end();
    
    if (users.length === 0) {
      return res.status(404).json({ error: 'Utilisateur non trouvé' });
    }
    
    res.json(users[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Erreur de base de données' });
  }
});

// Trouver une conversation entre deux utilisateurs
router.get('/conversations/find', async (req, res) => {
  try {
    const { userId1, userId2 } = req.query;
    const connection = await mysql.createConnection(dbConfig);
    
    const [conversations] = await connection.execute(
      `SELECT c.id as conversationId 
       FROM conversations c
       JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ?
       JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = ?
       GROUP BY c.id`,
      [userId1, userId2]
    );
    
    await connection.end();
    
    res.json({
      conversationId: conversations.length > 0 ? conversations[0].conversationId : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

// Récupérer les messages d'une conversation
router.get('/conversations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const connection = await mysql.createConnection(dbConfig);
    
    const [messages] = await connection.execute(
      `SELECT m.id as messageId, m.content, m.sent_at as timestamp, 
              u.id as senderId, CONCAT(u.first_name, ' ', u.last_name) as senderName
       FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.conversation_id = ?
       ORDER BY m.sent_at ASC`,
      [id]
    );
    
    await connection.end();
    
    res.json({
      messages: messages.map(msg => ({
        messageId: msg.messageId,
        content: msg.content,
        senderId: msg.senderId,
        senderUsername: msg.senderName,
        timestamp: msg.timestamp,
        fromSelf: msg.senderId === req.user?.id // Vous devrez gérer l'authentification
      }))
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;