import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle, Loader2, Clock, ArrowRight, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const { checkAuth } = useAuth();
  const [status, setStatus] = useState('checking'); // checking, approved, pending
  const [checking, setChecking] = useState(false);
  const initialized = useRef(false);

  // Check payment status
  const checkPaymentStatus = async () => {
    try {
      // Refresh auth to get latest barbershop status
      await checkAuth();
      
      // Check barbershop status from backend
      const response = await api.get('/barbershops/me');
      const currentStatus = response.data?.plan_status;
      
      if (currentStatus === 'active') {
        setStatus('approved');
        return true;
      } else {
        setStatus('pending');
        return false;
      }
    } catch (error) {
      console.error('Error checking status:', error);
      setStatus('pending');
      return false;
    }
  };

  // Check payment status on mount
  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    
    checkPaymentStatus().then(approved => {
      if (approved) {
        toast.success('Pagamento confirmado!');
      }
    });
  }, []);

  // Poll for status updates if pending
  useEffect(() => {
    if (status !== 'pending') return;
    
    const pollInterval = setInterval(async () => {
      const approved = await checkPaymentStatus();
      if (approved) {
        toast.success('Pagamento confirmado!');
        clearInterval(pollInterval);
      }
    }, 5000);
    
    return () => clearInterval(pollInterval);
  }, [status]);

  const handleManualCheck = async () => {
    setChecking(true);
    const approved = await checkPaymentStatus();
    setChecking(false);
    
    if (approved) {
      toast.success('Pagamento confirmado!');
    } else {
      toast.info('Aguardando confirmação do pagamento...');
    }
  };

  const handleGoToDashboard = async () => {
    await checkAuth();
    navigate('/dashboard');
  };

  // Show loading state
  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="border-border max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin mb-4" />
            <p className="text-lg">Verificando seu pagamento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment approved - show success
  if (status === 'approved') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="border-border max-w-md w-full">
          <CardHeader className="text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <CardTitle className="font-heading text-2xl uppercase">
              Pagamento Confirmado!
            </CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-6">
            <p className="text-muted-foreground">
              Sua barbearia foi ativada com sucesso. Agora você pode começar a receber agendamentos!
            </p>
            
            <div className="bg-primary/10 rounded-lg p-4">
              <p className="text-sm text-muted-foreground mb-1">Próximo passo</p>
              <p className="font-medium">Configure seus serviços e horários de funcionamento</p>
            </div>

            <Button 
              onClick={handleGoToDashboard} 
              className="w-full btn-press"
              data-testid="go-to-dashboard-button"
            >
              Ir para o Dashboard
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Payment pending - waiting for webhook confirmation
  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="border-border max-w-md w-full">
        <CardHeader className="text-center">
          <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mx-auto mb-4">
            <Clock className="w-10 h-10 text-yellow-500" />
          </div>
          <CardTitle className="font-heading text-2xl uppercase">
            Aguardando Confirmação
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center space-y-6">
          <p className="text-muted-foreground">
            Seu pagamento está sendo processado. Isso pode levar alguns minutos.
          </p>
          
          <div className="bg-yellow-500/10 rounded-lg p-4">
            <p className="text-sm text-yellow-600">
              Esta página atualiza automaticamente quando o pagamento for confirmado.
            </p>
          </div>

          <div className="space-y-3">
            <Button 
              onClick={handleManualCheck}
              variant="outline"
              className="w-full"
              disabled={checking}
              data-testid="check-status-button"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Verificar Status
                </>
              )}
            </Button>
            
            <Button 
              onClick={() => navigate('/escolher-plano')}
              variant="ghost"
              className="w-full text-muted-foreground"
              data-testid="back-to-plans-button"
            >
              Voltar para Planos
            </Button>
          </div>

          <p className="text-xs text-muted-foreground">
            Se o pagamento não for confirmado em alguns minutos, verifique se a transação foi concluída no seu banco ou cartão.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
