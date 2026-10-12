# Design: Push Notification & Email Transacional no Checkout

**Data:** 2026-09-04
**Status:** Aprovado
**Escopo:** Notificações push (FCM) + Email transacional (nodemailer SMTP)

## Resumo

Implementar sistema de notificações push reais via Firebase Cloud Messaging (FCM) e emails transacionais via nodemailer usando SMTP do Supabase, disparados durante o fluxo de checkout e atualização de status de pedidos.

## Decisões

| Decisão | Escolha | Justificativa |
|---------|---------|---------------|
| Push Notification | Firebase Cloud Messaging | Gratuito, fácil integração com web |
| Email Transacional | nodemailer + SMTP Supabase | SMTP já configurado, simples |
| Arquitetura | API Routes do Next.js | Tudo em um lugar, fácil de manter |
| Destinatários | Ambos (cliente + admin) | Cobertura completa |
| Eventos | Novo pedido, confirmado, status atualizado | Fluxo essencial |

## Arquitetura

```
┌─────────────────────────────────────────────────────────────┐
│                      CHECKOUT FLOW                          │
│                                                             │
│  Cliente cria pedido → API /api/notifications/push          │
│                      → API /api/notifications/email         │
│                                                             │
│  Admin confirma pedido → API /api/notifications/push        │
│                        → API /api/notifications/email       │
│                                                             │
│  Status atualizado → API /api/notifications/push            │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│                    SERVIÇOS EXTERNOS                        │
│                                                             │
│  Firebase Cloud Messaging (Push)                            │
│  SMTP Supabase (Email)                                      │
│  Supabase (Dados + Auth)                                    │
└─────────────────────────────────────────────────────────────┘
```

## Novas Dependências

- `firebase` (frontend) - cliente FCM
- `firebase-admin` (backend) - envio de pushes
- `nodemailer` (backend) - envio de emails via SMTP (já instalado)

## Variáveis de Ambiente

```env
# Firebase
FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=
NEXT_PUBLIC_FIREBASE_VAPID_KEY=

# SMTP - já configurado no Supabase Dashboard
# A Edge Function acessa via Deno.env.get()
```

## Push Notification (FCM)

### Tabela `push_subscriptions`

```sql
CREATE TABLE push_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  platform text DEFAULT 'web',
  created_at timestamptz DEFAULT now(),
  last_used_at timestamptz
);

-- RLS: owner-scoped
ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own subscriptions"
  ON push_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own subscriptions"
  ON push_subscriptions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own subscriptions"
  ON push_subscriptions FOR DELETE
  USING (auth.uid() = user_id);
```

### Service Worker (`public/sw.js`)

Adicionar handlers de push:

```js
self.addEventListener('push', (event) => {
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: '/icon-192.png',
      badge: '/badge-72.png',
      data: { url: data.url }
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.openWindow(event.notification.data.url)
  );
});
```

### API Routes

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/notifications/push/subscribe` | POST | Salva token de inscrição |
| `/api/notifications/push/unsubscribe` | POST | Remove token |
| `/api/notifications/push/send` | POST | Envia push (admin only) |

### Hook `src/hooks/usePushNotification.ts`

```ts
export function usePushNotification() {
  return {
    requestPermission: () => Promise<string | null>,
    subscribe: (user: User) => Promise<void>,
    unsubscribe: (user: User) => Promise<void>,
    isSupported: boolean
  };
}
```

### Notificações Push

| Evento | Destinatário | Título | Corpo |
|--------|-------------|--------|-------|
| Novo pedido | Admin | "Novo pedido recebido" | "Pedido #123 de João" |
| Pedido confirmado | Cliente | "Pedido confirmado" | "Seu pedido #123 foi confirmado!" |
| Status atualizado | Cliente | "Status atualizado" | "Seu pedido #123 está em andamento" |

## Email Transacional (nodemailer + SMTP Supabase)

### API Route Única

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/notifications/email` | POST | Envia email por tipo (confirmação, admin, status) |

### Tipos de Email

| Tipo | Destinatário | Assunto |
|------|-------------|---------|
| `order_confirmation` | Cliente | "Recebemos seu pedido #123" |
| `order_to_admin` | Admin | "Novo pedido recebido - #123" |
| `order_status_update` | Cliente | "Seu pedido #123 - Status: Em andamento" |

