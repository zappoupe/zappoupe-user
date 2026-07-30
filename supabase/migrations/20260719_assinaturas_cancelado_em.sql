-- ============================================================================
-- Fix do cancelamento de assinatura
-- ============================================================================
-- O app tentava gravar `assinaturas.cancelado_em`, mas a coluna nunca existiu.
-- Resultado: todo cancelamento pelo painel falhava com "Nao foi possivel
-- cancelar sua assinatura". Esta migration cria a coluna que o codigo espera.
--
-- (O cancelamento de verdade no Stripe passa a ser feito pela Edge Function
--  cancel-subscription; aqui so garantimos o registro da data no banco.)
--
-- Idempotente. Pode rodar em producao sem risco: coluna nova, nullable.
-- ============================================================================

ALTER TABLE public.assinaturas
    ADD COLUMN IF NOT EXISTS cancelado_em TIMESTAMPTZ;

COMMENT ON COLUMN public.assinaturas.cancelado_em IS
    'Quando o titular pediu o cancelamento. O acesso segue ativo ate o fim do periodo pago (status=canceling); o webhook do Stripe marca canceled/ativo=false ao fim.';
