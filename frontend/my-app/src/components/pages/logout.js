import React, { useEffect } from 'react';

const Logout = () => {
  useEffect(() => {
    localStorage.removeItem("jwtToken");
    window.location.href = "/login";
  }, []);

  return <div className="page-container">Déconnexion...</div>;
};

export default Logout;
