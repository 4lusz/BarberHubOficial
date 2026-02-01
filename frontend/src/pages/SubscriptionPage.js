import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);

  const handleCancelSubscription = async () => {
    setCancelling(true);
    try {
      await api.post('/subscription/cancel');
      toast.success('Assinatura cancelada.');
      
      // Refresh barbershop data
      const barbershopRes = await api.get('/barbershops/me');
      updateBarbershop(barbershopRes.data);
      
      toast.success(response.data.message || 'Assinatura cancelada. Você terá acesso até o fim do período pago.');
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Erro ao cancelar assinatura');
    } finally {
      setCancelling(false);
    }
  };

  const handleUpgrade = () => {
    navigate('/pagamento?plano=premium');
  };

  const handleChangePlan = () => {
    navigate('/escolher-plano');
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      return format(new Date(dateStr), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    } catch {
      return dateStr;
    }
  };

  const currentPlan = PLANS[barbershop?.plan] || PLANS.comum;
  const isPremium = barbershop?.plan === 'premium';
  const isCancelled = barbershop?.cancelled_at && !barbershop?.auto_renew;

  if (loading || !barbershop) {
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

      {/* Cancellation Notice */}
      {isCancelled && (
        <Card className="border-yellow-500/50 bg-yellow-500/10">
          <CardContent className="py-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="font-medium text-yellow-500">Renovação automática cancelada</p>
                <p className="text-sm text-muted-foreground">
                  Você terá acesso até {formatDate(barbershop?.plan_expires_at)}. 
                  Após essa data, escolha um novo plano para continuar usando.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

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
            {isCancelled ? (
              <Badge className="bg-yellow-500/20 text-yellow-500 border-yellow-500/30" data-testid="subscription-status">
                <Clock className="w-4 h-4 mr-1" />
                Cancelado
              </Badge>
            ) : (
              <Badge className="bg-green-500/20 text-green-500 border-green-500/30" data-testid="subscription-status">
                <CheckCircle className="w-4 h-4 mr-1" />
                Ativo
              </Badge>
            )}
          </div>
          
          <p className="text-sm text-muted-foreground mt-4">
            {isCancelled 
              ? `Acesso válido até ${formatDate(barbershop?.plan_expires_at)}.`
              : 'Sua assinatura está ativa e funcionando normalmente.'
            }
          </p>
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
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-muted-foreground">Status</span>
              <span className="text-green-500">Ativo</span>
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
                <span className="text-white text-xs font-bold">MP</span>
              </div>
              <div className="flex-1">
                <p className="font-medium">Mercado Pago</p>
                <p className="text-sm text-muted-foreground">
                  Cartão ou Pix cadastrado
                </p>
              </div>
            </div>
            
            <Button 
              variant="outline" 
              className="w-full"
              onClick={handleChangePlan}
              data-testid="change-payment-button"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Alterar Plano ou Forma de Pagamento
            </Button>
            
            <p className="text-xs text-muted-foreground mt-3 text-center">
              Ao alterar, você será redirecionado para escolher um novo plano e forma de pagamento.
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

      {/* Cancel Section */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="font-heading text-lg uppercase flex items-center gap-2">
            <Shield className="w-5 h-5 text-primary" />
            Ações da Assinatura
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!showCancelConfirm ? (
            <div className="flex items-center justify-between p-4 bg-secondary/50 rounded-lg">
              <div>
                <p className="font-medium">Cancelar Assinatura</p>
                <p className="text-sm text-muted-foreground">
                  Você perderá o acesso ao dashboard e funcionalidades
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
          ) : (
            <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="font-medium text-red-500">Confirmar Cancelamento</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Tem certeza que deseja cancelar sua assinatura? Você perderá o acesso ao dashboard 
                    e todas as funcionalidades imediatamente.
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
