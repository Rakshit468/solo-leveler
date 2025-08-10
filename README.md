# Solo Leveling Self-Improvement App

A gamified self-improvement web application inspired by RPG progression systems. Users level up by completing real-life tasks and goals, earning XP, improving stats, and unlocking achievements.

## Features

- 🎮 **Gamified Progress**: RPG-style leveling system with XP and stats
- 📋 **Quest System**: Daily/Weekly quests and Boss Battles for long-term goals
- 🌳 **Skill Trees**: Unlock abilities in Health, Knowledge, Productivity, and Creativity
- 🏆 **Leaderboards**: Real-time ranking with other users
- 📊 **Analytics**: Visual progress tracking with charts and graphs
- 👤 **Character System**: Customizable avatars and character progression
- 🔒 **Secure Auth**: JWT-based authentication with password hashing

## Tech Stack

- **Frontend**: React + Vite + Tailwind CSS
- **Backend**: Node.js + Express
- **Database**: MongoDB with Mongoose
- **Real-time**: Socket.io
- **Authentication**: JWT + bcrypt

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- Git

### Installation

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd solo-leveling-app
   ```

2. **Install dependencies**

   ```bash
   # Install root dependencies
   npm install

   # Install backend dependencies
   cd backend && npm install

   # Install frontend dependencies
   cd ../frontend && npm install
   ```

3. **Environment Setup**

   Create `backend/.env` file:

   ```env
   NODE_ENV=development
   PORT=5000
   MONGODB_URI=mongodb://localhost:27017/solo-leveling
   JWT_SECRET=your-super-secret-jwt-key-here
   CORS_ORIGIN=http://localhost:5173
   ```

4. **Start MongoDB**

   ```bash
   # If using local MongoDB
   // Mount API routes
   app.use("/api/auth", authRoutes);
   app.use("/api/quests", questRoutes);
   ```

5. **Seed the database (optional)**

   ```bash
   npm run seed
   ```

6. **Run the application**

   ```bash
   # Run both frontend and backend concurrently
   npm run dev

   # Or run separately:
   # Terminal 1: Backend
   cd backend && npm run dev

   # Terminal 2: Frontend
   cd frontend && npm run dev
   ```

7. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:5000
   - Socket.io: ws://localhost:5000

## Project Structure

```
solo-leveling-app/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── middleware/
│   ├── models/
│   ├── routes/
│   ├── seeds/
│   ├── sockets/
│   ├── tests/
│   ├── utils/
│   └── server.js
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── services/
│   │   ├── utils/
│   │   └── App.jsx
│   └── package.json
└── README.md
```

## API Endpoints

### Authentication

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/profile` - Get user profile
- `PUT /api/auth/profile` - Update user profile

### Quests

- `GET /api/quests` - Get user quests
- `POST /api/quests` - Create new quest
- `PUT /api/quests/:id` - Update quest
- `POST /api/quests/:id/complete` - Complete quest
- `DELETE /api/quests/:id` - Delete quest

### XP & Stats

- `GET /api/stats` - Get user stats
- `POST /api/stats/xp` - Add XP
- `GET /api/stats/leaderboard` - Get leaderboard

### Skills

- `GET /api/skills` - Get skill trees
- `POST /api/skills/:id/unlock` - Unlock skill

## Game Mechanics

### XP & Leveling

- Complete quests to earn XP
- Level up formula: `XP Required = baseXP * (level^1.5)`
- Each level increases all stats

### Quest Types

- **Daily Quests**: Reset every 24 hours, earn 50-100 XP
- **Weekly Quests**: Reset weekly, earn 200-500 XP
- **Boss Battles**: Long-term goals, earn 1000+ XP

### Skill Trees

- **Health**: Physical fitness and wellness
- **Knowledge**: Learning and education
- **Productivity**: Work and life efficiency
- **Creativity**: Art, music, and creative pursuits

### Stats System

- **Strength**: Physical activities and exercise
- **Intelligence**: Learning and problem-solving
- **Agility**: Speed and efficiency tasks
- **Luck**: Bonus XP multiplier
- **Stamina**: Daily quest capacity

## Testing

```bash
# Run backend tests
cd backend && npm test
```

## Deployment

### Frontend (Netlify/Vercel)

```bash
cd frontend
npm run build
# Deploy dist/ folder
```

### Backend (Heroku/Railway)

```bash
# Set environment variables
# Deploy backend/ folder
```

## Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open Pull Request

## License

MIT License - see LICENSE file for details
