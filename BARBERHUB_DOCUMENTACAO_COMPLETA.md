# BarberHub - Documentação Completa

## Sumário

1. [Visão Geral](#1-visão-geral)
2. [Arquitetura Técnica](#2-arquitetura-técnica)
3. [Tipos de Usuário](#3-tipos-de-usuário)
4. [Funcionalidades por Módulo](#4-funcionalidades-por-módulo)
5. [Fluxos de Negócio](#5-fluxos-de-negócio)
6. [API Reference](#6-api-reference)
7. [Integrações Externas](#7-integrações-externas)
8. [Banco de Dados](#8-banco-de-dados)
9. [Segurança](#9-segurança)
10. [Variáveis de Ambiente](#10-variáveis-de-ambiente)

---

## 1. Visão Geral

### O que é o BarberHub?

O **BarberHub** é uma plataforma SaaS (Software as a Service) completa para gestão de barbearias. Permite que donos de barbearias criem sua presença digital com agendamento online, gestão de profissionais, relatórios financeiros e comunicação automatizada com clientes via WhatsApp.

### Proposta de Valor

- **Para Barbeiros:** Sistema completo de gestão da barbearia sem necessidade de conhecimento técnico
- **Para Clientes:** Agendamento fácil e rápido pelo celular, com confirmações automáticas
- **Multi-tenant:** Cada barbearia tem sua própria página personalizada com URL única

### Domínio de Produção
```
https://barberhubpro.com.br
```

### URLs das Barbearias
```
https://barberhubpro.com.br/b/{slug-da-barbearia}
```

---

## 2. Arquitetura Técnica

### Stack Tecnológico

| Camada | Tecnologia |
|--------|------------|
| **Frontend** | React 18, Tailwind CSS, Shadcn/UI |
| **Backend** | FastAPI (Python 3.11), Uvicorn |
| **Banco de Dados** | MongoDB Atlas |
| **Autenticação** | JWT (JSON Web Tokens) |
| **Pagamentos** | Mercado Pago API (PIX + Cartão Recorrente) |
| **Notificações** | Twilio WhatsApp Business API |
| **Email** | Resend API |
| **Hospedagem** | Kubernetes (Emergent Deployments) |

### Estrutura de Diretórios

```
/app
├── backend/
│   ├── server.py          # API principal (4600+ linhas)
│   ├── requirements.txt   # Dependências Python
│   ├── .env               # Variáveis de ambiente
│   └── uploads/           # Arquivos enviados (logos, banners)
│       ├── logos/
│       ├── banners/
│       └── gallery/
│
├── frontend/
│   ├── src/
│   │   ├── App.js                 # Rotas e navegação
│   │   ├── contexts/
│   │   │   └── AuthContext.js     # Estado global de autenticação
│   │   ├── pages/                 # 20+ páginas
│   │   │   ├── LandingPage.js
│   │   │   ├── LoginPage.js
│   │   │   ├── DashboardPage.js
│   │   │   ├── PublicBookingPage.js
│   │   │   ├── SuperAdminPage.js
│   │   │   └── ...
│   │   └── components/
│   │       └── ui/                # Componentes Shadcn
│   ├── package.json
│   └── .env
│
└── memory/
    ├── PRD.md                     # Requisitos do produto
    └── CHANGELOG.md               # Histórico de mudanças
```

### Arquitetura de Comunicação

```
┌─────────────┐     HTTPS      ┌─────────────┐
│   Cliente   │ ◄────────────► │   Frontend  │
│  (Browser)  │                │   (React)   │
└─────────────┘                └──────┬──────┘
                                      │
                                      │ /api/*
                                      ▼
                               ┌─────────────┐
                               │   Backend   │
                               │  (FastAPI)  │
                               └──────┬──────┘
                                      │
          ┌───────────────────────────┼───────────────────────────┐
          │                           │                           │
          ▼                           ▼                           ▼
   ┌─────────────┐           ┌─────────────┐           ┌─────────────┐
   │  MongoDB    │           │ Mercado Pago│           │   Twilio    │
   │   Atlas     │           │    API      │           │  WhatsApp   │
   └─────────────┘           └─────────────┘           └─────────────┘
```

---

## 3. Tipos de Usuário

### 3.1 Cliente Final (Não autenticado)
- Acessa a página pública da barbearia
- Realiza agendamentos
- Recebe confirmações por WhatsApp
- Não precisa criar conta

### 3.2 Cliente Autenticado (role: "client")
- Possui conta com email/senha
- Visualiza histórico de agendamentos
- Pode ser marcado como VIP

### 3.3 Barbeiro/Dono da Barbearia (role: "barber")
- Cria e gerencia a barbearia
- Acessa o dashboard administrativo
- Gerencia serviços, profissionais, horários
- Visualiza relatórios (Premium)
- Gerencia clientes VIP (Premium)
- **Requer assinatura ativa**

### 3.4 Super Admin (role: "super_admin")
- Acesso total ao sistema
- Gerencia todas as barbearias
- Visualiza métricas globais
- Pode suspender/ativar contas
- Acessa relatórios de WhatsApp e pagamentos

---

## 4. Funcionalidades por Módulo

### 4.1 Módulo de Autenticação

| Funcionalidade | Descrição |
|----------------|-----------|
| Cadastro de Barbeiro | Email, senha, nome. Cria conta e redireciona para pagamento |
| Login JWT | Autenticação via email/senha com token JWT (24h) |
| Google OAuth | Login social via Google (opcional) |
| Cadastro de Cliente | Para clientes que querem histórico |
| Recuperação de Senha | Via email (Resend API) |

**Fluxo de Cadastro do Barbeiro:**
```
1. Usuário preenche formulário de cadastro
2. Sistema cria usuário com role="barber"
3. Redireciona para seleção de plano (Comum/Premium)
4. Usuário realiza pagamento (PIX ou Cartão)
5. Webhook confirma pagamento
6. Barbearia é ativada (plan_status="active")
7. Usuário acessa o dashboard
```

### 4.2 Módulo de Barbearia

| Funcionalidade | Descrição |
|----------------|-----------|
| Criação da Barbearia | Nome, endereço, telefone, localização GPS |
| Personalização Visual | Logo, banner, cores, fontes, galeria |
| Página Pública | URL única com slug personalizado |
| QR Code | Gerado automaticamente para compartilhamento |
| Horários de Funcionamento | Configuração por dia da semana |
| Bloqueios de Horário | Impedir agendamentos em períodos específicos |

**Opções de Personalização:**

```javascript
{
  logo_url: "URL da logo",
  banner_url: "URL do banner",
  banner_zoom: 100-200,           // Zoom do banner (%)
  banner_offset_y: 0-100,         // Posição vertical (%)
  primary_color: "#F59E0B",       // Cor principal
  background_color: "#09090B",    // Cor de fundo
  font_style: "modern|classic|bold",
  about_text: "Descrição da barbearia",
  instagram_url: "...",
  facebook_url: "...",
  whatsapp_number: "..."
}
```

### 4.3 Módulo de Serviços

| Funcionalidade | Descrição |
|----------------|-----------|
| CRUD de Serviços | Nome, descrição, preço, duração |
| Ativação/Desativação | Controlar disponibilidade |
| Ordenação | Definir ordem de exibição |

**Exemplo de Serviço:**
```javascript
{
  service_id: "svc_xxx",
  barbershop_id: "barb_xxx",
  name: "Corte Masculino",
  description: "Corte completo com máquina e tesoura",
  price: 45.00,
  duration: 30,        // minutos
  is_active: true
}
```

### 4.4 Módulo de Profissionais

| Funcionalidade | Descrição |
|----------------|-----------|
| CRUD de Profissionais | Nome, foto, especialidades |
| Vinculação a Serviços | Quais serviços cada profissional faz |
| Status | Ativo/Inativo |

### 4.5 Módulo de Agendamentos

| Funcionalidade | Descrição |
|----------------|-----------|
| Agendamento Público | Cliente agenda sem login |
| Cálculo de Horários | Baseado em horário de funcionamento e bloqueios |
| Verificação de Conflito | Impede agendamentos sobrepostos |
| Desconto VIP Automático | Aplica desconto se cliente é VIP |
| Confirmação WhatsApp | Envia mensagem automática |
| Lembrete 30min | Job automático envia lembrete |

**Status do Agendamento:**
- `pending` - Aguardando
- `confirmed` - Confirmado
- `completed` - Concluído
- `cancelled` - Cancelado
- `no_show` - Não compareceu

**Fluxo de Agendamento:**
```
1. Cliente acessa página pública /b/{slug}
2. Seleciona serviço
3. Seleciona profissional (ou "Qualquer")
4. Seleciona data no calendário
5. Sistema calcula horários disponíveis
6. Cliente seleciona horário
7. Preenche nome, telefone, email
8. Sistema verifica se é VIP (aplica desconto)
9. Cria agendamento
10. Envia confirmação WhatsApp
11. Envia email de confirmação
12. Job agenda lembrete para 30min antes
```

### 4.6 Módulo de Pagamentos

| Funcionalidade | Descrição |
|----------------|-----------|
| Plano Comum | R$49,90/mês |
| Plano Premium | R$99,90/mês |
| PIX | Pagamento único, QR Code |
| Cartão Recorrente | Cobrança automática mensal |
| Webhook | Recebe notificações do Mercado Pago |
| Cancelamento | Mantém acesso até expirar |
| Renovação | Automática ou manual |

**Planos:**
```javascript
const SUBSCRIPTION_PLANS = {
  comum: {
    id: "comum",
    name: "Plano Comum",
    price: 49.90,
    features: ["Agendamentos ilimitados", "Personalização", "WhatsApp"]
  },
  premium: {
    id: "premium", 
    name: "Plano Premium",
    price: 99.90,
    features: ["Tudo do Comum", "Relatórios", "Clientes VIP", "Prioridade"]
  }
}
```

**Status da Assinatura:**
- `pending` - Aguardando pagamento
- `active` - Ativa
- `expired` - Expirada
- `cancelled` - Cancelada
- `suspended` - Suspensa (admin)

### 4.7 Módulo de Notificações (WhatsApp)

| Tipo | Gatilho | Template |
|------|---------|----------|
| Confirmação | Agendamento criado | booking_confirmation |
| Confirmação VIP | Agendamento de cliente VIP | booking_confirmation_vip |
| Lembrete | 30 min antes | appointment_reminder |
| PIX Confirmado | Webhook de pagamento | pix_payment_confirmation |
| Renovação | Pagamento recorrente OK | subscription_renewal |
| Falha Pagamento | Pagamento recorrente falhou | payment_failed |
| Lembrete Renovação | 3 dias antes de expirar | renewal_reminder |
| Bem-vindo VIP | Cliente marcado como VIP | vip_welcome |

**Formato do Número:**
- Entrada: `64999766685`, `(64) 99976-6685`, `+5564999766685`
- Normalizado: `+5564999766685`
- Twilio: `whatsapp:+5564999766685`

### 4.8 Módulo de Relatórios (Premium)

| Relatório | Descrição |
|-----------|-----------|
| Faturamento | Total por período, por serviço, por profissional |
| Agendamentos | Quantidade, taxa de conclusão, no-shows |
| Top Clientes | Clientes com mais agendamentos |
| Horários Populares | Análise de demanda por horário |
| Receita Diária/Semanal | Comparativos e tendências |

### 4.9 Módulo de Clientes VIP (Premium)

| Funcionalidade | Descrição |
|----------------|-----------|
| Cadastro VIP | Nome, telefone, desconto (%) |
| Desconto Automático | Aplicado no agendamento |
| Notificação | WhatsApp de boas-vindas |
| Badge | Exibido na página de agendamento |

### 4.10 Módulo Super Admin

| Funcionalidade | Descrição |
|----------------|-----------|
| Dashboard Global | Total de barbearias, receita, usuários |
| Lista de Barbearias | Todas as barbearias do sistema |
| Detalhes da Barbearia | Serviços, profissionais, agendamentos |
| Alterar Status | Ativar, suspender, expirar |
| Excluir Barbearia | Remove completamente |
| Relatório WhatsApp | Status da integração |
| Logs de Atividade | Auditoria do sistema |
| Limpeza de Dados | Remover dados de teste |

---

## 5. Fluxos de Negócio

### 5.1 Fluxo Completo: Novo Barbeiro

```
┌──────────────────────────────────────────────────────────────────┐
│                    FLUXO DE CADASTRO DO BARBEIRO                 │
└──────────────────────────────────────────────────────────────────┘

1. LANDING PAGE
   └─► Clica em "Começar Agora"

2. CADASTRO
   └─► Preenche: nome, email, senha
   └─► Sistema cria usuário (role=barber, barbershop_id=null)

3. SELEÇÃO DE PLANO
   └─► Escolhe Comum (R$49,90) ou Premium (R$99,90)

4. CRIAÇÃO DA BARBEARIA
   └─► Preenche: nome da barbearia, endereço, telefone
   └─► Coleta localização GPS
   └─► Sistema cria barbearia (plan_status=pending)

5. PAGAMENTO
   ├─► PIX:
   │   └─► Gera QR Code
   │   └─► Usuário paga
   │   └─► Webhook confirma
   │   └─► plan_status = "active"
   │
   └─► CARTÃO:
       └─► Redireciona para Mercado Pago
       └─► Usuário cadastra cartão
       └─► Autorização confirmada
       └─► plan_status = "active"

6. DASHBOARD
   └─► Acesso liberado
   └─► Configura serviços, profissionais, horários
   └─► Personaliza página

7. PÁGINA PÚBLICA ATIVA
   └─► /b/{slug} disponível para clientes
```

### 5.2 Fluxo: Agendamento pelo Cliente

```
┌──────────────────────────────────────────────────────────────────┐
│                    FLUXO DE AGENDAMENTO                          │
└──────────────────────────────────────────────────────────────────┘

1. ACESSO À PÁGINA PÚBLICA
   └─► /b/{slug}
   └─► Carrega dados da barbearia

2. SELEÇÃO DE SERVIÇO
   └─► Lista serviços ativos
   └─► Cliente escolhe um

3. SELEÇÃO DE PROFISSIONAL
   └─► Lista profissionais
   └─► Opção "Qualquer Profissional"

4. SELEÇÃO DE DATA
   └─► Calendário (próximos 30 dias)
   └─► Dias fechados desabilitados

5. SELEÇÃO DE HORÁRIO
   └─► Calcula slots disponíveis:
       - Horário de funcionamento
       - Duração do serviço
       - Agendamentos existentes
       - Bloqueios manuais

6. DADOS DO CLIENTE
   └─► Nome, telefone, email

7. VERIFICAÇÃO VIP
   └─► Busca cliente por telefone
   └─► Se VIP: aplica desconto

8. CRIAÇÃO DO AGENDAMENTO
   └─► Salva no banco
   └─► Status = "pending"

9. NOTIFICAÇÕES
   └─► WhatsApp: confirmação com detalhes
   └─► Email: confirmação com QR Code
   └─► Agenda job de lembrete (30 min antes)
```

### 5.3 Fluxo: Cobrança Recorrente

```
┌──────────────────────────────────────────────────────────────────┐
│                    FLUXO DE COBRANÇA RECORRENTE                  │
└──────────────────────────────────────────────────────────────────┘

1. ASSINATURA ATIVA (CARTÃO)
   └─► Mercado Pago agenda cobrança mensal

2. DIA DA COBRANÇA
   └─► Mercado Pago tenta cobrar

3A. PAGAMENTO APROVADO
    └─► Webhook recebe notificação
    └─► Atualiza plan_expires_at (+30 dias)
    └─► Envia WhatsApp de confirmação

3B. PAGAMENTO REJEITADO
    └─► Webhook recebe notificação
    └─► Envia WhatsApp de alerta
    └─► Usuário precisa atualizar cartão

4. 3 DIAS ANTES DE EXPIRAR (JOB)
   └─► Envia WhatsApp lembrando da renovação

5. ASSINATURA EXPIRADA
   └─► plan_status = "expired"
   └─► Acesso ao dashboard bloqueado
   └─► Página pública continua ativa (grace period)
```

---

## 6. API Reference

### Autenticação

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/auth/register` | Cadastro de barbeiro |
| POST | `/api/auth/login` | Login (retorna JWT) |
| POST | `/api/auth/client/register` | Cadastro de cliente |
| POST | `/api/auth/client/login` | Login de cliente |
| GET | `/api/auth/me` | Dados do usuário logado |
| POST | `/api/auth/logout` | Logout |

### Barbearia

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/barbershops/me` | Dados da minha barbearia |
| POST | `/api/barbershops` | Criar barbearia |
| PUT | `/api/barbershops` | Atualizar barbearia |
| POST | `/api/barbershops/upload/{type}` | Upload de imagem |
| DELETE | `/api/barbershops/gallery` | Remover da galeria |
| GET | `/api/barbershops/public/{slug}` | Dados públicos |

### Serviços

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/services` | Listar serviços |
| POST | `/api/services` | Criar serviço |
| PUT | `/api/services/{id}` | Atualizar serviço |
| DELETE | `/api/services/{id}` | Remover serviço |

### Profissionais

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/professionals` | Listar profissionais |
| POST | `/api/professionals` | Criar profissional |
| PUT | `/api/professionals/{id}` | Atualizar profissional |
| DELETE | `/api/professionals/{id}` | Remover profissional |

### Horários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/business-hours` | Listar horários |
| PUT | `/api/business-hours` | Atualizar horários |
| GET | `/api/time-blocks` | Listar bloqueios |
| POST | `/api/time-blocks` | Criar bloqueio |
| DELETE | `/api/time-blocks/{id}` | Remover bloqueio |

### Agendamentos

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/appointments` | Listar agendamentos |
| POST | `/api/appointments` | Criar agendamento |
| PUT | `/api/appointments/{id}` | Atualizar status |
| DELETE | `/api/appointments/{id}` | Cancelar agendamento |
| GET | `/api/appointments/availability/{barbershop_id}` | Horários disponíveis |

### Assinatura

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/plans` | Listar planos |
| POST | `/api/subscription/create` | Criar assinatura |
| GET | `/api/subscription/info` | Info da assinatura |
| POST | `/api/subscription/cancel` | Cancelar assinatura |
| GET | `/api/payment/pix-status/{id}` | Status do PIX |

### Relatórios (Premium)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/dashboard/stats` | Estatísticas do dashboard |
| GET | `/api/reports/revenue` | Relatório de receita |
| GET | `/api/reports/daily` | Relatório diário |
| GET | `/api/reports/weekly` | Relatório semanal |
| GET | `/api/reports/clients` | Top clientes |

### Clientes VIP (Premium)

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/vip-clients` | Listar VIPs |
| POST | `/api/vip-clients` | Criar VIP |
| PUT | `/api/vip-clients/{id}` | Atualizar VIP |
| DELETE | `/api/vip-clients/{id}` | Remover VIP |
| GET | `/api/vip-clients/check/{phone}` | Verificar se é VIP |

### Super Admin

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/super-admin/login` | Login do admin |
| GET | `/api/super-admin/dashboard` | Dashboard global |
| GET | `/api/super-admin/barbershops` | Listar todas |
| GET | `/api/super-admin/barbershops/{id}` | Detalhes |
| PUT | `/api/super-admin/barbershops/{id}/status` | Alterar status |
| DELETE | `/api/super-admin/barbershops/{id}` | Excluir |
| GET | `/api/super-admin/whatsapp-report` | Relatório WhatsApp |

### Webhooks

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| POST | `/api/webhooks/mercadopago` | Notificações de pagamento |

### Utilitários

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/health` | Health check |
| GET | `/health` | Health check (Kubernetes) |
| POST | `/api/utils/normalize-phone` | Normalizar telefone |

---

## 7. Integrações Externas

### 7.1 Mercado Pago

**Finalidade:** Processamento de pagamentos

**Tipos de Pagamento:**
- PIX (pagamento único)
- Cartão de Crédito (recorrente via Preapproval)

**Fluxo PIX:**
```
1. POST /api/subscription/create (payment_method=pix)
2. Backend cria pagamento no Mercado Pago
3. Retorna QR Code e copia-e-cola
4. Cliente paga
5. Webhook recebe notificação (type=payment)
6. Backend verifica status (approved)
7. Ativa assinatura
```

**Fluxo Cartão Recorrente:**
```
1. POST /api/subscription/create (payment_method=credit_card)
2. Backend cria preapproval no Mercado Pago
3. Retorna URL de checkout
4. Cliente cadastra cartão
5. Webhook recebe notificação (type=subscription_preapproval)
6. Backend verifica status (authorized)
7. Ativa assinatura
8. Cobranças mensais automáticas
```

**Credenciais:**
```env
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxx
```

### 7.2 Twilio WhatsApp

**Finalidade:** Envio de mensagens WhatsApp

**Modo de Operação:** Direct Sender (sem Messaging Service)

**Templates Aprovados:**
| SID | Nome | Uso |
|-----|------|-----|
| HX3558710353372f86c35ad834d16f83b6 | booking_confirmation | Confirmação de agendamento |
| HX438d70adfc19a152b77c64992c50d55a | booking_confirmation_vip | Confirmação VIP |
| HX5a569908f5b5a2227d8229988b4dd52b | appointment_reminder | Lembrete 30min |
| HX668aa7a8b644bcdc1406f7a566316fdb | pix_payment_confirmation | PIX confirmado |
| HX31878478a8a1a6856179a052f3d48f8a | subscription_renewal | Renovação OK |
| HXe06d8633df3df76a1556053ee9d2384f | payment_failed | Falha no pagamento |
| HX9c98ed775593937783a2923b6ad5c78a | renewal_reminder | Lembrete de renovação |
| HX64622dc4bb8ce491e527c3798f304f65 | vip_welcome | Boas-vindas VIP |

**Formato de Envio:**
```python
client.messages.create(
    from_="whatsapp:+15557309583",
    to="whatsapp:+5564999766685",
    content_sid="HXxxx",
    content_variables='{"1": "valor1", "2": "valor2"}'
)
```

**Credenciais:**
```env
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=+15557309583
TWILIO_TEMPLATE_BOOKING_CONFIRMATION=HXxxx
# ... outros templates
```

### 7.3 Resend (Email)

**Finalidade:** Envio de emails transacionais

**Emails Enviados:**
- Confirmação de agendamento
- Boas-vindas ao cadastrar

**Credenciais:**
```env
RESEND_API_KEY=re_xxx
```

---

## 8. Banco de Dados

### Collections MongoDB

#### users
```javascript
{
  user_id: "user_xxx",
  email: "email@example.com",
  password: "hash_bcrypt",
  name: "Nome",
  role: "barber|client",
  barbershop_id: "barb_xxx",  // se barber
  phone: "+5564999999999",
  created_at: ISODate
}
```

#### barbershops
```javascript
{
  barbershop_id: "barb_xxx",
  owner_id: "user_xxx",
  name: "Nome da Barbearia",
  slug: "nome-da-barbearia",
  description: "Descrição",
  address: "Endereço completo",
  phone: "+5564999999999",
  latitude: -16.6799,
  longitude: -49.255,
  
  // Personalização
  primary_color: "#F59E0B",
  background_color: "#09090B",
  font_style: "modern",
  logo_url: "/uploads/logos/xxx.png",
  banner_url: "/uploads/banners/xxx.jpg",
  banner_zoom: 100,
  banner_offset_y: 50,
  gallery_images: [],
  about_text: "Sobre nós...",
  instagram_url: "...",
  facebook_url: "...",
  whatsapp_number: "...",
  
  // Assinatura
  plan: "comum|premium",
  plan_status: "pending|active|expired|cancelled|suspended",
  plan_expires_at: ISODate,
  plan_cancelled_at: ISODate,
  auto_renew: true,
  
  created_at: ISODate
}
```

#### services
```javascript
{
  service_id: "svc_xxx",
  barbershop_id: "barb_xxx",
  name: "Corte Masculino",
  description: "Descrição do serviço",
  price: 45.00,
  duration: 30,
  is_active: true,
  created_at: ISODate
}
```

#### professionals
```javascript
{
  professional_id: "prof_xxx",
  barbershop_id: "barb_xxx",
  name: "João",
  photo_url: "/uploads/xxx.jpg",
  is_active: true,
  created_at: ISODate
}
```

#### business_hours
```javascript
{
  barbershop_id: "barb_xxx",
  day_of_week: 0-6,  // 0=Domingo
  start_time: "09:00",
  end_time: "19:00",
  is_closed: false
}
```

#### time_blocks
```javascript
{
  block_id: "blk_xxx",
  barbershop_id: "barb_xxx",
  professional_id: "prof_xxx",  // opcional
  date: "2026-02-03",
  start_time: "14:00",
  end_time: "15:00",
  reason: "Almoço"
}
```

#### appointments
```javascript
{
  appointment_id: "apt_xxx",
  barbershop_id: "barb_xxx",
  service_id: "svc_xxx",
  professional_id: "prof_xxx",
  date: "2026-02-03",
  time: "10:00",
  end_time: "10:30",
  client_name: "Cliente",
  client_phone: "+5564999999999",
  client_email: "cliente@email.com",
  original_price: 45.00,
  discount_percentage: 10,
  final_price: 40.50,
  is_vip: true,
  status: "pending|confirmed|completed|cancelled|no_show",
  reminder_sent: false,
  created_at: ISODate
}
```

#### vip_clients
```javascript
{
  vip_id: "vip_xxx",
  barbershop_id: "barb_xxx",
  client_name: "Cliente VIP",
  client_phone: "+5564999999999",
  discount_percentage: 10,
  notes: "Cliente desde 2024",
  created_at: ISODate
}
```

#### subscriptions
```javascript
{
  subscription_id: "sub_xxx",
  user_id: "user_xxx",
  barbershop_id: "barb_xxx",
  plan_id: "comum|premium",
  mp_preapproval_id: "xxx",  // Mercado Pago
  status: "pending|active|cancelled",
  created_at: ISODate,
  authorized_at: ISODate
}
```

#### payments
```javascript
{
  payment_id: "pay_xxx",
  user_id: "user_xxx",
  barbershop_id: "barb_xxx",
  mp_payment_id: "xxx",
  plan_id: "comum|premium",
  amount: 49.90,
  status: "pending|approved|rejected",
  payment_method: "pix|credit_card",
  created_at: ISODate
}
```

---

## 9. Segurança

### Autenticação
- **JWT** com expiração de 24 horas
- **Bcrypt** para hash de senhas
- **HTTPS** obrigatório em produção

### Autorização
- Rotas protegidas verificam `plan_status === "active"`
- Super Admin tem token separado
- Clientes só acessam seus próprios dados

### Proteção de Rotas
```python
# Dependência que verifica assinatura ativa
async def require_active_subscription(current_user):
    barbershop = await db.barbershops.find_one(...)
    if barbershop["plan_status"] != "active":
        raise HTTPException(403, "Assinatura inativa")
    return current_user
```

### Webhook Seguro
- Webhook do Mercado Pago é a única fonte de verdade para ativação
- Frontend nunca ativa assinatura diretamente

### CORS
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Em produção, especificar domínios
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

---

## 10. Variáveis de Ambiente

### Backend (.env)

```env
# MongoDB
MONGO_URL=mongodb+srv://user:pass@cluster.mongodb.net/barberhub?retryWrites=true&w=majority

# CORS
CORS_ORIGINS=https://barberhubpro.com.br

# URLs
FRONTEND_URL=https://barberhubpro.com.br

# JWT
JWT_SECRET=sua-chave-secreta-muito-longa

# Mercado Pago
MERCADOPAGO_ACCESS_TOKEN=APP_USR-xxx
MERCADOPAGO_PUBLIC_KEY=APP_USR-xxx

# Twilio WhatsApp
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=+15557309583

# Twilio Templates
TWILIO_TEMPLATE_BOOKING_CONFIRMATION=HXxxx
TWILIO_TEMPLATE_BOOKING_VIP=HXxxx
TWILIO_TEMPLATE_REMINDER=HXxxx
TWILIO_TEMPLATE_PIX_CONFIRMATION=HXxxx
TWILIO_TEMPLATE_RENEWAL=HXxxx
TWILIO_TEMPLATE_PAYMENT_FAILED=HXxxx
TWILIO_TEMPLATE_RENEWAL_REMINDER=HXxxx
TWILIO_TEMPLATE_VIP_WELCOME=HXxxx

# Email
RESEND_API_KEY=re_xxx

# Super Admin
SUPER_ADMIN_PASSWORD=sua-senha-admin
```

### Frontend (.env)

```env
REACT_APP_BACKEND_URL=https://barberhubpro.com.br
```

---

## Jobs Automáticos (Scheduler)

| Job | Intervalo | Função |
|-----|-----------|--------|
| `check_and_send_reminders` | 5 minutos | Envia lembretes de agendamento (30min antes) |
| `check_expired_subscriptions` | 1 hora | Verifica assinaturas que expiraram |
| `process_recurring_billing` | 12 horas | Processa cobranças recorrentes |

---

## Métricas do Projeto

| Métrica | Valor |
|---------|-------|
| Linhas de código (Backend) | ~4.600 |
| Endpoints de API | 70+ |
| Páginas Frontend | 20+ |
| Collections MongoDB | 8 |
| Templates WhatsApp | 8 |
| Integrações Externas | 3 |

---

## Considerações Finais

O BarberHub é uma solução completa e robusta para gestão de barbearias, com foco em:

1. **Experiência do Usuário** - Interface moderna e intuitiva
2. **Automação** - Notificações, lembretes e cobranças automáticas
3. **Personalização** - Cada barbearia tem sua identidade visual
4. **Segurança** - Pagamentos seguros via Mercado Pago, autenticação JWT
5. **Escalabilidade** - Arquitetura multi-tenant preparada para crescer

---

*Documentação gerada em Fevereiro/2026*
*Versão: 1.0*
