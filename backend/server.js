// --- Import des modules nécessaires ---
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// --- Initialisation du serveur ---
const app = express();
const server = http.createServer(app);

// --- Configuration de CORS (Cross-Origin Resource Sharing) ---
// C'est la partie la plus importante pour le déploiement.
// Nous devons autoriser l'URL de notre frontend à communiquer avec ce backend.
const frontendURL = "https://paypal-owpo.onrender.com"; // <-- METTEZ L'URL DE VOTRE FRONTEND ICI

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
const CORRECT_CODE = "H25lnFfA3mNbU4nF5WDZ";
const CORRECT_DATE = "18/09/2025";

// --- Route API pour la vérification de la connexion ---
// Le frontend enverra une requête POST ici pour vérifier les identifiants.
app.post('/verify', (req, res) => {
  const { code, date } = req.body;

  if (code === CORRECT_CODE && date === CORRECT_DATE) {
    // Si les informations sont correctes, on renvoie un succès.
    res.status(200).json({ success: true, message: 'Authentification réussie' });
  } else {
    // Sinon, on renvoie une erreur.
    res.status(401).json({ success: false, message: 'Code ou date invalide' });
  }
});

// --- Gestion des connexions Socket.IO (pour le chat en temps réel) ---
io.on('connection', (socket) => {
  console.log('Un utilisateur est connecté au chat !');

  // Message de bienvenue envoyé automatiquement au client qui vient de se connecter.
  socket.emit('chat message', {
    user: 'Service Litige',
    text: 'Bonjour ! Comment pouvons-nous vous aider avec votre dossier ?'
  });

  // Lorsqu'on reçoit un message d'un client...
  socket.on('chat message', (msg) => {
    // On le renvoie à TOUS les clients connectés (l'utilisateur et le service litige).
    io.emit('chat message', msg);
  });

  // Gère la déconnexion d'un utilisateur.
  socket.on('disconnect', () => {
    console.log('Un utilisateur s\'est déconnecté');
  });
});

// --- Démarrage du serveur ---
// Render fournit automatiquement le port via la variable d'environnement PORT.
// Si on est en local, on utilise le port 3001 par défaut.
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Le serveur est démarré et écoute sur le port ${PORT}`);
});

