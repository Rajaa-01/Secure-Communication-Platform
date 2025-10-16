
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './profilpage.css';

const Profil = ({ onClose }) => {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const userId = localStorage.getItem('userId');

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const response = await axios.get(
          `http://localhost:5001/api/profiles/${userId}`,
          {
            headers: {
              'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
            }
          }
        );
        
        if (response.data.success) {
          setProfile(response.data.profile);
        } else {
          setError('Profil non trouvé');
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        setError('Erreur lors du chargement du profil');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      fetchProfile();
    } else {
      setError('ID utilisateur non trouvé');
      setLoading(false);
    }
  }, [userId]);

  if (loading) return <div className="loading">Chargement...</div>;
  if (error) return <div className="error">{error}</div>;
  if (!profile) return <div className="error">Aucune donnée de profil disponible</div>;

  return (
    <div className="modal-overlay">
      <div className="modal">
        <button className="close-btn" onClick={onClose}>✖</button>
        <h2>Profil Utilisateur</h2>
        <div className="profile-content">
          <div className="profile-picture">
            {profile.photo ? (
              <img src={profile.photo} alt="Profil" />
            ) : (
              <div className="default-picture">👤</div>
            )}
          </div>
          <h3>{profile.firstName} {profile.lastName}</h3>
          <p>Adresse Ethereum: {localStorage.getItem('ethAddress')}</p>
          <p>Membre depuis: {new Date(profile.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
    </div>
  );
};

export default Profil;