# 🍏 Macro Tracker

An AI-powered, mobile-first web application that makes tracking your daily macronutrients effortless. Just snap a photo of your food, and Gemini Vision AI will estimate the calories, protein, carbs, and fats. 

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=for-the-badge&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![Supabase](https://img.shields.io/badge/Supabase-3ECF8E?style=for-the-badge&logo=supabase&logoColor=white)
![Prisma](https://img.shields.io/badge/Prisma-3982CE?style=for-the-badge&logo=Prisma&logoColor=white)

---

## ✨ Features

- **📸 AI Food Analysis**: Uses the Google Gemini Pro Vision API to estimate the macros (calories, protein, carbs, fats) from a single photo of your meal.
- **✏️ Editable Estimates**: The AI provides a baseline, but you have full control to edit and tweak the macros before saving.
- **⚡ Quick Log Templates**: Save your frequent meals (like your morning protein shake) as templates and log them instantly without needing to retake a photo or run the AI analysis.
- **🧮 Smart Macro Calculator**: Uses the scientifically-backed Mifflin-St Jeor equation and evidence-based protein recommendations to automatically calculate your ideal daily targets based on your body stats and goals.
- **🔐 Secure Authentication**: Seamless Google OAuth integration via Supabase.
- **📱 Mobile-First Design**: A premium, responsive UI featuring glassmorphism, dynamic animations, and mobile-optimized image compression.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 15](https://nextjs.org/) (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS (Custom premium dark theme)
- **Database**: PostgreSQL (hosted on [Supabase](https://supabase.com/))
- **ORM**: [Prisma](https://www.prisma.io/)
- **AI Model**: Google Gemini (`gemini-1.5-pro`)

---

## 🚀 Getting Started

### Prerequisites

You will need the following tools and accounts:
- Node.js (v18 or higher)
- A [Supabase](https://supabase.com/) account for the database and authentication
- A Google API Key from [Google AI Studio](https://aistudio.google.com/) for Gemini Vision

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/VSDeadShot/macro-tracker.git
   cd macro-tracker
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env` file in the root of the project and add your credentials:
   ```env
   # Supabase Database URL (Session/Connection pooling recommended)
   DATABASE_URL="postgres://[user]:[password]@[host]:5432/[db-name]"
   
   # Supabase Direct URL
   DIRECT_URL="postgres://[user]:[password]@[host]:5432/[db-name]"
   
   # Supabase Auth
   NEXT_PUBLIC_SUPABASE_URL="https://your-project.supabase.co"
   NEXT_PUBLIC_SUPABASE_ANON_KEY="your-anon-key"
   
   # Google Gemini API
   GEMINI_API_KEY="your-gemini-api-key"
   ```

4. **Sync the Database:**
   Push the Prisma schema to your Supabase PostgreSQL database:
   ```bash
   npx prisma db push
   npx prisma generate
   ```

5. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) to view the app in your browser.

---

## 📱 Mobile Image Compression

To prevent mobile browsers from crashing due to high-resolution camera captures (which often exceed 5-10MB), this app utilizes a custom HTML5 Canvas compression function. Before sending the image to the Gemini API, the app automatically resizes it to a maximum of 1024px and compresses it to a 70% quality JPEG, reducing the payload size to ~100-200KB while preserving enough detail for the AI to analyze.

---

## 🤝 Contributing

Contributions, issues, and feature requests are welcome! Feel free to check the [issues page](https://github.com/VSDeadShot/macro-tracker/issues).

## 📝 License

This project is open-source and available under the [MIT License](LICENSE).
