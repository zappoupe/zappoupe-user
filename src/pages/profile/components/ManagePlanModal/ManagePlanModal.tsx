import React from 'react';
import { X, Check, AlertCircle, Shield, Zap, Users, CreditCard, CheckCircle2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../../../lib/supabase';
import styles from './ManagePlanModal.module.css';

interface ManagePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCancelSuccess?: () => void;
  planData: {
    id: string;
    plan: string;
    isAnual: boolean;
    membrosExtras: number;
    status: string;
  };
}

const ManagePlanModal: React.FC<ManagePlanModalProps> = ({ isOpen, onClose, onCancelSuccess, planData }) => {
  const [isConfirming, setIsConfirming] = React.useState(false);
  const [isCancelling, setIsCancelling] = React.useState(false);
  const [isSuccess, setIsSuccess] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const isFamily = planData.plan.toLowerCase().includes('famil') || planData.plan.toLowerCase().includes('family');
  
  // Preços baseados nas imagens enviadas
  const basePrice = planData.isAnual 
    ? (isFamily ? 397.90 : 197.90) 
    : (isFamily ? 49.90 : 24.90);
    
  const extraMemberPrice = planData.isAnual ? 178.80 : 14.90;
  const totalExtra = planData.membrosExtras * extraMemberPrice;
  const totalPrice = basePrice + totalExtra;

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    setError(null);
    try {
      const { error: updateError } = await supabase
        .from('assinaturas')
        .update({ 
          ativo: false,
          cancelado_em: new Date().toISOString()
        })
        .eq('id', planData.id);

      if (updateError) throw updateError;

      setIsSuccess(true);
      if (onCancelSuccess) onCancelSuccess();
      // Não fechamos imediatamente para mostrar o sucesso
    } catch (err: any) {
      console.error('Erro ao cancelar assinatura:', err);
      setError('Não foi possível cancelar sua assinatura. Tente novamente mais tarde.');
    } finally {
      setIsCancelling(false);
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
                <h2 className={styles.title}>{isConfirming ? 'Confirmar Cancelamento' : 'Gerenciar Plano'}</h2>
                <p className={styles.subtitle}>
                  {isConfirming 
                    ? 'Tem certeza que deseja cancelar sua assinatura?' 
                    : 'Detalhes da sua assinatura ativa'}
                </p>
              </div>
              <button onClick={onClose} className={styles.closeBtn} disabled={isCancelling}>
                <X size={24} />
              </button>
            </div>

            <div className={styles.content}>
              {isSuccess ? (
                <div className={styles.successView}>
                  <div className={styles.successIconWrapper}>
                    <CheckCircle2 size={48} className={styles.successIcon} />
                  </div>
                  <h3 className={styles.successTitle}>Assinatura Cancelada</h3>
                  <p className={styles.successText}>
                    Sua assinatura foi cancelada com sucesso. Você continuará tendo acesso aos recursos premium até o fim do período atual. 
                    Nenhuma nova cobrança será realizada.
                  </p>
                  <button onClick={onClose} className={styles.finishBtn}>
                    Entendido
                  </button>
                </div>
              ) : !isConfirming ? (
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
                        <span className={styles.detailValue}>{planData.isAnual ? 'Anual (Economia de 20%)' : 'Mensal'}</span>
                      </div>
                    </div>

                    {isFamily && (
                      <div className={styles.detailItem}>
                        <div className={styles.detailIcon}><Users size={18} /></div>
                        <div className={styles.detailText}>
                          <span className={styles.detailLabel}>Membros Extras</span>
                          <span className={styles.detailValue}>{planData.membrosExtras} membros (+ R$ {totalExtra.toFixed(2).replace('.', ',')})</span>
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
                    <button 
                      className={styles.cancelBtn} 
                      onClick={() => setIsConfirming(true)}
                      disabled={planData.status === 'Inativo'}
                    >
                      <AlertCircle size={16} />
                      <span>Cancelar Assinatura</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className={styles.confirmationView}>
                  <div className={styles.warningBox}>
                    <AlertCircle size={32} className={styles.warningIcon} />
                    <p className={styles.warningText}>
                      Ao cancelar, você perderá acesso aos recursos premium do ZapPoupe ao final do período atual. 
                      Sua conta voltará para o plano gratuito e seus dados de membros da família serão desativados.
                    </p>
                  </div>

                  {error && <p className={styles.errorMessage}>{error}</p>}

                  <div className={styles.confirmActions}>
                    <button 
                      className={styles.backBtn} 
                      onClick={() => setIsConfirming(false)}
                      disabled={isCancelling}
                    >
                      Voltar
                    </button>
                    <button 
                      className={styles.confirmCancelBtn} 
                      onClick={handleCancelSubscription}
                      disabled={isCancelling}
                    >
                      {isCancelling ? 'Cancelando...' : 'Sim, Cancelar Assinatura'}
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
