#  Secure Communication Platform

A comprehensive secure communication solution integrating Blockchain, Artificial Intelligence, and state-of-the-art encryption to protect real-time exchanges against modern cyber threats.

![Technologies](https://img.shields.io/badge/Technologies-Blockchain%20%7C%20AI%20%7C%20WebRTC%20%7C%20Cybersecurity-blue)

##  Key Features

###  **Decentralized Authentication**
- **Blockchain Authentication** via MetaMask and Ethereum
- Elimination of single points of failure
- Cryptographic signature and JWT generation

###  **Secure Communication**
- **Peer-to-peer video calls** with WebRTC and native encryption
- **Instant messaging** with Socket.IO and AES-256 encryption
- Secure transmission via WSS (WebSocket Secure)

###  **Intelligent Intrusion Detection**
- **ML-based IDS System**
- Tested algorithms: XGBoost, Random Forest, SVM, KNN
- UNSW-NB15 dataset for adaptive detection
- Real-time network traffic monitoring

###  **Intelligent Virtual Assistant**
- Local AI assistant based on Mistral 7B via Ollama
- Contextual cybersecurity guidance
- Offline operation preserving confidentiality

 
 
## 🎯 Service Architecture

### **Backend Microservices**
- **🔐 Authentication Service** (Port 5000) - Blockchain-based auth
- **📞 Video Call Service** (Port 8000) - WebRTC signaling & management
- **💬 Chat Service** (Port 4001) - Real-time messaging with AES encryption
- **👤 Profile Service** - User management & data storage
- **🛡️ IDS Service** - Machine Learning threat detection

### **Frontend Architecture**
- **Modular Component Structure** - Organized by feature
- **Context Management** - State management for real-time data
- **Service Layer** - API communication & WebSocket management
- **Responsive UI** - Tailwind CSS with modern design

## 🔧 Key Configuration Files

```json
// package.json (Backend)
{
  "scripts": {
    "dev": "concurrently \"npm run auth\" \"npm run chat\" \"npm run meet\"",
    "auth": "cd blockchain && node server.js",
    "chat": "cd chat && node index.js",
    "meet": "cd meet && node srv.js"
  }
}






##  Technical Architecture

### **Frontend**
- **React.js** with Tailwind CSS
- **WebRTC API** & Simple-peer for video calls
- **Ethers.js** for Blockchain interaction
- **Socket.IO Client** for real-time communication

### **Backend**
- **Node.js** with Express.js
- **Socket.IO** for WebRTC signaling
- **JWT** for authentication
- **Python** for IDS module

### **Database & AI**
- **MySQL** for data storage
- **Scikit-learn, XGBoost** for Machine Learning
- **Ollama** for local AI assistant

##  IDS System Results

The **XGBoost** model demonstrated the best performance:
- **Accuracy**: 95.4%
- **Precision**: 94.8%
- **Recall**: 93.2%
- **F1-Score**: 94.0%





##  Installation & Deployment

```bash
# Clone the repository
git clone https://github.com/username/secure-communication-platform.git

# Install dependencies
cd secure-communication-platform
npm install

# Launch services
npm run dev





