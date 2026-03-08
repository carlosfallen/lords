// ============================================================
// App — Root Component with Routing (Representative CRM)
// ============================================================
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/auth/Login';
import RepresentativeDashboard from './pages/team/Team';
import ClientDetail from './pages/clients/ClientDetail';
import CreateLead from './pages/leads/CreateLead';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
    const { isAuthenticated, user } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

    // No CRM do Representante, só permite role representante
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        return <Navigate to="/login" replace />; // Ou página de erro 403
    }

    return <>{children}</>;
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            {/* Rotas do Representante */}
            <Route
                path="/*"
                element={
                    <ProtectedRoute allowedRoles={['representante', 'admin', 'super_admin']}>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<RepresentativeDashboard />} />
                <Route path="leads/create" element={<CreateLead />} />
                <Route path="leads/:id" element={<ClientDetail />} />
                <Route path="*" element={<Navigate to="/" replace />} />
            </Route>
        </Routes>
    );
}
