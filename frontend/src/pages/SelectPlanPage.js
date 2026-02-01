import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Scissors, CheckCircle, Star, Zap, ArrowRight } from 'lucide-react';

const plans = [
  {
    id: 'comum',
    name: 'Plano Comum',
    price: 49.90,
    icon: Scissors,
    description: 'Para barbearias que querem sair do WhatsApp e organizar tudo',
    features: [
      'Criação automática da barbearia',
      'Agendamentos online ilimitados',
      'Agenda digital organizada',
      'Cadastro de serviços',
      'Cadastro de profissionais',
      'Configuração de horários',
      'Link público para clientes',
      'Confirmação automática',
      'Acesso pelo celular ou PC'
    ],
    highlight: false
  },
  {
    id: 'premium',
    name: 'Plano Premium',
    price: 99.90,
    icon: Zap,
    description: 'Para barbearias que querem gestão, controle e recorrência',
    features: [
      'Tudo do Plano Comum +',
      'Relatórios de faturamento',
      'Lucro por profissional',
      'Lucro por horário de atendimento',
      'Estatísticas de horários vendidos',
      'Histórico financeiro',
      'Gestão avançada de clientes',
      'Criação de clientes VIP com desconto',
      'Controle de clientes recorrentes',
      'Prioridade em novidades'
    ],
    highlight: true
  }
];

export default function SelectPlanPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [selectedPlan, setSelectedPlan] = useState(null);

  const handleSelectPlan = (planId) => {
    setSelectedPlan(planId);
  };

  const handleContinue = () => {
    if (selectedPlan) {
      navigate(`/pagamento?plano=${selectedPlan}`);
    }
  };

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
              <Scissors className="w-8 h-8 text-primary" />
            </div>
          </div>
          <h1 className="font-heading font-bold text-3xl md:text-4xl uppercase tracking-tight">
            Escolha seu Plano
          </h1>
          <p className="text-muted-foreground mt-2">
            Olá, {user?.name}! Selecione o plano ideal para sua barbearia.
          </p>
        </div>

        {/* Plans Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isSelected = selectedPlan === plan.id;
            
            return (
              <Card
                key={plan.id}
                className={`cursor-pointer transition-all duration-300 relative ${
                  isSelected 
                    ? 'border-primary ring-2 ring-primary/20' 
                    : plan.highlight 
                      ? 'border-primary/50' 
                      : 'border-border hover:border-primary/30'
                }`}
                onClick={() => handleSelectPlan(plan.id)}
                data-testid={`plan-card-${plan.id}`}
              >
                {plan.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-medium flex items-center gap-1">
                      <Star className="w-4 h-4" />
                      Mais Popular
                    </span>
                  </div>
                )}
                <CardHeader className={plan.highlight ? 'pt-8' : ''}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                        isSelected ? 'bg-primary text-primary-foreground' : 'bg-primary/10'
                      }`}>
                        <Icon className={`w-5 h-5 ${isSelected ? '' : 'text-primary'}`} />
                      </div>
                      <CardTitle className="font-heading text-xl uppercase">
                        {plan.name}
                      </CardTitle>
                    </div>
                    <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      isSelected ? 'border-primary bg-primary' : 'border-muted-foreground'
                    }`}>
                      {isSelected && <CheckCircle className="w-4 h-4 text-primary-foreground" />}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm mb-4">
                    {plan.description}
                  </p>
                  <div className="mb-6">
                    <span className="text-3xl font-bold">R$ {plan.price.toFixed(2).replace('.', ',')}</span>
                    <span className="text-muted-foreground">/mês</span>
                  </div>
                  <ul className="space-y-2">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm">
                        <CheckCircle className={`w-4 h-4 shrink-0 ${
                          plan.highlight ? 'text-primary' : 'text-green-500'
                        }`} />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Continue Button */}
        <div className="text-center">
          <Button
            size="lg"
            className="btn-press px-12"
            disabled={!selectedPlan}
            onClick={handleContinue}
            data-testid="continue-to-payment-button"
          >
            Continuar para Pagamento
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
          <p className="text-sm text-muted-foreground mt-4">
            Pagamento seguro via Mercado Pago • PIX ou Cartão
          </p>
        </div>
      </div>
    </div>
  );
}
