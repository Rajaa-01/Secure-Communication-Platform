export const API_CONFIG = {
  // En développement
  BASE_URL: process.env.NODE_ENV === 'development' 
    ? 'http://localhost:5002'
    : 'https://votre-domaine.com',
    
  ENDPOINTS: {
    CHAT: '/chat',
    MEET: '/meet',
    BLOCKCHAIN: '/blockchain',
    PROFILE: '/profile'
  }
};