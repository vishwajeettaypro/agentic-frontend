import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';

import DefaultLayout from './components/DefaultLayout';
import AgentShell from './components/AgentShell';
import ProtectedRoute from './components/ProtectedRoute';
import Dashboard from './pages/Dashboard';
import EmailPage from './pages/EmailPage';
import CalendarPage from './pages/CalendarPage';
import HistoryPage from './pages/HistoryPage';
import SettingsPage from './pages/SettingsPage';
import AgentsHubPage from './pages/agents/AgentsHubPage';
import AgentComingSoonPage from './pages/agents/AgentComingSoonPage';
import Login from './pages/Login';
import Signup from './pages/Signup';
import NotFound from './pages/NotFound';
import { EMAIL_AGENT_PATHS } from './config/agents';

import '@coreui/coreui/dist/css/coreui.min.css';
import './App.css';

function App() {
  return (
    <AppProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />

          <Route
            path="/"
            element={
              <ProtectedRoute>
                <DefaultLayout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/agents" replace />} />
            <Route path="agents" element={<AgentsHubPage />} />

            <Route path="agents/email" element={<AgentShell />}>
              <Route index element={<Dashboard />} />
              <Route path="inbox" element={<EmailPage />} />
              <Route path="calendar" element={<CalendarPage />} />
              <Route path="history" element={<HistoryPage />} />
            </Route>

            <Route path="agents/sales" element={<AgentComingSoonPage />} />
            <Route path="agents/procurement" element={<AgentComingSoonPage />} />
            <Route path="agents/production" element={<AgentComingSoonPage />} />

            <Route path="settings" element={<SettingsPage />} />

            {/* Legacy redirects */}
            <Route path="dashboard" element={<Navigate to={EMAIL_AGENT_PATHS.dashboard} replace />} />
            <Route path="email" element={<Navigate to={EMAIL_AGENT_PATHS.inbox} replace />} />
            <Route path="calendar" element={<Navigate to={EMAIL_AGENT_PATHS.calendar} replace />} />
            <Route path="history" element={<Navigate to={EMAIL_AGENT_PATHS.history} replace />} />

            <Route path="*" element={<NotFound />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </AppProvider>
  );
}

export default App;
