import { Link } from 'react-router-dom';
import { Scissors, Phone, MapPin, Building2, Mail, ArrowLeft } from 'lucide-react';
import { Button } from '../components/ui/button';
import Footer from '../components/Footer';

export default function AboutPage() {
  return (
    <div className="min-h-screen bg-zinc-950 flex flex-col">
      {/* Header */}
      <header className="border-b border-zinc-800 py-4">
        <div className="container mx-auto px-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <Scissors className="w-6 h-6 text-amber-500" />
            <span className="font-bold text-xl text-white">
              BARBER<span className="text-amber-500">HUB</span>
            </span>
          </Link>
          <Link to="/">
            <Button variant="ghost" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Voltar
            </Button>
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-grow container mx-auto px-4 py-12">
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-8">
            Sobre o <span className="text-amber-500">BarberHub</span>
          </h1>

          {/* Sobre a Plataforma */}
          <section className="mb-12">
            <h2 className="text-xl font-semibold text-white mb-4">O que é o BarberHub?</h2>
            <div className="text-zinc-400 space-y-4">
              <p>
                O BarberHub é uma plataforma de agendamento online desenvolvida especialmente 
                para barbearias que desejam modernizar seu atendimento e organizar sua agenda 
                de forma profissional.
              </p>
              <p>
                Nossa missão é ajudar barbearias a crescerem, eliminando a perda de clientes 
                por WhatsApp lotado e oferecendo uma experiência de agendamento simples e 
                eficiente para seus clientes.
              </p>
              <p>
                Com o BarberHub, donos de barbearias podem gerenciar serviços, profissionais, 
                horários de funcionamento, receber pagamentos e enviar confirmações automáticas 
                via WhatsApp - tudo em um único lugar.
              </p>
            </div>
          </section>

          {/* Dados da Empresa */}
          <section className="bg-zinc-900 rounded-xl p-6 md:p-8 border border-zinc-800">
            <h2 className="text-xl font-semibold text-white mb-6">Dados da Empresa</h2>
            
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-zinc-300 font-medium">Razão Social</p>
                  <p className="text-zinc-400">64.876.912 ALUISIO MOURA PRADO</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Building2 className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-zinc-300 font-medium">CNPJ</p>
                  <p className="text-zinc-400">64.876.912/0001-90</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-zinc-300 font-medium">Endereço</p>
                  <p className="text-zinc-400">Rua Palestina 1774, Jataí/GO - 75803-110</p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Phone className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-zinc-300 font-medium">Telefone</p>
                  <a href="tel:+5564999766685" className="text-zinc-400 hover:text-amber-500 transition-colors">
                    +55 64 99976-6685
                  </a>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <Mail className="w-5 h-5 text-amber-500 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-zinc-300 font-medium">E-mail</p>
                  <a href="mailto:contato@barberhubpro.com.br" className="text-zinc-400 hover:text-amber-500 transition-colors">
                    contato@barberhubpro.com.br
                  </a>
                </div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-zinc-800">
              <p className="text-zinc-500 text-sm">
                O BarberHub é uma plataforma operada por 64.876.912 ALUISIO MOURA PRADO, 
                empresa brasileira registrada sob o CNPJ 64.876.912/0001-90, com sede em 
                Jataí, Goiás.
              </p>
            </div>
          </section>

          {/* CTA */}
          <section className="mt-12 text-center">
            <p className="text-zinc-400 mb-4">Pronto para modernizar sua barbearia?</p>
            <Link to="/cadastro">
              <Button className="bg-amber-500 hover:bg-amber-600 text-black font-semibold px-8">
                Começar Agora
              </Button>
            </Link>
          </section>
        </div>
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
