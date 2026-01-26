# BarberHub - PRD (Product Requirements Document)

## Descrição
SaaS de agendamento para barbearias, multi-tenant, moderno e escalável.

## Problema Original
Barbeiros usam WhatsApp para agendar clientes, o que é desorganizado e gera perda de clientes.

## User Personas
1. **Barbeiro/Dono**: Gerencia barbearia, serviços, horários, profissionais e agendamentos
2. **Cliente**: Agenda serviços online sem necessidade de conta

## Requisitos Core (Implementados) ✅
- [x] Cadastro/Login de Barbeiro (JWT + Google OAuth)
- [x] Criação automática de barbearia com link público único
- [x] Sistema de planos (Comum R$49,90 / Premium R$99,90) com trial de 7 dias
- [x] CRUD de Serviços (nome, duração, preço)
- [x] CRUD de Profissionais (opcional)
- [x] Configuração de Horários de Funcionamento
- [x] **Bloqueios manuais de horários** (férias, almoço, compromissos)
- [x] Página pública de agendamento (/b/{slug})
- [x] **Cores personalizadas por barbearia** (cor principal + fundo)
- [x] **QR Code para compartilhamento** (na página de configurações)
- [x] Fluxo de agendamento: serviço → profissional → data/hora → dados → confirmar
- [x] Dashboard com estatísticas (hoje, pendentes, faturamento, clientes)
- [x] Agenda visual com navegação por data e filtros de status
- [x] Ações: confirmar, cancelar, concluir agendamentos
- [x] Área do Cliente (login opcional)
- [x] Notificações por Email (estrutura com Resend)
- [x] **Estrutura de pagamento com Mercado Pago** (PIX + Cartão)

## Stack Técnica
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: JWT + Emergent Google OAuth
- **Email**: Resend (estrutura pronta)
- **Pagamento**: Mercado Pago (estrutura pronta - modo demo)
- **Tema**: Dark mode com accent Amber/Gold personalizável

## Planos de Assinatura

### Plano Comum - R$ 49,90/mês
- Criação automática da barbearia
- Agendamentos online ilimitados
- Agenda digital organizada
- Cadastro de serviços
- Cadastro de profissionais
- Configuração de horários
- Link público para clientes
- Confirmação automática
- Acesso pelo celular ou PC

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

## Backlog (P0 - Crítico)
- [ ] Configurar MERCADOPAGO_ACCESS_TOKEN para pagamentos reais
- [ ] Configurar RESEND_API_KEY para emails

## Backlog (P1 - Importante)
- [ ] Lembretes automáticos por email
- [ ] Relatórios completos (Premium)
- [ ] Criação de planos de fidelidade para clientes (Premium)

## Backlog (P2 - Nice to Have)
- [ ] Integração WhatsApp
- [ ] Múltiplas unidades por conta
- [ ] App mobile nativo

## APIs Externas (Estrutura Pronta)
- **Mercado Pago**: Integração com checkout de assinaturas (MOCKED em demo)
- **Resend**: Emails transacionais (precisa chave)

## Próximas Ações
1. Obter chave do Mercado Pago e configurar MERCADOPAGO_ACCESS_TOKEN
2. Configurar RESEND_API_KEY para ativar emails
3. Implementar relatórios detalhados para Premium
4. Criar sistema de planos de fidelidade para clientes

---
*Última atualização: Janeiro 2026*
