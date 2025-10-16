require("dotenv").config();
const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const { ethers } = require("ethers");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());

const allowedOrigins = [
    "http://localhost:3000", // port du frontend
    "http://localhost:3001",
    "http://localhost:3002", 
    "http://localhost:*",]
  
  app.use(cors({
    origin: (origin, callback) => {
      if (process.env.NODE_ENV === 'development' || allowedOrigins.includes(origin) || !origin) {
        callback(null, true); // Autoriser l'origine
      } else {
        callback(new Error("CORS not allowed"), false);
      }
    },
    credentials: true,
  }));
  

app.options('*', (req, res) => {
    const origin = req.get('Origin');
    res.header('Access-Control-Allow-Origin', origin); // Permet l'origine spécifique
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    res.send();
});


app.use(cookieParser());

// Route de connexion avec validation de la signature
app.post("/api/auth/login", (req, res) => {
    const { address, signature } = req.body; // Récupère les données envoyées par le frontend

    // Afficher les données pour débogage
    console.log("Adresse reçue:", address);
    console.log("Signature reçue:", signature);

    // Vérifie si l'adresse Ethereum est valide
    if (!ethers.utils.isAddress(address)) {
        return res.status(400).json({ message: "Adresse Ethereum invalide" });
    }

    // Message que l'utilisateur a signé sur le frontend
    const message = `Je m'identifie avec mon adresse Ethereum: ${address}`;

    try {
        // Utilisation de ethers.js pour vérifier la signature
        const recoveredAddress = ethers.utils.verifyMessage(message, signature);
        console.log("Adresse récupérée de la signature:", recoveredAddress);

        // Vérifie si l'adresse récupérée correspond à l'adresse envoyée
        if (recoveredAddress.toLowerCase() !== address.toLowerCase()) {
            return res.status(400).json({ message: "Signature invalide" });
        }

        // Création du jeton JWT
        const token = jwt.sign({ address }, process.env.JWT_SECRET, { expiresIn: '1h' }); // Création du jeton
        res.status(200).json({ message: "Authentification réussie", token });  // Renvoyer le jeton JWT
    } catch (error) {
        console.error("Erreur lors de la vérification de la signature:", error);
        res.status(500).json({ message: "Erreur serveur" });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
