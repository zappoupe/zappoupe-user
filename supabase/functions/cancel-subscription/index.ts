import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@12.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status,
  })
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
      apiVersion: '2022-11-15',
    })

    // ── 1. Autentica pelo JWT da sessao: a cliente so cancela a PROPRIA assinatura ──
    const authHeader = req.headers.get('Authorization') ?? ''
    const token = authHeader.replace('Bearer ', '').trim()
    if (!token) throw new Error('Sessao invalida. Entre de novo e tente outra vez.')

    const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(token)
    if (userErr || !userData?.user) {
      throw new Error('Sessao invalida. Entre de novo e tente outra vez.')
    }
    const userId = userData.user.id

    // ── 2. Busca a assinatura do proprio usuario ──
    const { data: assinatura, error: assErr } = await supabaseAdmin
      .from('assinaturas')
      .select('id, stripe_subscription_id, status, ativo')
      .eq('id', userId)
      .maybeSingle()
    if (assErr) throw assErr
    if (!assinatura) throw new Error('Assinatura nao encontrada nesta conta.')

    // Idempotente: ja cancelada ou com cancelamento agendado
    if (assinatura.status === 'canceled' || assinatura.status === 'canceling') {
      return json({ ok: true, alreadyCanceled: true })
    }

    if (!assinatura.stripe_subscription_id) {
      // Assinatura antiga/manual sem vinculo no Stripe: nao ha o que cobrar,
      // entao apenas registramos o cancelamento no banco.
      await supabaseAdmin
        .from('assinaturas')
        .update({ status: 'canceling', cancelado_em: new Date().toISOString() })
        .eq('id', userId)
      return json({ ok: true, semStripe: true })
    }

    // ── 3. Agenda o cancelamento no fim do periodo ──
    // Para de cobrar no proximo ciclo, mas mantem o acesso ate o fim do periodo
    // que a cliente ja pagou. O webhook 'customer.subscription.deleted' fecha
    // (ativo=false, status=canceled) quando o periodo terminar.
    const sub = await stripe.subscriptions.update(assinatura.stripe_subscription_id, {
      cancel_at_period_end: true,
    })

    const acessoAte = sub.current_period_end
      ? new Date(sub.current_period_end * 1000).toISOString()
      : null

    // ── 4. Marca no banco. ativo continua true (acesso preservado ate o fim). ──
    const { error: upErr } = await supabaseAdmin
      .from('assinaturas')
      .update({ status: 'canceling', cancelado_em: new Date().toISOString() })
      .eq('id', userId)
    if (upErr) throw upErr

    return json({ ok: true, cancelAtPeriodEnd: true, acessoAte })
  } catch (error) {
    return json({ error: (error as Error).message }, 400)
  }
})
