// --- Modules ---
const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const cors = require('cors');

// --- Server Initialization ---
const app = express();
const server = http.createServer(app);

// --- CORS Configuration ---
const frontendURL = "https://paypal-owpo.onrender.com"; // Your live frontend URL
app.use(cors({ origin: frontendURL }));

// --- Socket.IO Initialization ---
const io = new Server(server, {
  cors: {
    origin: frontendURL,
    methods: ["GET", "POST"]
  }
});

app.use(express.json());

// --- Hardcoded Credentials ---
const CORRECT_CODE_USER = "H25lnFfA3mNbU4nF5WDZ";
const CORRECT_DATE_USER = "18/09/2025";
const CORRECT_CODE_SERVICE = "gg";
const CORRECT_DATE_SERVICE = "123";

// --- API Route for Verification ---
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

// --- Socket.IO Connection Handling ---
io.on('connection', (socket) => {
  console.log('A user connected to the chat!');

  // Notify support when a user connects
  socket.broadcast.emit('user activity', { text: 'A user has connected.' });

  socket.on('chat message', (msg) => {
    io.emit('chat message', msg);
  });

  socket.on('clear chat', () => {
    io.emit('chat cleared');
    console.log('Chat was cleared by an admin.');
  });

  socket.on('disconnect', () => {
    console.log('A user disconnected');
    // Notify support when a user disconnects
    io.emit('user activity', { text: 'A user has disconnected.' });
  });
});

// --- Server Start ---
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server is running and listening on port ${PORT}`);
});

