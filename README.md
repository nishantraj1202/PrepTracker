# 🚀 PrepTracker

**PrepTracker** is a modern, full-stack platform designed to help students and professionals prepare for **technical interviews and Online Assessments (OAs)**.  
It combines curated coding problems, company-specific question sets, AI assistance, and a secure code execution engine — all in one place.

🌐 **Live App**: [https://prep-tracker-12.vercel.app/  ](https://prep-tracerr.vercel.app/)

📦 **Repository**: https://github.com/nishantraj1202/PrepTracker

---

## ✨ Key Features

- **📚 Curated Problem Set**  
  Practice coding questions categorized by topic, difficulty, and patterns.

- **🏢 Company-Specific Preparation**  
  Focus on questions frequently asked by companies like Google, Amazon, etc.

- **🧠 AI-Assisted Question Processing**  
  Uses Groq Vision + LLMs to extract structured problems from uploaded images.

- **🖼️ Intelligent Diagram Handling**  
  Preserves essential diagrams (graphs, trees) while removing redundant screenshots.

- **💻 Integrated Code Editor**  
  Monaco Editor–powered editor for a premium coding experience.

- **⚙️ Secure Code Execution Engine**  
  Docker-based backend judge to safely compile and run user code with time and memory limits.

- **🛠️ Admin Dashboard**  
  Upload questions, manage images, review AI output, and control content quality.

- **🎨 Modern, Clean UI**  
  Built with the latest Next.js App Router, TailwindCSS v4, and smooth Framer Motion animations.

---

## 🧑‍💻 Tech Stack

### Frontend (`oa_hub_web`)
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: TailwindCSS v4
- **Animations**: Framer Motion
- **Code Editor**: Monaco Editor (React)
- **Icons**: Lucide React
- **Markdown Rendering**: React Markdown + Remark GFM

### Backend (`oa_hub_backend`)
- **Runtime**: Node.js
- **Framework**: Express.js
- **Database**: MongoDB (Mongoose)
- **Image Storage**: Cloudinary
- **AI Integration**: Groq SDK
- **Environment Management**: Dotenv
- **Code Execution**: Docker (sandboxed containers)

---

## 🗂️ Project Structure

```bash
PrepTracker/
├── oa_hub_web/        # Next.js frontend application
├── oa_hub_backend/    # Node.js / Express backend API
└── README.md          # Project documentation
```

---

## ⚡ Getting Started

### Prerequisites

Make sure you have the following installed:

* Node.js **v18+**
* npm or yarn
* MongoDB (local or MongoDB Atlas)
* Docker (for code execution)
* Groq API Key
* Cloudinary account & credentials

---

### 🔧 Installation & Setup

#### 1️⃣ Clone the Repository

```bash
git clone https://github.com/nishantraj1202/PrepTracker.git
cd PrepTracker
```

---

#### 2️⃣ Backend Setup

```bash
cd oa_hub_backend
npm install
```

Create a `.env` file using `.env.example` and add:

* MongoDB URI
* Groq API Key
* Cloudinary credentials

Run the backend:

```bash
node server.js
```

Backend runs on:
👉 [http://localhost:5000](http://localhost:5000) (default)

---

#### 3️⃣ Frontend Setup

```bash
cd ../oa_hub_web
npm install
```

Create `.env.local` and add required environment variables.

Run the frontend:

```bash
npm run dev
```

Frontend runs on:
👉 [http://localhost:3000](http://localhost:3000)

---

## 🤝 Contributing

Contributions are welcome and appreciated!

1. Fork the repository
2. Create a feature branch

   ```bash
   git checkout -b feature/your-feature
   ```
3. Commit your changes

   ```bash
   git commit -m "Add your feature"
   ```
4. Push to your branch

   ```bash
   git push origin feature/your-feature
   ```
5. Open a Pull Request 🚀

---

## 📄 License

This project is open-source and licensed under the **MIT License**.
See the [LICENSE](LICENSE) file for details.

---

## ⭐ Acknowledgements

* Monaco Editor
* Groq SDK
* Next.js
* Docker
* Open-source community ❤️

---

> **PrepTracker** is built with the vision of making interview preparation more structured, intelligent, and developer-friendly.

