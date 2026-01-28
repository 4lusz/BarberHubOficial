# BarberHub - PRD (Product Requirements Document)

## Descrição
SaaS de agendamento para barbearias, multi-tenant, moderno e escalável.

**Domínio de Produção:** `barberhubpro.com.br`

---

## ✅ Funcionalidades Implementadas

### Autenticação e Cadastro
- [x] Cadastro/Login de Barbeiro (JWT + Google OAuth)
- [x] Fluxo de cadastro pago obrigatório
- [x] Coleta de localização (GPS)
- [x] Redirecionamento para seleção de plano após cadastro

### Barbearia
- [x] Link público único (/b/{slug})
- [x] Cores personalizadas (primária + fundo)
- [x] QR Code para compartilhamento

### Serviços e Profissionais
- [x] CRUD de Serviços e Profissionais
- [x] Configuração de Horários de Funcionamento
- [x] Bloqueios manuais de horários

### Agendamentos
- [x] Página pública de agendamento
- [x] Dashboard com estatísticas
- [x] Agenda visual
- [x] **Desconto VIP automático** (verificado pelo telefone)

### Pagamentos - Mercado Pago
- [x] Planos Comum (R$49,90) e Premium (R$99,90)
- [x] **Integração Mercado Pago PRODUÇÃO** ✅
- [x] Endpoint de renovação
- [x] Webhook para confirmação de pagamento
- [x] URLs de callback configuradas para `barberhubpro.com.br`

### Notificações WhatsApp - Respond.io
- [x] **Integração Respond.io** ✅ (API configurada)
- [x] Confirmação automática ao criar agendamento
- [x] Lembretes automáticos 30 min antes
- [x] Notificações incluem localização (Google Maps)
- [x] Mensagens com desconto VIP (quando aplicável)

### Relatórios (Premium)
- [x] Relatório diário (todos)
- [x] Relatório semanal (Premium)
- [x] Faturamento por serviço/horário/profissional
- [x] Top clientes

### Clientes VIP (Premium)
- [x] Cadastrar clientes como VIP
- [x] Definir percentual de desconto por cliente
- [x] **Desconto aplicado automaticamente no agendamento**
- [x] Verificação VIP no frontend (ao digitar telefone)
- [x] WhatsApp de boas-vindas ao tornar-se VIP

---

## Jobs Automáticos (APScheduler)

| Job | Intervalo | Função |
|-----|-----------|--------|
| Lembretes WhatsApp | 5 min | Envia 30 min antes |
| Verificar expiração | 1 hora | Desativa planos |
| Aviso de renovação | 12 horas | Lembra 3 dias antes |

---

## Integrações Configuradas

| Serviço | Status | Modo |
|---------|--------|------|
| Mercado Pago | ✅ Ativo | **PRODUÇÃO** |
| Respond.io (WhatsApp) | ✅ Configurado | Produção |
| Resend (Email) | ✅ Ativo | Produção |

---

## Fluxo de Desconto VIP

1. Cliente acessa página pública `/b/{slug}`
2. Seleciona serviço e horário
3. Ao digitar telefone, sistema verifica se é VIP
4. Se VIP: mostra badge, auto-preenche nome, exibe desconto no resumo
5. Ao confirmar: desconto é aplicado e salvo no agendamento
6. WhatsApp de confirmação inclui o valor com desconto

---

## APIs Principais

### Públicas
- `GET /api/plans` - Lista planos
- `GET /api/barbershops/public/{slug}` - Dados da barbearia
- `GET /api/vip-clients/check/{phone}?barbershop_id=X` - Verifica VIP
- `POST /api/appointments` - Cria agendamento (aplica desconto VIP)

### Autenticadas
- `POST /api/auth/{register, login}` - Autenticação
- `POST /api/subscription/create` - Criar assinatura (Mercado Pago)
- `GET /api/vip-clients` - Lista VIPs (Premium)
- `POST /api/vip-clients` - Adiciona VIP (Premium)
- `GET /api/reports/revenue` - Relatório (Premium)

---

## Credenciais de Produção

Todas as credenciais estão no arquivo `/app/backend/.env`:
- `MERCADOPAGO_ACCESS_TOKEN` - Token de produção
- `MERCADOPAGO_PUBLIC_KEY` - Chave pública
- `RESPONDIO_API_TOKEN` - Token da API
- `RESPONDIO_CHANNEL_ID` - ID do canal WhatsApp
- `FRONTEND_URL` - https://barberhubpro.com.br

---

## Backlog

### P0 - Crítico (Produção)
- [x] ~~Configurar Mercado Pago produção~~ ✅
- [x] ~~Desconto VIP no agendamento~~ ✅
- [x] ~~WhatsApp de confirmação~~ ✅

### P1 - Importante
- [ ] Cobrança recorrente automática (cartão salvo)
- [ ] Página de histórico para o cliente final
- [ ] Métricas avançadas (taxa de ocupação, etc.)

### P2 - Nice to Have
- [ ] Integração Google Calendar
- [ ] App mobile nativo
- [ ] Sistema de avaliações

---

*Última atualização: 28 Janeiro 2026*
