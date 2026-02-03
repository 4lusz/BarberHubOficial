import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { 
  Calendar, 
  Scissors, 
  Clock, 
  Users, 
  Smartphone, 
  BarChart3,
  CheckCircle,
  ArrowRight,
  Star,
  Zap,
  Mail,
  HelpCircle,
  FileText,
  Shield,
  MessageCircle,
  Settings,
  Crown,
  ChevronLeft,
  ChevronRight,
  LayoutDashboard,
  ListChecks,
  UserCheck,
  Palette
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

const howItWorks = [
  {
    id: 'dashboard',
    icon: LayoutDashboard,
    title: 'Dashboard',
    description: 'Visão geral completa da sua barbearia em tempo real',
    details: [
      'Agendamentos do dia em destaque',
      'Contador de clientes atendidos',
      'Faturamento semanal e mensal',
      'Próximos horários em sequência'
    ],
    mockup: (
      <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="bg-primary/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-primary">12</p>
            <p className="text-xs text-muted-foreground">Hoje</p>
          </div>
          <div className="bg-green-500/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-green-500">R$ 850</p>
            <p className="text-xs text-muted-foreground">Semana</p>
          </div>
          <div className="bg-blue-500/20 rounded-lg p-3 text-center">
            <p className="text-2xl font-bold text-blue-500">47</p>
            <p className="text-xs text-muted-foreground">Clientes</p>
          </div>
        </div>
        <div className="space-y-2">
          <div className="bg-zinc-800 rounded p-2 flex justify-between items-center">
            <span className="text-sm">João - Corte</span>
            <span className="text-xs text-primary">09:00</span>
          </div>
          <div className="bg-zinc-800 rounded p-2 flex justify-between items-center">
            <span className="text-sm">Pedro - Barba</span>
            <span className="text-xs text-primary">09:30</span>
          </div>
          <div className="bg-zinc-800 rounded p-2 flex justify-between items-center">
            <span className="text-sm">Lucas - Completo</span>
            <span className="text-xs text-primary">10:00</span>
          </div>
        </div>
      </div>
    )
  },
  {
    id: 'agenda',
    icon: Calendar,
    title: 'Agenda Visual',
    description: 'Visualize todos os agendamentos em formato de calendário',
    details: [
      'Visão diária, semanal ou mensal',
      'Filtro por profissional',
      'Status colorido (pendente, confirmado, concluído)',
      'Clique para ver detalhes do agendamento'
    ],
    mockup: (
      <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-medium">Janeiro 2026</span>
          <div className="flex gap-1">
            <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center">
              <ChevronLeft className="w-4 h-4" />
            </div>
            <div className="w-6 h-6 rounded bg-zinc-800 flex items-center justify-center">
              <ChevronRight className="w-4 h-4" />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 text-center text-xs mb-2">
          {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, i) => (
            <span key={i} className="text-muted-foreground">{d}</span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({ length: 31 }, (_, i) => (
            <div
              key={i}
              className={`aspect-square rounded flex items-center justify-center text-xs ${
                i === 14 ? 'bg-primary text-white' :
                [5, 12, 19, 26].includes(i) ? 'bg-green-500/30 text-green-400' :
                'bg-zinc-800'
              }`}
            >
              {i + 1}
            </div>
          ))}
        </div>
      </div>
    )
  },
  {
    id: 'services',
    icon: ListChecks,
    title: 'Serviços',
    description: 'Cadastre todos os serviços da sua barbearia',
    details: [
      'Nome, descrição e preço',
      'Duração em minutos',
      'Ativar/desativar serviços',
      'Organizar por categoria'
    ],
    mockup: (
      <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 space-y-2">
        {[
          { name: 'Corte Masculino', price: 'R$ 45', duration: '30 min' },
          { name: 'Barba Completa', price: 'R$ 35', duration: '25 min' },
          { name: 'Corte + Barba', price: 'R$ 70', duration: '50 min' },
          { name: 'Pigmentação', price: 'R$ 80', duration: '45 min' }
        ].map((s, i) => (
          <div key={i} className="bg-zinc-800 rounded-lg p-3 flex justify-between items-center">
            <div>
              <p className="font-medium text-sm">{s.name}</p>
              <p className="text-xs text-muted-foreground">{s.duration}</p>
            </div>
            <span className="text-primary font-bold">{s.price}</span>
          </div>
        ))}
      </div>
    )
  },
  {
    id: 'professionals',
    icon: Users,
    title: 'Profissionais',
    description: 'Gerencie sua equipe e horários individuais',
    details: [
      'Cadastro com foto e especialidade',
      'Horários individuais por profissional',
      'Dias de folga personalizados',
      'Comissão e relatórios por profissional'
    ],
    mockup: (
      <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 space-y-3">
        {[
          { name: 'Carlos Silva', role: 'Barbeiro Senior', color: 'bg-primary' },
          { name: 'João Santos', role: 'Barbeiro', color: 'bg-blue-500' },
          { name: 'Pedro Lima', role: 'Barbeiro Jr.', color: 'bg-green-500' }
        ].map((p, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full ${p.color} flex items-center justify-center text-white font-bold`}>
              {p.name[0]}
            </div>
            <div>
              <p className="font-medium text-sm">{p.name}</p>
              <p className="text-xs text-muted-foreground">{p.role}</p>
            </div>
          </div>
        ))}
      </div>
    )
  },
  {
    id: 'vip',
    icon: Crown,
    title: 'Clientes VIP',
    description: 'Fidelize seus melhores clientes com descontos exclusivos',
    details: [
      'Marque clientes como VIP',
      'Desconto automático nos serviços',
      'Notificação especial para VIPs',
      'Histórico de atendimentos'
    ],
    mockup: (
      <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between bg-yellow-500/10 rounded-lg p-3 border border-yellow-500/30">
          <div className="flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-500" />
            <span className="font-medium text-sm">Cliente VIP</span>
          </div>
          <span className="text-yellow-500 font-bold">15% OFF</span>
        </div>
        {[
          { name: 'Ricardo Alves', visits: 24, discount: '15%' },
          { name: 'Fernando Costa', visits: 18, discount: '10%' }
        ].map((c, i) => (
          <div key={i} className="bg-zinc-800 rounded-lg p-3 flex justify-between items-center">
            <div>
              <p className="font-medium text-sm">{c.name}</p>
              <p className="text-xs text-muted-foreground">{c.visits} visitas</p>
            </div>
            <span className="text-yellow-500 font-bold">{c.discount}</span>
          </div>
        ))}
      </div>
    )
  },
  {
    id: 'settings',
    icon: Palette,
    title: 'Personalização',
    description: 'Deixe sua página com a cara da sua barbearia',
    details: [
      'Upload de logo e banner',
      'Cores personalizadas',
      'Galeria de trabalhos',
      'Texto "Sobre Nós" e redes sociais'
    ],
    mockup: (
      <div className="bg-zinc-900 rounded-lg p-4 border border-zinc-800 space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-yellow-500 flex items-center justify-center">
            <Scissors className="w-6 h-6 text-white" />
          </div>
          <div>
            <p className="font-bold">Sua Barbearia</p>
            <p className="text-xs text-muted-foreground">barberhubpro.com.br/b/sua-barbearia</p>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          <div className="aspect-square rounded bg-primary"></div>
          <div className="aspect-square rounded bg-yellow-500"></div>
          <div className="aspect-square rounded bg-zinc-700"></div>
          <div className="aspect-square rounded bg-zinc-800"></div>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 h-8 rounded bg-zinc-800 flex items-center px-2 text-xs text-muted-foreground">
            Fonte: Moderna
          </div>
        </div>
      </div>
    )
  }
];

export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const activeItem = howItWorks.find(item => item.id === activeTab);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-2">
              <Scissors className="w-8 h-8 text-primary" />
              <span className="font-heading font-bold text-2xl uppercase tracking-tight">
                <span className="text-primary">Barber</span>Hub
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
                  Criar Conta
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
            
            {/* WhatsApp Highlight */}
            <div className="mt-8 inline-flex items-center gap-3 px-6 py-3 rounded-full bg-green-500/10 border border-green-500/30 animate-slide-up">
              <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center">
                <MessageCircle className="w-5 h-5 text-white" />
              </div>
              <div className="text-left">
                <p className="text-green-400 font-bold">WhatsApp Integrado</p>
                <p className="text-sm text-muted-foreground">Confirmações e lembretes automáticos</p>
              </div>
            </div>

            <div className="mt-10 flex flex-col sm:flex-row gap-4 justify-center animate-slide-up">
              <Link to="/cadastro">
                <Button size="lg" className="btn-press text-lg px-8 animate-pulse-glow" data-testid="hero-cta-button">
                  Começar Agora
                  <ArrowRight className="ml-2 w-5 h-5" />
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
              <div key={index} className="flex items-center gap-3 p-3">
                <CheckCircle className="w-5 h-5 text-primary flex-shrink-0" />
                <span className="text-sm text-muted-foreground">{benefit}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20" data-testid="features-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-4xl font-bold text-center uppercase mb-4">
            Tudo que você precisa
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Funcionalidades completas para transformar sua barbearia em um negócio organizado e profissional.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((feature, index) => (
              <Card 
                key={index} 
                className="border-border bg-card/50 hover:border-primary/50 transition-all duration-300 hover:-translate-y-1"
                data-testid={`feature-card-${index}`}
              >
                <CardContent className="p-6">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-4">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="font-heading font-bold text-lg uppercase mb-2">{feature.title}</h3>
                  <p className="text-muted-foreground text-sm">{feature.description}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works - Interactive Section */}
      <section className="py-20 bg-card/30 border-y border-border" data-testid="how-it-works-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="font-heading text-4xl font-bold text-center uppercase mb-4">
            Como Funciona
          </h2>
          <p className="text-center text-muted-foreground mb-12 max-w-2xl mx-auto">
            Conheça cada funcionalidade do painel da sua barbearia
          </p>

          {/* Tabs */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {howItWorks.map((item) => (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  activeTab === item.id
                    ? 'bg-primary text-white'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                <item.icon className="w-4 h-4" />
                {item.title}
              </button>
            ))}
          </div>

          {/* Content */}
          {activeItem && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div className="order-2 lg:order-1">
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                    <activeItem.icon className="w-6 h-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-heading text-2xl font-bold uppercase">{activeItem.title}</h3>
                    <p className="text-muted-foreground">{activeItem.description}</p>
                  </div>
                </div>
                <ul className="space-y-3 mt-6">
                  {activeItem.details.map((detail, index) => (
                    <li key={index} className="flex items-start gap-3">
                      <CheckCircle className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="order-1 lg:order-2">
                {activeItem.mockup}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* WhatsApp Feature Highlight */}
      <section className="py-20" data-testid="whatsapp-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 rounded-3xl border border-green-500/20 p-8 md:p-12">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-green-500/20 text-green-400 text-sm font-medium mb-6">
                  <MessageCircle className="w-4 h-4" />
                  Integração WhatsApp
                </div>
                <h2 className="font-heading text-4xl font-bold uppercase mb-4">
                  Notificações{' '}
                  <span className="text-green-400">Automáticas</span>
                </h2>
                <p className="text-muted-foreground text-lg mb-6">
                  Seus clientes recebem confirmações e lembretes diretamente no WhatsApp. 
                  Reduza faltas em até 80% com lembretes automáticos 30 minutos antes do horário.
                </p>
                <ul className="space-y-3">
                  {[
                    'Confirmação instantânea de agendamento',
                    'Lembrete 30 minutos antes',
                    'Link do Google Maps para localização',
                    'Notificação de cliente VIP'
                  ].map((item, index) => (
                    <li key={index} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-full bg-green-500 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-white" />
                      </div>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="relative">
                {/* Phone Mockup */}
                <div className="bg-zinc-900 rounded-[2rem] p-2 max-w-[280px] mx-auto border-4 border-zinc-800">
                  <div className="bg-zinc-950 rounded-[1.5rem] p-4 space-y-3">
                    {/* WhatsApp Header */}
                    <div className="flex items-center gap-2 pb-2 border-b border-zinc-800">
                      <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                        <Scissors className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Barbearia Premium</p>
                        <p className="text-[10px] text-muted-foreground">online</p>
                      </div>
                    </div>
                    {/* Messages */}
                    <div className="bg-green-900/30 rounded-lg p-3 text-sm">
                      <p className="font-medium text-green-400 mb-1">✅ Agendamento Confirmado!</p>
                      <p className="text-xs text-muted-foreground">Olá João! Seu horário está marcado:</p>
                      <p className="text-xs mt-2">📅 29/01/2026</p>
                      <p className="text-xs">⏰ 14:00</p>
                      <p className="text-xs">💇 Corte + Barba</p>
                      <p className="text-xs">💰 R$ 70,00</p>
                    </div>
                    <div className="bg-green-900/30 rounded-lg p-3 text-sm">
                      <p className="font-medium text-yellow-400 mb-1">⏰ Lembrete!</p>
                      <p className="text-xs text-muted-foreground">Seu horário é daqui a 30 minutos!</p>
                      <p className="text-xs mt-2 text-blue-400 underline">📍 Ver no mapa</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className="py-20 bg-card/30 border-y border-border" data-testid="pricing-section">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="font-heading text-4xl font-bold uppercase mb-4">
              Planos e Preços
            </h2>
            <p className="text-muted-foreground text-lg">
              Escolha o plano ideal para sua barbearia
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* Plano Comum */}
            <div className="rounded-2xl border border-border bg-card p-8 relative hover:border-primary/50 transition-all duration-300">
              <div className="flex items-center gap-2 mb-4">
                <Scissors className="w-6 h-6 text-primary" />
                <h3 className="font-heading font-bold text-2xl uppercase">Plano Comum</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                Para barbearias que querem sair do WhatsApp e organizar tudo
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold">R$ 49,90</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  'Criação automática da barbearia',
                  'Agendamentos online ilimitados',
                  'Agenda digital organizada',
                  'Cadastro de serviços',
                  'Cadastro de profissionais',
                  'Configuração de horários',
                  'Link público para clientes',
                  'Confirmação automática WhatsApp',
                  'Lembrete 30 min antes',
                  'Acesso pelo celular ou PC'
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-green-500 shrink-0" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
              <Link to="/cadastro">
                <Button className="w-full btn-press" variant="outline">
                  Começar Agora
                </Button>
              </Link>
            </div>

            {/* Plano Premium */}
            <div className="rounded-2xl border-2 border-primary bg-gradient-to-b from-primary/10 to-transparent p-8 relative hover:shadow-lg hover:shadow-primary/20 transition-all duration-300">
              <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                <span className="bg-primary text-primary-foreground px-4 py-1 rounded-full text-sm font-bold flex items-center gap-1 shadow-lg">
                  <Star className="w-4 h-4" />
                  Mais Popular
                </span>
              </div>
              <div className="flex items-center gap-2 mb-4 mt-2">
                <Zap className="w-6 h-6 text-primary" />
                <h3 className="font-heading font-bold text-2xl uppercase text-primary">Plano Premium</h3>
              </div>
              <p className="text-muted-foreground mb-6">
                Para barbearias que querem gestão, controle e fidelização
              </p>
              <div className="mb-6">
                <span className="text-4xl font-bold text-primary">R$ 99,90</span>
                <span className="text-muted-foreground">/mês</span>
              </div>
              <ul className="space-y-3 mb-8">
                {[
                  { text: 'Tudo do Plano Comum +', highlight: true },
                  { text: 'Relatórios de faturamento', highlight: false },
                  { text: 'Lucro por profissional', highlight: false },
                  { text: 'Lucro por horário de atendimento', highlight: false },
                  { text: 'Estatísticas de horários vendidos', highlight: false },
                  { text: 'Histórico financeiro completo', highlight: false },
                  { text: 'Gestão avançada de clientes', highlight: false },
                  { text: 'Clientes VIP com desconto automático', highlight: true },
                  { text: 'Galeria de trabalhos na página', highlight: false },
                  { text: 'Personalização completa (cores, fontes)', highlight: false },
                  { text: 'Suporte prioritário', highlight: false }
                ].map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2 text-sm">
                    <CheckCircle className={`w-4 h-4 shrink-0 ${feature.highlight ? 'text-yellow-500' : 'text-primary'}`} />
                    <span className={feature.highlight ? 'font-semibold text-primary' : ''}>{feature.text}</span>
                  </li>
                ))}
              </ul>
              <Link to="/cadastro">
                <Button className="w-full btn-press animate-pulse-glow text-base py-6">
                  <Crown className="w-5 h-5 mr-2" />
                  Começar com Premium
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <h2 className="font-heading text-4xl font-bold uppercase mb-6">
            Pronto para{' '}
            <span className="gradient-text">Transformar</span>
            {' '}sua Barbearia?
          </h2>
          <p className="text-muted-foreground text-lg mb-8">
            Junte-se a centenas de barbearias que já modernizaram seu atendimento com o BarberHub.
          </p>
          <Link to="/cadastro">
            <Button size="lg" className="btn-press text-lg px-10 animate-pulse-glow">
              Criar Minha Conta Grátis
              <ArrowRight className="ml-2 w-5 h-5" />
            </Button>
          </Link>
          <p className="mt-4 text-sm text-muted-foreground">
            Configuração em menos de 5 minutos • Sem cartão de crédito para começar
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-border bg-zinc-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Main Footer Content */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            {/* Brand */}
            <div className="md:col-span-1">
              <Link to="/" className="flex items-center gap-2 mb-4">
                <Scissors className="w-6 h-6 text-primary" />
                <span className="font-heading font-bold text-xl uppercase">
                  <span className="text-primary">Barber</span>Hub
                </span>
              </Link>
              <p className="text-sm text-muted-foreground">
                A plataforma completa de agendamento para barbearias modernas.
              </p>
            </div>

            {/* Links */}
            <div>
              <h4 className="font-heading font-bold uppercase text-sm mb-4">Links Úteis</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/sobre" className="text-muted-foreground hover:text-primary transition-colors">
                    Sobre Nós
                  </Link>
                </li>
                <li>
                  <Link to="/faq" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                    <HelpCircle className="w-4 h-4" />
                    Perguntas Frequentes
                  </Link>
                </li>
                <li>
                  <Link to="/login" className="text-muted-foreground hover:text-primary transition-colors">
                    Entrar na Conta
                  </Link>
                </li>
                <li>
                  <Link to="/cadastro" className="text-muted-foreground hover:text-primary transition-colors">
                    Criar Conta
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div>
              <h4 className="font-heading font-bold uppercase text-sm mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/termos" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Termos de Uso
                  </Link>
                </li>
                <li>
                  <Link to="/privacidade" className="text-muted-foreground hover:text-primary transition-colors flex items-center gap-2">
                    <Shield className="w-4 h-4" />
                    Política de Privacidade
                  </Link>
                </li>
              </ul>
            </div>

            {/* Dados da Empresa */}
            <div>
              <h4 className="font-heading font-bold uppercase text-sm mb-4">Dados da Empresa</h4>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-zinc-300">64.876.912 ALUISIO MOURA PRADO</p>
                <p>CNPJ: 64.876.912/0001-90</p>
                <p>Rua Palestina 1774, Jataí/GO - 75803-110</p>
                <a 
                  href="tel:+5564999766685" 
                  className="block hover:text-primary transition-colors"
                >
                  +55 64 99976-6685
                </a>
                <a 
                  href="mailto:contato@barberhubpro.com.br" 
                  className="flex items-center gap-2 hover:text-primary transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  contato@barberhubpro.com.br
                </a>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="pt-8 border-t border-zinc-800 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              © {new Date().getFullYear()} BarberHub. Todos os direitos reservados.
            </p>
            <p className="text-xs text-muted-foreground">
              Operado por 64.876.912 ALUISIO MOURA PRADO - CNPJ: 64.876.912/0001-90{' '}
              <Link 
                to="/super-admin" 
                className="text-muted-foreground/30 hover:text-primary transition-colors ml-2"
                title="Área restrita"
              >
                •
              </Link>
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
