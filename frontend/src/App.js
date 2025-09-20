import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// --- Configuration ---
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
let socket; // La socket sera initialisée après la connexion
const MAX_FILE_SIZE = 500 * 1024; // 500 KB

// --- Icônes SVG ---
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg> );
const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg> );
const AttachmentIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M4.5 3a2.5 2.5 0 0 1 5 0v9a1.5 1.5 0 0 1-3 0V5a.5.5 0 0 1 1 0v7a.5.5 0 0 0 1 0V3a1.5 1.5 0 1 0-3 0v9a2.5 2.5 0 0 0 5 0V5A.5.5 0 0 1 9 5v7a1.5 1.5 0 1 1-3 0z"/></svg> );
const FileIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/></svg> );
const ExclamationIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-red-500" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg> );


// --- Panneau d'informations Client ---
const ClientInfoPanel = ({ info }) => {
    // ... La fonction parseUserAgent reste la même ...
    const parseUserAgent = (ua) => { if (!ua || ua === 'N/A') return { browser: 'N/A', os: 'N/A' }; let browser = 'Unknown'; if (ua.includes('Firefox')) browser = 'Firefox'; else if (ua.includes('Edg')) browser = 'Edge'; else if (ua.includes('Chrome')) browser = 'Chrome'; else if (ua.includes('Safari')) browser = 'Safari'; let os = 'Unknown'; if (ua.includes('Win')) os = 'Windows'; else if (ua.includes('Mac')) os = 'macOS'; else if (ua.includes('Linux')) os = 'Linux'; else if (ua.includes('Android')) os = 'Android'; else if (ua.includes('like Mac OS X')) os = 'iOS'; return { browser, os }; };
    const { browser, os } = parseUserAgent(info.userAgent);
    const connectionTime = info.connectedAt ? new Date(info.connectedAt).toLocaleString() : 'N/A';
    const mainLanguage = info.language ? info.language.split(',')[0] : 'N/A';

    return (
        <div className="bg-gray-100 p-3 border-b border-gray-200 text-xs text-gray-700 shadow-inner grid grid-cols-2 sm:grid-cols-4 gap-2">
            <div><span className="font-bold">IP Address:</span> <code className="bg-gray-200 px-1.5 py-0.5 rounded">{info.ip}</code></div>
            <div><span className="font-bold">Location:</span> <span className="bg-gray-200 px-1.5 py-0.5 rounded">{info.city || 'N/A'}, {info.country || 'N/A'}</span></div>
            <div><span className="font-bold">ISP:</span> <span className="bg-gray-200 px-1.5 py-0.5 rounded">{info.isp || 'N/A'}</span></div>
            <div><span className="font-bold">OS:</span> <span className="bg-gray-200 px-1.5 py-0.5 rounded">{os}</span></div>
            <div><span className="font-bold">Browser:</span> <span className="bg-gray-200 px-1.5 py-0.5 rounded">{browser}</span></div>
            <div><span className="font-bold">Language:</span> <span className="bg-gray-200 px-1.5 py-0.5 rounded">{mainLanguage}</span></div>
            <div className="col-span-2 sm:col-span-4"><span className="font-bold">Connection Time:</span> <span className="bg-gray-200 px-1.5 py-0.5 rounded">{connectionTime}</span></div>
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
    const [isImportant, setIsImportant] = useState(false); // NOUVEAU: État pour les messages importants

    // ... Les effets useEffect restent les mêmes ...
    useEffect(() => { if (isLoggedIn) { const handleNewMessage = (msg) => { if (msg.user === 'User' && msg.clientInfo) setClientInfo(msg.clientInfo); setMessages((prev) => [...prev, msg]); }; const handleNewFile = (fileData) => { if (fileData.user === 'User' && fileData.clientInfo) setClientInfo(fileData.clientInfo); setMessages((prev) => [...prev, { ...fileData, type: 'file' }]); }; socket.on('chat message', handleNewMessage); socket.on('file message', handleNewFile); socket.on('chat cleared', () => setMessages([])); socket.on('user activity', (notification) => { if (userType === 'Support') { setMessages((prev) => [...prev, { user: 'System', text: notification.text }]); } }); return () => { socket.off('chat message'); socket.off('file message'); socket.off('chat cleared'); socket.off('user activity'); if (socket) socket.disconnect(); }; } }, [isLoggedIn, userType]);
    useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

    // --- Gestionnaires d'événements ---
    const handleLogin = async (e) => { e.preventDefault(); setError(''); try { const response = await fetch(`${API_URL}/verify`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ code, date }) }); const data = await response.json(); if (data.success) { setUserType(data.userType); socket = io(API_URL); setIsLoggedIn(true); setMessages([{ user: 'Support', text: 'Hello! How can we help you with your case today?' }]); } else { setError(data.message || 'Invalid code or date'); } } catch (err) { setError('Server connection error. Please try again.'); } };
    
    // NOUVEAU: Mise à jour de sendMessage pour inclure le statut "important"
    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('chat message', {
                user: userType,
                text: message,
                isImportant: userType === 'Support' ? isImportant : false // Seul le support peut envoyer des messages importants
            });
            setMessage('');
            setIsImportant(false); // Réinitialise la case après envoi
        }
    };

    // ... Les autres gestionnaires restent les mêmes ...
    const handleClearChat = () => socket.emit('clear chat');
    const handleAttachmentClick = () => fileInputRef.current.click();
    const handleFileChange = (e) => { const files = e.target.files; if (!files || files.length === 0) return; setUploading(true); Array.from(files).forEach(file => { if (file.size > MAX_FILE_SIZE) { alert(`File "${file.name}" is too large. Max size is ${MAX_FILE_SIZE / 1024} KB.`); return; } const reader = new FileReader(); reader.onload = (event) => { const fileData = { user: userType, fileName: file.name, fileType: file.type, content: event.target.result }; socket.emit('file message', fileData); }; reader.readAsDataURL(file); }); setTimeout(() => setUploading(false), 1000); e.target.value = null; };

    // ... Le rendu du formulaire de connexion reste le même ...
    if (!isLoggedIn) { return ( <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4 font-sans">{/* ... */}</div> ); }

    return (
        <div className="h-screen flex flex-col font-sans bg-[#f5f7fa]">
            <header className="flex items-center p-4 border-b border-[#e1e7eb] shadow-sm bg-white">{/* ... */}</header>
            
            {userType === 'Support' && <ClientInfoPanel info={clientInfo} />}

            <main className="flex-1 p-6 overflow-y-auto space-y-6">
                {messages.map((msg, index) => {
                    // ... Le rendu des messages système et fichiers reste le même ...
                    if (msg.user === 'System') { return ( <div key={index} className="text-center my-2">{/*...*/}</div> ); }
                    const isCurrentUser = msg.user === userType;
                    if (msg.type === 'file') { return ( <div key={index} className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>{/*...*/}</div> ) }

                    // NOUVEAU: Logique de rendu pour les messages texte (avec la couleur rouge)
                     return (
                        <div key={index} className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                             <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold flex-shrink-0 ${isCurrentUser ? 'bg-[#009cde]' : 'bg-[#003087]'}`}>
                                {isCurrentUser ? 'Me' : 'PP'}
                            </div>
                            <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                                <span className="text-sm font-semibold text-[#4a4a4a] mb-1">{isCurrentUser ? 'Me' : 'PayPal Support'}</span>
                                <div className={`p-3 rounded-lg max-w-md ${
                                    isCurrentUser
                                    ? 'bg-[#0070ba] text-white rounded-tr-none'
                                    : msg.isImportant
                                        ? 'bg-red-100 text-red-900 border border-red-200 rounded-tl-none'
                                        : 'bg-[#e1e7eb] text-black rounded-tl-none'
                                }`}>
                                    <p>{msg.text}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {uploading && <div className="text-center text-sm text-gray-500 italic">Uploading files...</div>}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-4 bg-white border-t border-[#e1e7eb]">
                <form onSubmit={sendMessage} className="flex items-center space-x-2 sm:space-x-4">
                    <input ref={fileInputRef} type="file" onChange={handleFileChange} className="hidden" multiple />
                    <button type="button" onClick={handleAttachmentClick} disabled={uploading} className="text-gray-500 p-2 rounded-full hover:bg-gray-100 transition disabled:opacity-50">
                        <AttachmentIcon />
                    </button>
                    <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message..." className="flex-1 p-3 border border-[#e1e7eb] rounded-full focus:outline-none focus:ring-2 focus:ring-[#009cde] transition" />
                    
                    {/* NOUVEAU: Case à cocher pour les messages importants, visible uniquement par le support */}
                    {userType === 'Support' && (
                        <div className="flex items-center" title="Send as important message">
                            <input
                                type="checkbox"
                                id="important-checkbox"
                                checked={isImportant}
                                onChange={(e) => setIsImportant(e.target.checked)}
                                className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                            />
                            <label htmlFor="important-checkbox" className="ml-2 text-sm font-medium text-red-600 cursor-pointer flex items-center">
                                <ExclamationIcon />
                            </label>
                        </div>
                    )}

                    <button type="submit" className="bg-[#0070ba] text-white p-3 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0 hover:bg-[#003087] transition">
                        <SendIcon />
                    </button>
                </form>
            </footer>
        </div>
    );
}

export default App;
```

### 2. Instructions de déploiement

La procédure est la même que d'habitude.

1.  Mettez à jour le fichier `frontend/src/App.js`.
2.  Envoyez les modifications sur GitHub avec les commandes :
    ```bash
    git add .
    ```
    ```bash
    git commit -m "Add important message feature for support"
    ```
    ```bash
    git push
    

