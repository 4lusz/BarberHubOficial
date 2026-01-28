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
  Scissors,
  Calendar,
  Clock,
  MapPin,
  User,
  LogOut,
  XCircle,
  Star,
  CheckCircle,
  ExternalLink,
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function ClientAreaPage() {
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loginData, setLoginData] = useState({ phone: '', password: '' });
  const [loggingIn, setLoggingIn] = useState(false);
  const [activeTab, setActiveTab] = useState('upcoming');

  useEffect(() => {
    if (isAuthenticated && user?.role === 'client') {
      fetchData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated, user]);

  const fetchData = async () => {
    try {
      const [appointmentsRes, profileRes] = await Promise.all([
        api.get('/appointments/client'),
        api.get('/client/profile')
      ]);
      setAppointments(appointmentsRes.data);
      setProfile(profileRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
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
      fetchData();
    } catch (error) {
      toast.error('Erro ao cancelar agendamento');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/');
  };

  // Filter appointments
  const today = new Date().toISOString().split('T')[0];
  const upcomingAppointments = appointments.filter(apt => 
    apt.date >= today && apt.status !== 'cancelled'
  );
  const pastAppointments = appointments.filter(apt => 
    apt.date < today || apt.status === 'completed'
  );
  const cancelledAppointments = appointments.filter(apt => 
    apt.status === 'cancelled'
  );

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
                  <span className="text-primary">Barber</span>Hub
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
                Acesse sua conta para ver seu histórico de agendamentos e benefícios VIP.
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
                <span className="text-primary">Barber</span>Hub
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
        {/* Profile Header */}
        <div className="mb-6">
          <h1 className="font-heading text-3xl uppercase">Olá, {user?.name}!</h1>
          <p className="text-muted-foreground">{user?.phone}</p>
        </div>

        {/* VIP Status Card */}
        {profile?.is_vip_anywhere && (
          <Card className="border-yellow-500/30 bg-yellow-500/5 mb-6" data-testid="vip-status-card">
            <CardContent className="py-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-yellow-500/20 flex items-center justify-center">
                  <Star className="w-6 h-6 text-yellow-500" fill="currentColor" />
                </div>
                <div className="flex-1">
                  <h3 className="font-medium text-yellow-500">Cliente VIP</h3>
                  <p className="text-sm text-muted-foreground">
                    Você tem descontos especiais nas seguintes barbearias:
                  </p>
                </div>
              </div>
              <div className="mt-3 space-y-2">
                {profile.vip_statuses.map((vip, index) => (
                  <div key={index} className="flex items-center justify-between bg-background/50 rounded-lg px-3 py-2">
                    <Link to={`/b/${vip.barbershop_slug}`} className="text-sm font-medium hover:text-primary flex items-center gap-1">
                      {vip.barbershop_name}
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                    <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                      {vip.discount_percentage}% OFF
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        {profile && (
          <div className="grid grid-cols-2 gap-3 mb-6">
            <Card className="border-border">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-bold text-primary">{profile.total_appointments}</p>
                <p className="text-sm text-muted-foreground">Agendamentos</p>
              </CardContent>
            </Card>
            <Card className="border-border">
              <CardContent className="py-4 text-center">
                <p className="text-3xl font-bold text-green-500">{profile.completed_appointments}</p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-2 mb-4 border-b border-border">
          <button
            onClick={() => setActiveTab('upcoming')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'upcoming' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            data-testid="tab-upcoming"
          >
            Próximos ({upcomingAppointments.length})
          </button>
          <button
            onClick={() => setActiveTab('past')}
            className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === 'past' 
                ? 'border-primary text-primary' 
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
            data-testid="tab-past"
          >
            Histórico ({pastAppointments.length})
          </button>
          {cancelledAppointments.length > 0 && (
            <button
              onClick={() => setActiveTab('cancelled')}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'cancelled' 
                  ? 'border-primary text-primary' 
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              }`}
              data-testid="tab-cancelled"
            >
              Cancelados ({cancelledAppointments.length})
            </button>
          )}
        </div>

        {/* Appointments List */}
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="skeleton h-24 rounded-lg" />
            ))}
          </div>
        ) : (
          <>
            {activeTab === 'upcoming' && (
              upcomingAppointments.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12 text-center">
                    <Calendar className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Nenhum agendamento próximo</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {upcomingAppointments.map((apt) => (
                    <AppointmentCard key={apt.appointment_id} apt={apt} onCancel={handleCancel} showCancel />
                  ))}
                </div>
              )
            )}

            {activeTab === 'past' && (
              pastAppointments.length === 0 ? (
                <Card className="border-border">
                  <CardContent className="py-12 text-center">
                    <CheckCircle className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                    <p className="text-muted-foreground">Nenhum agendamento concluído</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-3">
                  {pastAppointments.map((apt) => (
                    <AppointmentCard key={apt.appointment_id} apt={apt} />
                  ))}
                </div>
              )
            )}

            {activeTab === 'cancelled' && (
              <div className="space-y-3">
                {cancelledAppointments.map((apt) => (
                  <AppointmentCard key={apt.appointment_id} apt={apt} />
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}

function AppointmentCard({ apt, onCancel, showCancel }) {
  const formatAppointmentDate = (dateStr) => {
    try {
      const [year, month, day] = dateStr.split('-');
      const date = new Date(year, month - 1, day);
      return format(date, "dd 'de' MMMM, yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="border-border" data-testid={`client-appointment-${apt.appointment_id}`}>
      <CardContent className="py-4">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={getStatusColor(apt.status)}>
                {getStatusLabel(apt.status)}
              </Badge>
              {apt.is_vip && (
                <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30">
                  <Star className="w-3 h-3 mr-1" fill="currentColor" />
                  VIP
                </Badge>
              )}
            </div>
            <h3 className="font-medium">{apt.service_name}</h3>
            <Link to={`/b/${apt.barbershop_slug}`} className="text-sm text-primary hover:underline">
              {apt.barbershop_name}
            </Link>
            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
              <span className="flex items-center gap-1">
                <Calendar className="w-4 h-4" />
                {formatAppointmentDate(apt.date)}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {apt.time}
              </span>
            </div>
            {/* Price Info */}
            <div className="mt-2">
              {apt.discount_percentage > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground line-through">
                    {formatCurrency(apt.original_price)}
                  </span>
                  <span className="text-sm font-medium text-green-500">
                    {formatCurrency(apt.final_price)}
                  </span>
                  <span className="text-xs text-yellow-500">(-{apt.discount_percentage}%)</span>
                </div>
              ) : (
                <span className="text-sm font-medium text-primary">
                  {formatCurrency(apt.final_price || apt.service_price)}
                </span>
              )}
            </div>
            {/* Location */}
            {apt.barbershop_address && (
              <div className="mt-2">
                {apt.barbershop_latitude && apt.barbershop_longitude ? (
                  <a
                    href={`https://www.google.com/maps?q=${apt.barbershop_latitude},${apt.barbershop_longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                  >
                    <MapPin className="w-3 h-3" />
                    {apt.barbershop_address}
                  </a>
                ) : (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {apt.barbershop_address}
                  </span>
                )}
              </div>
            )}
          </div>
          {showCancel && (apt.status === 'pending' || apt.status === 'confirmed') && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
              onClick={() => onCancel(apt.appointment_id)}
              data-testid={`cancel-apt-${apt.appointment_id}`}
            >
              <XCircle className="w-4 h-4 mr-1" />
              Cancelar
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
