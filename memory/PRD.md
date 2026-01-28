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

### Pagamentos - Mercado Pago (PRODUÇÃO)
- [x] Planos Comum (R$49,90) e Premium (R$99,90)
- [x] **Cobrança recorrente automática** (API Preapproval)
- [x] Webhook para notificações de pagamento
- [x] Alertas de falha no pagamento via WhatsApp
- [x] Lembretes de renovação 3 dias antes

### Notificações WhatsApp - Respond.io
- [x] Confirmação automática de agendamento
- [x] Lembretes 30 min antes
- [x] Notificações de renovação/falha de pagamento
- [x] Localização (Google Maps) incluída

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

### P1 - Melhorias Futuras
- [ ] Refatorar backend em módulos
- [ ] Métricas avançadas (taxa de ocupação)
- [ ] Push notifications

### P2 - Nice to Have
- [ ] Integração Google Calendar
- [ ] App mobile nativo
- [ ] Sistema de avaliações
- [ ] Programa de fidelidade

---

*Última atualização: 28 Janeiro 2026*
