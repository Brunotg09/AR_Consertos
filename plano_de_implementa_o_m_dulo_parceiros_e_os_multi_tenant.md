# 🛠️ AR Consertos — Especificação Técnica & Plano de Implementação Completo

## Módulo de Empresas Parceiras, OS Multi-Tenant e Assinaturas Recorrentes

## 1. Visão Geral do Módulo

O novo módulo expande a operação da **AR Consertos** integrando empresas terceirizadas (parceiras) para a execução de serviços avulsos e planos de assinatura recorrentes em campo.

O sistema adota uma arquitetura **Multi-tenant**, onde cada empresa parceira gerencia autonomamente sua própria equipe de técnicos e suas Ordens de Serviço (OS) atribuídas, enquanto a **AR Consertos** mantém a governança central, a gestão global de clientes, a precificação e os repasses financeiros.

## 2. Níveis de Acesso e Permissões (RBAC & Multi-Tenancy)

| Perfil (`Role`) | Escopo de Acesso | Responsabilidades Principais | 
 | ----- | ----- | ----- | 
| `ADMIN` | Plataforma Global (AR Consertos) | Cadastrar parceiros, criar OSs manuais, definir planos de assinatura, atribuir chamados às empresas parceiras e gerenciar relatórios financeiros. | 
| `PARTNER_GESTOR` | Tenant do Parceiro (`/parceiro`) | Cadastrar e gerenciar técnicos da própria empresa, visualizar chamados atribuídos à empresa, delegar OSs para técnicos específicos e monitorar execuções. | 
| `PARTNER_TECNICO` | App do Técnico (`/parceiro/tecnico`) | Visualizar apenas a sua lista de atendimentos do dia, navegar via GPS, realizar check-in com validação do cliente, preencher laudo de atendimento e enviar fotos. | 
| `CLIENT` | Portal do Cliente (`/cliente`) | Contratar serviços avulsos ou planos de assinatura, acompanhar o status da OS em tempo real, consultar histórico e gerenciar faturas. | 

## 3. Mapeamento de Campos e Colunas por Formulário / Entidade

Relação detalhada dos dados necessários para integrar com o banco de dados existente, sem especificação rígida de código SQL:

### 3.1. Form de Cadastro de Empresa Parceira
* **Razão Social / Nome da Empresa** (Texto)
* **CNPJ** (Texto - Único para identificação fiscal)
* **E-mail Principal** (Texto - Contato/Notificações)
* **Telefone / WhatsApp** (Texto)
* **Status da Empresa** (Booleano: `Ativo` / `Inativo`)
* **Datas de Auditoria** (Data de Criação e Atualização)

### 3.2. Form de Gestão de Usuários e Técnicos
* **Vínculo com a Empresa Parceira** (Chave estrangeira / ID da Parceira — *nulo se for Admin ou Cliente*)
* **Nome Completo** (Texto)
* **E-mail** (Texto - Credencial de login)
* **CPF do Técnico** (Texto - Único para validação de identidade em campo)
* **Telefone de Contato** (Texto)
* **Perfil de Acesso** (Opções: `ADMIN`, `PARTNER_GESTOR`, `PARTNER_TECNICO`, `CLIENT`)
* **Status do Usuário** (Booleano: `Ativo` / `Inativo`)

### 3.3. Form de Criação e Atribuição de Ordem de Serviço (OS)
* **Cliente** (ID do Cliente solicitante)
* **Empresa Parceira Responsável** (ID da Empresa Parceira — *Novo*)
* **Técnico Alocado** (ID do Usuário Técnico — *Novo*)
* **Assinatura Vinculada** (ID do Contrato — *Novo, opcional para chamados recorrentes*)
* **Título e Descrição do Problema** (Texto longo)
* **Endereço Completo de Atendimento** (Texto)
* **Coordenadas Geográficas** (Latitude e Longitude para navegação/GPS)
* **Data e Horário Agendado** (Data/Hora)
* **Status da OS** (Opções: `PENDENTE`, `ATRIBUIDO_PARCEIRO`, `ATRIBUIDO_TECNICO`, `EM_ANDAMENTO`, `CONCLUIDO`, `CANCELADO`)

### 3.4. Form de Atendimento do Técnico em Campo (App Móvel / PWA)
* **Validação de Check-in:** CPF ou Nome digitado pelo cliente no local para confirmar início
* **Laudo Técnico / Observações:** Relatório legível do que foi consertado (`techNotes`)
* **Lista de Fotos da OS:** 
  * Arquivo / URL da Foto
  * Tipo da Foto (`ANTES` ou `DEPOIS`)
* **Assinatura Digital do Cliente:** Imagem/Canvas da assinatura para aceite formal
* **Data/Hora de Conclusão:** Registro automático do encerramento do chamado (`completedAt`)

### 3.5. Form de Contrato de Assinatura Recorrente
* **Cliente Contratante** (ID do Cliente)
* **Empresa Parceira Designada** (ID da Empresa Parceira)
* **Nome/Título do Plano** (Ex: "Manutenção Preventiva Ar-Condicionado")
* **Valor Mensal** (Decimal / Moeda)
* **Dia de Vencimento/Visita** (Número do dia do mês — ex: dia 5 ou 10)
* **Status do Contrato** (Opções: `ATIVO`, `PAUSADO`, `INADIMPLENTE`, `CANCELADO`)
* **Data de Início e Próxima Data de Agendamento/Cobrança** (Datas)

