import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ethers } from 'ethers';
import axios from 'axios';
import './loginpage.css';

const LoginPage = ({ onConnectMetaMask }) => {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const authenticateWithMetaMask = async () => {
    try {
      if (!window.ethereum) {
        setMessage('Veuillez installer MetaMask pour continuer');
        return;
      }
  
      setLoading(true);
      setMessage('');
  
      // 1. Connexion à MetaMask
      const provider = new ethers.providers.Web3Provider(window.ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const address = accounts[0].toLowerCase(); // Normalisation importante
  
      // 2. Vérification du profil côté serveur
      const response = await axios.post('http://localhost:5001/api/auth/check-user', {
        ethAddress: address
      });
  
      if (!response.data.success) {
        throw new Error(response.data.message || 'Erreur de vérification du profil');
      }
  
      const { hasProfile, token, userId } = response.data;
  
      // Stocker les informations
      localStorage.setItem('jwtToken', token);
      localStorage.setItem('ethAddress', address);
      localStorage.setItem('userId', userId);
  
      // 3. Redirection
      if (hasProfile) {
        navigate('/central');
      } else {
        navigate('/profile-setup', {
          state: {
            ethAddress: address,
            userId
          }
        });
      }
  
    } catch (error) {
      console.error('Erreur:', error);
      setMessage(error.response?.data?.message || error.message || 'Erreur de connexion');
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex items-center justify-center h-screen login-page">
      <div className="w-full max-w-sm p-8 bg-gray-800 rounded-lg shadow-lg">
        <h1 className="mb-6 text-3xl text-center text-white">Connexion Sécurisée</h1>

        <button
          onClick={authenticateWithMetaMask}
          className="w-full py-2 font-bold text-white bg-red-600 rounded-lg hover:bg-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
          disabled={loading}
        >
          {loading ? 'Connexion en cours...' : 'Se connecter avec MetaMask'}
        </button>

        {message && <p className="mt-4 text-center text-red-500">{message}</p>}

        <div className="mt-4 text-center">
          <p className="text-sm text-gray-400">
            Besoin d'aide ?{' '}
            <button
              onClick={() => alert('Contactez-nous pour plus d\'informations.')} 
              className="text-red-500 hover:underline focus:outline-none"
            >
              Contactez-nous
            </button>
          </p>
        </div>

        <Link to="/">
          <button className="mt-4 text-red-500 hover:underline">Retour à l'accueil</button>
        </Link>
      </div>
    </div>
  );
};

export default LoginPage;