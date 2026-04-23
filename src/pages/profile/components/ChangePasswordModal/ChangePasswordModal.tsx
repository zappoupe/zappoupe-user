import React, { useState } from 'react';
import styles from './ChangePasswordModal.module.css';
import { ShieldCheck, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Loader2, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface ChangePasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChangePasswordModal: React.FC<ChangePasswordModalProps> = ({ isOpen, onClose }) => {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      setError('As senhas não coincidem.');
      return;
    }

    if (newPassword.length < 6) {
      setError('A senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword
      });

      if (updateError) throw updateError;

      setSuccess(true);
      setTimeout(() => {
        onClose();
        setSuccess(false);
        setNewPassword('');
        setConfirmPassword('');
      }, 2000);
    } catch (err: any) {
      console.error('Erro ao alterar senha:', err);
      setError(err.message || 'Ocorreu um erro ao alterar a senha.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={styles.modal}
          >
            <div className={styles.header}>
              <div className={styles.titleGroup}>
                <ShieldCheck className={styles.icon} size={24} />
                <h3 className={styles.title}>Alterar Senha</h3>
              </div>
              <button onClick={onClose} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            {success ? (
              <div className={styles.successState}>
                <CheckCircle2 size={48} className={styles.successIcon} />
                <h4 className={styles.successTitle}>Senha Alterada!</h4>
                <p className={styles.successText}>Sua senha foi atualizada com sucesso.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className={styles.form}>
                <p className={styles.description}>
                  Escolha uma senha forte para garantir a segurança da sua conta.
                </p>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Nova Senha</label>
                  <div className={styles.inputWrapper}>
                    <Lock size={18} className={styles.inputIcon} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      placeholder="Mínimo 6 caracteres"
                      className={styles.input}
                      value={newPassword}
                      onChange={e => setNewPassword(e.target.value)}
                    />
                    <button 
                      type="button" 
                      className={styles.toggleBtn}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Confirmar Nova Senha</label>
                  <div className={styles.inputWrapper}>
                    <Lock size={18} className={styles.inputIcon} />
                    <input 
                      type={showPassword ? "text" : "password"} 
                      required
                      placeholder="Repita a nova senha"
                      className={styles.input}
                      value={confirmPassword}
                      onChange={e => setConfirmPassword(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <div className={styles.errorMsg}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className={styles.footer}>
                  <button type="button" onClick={onClose} className={styles.cancelBtn} disabled={isLoading}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={isLoading} className={styles.submitBtn}>
                    {isLoading ? (
                      <>
                        <Loader2 size={18} className={styles.spin} />
                        <span>Salvando...</span>
                      </>
                    ) : (
                      <span>Atualizar Senha</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ChangePasswordModal;
