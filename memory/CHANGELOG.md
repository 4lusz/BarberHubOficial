# BarberHub - Changelog

## [2026-02-03] - Múltiplos Serviços e Meta Tag Facebook

### Implementado
- **Meta tag de verificação de domínio Facebook** - Adicionada em `/app/frontend/public/index.html` para verificação do Meta Business
- **Seleção de múltiplos serviços** - Cliente agora pode escolher mais de um serviço por agendamento

### Modificações Backend
- Modelo `AppointmentCreate` agora usa `service_ids: List[str]` em vez de `service_id: str`
- Modelo `Appointment` atualizado para armazenar `service_ids` (array)
- Endpoint `/api/appointments` (POST) calcula automaticamente:
  - Duração total (soma de todos os serviços)
  - Preço total (soma de todos os serviços)
- Compatibilidade retroativa mantida para agendamentos antigos com `service_id` único

### Modificações Frontend (`PublicBookingPage.js`)
- Interface de seleção com checkboxes para múltiplos serviços
- Resumo mostrando quantidade de serviços, duração e preço total
- Botão "Continuar" só habilitado quando há pelo menos 1 serviço selecionado
- Tela de sucesso atualizada para mostrar todos os serviços

### Arquivos Modificados
- `/app/frontend/public/index.html` - Meta tag Facebook
- `/app/frontend/src/pages/PublicBookingPage.js` - Seleção múltipla
- `/app/backend/server.py` - Models e endpoint de agendamento

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
