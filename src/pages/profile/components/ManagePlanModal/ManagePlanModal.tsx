import React from 'react';
import { X, AlertCircle, Shield, Zap, Users, CreditCard, CheckCircle2, ArrowUp, Check, Star } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../../../lib/supabase';
import styles from './ManagePlanModal.module.css';

interface ManagePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancelSuccess?: () => void;
  onUpgradeSuccess?: () => void;
  planData: {
    id: string;
    plan: string;
    isAnual: boolean;
    membrosExtras: number;
    status: string;
  };
}

type View = 'main' | 'cancel-confirm' | 'cancel-success' | 'upgrade-confirm' | 'upgrade-success';

const ManagePlanModal: React.FC<ManagePlanModalProps> = ({
  isOpen,
  onClose,
  onCancelSuccess,
  onUpgradeSuccess,
  planData,
}) => {
  const [view, setView] = React.useState<View>('main');
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isFamily = planData.plan.toLowerCase().includes('famil') || planData.plan.toLowerCase().includes('family');

  const basePrice = planData.isAnual
    ? (isFamily ? 397.90 : 197.90)
    : (isFamily ? 49.90 : 24.90);

  const extraMemberPrice = planData.isAnual ? 178.80 : 14.90;
  const totalExtra = planData.membrosExtras * extraMemberPrice;
  const totalPrice = basePrice + totalExtra;

  const familyPrice = planData.isAnual ? 397.90 : 49.90;

  React.useEffect(() => {
    if (!isOpen) {
      setView('main');
      setError(null);
    }
  }, [isOpen]);

  const handleCancelSubscription = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // Cancela de verdade no Stripe (fim do período) via Edge Function.
      // O invoke já envia o JWT da sessão, então o servidor cancela só a
      // assinatura do próprio usuário. Fazer só um UPDATE no banco aqui NÃO
      // pararia a cobrança no Stripe — por isso vai pela função.
      const { data, error: fnError } = await supabase.functions.invoke('cancel-subscription', {
        method: 'POST',
      });

      if (fnError) throw fnError;
      if (data?.error) throw new Error(data.error);

      setView('cancel-success');
      if (onCancelSuccess) onCancelSuccess();
    } catch (err: any) {
      console.error('Erro ao cancelar assinatura:', err);
      setError(err?.message || 'Não foi possível cancelar sua assinatura. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpgradePlan = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('assinaturas')
        .update({ plano: 'Family' })
        .eq('id', planData.id);

      if (updateError) throw updateError;

      setView('upgrade-success');
      if (onUpgradeSuccess) onUpgradeSuccess();
    } catch (err: any) {
      console.error('Erro ao fazer upgrade:', err);
      setError('Não foi possível fazer o upgrade do plano. Tente novamente mais tarde.');
    } finally {
      setIsLoading(false);
    }
  };

  const getTitle = () => {
    switch (view) {
      case 'cancel-confirm': return 'Confirmar Cancelamento';
      case 'upgrade-confirm': return 'Upgrade para Family';
      default: return 'Gerenciar Plano';
    }
  };

  const getSubtitle = () => {
    switch (view) {
      case 'cancel-confirm': return 'Tem certeza que deseja cancelar sua assinatura?';
      case 'upgrade-confirm': return 'Confira os detalhes do seu novo plano';
      default: return 'Detalhes da sua assinatura ativa';
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className={styles.overlay}>
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={styles.modal}
          >
            <div className={styles.header}>
              <div className={styles.titleGroup}>
                <h2 className={styles.title}>{getTitle()}</h2>
                <p className={styles.subtitle}>{getSubtitle()}</p>
              </div>
              <button onClick={onClose} className={styles.closeBtn} disabled={isLoading}>
                <X size={24} />
              </button>
            </div>

            <div className={styles.content}>
              {/* CANCEL SUCCESS */}
              {view === 'cancel-success' && (
                <div className={styles.successView}>
                  <div className={styles.successIconWrapper}>
                    <CheckCircle2 size={48} />
                  </div>
                  <h3 className={styles.successTitle}>Assinatura Cancelada</h3>
                  <p className={styles.successText}>
                    Sua assinatura foi cancelada com sucesso. Você continuará tendo acesso aos recursos
                    premium até o fim do período atual. Nenhuma nova cobrança será realizada.
                  </p>
                  <button onClick={onClose} className={styles.finishBtn}>
                    Entendido
                  </button>
                </div>
              )}

              {/* UPGRADE SUCCESS */}
              {view === 'upgrade-success' && (
                <div className={styles.successView}>
                  <div className={styles.successIconWrapperGold}>
                    <Star size={48} fill="currentColor" />
                  </div>
                  <h3 className={styles.successTitle}>Upgrade Realizado!</h3>
                  <p className={styles.successText}>
                    Parabéns! Seu plano foi atualizado para o Plano Family. Agora você pode adicionar
                    até 3 membros da família e aproveitar todos os benefícios.
                  </p>
                  <button onClick={onClose} className={styles.finishBtn}>
                    Ótimo!
                  </button>
                </div>
              )}

              {/* MAIN VIEW */}
              {view === 'main' && (
                <>
                  <div className={styles.planCard}>
                    <div className={styles.planIcon}>
                      <Zap size={24} fill="currentColor" />
                    </div>
                    <div className={styles.planInfo}>
                      <h3 className={styles.planName}>Plano {planData.plan}</h3>
                      <p className={styles.planStatus}>
                        Status: <span className={styles.statusActive}>{planData.status}</span>
                      </p>
                    </div>
                    <div className={styles.planPrice}>
                      <span className={styles.currency}>R$</span>
                      <span className={styles.amount}>{totalPrice.toFixed(2).replace('.', ',')}</span>
                      <span className={styles.period}>/{planData.isAnual ? 'ano' : 'mês'}</span>
                    </div>
                  </div>

                  <div className={styles.detailsList}>
                    <div className={styles.detailItem}>
                      <div className={styles.detailIcon}><Shield size={18} /></div>
                      <div className={styles.detailText}>
                        <span className={styles.detailLabel}>Tipo de Assinatura</span>
                        <span className={styles.detailValue}>
                          {planData.isAnual ? 'Anual (Economia de 20%)' : 'Mensal'}
                        </span>
                      </div>
                    </div>

                    {isFamily && (
                      <div className={styles.detailItem}>
                        <div className={styles.detailIcon}><Users size={18} /></div>
                        <div className={styles.detailText}>
                          <span className={styles.detailLabel}>Membros Extras</span>
                          <span className={styles.detailValue}>
                            {planData.membrosExtras} membros (+ R$ {totalExtra.toFixed(2).replace('.', ',')})
                          </span>
                        </div>
                      </div>
                    )}

                    <div className={styles.detailItem}>
                      <div className={styles.detailIcon}><CreditCard size={18} /></div>
                      <div className={styles.detailText}>
                        <span className={styles.detailLabel}>Próxima Cobrança</span>
                        <span className={styles.detailValue}>Automática via Stripe</span>
                      </div>
                    </div>
                  </div>

                  <div className={styles.actions}>
                    {!isFamily && (
                      <button
                        className={styles.upgradeBtn}
                        onClick={() => setView('upgrade-confirm')}
                        disabled={planData.status !== 'Ativo'}
                      >
                        <ArrowUp size={16} />
                        <span>Upgrade para Plano Family</span>
                      </button>
                    )}

                    {planData.status === 'Cancelando' ? (
                      <p className={styles.cancelingNote}>
                        Cancelamento agendado. Você mantém acesso até o fim do período já pago e
                        não haverá novas cobranças.
                      </p>
                    ) : (
                      <button
                        className={styles.cancelBtn}
                        onClick={() => setView('cancel-confirm')}
                        disabled={planData.status !== 'Ativo'}
                      >
                        <AlertCircle size={16} />
                        <span>Cancelar Assinatura</span>
                      </button>
                    )}
                  </div>
                </>
              )}

              {/* CANCEL CONFIRMATION */}
              {view === 'cancel-confirm' && (
                <div className={styles.confirmationView}>
                  <div className={styles.warningBox}>
                    <AlertCircle size={32} className={styles.warningIcon} />
                    <p className={styles.warningText}>
                      Ao cancelar, você perderá acesso aos recursos premium do ZapPoupe ao final do
                      período atual. Sua conta voltará para o plano gratuito e seus dados de membros
                      da família serão desativados.
                    </p>
                  </div>

                  {error && <p className={styles.errorMessage}>{error}</p>}

                  <div className={styles.confirmActions}>
                    <button
                      className={styles.backBtn}
                      onClick={() => { setView('main'); setError(null); }}
                      disabled={isLoading}
                    >
                      Voltar
                    </button>
                    <button
                      className={styles.confirmCancelBtn}
                      onClick={handleCancelSubscription}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Cancelando...' : 'Sim, Cancelar Assinatura'}
                    </button>
                  </div>
                </div>
              )}

              {/* UPGRADE CONFIRMATION */}
              {view === 'upgrade-confirm' && (
                <div className={styles.upgradeView}>
                  <div className={styles.upgradeCompare}>
                    <div className={styles.planCompareCard}>
                      <p className={styles.compareLabel}>Plano Atual</p>
                      <p className={styles.comparePlanName}>Individual</p>
                      <p className={styles.comparePrice}>
                        R$ {basePrice.toFixed(2).replace('.', ',')}
                        <span>/{planData.isAnual ? 'ano' : 'mês'}</span>
                      </p>
                    </div>

                    <div className={styles.upgradeArrow}>
                      <ArrowUp size={22} />
                    </div>

                    <div className={`${styles.planCompareCard} ${styles.planCompareCardNew}`}>
                      <p className={styles.compareLabel}>Novo Plano</p>
                      <p className={styles.comparePlanName}>Family</p>
                      <p className={styles.comparePrice}>
                        R$ {familyPrice.toFixed(2).replace('.', ',')}
                        <span>/{planData.isAnual ? 'ano' : 'mês'}</span>
                      </p>
                    </div>
                  </div>

                  <div className={styles.upgradeFeatures}>
                    <div className={styles.upgradeFeatureItem}>
                      <Check size={15} className={styles.checkIcon} />
                      <span>Até 3 membros da família incluídos</span>
                    </div>
                    <div className={styles.upgradeFeatureItem}>
                      <Check size={15} className={styles.checkIcon} />
                      <span>Controle financeiro familiar compartilhado</span>
                    </div>
                    <div className={styles.upgradeFeatureItem}>
                      <Check size={15} className={styles.checkIcon} />
                      <span>Todos os recursos do plano Individual</span>
                    </div>
                  </div>

                  {error && <p className={styles.errorMessage}>{error}</p>}

                  <div className={styles.confirmActions}>
                    <button
                      className={styles.backBtn}
                      onClick={() => { setView('main'); setError(null); }}
                      disabled={isLoading}
                    >
                      Voltar
                    </button>
                    <button
                      className={styles.confirmUpgradeBtn}
                      onClick={handleUpgradePlan}
                      disabled={isLoading}
                    >
                      {isLoading ? 'Processando...' : 'Confirmar Upgrade'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default ManagePlanModal;