### Design dos Templates

- Seguir design dark theme existente (#111111, #1a1a1a, #E30613, #C9A84C)
- Incluir: número do pedido, status, itens, total, link para acompanhar
- Responsivo (mobile-first)

### Payload da API

```ts
interface EmailRequest {
  type: 'order_confirmation' | 'order_to_admin' | 'order_status_update';
  orderId: string;
  userId?: string; // para order_confirmation
  customerName?: string; // para order_to_admin
  status?: string; // para order_status_update
}
```

## Integração com Checkout

### Fluxo de Criar Pedido (`app/checkout/page.tsx`)

Após `INSERT` na tabela `orders`:

```ts
// 1. Enviar email de confirmação para o cliente
await fetch('/api/notifications/email', {
  method: 'POST',
  body: JSON.stringify({ type: 'order_confirmation', orderId, userId: user.id })
});

// 2. Enviar email para o admin
await fetch('/api/notifications/email', {
  method: 'POST',
  body: JSON.stringify({ type: 'order_to_admin', orderId, customerName })
});

// 3. Enviar push para os admins
await fetch('/api/notifications/push/send', {
  method: 'POST',
  body: JSON.stringify({
    role: 'admin',
    title: 'Novo pedido recebido',
    body: `Pedido #${orderId} de ${customerName}`,
    url: `/private/pedido/${orderId}`
  })
});
```

### Fluxo de Confirmar Pedido (Admin)

Após atualizar status para `confirmado`:

```ts
// 1. Enviar email de atualização para o cliente
await fetch('/api/notifications/email', {
  method: 'POST',
  body: JSON.stringify({ type: 'order_status_update', orderId, status: 'confirmado' })
});

// 2. Enviar push para o cliente
await fetch('/api/notifications/push/send', {
  method: 'POST',
  body: JSON.stringify({
    userId: clienteUserId,
    title: 'Pedido confirmado',
    body: `Seu pedido #${orderId} foi confirmado!`,
    url: `/pedido/${orderId}`
  })
});
```

## Segurança

- **Firebase Admin SDK:** credenciais em variáveis de ambiente (nunca no cliente)
- **SMTP Supabase:** credenciais configuradas no dashboard do Supabase
- **RLS:** push_subscriptions com RLS owner-scoped
- **Rate limiting:** aplicar nas API routes de notificação
- **Validação:** validar dados de entrada com Zod

## Performance

- **Debouncing:** não enviar push para cada mudança de status (agrupar)
- **Batch:** enviar pushes em lote para múltiplos admins
- **Cache:** cachear tokens de subscription (TTL 1h)
- **Retry:** retry automático em caso de falha (3 tentativas)

## Error Handling

- Logs de falha no envio (não quebrar o fluxo do checkout)
- Fallback: se push falhar, email continua funcionando
- Monitoramento via logs do Supabase

## Testing

- Testes unitários para API routes
- Teste de integração: checkout → notificação enviada
- Teste manual: verificar push no navegador

## Arquivos a Criar/Modificar

### Novos Arquivos

- `src/hooks/usePushNotification.ts` - hook de inscrição push
- `src/lib/firebase.ts` - configuração Firebase
- `src/lib/smtp.ts` - configuração nodemailer SMTP
- `src/lib/notifications.ts` - funções auxiliares de notificação
- `app/api/notifications/push/subscribe/route.ts` - endpoint subscribe
- `app/api/notifications/push/unsubscribe/route.ts` - endpoint unsubscribe
- `app/api/notifications/push/send/route.ts` - endpoint envio
- `app/api/notifications/email/route.ts` - endpoint único de email (Next.js API)
- `supabase/functions/send-email/index.ts` - Edge Function de email (Supabase)
- `src/components/NotificationPermissionBanner.tsx` - banner de permissão
- `supabase/migrations/20260904200000_create_push_subscriptions.sql` - tabela

### Arquivos Modificados

- `public/sw.js` - adicionar handlers de push
- `app/checkout/page.tsx` - adicionar chamadas de notificação
- `app/private/pedidos/page.tsx` - adicionar notificação ao confirmar
- `src/components/Providers.tsx` - inicializar FCM
