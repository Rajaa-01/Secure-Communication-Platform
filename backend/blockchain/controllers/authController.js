require("dotenv").config();
const jwt = require("jsonwebtoken");
const { ethers } = require("ethers");

const SECRET_KEY = process.env.JWT_SECRET || "supersecretkey";

const refreshTokens = [];

exports.login = async (req, res) => {
    try {
        const { address, signature } = req.body;

        if (!address || !signature) {
            return res.status(400).json({ error: "Adresse et signature requises." });
        }

        const message = `Connexion sécurisée pour ${address}`;
        const signerAddress = ethers.utils.verifyMessage(message, signature);

        if (signerAddress.toLowerCase() !== address.toLowerCase()) {
            return res.status(401).json({ error: "Signature invalide." });
        }

        // Génération des tokens
        const accessToken = jwt.sign({ address }, process.env.JWT_SECRET, { expiresIn: "15m" });
        const refreshToken = jwt.sign({ address }, process.env.JWT_SECRET, { expiresIn: "7d" });

        refreshTokens.push(refreshToken); // Stockage en mémoire, peut être remplacé par une base de données

        res.cookie("jwt", accessToken, {
            httpOnly: true,
            secure: true, // Activer HTTPS
            sameSite: "Strict",
            maxAge: 15 * 60 * 1000 // 15 minutes pour l'accessToken
        });

        res.cookie("refreshToken", refreshToken, {
            httpOnly: true,
            secure: true,
            sameSite: "Strict",
            maxAge: 7 * 24 * 60 * 60 * 1000 // 7 jours pour le refreshToken
        });

        res.json({ message: "Authentification réussie" });
    } catch (error) {
        console.error("Erreur d'authentification:", error);
        res.status(500).json({ error: "Erreur serveur." });
    }
};
