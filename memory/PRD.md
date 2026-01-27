# BarberHub - PRD (Product Requirements Document)

## Descrição
SaaS de agendamento para barbearias, multi-tenant, moderno e escalável.

---

## ✅ Funcionalidades Implementadas

### Autenticação e Cadastro
- [x] Cadastro/Login de Barbeiro (JWT + Google OAuth)
- [x] Fluxo de cadastro pago obrigatório
- [x] Coleta de localização (GPS)

### Barbearia
- [x] Link público único (/b/{slug})
- [x] Cores personalizadas
- [x] QR Code para compartilhamento

### Serviços e Profissionais
- [x] CRUD de Serviços e Profissionais
- [x] Configuração de Horários de Funcionamento
- [x] Bloqueios manuais de horários

### Agendamentos
- [x] Página pública de agendamento
- [x] Dashboard com estatísticas
- [x] Agenda visual

### Pagamentos
- [x] Planos Comum (R$49,90) e Premium (R$99,90)
- [x] Integração Mercado Pago ✅
- [x] Endpoint de renovação

### Notificações WhatsApp
- [x] Integração Twilio ✅ (sandbox)
- [x] **Suporte Evolution API** (produção) - pronto para configurar
- [x] Lembretes automáticos 30 min antes
- [x] Notificações de assinatura

### Relatórios (Premium)
- [x] Relatório diário (todos)
- [x] Relatório semanal (Premium)
- [x] Faturamento por serviço/horário/profissional
- [x] Top clientes

### 🆕 Planos para Clientes (Premium)
- [x] **Criar planos de fidelidade/mensalidade**
- [x] Definir preço, duração, benefícios, desconto
- [x] **Cadastrar assinantes** (envia WhatsApp de boas-vindas)
- [x] Renovar e cancelar assinaturas
- [x] Verificar assinatura ativa no agendamento público

---

## WhatsApp - Provedores

### Twilio (Sandbox - Teste)
- ✅ Configurado e funcionando
- ⚠️ Só funciona para números que entraram no sandbox

### Evolution API (Produção)
- ✅ Código pronto para integração
- Configurar no `.env`:
```
EVOLUTION_API_URL=https://sua-instancia.com
EVOLUTION_API_KEY=sua-chave
EVOLUTION_INSTANCE=barberhub
```

---

## Jobs Automáticos

| Job | Intervalo | Função |
|-----|-----------|--------|
| Lembretes WhatsApp | 5 min | Envia 30 min antes |
| Verificar expiração | 1 hora | Desativa planos |
| Aviso de renovação | 12 horas | Lembra 3 dias antes |

---

## APIs de Planos de Clientes

### Planos
- `GET /api/client-plans` - Listar planos
- `POST /api/client-plans` - Criar plano
- `PUT /api/client-plans/{id}` - Editar
- `DELETE /api/client-plans/{id}` - Excluir

### Assinaturas
- `GET /api/client-subscriptions` - Listar assinantes
- `POST /api/client-subscriptions` - Adicionar assinante
- `POST /api/client-subscriptions/{id}/renew` - Renovar
- `POST /api/client-subscriptions/{id}/cancel` - Cancelar
- `GET /api/client-subscriptions/check/{phone}` - Verificar no agendamento

---

## Credenciais Configuradas

| Serviço | Status |
|---------|--------|
| Mercado Pago | ✅ Ativo |
| Twilio | ✅ Sandbox |
| Evolution API | ⏳ Aguardando config |

---

## Backlog

### P1 - Importante
- [ ] Configurar Evolution API para produção
- [ ] Aplicar desconto automático para assinantes no agendamento

### P2 - Nice to Have
- [ ] Integração Google Calendar
- [ ] App mobile nativo

---

*Última atualização: 27 Janeiro 2026*
