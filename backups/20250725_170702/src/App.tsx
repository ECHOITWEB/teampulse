import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from './components/Header';
import Footer from './components/Footer';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import TeamChat from './pages/TeamChat';
import GoalsDashboard from './pages/GoalsDashboard';
import TaskManagement from './pages/TaskManagement';
import AITools from './pages/AITools';
import Meetings from './pages/Meetings';

function App() {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-gray-50">
        <Header />
        <main className="flex-1 bg-white">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/team-chat" element={<TeamChat />} />
            <Route path="/goals" element={<GoalsDashboard />} />
            <Route path="/tasks" element={<TaskManagement />} />
            <Route path="/ai-tools" element={<AITools />} />
            <Route path="/meetings" element={<Meetings />} />
          </Routes>
        </main>
        <Footer />
      </div>
    </Router>
  );
}

export default App;
