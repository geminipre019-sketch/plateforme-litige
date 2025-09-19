import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// --- Configuration ---
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const socket = io(API_URL);

// --- Icône Poubelle (SVG) ---
const TrashIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
  </svg>
);

// --- Composant Principal ---
function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [userType, setUserType] = useState('');
  const [code, setCode] = useState('');
  const [date, setDate] = useState('');
  const [error, setError] = useState('');
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const messagesEndRef = useRef(null);

  useEffect(() => {
    // Écoute les messages de chat standards
    socket.on('chat message', (msg) => {
      setMessages((prevMessages) => [...prevMessages, msg]);
    });

    // NOUVEAU: Écoute l'ordre d'effacement du chat
    socket.on('chat cleared', () => {
      setMessages([]); // On vide l'historique des messages
    });

    // NOUVEAU: Écoute les notifications de connexion/déconnexion
    socket.on('user activity', (notification) => {
      // Seul le service litige voit ces notifications système
      if (userType === 'Service Litige') {
        const systemMessage = { user: 'System', text: notification.text };
        setMessages((prevMessages) => [...prevMessages, systemMessage]);
      }
    });

    return () => {
      socket.off('chat message');
      socket.off('chat cleared');
      socket.off('user activity');
    };
  }, [userType]); // On ajoute userType comme dépendance pour que le listener soit à jour

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const response = await fetch(`${API_URL}/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code, date }),
      });
      const data = await response.json();
      if (data.success) {
        setIsLoggedIn(true);
        setUserType(data.userType);
        // Message de bienvenue initial pour tout le monde
        setMessages([{ user: 'Service Litige', text: 'Bonjour ! Comment pouvons-nous vous aider avec votre dossier ?' }]);
      } else {
        setError(data.message || 'Code ou date invalide');
      }
    } catch (err) {
      setError('Erreur de connexion au serveur. Veuillez réessayer.');
    }
  };

  const sendMessage = (e) => {
    e.preventDefault();
    if (message.trim()) {
      const msg = { user: userType, text: message };
      socket.emit('chat message', msg);
      setMessage('');
    }
  };

  // NOUVEAU: Fonction pour demander l'effacement du chat
  const handleClearChat = () => {
    socket.emit('clear chat');
  };

  if (!isLoggedIn) {
    return (
        <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
                <h1 className="text-2xl font-bold text-center text-gray-800 mb-2">Accès à votre dossier</h1>
                <p className="text-center text-gray-500 mb-6">Veuillez entrer les informations fournies pour communiquer avec notre service.</p>
                <form onSubmit={handleLogin}>
                    <div className="mb-4">
                        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">Code du litige</label>
                        <input type="text" id="code" value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" required />
                    </div>
                    <div className="mb-6">
                        <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Date du litige (JJ/MM/AAAA)</label>
                        <input type="text" id="date" value={date} placeholder="JJ/MM/AAAA" onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500" required />
                    </div>
                    {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
                    <button type="submit" className="w-full bg-blue-600 text-white font-bold py-2 px-4 rounded-lg hover:bg-blue-700 transition duration-300">Se connecter</button>
                </form>
            </div>
        </div>
    );
  }

  return (
    <div className="h-screen flex flex-col font-sans bg-gray-50">
        <header className="bg-white shadow-md p-4 flex justify-between items-center">
            <h1 className="text-xl font-semibold text-gray-700">Service Litige – Communication en direct</h1>
            {/* NOUVEAU: Le bouton effacer n'apparaît que pour le service litige */}
            {userType === 'Service Litige' && (
                <button onClick={handleClearChat} className="flex items-center gap-2 bg-red-500 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-red-600 transition duration-300">
                    <TrashIcon />
                    Effacer
                </button>
            )}
        </header>
        <main className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, index) => {
                // NOUVEAU: Affichage spécial pour les messages système
                if (msg.user === 'System') {
                    return (
                        <div key={index} className="text-center my-2">
                            <p className="text-xs text-gray-500 italic bg-gray-200 px-3 py-1 rounded-full inline-block">{msg.text}</p>
                        </div>
                    );
                }
                // Affichage normal pour les messages de chat
                return (
                    <div key={index} className={`flex items-end gap-2 ${msg.user === userType ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-xs md:max-w-md p-3 rounded-2xl shadow-sm ${msg.user === userType ? 'bg-blue-500 text-white rounded-br-none' : 'bg-gray-200 text-gray-800 rounded-bl-none'}`}>
                            <p className="text-xs font-semibold mb-1 opacity-80">{msg.user === userType ? 'Moi' : msg.user}</p>
                            <p className="text-sm">{msg.text}</p>
                        </div>
                    </div>
                );
            })}
            <div ref={messagesEndRef} />
        </main>
        <footer className="bg-white p-4 border-t">
            <form onSubmit={sendMessage} className="flex gap-2">
                <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} className="flex-1 px-4 py-2 border border-gray-300 rounded-full focus:ring-blue-500 focus:border-blue-500" placeholder="Écrivez votre message..." autoComplete="off" />
                <button type="submit" className="bg-blue-600 text-white font-bold py-2 px-4 rounded-full hover:bg-blue-700 transition duration-300">Envoyer</button>
            </form>
        </footer>
    </div>
  );
}

export default App;

