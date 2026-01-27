import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  Clock, 
  DollarSign,
  Calendar,
  Loader2,
  Lock,
  Crown
} from 'lucide-react';
import { toast } from 'sonner';

export default function ReportsPage() {
  const { barbershop } = useAuth();
  const [loading, setLoading] = useState(true);
  const [dailyReport, setDailyReport] = useState(null);
  const [weeklyReport, setWeeklyReport] = useState(null);
  const [revenueReport, setRevenueReport] = useState(null);
  const [clientsReport, setClientsReport] = useState(null);
  
  const isPremium = barbershop?.plan === 'premium';

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setLoading(true);
    try {
      // Daily report - available for all
      const daily = await api.get('/reports/daily');
      setDailyReport(daily.data);

      if (isPremium) {
        // Premium reports
        const [weekly, revenue, clients] = await Promise.all([
          api.get('/reports/weekly'),
          api.get('/reports/revenue'),
          api.get('/reports/clients')
        ]);
        setWeeklyReport(weekly.data);
        setRevenueReport(revenue.data);
        setClientsReport(clients.data);
      }
    } catch (error) {
      console.error('Error loading reports:', error);
      toast.error('Erro ao carregar relatórios');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value || 0);
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-tight" data-testid="reports-title">
              Relatórios
            </h1>
            <p className="text-muted-foreground">
              Acompanhe o desempenho da sua barbearia
            </p>
          </div>
          <Button onClick={loadReports} variant="outline" data-testid="refresh-reports-button">
            Atualizar
          </Button>
        </div>

        {/* Daily Report - Available for all */}
        <Card className="border-border" data-testid="daily-report-card">
          <CardHeader>
            <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Relatório de Hoje
            </CardTitle>
            <CardDescription>
              {dailyReport?.date && new Date(dailyReport.date + 'T12:00:00').toLocaleDateString('pt-BR', { 
                weekday: 'long', 
                day: 'numeric', 
                month: 'long' 
              })}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary">{dailyReport?.total_appointments || 0}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
              <div className="bg-green-500/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-green-500">{dailyReport?.completed || 0}</p>
                <p className="text-sm text-muted-foreground">Concluídos</p>
              </div>
              <div className="bg-yellow-500/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-yellow-500">{dailyReport?.pending || 0}</p>
                <p className="text-sm text-muted-foreground">Pendentes</p>
              </div>
              <div className="bg-red-500/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-red-500">{dailyReport?.cancelled || 0}</p>
                <p className="text-sm text-muted-foreground">Cancelados</p>
              </div>
              <div className="bg-primary/10 rounded-lg p-4 text-center">
                <p className="text-2xl font-bold text-primary">{formatCurrency(dailyReport?.revenue)}</p>
                <p className="text-sm text-muted-foreground">Faturamento</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Premium Reports Section */}
        {!isPremium ? (
          <Card className="border-border border-dashed" data-testid="premium-upgrade-card">
            <CardContent className="py-12 text-center">
              <Crown className="w-12 h-12 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-xl font-bold mb-2">Relatórios Premium</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Faça upgrade para o Plano Premium e tenha acesso a relatórios detalhados de faturamento, 
                análise por profissional, horários mais vendidos e muito mais.
              </p>
              <Button className="btn-press" data-testid="upgrade-to-premium-button">
                <Crown className="w-4 h-4 mr-2" />
                Fazer Upgrade - R$ 99,90/mês
              </Button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Weekly Report */}
            <Card className="border-border" data-testid="weekly-report-card">
              <CardHeader>
                <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
                  <TrendingUp className="w-5 h-5 text-primary" />
                  Últimos 7 Dias
                  <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs rounded-full">
                    PREMIUM
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid md:grid-cols-3 gap-4 mb-6">
                  <div className="bg-primary/10 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-primary">
                      {formatCurrency(weeklyReport?.total_revenue)}
                    </p>
                    <p className="text-sm text-muted-foreground">Faturamento Total</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-primary">
                      {weeklyReport?.total_appointments || 0}
                    </p>
                    <p className="text-sm text-muted-foreground">Agendamentos</p>
                  </div>
                  <div className="bg-primary/10 rounded-lg p-4 text-center">
                    <p className="text-3xl font-bold text-primary">
                      {formatCurrency(weeklyReport?.average_daily_revenue)}
                    </p>
                    <p className="text-sm text-muted-foreground">Média Diária</p>
                  </div>
                </div>

                {/* Daily breakdown */}
                <div className="space-y-2">
                  <p className="text-sm font-medium text-muted-foreground mb-3">Detalhamento diário</p>
                  {weeklyReport?.daily_breakdown?.map((day) => (
                    <div key={day.date} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                      <span className="text-sm">
                        {new Date(day.date + 'T12:00:00').toLocaleDateString('pt-BR', { weekday: 'short', day: 'numeric', month: 'short' })}
                      </span>
                      <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground">
                          {day.appointments} agendamentos
                        </span>
                        <span className="font-medium text-primary">
                          {formatCurrency(day.revenue)}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Revenue by Service & Hour */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* By Service */}
              <Card className="border-border" data-testid="service-report-card">
                <CardHeader>
                  <CardTitle className="font-heading text-lg uppercase flex items-center gap-2">
                    <BarChart3 className="w-5 h-5 text-primary" />
                    Por Serviço
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {revenueReport?.by_service && Object.keys(revenueReport.by_service).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(revenueReport.by_service).map(([name, data]) => (
                        <div key={name} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                          <div>
                            <p className="font-medium">{name}</p>
                            <p className="text-sm text-muted-foreground">{data.count} atendimentos</p>
                          </div>
                          <span className="font-bold text-primary">{formatCurrency(data.revenue)}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">Nenhum dado disponível</p>
                  )}
                </CardContent>
              </Card>

              {/* By Hour */}
              <Card className="border-border" data-testid="hour-report-card">
                <CardHeader>
                  <CardTitle className="font-heading text-lg uppercase flex items-center gap-2">
                    <Clock className="w-5 h-5 text-primary" />
                    Por Horário
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {revenueReport?.by_hour && Object.keys(revenueReport.by_hour).length > 0 ? (
                    <div className="space-y-3">
                      {Object.entries(revenueReport.by_hour)
                        .sort(([a], [b]) => parseInt(a) - parseInt(b))
                        .map(([hour, data]) => (
                          <div key={hour} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                            <div>
                              <p className="font-medium">{hour}:00</p>
                              <p className="text-sm text-muted-foreground">{data.count} atendimentos</p>
                            </div>
                            <span className="font-bold text-primary">{formatCurrency(data.revenue)}</span>
                          </div>
                        ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground text-center py-4">Nenhum dado disponível</p>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Top Clients */}
            <Card className="border-border" data-testid="clients-report-card">
              <CardHeader>
                <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
                  <Users className="w-5 h-5 text-primary" />
                  Top Clientes
                  <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs rounded-full">
                    PREMIUM
                  </span>
                </CardTitle>
                <CardDescription>
                  {clientsReport?.total_unique_clients || 0} clientes únicos
                </CardDescription>
              </CardHeader>
              <CardContent>
                {clientsReport?.top_clients?.length > 0 ? (
                  <div className="space-y-3">
                    {clientsReport.top_clients.slice(0, 10).map((client, index) => (
                      <div key={client.phone} className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-3">
                          <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                            index < 3 ? 'bg-yellow-500 text-black' : 'bg-muted text-muted-foreground'
                          }`}>
                            {index + 1}
                          </span>
                          <div>
                            <p className="font-medium">{client.client_name}</p>
                            <p className="text-sm text-muted-foreground">
                              {client.total_visits} visitas • Última: {new Date(client.last_visit + 'T12:00:00').toLocaleDateString('pt-BR')}
                            </p>
                          </div>
                        </div>
                        <span className="font-bold text-primary">{formatCurrency(client.total_spent)}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">Nenhum cliente encontrado</p>
                )}
              </CardContent>
            </Card>

            {/* By Professional */}
            {revenueReport?.by_professional && Object.keys(revenueReport.by_professional).length > 0 && (
              <Card className="border-border" data-testid="professional-report-card">
                <CardHeader>
                  <CardTitle className="font-heading text-xl uppercase flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-primary" />
                    Por Profissional
                    <span className="ml-2 px-2 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs rounded-full">
                      PREMIUM
                    </span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Object.entries(revenueReport.by_professional).map(([name, data]) => (
                      <div key={name} className="bg-muted/30 rounded-lg p-4 text-center">
                        <p className="font-medium mb-1">{name}</p>
                        <p className="text-2xl font-bold text-primary">{formatCurrency(data.revenue)}</p>
                        <p className="text-sm text-muted-foreground">{data.count} atendimentos</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
