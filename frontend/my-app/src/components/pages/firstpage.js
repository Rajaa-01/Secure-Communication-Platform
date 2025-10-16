import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { FaShieldAlt } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import '../pages/firstpage.css';  // Import du CSS spécifique pour la page d'accueil

export default function FirstPage() {
  const [spread, setSpread] = useState(false);

  useEffect(() => {
    setTimeout(() => setSpread(true), 1000);
  }, []);

  // Générer des étoiles
  const generateStars = (num) => {
    let stars = [];
    for (let i = 0; i < num; i++) {
      stars.push(
        <div
          key={i}
          className="star"
style={{
  left: `${Math.random() * 100}vw`,
  top: `${Math.random() * 100}vh`,
  width: `${Math.random() * 2 + 1}px`,
  height: `${Math.random() * 2 + 1}px`,
}}

        ></div>
      );
    }
    return stars;
  };

  return (
    <div className="relative flex items-center justify-center h-screen overflow-hidden bg-black">
      {/* Ciel étoilé */}
      <div className="stars">{generateStars(150)}</div>

      {/* Nuage de points central */}
      <motion.div
        initial={{ opacity: 0.5, scale: 0.5 }}
        animate={{ opacity: spread ? 1 : 0.5, scale: spread ? 5 : 0.5 }}
        transition={{ duration: 2 }}
        className="absolute w-40 h-40 bg-red-600 rounded-full blur-3xl"
      />

      {/* Contenu principal */}
      <div className="z-10 text-center">
        {/* Logo de sécurité */}
        <FaShieldAlt className="mb-4 text-6xl text-white" />
        
        {/* Texte animé */}
        <h1 className="text-4xl font-bold">
          <motion.span className="text-white" animate={{ color: ['#fff', '#ff0000', '#fff'] }} transition={{ duration: 1.5, repeat: Infinity }}>Bienvenue dans  </motion.span>
          <span className="text-red-500">votre espace</span>
        </h1>
        
        {/* Bouton animé avec redirection vers la page de login */}
        <Link to="/login">
          <motion.button
            whileHover={{ scale: 1.1, boxShadow: "0px 0px 15px rgb(255, 0, 0)" }}
            className="px-6 py-2 mt-6 text-lg text-red-500 border border-red-500 rounded-full"
          >
            Entrer
          </motion.button>
        </Link>
      </div>
    </div>
  );
}
