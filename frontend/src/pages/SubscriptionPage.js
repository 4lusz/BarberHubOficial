import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { 
  CreditCard, 
  Crown, 
  Calendar, 
  AlertTriangle, 
  CheckCircle,
  XCircle,
  RefreshCw,
  ExternalLink,
  Shield,
  Clock,
  Zap
} from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const PLANS = {
  comum: {
    name: 'Plano Comum',
    price: 49.90,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30'
  },
  premium: {
    name: 'Plano Premium',
    price: 99.90,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    borderColor: 'border-primary/30'
  }
};

export default function SubscriptionPage() {
  const { barbershop, updateBarbershop } = useAuth();
  const [loading, setLoading] = useState(true);
  const [subscriptionInfo, setSubscriptionInfo] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  useEffect(() => {
    fetchSubscriptionInfo();
  }, []);

  const fetchSubscriptionInfo = async () => {
    try {
      const response = await api.get('/subscription/info');
      setSubscriptionInfo(response.data);
    } catch (error) {
      // Se não tiver info de assinatura, usa dados do barbershop
      setSubscriptionInfo(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      await api.post('/subscription/cancel');
      toast.success('Assinatura cancelada. Você ainda terá acesso até o fim do período pago.');
      fetchSubscriptionInfo();
      setShowCancelConfirm(false);
      // Refresh barbershop data
      const barbershopRes = await api.get('/barbershops/me');
      updateBarbershop(barbershopRes.data);
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cancelar assinatura');
    } finally {
      setCancelling(false);
    }
  };

  const handleRenewSubscription = () => {
    window.location.href = `/pagamento?plano=${barbershop?.plan || 'comum'}`;
  };

  const handleUpgrade = () => {
    window.location.href = '/pagamento?plano=premium';
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const getStatusInfo = () => {
    const status = barbershop?.plan_status;
    
    switch (status) {
      case 'active':
        return {
          label: 'Ativo',
          color: 'bg-green-500/20 text-green-500 border-green-500/30',
          icon: CheckCircle,
          description: 'Sua assinatura está ativa e funcionando normalmente.'
        };
      case 'pending':
        return {
          label: 'Pendente',
          color: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
          icon: Clock,
          description: 'Aguardando confirmação do pagamento.'
        };
      case 'expired':
        return {
          label: 'Expirado',
          color: 'bg-red-500/20 text-red-500 border-red-500/30',
          icon: AlertTriangle,
          description: 'Sua assinatura expirou. Renove para continuar usando.'
        };
      case 'cancelled':
        return {
          label: 'Cancelado',
          color: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
          icon: XCircle,
          description: 'Assinatura cancelada. Você pode reativar a qualquer momento.'
        };
      default:
        return {
          label: 'Desconhecido',
          color: 'bg-gray-500/20 text-gray-500 border-gray-500/30',
          icon: AlertTriangle,
          description: ''
        };
    }
  };

  const statusInfo = getStatusInfo();
  const currentPlan = PLANS[barbershop?.plan] || PLANS.comum;
  const isActive = barbershop?.plan_status === 'active';
  const isPremium = barbershop?.plan === 'premium';

  if (loading) {
    return (
      <div className="space-y-6 animate-fade-in">
        <div className="skeleton h-8 w-64" />
        <div className="skeleton h-48 w-full" />
        <div className="skeleton h-32 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight">
          Minha Assinatura
        </h1>
        <p className="text-muted-foreground mt-1">
          Gerencie seu plano e método de pagamento
        </p>
      </div>

      {/* Current Plan Card */}
      <Card className={`border-2 ${currentPlan.borderColor}`}>
        <CardContent className="py-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className={`w-14 h-14 rounded-xl ${currentPlan.bgColor} flex items-center justify-center`}>
                <Crown className={`w-7 h-7 ${currentPlan.color}`} />
              </div>
              <div>
                <h2 className={`font-heading text-2xl uppercase ${currentPlan.color}`}>
                  {currentPlan.name}
                </h2>
                <p className="text-muted-foreground">
                  R$ {currentPlan.price.toFixed(2)}/mês
                </p>
              </div>
            </div>
            <Badge className={statusInfo.color} data-testid="subscription-status">
              <statusInfo.icon className="w-4 h-4 mr-1" />
              {statusInfo.label}
            </Badge>
          </div>
          
          {statusInfo.description && (
            <p className="text-sm text-muted-foreground mt-4">
              {statusInfo.description}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Subscription Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Billing Info */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg uppercase flex items-center gap-2">
              <Calendar className="w-5 h-5 text-primary" />
              Detalhes da Cobrança
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Status</span>
              <span className={isActive ? 'text-green-500' : 'text-red-500'}>
                {isActive ? 'Ativo' : 'Inativo'}
              </span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Próxima cobrança</span>
              <span>{formatDate(barbershop?.plan_expires_at)}</span>
            </div>
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Valor mensal</span>
              <span className="font-medium">R$ {currentPlan.price.toFixed(2)}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-muted-foreground">Tipo de cobrança</span>
              <span>Recorrente (automática)</span>
            </div>
          </CardContent>
        </Card>

        {/* Payment Method */}
        <Card className="border-border">
          <CardHeader>
            <CardTitle className="font-heading text-lg uppercase flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-primary" />
              Método de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4 p-4 bg-secondary/50 rounded-lg mb-4">
              <div className="w-12 h-8 bg-gradient-to-r from-blue-600 to-blue-400 rounded flex items-center justify-center">
                <span className="text-white text-xs font-bold">CARD</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">Gerenciado pelo Mercado Pago</p>
                <p className="text-sm text-muted-foreground">
                  Cartão ou Pix cadastrado na sua conta
                </p>
              </div>
            </div>
            
            <a
              href="https://www.mercadopago.com.br/subscriptions"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Gerenciar pagamento no Mercado Pago
            </a>
            
            <p className="text-xs text-muted-foreground mt-3">
              Para alterar o cartão ou método de pagamento, acesse sua conta no Mercado Pago.
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Upgrade Banner (if not premium) */}
      {!isPremium && (
        <Card className="border-primary/50 bg-gradient-to-r from-primary/10 to-primary/5">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-primary/20 flex items-center justify-center">
                  <Zap className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-heading text-lg uppercase text-primary">
                    Faça Upgrade para Premium
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    Desbloqueie relatórios, clientes VIP e muito mais!
                  </p>
                </div>
              </div>
              <Button onClick={handleUpgrade} className="btn-press" data-testid="upgrade-button">
                <Crown className="w-4 h-4 mr-2" />
                Fazer Upgrade
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Actions */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg uppercase flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Ações da Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Renew Button */}
          {(barbershop?.plan_status === 'expired' || barbershop?.plan_status === 'cancelled') && (
            <div className="flex items-center justify-between p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
              <div>
                <p className="font-medium text-green-500">Reativar Assinatura</p>
                <p className="text-sm text-muted-foreground">
                  Volte a ter acesso a todas as funcionalidades
                </p>
              </div>
              <Button onClick={handleRenewSubscription} className="bg-green-500 hover:bg-green-600" data-testid="renew-button">
                <RefreshCw className="w-4 h-4 mr-2" />
                Reativar
              </Button>
            </div>
          )}

          {/* Cancel Section */}
          {isActive && !showCancelConfirm && (
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-medium">Cancelar Assinatura</p>
                <p className="text-sm text-muted-foreground">
                  Você continuará com acesso até o fim do período pago
                </p>
              </div>
              <Button 
                variant="outline" 
                className="text-red-500 border-red-500/50 hover:bg-red-500/10"
                onClick={() => setShowCancelConfirm(true)}
                data-testid="cancel-button"
              >
                Cancelar Plano
              </Button>
            </div>
          )}

          {/* Cancel Confirmation */}
          {showCancelConfirm && (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-500">Confirmar Cancelamento</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tem certeza que deseja cancelar sua assinatura? Você perderá acesso às funcionalidades premium 
                    após o término do período atual ({formatDate(barbershop?.plan_expires_at)}).
                  </p>
                </div>
              </div>
              <div className="flex gap-3 justify-end">
                <Button 
                  variant="outline" 
                  onClick={() => setShowCancelConfirm(false)}
                  data-testid="cancel-back-button"
                >
                  Voltar
                </Button>
                <Button 
                  variant="destructive"
                  onClick={handleCancelSubscription}
                  disabled={cancelling}
                  data-testid="confirm-cancel-button"
                >
                  {cancelling ? 'Cancelando...' : 'Sim, Cancelar Assinatura'}
                </Button>
              </div>
            </div>
          )}

          {/* Help */}
          <div className="text-center pt-4 border-t border-border">
            <p className="text-sm text-muted-foreground">
              Precisa de ajuda? Entre em contato pelo WhatsApp ou email.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
