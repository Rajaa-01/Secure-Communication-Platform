import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./centralpage.css";
import Profil from "../menu/profil/profilpage";
import axios from "axios";

const CentralPage = () => {
  const navigate = useNavigate();
  const [showProfile, setShowProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const verifySession = async () => {
      try {
        // 1. Vérification des données requises
        const jwtToken = localStorage.getItem("jwtToken");
        const ethAddress = localStorage.getItem("ethAddress");
        const userProfile = localStorage.getItem("userProfile");

        // Debug: Afficher l'état des données
        console.table({
          jwtToken: !!jwtToken,
          ethAddress: !!ethAddress,
          userProfile: !!userProfile
        });

        // 2. Vérification MetaMask
        if (!window.ethereum?.isMetaMask) {
          window.location.href = "/login?error=metamask_required";
          return;
        }

        // 3. Vérification du token JWT
        if (!jwtToken) {
          window.location.href = "/login";
          return;
        }

        // 4. Vérification du profil utilisateur
        if (!userProfile) {
          // Vérification API supplémentaire
          try {
            const response = await axios.get("http://localhost:5001/api/profiles", {
              headers: { Authorization: `Bearer ${jwtToken}` }
            });

            if (response.data.success) {
              localStorage.setItem('userProfile', JSON.stringify(response.data.profile));
            } else {
              window.location.href = "/profile-setup";
            }
          } catch (err) {
            console.error("Erreur vérification profil:", err);
            window.location.href = "/profile-setup";
          }
          return;
        }

        // 5. Vérification finale de l'adresse Ethereum
        if (!ethAddress) {
          window.location.href = "/login?error=eth_address_missing";
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error("Erreur vérification session:", error);
        setError("Erreur de chargement");
        window.location.href = "/login";
      }
    };

    verifySession();
  }, []);

  const handleNavigation = (path) => {
    navigate(path);
  };

  const generateStars = (num) => {
    return Array.from({ length: num }).map((_, i) => (
      <div
        key={i}
        className="star"
        style={{
          left: `${Math.random() * 100}vw`,
          top: `${Math.random() * 100}vh`,
          width: `${Math.random() * 2 + 1}px`,
          height: `${Math.random() * 2 + 1}px`,
          animation: `twinkle ${Math.random() * 3 + 2}s infinite alternate`
        }}
      />
    ));
  };

  if (loading) return <div className="loading">Vérification de la session...</div>;
  if (error) return <div className="error">{error}</div>;

  return (
    <div className="container">
      <aside className="sidebar">
        <h1 className="logo">STELLAR</h1>
        <nav>
          <ul>
            <li onClick={() => setShowProfile(true)}>
              <span className="icon">👤</span> Profil
            </li>
            <li onClick={() => handleNavigation("/logout")}>
              <span className="icon">🚪</span> Déconnexion
            </li>
          </ul>
        </nav>
      </aside>

      <main className="main">
        <div className="stars-bg">{generateStars(150)}</div>
        
        <div className="orbit">
          <div className="orbit-item" onClick={() => handleNavigation("/message")}>✉</div>
          <div className="orbit-item" onClick={() => handleNavigation("/meetapp")}>📞</div>
          <div className="orbit-item" onClick={() => handleNavigation("/va")}>🦸🏻‍♀️</div>
          <div className="orbit-item center" onClick={() => handleNavigation("/ids")}>🪐</div>
        </div>
        
        {showProfile && <Profil onClose={() => setShowProfile(false)} />}
      </main>
    </div>
  );
};

export default CentralPage;