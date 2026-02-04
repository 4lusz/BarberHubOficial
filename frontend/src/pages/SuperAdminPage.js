import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../lib/api';
import { formatCurrency } from '../lib/utils';
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
} from '../components/ui/dialog';
import {
  Shield,
  Lock,
  Eye,
  EyeOff,
  Store,
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  XCircle,
  MessageCircle,
  CreditCard,
  Activity,
  Search,
  RefreshCw,
  ChevronRight,
  Crown,
  Loader2,
  LogOut,
  ExternalLink,
  Settings,
  Trash2,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';

export default function SuperAdminPage() {
  const navigate = useNavigate();
  const [authenticated, setAuthenticated] = useState(false);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dashboard, setDashboard] = useState(null);
  const [barbershops, setBarbershops] = useState([]);
  const [selectedBarbershop, setSelectedBarbershop] = useState(null);
  const [whatsappReport, setWhatsappReport] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterPlan, setFilterPlan] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    owner_name: '',
    email: '',
    password: '',
    phone: '',
    plan: 'premium'
  });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem('super_admin_token');
    if (token) {
      setAuthenticated(true);
      loadDashboard(token);
    }
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const response = await api.post('/super-admin/login', { password });
      localStorage.setItem('super_admin_token', response.data.token);
      setAuthenticated(true);
      loadDashboard(response.data.token);
      toast.success('Bem-vindo ao painel Super Admin!');
    } catch (error) {
      toast.error('Senha incorreta');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('super_admin_token');
    setAuthenticated(false);
    setDashboard(null);
    setBarbershops([]);
  };

  const getAuthHeaders = () => {
    const token = localStorage.getItem('super_admin_token');
    return { Authorization: `Bearer ${token}` };
  };

  const loadDashboard = async (token) => {
    try {
      const headers = { Authorization: `Bearer ${token || localStorage.getItem('super_admin_token')}` };
      const [dashRes, shopsRes] = await Promise.all([
        api.get('/super-admin/dashboard', { headers }),
        api.get('/super-admin/barbershops', { headers })
      ]);
      
      // Ensure all required fields exist with defaults
      const dashboardData = {
        overview: {
          active_barbershops: 0,
          total_barbershops: 0,
          pending_barbershops: 0,
          expired_barbershops: 0,
          appointments_today: 0,
          total_appointments: 0,
          barbers: 0,
          clients: 0,
          total_vip_clients: 0,
          total_users: 0,
          ...dashRes.data.overview
        },
        financial: {
          mrr: 0,
          comum_subscriptions: 0,
          premium_subscriptions: 0,
          revenue_comum: 0,
          revenue_premium: 0,
          failed_subscriptions: 0,
          ...dashRes.data.financial
        },
        growth: {
          new_signups_7d: 0,
          churn_rate: 0,
          ...dashRes.data.growth
        },
        integrations: {
          mercadopago: { configured: false },
          whatsapp: { configured: false },
          whatsapp_respondio: { configured: false },
          email_resend: { configured: false },
          ...dashRes.data.integrations
        }
      };
      
      setDashboard(dashboardData);
      setBarbershops(shopsRes.data.barbershops || []);
    } catch (error) {
      if (error.response?.status === 401) {
        handleLogout();
        toast.error('Sessão expirada');
      }
    }
  };

  const loadBarbershops = async () => {
    try {
      const params = new URLSearchParams();
      if (searchTerm) params.append('search', searchTerm);
      if (filterPlan) params.append('plan', filterPlan);
      if (filterStatus) params.append('status', filterStatus);
      
      const response = await api.get(`/super-admin/barbershops?${params}`, { headers: getAuthHeaders() });
      setBarbershops(response.data.barbershops);
    } catch (error) {
      toast.error('Erro ao carregar barbearias');
    }
  };

  const loadBarbershopDetails = async (barbershopId) => {
    try {
      const response = await api.get(`/super-admin/barbershops/${barbershopId}`, { headers: getAuthHeaders() });
      setSelectedBarbershop(response.data);
    } catch (error) {
      toast.error('Erro ao carregar detalhes');
    }
  };

  const loadWhatsappReport = async () => {
    try {
      const response = await api.get('/super-admin/whatsapp-report', { headers: getAuthHeaders() });
      setWhatsappReport(response.data);
    } catch (error) {
      toast.error('Erro ao carregar relatório');
    }
  };

  const handleCreateBarbershop = async (e) => {
    e.preventDefault();
    if (!createForm.name || !createForm.owner_name || !createForm.email || !createForm.password) {
      toast.error('Preencha todos os campos obrigatórios');
      return;
    }
    
    setCreating(true);
    try {
      const response = await api.post('/super-admin/barbershops', createForm, { headers: getAuthHeaders() });
      toast.success(`Barbearia "${response.data.barbershop.name}" criada com sucesso!`);
      setShowCreateModal(false);
      setCreateForm({ name: '', owner_name: '', email: '', password: '', phone: '', plan: 'premium' });
      loadDashboard();
      loadBarbershops();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar barbearia');
    } finally {
      setCreating(false);
    }
  };

  const updateBarbershopStatus = async (barbershopId, status) => {
    try {
      await api.put(`/super-admin/barbershops/${barbershopId}/status?status=${status}`, {}, { headers: getAuthHeaders() });
      toast.success('Status atualizado!');
      loadBarbershops();
      if (selectedBarbershop) {
        loadBarbershopDetails(barbershopId);
      }
    } catch (error) {
      toast.error('Erro ao atualizar status');
    }
  };

  const deleteBarbershop = async (barbershopId, barbershopName) => {
    if (!window.confirm(`⚠️ ATENÇÃO!\n\nVocê está prestes a EXCLUIR PERMANENTEMENTE a barbearia "${barbershopName}".\n\nIsso irá deletar:\n- Todos os serviços\n- Todos os profissionais\n- Todos os agendamentos\n- Todos os clientes VIP\n- A conta do dono\n\nEsta ação NÃO pode ser desfeita!\n\nDigite "EXCLUIR" para confirmar:`)) {
      return;
    }
    
    const confirmText = window.prompt(`Digite "EXCLUIR" para confirmar a exclusão de "${barbershopName}":`);
    if (confirmText !== 'EXCLUIR') {
      toast.error('Exclusão cancelada - texto de confirmação incorreto');
      return;
    }
    
    try {
      await api.delete(`/super-admin/barbershops/${barbershopId}`, { headers: getAuthHeaders() });
      toast.success(`Barbearia "${barbershopName}" excluída com sucesso!`);
      setSelectedBarbershop(null);
      loadBarbershops();
      loadDashboard();
    } catch (error) {
      toast.error('Erro ao excluir barbearia: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Login Screen
  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md border-primary/30">
          <CardHeader className="text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
              <Shield className="w-8 h-8 text-primary" />
            </div>
            <CardTitle className="text-2xl font-heading uppercase">Super Admin</CardTitle>
            <p className="text-muted-foreground">Acesso restrito ao administrador</p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label>Senha de Acesso</Label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10"
                    placeholder="Digite a senha"
                    data-testid="admin-password-input"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading} data-testid="admin-login-button">
                {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Shield className="w-4 h-4 mr-2" />}
                Acessar Painel
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const tabs = [
    { id: 'overview', label: 'Visão Geral', icon: Activity },
    { id: 'barbershops', label: 'Barbearias', icon: Store },
    { id: 'financial', label: 'Financeiro', icon: DollarSign },
    { id: 'whatsapp', label: 'WhatsApp', icon: MessageCircle },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h1 className="font-heading text-xl uppercase">Super Admin</h1>
              <p className="text-xs text-muted-foreground">BarberHub Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => loadDashboard()}>
              <RefreshCw className="w-4 h-4 mr-2" />
              Atualizar
            </Button>
            <Button variant="ghost" size="sm" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="border-b border-border bg-card">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex gap-1 overflow-x-auto">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  if (tab.id === 'whatsapp' && !whatsappReport) {
                    loadWhatsappReport();
                  }
                }}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                  activeTab === tab.id 
                    ? 'border-primary text-primary' 
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {/* Overview Tab */}
        {activeTab === 'overview' && dashboard && (
          <div className="space-y-6 animate-fade-in">
            {/* Stats Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Barbearias Ativas</p>
                      <p className="text-3xl font-bold text-primary">{dashboard.overview.active_barbershops}</p>
                    </div>
                    <Store className="w-8 h-8 text-primary/30" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {dashboard.overview.total_barbershops} total
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">MRR</p>
                      <p className="text-3xl font-bold text-green-500">{formatCurrency(dashboard.financial.mrr)}</p>
                    </div>
                    <DollarSign className="w-8 h-8 text-green-500/30" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Receita mensal recorrente
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Agendamentos Hoje</p>
                      <p className="text-3xl font-bold">{dashboard.overview.appointments_today}</p>
                    </div>
                    <Calendar className="w-8 h-8 text-muted-foreground/30" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    {dashboard.overview.total_appointments} total
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Novos (7 dias)</p>
                      <p className="text-3xl font-bold text-blue-500">{dashboard.growth.new_signups_7d}</p>
                    </div>
                    <TrendingUp className="w-8 h-8 text-blue-500/30" />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Novos cadastros
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Detailed Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Subscriptions */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Crown className="w-5 h-5 text-primary" />
                    Assinaturas
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Plano Comum</span>
                    <div className="text-right">
                      <span className="font-bold">{dashboard.financial.comum_subscriptions}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({formatCurrency(dashboard.financial.revenue_comum)})
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Plano Premium</span>
                    <div className="text-right">
                      <span className="font-bold text-primary">{dashboard.financial.premium_subscriptions}</span>
                      <span className="text-xs text-muted-foreground ml-2">
                        ({formatCurrency(dashboard.financial.revenue_premium)})
                      </span>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between items-center">
                    <span className="text-muted-foreground">Com falha</span>
                    <span className={`font-bold ${dashboard.financial.failed_subscriptions > 0 ? 'text-red-500' : 'text-green-500'}`}>
                      {dashboard.financial.failed_subscriptions}
                    </span>
                  </div>
                </CardContent>
              </Card>

              {/* Users */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Users className="w-5 h-5 text-primary" />
                    Usuários
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Barbeiros (donos)</span>
                    <span className="font-bold">{dashboard.overview.barbers}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Clientes</span>
                    <span className="font-bold">{dashboard.overview.clients}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Clientes VIP</span>
                    <span className="font-bold text-yellow-500">{dashboard.overview.total_vip_clients}</span>
                  </div>
                  <div className="pt-2 border-t border-border flex justify-between items-center">
                    <span className="text-muted-foreground">Total</span>
                    <span className="font-bold">{dashboard.overview.total_users}</span>
                  </div>
                </CardContent>
              </Card>

              {/* Integrations */}
              <Card className="border-border">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Settings className="w-5 h-5 text-primary" />
                    Integrações
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Mercado Pago</span>
                    {dashboard.integrations?.mercadopago?.configured ? (
                      <Badge className="bg-green-500/20 text-green-500">Produção</Badge>
                    ) : (
                      <Badge variant="destructive">Não configurado</Badge>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">WhatsApp (Twilio)</span>
                    {dashboard.integrations?.whatsapp?.configured || dashboard.integrations?.whatsapp_twilio?.configured || dashboard.integrations?.whatsapp_respondio?.configured ? (
                      <Badge className="bg-green-500/20 text-green-500">Configurado</Badge>
                    ) : (
                      <Badge variant="outline">Parcial</Badge>
                    )}
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Email (Resend)</span>
                    {dashboard.integrations?.email_resend?.configured ? (
                      <Badge className="bg-green-500/20 text-green-500">Ativo</Badge>
                    ) : (
                      <Badge variant="destructive">Não configurado</Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="pt-4 pb-4 text-center">
                  <CheckCircle className="w-6 h-6 text-green-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-green-500">{dashboard.overview.active_barbershops}</p>
                  <p className="text-xs text-muted-foreground">Ativas</p>
                </CardContent>
              </Card>
              <Card className="border-yellow-500/30 bg-yellow-500/5">
                <CardContent className="pt-4 pb-4 text-center">
                  <AlertTriangle className="w-6 h-6 text-yellow-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-yellow-500">{dashboard.overview.pending_barbershops}</p>
                  <p className="text-xs text-muted-foreground">Pendentes</p>
                </CardContent>
              </Card>
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="pt-4 pb-4 text-center">
                  <XCircle className="w-6 h-6 text-red-500 mx-auto mb-2" />
                  <p className="text-2xl font-bold text-red-500">{dashboard.overview.expired_barbershops}</p>
                  <p className="text-xs text-muted-foreground">Expiradas</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-4 pb-4 text-center">
                  <TrendingDown className="w-6 h-6 text-muted-foreground mx-auto mb-2" />
                  <p className="text-2xl font-bold">{dashboard.growth.churn_rate}%</p>
                  <p className="text-xs text-muted-foreground">Churn (30d)</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Barbershops Tab */}
        {activeTab === 'barbershops' && (
          <div className="space-y-4 animate-fade-in">
            {/* Header with Create Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold">Barbearias</h2>
              <Button onClick={() => setShowCreateModal(true)} className="bg-primary text-black">
                <Store className="w-4 h-4 mr-2" />
                Criar Barbearia
              </Button>
            </div>

            {/* Filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                  placeholder="Buscar por nome ou slug..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <select
                value={filterPlan}
                onChange={(e) => setFilterPlan(e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-background text-sm"
              >
                <option value="">Todos os planos</option>
                <option value="comum">Comum</option>
                <option value="premium">Premium</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-3 py-2 rounded-md border border-border bg-background text-sm"
              >
                <option value="">Todos os status</option>
                <option value="active">Ativo</option>
                <option value="expired">Expirado</option>
                <option value="pending">Pendente</option>
              </select>
              <Button onClick={loadBarbershops} variant="outline">
                <Search className="w-4 h-4 mr-2" />
                Filtrar
              </Button>
            </div>

            {/* Barbershops List */}
            <div className="grid gap-3">
              {barbershops.map((shop) => (
                <Card key={shop.barbershop_id} className="border-border hover:border-primary/30 transition-colors">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${
                          shop.plan === 'premium' ? 'bg-primary/20' : 'bg-secondary'
                        }`}>
                          {shop.plan === 'premium' ? (
                            <Crown className="w-6 h-6 text-primary" />
                          ) : (
                            <Store className="w-6 h-6 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <h3 className="font-medium flex items-center gap-2">
                            {shop.name}
                            <Badge variant={shop.plan_status === 'active' ? 'default' : 'destructive'} className="text-xs">
                              {shop.plan_status}
                            </Badge>
                          </h3>
                          <p className="text-sm text-muted-foreground">
                            /{shop.slug} • {shop.owner?.email || 'Sem email'}
                          </p>
                          <div className="flex gap-4 mt-1 text-xs text-muted-foreground">
                            <span>{shop.stats?.appointments || 0} agendamentos</span>
                            <span>{shop.stats?.services || 0} serviços</span>
                            <span>{shop.stats?.professionals || 0} profissionais</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className={shop.plan === 'premium' ? 'border-primary text-primary' : ''}>
                          {shop.plan}
                        </Badge>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          onClick={() => loadBarbershopDetails(shop.barbershop_id)}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* Financial Tab */}
        {activeTab === 'financial' && dashboard && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="border-green-500/30 bg-green-500/5">
                <CardContent className="pt-6 text-center">
                  <DollarSign className="w-10 h-10 text-green-500 mx-auto mb-2" />
                  <p className="text-4xl font-bold text-green-500">{formatCurrency(dashboard.financial.mrr)}</p>
                  <p className="text-muted-foreground">MRR (Receita Mensal Recorrente)</p>
                </CardContent>
              </Card>
              <Card className="border-border">
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold">{dashboard.financial.comum_subscriptions + dashboard.financial.premium_subscriptions}</p>
                  <p className="text-muted-foreground">Assinaturas Ativas</p>
                </CardContent>
              </Card>
              <Card className="border-red-500/30 bg-red-500/5">
                <CardContent className="pt-6 text-center">
                  <p className="text-4xl font-bold text-red-500">{dashboard.financial.failed_subscriptions}</p>
                  <p className="text-muted-foreground">Pagamentos com Falha</p>
                </CardContent>
              </Card>
            </div>

            <Card className="border-border">
              <CardHeader>
                <CardTitle>Receita por Plano</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Plano Comum ({dashboard.financial.comum_subscriptions} assinaturas)</span>
                      <span className="font-bold">{formatCurrency(dashboard.financial.revenue_comum)}</span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500" 
                        style={{ width: `${(dashboard.financial.revenue_comum / dashboard.financial.mrr) * 100}%` }}
                      />
                    </div>
                  </div>
                  <div>
                    <div className="flex justify-between mb-1">
                      <span>Plano Premium ({dashboard.financial.premium_subscriptions} assinaturas)</span>
                      <span className="font-bold text-primary">{formatCurrency(dashboard.financial.revenue_premium)}</span>
                    </div>
                    <div className="h-3 bg-secondary rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-primary" 
                        style={{ width: `${(dashboard.financial.revenue_premium / dashboard.financial.mrr) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* WhatsApp Tab */}
        {activeTab === 'whatsapp' && (
          <div className="space-y-6 animate-fade-in">
            {whatsappReport ? (
              <>
                {/* Status */}
                <Card className={`border-border ${whatsappReport.integration_status.configured ? 'border-green-500/30' : 'border-yellow-500/30'}`}>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MessageCircle className="w-5 h-5 text-green-500" />
                      Status da Integração
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Provider</p>
                        <p className="font-bold">{whatsappReport.integration_status.provider}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">API Token</p>
                        {whatsappReport.integration_status.api_token_set ? (
                          <Badge className="bg-green-500/20 text-green-500">Configurado</Badge>
                        ) : (
                          <Badge variant="destructive">Não configurado</Badge>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Channel ID</p>
                        {whatsappReport.integration_status.channel_id_set ? (
                          <Badge className="bg-green-500/20 text-green-500">Configurado</Badge>
                        ) : (
                          <Badge variant="destructive">Não configurado</Badge>
                        )}
                      </div>
                      <div className="text-center">
                        <p className="text-sm text-muted-foreground">Status</p>
                        {whatsappReport.integration_status.configured ? (
                          <Badge className="bg-green-500/20 text-green-500">Pronto</Badge>
                        ) : (
                          <Badge variant="outline">Configuração pendente</Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Message Types */}
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Tipos de Mensagens</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {whatsappReport.message_types.map((msg, index) => (
                        <div key={index} className="border border-border rounded-lg p-4">
                          <div className="flex items-start justify-between mb-2">
                            <div>
                              <h4 className="font-medium capitalize">{msg.type.replace(/_/g, ' ')}</h4>
                              <p className="text-sm text-muted-foreground">{msg.trigger}</p>
                            </div>
                          </div>
                          <div className="mt-3">
                            <p className="text-xs text-muted-foreground mb-1">Conteúdo incluído:</p>
                            <div className="flex flex-wrap gap-1">
                              {msg.content.map((item, i) => (
                                <Badge key={i} variant="outline" className="text-xs">{item}</Badge>
                              ))}
                            </div>
                          </div>
                          <details className="mt-3">
                            <summary className="text-xs text-primary cursor-pointer">Ver exemplo</summary>
                            <pre className="mt-2 p-3 bg-secondary rounded text-xs whitespace-pre-wrap overflow-x-auto">
                              {msg.example}
                            </pre>
                          </details>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Scheduler Jobs */}
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Jobs Automáticos</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {whatsappReport.scheduler_jobs.map((job, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-secondary/50 rounded-lg">
                          <div>
                            <p className="font-medium font-mono text-sm">{job.job}</p>
                            <p className="text-xs text-muted-foreground">{job.description}</p>
                          </div>
                          <Badge variant="outline">{job.frequency}</Badge>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Notes */}
                <Card className="border-border bg-primary/5">
                  <CardHeader>
                    <CardTitle>Notas Importantes</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {whatsappReport.notes.map((note, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                          {note}
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Barbershop Detail Dialog */}
      <Dialog open={!!selectedBarbershop} onOpenChange={() => setSelectedBarbershop(null)}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {selectedBarbershop && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  {selectedBarbershop.barbershop.plan === 'premium' && <Crown className="w-5 h-5 text-primary" />}
                  {selectedBarbershop.barbershop.name}
                </DialogTitle>
              </DialogHeader>
              
              <div className="space-y-4">
                {/* Quick Stats */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="text-center p-3 bg-secondary rounded-lg">
                    <p className="text-2xl font-bold">{selectedBarbershop.stats.total_appointments}</p>
                    <p className="text-xs text-muted-foreground">Agendamentos</p>
                  </div>
                  <div className="text-center p-3 bg-secondary rounded-lg">
                    <p className="text-2xl font-bold text-green-500">{formatCurrency(selectedBarbershop.stats.total_revenue)}</p>
                    <p className="text-xs text-muted-foreground">Faturamento</p>
                  </div>
                  <div className="text-center p-3 bg-secondary rounded-lg">
                    <p className="text-2xl font-bold text-yellow-500">{selectedBarbershop.stats.vip_clients_count}</p>
                    <p className="text-xs text-muted-foreground">Clientes VIP</p>
                  </div>
                </div>

                {/* Owner Info */}
                <div>
                  <h4 className="font-medium mb-2">Dono</h4>
                  <div className="p-3 bg-secondary rounded-lg">
                    <p>{selectedBarbershop.owner?.name || 'N/A'}</p>
                    <p className="text-sm text-muted-foreground">{selectedBarbershop.owner?.email}</p>
                  </div>
                </div>

                {/* Status Actions */}
                <div>
                  <h4 className="font-medium mb-2">Ações</h4>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant={selectedBarbershop.barbershop.plan_status === 'active' ? 'default' : 'outline'}
                      onClick={() => updateBarbershopStatus(selectedBarbershop.barbershop.barbershop_id, 'active')}
                    >
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Ativar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      onClick={() => updateBarbershopStatus(selectedBarbershop.barbershop.barbershop_id, 'expired')}
                    >
                      <XCircle className="w-4 h-4 mr-1" />
                      Expirar
                    </Button>
                    <Button 
                      size="sm" 
                      variant="destructive"
                      onClick={() => updateBarbershopStatus(selectedBarbershop.barbershop.barbershop_id, 'suspended')}
                    >
                      <AlertTriangle className="w-4 h-4 mr-1" />
                      Suspender
                    </Button>
                  </div>
                </div>

                {/* Services */}
                <div>
                  <h4 className="font-medium mb-2">Serviços ({selectedBarbershop.services.length})</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedBarbershop.services.map((s, i) => (
                      <Badge key={i} variant="outline">
                        {s.name} - {formatCurrency(s.price)}
                      </Badge>
                    ))}
                  </div>
                </div>

                {/* Link */}
                <div>
                  <a 
                    href={`/b/${selectedBarbershop.barbershop.slug}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-primary hover:underline text-sm"
                  >
                    <ExternalLink className="w-4 h-4" />
                    Ver página pública
                  </a>
                </div>

                {/* Delete Section */}
                <div className="border-t border-destructive/30 pt-4 mt-4">
                  <div className="bg-destructive/10 rounded-lg p-4">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h4 className="font-medium text-destructive mb-1">Zona de Perigo</h4>
                        <p className="text-sm text-muted-foreground mb-3">
                          Excluir permanentemente esta barbearia e todos os dados relacionados.
                          Esta ação não pode ser desfeita.
                        </p>
                        <Button 
                          variant="destructive"
                          size="sm"
                          onClick={() => deleteBarbershop(
                            selectedBarbershop.barbershop.barbershop_id,
                            selectedBarbershop.barbershop.name
                          )}
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Excluir Barbearia
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
