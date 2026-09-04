# AR Consertos

Sistema completo para oficina de conserto de eletrodomesticos e eletronica inverter.

## Funcionalidades

### Area Publica
- Catalogo de produtos com imagens
- Carrinho de compras
- Sistema de chat com suporte
- Cadastro e login de usuarios
- Historico de pedidos
- Minha Conta (perfil)
 
### Area Administrativa (`/adminta`)
- Dashboard com metricas
- Gestao de pedidos
- Gestao de estoque
- Gestao de clientes
- Gestao de servicos
- Banners promocionais
- Relatorios
- Chat com clientes

## Stack

- **Frontend:** Next.js 13, React, TypeScript, Tailwind CSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage, Realtime)
- **Deploy:** Vercel


## Estrutura

```
app/
  cadastro/        - Cadastro de usuarios
  login/           - Login de usuarios
  minha-conta/     - Perfil do usuario
  historico/       - Historico de pedidos
  private/         - Area administrativa
    dashboard/
    pedidos/
    estoque/
    clientes/
    servicos/
    banners/
    relatorios/
    chat/
    login/
src/
  components/      - Componentes React
  hooks/           - Hooks customizados
  lib/             - Utilitarios (Supabase)
  utils/           - Funcoes auxiliares
  contexts/        - Contexts (Cart)
supabase/
  migrations/      - Migrations do banco
```

## Deploy

O projeto faz deploy automatico via Vercel ao fazer push no GitHub.
