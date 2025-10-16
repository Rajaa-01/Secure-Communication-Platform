import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { SocketProvider } from './components/meet/context/SocketProvider';
import { ThemeProvider } from './components/meet/context/ThemeContext';
import FirstPage from './components/pages/firstpage';
import LoginPage from './components/pages/loginpage';
import Profil from './components/menu/profil/profilpage';
import ProfileSetup from './components/menu/profil/ProfileSetup'; 
import CentralPage from './components/pages/centralpage';
import ChatPage from './components/chat/chatpage';
import MeetApp from './components/meet/meetapp';
import IDSPage from './components/ids/IDSPage';
import SecurityAssistant from './components/va/SecurityAssistant';
import Logout from './components/pages/logout';
import axios from 'axios';
import './App.css';

function App() {
  const [account, setAccount] = useState(null);
  const [token, setToken] = useState(null);


  const connectMetaMask = async () => {
    if (window.ethereum) {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      setAccount(accounts[0]);
      return accounts[0]; // Retournez l'adresse pour une utilisation ultérieure
    } else {
      alert("MetaMask non détecté!");
      return null;
    }
  };

  const handleLogin = async (username, password, digiCode) => {
    try {
      const response = await axios.post('http://localhost:5000/login', {
        username,
        accountAddress: account,
        password,
        digiCode
      });
      if (response.data.success) {
        setToken(response.data.token);
        localStorage.setItem('jwtToken', response.data.token);
      } else {
        alert(response.data.message);
      }
    } catch (error) {
      console.error("Erreur lors de la connexion:", error);
    }
  };

  return (
    <ThemeProvider>
      <SocketProvider>
        <Router>
          <Routes>
            <Route path="/" element={<FirstPage />} />
            <Route path="/login" element={<LoginPage onLogin={handleLogin} onConnectMetaMask={connectMetaMask} />} />
            <Route path="/profile-setup" element={<ProfileSetup />} /> 
            <Route path="/profil" element={<Profil />} />
            <Route path="/central" element={<CentralPage />} />
            <Route path="/message" element={<ChatPage />} />
            <Route path="/meetapp/*" element={<MeetApp />} />
            <Route path="/ids" element={<IDSPage />} />
            <Route path="/va" element={<SecurityAssistant />} />
            <Route path="/logout" element={<Logout />} />
          </Routes>
        </Router>
      </SocketProvider>
    </ThemeProvider>
  );
}

export default App;