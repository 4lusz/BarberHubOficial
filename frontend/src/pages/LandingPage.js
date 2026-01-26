import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { 
  Calendar, 
  Scissors, 
  Clock, 
  Users, 
  Smartphone, 
  BarChart3,
  CheckCircle,
  ArrowRight
} from 'lucide-react';

const features = [
  {
    icon: Calendar,
    title: 'Agenda Online',
    description: 'Seus clientes agendam 24h pelo celular, sem precisar ligar.'
  },
  {
    icon: Clock,
    title: 'Controle de Horários',
    description: 'Configure seu horário de funcionamento e bloqueie datas.'
  },
  {
    icon: Users,
    title: 'Múltiplos Profissionais',
    description: 'Adicione sua equipe e gerencie agendas individuais.'
  },
  {
    icon: Smartphone,
    title: 'Link Exclusivo',
    description: 'Compartilhe seu link único no WhatsApp e redes sociais.'
  },
  {
    icon: Scissors,
    title: 'Serviços Personalizados',
    description: 'Cadastre seus serviços com duração e preços.'
  },
  {
    icon: BarChart3,
    title: 'Dashboard Completo',
    description: 'Visualize agendamentos, faturamento e clientes.'
  }
];

const benefits = [
  'Chega de perder clientes por WhatsApp lotado',
  'Organize sua agenda de forma profissional',
  'Reduza faltas com lembretes automáticos',
  'Aumente sua receita com mais agendamentos'
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Scissors className="w-8 h-8 text-primary" />
              <span className="font-heading font-bold text-2xl uppercase tracking-tight">
                <span className="text-primary">Barber</span>SaaS
              </span>
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" data-testid="header-login-button">
                  Entrar
                </Button>
              </Link>
              <Link to="/cadastro">
                <Button className="btn-press" data-testid="header-register-button">
                  Começar Grátis
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative pt-32 pb-20 lg:pt-40 lg:pb-32 overflow-hidden">
        <div 
          className="absolute inset-0 bg-cover bg-center opacity-10"
          style={{ 
            backgroundImage: 'url(https://images.unsplash.com/photo-1536520843734-bfb7a8a3ebcf?q=80&w=2000&auto=format&fit=crop)'
          }}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
        
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="font-heading font-bold text-5xl md:text-7xl tracking-tight uppercase animate-fade-in">
              Sua Barbearia,{' '}
              <span className="gradient-text">Online</span>
            </h1>
            <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto animate-slide-up">
              Pare de perder clientes no WhatsApp. Sistema de agendamento profissional 
              para barbearias que querem crescer.
            </p>
            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
              <Link to="/cadastro">
                <Button size="lg" className="btn-press text-lg px-8 animate-pulse-glow" data-testid="hero-cta-button">
                  Começar Agora
                  <ArrowRight className="ml-2 w-5 h-5" />
                </Button>
              </Link>
              <Link to="/b/demo">
                <Button size="lg" variant="outline" className="btn-press text-lg px-8" data-testid="hero-demo-button">
                  Ver Demonstração
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Bar */}
      <section className="py-8 border-y border-border bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {benefits.map((benefit, index) => (
              <div key={index} className="flex items-center gap-3">
                <CheckCircle className="w-5 h-5 text-primary shrink-0" />
                <span className="text-sm">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 lg:py-32">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="font-heading font-bold text-3xl md:text-5xl tracking-tight uppercase">
              Tudo que você precisa
            </h2>
            <p className="mt-4 text-muted-foreground text-lg">
              Ferramentas simples e poderosas para sua barbearia
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div
                  key={index}
                  className="group p-6 rounded-lg border border-border bg-card hover:border-primary/50 transition-all duration-300"
                  data-testid={`feature-card-${index}`}
                >
                  <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold text-xl mb-2">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground">
                    {feature.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 lg:py-32 bg-card/50 border-y border-border">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="font-heading font-bold text-3xl md:text-5xl tracking-tight uppercase">
            Pronto para{' '}
            <span className="gradient-text">Profissionalizar</span>
            {' '}sua agenda?
          </h2>
          <p className="mt-6 text-lg text-muted-foreground">
            Crie sua conta em menos de 2 minutos e comece a receber agendamentos hoje.
          </p>
          <div className="mt-10">
            <Link to="/cadastro">
              <Button size="lg" className="btn-press text-lg px-10" data-testid="cta-register-button">
                Criar Conta Grátis
                <ArrowRight className="ml-2 w-5 h-5" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Scissors className="w-6 h-6 text-primary" />
              <span className="font-heading font-bold text-xl uppercase">
                <span className="text-primary">Barber</span>SaaS
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} BarberSaaS. Todos os direitos reservados.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
