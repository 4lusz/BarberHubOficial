import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { CheckCircle, Loader2, Scissors, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export default function PaymentSuccessPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { checkAuth } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const activateBarbershop = async () => {
      try {
        // Get external_reference from URL params (contains user_id and plan_id)
        const externalRef = searchParams.get('external_reference');
        const paymentId = searchParams.get('payment_id');
        const status = searchParams.get('status');
        
        if (status === 'approved' || !status) {
          // Activate the barbershop
          const planId = externalRef?.split('_')[1] || 'comum';
          await api.post(`/barbershops/activate?plan_id=${planId}`);
          
          // Refresh auth state
          await checkAuth();
          
          toast.success('Pagamento confirmado! Sua barbearia está ativa.');
        } else {
          setError('Pagamento não aprovado. Por favor, tente novamente.');
        }
      } catch (err) {
        console.error('Activation error:', err);
        setError('Erro ao ativar barbearia. Por favor, entre em contato com o suporte.');
      } finally {
        setLoading(false);
      }
    };

    activateBarbershop();
  }, [searchParams, checkAuth]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="border-border max-w-md w-full">
          <CardContent className="py-12 text-center">
            <Loader2 className="w-12 h-12 text-primary mx-auto animate-spin mb-4" />
            <p className="text-lg">Confirmando seu pagamento...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="border-border max-w-md w-full">
          <CardContent className="py-12 text-center">
            <div className="w-16 h-16 rounded-full bg-destructive/10 flex items-center justify-center mx-auto mb-4">
              <Scissors className="w-8 h-8 text-destructive" />
            </div>
            <h2 className="text-xl font-bold mb-2">Ops!</h2>
            <p className="text-muted-foreground mb-6">{error}</p>
            <Button onClick={() => navigate('/pagamento')} data-testid="retry-payment-button">
              Tentar Novamente
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

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
            onClick={() => navigate('/dashboard')} 
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
