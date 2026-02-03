import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Scissors, ArrowLeft, Mail } from 'lucide-react';
import Footer from '../components/Footer';

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Scissors className="w-6 h-6 text-primary" />
            <span className="font-heading font-bold text-xl uppercase">
              <span className="text-primary">Barber</span>Hub
            </span>
          </Link>
          <Link to="/">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-12 flex-grow">
        <h1 className="font-heading text-4xl font-bold uppercase mb-8">Termos de Uso</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Última atualização: Janeiro de 2026</p>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">1. Aceitação dos Termos</h2>
            <p>
              Ao acessar e usar a plataforma BarberHub, você concorda em cumprir e estar vinculado a estes 
              Termos de Uso. Se você não concordar com qualquer parte destes termos, não poderá acessar o serviço.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">2. Descrição do Serviço</h2>
            <p>
              O BarberHub é uma plataforma SaaS (Software as a Service) de agendamento online para barbearias. 
              Oferecemos ferramentas para:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Gerenciamento de agendamentos online</li>
              <li>Cadastro de serviços e profissionais</li>
              <li>Página pública personalizada para sua barbearia</li>
              <li>Notificações automáticas via WhatsApp</li>
              <li>Relatórios de faturamento (plano Premium)</li>
              <li>Gestão de clientes VIP (plano Premium)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">3. Cadastro e Conta</h2>
            <p>
              Para usar nossos serviços, você deve criar uma conta fornecendo informações precisas e completas. 
              Você é responsável por:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Manter a confidencialidade de sua senha</li>
              <li>Todas as atividades que ocorrem em sua conta</li>
              <li>Notificar-nos imediatamente sobre qualquer uso não autorizado</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">4. Planos e Pagamentos</h2>
            <p>
              O BarberHub oferece planos de assinatura mensal com cobrança recorrente:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Plano Comum:</strong> R$ 49,90/mês</li>
              <li><strong>Plano Premium:</strong> R$ 99,90/mês</li>
            </ul>
            <p className="mt-4">
              Os pagamentos são processados pelo Mercado Pago. O não pagamento pode resultar na suspensão do acesso 
              aos serviços. Você pode cancelar sua assinatura a qualquer momento pelo painel de controle.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">5. Uso Aceitável</h2>
            <p>Você concorda em não usar o serviço para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Violar qualquer lei aplicável</li>
              <li>Enviar spam ou mensagens não solicitadas</li>
              <li>Transmitir vírus ou código malicioso</li>
              <li>Interferir no funcionamento da plataforma</li>
              <li>Coletar dados de outros usuários sem consentimento</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">6. Propriedade Intelectual</h2>
            <p>
              Todo o conteúdo da plataforma BarberHub, incluindo textos, gráficos, logos, ícones e software, 
              é de propriedade exclusiva do BarberHub ou de seus licenciadores e é protegido por leis de 
              direitos autorais.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">7. Limitação de Responsabilidade</h2>
            <p>
              O BarberHub não se responsabiliza por perdas ou danos indiretos, incidentais ou consequentes 
              decorrentes do uso ou incapacidade de uso dos serviços. Nossos serviços são fornecidos 
              "como estão" sem garantias de qualquer tipo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">8. Rescisão</h2>
            <p>
              Podemos suspender ou encerrar seu acesso aos serviços a qualquer momento, por qualquer motivo, 
              incluindo violação destes termos. Você pode encerrar sua conta a qualquer momento pelo painel 
              de controle ou entrando em contato conosco.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">9. Alterações nos Termos</h2>
            <p>
              Reservamo-nos o direito de modificar estes termos a qualquer momento. As alterações entrarão 
              em vigor após a publicação. O uso continuado dos serviços após as alterações constitui 
              aceitação dos novos termos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">10. Contato</h2>
            <p>
              Para dúvidas sobre estes Termos de Uso, entre em contato:
            </p>
            <p className="mt-2 flex items-center gap-2">
              <Mail className="w-4 h-4 text-primary" />
              <a href="mailto:barberhub44@gmail.com" className="text-primary hover:underline">
                barberhub44@gmail.com
              </a>
            </p>
          </section>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
