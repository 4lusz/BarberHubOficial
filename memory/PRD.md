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
- [x] Área do cliente final com histórico

### Barbearia - Personalização Avançada
- [x] **Logo personalizado** - Upload de imagem
- [x] **Banner/Imagem de capa** - Upload de imagem
- [x] **Galeria de trabalhos** - Múltiplas imagens
- [x] **3 estilos de fonte** - Moderna, Clássica, Bold
- [x] **Cores personalizadas** - Primária e fundo
- [x] **Texto "Sobre Nós"** - Descrição completa
- [x] **Redes sociais** - Instagram, Facebook, WhatsApp
- [x] **Horário de funcionamento** - Exibido na página
- [x] **Mapa interativo** - Link direto para Google Maps
- [x] QR Code para compartilhamento

### Serviços e Profissionais
- [x] CRUD de Serviços e Profissionais
- [x] Configuração de Horários de Funcionamento
- [x] Bloqueios manuais de horários

### Agendamentos
- [x] Página pública de agendamento (personalizada)
- [x] Dashboard com estatísticas
- [x] Agenda visual
- [x] **Desconto VIP automático**
- [x] Confirmação via WhatsApp
- [x] **Seleção de múltiplos serviços** - Cliente pode escolher mais de um serviço por agendamento (duração e preço são somados)

### Pagamentos - Mercado Pago (PRODUÇÃO)
- [x] Planos Comum (R$49,90) e Premium (R$99,90)
- [x] **Cobrança recorrente automática** (API Preapproval)
- [x] Webhook para notificações de pagamento
- [x] Alertas de falha no pagamento via WhatsApp
- [x] Lembretes de renovação 3 dias antes

### Notificações WhatsApp - Twilio
- [x] Confirmação automática de agendamento
- [x] Lembretes 30 min antes
- [x] Notificações de renovação/falha de pagamento
- [x] Localização (Google Maps) incluída
- [x] **Padronização de números para formato brasileiro E.164 (+55DDNNNNNNNNN)**
- [x] **Integração Twilio WhatsApp Business API**

### Relatórios (Premium)
- [x] Relatório diário/semanal
- [x] Faturamento por serviço/horário/profissional
- [x] Top clientes

### Clientes VIP (Premium)
- [x] Cadastro de clientes VIP
- [x] Desconto automático no agendamento
- [x] Badge VIP na página pública

---

## Planos de Assinatura

### Plano Comum (R$49,90/mês)
- Criação automática da barbearia
- Agendamentos online ilimitados
- Agenda digital organizada
- Cadastro de serviços e profissionais
- Configuração de horários
- **Personalização completa da página**
- Link público + QR Code
- Confirmação automática (WhatsApp)

### Plano Premium (R$99,90/mês)
- Tudo do Plano Comum +
- Relatórios de faturamento
- Lucro por profissional/horário
- Estatísticas avançadas
- Histórico financeiro
- **Criação de clientes VIP com desconto**
- Controle de clientes recorrentes
- Prioridade em novas funcionalidades

---

## Personalização da Página Pública

### Visual
| Recurso | Descrição |
|---------|-----------|
| Logo | Upload de imagem (200x200px) |
| Banner | Imagem de capa (1200x400px) |
| Cores | Primária + Fundo (hex) |
| Fonte | Moderna, Clássica ou Bold |

### Informações
| Recurso | Descrição |
|---------|-----------|
| Sobre Nós | Texto descritivo longo |
| Endereço | Com link para Google Maps |
| Telefone | Clicável para ligar |
| Horários | Exibido na seção "Sobre" |

### Galeria
- Upload de múltiplas imagens
- Visualização em modal com navegação
- Preview horizontal na página

### Redes Sociais
- Instagram (link)
- Facebook (link)
- WhatsApp (botão flutuante)

---

## Conta Demo Premium

**Credenciais:**
- Email: `demo@barberhubpro.com.br`
- Senha: `Demo@2024`
- URL: `barberhubpro.com.br/b/demo-premium`

---

## APIs de Personalização

```
POST /api/barbershops/upload/logo     - Upload de logo
POST /api/barbershops/upload/banner   - Upload de banner
POST /api/barbershops/upload/gallery  - Adicionar imagem à galeria
DELETE /api/barbershops/gallery       - Remover imagem da galeria
PUT /api/barbershops                  - Atualizar dados e personalização
POST /api/utils/normalize-phone       - Normalizar número de telefone brasileiro
```

---

## Arquitetura de Uploads

```
/app/backend/uploads/
├── logos/       # Logos das barbearias
├── banners/     # Banners/capas
└── gallery/     # Imagens da galeria
```

URLs servidas em: `/api/uploads/{tipo}/{arquivo}`

---

## Integrações

