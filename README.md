# 🔐 Secure Communication Platform  
*Developed by Rajae Elmrabet (2025)*  

A comprehensive secure communication platform integrating **Blockchain**, **Artificial Intelligence**, and **advanced encryption** to secure real-time communication against modern cyber threats.

![Technologies](https://img.shields.io/badge/Technologies-Blockchain%20%7C%20AI%20%7C%20WebRTC%20%7C%20Cybersecurity-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Status](https://img.shields.io/badge/Status-Completed-success)
![Language](https://img.shields.io/badge/Language-JavaScript%20%7C%20Python-orange)

---

## 🧠 About the Project  

This project was developed as part of my Bachelor’s degree in **Mathematics and Computer Science** at *Université Mohammed V de Rabat*.  
It aims to create a **secure, intelligent, and decentralized real-time communication platform** that combines:  
- Blockchain authentication  
- Encrypted video calls and messaging  
- An AI-driven intrusion detection system (IDS)  
- A local AI assistant for cybersecurity support  

The goal is to ensure **confidentiality, integrity, and reliability** of digital communication in real time.  

---

## 🏗️ System Architecture  

![STELLAR Platform Architecture](imgs/plateforme.png)  
*Architecture Globale de la Plateforme STELLAR - Système de Communication Sécurisée*

---

## ⚙️ Key Features  

### 🧩 **Decentralized Authentication**
- Authentication via **MetaMask** and **Ethereum Blockchain**
- Elimination of central server vulnerabilities
- Cryptographic signature + JWT token generation

### 🔒 **Secure Communication**
- **Peer-to-peer video calls** using WebRTC (DTLS encryption)
- **Instant messaging** via Socket.IO + AES-256 encryption
- Secure transmission through **WSS (WebSocket Secure)**

### 🧠 **Intelligent Intrusion Detection**
- Machine Learning–based IDS (SVM, KNN, Random Forest, XGBoost)
- **UNSW-NB15** dataset for realistic attack simulation
- Real-time traffic monitoring and attack classification
- **XGBoost** chosen for its best performance (F1 = 94%)

### 🤖 **AI Security Assistant**
- Local LLM (Mistral 7B via Ollama)
- Cybersecurity awareness and contextual guidance
- Works fully **offline**, preserving user confidentiality  

---

## 🧱 Service Architecture  

### 🛠️ **Backend Microservices**
| Service | Description | Port |
|----------|--------------|------|
| 🔐 Authentication | Blockchain + MetaMask Login | 5000 |
| 💬 Chat Service | Real-time AES messaging | 4001 |
| 📞 Video Calls | WebRTC signaling & management | 8000 |
| 👤 Profile | User management (MySQL) | 3306 |
| 🛡️ IDS | ML-based intrusion detection | 6000 |

### 💻 **Frontend Architecture**
- Modular React component structure  
- Context API for global state management  
- WebSocket and API service layers  
- Tailwind CSS for responsive modern design  

---
##  Technical Stack

| Layer | Technologies |
|-------|---------------|
| **Frontend** | React.js, Tailwind CSS, WebRTC, Simple-Peer |
| **Backend** | Node.js, Express.js, Socket.IO, Ethers.js |
| **Database** | MySQL |
| **Machine Learning** | Python, Scikit-learn, XGBoost |
| **Authentication** | MetaMask, Ethereum Blockchain |
| **AI Assistant** | Ollama (Local LLM) |
---

## 🔧 Configuration Example  

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
```

---

##  Installation & Déploiement

###  Prérequis Système

- **Node.js** 16+ 
- **MySQL** 8.0+
- **Python** 3.8+
- **MetaMask** (extension navigateur)
- **Git**

###  Installation pas à pas

```bash
# 1. Cloner le repository
git clone https://github.com/username/secure-communication-platform.git
cd secure-communication-platform

# 2. Installer les dépendances Backend
cd backend
npm install

# 3. Installer les dépendances Frontend
cd ../frontend
npm install

# 4. Installer les dépendances Machine Learning
cd ../machine-learning
pip install -r requirements.txt
```


###  License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for details.


## 📞 Support & Contact

----------------------------------------------
[Documentation](docs/) | [Issues](issues/) | [Discussions](discussions/) | [Email](mailto:your@email.com)
-----------------------------------------------
