import { BrowserRouter, Routes, Route, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { Toaster } from './components/ui/sonner';

// Pages
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import AuthCallback from './pages/AuthCallback';
import Dashboard from './pages/Dashboard';
import ServicesPage from './pages/ServicesPage';
import ProfessionalsPage from './pages/ProfessionalsPage';
import BusinessHoursPage from './pages/BusinessHoursPage';
import TimeBlocksPage from './pages/TimeBlocksPage';
import AgendaPage from './pages/AgendaPage';
import SettingsPage from './pages/SettingsPage';
import SelectPlanPage from './pages/SelectPlanPage';
import PaymentPage from './pages/PaymentPage';
import PixPaymentPage from './pages/PixPaymentPage';
import PaymentSuccessPage from './pages/PaymentSuccessPage';
import PublicBookingPage from './pages/PublicBookingPage';
import ClientAreaPage from './pages/ClientAreaPage';
import ReportsPage from './pages/ReportsPage';
import VipClientsPage from './pages/VipClientsPage';
import SubscriptionPage from './pages/SubscriptionPage';
import SuperAdminPage from './pages/SuperAdminPage';
import TermsPage from './pages/TermsPage';
import PrivacyPage from './pages/PrivacyPage';
import FAQPage from './pages/FAQPage';

// Layout
import DashboardLayout from './components/layouts/DashboardLayout';

// Protected Route Component - Only allows access if subscription is ACTIVE
const ProtectedRoute = ({ children, requireBarbershop = false }) => {
  const { isAuthenticated, loading, user, barbershop } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If user is a barber, check subscription status
  if (requireBarbershop && user?.role === 'barber') {
    // No barbershop at all - go to plans
    if (!barbershop) {
      return <Navigate to="/escolher-plano" replace />;
    }
    
    // Barbershop exists but subscription is not active - go to plans
    if (barbershop.plan_status !== 'active') {
      return <Navigate to="/escolher-plano" replace />;
    }
  }

  return children;
};

// Payment Flow Route - For users who need to pay/complete payment
const PaymentFlowRoute = ({ children }) => {
  const { isAuthenticated, loading, user, barbershop } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse text-primary">Carregando...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Only redirect to dashboard if barbershop exists AND subscription is ACTIVE
  if (user?.role === 'barber' && barbershop && barbershop.plan_status === 'active') {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};

// App Router with session_id detection
function AppRouter() {
  const location = useLocation();
  
  // CRITICAL: Check for session_id synchronously during render
  // This prevents race conditions with useEffect
  if (location.hash?.includes('session_id=')) {
    return <AuthCallback />;
  }

  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/cadastro" element={<RegisterPage />} />
      <Route path="/b/:slug" element={<PublicBookingPage />} />
      <Route path="/minha-area" element={<ClientAreaPage />} />
      <Route path="/super-admin" element={<SuperAdminPage />} />
      <Route path="/termos" element={<TermsPage />} />
      <Route path="/privacidade" element={<PrivacyPage />} />
      <Route path="/faq" element={<FAQPage />} />
      
      {/* Payment Flow Routes */}
      <Route
        path="/escolher-plano"
        element={
          <PaymentFlowRoute>
            <SelectPlanPage />
          </PaymentFlowRoute>
        }
      />
      <Route
        path="/pagamento"
        element={
          <PaymentFlowRoute>
            <PaymentPage />
          </PaymentFlowRoute>
        }
      />
      <Route
        path="/pagamento/sucesso"
        element={
          <ProtectedRoute>
            <PaymentSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pagamento/erro"
        element={
          <ProtectedRoute>
            <PaymentSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/pagamento/pendente"
        element={
          <ProtectedRoute>
            <PaymentSuccessPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute requireBarbershop>
            <DashboardLayout>
              <Dashboard />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/servicos"
        element={
          <ProtectedRoute requireBarbershop>
            <DashboardLayout>
              <ServicesPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/profissionais"
        element={
          <ProtectedRoute requireBarbershop>
            <DashboardLayout>
              <ProfessionalsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/horarios"
        element={
          <ProtectedRoute requireBarbershop>
            <DashboardLayout>
              <BusinessHoursPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/bloqueios"
        element={
          <ProtectedRoute requireBarbershop>
            <DashboardLayout>
              <TimeBlocksPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/agenda"
        element={
          <ProtectedRoute requireBarbershop>
            <DashboardLayout>
              <AgendaPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/relatorios"
        element={
          <ProtectedRoute requireBarbershop>
            <ReportsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/clientes-vip"
        element={
          <ProtectedRoute requireBarbershop>
            <VipClientsPage />
          </ProtectedRoute>
        }
      />
      <Route
        path="/assinatura"
        element={
          <ProtectedRoute requireBarbershop>
            <DashboardLayout>
              <SubscriptionPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/configuracoes"
        element={
          <ProtectedRoute requireBarbershop>
            <DashboardLayout>
              <SettingsPage />
            </DashboardLayout>
          </ProtectedRoute>
        }
      />
      
      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
        <Toaster richColors position="top-right" />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
