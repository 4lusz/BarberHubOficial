# BarberSaaS - PRD (Product Requirements Document)

## Descrição
SaaS de agendamento para barbearias, multi-tenant, moderno e escalável.

## Problema Original
Barbeiros usam WhatsApp para agendar clientes, o que é desorganizado e gera perda de clientes.

## User Personas
1. **Barbeiro/Dono**: Gerencia barbearia, serviços, horários, profissionais e agendamentos
2. **Cliente**: Agenda serviços online sem necessidade de conta

## Requisitos Core (Implementados)
- [x] Cadastro/Login de Barbeiro (JWT + Google OAuth)
- [x] Criação automática de barbearia com link público único
- [x] CRUD de Serviços (nome, duração, preço)
- [x] CRUD de Profissionais (opcional)
- [x] Configuração de Horários de Funcionamento
- [x] Página pública de agendamento (/b/{slug})
- [x] Fluxo de agendamento: serviço → profissional → data/hora → dados → confirmar
- [x] Dashboard com estatísticas (hoje, pendentes, faturamento, clientes)
- [x] Agenda visual com navegação por data e filtros de status
- [x] Ações: confirmar, cancelar, concluir agendamentos
- [x] Área do Cliente (login opcional)
- [x] Notificações por Email (estrutura com Resend)

## Stack Técnica
- **Backend**: FastAPI + MongoDB
- **Frontend**: React + Tailwind CSS + Shadcn UI
- **Auth**: JWT + Emergent Google OAuth
- **Email**: Resend (estrutura pronta)
- **Tema**: Dark mode com accent Amber/Gold

## O que foi implementado
- Landing page profissional
- Sistema de autenticação completo (JWT + Google OAuth)
- Multi-tenancy com isolamento por barbearia
- CRUD completo de serviços e profissionais
- Configuração de horários de funcionamento
- Sistema de disponibilidade em tempo real
- Criação e gerenciamento de agendamentos
- Dashboard com métricas
- Agenda visual com calendário
- Página pública de agendamento mobile-first
- Área do cliente com histórico

## Backlog (P0 - Crítico)
- [ ] Notificações por Email funcionais (precisa chave RESEND_API_KEY)

## Backlog (P1 - Importante)
- [ ] Lembretes automáticos por email
- [ ] Bloqueios manuais de horários
- [ ] Cancelamento com motivo

## Backlog (P2 - Nice to Have)
- [ ] Integração WhatsApp
- [ ] Relatórios avançados
- [ ] Múltiplas unidades por conta
- [ ] Planos pagos (Stripe)

## Próximas Ações
1. Configurar chave RESEND_API_KEY para ativar emails
2. Implementar lembretes automáticos
3. Adicionar bloqueios manuais de horários
4. Criar relatórios de faturamento

---
*Última atualização: Janeiro 2026*
