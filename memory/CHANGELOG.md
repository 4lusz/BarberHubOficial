# BarberHub - Changelog

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
