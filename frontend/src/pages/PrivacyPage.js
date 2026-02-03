import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Scissors, ArrowLeft, Mail } from 'lucide-react';
import Footer from '../components/Footer';

export default function PrivacyPage() {
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
        <h1 className="font-heading text-4xl font-bold uppercase mb-8">Política de Privacidade</h1>
        
        <div className="prose prose-invert max-w-none space-y-6 text-muted-foreground">
          <p className="text-sm">Última atualização: Janeiro de 2026</p>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">1. Introdução</h2>
            <p>
              O BarberHub valoriza a privacidade dos nossos usuários. Esta Política de Privacidade explica 
              como coletamos, usamos, divulgamos e protegemos suas informações quando você usa nossa 
              plataforma de agendamento para barbearias.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">2. Informações que Coletamos</h2>
            
            <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">2.1 Dados fornecidos por você:</h3>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Nome e email (ao criar conta)</li>
              <li>Nome da barbearia e endereço</li>
              <li>Número de telefone/WhatsApp</li>
              <li>Informações de pagamento (processadas pelo Mercado Pago)</li>
              <li>Dados dos clientes (nome, telefone, email para agendamentos)</li>
            </ul>

            <h3 className="text-lg font-semibold text-foreground mt-6 mb-2">2.2 Dados coletados automaticamente:</h3>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Endereço IP e dados de navegação</li>
              <li>Tipo de dispositivo e navegador</li>
              <li>Dados de uso da plataforma</li>
              <li>Localização (se autorizada)</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">3. Como Usamos suas Informações</h2>
            <p>Utilizamos suas informações para:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Fornecer e manter nossos serviços</li>
              <li>Processar agendamentos e pagamentos</li>
              <li>Enviar notificações por WhatsApp (confirmações, lembretes)</li>
              <li>Enviar comunicações sobre sua conta e assinatura</li>
              <li>Melhorar nossos serviços e desenvolver novos recursos</li>
              <li>Prevenir fraudes e garantir a segurança</li>
              <li>Cumprir obrigações legais</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">4. Compartilhamento de Informações</h2>
            <p>Podemos compartilhar suas informações com:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Mercado Pago:</strong> Para processar pagamentos</li>
              <li><strong>Respond.io:</strong> Para envio de mensagens WhatsApp</li>
              <li><strong>Provedores de hospedagem:</strong> Para armazenar dados</li>
              <li><strong>Autoridades legais:</strong> Quando exigido por lei</li>
            </ul>
            <p className="mt-4">
              <strong>Não vendemos</strong> suas informações pessoais para terceiros.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">5. Segurança dos Dados</h2>
            <p>
              Implementamos medidas de segurança técnicas e organizacionais para proteger suas informações, 
              incluindo:
            </p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li>Criptografia de dados em trânsito (HTTPS)</li>
              <li>Senhas armazenadas com hash seguro (bcrypt)</li>
              <li>Acesso restrito a dados pessoais</li>
              <li>Monitoramento de segurança</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">6. Seus Direitos</h2>
            <p>Você tem direito a:</p>
            <ul className="list-disc list-inside mt-2 space-y-1">
              <li><strong>Acesso:</strong> Solicitar cópia dos seus dados</li>
              <li><strong>Correção:</strong> Atualizar dados incorretos</li>
              <li><strong>Exclusão:</strong> Solicitar exclusão dos seus dados</li>
              <li><strong>Portabilidade:</strong> Receber seus dados em formato comum</li>
              <li><strong>Revogação:</strong> Retirar consentimento a qualquer momento</li>
            </ul>
            <p className="mt-4">
              Para exercer seus direitos, entre em contato pelo email abaixo.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">7. Retenção de Dados</h2>
            <p>
              Mantemos seus dados enquanto sua conta estiver ativa ou conforme necessário para fornecer 
              serviços. Após o encerramento da conta, podemos reter dados por até 5 anos para cumprir 
              obrigações legais, resolver disputas e fazer cumprir acordos.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">8. Cookies</h2>
            <p>
              Utilizamos cookies essenciais para o funcionamento da plataforma, incluindo autenticação 
              e preferências de sessão. Não utilizamos cookies de rastreamento de terceiros para publicidade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">9. Menores de Idade</h2>
            <p>
              Nossos serviços são destinados a maiores de 18 anos. Não coletamos intencionalmente 
              informações de menores de idade.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">10. Alterações nesta Política</h2>
            <p>
              Podemos atualizar esta política periodicamente. Notificaremos sobre mudanças significativas 
              por email ou através da plataforma. O uso continuado após as alterações constitui aceitação 
              da política atualizada.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-bold text-foreground mt-8 mb-4">11. Contato</h2>
            <p>
              Para dúvidas sobre esta Política de Privacidade ou sobre seus dados:
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
      <footer className="py-8 border-t border-border">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <p className="text-sm text-muted-foreground">
            © {new Date().getFullYear()} BarberHub. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  );
}
