import { useState, useEffect } from 'react';
import api from '../lib/api';
import { formatCurrency, formatDate, getStatusColor, getStatusLabel } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Calendar } from '../components/ui/calendar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '../components/ui/dropdown-menu';
import {
  CalendarIcon,
  ChevronLeft,
  ChevronRight,
  MoreVertical,
  CheckCircle,
  XCircle,
  Clock,
  Phone,
} from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays, subDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function AgendaPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCalendar, setShowCalendar] = useState(false);

  const dateString = format(selectedDate, 'yyyy-MM-dd');

  useEffect(() => {
    fetchAppointments();
  }, [dateString, statusFilter]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      let url = `/appointments?date=${dateString}`;
      if (statusFilter !== 'all') {
        url += `&status=${statusFilter}`;
      }
      const response = await api.get(url);
      setAppointments(response.data);
    } catch (error) {
      toast.error('Erro ao carregar agendamentos');
    } finally {
      setLoading(false);
    }
  };

  const updateStatus = async (appointmentId, status) => {
    try {
      await api.put(`/appointments/${appointmentId}`, { status });
      toast.success(
        status === 'confirmed' ? 'Agendamento confirmado!' :
        status === 'cancelled' ? 'Agendamento cancelado!' :
        'Agendamento atualizado!'
      );
      fetchAppointments();
    } catch (error) {
      toast.error('Erro ao atualizar agendamento');
    }
  };

  const goToDate = (direction) => {
    setSelectedDate(prev => direction === 'next' ? addDays(prev, 1) : subDays(prev, 1));
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight">
          Agenda
        </h1>
        <p className="text-muted-foreground mt-1">
          Visualize e gerencie todos os agendamentos
        </p>
      </div>

      {/* Date Navigation */}
      <Card className="border-border">
        <CardContent className="py-4">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToDate('prev')}
                data-testid="prev-day-button"
              >
                <ChevronLeft className="w-4 h-4" />
              </Button>
              
              <div className="relative">
                <Button
                  variant="outline"
                  onClick={() => setShowCalendar(!showCalendar)}
                  className="min-w-[200px]"
                  data-testid="date-picker-button"
                >
                  <CalendarIcon className="w-4 h-4 mr-2" />
                  {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
                </Button>
                
                {showCalendar && (
                  <div className="absolute top-full mt-2 left-0 z-50 bg-card border border-border rounded-lg shadow-lg">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setShowCalendar(false);
                        }
                      }}
                      locale={ptBR}
                    />
                  </div>
                )}
              </div>
              
              <Button
                variant="outline"
                size="icon"
                onClick={() => goToDate('next')}
                data-testid="next-day-button"
              >
                <ChevronRight className="w-4 h-4" />
              </Button>
              
              <Button
                variant="ghost"
                onClick={() => setSelectedDate(new Date())}
                className="text-primary"
                data-testid="today-button"
              >
                Hoje
              </Button>
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="status-filter">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="confirmed">Confirmados</SelectItem>
                <SelectItem value="completed">Concluídos</SelectItem>
                <SelectItem value="cancelled">Cancelados</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Click outside to close calendar */}
      {showCalendar && (
        <div 
          className="fixed inset-0 z-40" 
          onClick={() => setShowCalendar(false)}
        />
      )}

      {/* Appointments List */}
      <Card className="border-border" data-testid="appointments-list">
        <CardHeader>
          <CardTitle className="font-heading text-xl uppercase">
            {formatDate(dateString)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="space-y-3">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="skeleton h-24 rounded-lg" />
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CalendarIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum agendamento para este dia</p>
            </div>
          ) : (
            <div className="space-y-3">
              {appointments.map((appointment) => (
                <div
                  key={appointment.appointment_id}
                  className="flex items-center justify-between p-4 rounded-lg bg-secondary/30 border border-border hover:border-primary/30 transition-colors"
                  data-testid={`agenda-appointment-${appointment.appointment_id}`}
                >
                  <div className="flex items-center gap-4">
                    <div className="text-center min-w-[70px]">
                      <p className="text-2xl font-bold">{appointment.time}</p>
                      <p className="text-xs text-muted-foreground">
                        até {appointment.end_time}
                      </p>
                    </div>
                    <div className="border-l border-border pl-4">
                      <p className="font-medium text-lg">{appointment.client_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {appointment.service_name}
                        {appointment.professional_name && (
                          <span> • {appointment.professional_name}</span>
                        )}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Phone className="w-3 h-3" />
                          {appointment.client_phone}
                        </span>
                        <span className="text-sm font-medium text-primary">
                          {formatCurrency(appointment.service_price || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <Badge className={getStatusColor(appointment.status)}>
                      {getStatusLabel(appointment.status)}
                    </Badge>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          data-testid={`actions-${appointment.appointment_id}`}
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        {appointment.status === 'pending' && (
                          <>
                            <DropdownMenuItem
                              onClick={() => updateStatus(appointment.appointment_id, 'confirmed')}
                              className="text-green-500"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Confirmar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateStatus(appointment.appointment_id, 'cancelled')}
                              className="text-red-500"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          </>
                        )}
                        {appointment.status === 'confirmed' && (
                          <>
                            <DropdownMenuItem
                              onClick={() => updateStatus(appointment.appointment_id, 'completed')}
                              className="text-green-500"
                            >
                              <CheckCircle className="w-4 h-4 mr-2" />
                              Marcar como Concluído
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => updateStatus(appointment.appointment_id, 'cancelled')}
                              className="text-red-500"
                            >
                              <XCircle className="w-4 h-4 mr-2" />
                              Cancelar
                            </DropdownMenuItem>
                          </>
                        )}
                        {(appointment.status === 'cancelled' || appointment.status === 'completed') && (
                          <DropdownMenuItem
                            onClick={() => updateStatus(appointment.appointment_id, 'pending')}
                          >
                            <Clock className="w-4 h-4 mr-2" />
                            Voltar para Pendente
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
