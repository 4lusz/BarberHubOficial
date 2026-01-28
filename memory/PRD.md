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
- [x] Lembretes de renovação 3 dias antes (via WhatsApp)

### Notificações WhatsApp - Respond.io
- [x] **Integração Respond.io** ✅ (API configurada)
- [x] Confirmação automática ao criar agendamento
- [x] Lembretes automáticos 30 min antes
- [x] Notificações incluem localização (Google Maps)
- [x] Mensagens com desconto VIP (quando aplicável)

### Relatórios (Premium)
- [x] Relatório diário (todos os planos)
- [x] Relatório semanal (Premium)
- [x] Faturamento por serviço/horário/profissional (Premium)
- [x] Top clientes (Premium)
- [x] **Bloqueio correto** - usuários plano Comum recebem 403

### Clientes VIP (Premium)
- [x] Cadastrar clientes como VIP
- [x] Definir percentual de desconto por cliente
- [x] **Desconto aplicado automaticamente no agendamento**
- [x] Verificação VIP no frontend (ao digitar telefone)
- [x] WhatsApp de boas-vindas ao tornar-se VIP
- [x] **Bloqueio correto** - usuários plano Comum recebem 403

### Área do Cliente Final
- [x] Login por telefone + senha
- [x] Histórico de agendamentos (próximos, passados, cancelados)
- [x] Visualização de status VIP
- [x] Descontos em múltiplas barbearias
- [x] Cancelamento de agendamentos

---

## Planos de Assinatura

### Plano Comum (R$49,90/mês)
- Criação automática da barbearia
- Agendamentos online ilimitados
- Agenda digital organizada
- Cadastro de serviços e profissionais
- Configuração de horários
- Link público para clientes
- Confirmação automática de agendamentos
- Acesso pelo celular ou computador

### Plano Premium (R$99,90/mês)
- Tudo do Plano Comum +
- Relatórios de faturamento
- Lucro por profissional
- Lucro por horário de atendimento
- Estatísticas de horários mais vendidos
- Histórico financeiro da barbearia
- Gestão avançada de clientes
- **Criação de clientes VIP com desconto**
- Controle de clientes recorrentes
- Prioridade em novas funcionalidades

---

## Conta Demo Premium

**Credenciais de acesso:**
- Email: `demo@barberhubpro.com.br`
- Senha: `Demo@2024`
- URL pública: `barberhubpro.com.br/b/demo-premium`

**Dados de teste:**
- 5 serviços cadastrados
- 2 profissionais
- 1 cliente VIP (telefone: +5511966666666, desconto: 15%)

---

## Jobs Automáticos (APScheduler)

| Job | Intervalo | Função |
|-----|-----------|--------|
| Lembretes WhatsApp | 5 min | Envia 30 min antes do horário |
| Verificar expiração | 1 hora | Desativa planos expirados |
| Aviso de renovação | 12 horas | Lembra 3 dias antes da expiração |

---

## Integrações Configuradas

| Serviço | Status | Modo |
|---------|--------|------|
| Mercado Pago | ✅ Ativo | **PRODUÇÃO** |
| Respond.io (WhatsApp) | ✅ Configurado | Produção |
| Resend (Email) | ✅ Ativo | Produção |

---

## APIs Principais

### Públicas
- `GET /api/plans` - Lista planos
- `GET /api/barbershops/public/{slug}` - Dados da barbearia
- `GET /api/vip-clients/check/{phone}?barbershop_id=X` - Verifica VIP
- `POST /api/appointments` - Cria agendamento (aplica desconto VIP)
- `GET /api/appointments/availability/{barbershop_id}` - Horários disponíveis

### Autenticadas (Barbeiro)
- `POST /api/auth/{register, login}` - Autenticação
- `POST /api/subscription/create` - Criar assinatura (Mercado Pago)
- `POST /api/subscription/renew` - Renovar assinatura
- `GET /api/barbershops/me` - Dados da minha barbearia
- `GET /api/services` - Listar serviços
- `GET /api/professionals` - Listar profissionais
- `GET /api/appointments` - Listar agendamentos
- `GET /api/dashboard/stats` - Estatísticas do dashboard
- `GET /api/reports/daily` - Relatório diário (todos)
- `GET /api/reports/weekly` - Relatório semanal (Premium)
- `GET /api/reports/revenue` - Relatório de faturamento (Premium)
- `GET /api/vip-clients` - Lista VIPs (Premium)
- `POST /api/vip-clients` - Adiciona VIP (Premium)

### Autenticadas (Cliente)
- `POST /api/auth/client/{register, login}` - Autenticação cliente
- `GET /api/appointments/client` - Meus agendamentos
- `GET /api/client/profile` - Perfil com status VIP

---

## Credenciais de Produção

Todas as credenciais estão no arquivo `/app/backend/.env`:
- `MERCADOPAGO_ACCESS_TOKEN` - Token de produção
- `MERCADOPAGO_PUBLIC_KEY` - Chave pública
- `RESPONDIO_API_TOKEN` - Token da API
- `RESPONDIO_CHANNEL_ID` - ID do canal WhatsApp
- `FRONTEND_URL` - https://barberhubpro.com.br

---

## Arquitetura

```
/app/
├── backend/
│   ├── .env                    # Credenciais de produção
│   ├── requirements.txt
│   ├── server.py               # FastAPI monolítico
│   └── tests/
│       └── test_barberhub_e2e.py
├── frontend/
│   ├── .env
│   ├── package.json
│   └── src/
│       ├── App.js              # Rotas
│       ├── components/
│       │   └── layouts/DashboardLayout.js
│       ├── contexts/AuthContext.js
│       ├── lib/api.js
│       └── pages/
│           ├── AgendaPage.js
│           ├── BusinessHoursPage.js
│           ├── ClientAreaPage.js       # Área do cliente
│           ├── Dashboard.js
│           ├── LandingPage.js
│           ├── LoginPage.js
│           ├── PaymentPage.js
│           ├── PaymentSuccessPage.js
│           ├── ProfessionalsPage.js
│           ├── PublicBookingPage.js    # Agendamento público
│           ├── RegisterPage.js
│           ├── ReportsPage.js          # Premium
│           ├── SelectPlanPage.js
│           ├── ServicesPage.js
│           ├── SettingsPage.js
│           ├── TimeBlocksPage.js
│           └── VipClientsPage.js       # Premium
└── memory/
    └── PRD.md
```

---

## Backlog

### P0 - Concluído ✅
- [x] Mercado Pago produção
- [x] Desconto VIP automático
- [x] WhatsApp confirmação/lembretes
- [x] Área do cliente final
- [x] Validação E2E completa

### P1 - Melhorias Futuras
- [ ] Cobrança recorrente automática (cartão salvo)
- [ ] Refatorar backend em módulos (models/, routes/, services/)
- [ ] Métricas avançadas (taxa de ocupação, etc.)

### P2 - Nice to Have
- [ ] Integração Google Calendar
- [ ] App mobile nativo
- [ ] Sistema de avaliações

---

*Última atualização: 28 Janeiro 2026*
