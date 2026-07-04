# 🛡️ HerShield — AI-Powered Women's Safety Platform

HerShield is an AI-powered women's safety platform that combines **Machine Learning**, **Real-Time Navigation**, **Anomaly Detection**, **Voice Recognition**, and **Emergency Response Automation** to provide intelligent safety assistance during travel.

Built using **Next.js**, **Node.js**, **Flask**, **PostgreSQL**, **Prisma**, **OpenStreetMap**, and **Machine Learning**.

---

## 📌 Features

### 🚶 Safe Journey Navigation
- AI-based safest route recommendation
- Real-time route monitoring
- Live GPS tracking
- Weather-aware route prediction
- Distance & ETA calculation
- Interactive OpenStreetMap integration

### 🧠 AI Route Prediction
Instead of recommending the shortest path, HerShield recommends the **safest** route using machine learning.

Prediction considers:
- Crime score
- Lighting conditions
- Traffic density
- Hospital proximity
- Police station proximity
- Time of day
- Weather

### 🚨 Intelligent Emergency Detection
HerShield continuously monitors the user's journey. Emergencies can be triggered through:
- AI anomaly detection
- Scream detection
- Manual SOS button
- Failure to respond after an emergency prompt

### 🎤 AI Scream Detection
During navigation, microphone monitoring runs in the background.

Features:
- Continuous audio monitoring
- ML-based scream classification
- Confidence-based prediction
- Consecutive detection filtering
- Automatic emergency trigger

### 📍 Live Location Sharing
When an emergency occurs, the system automatically shares:
- Live GPS location
- Vehicle number
- Emergency reason
- Google Maps location link

### 📧 Email-Based SOS System
Instead of paid SMS services like Twilio, HerShield uses **Gmail SMTP** to instantly notify emergency contacts.

Emergency email contains:
- User's current location
- Vehicle number
- Emergency type
- Google Maps link
- Timestamp

### 👨‍👩‍👧 Emergency Contacts
Users can securely save three emergency contacts during account setup. Each contact stores:
- Name
- Relationship
- Phone number
- Email address

### 🔐 Secure Authentication
- User registration
- Email OTP verification
- Secure login
- JWT authentication
- Password encryption using bcrypt
- Protected APIs

### 🗺️ Real-Time Navigation
- Turn-by-turn navigation
- Live map updates
- Route visualization
- Journey status monitoring

### 🎙️ Voice Verification
After an emergency is detected:
1. Alarm starts
2. User gets **30 seconds** to respond
3. User can say **"I am safe"**

- ✅ If verified → SOS is cancelled
- ❌ If no response → Emergency notification is automatically sent

---

## 🏗️ System Architecture

```
User
  │
  ├── Signup
  ├── OTP Verification
  ├── Login
  │
  ▼
Journey Planner
  │
  ▼
AI Safe Route Prediction
  │
  ▼
Navigation Starts
  │
  ├── GPS Monitoring
  ├── Audio Monitoring
  ├── Anomaly Detection
  │
  ▼
Emergency Detected
  │
  ├── Alarm
  ├── Voice Verification
  │      │
  │      ├── "I am safe" ──▶ Cancel SOS
  │      │
  │      └── No Response (30 sec)
  │
  ▼
Send SOS Email
  │
  ├── Live Location
  ├── Vehicle Number
  ├── Emergency Type
  └── Google Maps Link
```

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Frontend** | Next.js, React, TypeScript, Tailwind CSS, Leaflet, OpenStreetMap |
| **Backend** | Node.js, Express.js, Prisma ORM, PostgreSQL, JWT Authentication, Nodemailer |
| **Machine Learning** | Python, Flask, Scikit-Learn, Random Forest, Isolation Forest, NumPy, Joblib |
| **APIs Used** | OpenStreetMap, Overpass API, Nominatim API, Gmail SMTP, Browser Speech Recognition API, Geolocation API |

---

## 📂 Project Structure

```
HerShield-Project
│
├── hershield-client
│   ├── app
│   ├── components
│   ├── lib
│   └── public
│
├── hershield-server
│   ├── controllers
│   ├── routes
│   ├── middleware
│   ├── prisma
│   └── uploads
│
├── hershield-ml
│   ├── api
│   ├── models
│   ├── training
│   └── utils
│
└── README.md
```

---

## ⚙️ Installation

### Clone Repository
```bash
git clone https://github.com/aan2136/hershield-project.git
```

### Frontend
```bash
cd hershield-client
npm install
npm run dev
```
Runs on: `http://localhost:3000`

### Backend
```bash
cd hershield-server
npm install
npm run dev
```
Runs on: `http://localhost:5000`

### ML Service
```bash
cd hershield-ml
pip install -r requirements.txt
python app.py
```
Runs on: `http://localhost:8000`

---

## 🔑 Environment Variables

### Backend (`.env`)
```env
DATABASE_URL=your_postgresql_connection

JWT_SECRET=your_secret_key

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587

SMTP_USER=your_email@gmail.com
SMTP_PASS=your_app_password
SMTP_FROM=your_email@gmail.com
```

---

## 🔄 User Workflow

```
Register
   ↓
Verify OTP
   ↓
Login
   ↓
Save Emergency Contacts
   ↓
Generate Safe Route
   ↓
Start Journey
   ↓
AI Monitoring Starts
   ↓
Emergency Detected
   ↓
30-second Voice Verification
   ↓
SOS Email Sent
```

---

## 🚀 Future Enhancements

- [ ] Mobile application (Flutter / React Native)
- [ ] Hugging Face–based scream detection
- [ ] Offline emergency mode
- [ ] SMS & WhatsApp SOS integration
- [ ] Wearable device integration
- [ ] AI-based risk heatmaps
- [ ] Emergency audio recording
- [ ] Real-time police assistance
- [ ] Cloud deployment with Docker & Kubernetes

---

## 👤 Contributors

**Aan Rajput**
B.Tech Information Technology
Banasthali Vidyapith

---

## 📄 License

This project is developed for educational and research purposes.
