# BarberHub 💈

BarberHub é uma plataforma SaaS desenvolvida para automatizar o gerenciamento de barbearias.
A aplicação permite que barbearias recebam agendamentos online, organizem sua agenda e se comuniquem automaticamente com clientes via WhatsApp.

O objetivo do BarberHub é reduzir faltas em horários, facilitar o agendamento e profissionalizar o atendimento de barbearias.

---

# 🚀 Funcionalidades

### Agendamento Online

Clientes podem escolher serviços e horários disponíveis diretamente pela página da barbearia.

### Confirmação Automática via WhatsApp

Após um agendamento, o sistema envia automaticamente mensagens de confirmação e lembretes para o cliente.

### Página Personalizada da Barbearia

Cada barbearia possui uma página própria para:

* exibir serviços
* mostrar horários disponíveis
* receber agendamentos

### Painel de Gestão

O barbeiro pode visualizar:

* agenda do dia
* próximos clientes
* horários ocupados
* serviços cadastrados

### Sistema de Assinatura

O BarberHub funciona em modelo SaaS com dois planos:

* Plano Básico — R$50/mês
* Plano Pro — R$100/mês

---

# 🛠 Tecnologias Utilizadas

Algumas tecnologias utilizadas no projeto:

* Backend: Python
* API de Mensagens: Twilio (WhatsApp Business API)
* Pagamentos: Mercado Pago
* Deploy: emergent.sh
* Banco de dados: MongoDB
* Frontend: react

---

# 📦 Estrutura do Projeto

```
barberhub/
│
├── backend/
│   ├── api
│   ├── services
│   └── models
│
├── frontend/
│   ├── pages
│   └── components
│
├── integrations/
│   ├── twilio
│   └── payments
│
└── README.md
```

---

# ⚙️ Integrações

### WhatsApp

Utiliza a API oficial do WhatsApp via Twilio para envio de:

* confirmações de agendamento
* lembretes de horário

### Pagamentos

O sistema utiliza Mercado Pago para cobrança de assinaturas.

---

# 📈 Objetivo do Projeto

BarberHub foi criado para resolver um problema comum em barbearias:

* agendamentos feitos manualmente
* clientes esquecendo horários
* dificuldade em organizar a agenda

A plataforma automatiza esse processo e melhora a experiência tanto para barbeiros quanto para clientes.

---

# 🏗 Arquitetura

O sistema segue uma arquitetura separando:

- Frontend responsável pela interface do usuário
- Backend responsável pela lógica de negócio e APIs
- Integrações externas (Twilio e Mercado Pago)
- Banco de dados para persistência de agendamentos e clientes

# 🔒 Licença

Este projeto é proprietário e não possui licença de uso público.

---

# 👨‍💻 Autor

Desenvolvido por **Aluisio Moura Prado**

Projeto independente focado em soluções digitais para pequenos negócios.
