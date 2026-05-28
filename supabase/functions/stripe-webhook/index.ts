import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@12.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, { apiVersion: '2022-11-15' })

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

async function findAuthUserByEmail(email: string) {
  const alvo = email.toLowerCase();
  const perPage = 1000;
  let page = 1;
  for (;;) {
    const { data, error } = await supabaseAdmin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const users = data?.users ?? [];
    const found = users.find((u: any) => u.email?.toLowerCase() === alvo);
    if (found) return found;
    if (users.length < perPage) return null;
    page += 1;
  }
}

// ─── Handlers por tipo de evento ────────────────────────────────────────────

async function handleInvoicePaid(invoice: any) {
  const subscriptionId = invoice.subscription ||
                         invoice.parent?.subscription_details?.subscription ||
                         invoice.lines?.data?.[0]?.subscription ||
                         invoice.lines?.data?.[0]?.parent?.subscription_item_details?.subscription;

  const stripeCustomerId = invoice.customer;

  if (!subscriptionId) {
    return { skipped: true, msg: "Fatura avulsa ignorada" };
  }

  // Metadados (plano + user_id) — preferencialmente da subscription
  const subMeta = invoice.parent?.subscription_details?.metadata || invoice.lines?.data?.[0]?.metadata || {};
  let plano = subMeta.plano;
  let is_anual = subMeta.is_anual;
  let membros_extras = subMeta.membros_extras;
  let userId = subMeta.user_id;

  if (!plano || !userId) {
    const subscription = await stripe.subscriptions.retrieve(subscriptionId as string);
    plano = plano || subscription.metadata?.plano;
    is_anual = is_anual || subscription.metadata?.is_anual;
    membros_extras = membros_extras || subscription.metadata?.membros_extras;
    userId = userId || subscription.metadata?.user_id;
  }

  // Dados do cliente (do cartao / fatura) — usados como fallback
  const paymentMethods = await stripe.paymentMethods.list({
    customer: stripeCustomerId,
    type: 'card',
    limit: 1
  });
  const billingDetails = paymentMethods.data[0]?.billing_details || {};
  const customerEmail = (billingDetails.email || invoice.customer_email || '').toLowerCase();
  const customerName = billingDetails.name || invoice.customer_name || 'Usuário ZapPoupe';
  const customerPhone = billingDetails.phone || invoice.customer_phone || '';

  // ── Resolve o user_id ──
  // 1) metadata (fluxo novo — conta criada no checkout-session)
  // 2) assinatura existente por email
  // 3) auth user existente por email
  // (Sem invite/email: a conta ja foi criada no checkout. O fallback cobre assinaturas legadas.)
  if (!userId && customerEmail) {
    const { data: existing } = await supabaseAdmin
      .from('assinaturas')
      .select('id')
      .eq('email', customerEmail)
      .maybeSingle();
    if (existing) {
      userId = existing.id;
    } else {
      const authUser = await findAuthUserByEmail(customerEmail);
      if (authUser) userId = authUser.id;
    }
  }

  if (!userId) {
    console.error("invoice.paid sem user_id resolvivel:", { customerEmail, plano });
    return { skipped: true, reason: 'user_id_nao_encontrado' };
  }

  // ── Ativa a assinatura ──
  const { error: dbError } = await supabaseAdmin.from('assinaturas').upsert({
    id: userId,
    nome: customerName,
    email: customerEmail || undefined,
    telefone: customerPhone || undefined,
    plano: plano,
    is_anual: is_anual === 'true',
    membros_extras: parseInt(membros_extras || '0'),
    ativo: true,
    status: 'active',
    stripe_customer_id: stripeCustomerId,
    stripe_subscription_id: subscriptionId,
  });
  if (dbError) throw dbError;

  // ── Extrato idempotente ──
  const valorPagoEmReais = invoice.amount_paid / 100;
  const { error: extratoError } = await supabaseAdmin.from('extrato').upsert(
    {
      user_id: userId,
      valor: valorPagoEmReais,
      plano: plano,
      stripe_invoice_id: invoice.id,
    },
    { onConflict: 'stripe_invoice_id' }
  );
  if (extratoError) throw extratoError;

  return { ok: true };
}

async function deactivateByCustomer(stripeCustomerId: string) {
  const { error } = await supabaseAdmin
    .from('assinaturas')
    .update({ ativo: false, status: 'past_due' })
    .eq('stripe_customer_id', stripeCustomerId);
  if (error) throw error;
}

async function deactivateBySubscription(subscriptionId: string) {
  const { error } = await supabaseAdmin
    .from('assinaturas')
    .update({ ativo: false, status: 'canceled' })
    .eq('stripe_subscription_id', subscriptionId);
  if (error) throw error;
}

// ─── Entrypoint ─────────────────────────────────────────────────────────────

serve(async (req) => {
  const signature = req.headers.get('stripe-signature');
  const webhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET');

  let event;
  try {
    const body = await req.text();
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret!);
  } catch (err) {
    console.error(`Erro na assinatura: ${err.message}`);
    return new Response(`Webhook Error: ${err.message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case 'invoice.paid': {
        const result = await handleInvoicePaid(event.data.object as any);
        return new Response(JSON.stringify({ received: true, ...result }), { status: 200 });
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as any;
        if (invoice.customer) await deactivateByCustomer(invoice.customer as string);
        return new Response(JSON.stringify({ received: true, deactivated: true }), { status: 200 });
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as any;
        await deactivateBySubscription(sub.id);
        return new Response(JSON.stringify({ received: true, deactivated: true }), { status: 200 });
      }

      default:
        return new Response(JSON.stringify({ received: true, ignored: event.type }), { status: 200 });
    }
  } catch (err) {
    console.error("Erro interno:", err);
    return new Response(JSON.stringify({ error: "Erro interno", details: err.message }), { status: 500 });
  }
});
