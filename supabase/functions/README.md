# As Edge Functions NAO moram aqui

As funcoes deste projeto vivem no repositorio **LP-zappoupe**, em
`supabase/functions/`. Os dois repos apontam para o mesmo projeto Supabase
(`gubtuzbdbuxablzbbbvb`), entao manter duas copias significava que o ultimo
`supabase functions deploy` a rodar ganhava — em silencio.

Foi exatamente o que quase aconteceu: a copia daqui de `cancel-subscription`
so entendia Stripe, enquanto a do LP-zappoupe ja atendia Asaas. Um deploy
feito deste diretorio teria quebrado o cancelamento de todo cliente novo.

Na mao inversa, o `stripe-webhook` daqui tinha o handler
`customer.subscription.updated` (fix 30a3856) que a copia do LP-zappoupe nao
tinha. Esse handler foi portado para la antes da remocao — nada se perdeu.

O que o app deste repo chama por `supabase.functions.invoke(...)` continua
igual: o contrato de nome e resposta nao mudou.

## Onde mexer

| funcao                | arquivo |
|-----------------------|---------|
| `cancel-subscription` | `LP-zappoupe/supabase/functions/cancel-subscription/index.ts` |
| `checkout-asaas`      | `LP-zappoupe/supabase/functions/checkout-asaas/index.ts` |
| `asaas-webhook`       | `LP-zappoupe/supabase/functions/asaas-webhook/index.ts` |
| `checkout-session`    | `LP-zappoupe/supabase/functions/checkout-session/index.ts` (legado Stripe) |
| `stripe-webhook`      | `LP-zappoupe/supabase/functions/stripe-webhook/index.ts` (legado Stripe) |

As migrations em `../migrations/` ficaram: sao historico ja aplicado.
