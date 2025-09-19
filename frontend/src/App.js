import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';

// --- Configuration ---
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
const socket = io(API_URL);

// --- SVG Icons ---
const TrashIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
        <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
        <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
    </svg>
);

const SendIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
    </svg>
);


// --- Main App Component ---
function App() {
    // --- State Management ---
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [userType, setUserType] = useState(''); // 'User' or 'Support'
    const [code, setCode] = useState('');
    const [date, setDate] = useState('');
    const [error, setError] = useState('');
    const [messages, setMessages] = useState([]);
    const [message, setMessage] = useState('');
    const messagesEndRef = useRef(null);

    // --- Effects ---
    useEffect(() => {
        socket.on('chat message', (msg) => {
            setMessages((prev) => [...prev, msg]);
        });
        socket.on('chat cleared', () => {
            setMessages([]);
        });
        socket.on('user activity', (notification) => {
            if (userType === 'Support') {
                const systemMessage = { user: 'System', text: notification.text };
                setMessages((prev) => [...prev, systemMessage]);
            }
        });

        return () => {
            socket.off('chat message');
            socket.off('chat cleared');
            socket.off('user activity');
        };
    }, [userType]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // --- Handlers ---
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
                setMessages([{ user: 'Support', text: 'Hello! How can we help you with your case today?' }]);
            } else {
                setError(data.message || 'Invalid code or date');
            }
        } catch (err) {
            setError('Server connection error. Please try again.');
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

    const handleClearChat = () => {
        socket.emit('clear chat');
    };

    // --- Render Logic ---
    // Login Screen
    if (!isLoggedIn) {
        return (
            <div className="min-h-screen bg-[#f5f7fa] flex items-center justify-center p-4 font-sans">
                <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
                    <img src="/paypal.png" alt="PayPal Logo" className="w-24 mx-auto mb-6" />
                    <h1 className="text-2xl font-bold text-center text-[#003087] mb-2">Case Access</h1>
                    <p className="text-center text-gray-500 mb-6">Please enter the information provided to communicate with our service.</p>
                    <form onSubmit={handleLogin}>
                        <div className="mb-4">
                            <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">Dispute Code</label>
                            <input type="text" id="code" value={code} onChange={(e) => setCode(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#009cde] focus:border-[#009cde]" required />
                        </div>
                        <div className="mb-6">
                            <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-1">Dispute Date (DD/MM/YYYY)</label>
                            <input type="text" id="date" value={date} placeholder="DD/MM/YYYY" onChange={(e) => setDate(e.target.value)} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-[#009cde] focus:border-[#009cde]" required />
                        </div>
                        {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
                        <button type="submit" className="w-full bg-[#0070ba] text-white font-bold py-2.5 px-4 rounded-lg hover:bg-[#003087] transition duration-300">
                            Connect
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    // Chat Screen
    return (
        <div className="h-screen flex flex-col font-sans bg-[#f5f7fa]">
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
                    <button onClick={handleClearChat} className="ml-auto flex items-center gap-2 bg-red-500 text-white text-xs font-bold py-2 px-3 rounded-lg hover:bg-red-600 transition duration-300">
                        <TrashIcon />
                        Clear Chat
                    </button>
                )}
            </header>

            <main className="flex-1 p-6 overflow-y-auto space-y-6">
                {messages.map((msg, index) => {
                    if (msg.user === 'System') {
                        return (
                            <div key={index} className="text-center my-2">
                                <p className="text-xs text-gray-500 italic bg-gray-200 px-3 py-1 rounded-full inline-block">{msg.text}</p>
                            </div>
                        );
                    }
                    
                    const isCurrentUser = msg.user === userType;
                    
                    return (
                        <div key={index} className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                             <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold flex-shrink-0 ${isCurrentUser ? 'bg-[#009cde]' : 'bg-[#003087]'}`}>
                                {isCurrentUser ? 'Me' : 'PP'}
                            </div>
                            <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                                <span className="text-sm font-semibold text-[#4a4a4a] mb-1">{isCurrentUser ? 'Me' : 'PayPal Support'}</span>
                                {/* --- LA LIGNE CORRIGÉE EST ICI --- */}
                                <div className={`p-3 rounded-lg max-w-md ${isCurrentUser ? 'bg-[#0070ba] text-white rounded-tr-none' : 'bg-[#e1e7eb] text-black rounded-tl-none'}`}>
                                    <p>{msg.text}</p>
                                </div>
                            </div>
                        </div>
                    );
                })}
                <div ref={messagesEndRef} />
            </main>

            <footer className="p-4 bg-white border-t border-[#e1e7eb]">
                <form onSubmit={sendMessage} className="flex items-center space-x-4">
                    <input type="text" value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Write your message..." className="flex-1 p-3 border border-[#e1e7eb] rounded-full focus:outline-none focus:ring-2 focus:ring-[#009cde] transition" />
                    <button type="submit" className="bg-[#0070ba] text-white p-3 rounded-full w-12 h-12 flex items-center justify-center flex-shrink-0 hover:bg-[#003087] transition">
                        <SendIcon />
                    </button>
                </form>
            </footer>
        </div>
    );
}

export default App;

