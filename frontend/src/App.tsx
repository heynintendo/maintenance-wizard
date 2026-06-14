import { Navigate, Route, Routes } from 'react-router-dom';

import { ProtectedRoute } from './auth/ProtectedRoute';
import { AppShell } from './components/shell/AppShell';
import AlertsPage from './pages/AlertsPage';
import AssistantPage from './pages/AssistantPage';
import DashboardPage from './pages/DashboardPage';
import EquipmentDetailPage from './pages/EquipmentDetailPage';
import EquipmentListPage from './pages/EquipmentListPage';
import LoginPage from './pages/LoginPage';
import LogbookPage from './pages/LogbookPage';
import NotFoundPage from './pages/NotFoundPage';
import PlantHealthPage from './pages/PlantHealthPage';
import ReportsPage from './pages/ReportsPage';
import TicketDetailPage from './pages/TicketDetailPage';
import TicketsListPage from './pages/TicketsListPage';

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/equipment" element={<EquipmentListPage />} />
        <Route path="/equipment/:id" element={<EquipmentDetailPage />} />
        <Route path="/assistant" element={<AssistantPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/plant-health" element={<PlantHealthPage />} />
        <Route path="/tickets" element={<TicketsListPage />} />
        <Route path="/tickets/:id" element={<TicketDetailPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/logbook" element={<LogbookPage />} />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
  );
}
