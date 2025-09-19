// --- Import des modules nécessaires ---
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// --- Initialisation du serveur ---
const app = express();
const server = http.createServer(app);

// --- Configuration de CORS (Cross-Origin Resource Sharing) ---
const frontendURL = "https://paypal-owpo.onrender.com"; // Assurez-vous que c'est bien l'URL de votre frontend

const corsOptions = {
  origin: frontendURL,
  optionsSuccessStatus: 200
};
app.use(cors(corsOptions));

// --- Initialisation de Socket.IO ---
const io = new Server(server, {
  cors: {
    origin: frontendURL,
    methods: ["GET", "POST"]
  }
});

// Middleware pour parser le JSON des requêtes
app.use(express.json());

// --- Données du litige (hardcodées) ---
// Identifiants pour l'utilisateur (client)
const CORRECT_CODE_USER = "H25lnFfA3mNbU4nF5WDZ";
const CORRECT_DATE_USER = "18/09/2025";

// Nouveaux identifiants pour le service litige
const CORRECT_CODE_SERVICE = "gg";
const CORRECT_DATE_SERVICE = "123";


// --- Route API pour la vérification de la connexion ---
app.post('/verify', (req, res) => {
  const { code, date } = req.body;

  if (code === CORRECT_CODE_USER && date === CORRECT_DATE_USER) {
    res.status(200).json({ success: true, message: 'Authentification réussie', userType: 'Utilisateur' });
  } else if (code === CORRECT_CODE_SERVICE && date === CORRECT_DATE_SERVICE) {
    res.status(200).json({ success: true, message: 'Authentification service réussie', userType: 'Service Litige' });
  } else {
    res.status(401).json({ success: false, message: 'Code ou date invalide' });
  }
});

// --- Gestion des connexions Socket.IO (pour le chat en temps réel) ---
io.on('connection', (socket) => {
  console.log('Un utilisateur est connecté au chat !');

  // NOUVEAU: Notifie tous les autres utilisateurs qu'une nouvelle personne est arrivée.
  socket.broadcast.emit('user activity', { text: 'Un utilisateur s\'est connecté.' });

  // Gère la réception d'un message
  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });

  // NOUVEAU: Gère la demande d'effacement du chat
  socket.on('clear chat', () => {
    // Ordonne à tous les clients d'effacer leurs messages
    io.emit('chat cleared');
    console.log('Le chat a été effacé par un administrateur.');
  });

  // Gère la déconnexion d'un utilisateur
  socket.on('disconnect', () => {
    console.log('Un utilisateur s\'est déconnecté');
    // NOUVEAU: Notifie tout le monde qu'un utilisateur est parti.
    io.emit('user activity', { text: 'Un utilisateur s\'est déconnecté.' });
  });
});

// --- Démarrage du serveur ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Le serveur est démarré et écoute sur le port ${PORT}`);
});

