import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import Stripe from 'https://esm.sh/stripe@12.0.0'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.0.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const TRIAL_DAYS = 30;

const supabaseAdmin = createClient(
  Deno.env.get('SUPABASE_URL') ?? '',
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
)

// Busca um usuario do Auth pelo email (pagina ate achar). Retorna null se nao existir.
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

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const stripe = new Stripe(Deno.env.get('STRIPE_SECRET_KEY') as string, {
      apiVersion: '2022-11-15',
    })

    const { planType, isAnnual, extraMembers, email: rawEmail, name, phone, password } = await req.json()

    const email = (rawEmail || '').trim().toLowerCase();

    // Valida dados do cliente
    if (!email || !name) {
      throw new Error("Informe seu nome e e-mail antes de continuar.")
    }
    if (!password || String(password).length < 6) {
      throw new Error("A senha deve ter pelo menos 6 caracteres.")
    }

    // ── 1. Cria (ou recupera) o usuario no Auth JA com a senha escolhida ──
    // email_confirm:true => nenhum email de confirmacao e enviado, login imediato.
    let userId: string | undefined;

    const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name, phone: phone || '' },
    });

    if (created?.user?.id) {
      userId = created.user.id;
    } else if (createErr) {
      // Ja existe (re-tentativa de checkout ou re-assinatura): recupera e atualiza a senha
      const existing = await findAuthUserByEmail(email);
      if (!existing) throw createErr;
      userId = existing.id;
      await supabaseAdmin.auth.admin.updateUserById(userId, {
        password,
        user_metadata: { name, phone: phone || '' },
      });
    }

    if (!userId) throw new Error("Nao foi possivel criar o usuario.");

    // ── 2. Cria/atualiza a assinatura como PENDENTE (ativo=false) ──
    // O webhook do Stripe vira ativo=true apos a confirmacao do pagamento.
    const { error: assinaturaErr } = await supabaseAdmin.from('assinaturas').upsert({
      id: userId,
      nome: name,
      email,
      telefone: phone || '',
      plano: planType,
      is_anual: !!isAnnual,
      membros_extras: parseInt(String(extraMembers ?? 0)) || 0,
      ativo: false,
      status: 'pending',
    });
    if (assinaturaErr) throw assinaturaErr;

    // ── 3. Stripe: Price IDs vindos das envs ──
    const priceIds: Record<string, string | undefined> = {
      individual: isAnnual ? Deno.env.get('PRICE_INDIVIDUAL_ANNUAL') : Deno.env.get('PRICE_INDIVIDUAL_MONTHLY'),
      family: isAnnual ? Deno.env.get('PRICE_FAMILY_ANNUAL') : Deno.env.get('PRICE_FAMILY_MONTHLY'),
      extra: isAnnual ? Deno.env.get('PRICE_EXTRA_ANNUAL') : Deno.env.get('PRICE_EXTRA_MONTHLY')
    }

    if (!priceIds[planType]) throw new Error("ID do plano nao encontrado nas variaveis.")

    const items: { price: string; quantity: number }[] = [
      { price: priceIds[planType] as string, quantity: 1 }
    ]

    if (planType === 'family' && extraMembers > 0) {
      if (!priceIds.extra) throw new Error("ID do membro extra nao encontrado.")
      items.push({ price: priceIds.extra, quantity: extraMembers })
    }

    // ── 4. Cria o Customer (email/nome/telefone) ──
    const customer = await stripe.customers.create({
      email,
      name,
      phone: phone || undefined,
      metadata: { user_id: userId },
    });

    // ── 5. Subscription com trial de 30 dias. user_id na metadata pro webhook ──
    const subscription = await stripe.subscriptions.create({
      customer: customer.id,
      items,
      trial_period_days: TRIAL_DAYS,
      payment_behavior: 'default_incomplete',
      payment_settings: { save_default_payment_method: 'on_subscription' },
      expand: ['pending_setup_intent', 'latest_invoice.payment_intent'],
      metadata: {
        user_id: userId,
        plano: planType,
        is_anual: isAnnual ? 'true' : 'false',
        membros_extras: extraMembers.toString()
      }
    });

    const pendingSetup = subscription.pending_setup_intent as any;
    const latestInvoice = subscription.latest_invoice as any;

    const clientSecret = pendingSetup?.client_secret
      || latestInvoice?.payment_intent?.client_secret;

    const mode = pendingSetup ? 'setup' : 'payment';

    if (!clientSecret) {
      throw new Error("Nao foi possivel gerar o client secret da sessao.");
    }

    return new Response(
      JSON.stringify({ clientSecret, mode }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
    )
  }
})
