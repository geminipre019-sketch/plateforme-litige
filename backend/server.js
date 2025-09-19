// Import des modules nécessaires
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// --- Configuration initiale ---
const app = express();
// On crée un serveur HTTP à partir de l'application Express
// C'est nécessaire pour pouvoir y attacher Socket.IO
const server = http.createServer(app); 

// On autorise les requêtes depuis n'importe quelle origine (pour le développement)
// En production, il faudrait restreindre à l'URL de votre frontend
app.use(cors()); 

// On active le middleware pour parser le JSON des requêtes entrantes
app.use(express.json());

// --- Données du litige (hardcodées comme demandé) ---
const CORRECT_CODE = "H25lnFfA3mNbU4nF5WDZ";
const CORRECT_DATE = "18/09/2025";

// --- Configuration de Socket.IO pour le chat temps réel ---
const io = new Server(server, {
  cors: {
    origin: "*", // Accepte les connexions de n'importe où
    methods: ["GET", "POST"]
  }
});

// --- Logique du serveur de chat ---
// Se déclenche à chaque fois qu'un utilisateur se connecte au chat
io.on('connection', (socket) => {
  console.log('Un utilisateur s\'est connecté au chat:', socket.id);

  // Message de bienvenue du service litige (simulé)
  // On envoie un message uniquement à l'utilisateur qui vient de se connecter
  socket.emit('chat message', { 
    user: 'Service Litige', 
    text: 'Bonjour ! Comment puis-je vous aider concernant votre dossier ?' 
  });

  // Se déclenche quand un message est reçu d'un utilisateur
  socket.on('chat message', (msg) => {
    console.log('Message reçu: ', msg);
    // On renvoie le message à TOUS les utilisateurs connectés, y compris l'expéditeur
    io.emit('chat message', msg); 
  });

  // Se déclenche quand un utilisateur se déconnecte
  socket.on('disconnect', () => {
    console.log('Un utilisateur s\'est déconnecté:', socket.id);
  });
});


// --- Route API pour la vérification ---
// C'est le point d'entrée pour la page de connexion
app.post('/verify', (req, res) => {
  // On récupère le code et la date envoyés par le frontend
  const { code, date } = req.body;

  console.log(`Tentative de connexion avec le code: ${code} et la date: ${date}`);

  // On vérifie si les informations correspondent
  if (code === CORRECT_CODE && date === CORRECT_DATE) {
    // Si c'est correct, on envoie une réponse positive
    res.status(200).json({ success: true, message: 'Authentification réussie.' });
  } else {
    // Sinon, on envoie une erreur 401 (Non autorisé)
    res.status(401).json({ success: false, message: 'Code ou date invalide.' });
  }
});

// --- Démarrage du serveur ---
const PORT = process.env.PORT || 3001; // Le port 3001 est souvent utilisé pour les API en développement
server.listen(PORT, () => {
  console.log(`Le serveur est démarré et écoute sur le port ${PORT}`);
});
