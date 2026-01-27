import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import DashboardLayout from '../components/layouts/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from '../components/ui/dialog';
import { 
  Crown, 
  Plus, 
  Users, 
  CreditCard,
  Calendar,
  Percent,
  Trash2,
  Edit,
  Loader2,
  CheckCircle,
  XCircle,
  Phone,
  UserPlus
} from 'lucide-react';
import { toast } from 'sonner';

export default function ClientPlansPage() {
  const { barbershop } = useAuth();
  const [loading, setLoading] = useState(true);
  const [plans, setPlans] = useState([]);
  const [subscriptions, setSubscriptions] = useState([]);
  const [showPlanDialog, setShowPlanDialog] = useState(false);
  const [showSubscriptionDialog, setShowSubscriptionDialog] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [selectedPlanForSubscription, setSelectedPlanForSubscription] = useState(null);
  
  const [planForm, setPlanForm] = useState({
    name: '',
    description: '',
    price: '',
    duration_days: '30',
    benefits: '',
    discount_percentage: '',
    max_appointments: ''
  });

  const [subscriptionForm, setSubscriptionForm] = useState({
    client_name: '',
    client_phone: '',
    client_email: ''
  });

  const isPremium = barbershop?.plan === 'premium';

  useEffect(() => {
    if (isPremium) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [isPremium]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [plansRes, subsRes] = await Promise.all([
        api.get('/client-plans'),
        api.get('/client-subscriptions')
      ]);
      setPlans(plansRes.data);
      setSubscriptions(subsRes.data);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleSavePlan = async () => {
    try {
      const data = {
        name: planForm.name,
        description: planForm.description || null,
        price: parseFloat(planForm.price),
        duration_days: parseInt(planForm.duration_days),
        benefits: planForm.benefits ? planForm.benefits.split('\n').filter(b => b.trim()) : [],
        discount_percentage: planForm.discount_percentage ? parseFloat(planForm.discount_percentage) : null,
        max_appointments: planForm.max_appointments ? parseInt(planForm.max_appointments) : null
      };

      if (editingPlan) {
        await api.put(`/client-plans/${editingPlan.plan_id}`, data);
        toast.success('Plano atualizado!');
      } else {
        await api.post('/client-plans', data);
        toast.success('Plano criado!');
      }

      setShowPlanDialog(false);
      resetPlanForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao salvar plano');
    }
  };

  const handleDeletePlan = async (planId) => {
    if (!confirm('Tem certeza que deseja excluir este plano?')) return;

    try {
      await api.delete(`/client-plans/${planId}`);
      toast.success('Plano excluído!');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao excluir plano');
    }
  };

  const handleCreateSubscription = async () => {
    if (!selectedPlanForSubscription) return;

    try {
      await api.post('/client-subscriptions', {
        client_plan_id: selectedPlanForSubscription.plan_id,
        client_name: subscriptionForm.client_name,
        client_phone: subscriptionForm.client_phone,
        client_email: subscriptionForm.client_email || null
      });
      
      toast.success('Assinatura criada! Cliente notificado por WhatsApp.');
      setShowSubscriptionDialog(false);
      resetSubscriptionForm();
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao criar assinatura');
    }
  };

  const handleRenewSubscription = async (subscriptionId) => {
    try {
      await api.post(`/client-subscriptions/${subscriptionId}/renew`);
      toast.success('Assinatura renovada!');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao renovar');
    }
  };

  const handleCancelSubscription = async (subscriptionId) => {
    if (!confirm('Tem certeza que deseja cancelar esta assinatura?')) return;

    try {
      await api.post(`/client-subscriptions/${subscriptionId}/cancel`);
      toast.success('Assinatura cancelada');
      loadData();
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cancelar');
    }
  };

  const resetPlanForm = () => {
    setPlanForm({
      name: '',
      description: '',
      price: '',
      duration_days: '30',
      benefits: '',
      discount_percentage: '',
      max_appointments: ''
    });
    setEditingPlan(null);
  };

  const resetSubscriptionForm = () => {
    setSubscriptionForm({
      client_name: '',
      client_phone: '',
      client_email: ''
    });
    setSelectedPlanForSubscription(null);
  };

  const openEditPlan = (plan) => {
    setEditingPlan(plan);
    setPlanForm({
      name: plan.name,
      description: plan.description || '',
      price: plan.price.toString(),
      duration_days: plan.duration_days.toString(),
      benefits: (plan.benefits || []).join('\n'),
      discount_percentage: plan.discount_percentage?.toString() || '',
      max_appointments: plan.max_appointments?.toString() || ''
    });
    setShowPlanDialog(true);
  };

  const openAddSubscription = (plan) => {
    setSelectedPlanForSubscription(plan);
    setShowSubscriptionDialog(true);
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

  if (!isPremium) {
    return (
      <DashboardLayout>
        <div className="space-y-6">
          <div>
            <h1 className="font-heading text-3xl font-bold uppercase tracking-tight">
              Planos para Clientes
            </h1>
            <p className="text-muted-foreground">
              Crie planos de fidelidade e mensalidades para seus clientes
            </p>
          </div>

          <Card className="border-border border-dashed" data-testid="premium-required-card">
            <CardContent className="py-12 text-center">
              <Crown className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
              <h3 className="text-2xl font-bold mb-2">Recurso Premium</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Com o Plano Premium você pode criar planos de fidelidade, mensalidades e 
                pacotes personalizados para seus clientes.
              </p>
              <ul className="text-left max-w-sm mx-auto space-y-2 mb-6">
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Crie planos ilimitados</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Defina descontos e benefícios</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Gerencie assinaturas dos clientes</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Notificações automáticas por WhatsApp</span>
                </li>
              </ul>
              <Button className="btn-press" data-testid="upgrade-button">
                <Crown className="w-4 h-4 mr-2" />
                Fazer Upgrade - R$ 99,90/mês
              </Button>
            </CardContent>
          </Card>
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
            <h1 className="font-heading text-3xl font-bold uppercase tracking-tight flex items-center gap-2" data-testid="client-plans-title">
              <Crown className="w-8 h-8 text-yellow-500" />
              Planos para Clientes
            </h1>
            <p className="text-muted-foreground">
              Gerencie planos de fidelidade e mensalidades
            </p>
          </div>
          <Dialog open={showPlanDialog} onOpenChange={(open) => { setShowPlanDialog(open); if (!open) resetPlanForm(); }}>
            <DialogTrigger asChild>
              <Button className="btn-press" data-testid="create-plan-button">
                <Plus className="w-4 h-4 mr-2" />
                Novo Plano
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>{editingPlan ? 'Editar Plano' : 'Criar Novo Plano'}</DialogTitle>
                <DialogDescription>
                  Configure os detalhes do plano para seus clientes
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Nome do Plano *</Label>
                  <Input
                    placeholder="Ex: Plano Mensal VIP"
                    value={planForm.name}
                    onChange={(e) => setPlanForm({ ...planForm, name: e.target.value })}
                    data-testid="plan-name-input"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Descrição</Label>
                  <Input
                    placeholder="Descrição do plano..."
                    value={planForm.description}
                    onChange={(e) => setPlanForm({ ...planForm, description: e.target.value })}
                    data-testid="plan-description-input"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Valor (R$) *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="99.90"
                      value={planForm.price}
                      onChange={(e) => setPlanForm({ ...planForm, price: e.target.value })}
                      data-testid="plan-price-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Duração (dias)</Label>
                    <Input
                      type="number"
                      placeholder="30"
                      value={planForm.duration_days}
                      onChange={(e) => setPlanForm({ ...planForm, duration_days: e.target.value })}
                      data-testid="plan-duration-input"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Desconto (%)</Label>
                    <Input
                      type="number"
                      placeholder="10"
                      value={planForm.discount_percentage}
                      onChange={(e) => setPlanForm({ ...planForm, discount_percentage: e.target.value })}
                      data-testid="plan-discount-input"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Máx. Agendamentos</Label>
                    <Input
                      type="number"
                      placeholder="Ilimitado"
                      value={planForm.max_appointments}
                      onChange={(e) => setPlanForm({ ...planForm, max_appointments: e.target.value })}
                      data-testid="plan-max-appointments-input"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Benefícios (um por linha)</Label>
                  <textarea
                    className="w-full min-h-[100px] px-3 py-2 rounded-md border border-input bg-background text-sm"
                    placeholder="4 cortes por mês&#10;Barba grátis&#10;Prioridade no agendamento"
                    value={planForm.benefits}
                    onChange={(e) => setPlanForm({ ...planForm, benefits: e.target.value })}
                    data-testid="plan-benefits-input"
                  />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => { setShowPlanDialog(false); resetPlanForm(); }}>
                  Cancelar
                </Button>
                <Button onClick={handleSavePlan} data-testid="save-plan-button">
                  {editingPlan ? 'Salvar' : 'Criar Plano'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {/* Plans List */}
        <div>
          <h2 className="font-heading text-xl font-bold uppercase mb-4">Seus Planos</h2>
          {plans.length === 0 ? (
            <Card className="border-border border-dashed">
              <CardContent className="py-8 text-center">
                <CreditCard className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum plano criado ainda</p>
                <p className="text-sm text-muted-foreground">Clique em "Novo Plano" para começar</p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {plans.map((plan) => (
                <Card key={plan.plan_id} className="border-border" data-testid={`plan-card-${plan.plan_id}`}>
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div>
                        <CardTitle className="text-lg">{plan.name}</CardTitle>
                        {plan.description && (
                          <CardDescription>{plan.description}</CardDescription>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm" onClick={() => openEditPlan(plan)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => handleDeletePlan(plan.plan_id)}>
                          <Trash2 className="w-4 h-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-primary">
                        {formatCurrency(plan.price)}
                      </span>
                      <span className="text-muted-foreground">/{plan.duration_days} dias</span>
                    </div>

                    {plan.benefits && plan.benefits.length > 0 && (
                      <ul className="space-y-1">
                        {plan.benefits.map((benefit, i) => (
                          <li key={i} className="flex items-center gap-2 text-sm">
                            <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                            <span>{benefit}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="flex gap-2 text-xs text-muted-foreground">
                      {plan.discount_percentage && (
                        <span className="flex items-center gap-1 bg-primary/10 px-2 py-1 rounded">
                          <Percent className="w-3 h-3" />
                          {plan.discount_percentage}% desconto
                        </span>
                      )}
                      {plan.max_appointments && (
                        <span className="flex items-center gap-1 bg-muted px-2 py-1 rounded">
                          <Calendar className="w-3 h-3" />
                          Máx {plan.max_appointments}
                        </span>
                      )}
                    </div>

                    <Button 
                      className="w-full" 
                      variant="outline"
                      onClick={() => openAddSubscription(plan)}
                      data-testid={`add-subscriber-${plan.plan_id}`}
                    >
                      <UserPlus className="w-4 h-4 mr-2" />
                      Adicionar Assinante
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Active Subscriptions */}
        <div>
          <h2 className="font-heading text-xl font-bold uppercase mb-4 flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Assinantes Ativos ({subscriptions.filter(s => s.status === 'active').length})
          </h2>
          {subscriptions.length === 0 ? (
            <Card className="border-border border-dashed">
              <CardContent className="py-8 text-center">
                <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Nenhum assinante ainda</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {subscriptions.map((sub) => (
                <Card key={sub.subscription_id} className="border-border" data-testid={`subscription-${sub.subscription_id}`}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          sub.status === 'active' ? 'bg-green-500/20' : 'bg-muted'
                        }`}>
                          {sub.status === 'active' ? (
                            <CheckCircle className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircle className="w-5 h-5 text-muted-foreground" />
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{sub.client_name}</p>
                          <p className="text-sm text-muted-foreground flex items-center gap-2">
                            <Phone className="w-3 h-3" />
                            {sub.client_phone}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-primary">{sub.plan_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {sub.status === 'active' ? 'Até ' : 'Expirou em '}
                          {new Date(sub.end_date).toLocaleDateString('pt-BR')}
                        </p>
                      </div>
                      <div className="flex gap-2">
                        {sub.status === 'active' ? (
                          <Button variant="outline" size="sm" onClick={() => handleCancelSubscription(sub.subscription_id)}>
                            Cancelar
                          </Button>
                        ) : (
                          <Button size="sm" onClick={() => handleRenewSubscription(sub.subscription_id)}>
                            Renovar
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Add Subscription Dialog */}
        <Dialog open={showSubscriptionDialog} onOpenChange={(open) => { setShowSubscriptionDialog(open); if (!open) resetSubscriptionForm(); }}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Adicionar Assinante</DialogTitle>
              <DialogDescription>
                {selectedPlanForSubscription && (
                  <>Cadastrar cliente no plano <strong>{selectedPlanForSubscription.name}</strong></>
                )}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Nome do Cliente *</Label>
                <Input
                  placeholder="Nome completo"
                  value={subscriptionForm.client_name}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, client_name: e.target.value })}
                  data-testid="subscription-name-input"
                />
              </div>
              <div className="space-y-2">
                <Label>WhatsApp *</Label>
                <Input
                  placeholder="(00) 00000-0000"
                  value={subscriptionForm.client_phone}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, client_phone: e.target.value })}
                  data-testid="subscription-phone-input"
                />
              </div>
              <div className="space-y-2">
                <Label>Email (opcional)</Label>
                <Input
                  type="email"
                  placeholder="email@exemplo.com"
                  value={subscriptionForm.client_email}
                  onChange={(e) => setSubscriptionForm({ ...subscriptionForm, client_email: e.target.value })}
                  data-testid="subscription-email-input"
                />
              </div>
              {selectedPlanForSubscription && (
                <div className="bg-muted/30 rounded-lg p-3">
                  <p className="text-sm text-muted-foreground">
                    O cliente receberá uma mensagem de boas-vindas no WhatsApp com os detalhes do plano.
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => { setShowSubscriptionDialog(false); resetSubscriptionForm(); }}>
                Cancelar
              </Button>
              <Button onClick={handleCreateSubscription} data-testid="save-subscription-button">
                Adicionar Assinante
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
