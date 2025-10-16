const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');
const mysql = require('mysql2/promise');

const app = express();
const server = http.createServer(app);

// Configuration de la base de données
const dbConfig = {
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'secure_user_profiles'
};

// Middleware CORS amélioré
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Middleware pour parser le JSON
app.use(express.json());

// Importez votre routeur API
const apiRouter = require('./api');
app.use('/api', apiRouter); // Montez le routeur à /api

// Configuration Socket.io
const io = new Server(server, {
  cors: {
    origin: "http://localhost:3000",
    methods: ["GET", "POST"],
    credentials: true
  },
  connectionStateRecovery: true
});

// Middleware d'authentification amélioré
io.use(async (socket, next) => {
  try {
    const auth = socket.handshake.auth;
    if (!auth) throw new Error('Authentication data missing');
    
    const username = auth.fetched_userName || auth.username;
    if (!username) throw new Error('Username required');

    const connection = await mysql.createConnection(dbConfig);
    
    // Recherche par first_name ou last_name dans user_profiles
    const [users] = await connection.execute(
      `SELECT u.id 
       FROM users u
       JOIN user_profiles up ON u.id = up.user_id
       WHERE up.first_name = ? OR up.last_name = ?`,
      [username, username]
    );
    
    if (users.length === 0) {
      throw new Error('User not found in database');
    }

    const userId = users[0].id;
    
    // Enregistrement de la connexion
    await connection.execute(
      'INSERT INTO socket_connections (socket_id, user_id) VALUES (?, ?)',
      [socket.id, userId]
    );
    
    await connection.end();

    socket.userId = userId;
    socket.username = username;
    next();
  } catch (err) {
    console.error('Authentication error:', err.message);
    next(new Error('Invalid authentication'));
  }
});

// Gestion des connexions Socket.io
io.on('connection', async (socket) => {
  console.log(`New connection: ${socket.username}`);

  // Notifier les autres utilisateurs
  socket.broadcast.emit('user connected', {
    id: socket.id,
    username: socket.username,
    userId: socket.userId
  });

  // Envoyer la liste des utilisateurs
  const users = [];
  io.of("/").sockets.forEach((s) => {
    users.push({
      id: s.id,
      userId: s.userId,
      username: s.username,
      self: s.id === socket.id
    });
  });
  socket.emit('users', users);

  // Gestion des messages privés
  socket.on('private message', async ({ content, to }, ack) => {
    try {
      const connection = await mysql.createConnection(dbConfig);
      
      // 1. Trouver ou créer une conversation entre les utilisateurs
      const recipientSocket = io.sockets.sockets.get(to);
      if (!recipientSocket) throw new Error('Recipient not found');

      // Trouver une conversation existante
      const [conversations] = await connection.execute(
        `SELECT c.id 
         FROM conversations c
         JOIN conversation_participants cp1 ON c.id = cp1.conversation_id AND cp1.user_id = ?
         JOIN conversation_participants cp2 ON c.id = cp2.conversation_id AND cp2.user_id = ?
         GROUP BY c.id`,
        [socket.userId, recipientSocket.userId]
      );

      let conversationId;
      
      if (conversations.length > 0) {
        conversationId = conversations[0].id;
      } else {
        // Créer une nouvelle conversation
        const [conversationResult] = await connection.execute(
          'INSERT INTO conversations () VALUES ()'
        );
        conversationId = conversationResult.insertId;
        
        // Ajouter les participants
        await connection.execute(
          'INSERT INTO conversation_participants (conversation_id, user_id) VALUES (?, ?), (?, ?)',
          [conversationId, socket.userId, conversationId, recipientSocket.userId]
        );
      }

      // Enregistrer le message dans la base de données
      const [messageResult] = await connection.execute(
        'INSERT INTO messages (conversation_id, sender_id, content) VALUES (?, ?, ?)',
        [conversationId, socket.userId, content]
      );

      await connection.end();

      // Envoyer au destinataire
      recipientSocket.emit('private message', {
        content,
        from: socket.id,
        senderUsername: socket.username,
        senderId: socket.userId,
        messageId: messageResult.insertId,
        conversationId,
        timestamp: new Date()
      });

      // Confirmation à l'expéditeur
      ack({ 
        status: 'delivered',
        messageId: messageResult.insertId,
        conversationId
      });
    } catch (err) {
      ack({ error: err.message });
    }
  });

  // Gestion de la déconnexion
  socket.on('disconnect', async () => {
    try {
      const connection = await mysql.createConnection(dbConfig);
      
      // Supprimer la connexion socket
      await connection.execute(
        'DELETE FROM socket_connections WHERE socket_id = ?',
        [socket.id]
      );
      
      // Journaliser la déconnexion
      await connection.execute(
        'INSERT INTO security_logs (user_id, action, ip_address, user_agent) VALUES (?, ?, ?, ?)',
        [socket.userId, 'socket_disconnection', socket.handshake.address, socket.handshake.headers['user-agent']]
      );

      await connection.end();
    } catch (err) {
      console.error('Error during disconnection:', err);
    }
    
    io.emit('user disconnected', socket.id);
    console.log(`${socket.username} disconnected`);
  });
});

// Gestion des erreurs globales
process.on('unhandledRejection', (err) => {
  console.error('Unhandled rejection:', err);
});

// Démarrer le serveur
server.listen(4200, () => {
  console.log('Server listening on port 4200');
});