# BarberHub - PRD (Product Requirements Document)

## Descrição
SaaS de agendamento para barbearias, multi-tenant, moderno e escalável.

## Problema Original
Barbeiros usam WhatsApp para agendar clientes, o que é desorganizado e gera perda de clientes.

## User Personas
1. **Barbeiro/Dono**: Gerencia barbearia, serviços, horários, profissionais e agendamentos
2. **Cliente**: Agenda serviços online sem necessidade de conta

---

## Requisitos Core (Implementados) ✅

### Autenticação e Cadastro
- [x] Cadastro/Login de Barbeiro (JWT + Google OAuth)
- [x] **Fluxo de cadastro pago obrigatório**:
  - Registro → Seleção de Plano → Pagamento → Dashboard
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
- [x] Dashboard com estatísticas (hoje, pendentes, faturamento, clientes)
- [x] Agenda visual com navegação por data e filtros
- [x] Ações: confirmar, cancelar, concluir agendamentos

### Pagamentos
- [x] Dois planos de assinatura (Comum R$49,90 / Premium R$99,90)
- [x] **Integração Mercado Pago** (PIX + Cartão)
- [x] Pagamento obrigatório no cadastro
- [x] Webhook para confirmação de pagamento
- [x] Sistema de renovação automática

### Notificações
- [x] Estrutura para emails (Resend)
- [x] **Integração Twilio WhatsApp**
- [x] **Sistema de lembretes automáticos** (30 min antes do agendamento)
- [x] Scheduler rodando a cada 5 minutos

### Área do Cliente
- [x] Login opcional para clientes
- [x] Histórico de agendamentos

---

## Stack Técnica
- **Backend**: FastAPI + MongoDB + APScheduler
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: JWT + Emergent Google OAuth
- **Email**: Resend
- **Pagamento**: Mercado Pago
- **WhatsApp**: Twilio
- **Tema**: Dark mode com accent Amber/Gold personalizável

---

## Planos de Assinatura

### Plano Comum - R$ 49,90/mês
- Criação automática da barbearia
- Agendamentos online ilimitados
- Agenda digital organizada
- Cadastro de serviços e profissionais
- Configuração de horários
- Link público para clientes
- Confirmação automática
- Lembretes WhatsApp 30 min antes

### Plano Premium - R$ 99,90/mês
- Tudo do Plano Comum +
- Relatórios de faturamento
- Lucro por profissional
- Lucro por horário de atendimento
- Estatísticas de horários vendidos
- Histórico financeiro
- Gestão avançada de clientes
- Criação de planos/mensalidades para clientes
- Controle de clientes recorrentes
- Prioridade em novas funcionalidades

---

## Backlog (P0 - Crítico)
- [x] ~~Configurar MERCADOPAGO_ACCESS_TOKEN~~ ✅
- [x] ~~Configurar credenciais Twilio~~ ✅
- [ ] Configurar RESEND_API_KEY para emails

## Backlog (P1 - Importante)
- [ ] Relatórios completos de faturamento (Premium)
- [ ] Criação de planos de fidelidade para clientes (Premium)
- [ ] Cobrança recorrente automática (Mercado Pago Subscriptions)

## Backlog (P2 - Nice to Have)
- [ ] Múltiplas unidades por conta
- [ ] App mobile nativo
- [ ] Dashboard de analytics avançado

---

## APIs Externas Integradas

| Serviço | Status | Uso |
|---------|--------|-----|
| Mercado Pago | ✅ Configurado | Pagamentos (PIX/Cartão) |
| Twilio | ✅ Configurado | Lembretes WhatsApp |
| Resend | ⚠️ Pendente chave | Emails transacionais |

---

## Endpoints Principais

### Autenticação
- `POST /api/auth/register` - Cadastro
- `POST /api/auth/login` - Login
- `POST /api/auth/google-session` - OAuth Google
- `GET /api/auth/me` - Usuário atual

### Planos e Pagamentos
- `GET /api/plans` - Lista planos
- `POST /api/subscription/create` - Criar assinatura (MP)
- `POST /api/barbershops/activate` - Ativar barbearia
- `POST /api/webhooks/mercadopago` - Webhook MP

### Barbearia
- `GET /api/barbershops/me` - Minha barbearia
- `POST /api/barbershops` - Criar barbearia
- `PUT /api/barbershops` - Atualizar barbearia
- `GET /api/barbershops/public/{slug}` - Página pública

### Serviços e Profissionais
- `GET/POST/PUT/DELETE /api/services`
- `GET/POST/PUT/DELETE /api/professionals`

### Agendamentos
- `GET /api/appointments` - Listar agendamentos
- `POST /api/appointments` - Criar agendamento
- `PUT /api/appointments/{id}` - Atualizar
- `DELETE /api/appointments/{id}` - Cancelar
- `GET /api/appointments/availability/{barbershop_id}` - Disponibilidade

### Background Tasks
- `GET /api/tasks/scheduler-status` - Status do scheduler
- `POST /api/tasks/send-reminders` - Trigger manual lembretes
- `POST /api/tasks/test-whatsapp` - Testar WhatsApp

---

## Arquitetura de Arquivos

```
/app/
├── backend/
│   ├── .env (credenciais)
│   ├── requirements.txt
│   ├── server.py (API monolítica)
│   └── tests/
├── frontend/
│   ├── src/
│   │   ├── App.js (rotas)
│   │   ├── contexts/AuthContext.js
│   │   ├── lib/api.js
│   │   ├── pages/
│   │   │   ├── RegisterPage.js
│   │   │   ├── SelectPlanPage.js
│   │   │   ├── PaymentPage.js
│   │   │   ├── PaymentSuccessPage.js
│   │   │   ├── Dashboard.js
│   │   │   └── ...
│   │   └── components/
│   └── package.json
└── memory/
    └── PRD.md
```

---

*Última atualização: Janeiro 2026*
