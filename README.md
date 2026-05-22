# AtomQuest

A full-stack goal management application with role-based access control for teams. Built with modern web technologies, AtomQuest enables employees, managers, and admins to collaborate on setting, tracking, and achieving organizational goals.

**Built for Atomberg Technologies Hackathon** 🚀

## ✨ Features

- **Role-Based Access Control** - Different interfaces and permissions for Admins, Managers, and Employees
- **Goal Management** - Create, track, and manage team and individual goals
- **Team Collaboration** - Managers can view and manage their team's goals
- **Secure Authentication** - JWT-based authentication with bcrypt password hashing
- **Responsive Design** - Modern UI built with React and Tailwind CSS

## 🛠️ Tech Stack

### Backend
- **Node.js** - JavaScript runtime
- **Express.js** - Web framework
- **PostgreSQL** - Database
- **JWT** - Authentication
- **bcryptjs** - Password hashing

### Frontend
- **React** - UI library
- **Vite** - Build tool and dev server
- **React Router** - Client-side routing
- **Tailwind CSS** - Styling
- **ESLint** - Code quality

## 🚀 Getting Started

### Prerequisites
- Node.js (v14 or higher)
- PostgreSQL (v12 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd atomquest
   ```

2. **Backend Setup**
   ```bash
   cd backend
   npm install
   
   # Create .env file with database credentials
   # DATABASE_URL=postgres://user:password@localhost:5432/atomquest
   
   # Run migrations and seed database
   npm run seed
   ```

3. **Frontend Setup**
   ```bash
   cd ../frontend
   npm install
   ```

### Running Locally

**Terminal 1 - Backend Server:**
```bash
cd backend
npm run dev
# Runs on http://localhost:5000 (or configured port)
```

**Terminal 2 - Frontend Development:**
```bash
cd frontend
npm run dev
# Runs on http://localhost:5173
```

## 📦 Building for Production

**Backend:**
```bash
npm start
```

**Frontend:**
```bash
npm run build
npm start
```

## 🔐 Authentication

The application uses JWT (JSON Web Tokens) for authentication with role-based access control:
- **Admin** - Full system access
- **Manager** - Team management and viewing
- **Employee** - Personal goal management

## 📝 Environment Variables

### Backend (.env)
```
DATABASE_URL=postgresql://user:password@localhost:5432/atomquest
JWT_SECRET=your_jwt_secret_key
PORT=5000
```

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.
