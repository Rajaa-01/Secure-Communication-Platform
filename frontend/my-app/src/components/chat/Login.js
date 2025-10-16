import React, { useState } from "react";
import "../chat/chatpage.css";  // Assurez-vous que chatpage.css est bien importé

const Login = (props) => {
  const [userName, setUserName] = useState("");  // Gestion de l'état pour le nom d'utilisateur

  const handleSubmit = (e) => {
    e.preventDefault();  // Empêcher le rechargement de la page
    if (userName.trim() !== "") {  // Vérifier si le nom d'utilisateur n'est pas vide
      props.submit(userName);  // Appel de la fonction passée en props
    }
  };

  return (
    <div className="login-container">
      <form className="login-form" onSubmit={handleSubmit}>
        <h2 className="login-title">Entrez votre nom d'utilisateur</h2>
        <input
          type="text"
          value={userName}
          onChange={(e) => setUserName(e.target.value)}  // Mettre à jour l'état à chaque changement
          placeholder="Nom d'utilisateur"
          className="login-input"
        />
        <button type="submit" className="login-button">
          Connexion
        </button>
      </form>
    </div>
  );
};

export default Login;
