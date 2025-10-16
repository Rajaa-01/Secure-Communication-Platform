const express = require('express');
const axios = require('axios');
const router = express.Router();

// Configuration Ollama
const OLLAMA_CONFIG = {
  baseURL: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  model: process.env.OLLAMA_MODEL || 'mistral',
  timeout: parseInt(process.env.OLLAMA_TIMEOUT) || 30000
};

// Prompt système pour spécialiser l'assistant en sécurité
const SYSTEM_PROMPT = `
Vous êtes SecurityGPT, un assistant virtuel expert en cybersécurité et en attaques informatiques.
Votre rôle est d'aider les utilisateurs à comprendre les concepts de sécurité, les vulnérabilités,
les attaques potentielles et les mesures de protection.

Caractéristiques:
* Réponses techniques mais accessibles
* Focus sur les bonnes pratiques de sécurité
* Identification des risques et vulnérabilités
* Suggestions de mesures de protection
* Explications claires des concepts complexes

Règles:
* Ne jamais fournir de code ou d'instructions pour des attaques illégales
* Toujours orienter vers des solutions éthiques
* Vérifier les demandes ambiguës
* Prévenir des risques potentiels
`;

// Base de connaissances locale pour le fallback
const LOCAL_KNOWLEDGE = {
  "ddos": {
    question: /(DDoS|dénial de service|déni de service)/i,
    response: `Pour se protéger contre une attaque DDoS :
1. Utilisez un service de protection DDoS comme Cloudflare, Akamai ou AWS Shield
2. Configurez des limites de taux sur votre serveur
3. Mettez en place un système de détection d'anomalies
4. Utilisez un réseau de distribution de contenu (CDN)
5. Maintenez vos systèmes à jour avec les derniers correctifs`,
    tags: ["attaque", "réseau", "protection"]
  },
  "phishing": {
    question: /(phishing|hameçonnage)/i,
    response: `Protection contre le phishing :
6. Formez vos employés à reconnaître les emails suspects
7. Utilisez des filtres anti-spam et anti-phishing
8. Mettez en place une authentification multi-facteur
9. Vérifiez toujours les URLs avant de cliquer
10. Signalez les tentatives de phishing aux autorités compétentes`,
    tags: ["social", "email", "protection"]
  },
  "ransomware": {
    question: /(ransomware|rançongiciel)/i,
    response: `Pour éviter les ransomwares :
11. Maintenez des sauvegardes régulières et hors ligne
12. Mettez à jour tous vos logiciels et systèmes d'exploitation
13. Ne cliquez pas sur des liens ou pièces jointes suspectes
14. Utilisez un antivirus de nouvelle génération
15. Activez la protection contre les macros dans les documents Office`,
    tags: ["malware", "protection", "sauvegarde"]
  }
};

// Cache simple pour améliorer les performances
const responseCache = new Map();
const CACHE_TTL = 300000; // 5 minutes en ms

// Fonction pour obtenir une réponse locale
function getLocalResponse(message) {
  const cached = responseCache.get(message);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.response;
  }

  for (const key in LOCAL_KNOWLEDGE) {
    if (LOCAL_KNOWLEDGE[key].question.test(message)) {
      const response = {
        content: LOCAL_KNOWLEDGE[key].response,
        source: 'local',
        tags: LOCAL_KNOWLEDGE[key].tags
      };
      responseCache.set(message, {
        response: response,
        timestamp: Date.now()
      });
      return response;
    }
  }

  return {
    content: "Je n'ai pas d'information précise sur ce sujet. Pour une réponse plus complète, reformulez votre question.",
    source: 'fallback',
    tags: ['général']
  };
}

// Middleware de validation
const validateChatRequest = (req, res, next) => {
  if (!req.body.message || typeof req.body.message !== 'string' || req.body.message.trim().length === 0) {
    return res.status(400).json({
      error: 'Requête invalide',
      details: 'Le message doit être une chaîne de caractères non vide'
    });
  }
  next();
};

// Fonction pour interagir avec Ollama
async function queryOllama(messages) {
  try {
    const response = await axios.post(`${OLLAMA_CONFIG.baseURL}/api/chat`, {
      model: OLLAMA_CONFIG.model,
      messages: messages,
      options: {
        temperature: 0.7,
        num_ctx: 4096
      }
    }, {
      timeout: OLLAMA_CONFIG.timeout
    });
    
    return response.data.message.content;
  } catch (error) {
    console.error('Erreur Ollama:', error);
    throw new Error('Erreur lors de la communication avec le modèle Ollama');
  }
}

// Route principale pour le chat
router.post('/chat', validateChatRequest, async (req, res) => {
  try {
    const { message, chatHistory = [] } = req.body;
    const trimmedMessage = message.trim();

    // 1. Essayer d'abord une réponse locale
    const localResponse = getLocalResponse(trimmedMessage);
    if (localResponse.source !== 'fallback') {
      return res.json({
        response: localResponse.content,
        chatHistory: [
          ...chatHistory,
          { role: 'user', content: trimmedMessage },
          { role: 'assistant', content: localResponse.content }
        ],
        metadata: {
          source: localResponse.source,
          tags: localResponse.tags,
          cached: false
        }
      });
    }

    // 2. Utiliser Ollama si aucune réponse locale n'est trouvée
    const messages = [
      { role: "system", content: SYSTEM_PROMPT },
      ...chatHistory.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      { role: "user", content: trimmedMessage }
    ];

    const aiResponse = await queryOllama(messages);

    // Mettre en cache la réponse
    responseCache.set(trimmedMessage, {
      response: {
        content: aiResponse,
        source: 'ollama',
        tags: ['ai-generated']
      },
      timestamp: Date.now()
    });

    res.json({
      response: aiResponse,
      chatHistory: [
        ...chatHistory,
        { role: 'user', content: trimmedMessage },
        { role: 'assistant', content: aiResponse }
      ],
      metadata: {
        source: 'ollama',
        tags: ['ai-generated'],
        cached: false
      }
    });

  } catch (error) {
    console.error('Erreur:', error);
    const fallbackResponse = getLocalResponse(req.body.message.trim());

    res.status(500).json({
      response: fallbackResponse.content,
      chatHistory: [
        ...(req.body.chatHistory || []),
        { role: 'user', content: req.body.message.trim() },
        { role: 'assistant', content: fallbackResponse.content }
      ],
      metadata: {
        source: fallbackResponse.source,
        tags: fallbackResponse.tags,
        cached: false,
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      }
    });
  }
});

// Route pour vérifier l'état du service
router.get('/status', async (req, res) => {
  try {
    await axios.get(`${OLLAMA_CONFIG.baseURL}/api/tags`, {
      timeout: 5000
    });
    
    res.json({
      status: 'OK',
      service: 'Security Assistant API',
      version: '1.0.0',
      features: {
        ollama: 'enabled',
        model: OLLAMA_CONFIG.model,
        cache: {
          enabled: true,
          size: responseCache.size
        },
        localKnowledge: Object.keys(LOCAL_KNOWLEDGE).length
      },
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.json({
      status: 'DEGRADED',
      service: 'Security Assistant API',
      version: '1.0.0',
      features: {
        ollama: 'unavailable',
        fallbackMode: true,
        cache: {
          enabled: true,
          size: responseCache.size
        },
        localKnowledge: Object.keys(LOCAL_KNOWLEDGE).length
      },
      environment: process.env.NODE_ENV || 'development'
    });
  }
});

module.exports = router;