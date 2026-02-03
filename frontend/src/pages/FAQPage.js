import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { 
  Scissors, 
  ArrowLeft, 
  Mail,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  CreditCard,
  Calendar,
  Users,
  Smartphone,
  Shield,
  MessageCircle
} from 'lucide-react';
import Footer from '../components/Footer';

const faqs = [
  {
    category: 'Geral',
    icon: HelpCircle,
    questions: [
      {
        q: 'O que é o BarberHub?',
        a: 'O BarberHub é uma plataforma completa de agendamento online para barbearias. Com ele, você cria uma página exclusiva para sua barbearia onde seus clientes podem agendar horários 24 horas por dia, sem precisar ligar ou mandar mensagem no WhatsApp.'
      },
      {
        q: 'Preciso instalar algum aplicativo?',
        a: 'Não! O BarberHub funciona 100% no navegador, tanto no celular quanto no computador. Você e seus clientes não precisam baixar nada.'
      },
      {
        q: 'Como meus clientes vão agendar?',
        a: 'Você recebe um link exclusivo (ex: barberhubpro.com.br/b/suabarbearia) e um QR Code. Basta compartilhar nas redes sociais, WhatsApp ou imprimir o QR Code na barbearia. O cliente acessa, escolhe o serviço, profissional, data e horário.'
      }
    ]
  },
  {
    category: 'Planos e Pagamento',
    icon: CreditCard,
    questions: [
      {
        q: 'Quais são os planos disponíveis?',
        a: 'Oferecemos dois planos:\n\n• Plano Comum (R$ 49,90/mês): Agendamentos ilimitados, cadastro de serviços e profissionais, página personalizada, confirmação automática por WhatsApp.\n\n• Plano Premium (R$ 99,90/mês): Tudo do Comum + relatórios de faturamento, gestão de clientes VIP com desconto automático, estatísticas avançadas.'
      },
      {
        q: 'Como funciona a cobrança?',
        a: 'A cobrança é mensal e automática via Mercado Pago. Você pode pagar com cartão de crédito, débito ou Pix. A renovação acontece automaticamente todo mês.'
      },
      {
        q: 'Posso cancelar a qualquer momento?',
        a: 'Sim! Você pode cancelar sua assinatura a qualquer momento pelo painel de controle em "Minha Assinatura". Não há multa ou fidelidade.'
      },
      {
        q: 'Tem período de teste grátis?',
        a: 'Atualmente não oferecemos período de teste, mas você pode começar com o Plano Comum por apenas R$ 49,90/mês e fazer upgrade para o Premium quando quiser.'
      }
    ]
  },
  {
    category: 'Agendamentos',
    icon: Calendar,
    questions: [
      {
        q: 'Quantos agendamentos posso ter?',
        a: 'Ilimitados! Não há limite de agendamentos em nenhum dos planos.'
      },
      {
        q: 'Posso bloquear horários?',
        a: 'Sim! Você pode bloquear dias inteiros (feriados, folgas) ou horários específicos pelo painel de controle.'
      },
      {
        q: 'Como funciona o lembrete automático?',
        a: 'O sistema envia automaticamente um lembrete por WhatsApp para o cliente 30 minutos antes do horário agendado. Isso reduz faltas significativamente!'
      },
      {
        q: 'E se o cliente quiser cancelar?',
        a: 'Você pode cancelar agendamentos pelo painel ou o cliente pode entrar em contato diretamente com você pelo WhatsApp da barbearia.'
      }
    ]
  },
  {
    category: 'Profissionais',
    icon: Users,
    questions: [
      {
        q: 'Posso cadastrar vários profissionais?',
        a: 'Sim! Você pode cadastrar quantos profissionais quiser. Cada um terá sua própria agenda e o cliente poderá escolher com quem quer ser atendido.'
      },
      {
        q: 'Cada profissional pode ter horários diferentes?',
        a: 'Sim! Você pode configurar horários de funcionamento específicos para cada profissional, além dos bloqueios individuais.'
      }
    ]
  },
  {
    category: 'Personalização',
    icon: Smartphone,
    questions: [
      {
        q: 'Posso personalizar minha página?',
        a: 'Sim! Você pode adicionar logo, banner, galeria de fotos dos seus trabalhos, cores personalizadas, texto "Sobre Nós", links das redes sociais e muito mais.'
      },
      {
        q: 'Minha barbearia aparece no Google?',
        a: 'Sua página pública pode ser indexada pelo Google. Recomendamos compartilhar o link e QR Code para seus clientes encontrarem facilmente.'
      }
    ]
  },
  {
    category: 'Clientes VIP',
    icon: Shield,
    questions: [
      {
        q: 'O que são Clientes VIP?',
        a: 'É um recurso exclusivo do Plano Premium que permite marcar clientes especiais e dar desconto automático em todos os serviços. Basta cadastrar o telefone do cliente e definir o percentual de desconto.'
      },
      {
        q: 'Como funciona o desconto VIP?',
        a: 'Quando um cliente VIP faz agendamento e informa o telefone cadastrado, o sistema automaticamente aplica o desconto configurado e mostra o valor com desconto na confirmação.'
      }
    ]
  },
  {
    category: 'WhatsApp',
    icon: MessageCircle,
    questions: [
      {
        q: 'Como funciona a integração com WhatsApp?',
        a: 'O sistema envia mensagens automáticas de confirmação de agendamento e lembretes. As mensagens são enviadas via Respond.io, uma plataforma profissional de WhatsApp Business.'
      },
      {
        q: 'O cliente precisa ter WhatsApp?',
        a: 'Para receber as confirmações e lembretes, sim. Mas o agendamento em si pode ser feito mesmo sem WhatsApp - basta o cliente informar um número válido.'
      }
    ]
  }
];

function FAQItem({ question, answer }) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border border-border rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-4 flex items-center justify-between text-left hover:bg-secondary/50 transition-colors"
      >
        <span className="font-medium pr-4">{question}</span>
        {isOpen ? (
          <ChevronUp className="w-5 h-5 text-primary flex-shrink-0" />
        ) : (
          <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
        )}
      </button>
      {isOpen && (
        <div className="px-4 pb-4 text-muted-foreground whitespace-pre-line">
          {answer}
        </div>
      )}
    </div>
  );
}

export default function FAQPage() {
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
        <div className="text-center mb-12">
          <h1 className="font-heading text-4xl font-bold uppercase mb-4">Perguntas Frequentes</h1>
          <p className="text-muted-foreground text-lg">
            Encontre respostas para as dúvidas mais comuns sobre o BarberHub
          </p>
        </div>
        
        <div className="space-y-8">
          {faqs.map((category, index) => (
            <section key={index}>
              <h2 className="font-heading text-xl font-bold uppercase mb-4 flex items-center gap-2">
                <category.icon className="w-5 h-5 text-primary" />
                {category.category}
              </h2>
              <div className="space-y-3">
                {category.questions.map((faq, faqIndex) => (
                  <FAQItem key={faqIndex} question={faq.q} answer={faq.a} />
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Contact */}
        <div className="mt-12 p-6 bg-primary/10 rounded-xl text-center">
          <h3 className="font-heading text-xl font-bold uppercase mb-2">
            Ainda tem dúvidas?
          </h3>
          <p className="text-muted-foreground mb-4">
            Entre em contato com a gente que ajudamos você!
          </p>
          <a 
            href="mailto:contato@barberhubpro.com.br"
            className="inline-flex items-center gap-2 text-primary hover:underline font-medium"
          >
            <Mail className="w-5 h-5" />
            contato@barberhubpro.com.br
          </a>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
