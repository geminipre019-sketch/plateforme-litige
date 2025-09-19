import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// --- Configuration ---
// On récupère l'URL du backend depuis les variables d'environnement de React.
// En local, ce sera 'http://localhost:3001'.
// En production (sur Render), ce sera l'adresse de votre backend.
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';


// --- Composant Principal ---
function App() {
  // --- États de l'application ---
  const [isAuthenticated, setIsAuthenticated] = useState(false); // L'utilisateur est-il connecté ?
  const [code, setCode] = useState(''); // Contenu du champ "Code du litige"
  const [date, setDate] = useState(''); // Contenu du champ "Date du litige"
  const [error, setError] = useState(''); // Message d'erreur pour le formulaire

  // Si l'utilisateur est authentifié, il passe à l'écran de chat
  if (isAuthenticated) {
    // On passe l'URL de l'API au composant de Chat
    return <Chat apiUrl={API_URL} />;
  }

  // --- Logique de connexion ---
  const handleLogin = async (e) => {
    e.preventDefault(); // Empêche le rechargement de la page
    setError(''); // Réinitialise les erreurs

    try {
      // On envoie les données au backend sur la route /verify
      const response = await fetch(`${API_URL}/verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code, date }),
      });

      const data = await response.json();

      if (response.ok) { // Status 200-299
        setIsAuthenticated(true); // Connexion réussie !
      } else {
        setError(data.message || 'Une erreur est survenue.'); // Affiche l'erreur du backend
      }
    } catch (err) {
      console.error('Erreur de connexion:', err);
      setError('Impossible de contacter le serveur. Est-il bien démarré ?');
    }
  };

  // --- Rendu du formulaire de connexion ---
  return (
    <div className="bg-gray-100 min-h-screen flex items-center justify-center font-sans">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-xl shadow-lg">
        <h2 className="text-3xl font-bold text-center text-gray-800">
          Accès à votre dossier
        </h2>
        <p className="text-center text-gray-500">
          Veuillez entrer les informations fournies pour communiquer avec notre service.
        </p>
        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label htmlFor="code" className="text-sm font-medium text-gray-700">
              Code du litige
            </label>
            <input
              id="code"
              type="text"
              required
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: aH25lnFfA3mNbU4nF5WDZ"
            />
          </div>
          <div>
            <label htmlFor="date" className="text-sm font-medium text-gray-700">
              Date du litige (JJ/MM/AAAA)
            </label>
            <input
              id="date"
              type="text"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="mt-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Ex: 18/09/2025"
            />
          </div>

          {/* Affiche le message d'erreur s'il y en a un */}
          {error && (
            <div className="text-center text-sm text-red-600 bg-red-100 p-3 rounded-lg">
              {error}
            </div>
          )}

          <div>
            <button
              type="submit"
              className="w-full flex justify-center py-3 px-4 border border-transparent rounded-lg shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-300"
            >
              Se connecter
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// --- Composant du Chat ---
const Chat = ({ apiUrl }) => { // On reçoit l'URL en paramètre
    const [messages, setMessages] = useState([]); // Liste des messages du chat
    const [currentMessage, setCurrentMessage] = useState(''); // Message en cours de saisie
    const socketRef = useRef(null); // Référence pour garder le même socket entre les rendus
    const messagesEndRef = useRef(null); // Référence pour scroller en bas

    // Effet pour faire défiler la vue vers le dernier message
    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
    useEffect(scrollToBottom, [messages]);


    // Se connecte au serveur Socket.IO une seule fois au montage du composant
    useEffect(() => {
        // On utilise l'URL passée en paramètre pour la connexion
        socketRef.current = io(apiUrl);
        const socket = socketRef.current;

        // Écoute les nouveaux messages venant du serveur
        socket.on('chat message', (msg) => {
            setMessages((prevMessages) => [...prevMessages, msg]);
        });

        // Nettoyage à la déconnexion
        return () => {
            socket.disconnect();
        };
    }, [apiUrl]); // On ajoute apiUrl aux dépendances

    const sendMessage = (e) => {
        e.preventDefault();
        if (currentMessage.trim()) {
            const messageObject = {
                user: 'Utilisateur', // On identifie que c'est l'utilisateur qui envoie
                text: currentMessage,
            };
            // Envoie le message au serveur
            socketRef.current.emit('chat message', messageObject);
            setCurrentMessage(''); // Vide le champ de saisie
        }
    };

    return (
        <div className="bg-gray-100 min-h-screen flex flex-col font-sans">
            <header className="bg-white shadow-md p-4">
                <h1 className="text-xl font-bold text-center text-gray-800">
                    Service Litige – Communication en direct
                </h1>
            </header>

            <main className="flex-1 p-4 overflow-y-auto">
                <div className="max-w-3xl mx-auto space-y-4">
                    {messages.map((msg, index) => (
                        <div
                            key={index}
                            className={`flex ${msg.user === 'Utilisateur' ? 'justify-end' : 'justify-start'}`}
                        >
                            <div className={`max-w-xs md:max-w-md lg:max-w-lg px-4 py-3 rounded-2xl ${
                                msg.user === 'Utilisateur'
                                ? 'bg-blue-500 text-white rounded-br-none'
                                : 'bg-white text-gray-800 rounded-bl-none shadow-sm'
                            }`}>
                                <p className="font-bold text-sm mb-1">{msg.user}</p>
                                <p className="text-sm">{msg.text}</p>
                            </div>
                        </div>
                    ))}
                    {/* Element vide pour forcer le scroll vers le bas */}
                    <div ref={messagesEndRef} />
                </div>
            </main>

            <footer className="bg-white p-4 shadow-up">
                <form onSubmit={sendMessage} className="max-w-3xl mx-auto flex items-center space-x-2">
                    <input
                        type="text"
                        value={currentMessage}
                        onChange={(e) => setCurrentMessage(e.target.value)}
                        className="flex-1 block w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Écrivez votre message..."
                    />
                    <button
                        type="submit"
                        className="bg-blue-600 text-white rounded-full p-3 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                        aria-label="Envoyer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="feather feather-send"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                    </button>
                </form>
            </footer>
        </div>
    );
};

export default App;

