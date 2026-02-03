import { Link } from 'react-router-dom';
import { Scissors, Phone, MapPin, Building2 } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="bg-zinc-950 border-t border-zinc-800 py-8 mt-auto">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Logo e Descrição */}
          <div>
            <Link to="/" className="flex items-center gap-2 mb-4">
              <Scissors className="w-6 h-6 text-amber-500" />
              <span className="font-bold text-xl text-white">
                BARBER<span className="text-amber-500">HUB</span>
              </span>
            </Link>
            <p className="text-zinc-400 text-sm">
              Sistema de agendamento online para barbearias. 
              Gerencie sua agenda, clientes e pagamentos em um só lugar.
            </p>
          </div>

          {/* Links */}
          <div>
            <h3 className="font-semibold text-white mb-4">Links</h3>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/sobre" className="text-zinc-400 hover:text-amber-500 transition-colors">
                  Sobre Nós
                </Link>
              </li>
              <li>
                <Link to="/faq" className="text-zinc-400 hover:text-amber-500 transition-colors">
                  Perguntas Frequentes
                </Link>
              </li>
              <li>
                <Link to="/termos" className="text-zinc-400 hover:text-amber-500 transition-colors">
                  Termos de Uso
                </Link>
              </li>
              <li>
                <Link to="/privacidade" className="text-zinc-400 hover:text-amber-500 transition-colors">
                  Política de Privacidade
                </Link>
              </li>
            </ul>
          </div>

          {/* Dados da Empresa */}
          <div>
            <h3 className="font-semibold text-white mb-4">Dados da Empresa</h3>
            <ul className="space-y-3 text-sm text-zinc-400">
              <li className="flex items-start gap-2">
                <Building2 className="w-4 h-4 mt-0.5 text-amber-500 flex-shrink-0" />
                <div>
                  <p className="font-medium text-zinc-300">64.876.912 ALUISIO MOURA PRADO</p>
                  <p>CNPJ: 64.876.912/0001-90</p>
                </div>
              </li>
              <li className="flex items-start gap-2">
                <MapPin className="w-4 h-4 mt-0.5 text-amber-500 flex-shrink-0" />
                <span>Rua Palestina 1774, Jataí/GO - 75803-110</span>
              </li>
              <li className="flex items-center gap-2">
                <Phone className="w-4 h-4 text-amber-500 flex-shrink-0" />
                <a href="tel:+5564999766685" className="hover:text-amber-500 transition-colors">
                  +55 64 99976-6685
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Copyright */}
        <div className="border-t border-zinc-800 mt-8 pt-6 text-center text-sm text-zinc-500">
          <p>© {new Date().getFullYear()} BarberHub. Todos os direitos reservados.</p>
          <p className="mt-1">
            Operado por 64.876.912 ALUISIO MOURA PRADO - CNPJ: 64.876.912/0001-90
          </p>
        </div>
      </div>
    </footer>
  );
}
