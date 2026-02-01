import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { RadioGroup, RadioGroupItem } from '../components/ui/radio-group';
import { 
  Scissors, 
  CreditCard, 
  QrCode, 
  Lock, 
  ArrowLeft,
  Loader2,
  MapPin
} from 'lucide-react';
import { toast } from 'sonner';

const plans = {
  comum: { name: 'Plano Comum', price: 49.90 },
  premium: { name: 'Plano Premium', price: 99.90 }
};

export default function PaymentPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, barbershop, checkAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('pix');
  const [hasBarbershop, setHasBarbershop] = useState(false);
  const [barbershopData, setBarbershopData] = useState({
    name: '',
    address: '',
    phone: '',
    latitude: null,
    longitude: null,
  });
  const [formData, setFormData] = useState({
    customer_name: user?.name || '',
    customer_email: user?.email || '',
    customer_document: '', // CPF
  });

  const planId = searchParams.get('plano');
  const plan = plans[planId];

  useEffect(() => {
    if (!planId || !plan) {
      navigate('/escolher-plano');
    }
  }, [planId, plan, navigate]);

  // Load existing barbershop data if user has one with pending/cancelled status
  useEffect(() => {
    if (barbershop && barbershop.plan_status !== 'active') {
      setHasBarbershop(true);
      setBarbershopData({
        name: barbershop.name || '',
        address: barbershop.address || '',
        phone: barbershop.phone || '',
        latitude: barbershop.latitude || null,
        longitude: barbershop.longitude || null,
      });
    }
  }, [barbershop]);

  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        customer_name: user.name || '',
        customer_email: user.email || '',
      }));
    }
  }, [user]);

  const formatCPF = (value) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const handleCPFChange = (e) => {
    const formatted = formatCPF(e.target.value);
    setFormData({ ...formData, customer_document: formatted });
  };

  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      toast.error('Geolocalização não é suportada pelo seu navegador');
      return;
    }

    toast.info('Obtendo sua localização...');
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setBarbershopData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        }));
        toast.success('Localização obtida com sucesso!');
      },
      (error) => {
        console.error('Geolocation error:', error);
        toast.error('Não foi possível obter sua localização');
      }
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!barbershopData.name.trim()) {
      toast.error('Por favor, informe o nome da barbearia');
      return;
    }

    if (formData.customer_document.replace(/\D/g, '').length !== 11) {
      toast.error('CPF inválido');
      return;
    }

    setLoading(true);

    try {
      // Create or update barbershop (backend handles both cases)
      await api.post('/barbershops', {
        name: barbershopData.name,
        address: barbershopData.address,
        phone: barbershopData.phone,
        latitude: barbershopData.latitude,
        longitude: barbershopData.longitude,
      });

      // Refresh auth to get updated barbershop_id
      await checkAuth();

      // Then process payment/subscription
      const paymentResponse = await api.post('/subscription/create', {
        plan_id: planId,
        payment_method: paymentMethod,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_document: formData.customer_document.replace(/\D/g, ''),
      });

      if (paymentResponse.data.success) {
        if (paymentResponse.data.payment_method === 'pix' && paymentResponse.data.pix_qr_code) {
          // PIX payment - navigate to PIX page with QR code data
          navigate('/pagamento/pix', { 
            state: { 
              pixData: paymentResponse.data,
              plan: plan,
              planId: planId
            } 
          });
        } else if (paymentResponse.data.payment_url) {
          // Card payment - redirect to Mercado Pago
          window.location.href = paymentResponse.data.payment_url;
        } else {
          // Payment created but no redirect - show waiting message
          toast.info('Pagamento iniciado. Aguardando confirmação...');
          navigate('/escolher-plano');
        }
      }
    } catch (error) {
      console.error('Payment error:', error);
      toast.error(error.response?.data?.detail || 'Erro ao processar pagamento');
    } finally {
      setLoading(false);
    }
  };

  if (!plan) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Back Button */}
        <Button
          variant="ghost"
          onClick={() => navigate('/escolher-plano')}
          className="mb-6"
          data-testid="back-to-plans-button"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar para planos
        </Button>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Scissors className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="font-heading font-bold text-3xl uppercase tracking-tight">
            Finalizar Assinatura
          </h1>
          <p className="text-muted-foreground mt-2">
            Complete os dados para ativar seu {plan.name}
          </p>
        </div>

        <div className="grid gap-6">
          {/* Order Summary */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg uppercase">Resumo do Pedido</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between py-2 border-b border-border">
                <span>{plan.name}</span>
                <span className="font-medium">R$ {plan.price.toFixed(2).replace('.', ',')}/mês</span>
              </div>
              <div className="flex items-center justify-between py-2 font-bold text-lg">
                <span>Total</span>
                <span className="text-primary">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
              </div>
            </CardContent>
          </Card>

          {/* Barbershop Info - Only show if user doesn't have one yet */}
          {!hasBarbershop ? (
            <Card className="border-border">
              <CardHeader>
                <CardTitle className="font-heading text-lg uppercase flex items-center gap-2">
                  <Scissors className="w-5 h-5 text-primary" />
                  Dados da Barbearia
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="barbershop_name">Nome da Barbearia *</Label>
                  <Input
                    id="barbershop_name"
                    placeholder="Ex: Barbearia do João"
                    value={barbershopData.name}
                    onChange={(e) => setBarbershopData({ ...barbershopData, name: e.target.value })}
                    required
                    data-testid="barbershop-name-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barbershop_phone">Telefone/WhatsApp</Label>
                  <Input
                    id="barbershop_phone"
                    placeholder="(11) 99999-9999"
                    value={barbershopData.phone}
                    onChange={(e) => setBarbershopData({ ...barbershopData, phone: e.target.value })}
                    data-testid="barbershop-phone-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="barbershop_address">Endereço</Label>
                  <Input
                    id="barbershop_address"
                    placeholder="Rua, número, bairro, cidade..."
                    value={barbershopData.address}
                    onChange={(e) => setBarbershopData({ ...barbershopData, address: e.target.value })}
                    data-testid="barbershop-address-input"
                  />
                </div>

                <div className="space-y-2">
                  <Label>Localização (Google Maps)</Label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={handleGetLocation}
                      className="flex-1"
                      data-testid="get-location-button"
                    >
                      <MapPin className="w-4 h-4 mr-2" />
                      Obter Localização Atual
                    </Button>
                  </div>
                  {barbershopData.latitude && barbershopData.longitude && (
                    <p className="text-sm text-green-500 flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      Localização capturada: {barbershopData.latitude.toFixed(4)}, {barbershopData.longitude.toFixed(4)}
                    </p>
                  )}
                  <p className="text-xs text-muted-foreground">
                    A localização será exibida aos clientes após o agendamento
                  </p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="border-border bg-secondary/30">
              <CardContent className="py-4">
                <div className="flex items-center gap-3">
                  <Scissors className="w-5 h-5 text-primary" />
                  <div>
                    <p className="font-medium">{barbershopData.name}</p>
                    <p className="text-sm text-muted-foreground">Barbearia já cadastrada</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Payment Form */}
          <Card className="border-border">
            <CardHeader>
              <CardTitle className="font-heading text-lg uppercase flex items-center gap-2">
                <Lock className="w-5 h-5 text-primary" />
                Dados para Pagamento
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Customer Name */}
                <div className="space-y-2">
                  <Label htmlFor="customer_name">Nome Completo *</Label>
                  <Input
                    id="customer_name"
                    placeholder="Seu nome completo"
                    value={formData.customer_name}
                    onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                    required
                    data-testid="customer-name-input"
                  />
                </div>

                {/* Customer Email */}
                <div className="space-y-2">
                  <Label htmlFor="customer_email">Email *</Label>
                  <Input
                    id="customer_email"
                    type="email"
                    placeholder="seu@email.com"
                    value={formData.customer_email}
                    onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                    required
                    data-testid="customer-email-input"
                  />
                </div>

                {/* CPF */}
                <div className="space-y-2">
                  <Label htmlFor="customer_document">CPF *</Label>
                  <Input
                    id="customer_document"
                    placeholder="000.000.000-00"
                    value={formData.customer_document}
                    onChange={handleCPFChange}
                    maxLength={14}
                    required
                    data-testid="customer-cpf-input"
                  />
                </div>

                {/* Payment Method */}
                <div className="space-y-3">
                  <Label>Forma de Pagamento *</Label>
                  <RadioGroup
                    value={paymentMethod}
                    onValueChange={setPaymentMethod}
                    className="grid grid-cols-2 gap-4"
                  >
                    <div>
                      <RadioGroupItem
                        value="pix"
                        id="pix"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="pix"
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-border p-4 cursor-pointer hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                        data-testid="payment-method-pix"
                      >
                        <QrCode className="w-8 h-8 mb-2 text-primary" />
                        <span className="font-medium">PIX</span>
                        <span className="text-xs text-muted-foreground">Aprovação imediata</span>
                      </Label>
                    </div>
                    <div>
                      <RadioGroupItem
                        value="card"
                        id="card"
                        className="peer sr-only"
                      />
                      <Label
                        htmlFor="card"
                        className="flex flex-col items-center justify-center rounded-lg border-2 border-border p-4 cursor-pointer hover:border-primary/50 peer-data-[state=checked]:border-primary peer-data-[state=checked]:bg-primary/5"
                        data-testid="payment-method-card"
                      >
                        <CreditCard className="w-8 h-8 mb-2 text-primary" />
                        <span className="font-medium">Cartão</span>
                        <span className="text-xs text-muted-foreground">Crédito ou Débito</span>
                      </Label>
                    </div>
                  </RadioGroup>
                  
                  {/* Payment Method Info */}
                  <div className="mt-3 p-3 bg-secondary/30 rounded-lg text-xs text-muted-foreground">
                    {paymentMethod === 'pix' ? (
                      <div className="flex items-start gap-2">
                        <QrCode className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">PIX - Pagamento Manual</p>
                          <p>A renovação <strong>não é automática</strong>. Você receberá um lembrete antes do vencimento para realizar o pagamento do próximo mês.</p>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-2">
                        <CreditCard className="w-4 h-4 mt-0.5 shrink-0 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">Cartão - Renovação Automática</p>
                          <p>A cobrança será feita automaticamente todo mês. Pode ser necessário criar ou fazer login em uma conta do Mercado Pago.</p>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Submit */}
                <Button
                  type="submit"
                  className="w-full btn-press h-12 text-lg"
                  disabled={loading}
                  data-testid="submit-payment-button"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      Processando...
                    </>
                  ) : (
                    <>
                      <Lock className="w-5 h-5 mr-2" />
                      Pagar R$ {plan.price.toFixed(2).replace('.', ',')}
                    </>
                  )}
                </Button>

                {/* Security Note */}
                <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Lock className="w-4 h-4" />
                  <span>Pagamento 100% seguro via Mercado Pago</span>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