## 4. Arquitetura das APIs e Endpoints REST/Server Actions

### 4.1. Módulo Admin (`/api/admin`)
* `GET /api/admin/partners` — Lista todos os parceiros e suas métricas.
* `POST /api/admin/partners` — Cadastra um novo parceiro terceirizado.
* `POST /api/admin/orders/assign` — Atribui uma OS pendente a uma empresa parceira (`partnerId`).
* `GET /api/admin/subscriptions` — Painel consolidado de contratos recorrentes.

### 4.2. Módulo Parceiro Gestor (`/api/partner`)
* `GET /api/partner/technicians` — Lista os técnicos cadastrados no tenant.
* `POST /api/partner/technicians` — Adiciona um novo técnico à equipe.
* `PATCH /api/partner/orders/:id/delegate` — Aloca um técnico específico (`technicianId`) para atender a OS.

### 4.3. Módulo Técnico (`/api/tech`)
* `GET /api/tech/orders/today` — Lista chamados agendados para a data atual do técnico logado.
* `POST /api/tech/orders/:id/checkin` — Valida presença via CPF do cliente e registra timestamp.
* `POST /api/tech/orders/:id/complete` — Envia relatório final, upload de fotos (antes/depois) e assinatura digital do cliente.

## 5. Fluxos Operacionais Detalhados

### 5.1. Atribuição e Execução de Chamado Avulso
[ Cliente / Admin ] ──► (Cria OS: PENDING)
│
▼
[ Admin AR Consertos ] ──► (Atribui Partner: ASSIGNED_PARTNER)
│
▼
[ Gestor do Parceiro ] ──► (Atribui Técnico: ASSIGNED_TECHNICIAN)
│
▼
[ Técnico de Campo ] ──► (Inicia Chamado: IN_PROGRESS)
│
├── Check-in com CPF do Cliente
├── Upload Fotos "Antes"
├── Execução do Serviço
├── Upload Fotos "Depois"
└── Assinatura Digital do Cliente
│
▼
(Finaliza Chamado: COMPLETED)

5.2. Motor Automático de Assinaturas e Recorrência (Cron Job)
Rotina Agendada (Disparo Diário às 00:00h):

O worker varre a tabela subscriptions filtrando registros com status = ACTIVE.

Cálculo da Visita Mensal:

Se a data atual corresponder a 5 dias antes do billingDay, o sistema gera automaticamente uma nova ServiceOrder.

Pré-Vinculação Automatizada:

A nova OS herda o partnerId previamente definido no contrato de assinatura e entra no status ASSIGNED_PARTNER.

Notificação:

O gestor da empresa parceira recebe notificação para confirmação de agenda e alocação do técnico.

6. Estrutura de Interface do Usuário (UI/UX)
/app
 ├── (site)
 │    ├── page.tsx                      # Landing page principal
 │    └── contratar/page.tsx            # Solicitação de serviço avulso ou assinatura
 │
 ├── (admin)
 │    └── admin/
 │         ├── parceiros/page.tsx       # Cadastro de empresas parceiras
 │         ├── os/page.tsx              # Gestão unificada de chamados
 │         └── assinaturas/page.tsx     # Visão consolidada de MRR e contratos
 │
 ├── (parceiro)
 │    └── parceiro/
 │         ├── dashboard/page.tsx       # Visão geral da operação da parceira
 │         ├── equipe/page.tsx          # Gestão dos técnicos
 │         └── chamados/page.tsx        # Alocação de chamados
 │
 └── (tecnico)
      └── parceiro/tecnico/
           ├── hoje/page.tsx            # Interface PWA lista do dia do técnico
           └── os/[id]/page.tsx         # Formulário móvel de execução de OS
7. Regras de Negócio e Validações de Segurança
Isolamento Multi-Tenant:

Todas as consultas iniciadas por um PARTNER_GESTOR ou PARTNER_TECNICO devem conter o filtro estrito WHERE partnerId = user.partnerId.

Trava de Check-in em Campo:

O botão de início de serviço só é liberado se a validação do CPF do cliente bater com o cadastro ou se a geolocalização estiver num raio máximo ajustável do endereço.

Obrigatoriedade de Evidências:

A transição de status para COMPLETED exige obrigatoriamente:

No mínimo 1 foto do tipo BEFORE.

No mínimo 1 foto do tipo AFTER.

Preenchimento do laudo do conserto (techNotes).

Coleta do aceite do cliente.

8. Infraestrutura e Armazenamento
Hospedagem: Vercel (Next.js / Serverless / Server Actions).

Banco de Dados: PostgreSQL hospedado no Supabase / NeonDB.

Armazenamento de Imagens: Upload direto via Signed URLs para Supabase Storage / S3 / Cloudinary.

Agendamento de Recorrência: Vercel Cron Jobs acionando endpoint seguro /api/cron/subscriptions.

9. Cronograma de Execução em 4 Fases
[x] Fase 1: Especificação & Modelagem — Documentação do schema, regras de negócio e mapeamento dos papéis de acesso.

[ ] Fase 2: Schema DB & Painel Admin — Aplicar migrações do Prisma, criar rotas de gestão de parceiros e atribuição de chamados.

[ ] Fase 3: Portal do Gestor & PWA do Técnico — Desenvolver a interface do parceiro e o formulário responsivo com câmera/assinatura.

[ ] Fase 4: Módulo de Assinaturas & Automação — Implementar o motor de recorrência via Cron Job e homologar o fluxo completo.