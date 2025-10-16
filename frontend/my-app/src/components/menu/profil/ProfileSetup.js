import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from 'axios';
import './profilpage.css';

const ProfileSetup = () => {
  const { state } = useLocation();
  const navigate = useNavigate();
  const [profileData, setProfileData] = useState({
    firstName: '',
    lastName: '',
    photo: null,
    photoFile: null
  });
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleChange = (e) => {
    setProfileData({...profileData, [e.target.name]: e.target.value});
  };

  const handlePhotoChange = (e) => {
    if (e.target.files[0]) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setProfileData({
          ...profileData,
          photo: event.target.result,
          photoFile: e.target.files[0]
        });
      };
      reader.readAsDataURL(e.target.files[0]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');
  
    try {
      const formData = new FormData();
      formData.append('userId', state.userId);
      formData.append('firstName', profileData.firstName);
      formData.append('lastName', profileData.lastName);
      
      if (profileData.photoFile) {
        formData.append('photo', profileData.photoFile); // Changé de 'photoFile' à 'photo'
      }

      // Debug: Afficher le contenu de FormData
      for (let [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      const response = await axios.post(
        'http://localhost:5001/api/profiles',
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            'Authorization': `Bearer ${localStorage.getItem('jwtToken')}`
          }
        }
      );

      if (response.data.success) {
        localStorage.setItem('userProfile', JSON.stringify({
          userId: state.userId,
          firstName: response.data.profile.first_name,
          lastName: response.data.profile.last_name,
          photo: response.data.profile.photo_url,
          ethAddress: localStorage.getItem('ethAddress')
        }));
        
        // Redirection garantie
        window.location.href = '/central?new_profile=true';
      }
    } catch (error) {
      console.error('Erreur:', {
        config: error.config,
        response: error.response,
        message: error.message
      });
      setMessage(
        error.response?.data?.message || 
        'Erreur lors de la création du profil'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="profile-setup">
      <h2>Complétez votre profil</h2>
      {message && <div className="error-message">{message}</div>}
      
      <form onSubmit={handleSubmit} className="profile-form">
        <div className="form-group">
          <label>Prénom</label>
          <input
            type="text"
            name="firstName"
            value={profileData.firstName}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Nom</label>
          <input
            type="text"
            name="lastName"
            value={profileData.lastName}
            onChange={handleChange}
            required
          />
        </div>
        
        <div className="form-group">
          <label>Photo de profil</label>
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
          />
          {profileData.photo && (
            <div className="photo-preview">
              <img src={profileData.photo} alt="Preview" width="100" />
            </div>
          )}
        </div>
        
        <button 
          type="submit" 
          disabled={isLoading} 
          className={`submit-btn ${isLoading ? 'loading' : ''}`}
        >
          {isLoading ? 'Enregistrement...' : 'Enregistrer le profil'}
        </button>
      </form>
    </div>
  );
};

export default ProfileSetup;