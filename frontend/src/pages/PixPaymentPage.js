import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  QrCode, 
  Copy, 
  CheckCircle, 
  Clock, 
  ArrowLeft,
  Loader2,
  RefreshCw
} from 'lucide-react';
import { toast } from 'sonner';

export default function PixPaymentPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const { checkAuth } = useAuth();
  const [copied, setCopied] = useState(false);
  const [status, setStatus] = useState('pending'); // pending, processing, approved
  const [checking, setChecking] = useState(false);
  const [timeLeft, setTimeLeft] = useState(30 * 60); // 30 minutes in seconds
  
  const pixData = location.state?.pixData;
  const plan = location.state?.plan;

  // Redirect if no PIX data
  useEffect(() => {
    if (!pixData || !pixData.pix_qr_code) {
      toast.error('Dados do PIX não encontrados');
      navigate('/escolher-plano');
    }
  }, [pixData, navigate]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || status === 'approved') return;
    
    const timer = setInterval(() => {
      setTimeLeft(prev => prev - 1);
    }, 1000);
    
    return () => clearInterval(timer);
  }, [timeLeft, status]);

  // Poll for payment status - ONLY checks, NEVER activates
  useEffect(() => {
    if (!pixData?.payment_id || status === 'approved') return;
    
    const pollInterval = setInterval(async () => {
      try {
        const response = await api.get(`/payment/pix-status/${pixData.payment_id}`);
        
        // ONLY redirect if backend confirms plan_status is 'active'
        // The backend only returns 'approved' status if plan_status === 'active'
        if (response.data.status === 'approved' && response.data.redirect_to === '/dashboard') {
          setStatus('approved');
          toast.success('Pagamento confirmado!');
          clearInterval(pollInterval);
          // Refresh auth to update barbershop data
          await checkAuth();
          setTimeout(() => navigate('/dashboard'), 2000);
        } else if (response.data.status === 'processing') {
          setStatus('processing');
        }
        // If status is still 'pending', keep polling
      } catch (error) {
        console.error('Error checking PIX status:', error);
      }
    }, 5000); // Check every 5 seconds
    
    return () => clearInterval(pollInterval);
  }, [pixData, status, navigate, checkAuth]);

  const handleCopyCode = () => {
    if (pixData?.pix_qr_code) {
      navigator.clipboard.writeText(pixData.pix_qr_code);
      setCopied(true);
      toast.success('Código PIX copiado!');
      setTimeout(() => setCopied(false), 3000);
    }
  };

  const handleCheckStatus = async () => {
    if (!pixData?.payment_id) return;
    
    setChecking(true);
    try {
      const response = await api.get(`/payment/pix-status/${pixData.payment_id}`);
      
      // ONLY redirect if backend confirms plan_status is 'active'
      if (response.data.status === 'approved' && response.data.redirect_to === '/dashboard') {
        setStatus('approved');
        toast.success('Pagamento confirmado!');
        await checkAuth();
        setTimeout(() => navigate('/dashboard'), 2000);
      } else if (response.data.status === 'processing') {
        setStatus('processing');
        toast.info('Pagamento detectado! Processando ativação...');
      } else {
        toast.info('Aguardando confirmação do pagamento...');
      }
    } catch (error) {
      toast.error('Erro ao verificar status');
    } finally {
      setChecking(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  if (!pixData) {
    return null;
  }

  // Payment confirmed by webhook
  if (status === 'approved') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <Card className="max-w-md w-full border-green-500/50 bg-green-500/10">
          <CardContent className="py-12 text-center">
            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-500" />
            </div>
            <h1 className="font-heading text-2xl uppercase text-green-500 mb-2">
              Pagamento Confirmado!
            </h1>
            <p className="text-muted-foreground mb-6">
              Seu pagamento foi processado com sucesso.
            </p>
            <p className="text-sm text-muted-foreground">
              Redirecionando para o dashboard...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-lg mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/escolher-plano')}
          className="mb-6"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Button>

        <Card className="border-primary/30">
          <CardContent className="py-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-4">
                <QrCode className="w-8 h-8 text-primary" />
              </div>
              <h1 className="font-heading text-2xl uppercase mb-2">
                Pagamento PIX
              </h1>
              <p className="text-muted-foreground">
                Escaneie o QR Code ou copie o código
              </p>
            </div>

            {/* Processing Status */}
            {status === 'processing' && (
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4 mb-6">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-5 h-5 text-yellow-500 animate-spin" />
                  <div>
                    <p className="font-medium text-yellow-500">Processando...</p>
                    <p className="text-sm text-muted-foreground">Pagamento detectado, ativando sua conta...</p>
                  </div>
                </div>
              </div>
            )}

            {/* Plan Info */}
            <div className="bg-secondary/50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Plano</span>
                <span className="font-medium">{plan?.name}</span>
              </div>
              <div className="flex justify-between items-center mt-2">
                <span className="text-muted-foreground">Valor</span>
                <span className="font-heading text-xl text-primary">
                  R$ {plan?.price?.toFixed(2)}
                </span>
              </div>
            </div>

            {/* QR Code */}
            <div className="flex justify-center mb-6">
              {pixData.pix_qr_code_base64 ? (
                <img 
                  src={`data:image/png;base64,${pixData.pix_qr_code_base64}`}
                  alt="QR Code PIX"
                  className="w-64 h-64 rounded-lg bg-white p-2"
                  data-testid="pix-qr-code"
                />
              ) : (
                <div className="w-64 h-64 bg-secondary/50 rounded-lg flex items-center justify-center">
                  <QrCode className="w-32 h-32 text-muted-foreground" />
                </div>
              )}
            </div>

            {/* Copy Code Button */}
            <div className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleCopyCode}
                data-testid="copy-pix-code"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    Copiado!
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4 mr-2" />
                    Copiar código PIX
                  </>
                )}
              </Button>

              {/* PIX Code Display */}
              <div className="bg-secondary/30 rounded-lg p-3">
                <p className="text-xs text-muted-foreground text-center break-all font-mono">
                  {pixData.pix_qr_code?.substring(0, 100)}...
                </p>
              </div>
            </div>

            {/* Timer */}
            <div className="flex items-center justify-center gap-2 mt-6 text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span className="text-sm">
                Expira em: <span className="font-mono font-medium">{formatTime(timeLeft)}</span>
              </span>
            </div>

            {/* Check Status Button */}
            <Button
              variant="default"
              className="w-full mt-6"
              onClick={handleCheckStatus}
              disabled={checking || status === 'processing'}
              data-testid="check-pix-status"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Verificando...
                </>
              ) : (
                <>
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Já fiz o pagamento
                </>
              )}
            </Button>

            {/* Instructions */}
            <div className="mt-8 space-y-3">
              <h3 className="font-medium text-sm">Como pagar:</h3>
              <ol className="text-sm text-muted-foreground space-y-2">
                <li className="flex gap-2">
                  <span className="font-medium text-primary">1.</span>
                  Abra o app do seu banco
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-primary">2.</span>
                  Escolha pagar via PIX
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-primary">3.</span>
                  Escaneie o QR Code ou cole o código
                </li>
                <li className="flex gap-2">
                  <span className="font-medium text-primary">4.</span>
                  Confirme o pagamento
                </li>
              </ol>
            </div>

            {/* Auto-update notice */}
            <p className="text-xs text-center text-muted-foreground mt-6">
              Esta página atualiza automaticamente quando o pagamento for confirmado pelo banco.
              <br />
              <strong>Não feche esta página.</strong>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
