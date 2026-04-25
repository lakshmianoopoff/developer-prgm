# ResQ - Tactical Emergency Response System

ResQ is a modern, high-performance, and professional-grade incident response platform designed to facilitate seamless coordination between reporters, responders, and administrators during emergencies.

![ResQ Banner](https://placehold.co/1200x400/0f172a/38bdf8?text=ResQ+Tactical+Command)

## 🚀 Features

### 🛡️ Role-Based Access Control (RBAC)
- **Reporters**: Easy-to-use interface for submitting and tracking real-time incidents.
- **Responders**: Multilingual incident interface with Gemini AI-powered translation and Text-to-Speech support, allowing responders to hear incident details in their preferred language.
- **Administrators**: Comprehensive "Tactical Command" dashboard with analytics, live tracking, and an AI-powered chat assistant.

### 🗺️ Tactical Command HUD
- High-fidelity, futuristic UI utilizing **Framer Motion** for smooth transitions and immersive map entry animations.
- Responsive **Bento-Grid** layout with high-contrast, "data-chip" incident cards, scanline overlays, and a real-time neon ticker.
- Advanced map integration via **Leaflet** with glowing incident markers.

### 🌐 Multilingual & Accessibility Support
- Real-time translation of incident reports into 6 languages (English, Malayalam, Hindi, Tamil, Kannada, Arabic) powered by the **Google Gemini API**.
- Built-in speech synthesis (Text-to-Speech) to read incident details aloud.
- Critical audio-based alerts for incoming high-priority incidents.

### 🧠 AI-Powered Insights
- Automated incident closure and AI-generated summary reports.
- Smart drafts for incident alerts.
- Conversational AI assistant for administrators to query system data and respond effectively.

### ⚙️ Robust Backend & Analytics
- **Node.js + Express** backend handling geofencing, notifications, and secure operations.
- Admin dashboard analytics featuring Threat Vectors, Incident Tracking (Last 24H), and an Active Personnel Roster.
- Real-time data synchronization with **Firebase**.

## 🛠️ Tech Stack

**Frontend:**
- React 19 (Vite)
- Tailwind CSS v4
- Framer Motion
- React Leaflet / Leaflet
- Google Generative AI (Gemini)
- Lucide React (Icons)
- React Google Charts

**Backend:**
- Node.js
- Express
- Firebase Admin SDK
- Nodemailer

## 📦 Project Structure

The repository is divided into two main components:

- `/resq`: The frontend React application.
- `/resq-backend`: The Express Node.js backend.

## 🚦 Getting Started

### Prerequisites
- Node.js (v18 or higher recommended)
- Firebase Project setup
- Google Gemini API Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd developer-prgm
   ```

2. **Setup the Backend:**
   ```bash
   cd resq-backend
   npm install
   ```
   Create a `.env` file in the `resq-backend` directory and add your Firebase credentials and other required variables.

3. **Setup the Frontend:**
   ```bash
   cd ../resq
   npm install
   ```
   Create a `.env` file in the `resq/src/services` (or root of `resq`) directory and add your Firebase config and Gemini API key.

### Running the Application

1. **Start the Backend Server:**
   ```bash
   cd resq-backend
   node index.js
   ```

2. **Start the Frontend Development Server:**
   ```bash
   cd resq
   npm run dev
   ```

3. Open your browser and navigate to `http://localhost:5173`.

## 🤝 Contributing
Contributions are welcome. Please open an issue or submit a pull request for any feature enhancements or bug fixes.