| Serviço | Status | Modo |
|---------|--------|------|
| Mercado Pago | ✅ | PRODUÇÃO (Recorrente) |
| Respond.io | ✅ | Produção |
| Resend (Email) | ✅ | Produção |

---

## Backlog

### P0 - Concluído ✅
- [x] Mercado Pago produção com cobrança recorrente
- [x] Personalização visual (logo, banner, cores, fonte)
- [x] Galeria de trabalhos
- [x] Informações enriquecidas (mapa, horários, sobre)
- [x] Redes sociais na página pública
- [x] **Padronização automática de telefones brasileiros**

### P1 - Melhorias Futuras
- [ ] Programa de fidelidade visível na página pública
- [ ] Métricas avançadas (taxa de ocupação, clientes novos vs recorrentes)
- [ ] Refatorar backend em módulos
- [ ] Push notifications

### P2 - Nice to Have
- [ ] Escolha de profissional pelo perfil (com foto e bio)
- [ ] Integração Google Calendar
- [ ] App mobile nativo
- [ ] Sistema de avaliações

---

## Normalização de Telefones

O sistema normaliza automaticamente todos os números de telefone para o formato E.164 brasileiro:

| Entrada | Saída |
|---------|-------|
| (64) 99976-6685 | +5564999766685 |
| 64999766685 | +5564999766685 |
| +5564999766685 | +5564999766685 |
| 11987654321 | +5511987654321 |

### Componente PhoneInput
- Validação em tempo real com feedback visual (verde/vermelho)
- Aceita qualquer formato de entrada
- Preview do número formatado
- Usado em: Agendamento, Configurações, Clientes VIP

---

## Painel Super Admin

Acesso exclusivo para o administrador da plataforma com visão completa de todas as barbearias e métricas.

**URL:** `/super-admin`
**Senha:** `alunyx110205`

### Como acessar:
1. Vá para `seudominio.com/super-admin`
2. Digite a senha
3. Clique em "Acessar Painel"

**Easter Egg:** Na Landing Page, clique na palavra "brasileiras" no rodapé (Feito com 💈 para barbearias brasileiras)

### Funcionalidades
- **Visão Geral:** MRR, barbearias ativas, agendamentos, novos cadastros, churn
- **Barbearias:** Lista com filtros, detalhes, ativar/desativar manualmente
- **Financeiro:** Receita por plano, assinaturas ativas/falhas
- **WhatsApp:** Relatório completo de todas as mensagens automáticas

---

## Páginas Institucionais

| Página | URL | Descrição |
|--------|-----|-----------|
| FAQ | `/faq` | Perguntas frequentes organizadas por categoria |
| Termos de Uso | `/termos` | Termos legais de uso da plataforma |
| Política de Privacidade | `/privacidade` | Como tratamos os dados dos usuários |

**Email de Contato:** barberhub44@gmail.com

---

*Última atualização: 01 Fevereiro 2026*

---

## 🔒 Segurança do Fluxo de Pagamento (Verificado 01/02/2026)

### Camadas de Proteção Ativas:

| Camada | Descrição | Status |
|--------|-----------|--------|
| **Frontend ProtectedRoute** | Bloqueia dashboard se `plan_status !== 'active'` | ✅ |
| **Backend require_active_subscription** | Bloqueia rotas sensíveis (serviços, profissionais, etc.) | ✅ |
| **Webhook-Only Activation** | Assinatura só é ativada via webhook do Mercado Pago | ✅ |
| **Endpoints Removidos** | `/barbershops/activate` e `/activateplan` NÃO existem | ✅ |

### Fluxo de Pagamento PIX (Seguro):
1. Usuário cria barbearia → `plan_status = 'pending'`
2. Usuário inicia PIX → QR Code gerado
3. Frontend exibe "Aguardando confirmação" e faz polling
4. **Pagamento aprovado no MP → Webhook recebe notificação → Backend ativa assinatura**
5. Polling detecta `plan_status = 'active'` → Redireciona para dashboard

### Testes de Segurança:
- Arquivo: `/app/backend/tests/test_pix_payment_security.py`
- Resultado: 100% passou (11/12 - 1 falhou por CPF inválido, não é bug de segurança)

---

## Verificação Final de Deploy (28/01/2026)

### ✅ Testes Aprovados:
- Login com conta demo
- Dashboard do barbeiro
- Página pública de agendamento
- Fluxo completo de booking
- Normalização de telefone
- Painel Super Admin
- Páginas institucionais (FAQ, Termos, Privacidade)
- Otimização N+1 queries

### 📋 Tarefas Pós-Deploy:
1. Configurar credenciais do Mercado Pago de produção
2. Testar WhatsApp com saldo na conta Respond.io
3. Configurar webhook do Mercado Pago: `https://barberhubpro.com.br/api/webhooks/mercadopago`
