import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import {
  Calendar,
  Clock,
  DollarSign,
  Users,
  ArrowRight,
  CheckCircle,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import { toast } from 'sonner';

export default function Dashboard() {
  const { barbershop } = useAuth();
  const [stats, setStats] = useState(null);
  const [todayAppointments, setTodayAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [statsRes, appointmentsRes] = await Promise.all([
        api.get('/dashboard/stats'),
        api.get(`/appointments?date=${today}`),
      ]);
      setStats(statsRes.data);
      setTodayAppointments(appointmentsRes.data);
    } catch (error) {
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId, status) => {
    try {
      await api.put(`/appointments/${appointmentId}`, { status });
      toast.success(`Agendamento ${status === 'confirmed' ? 'confirmado' : status === 'cancelled' ? 'cancelado' : 'atualizado'}`);
      fetchData();
    } catch (error) {
      toast.error('Erro ao atualizar agendamento');
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="border-border">
              <CardContent className="pt-6">
                <div className="skeleton h-20 rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight">
          Dashboard
        </h1>
        <p className="text-muted-foreground mt-1">
          Bem-vindo de volta! Aqui está o resumo da sua barbearia.
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border hover:border-primary/50 transition-colors" data-testid="stat-today-appointments">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Hoje</p>
                <p className="text-3xl font-bold">{stats?.today_appointments || 0}</p>
                <p className="text-xs text-muted-foreground">agendamentos</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                <Calendar className="w-6 h-6 text-primary" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border hover:border-primary/50 transition-colors" data-testid="stat-pending">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Pendentes</p>
                <p className="text-3xl font-bold">{stats?.pending_appointments || 0}</p>
                <p className="text-xs text-muted-foreground">aguardando</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-yellow-500/10 flex items-center justify-center">
                <Clock className="w-6 h-6 text-yellow-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border hover:border-primary/50 transition-colors" data-testid="stat-revenue">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Semana</p>
                <p className="text-3xl font-bold">{formatCurrency(stats?.week_revenue || 0)}</p>
                <p className="text-xs text-muted-foreground">faturado</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border hover:border-primary/50 transition-colors" data-testid="stat-clients">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Clientes</p>
                <p className="text-3xl font-bold">{stats?.total_clients || 0}</p>
                <p className="text-xs text-muted-foreground">únicos</p>
              </div>
              <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <Users className="w-6 h-6 text-blue-500" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointments */}
      <Card className="border-border" data-testid="today-appointments-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="font-heading text-xl uppercase">
              Agendamentos de Hoje
            </CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {formatDate(today)}
            </p>
          </div>
          <Link to="/agenda">
            <Button variant="outline" size="sm" data-testid="view-agenda-button">
              Ver Agenda
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent>
          {todayAppointments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum agendamento para hoje</p>
              <p className="text-sm">Compartilhe seu link para receber agendamentos!</p>
            </div>
          ) : (
            <div className="space-y-3">
              {todayAppointments.map((appointment) => (
                <div
                  key={appointment.appointment_id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border hover:border-primary/30 transition-colors"
                  data-testid={`appointment-${appointment.appointment_id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[60px]">
                      <p className="text-xl font-bold">{appointment.time}</p>
                      <p className="text-xs text-muted-foreground">
                        até {appointment.end_time}
                      </p>
                    </div>
                    <div className="border-l border-border pl-4">
                      <p className="font-medium">{appointment.client_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.service_name}
                        {appointment.professional_name && ` • ${appointment.professional_name}`}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {appointment.client_phone}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(appointment.status)}>
                      {getStatusLabel(appointment.status)}
                    </Badge>
                    {appointment.status === 'pending' && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                          onClick={() => updateAppointmentStatus(appointment.appointment_id, 'confirmed')}
                          data-testid={`confirm-${appointment.appointment_id}`}
                        >
                          <CheckCircle className="w-4 h-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-400 hover:bg-red-500/10"
                          onClick={() => updateAppointmentStatus(appointment.appointment_id, 'cancelled')}
                          data-testid={`cancel-${appointment.appointment_id}`}
                        >
                          <XCircle className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                    {appointment.status === 'confirmed' && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-green-500 hover:text-green-400 hover:bg-green-500/10"
                        onClick={() => updateAppointmentStatus(appointment.appointment_id, 'completed')}
                        data-testid={`complete-${appointment.appointment_id}`}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Concluir
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Link to="/servicos">
          <Card className="border-border hover:border-primary/50 transition-all cursor-pointer group" data-testid="quick-action-services">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <AlertCircle className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Gerenciar Serviços</p>
                <p className="text-sm text-muted-foreground">Adicione ou edite seus serviços</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to="/horarios">
          <Card className="border-border hover:border-primary/50 transition-all cursor-pointer group" data-testid="quick-action-hours">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Horários de Funcionamento</p>
                <p className="text-sm text-muted-foreground">Configure seus horários</p>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link to={`/b/${barbershop?.slug}`} target="_blank">
          <Card className="border-border hover:border-primary/50 transition-all cursor-pointer group" data-testid="quick-action-public">
            <CardContent className="pt-6 flex items-center gap-4">
              <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center group-hover:bg-primary/20 transition-colors">
                <ArrowRight className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="font-medium">Ver Página Pública</p>
                <p className="text-sm text-muted-foreground">Veja como seus clientes veem</p>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>
    </div>
  );
}
