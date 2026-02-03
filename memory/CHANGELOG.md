# BarberHub - Changelog

## [2026-02-03] - Melhorias Visuais e Verificação Meta

### Verificação do Meta Business
- **Meta tag de verificação Facebook** adicionada em `index.html`
- **Página /sobre** criada com dados completos da empresa
- **Footer com dados da empresa** adicionado em todas as páginas públicas:
  - Razão Social: 64.876.912 ALUISIO MOURA PRADO
  - CNPJ: 64.876.912/0001-90
  - Endereço: Rua Palestina 1774, Jataí/GO - 75803-110
  - Telefone: +55 64 99976-6685

### Seleção de Múltiplos Serviços
- Cliente pode selecionar mais de um serviço por agendamento
- Resumo mostra quantidade de serviços, duração total e preço total
- Backend atualizado para aceitar `service_ids` (array)

### Melhorias de UI/UX na Página de Agendamento
- **Botão "Fazer outro agendamento"** agora sempre visível (fundo sólido, não outline)
- **Botões de horário** com melhor contraste (fundo zinc-800, borda visível)
- **Formulário de dados** com inputs maiores (h-12), mais espaçamento
- **Card de resumo** redesenhado com ícone de calendário
- **Botão de confirmação** maior (h-14) e mais impactante
- **Botão de voltar** com hover state mais visível
- **Indicador VIP** destacado com fundo amarelo translúcido
- **Spinner de loading** customizado no botão de confirmação
- **Animações** de hover nos cards de profissionais

### Arquivos Criados
- `/app/frontend/src/components/Footer.js` - Componente de rodapé reutilizável
- `/app/frontend/src/pages/AboutPage.js` - Página Sobre

### Arquivos Modificados
- `/app/frontend/src/pages/PublicBookingPage.js` - Melhorias visuais completas
- `/app/frontend/src/pages/LandingPage.js` - Footer atualizado com dados da empresa
- `/app/frontend/src/pages/TermsPage.js` - Footer atualizado
- `/app/frontend/src/pages/PrivacyPage.js` - Footer atualizado
- `/app/frontend/src/pages/FAQPage.js` - Footer atualizado
- `/app/frontend/src/App.js` - Rota /sobre adicionada
- `/app/backend/server.py` - Suporte a múltiplos serviços

---

## [2026-02-01] - Verificação de Segurança PIX

### Verificado
- Fluxo de pagamento PIX está seguro
- Nenhuma rota de ativação existe no frontend
- Ativação acontece SOMENTE via webhook do Mercado Pago

### Testes Adicionados
- `/app/backend/tests/test_pix_payment_security.py` - 11 testes de segurança

### Documentação
- PRD.md atualizado com seção de segurança do fluxo de pagamento

---

## [2026-01-28] - Deploy Inicial

### Implementado
- Multi-tenant completo para barbearias
- Personalização visual (logo, banner, cores, fontes, galeria)
- Pagamentos via Mercado Pago (PIX e Cartão)
- Notificações WhatsApp via Twilio
- Clientes VIP com desconto automático
- Relatórios Premium
- Painel Super Admin
- Páginas institucionais (FAQ, Termos, Privacidade)

### Integrações
- Mercado Pago (Produção)
- Twilio WhatsApp Business API
- Resend (Email)
