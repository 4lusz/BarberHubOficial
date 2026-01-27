# BarberHub - PRD (Product Requirements Document)

## Descrição
SaaS de agendamento para barbearias, multi-tenant, moderno e escalável.

## Problema Original
Barbeiros usam WhatsApp para agendar clientes, o que é desorganizado e gera perda de clientes.

---

## ✅ Funcionalidades Implementadas

### Autenticação e Cadastro
- [x] Cadastro/Login de Barbeiro (JWT + Google OAuth)
- [x] **Fluxo de cadastro pago obrigatório**: Registro → Seleção de Plano → Pagamento → Dashboard
- [x] Coleta de localização (GPS) no cadastro da barbearia

### Barbearia
- [x] Criação de barbearia com link público único (/b/{slug})
- [x] **Cores personalizadas** (cor principal + fundo)
- [x] **QR Code** para compartilhamento
- [x] Configuração de endereço e localização

### Serviços e Profissionais
- [x] CRUD de Serviços (nome, duração, preço)
- [x] CRUD de Profissionais (opcional)
- [x] Configuração de Horários de Funcionamento
- [x] **Bloqueios manuais de horários** (férias, almoço, compromissos)

### Agendamentos
- [x] Página pública de agendamento
- [x] Fluxo: serviço → profissional → data/hora → dados → confirmar
- [x] Dashboard com estatísticas
- [x] Agenda visual com navegação por data e filtros
- [x] Ações: confirmar, cancelar, concluir agendamentos

### Pagamentos
- [x] Dois planos de assinatura (Comum R$49,90 / Premium R$99,90)
- [x] **Integração Mercado Pago** (PIX + Cartão) ✅ CONFIGURADO
- [x] Pagamento obrigatório no cadastro
- [x] Webhook para confirmação de pagamento
- [x] **Endpoint de renovação** `/api/subscription/renew`
- [x] **Status da assinatura** `/api/subscription/status`

### Notificações WhatsApp
- [x] **Integração Twilio WhatsApp** ✅ CONFIGURADO E TESTADO
- [x] **Lembretes automáticos** 30 min antes do agendamento
- [x] Scheduler rodando a cada 5 minutos
- [x] Notificações de renovação de assinatura

### Relatórios (Premium)
- [x] Relatório diário (disponível para todos)
- [x] Relatório semanal com breakdown diário
- [x] Faturamento por serviço
- [x] Faturamento por horário
- [x] Faturamento por profissional
- [x] Top clientes (ordenado por visitas e valor gasto)

### Cobrança Recorrente
- [x] Job a cada 12h verifica assinaturas expirando
- [x] Envia lembrete por WhatsApp 3 dias antes
- [x] Endpoint de renovação com Mercado Pago

---

## Stack Técnica
- **Backend**: FastAPI + MongoDB + APScheduler
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: JWT + Emergent Google OAuth
- **Pagamento**: Mercado Pago ✅
- **WhatsApp**: Twilio ✅

---

## Jobs Automáticos (Scheduler)

| Job | Intervalo | Função |
|-----|-----------|--------|
| check_and_send_reminders | 5 min | Envia lembretes WhatsApp |
| check_expired_subscriptions | 1 hora | Desativa planos expirados |
| process_recurring_billing | 12 horas | Envia avisos de renovação |

---

## APIs Principais

### Autenticação
- `POST /api/auth/register` - Cadastro
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Usuário atual

### Assinatura
- `GET /api/plans` - Lista planos
- `POST /api/subscription/create` - Criar assinatura
- `POST /api/subscription/renew` - Renovar assinatura
- `GET /api/subscription/status` - Status da assinatura
- `POST /api/barbershops/activate` - Ativar barbearia

### Relatórios
- `GET /api/reports/daily` - Relatório diário
- `GET /api/reports/weekly` - Relatório semanal (Premium)
- `GET /api/reports/revenue` - Faturamento detalhado (Premium)
- `GET /api/reports/clients` - Top clientes (Premium)

### Tasks
- `GET /api/tasks/scheduler-status` - Status do scheduler
- `POST /api/tasks/send-reminders` - Trigger manual
- `POST /api/tasks/test-whatsapp?phone=X` - Teste WhatsApp

---

## Credenciais Configuradas

| Serviço | Status | Chave |
|---------|--------|-------|
| Mercado Pago | ✅ Ativo | APP_USR-71754... |
| Twilio | ✅ Ativo | AC19009... |

---

## Backlog

### P1 - Importante
- [ ] Página de upgrade de plano no frontend
- [ ] Página de status da assinatura no dashboard
- [ ] Histórico de pagamentos

### P2 - Nice to Have
- [ ] Múltiplas unidades por conta
- [ ] App mobile nativo
- [ ] Dashboard de analytics avançado
- [ ] Integração com Google Calendar

---

*Última atualização: 27 Janeiro 2026*
