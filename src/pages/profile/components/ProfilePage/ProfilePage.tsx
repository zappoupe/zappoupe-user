import React, { useEffect, useState } from 'react';
import styles from './ProfilePage.module.css';
import { User, Mail, Phone, CreditCard, FileText, AlertCircle, ChevronRight, LogOut, ShieldCheck, Zap } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import EditProfileModal from '../EditProfileModal/EditProfileModal';
import ManagePlanModal from '../ManagePlanModal/ManagePlanModal';
import FamilyMembersSection from '../FamilyMembersSection/FamilyMembersSection';
import ChangePasswordModal from '../ChangePasswordModal/ChangePasswordModal';

interface ProfilePageProps {
  onLogout: () => void;
}

interface Assinatura {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  plano: string | null;
  is_anual: boolean | null;
  membros_extras: number | null;
  ativo: boolean | null;
  stripe_customer_id: string | null;
  criado_em: string | null;
}

const ProfilePage: React.FC<ProfilePageProps> = ({ onLogout }) => {
  const [assinatura, setAssinatura] = useState<Assinatura | null>(null);
  const [isOwner, setIsOwner] = useState(true);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminUserRecordId, setAdminUserRecordId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [isChangePasswordModalOpen, setIsChangePasswordModalOpen] = useState(false);

  const fetchAssinatura = async (userId: string, userMetadata: any, email: string) => {
    try {
      // 1. Verificar se é um membro da família convidado (Busca por ID ou Email)
      const { data: familyMember, error: familyError } = await supabase
        .from('membros_familia')
        .select('*')
        .or(`convidado_id.eq.${userId},email.eq.${email}`)
        .maybeSingle();

      if (familyError) console.error('Erro ao buscar membro_familia:', familyError);

      if (familyMember) {
        setIsOwner(false);
        setIsAdminUser(false);

        const { data: subscriptionData, error: fetchError } = await supabase
          .from('assinaturas')
          .select('*')
          .eq('id', familyMember.dono_id)
          .maybeSingle();

        if (fetchError) {
          console.error('Erro ao buscar assinatura:', fetchError);
          setError(fetchError.message);
        } else {
          setAssinatura({
            ...(subscriptionData || {
              id: userId,
              plano: 'Nenhum',
              is_anual: false,
              membros_extras: 0,
              ativo: false,
              stripe_customer_id: null,
              criado_em: null
            }),
            nome: familyMember.nome,
            email: familyMember.email,
            telefone: familyMember.telefone
          });
        }
        return;
      }

      // 2. Verificar se é usuário admin (por email)
      const { data: adminUserData } = await supabase
        .from('admin_users')
        .select('*')
        .eq('email', email)
        .maybeSingle();

      if (adminUserData) {
        setIsOwner(false);
        setIsAdminUser(true);
        setAdminUserRecordId(adminUserData.id);

        const planName = adminUserData.plano_vitalicio
          ? 'Vitalício'
          : adminUserData.usuario_teste
            ? 'Teste'
            : 'Gratuito';

        setAssinatura({
          id: adminUserData.id,
          nome: adminUserData.nome,
          email: adminUserData.email,
          telefone: adminUserData.celular || null,
          plano: planName,
          is_anual: false,
          membros_extras: 0,
          ativo: adminUserData.ativo ?? true,
          stripe_customer_id: null,
          criado_em: adminUserData.criado_em || null
        });
        return;
      }

      // 3. É o dono da conta (assinatura normal)
      setIsOwner(true);
      setIsAdminUser(false);

      const { data: subscriptionData, error: fetchError } = await supabase
        .from('assinaturas')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) {
        console.error('Erro ao buscar assinatura:', fetchError);
        setError(fetchError.message);
      } else if (subscriptionData) {
        setAssinatura(subscriptionData);
      } else {
        setAssinatura({
          id: userId,
          nome: userMetadata?.full_name || email.split('@')[0],
          email: email,
          telefone: null,
          plano: 'Nenhum',
          is_anual: false,
          membros_extras: 0,
          ativo: false,
          stripe_customer_id: null,
          criado_em: null
        });
      }
    } catch (err: any) {
      console.error('Erro inesperado:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && isMounted) {
        fetchAssinatura(session.user.id, session.user.user_metadata, session.user.email || '');
      } else if (isMounted) {
        setIsLoading(false);
        setError('Usuário não autenticado');
      }
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user && isMounted) {
        fetchAssinatura(session.user.id, session.user.user_metadata, session.user.email || '');
      } else if (isMounted) {
        setAssinatura(null);
        setIsLoading(false);
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const userData = {
    name: assinatura?.nome || 'Não informado',
    email: assinatura?.email || 'Não informado',
    phone: assinatura?.telefone || 'Não informado',
    plan: assinatura?.plano || 'Nenhum',
    status: assinatura?.ativo ? 'Ativo' : 'Inativo',
    isAnual: assinatura?.is_anual || false,
    membrosExtras: assinatura?.membros_extras || 0
  };

  // Cálculo de preços baseado nas imagens
  const isFamily = userData.plan.toLowerCase().includes('famil') || userData.plan.toLowerCase().includes('family');
  const basePrice = userData.isAnual 
    ? (isFamily ? 397.90 : 197.90) 
    : (isFamily ? 49.90 : 24.90);
    
  const extraMemberPrice = userData.isAnual ? 178.80 : 14.90;
  const totalExtra = userData.membrosExtras * extraMemberPrice;
  const totalPrice = basePrice + totalExtra;

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loader}>Carregando perfil...</div>
      </div>
    );
  }

  if (error && !assinatura) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.errorBox}>
          <AlertCircle size={24} />
          <p>{error}</p>
          <button onClick={() => window.location.reload()} className={styles.retryBtn}>Tentar Novamente</button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      {/* Hero Header Section */}
      <header className={styles.hero}>
        <div className={styles.heroContent}>
          <div className={styles.avatarWrapper}>
            <div className={styles.avatar}>
              <User size={48} />
            </div>
            <div className={styles.onlineBadge} />
          </div>
          <div className={styles.heroText}>
            <h1 className={styles.heroName}>{userData.name}</h1>
            <p className={styles.heroEmail}>{userData.email}</p>
            <div className={styles.heroBadges}>
              <div className={styles.planTag}>
                <Zap size={12} fill="currentColor" />
                <span>Plano {userData.plan}</span>
              </div>
              <div className={styles.statusTag}>
                <span>{userData.status}</span>
              </div>
            </div>
          </div>
        </div>
        <div className={styles.heroActions}>
          <button className={styles.editProfileBtn} onClick={() => setIsEditModalOpen(true)}>Editar Perfil</button>
        </div>
      </header>

      <div className={styles.grid}>
        {/* Left Column: Account Details */}
        <div className={styles.mainColumn}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <User size={18} className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Informações da Conta</h2>
            </div>
            <div className={styles.card}>
              <div className={styles.infoRow}>
                <div className={styles.infoLabel}>Nome Completo</div>
                <div className={styles.infoValue}>{userData.name}</div>
              </div>
              <div className={styles.divider} />
              <div className={styles.infoRow}>
                <div className={styles.infoLabel}>E-mail Principal</div>
                <div className={styles.infoValue}>{userData.email}</div>
              </div>
              <div className={styles.divider} />
              <div className={styles.infoRow}>
                <div className={styles.infoLabel}>Telefone / Celular</div>
                <div className={styles.infoValue}>{userData.phone}</div>
              </div>
            </div>
          </section>

          {assinatura && isOwner && (
            <FamilyMembersSection 
              userId={assinatura.id} 
              plan={userData.plan} 
              membrosExtras={userData.membrosExtras} 
            />
          )}

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <ShieldCheck size={18} className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Segurança</h2>
            </div>
            <div className={styles.card}>
              <button className={styles.actionRow} onClick={() => setIsChangePasswordModalOpen(true)}>
                <div className={styles.actionInfo}>
                  <span className={styles.actionTitle}>Alterar Senha</span>
                  <span className={styles.actionDesc}>Recomendamos trocar sua senha a cada 90 dias</span>
                </div>
                <ChevronRight size={20} className={styles.chevron} />
              </button>
            </div>
          </section>
        </div>

        {/* Right Column: Subscription & Billing */}
        <div className={styles.sideColumn}>
          {isOwner && (
            <>
              <section className={styles.section}>
                <div className={styles.sectionHeader}>
                  <Zap size={18} className={styles.sectionIcon} />
                  <h2 className={styles.sectionTitle}>Assinatura</h2>
                </div>
                <div className={`${styles.card} ${styles.subscriptionCard}`}>
                  <div className={styles.subHeader}>
                    <span className={styles.subPlanName}>Plano {userData.plan}</span>
                    <span className={styles.subPrice}>
                      R$ {totalPrice.toFixed(2).replace('.', ',')}
                      <small>/{userData.isAnual ? 'ano' : 'mês'}</small>
                    </span>
                  </div>
                  <p className={styles.subNextBilling}>
                    {userData.isAnual ? 'Cobrança Anual' : 'Cobrança Mensal'} • {userData.membrosExtras} membros extras
                  </p>
                  <div className={styles.subActions}>
                    <button className={styles.manageSubBtn} onClick={() => setIsManageModalOpen(true)}>Gerenciar Plano</button>
                  </div>
                </div>
              </section>

              <div className={styles.dangerZone}>
                <button className={styles.cancelLink} onClick={() => setIsManageModalOpen(true)}>
                  <AlertCircle size={16} />
                  <span>Deseja cancelar sua assinatura?</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      <EditProfileModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          const user = supabase.auth.getUser();
          user.then(({ data: { user } }) => {
            if (user) fetchAssinatura(user.id, user.user_metadata, user.email || '');
          });
        }}
        initialData={{
          nome: userData.name,
          telefone: userData.phone
        }}
        userSource={isAdminUser ? 'admin_users' : 'assinaturas'}
        recordId={isAdminUser ? (adminUserRecordId || undefined) : undefined}
      />

      <ManagePlanModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        onCancelSuccess={() => {
          const user = supabase.auth.getUser();
          user.then(({ data: { user } }) => {
            if (user) fetchAssinatura(user.id, user.user_metadata, user.email || '');
          });
        }}
        onUpgradeSuccess={() => {
          const user = supabase.auth.getUser();
          user.then(({ data: { user } }) => {
            if (user) fetchAssinatura(user.id, user.user_metadata, user.email || '');
          });
        }}
        planData={{
          id: assinatura?.id || '',
          plan: userData.plan,
          isAnual: userData.isAnual,
          membrosExtras: userData.membrosExtras,
          status: userData.status
        }}
      />

      <ChangePasswordModal 
        isOpen={isChangePasswordModalOpen}
        onClose={() => setIsChangePasswordModalOpen(false)}
      />
    </div>
  );
};

export default ProfilePage;
