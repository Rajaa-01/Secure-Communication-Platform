import { API_CONFIG } from '../config/apiConfig';

export const fetchChatMessages = async () => {
  const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.CHAT}/api/messages`);
  return response.json();
};