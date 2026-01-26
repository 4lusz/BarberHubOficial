import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Scissors,
  Calendar,
  Clock,
  MapPin,
  User,
  LogOut,
  XCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function ClientAreaPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showLogin, setShowLogin] = useState(false);
  const [loginData, setLoginData] = useState({ phone: '', password: '' });
  const [loggingIn, setLoggingIn] = useState(false);

  useEffect(() => {
    if (isAuthenticated && user?.role === 'client') {
      fetchAppointments();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const fetchAppointments = async () => {
    try {
      const response = await api.get('/appointments/client');
      setAppointments(response.data);
    } catch (error) {
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoggingIn(true);

    try {
      const response = await api.post(`/auth/client/login?phone=${loginData.phone}&password=${loginData.password}`);
      localStorage.setItem('token', response.data.token);
      window.location.reload();
    } catch (error) {
      toast.error('Credenciais inválidas');
    } finally {
      setLoggingIn(false);
    }
  };

  const handleCancel = async (appointmentId) => {
    if (!window.confirm('Tem certeza que deseja cancelar este agendamento?')) return;

    try {
      await api.delete(`/appointments/${appointmentId}`);
      toast.success('Agendamento cancelado');
      fetchAppointments();
    } catch (error) {
      toast.error('Erro ao cancelar agendamento');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  if (!isAuthenticated || user?.role !== 'client') {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <header className="sticky top-0 z-50 glass border-b border-white/10">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <Link to="/" className="flex items-center gap-2">
                <Scissors className="w-6 h-6 text-primary" />
                <span className="font-heading font-bold text-xl uppercase">
                  <span className="text-primary">Barber</span>SaaS
                </span>
              </Link>
            </div>
          </div>
        </header>

        <main className="max-w-md mx-auto px-4 py-12">
          <Card className="border-border">
            <CardHeader className="text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary" />
              </div>
              <CardTitle className="font-heading text-2xl uppercase">Área do Cliente</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-center text-muted-foreground">
                Acesse sua conta para ver seu histórico de agendamentos.
              </p>

              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">WhatsApp</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="(11) 99999-9999"
                    value={loginData.phone}
                    onChange={(e) => setLoginData({ ...loginData, phone: e.target.value })}
                    required
                    data-testid="client-login-phone"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="Sua senha"
                    value={loginData.password}
                    onChange={(e) => setLoginData({ ...loginData, password: e.target.value })}
                    required
                    data-testid="client-login-password"
                  />
                </div>
                <Button
                  type="submit"
                  className="w-full btn-press"
                  disabled={loggingIn}
                  data-testid="client-login-button"
                >
                  {loggingIn ? 'Entrando...' : 'Entrar'}
                </Button>
              </form>

              <p className="text-center text-sm text-muted-foreground">
                Não tem conta? Crie uma ao fazer seu próximo agendamento.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/10">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-2">
              <Scissors className="w-6 h-6 text-primary" />
              <span className="font-heading font-bold text-xl uppercase">
                <span className="text-primary">Barber</span>SaaS
              </span>
            </Link>
            <Button variant="ghost" onClick={handleLogout} data-testid="client-logout-button">
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="font-heading text-3xl uppercase">Olá, {user?.name}!</h1>
          <p className="text-muted-foreground">Seus agendamentos</p>
        </div>

        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-lg" />
            ))}
          </div>
        ) : appointments.length === 0 ? (
          <Card className="border-border">
            <CardContent className="py-12 text-center">
              <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
              <p className="text-muted-foreground">Você ainda não tem agendamentos</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <Card
                key={apt.appointment_id}
                className="border-border"
                data-testid={`client-appointment-${apt.appointment_id}`}
              >
                <CardContent className="py-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2 mb-2">
                        <Badge className={getStatusColor(apt.status)}>
                          {getStatusLabel(apt.status)}
                        </Badge>
                      </div>
                      <h3 className="font-medium">{apt.service_name}</h3>
                      <p className="text-sm text-muted-foreground">{apt.barbershop_name}</p>
                      <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {apt.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {apt.time}
                        </span>
                      </div>
                    </div>
                    {(apt.status === 'pending' || apt.status === 'confirmed') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                        onClick={() => handleCancel(apt.appointment_id)}
                        data-testid={`cancel-apt-${apt.appointment_id}`}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Cancelar
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
