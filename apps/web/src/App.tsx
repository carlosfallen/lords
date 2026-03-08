// ============================================================
// App — Root Component with Routing
// ============================================================
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { useAuthStore } from './stores/authStore';
import DashboardLayout from './layouts/DashboardLayout';
import Login from './pages/auth/Login';
import Dashboard from './pages/Dashboard';
import ClientGrid from './pages/clients/ClientGrid';
import ClientDetail from './pages/clients/ClientDetail';
import Pipeline from './pages/pipeline/Pipeline';
import Tickets from './pages/tickets/Tickets';
import Team from './pages/team/Team';
import Mentorship from './pages/mentorship/Mentorship';
import Campaigns from './pages/campaigns/Campaigns';
import Systems from './pages/systems/Systems';
import Ideas from './pages/ideas/Ideas';
import Wiki from './pages/wiki/Wiki';
import Reports from './pages/reports/Reports';
import Onboarding from './pages/onboarding/Onboarding';
import Documents from './pages/documents/Documents';
import Settings from './pages/settings/Settings';
import Users from './pages/users/Users';
import BotProspectDashboard from './pages/BotProspect/Dashboard';
import CityPresentations from './pages/clients/CityPresentations';

// ProjectFlow (Monday) — individual page exports
import {
    PFDashboard, PFProjects, PFKanban, PFTaskList,
    PFTimeline, PFTracker, PFWiki, PFMilestones,
    PFAutomations, PFReports, PFSettings
} from './pages/monday/ProjectFlow';

// Finance Module — individual page exports
import {
    FinDashboard, FinCaixa, FinRecebiveis,
    FinPipeline, FinMissoes
} from './pages/finance/FinanceModule';

import ClientPortalLayout from './layouts/ClientPortalLayout';
import PortalHome from './pages/portal/PortalHome';
import PortalOnboarding from './pages/portal/PortalOnboarding';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
    const { isAuthenticated, user } = useAuthStore();
    const location = useLocation();

    if (!isAuthenticated) return <Navigate to="/login" state={{ from: location }} replace />;

    // If allowedRoles is provided and user role is not in it, redirect
    if (allowedRoles && user && !allowedRoles.includes(user.role)) {
        if (user.role === 'client_owner' || user.role === 'client_staff') {
            return <Navigate to="/portal" replace />;
        }
        useAuthStore.getState().logout();
        return <Navigate to="/login" replace />;
    }

    // Default redirect for clients trying to access root `/` dashboard directly
    if (!allowedRoles && user && (user.role === 'client_owner' || user.role === 'client_staff')) {
        return <Navigate to="/portal" replace />;
    }

    return <>{children}</>;
}

export default function App() {
    return (
        <Routes>
            <Route path="/login" element={<Login />} />

            {/* Rota do Portal Restrito do Cliente */}
            <Route
                path="/portal"
                element={
                    <ProtectedRoute allowedRoles={['client_owner', 'client_staff']}>
                        <ClientPortalLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<PortalHome />} />
                <Route path="onboarding" element={<PortalOnboarding />} />
            </Route>

            {/* Rotas Administrativas Standard */}
            <Route
                path="/*"
                element={
                    <ProtectedRoute allowedRoles={['super_admin', 'admin', 'mentor', 'support', 'finance', 'gestor', 'atendimento', 'financeiro']}>
                        <DashboardLayout />
                    </ProtectedRoute>
                }
            >
                <Route index element={<Dashboard />} />
                <Route path="clients" element={<ClientGrid />} />
                <Route path="clients/:id" element={<ClientDetail />} />
                <Route path="pipeline" element={<Pipeline />} />

                {/* Financeiro — sub-rotas do Money module */}
                <Route path="finance" element={<FinDashboard />} />
                <Route path="finance/caixa" element={<FinCaixa />} />
                <Route path="finance/recebiveis" element={<FinRecebiveis />} />
                <Route path="finance/pipeline" element={<FinPipeline />} />
                <Route path="finance/missoes" element={<FinMissoes />} />

                <Route path="tickets" element={<Tickets />} />
                <Route path="users" element={<Users />} />
                <Route path="mentorship" element={<Mentorship />} />
                <Route path="campaigns" element={<Campaigns />} />
                <Route path="systems" element={<Systems />} />
                <Route path="ideas" element={<Ideas />} />
                <Route path="wiki" element={<Wiki />} />
                <Route path="reports" element={<Reports />} />
                <Route path="onboarding" element={<Onboarding />} />
                <Route path="documents" element={<Documents />} />
                <Route path="settings" element={<Settings />} />
                <Route path="prospector/*" element={<BotProspectDashboard />} />
                <Route path="clients/city-presentations" element={<CityPresentations />} />

                {/* ProjectFlow (Monday) — sub-rotas */}
                <Route path="monday" element={<PFDashboard />} />
                <Route path="monday/projects" element={<PFProjects />} />
                <Route path="monday/kanban" element={<PFKanban />} />
                <Route path="monday/kanban/:projectId" element={<PFKanban />} />
                <Route path="monday/tasks" element={<PFTaskList />} />
                <Route path="monday/timeline" element={<PFTimeline />} />
                <Route path="monday/tracker" element={<PFTracker />} />
                <Route path="monday/wiki" element={<PFWiki />} />
                <Route path="monday/milestones" element={<PFMilestones />} />
                <Route path="monday/automations" element={<PFAutomations />} />
                <Route path="monday/reports" element={<PFReports />} />
                <Route path="monday/settings" element={<PFSettings />} />
            </Route>
        </Routes>
    );
}
