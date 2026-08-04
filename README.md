# 🏆 PUBG Tournaments Hosting Platform

A full-stack, automated web platform designed for hosting and managing PUBG Mobile tournaments. This system automates player registration, validates PUBG player accounts using character UIDs via Midasbuy integration, and provides clean dashboards for both players and administrators.

---

## 💡 What this Platform Does (Simple Overview)

This platform acts as an **automated check-in desk and manager** for PUBG Mobile tournaments:
- **Automatic Player Verification:** When a player enters their PUBG Character UID, the platform automatically looks up their profile via Midasbuy to grab their exact in-game character name. This prevents fake registrations or typos.
- **Auto Slot limits:** Once a tournament is full, registrations close automatically.
- **Admin Control Panel:** Admins can create tournaments, manage slots, send room credentials (IDs/passwords) securely to checked-in players, and record final scores.

---

## 🚀 Tech Stack (What it's built with)
- **Frontend (Website):** Built with [Next.js 16](https://nextjs.org/) (React 19) and styled with [Tailwind CSS v4](https://tailwindcss.com/) for a modern, responsive layout.
- **Backend (Engine Room):** A [Node.js & Express](https://expressjs.com/) server.
- **Database:** [MongoDB](https://www.mongodb.com/) (configured via Mongoose) to securely store player profiles, tournaments, and match results.
- **Automation / Scraping:** [Puppeteer](https://pptr.dev/) to interact with the Midasbuy interface for character lookup.

---

## 🔑 Comprehensive Guide: Environment Variables

Environment variables are simple text configuration settings that tell the backend server and frontend website how to talk to each other and where to find the database. 

To configure these, you will create small configuration files named `.env` inside both the `backend` and `frontend` folders. You can create and edit these files using a simple text editor like **Notepad** (on Windows) or **TextEdit** (on Mac).

---

### 1. Backend Configurations (`/backend/.env`)

Create a file named `.env` in your `backend/` directory. Copy the following lines and adjust the values:

```env
# The port number on which your backend server runs
PORT=5000

# The environment mode (use 'development' for testing and 'production' for live deployment)
NODE_ENV=development

# The link to your MongoDB database (where all information is saved)
# - Use 'mongodb://127.0.0.1:27017/pubg-tournaments' if MongoDB is running locally on your computer.
# - If using a cloud database (like MongoDB Atlas), paste your connection string here.
MONGODB_URI=mongodb://127.0.0.1:27017/pubg-tournaments

# The URL address of your frontend website.
# This tells the server who is allowed to securely talk to it (CORS).
CLIENT_URL=http://localhost:3000
```

#### How to edit or create this:
1. Open the `/backend` folder.
2. If there is a file named `.env.example`, make a copy of it and rename the copy to `.env`.
3. Open `.env` in Notepad and modify the values (e.g., set `MONGODB_URI` to your MongoDB link).
4. Save the file.

---

### 2. Frontend Configurations (`/frontend/.env` or `/frontend/.env.local`)

Create a file named `.env` in your `frontend/` directory. Copy the following line and adjust it:

```env
# The connection URL pointing to your backend engine
# This must match your backend URL followed by /api
NEXT_PUBLIC_API_URL=http://localhost:5000/api
```

#### How to edit or create this:
1. Open the `/frontend` folder.
2. Copy `.env.example` and rename it to `.env`.
3. Open it with Notepad and ensure the address matches your backend server. If your backend is running on `http://localhost:5000`, this must be `http://localhost:5000/api`.
4. Save the file.

---

## 🛠️ Folder Structure

```
pubg-tournaments/
├── backend/                  # Backend engine & API service
│   ├── src/
│   │   ├── config/          # Environment configuration loaders
│   │   ├── models/          # Database structures (User, Tournament, Match, Registration)
│   │   ├── routes/          # API route paths
│   │   └── services/        # Business logic (player verification lookup, tournament scoring)
│   ├── .env                 # Backend environment settings (You must create this)
│   └── package.json
│
├── frontend/                 # Frontend website app
│   ├── src/
│   │   ├── app/             # Main web pages (admin panel, player dashboard, etc.)
│   │   ├── components/      # Shared visual UI elements
│   │   └── features/        # Feature components (auth screens, tournament modals)
│   ├── .env                 # Frontend environment settings (You must create this)
│   └── package.json
│
├── package.json              # Main project workspace file
└── README.md                 # This file
```

---

## 🚀 Getting Started (How to run the app)

Follow these simple steps to run the application on your computer:

### Step 1: Install Node.js
Download and install the **LTS** version of Node.js from [nodejs.org](https://nodejs.org/).

### Step 2: Open Terminal / Command Prompt
Open your terminal (Command Prompt on Windows, Terminal on macOS) and navigate to the project directory:
```bash
# Example:
cd path/to/pubg-tournaments
```

### Step 3: Install all packages
Run the following command at the project root to install the website's files:
```bash
npm install
```

### Step 4: Add your `.env` files
Create your `backend/.env` and `frontend/.env` files using the configuration steps above.

### Step 5: Start the project
Run the development command:
```bash
npm run dev
```
*This command starts both the frontend website and the backend database connector simultaneously.*

### Step 6: View the website
Open your web browser and go to:
👉 **[http://localhost:3000](http://localhost:3000)**


### THE DEVELOPERS ARE NOT RESPONSIBLE FOR ANY TYPE OF ISSUES CAUSED BY CHANGING THE SOURCE CODE
