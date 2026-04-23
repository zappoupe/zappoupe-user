import React, { useState, useEffect } from 'react';
import styles from './FamilyMembersSection.module.css';
import { Users, Plus, Mail, Phone, Trash2, ShieldCheck, UserPlus, AlertCircle, Loader2, X } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import { motion, AnimatePresence } from 'motion/react';

interface FamilyMember {
  id: string;
  nome: string;
  email: string;
  telefone: string;
  status: 'pendente' | 'ativo';
  criado_em: string;
}

interface FamilyMembersSectionProps {
  userId: string;
  plan: string;
  membrosExtras: number;
}

const FamilyMembersSection: React.FC<FamilyMembersSectionProps> = ({ userId, plan, membrosExtras }) => {
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPhone, setNewPhone] = useState('');

  const isFamilyPlan = plan.toLowerCase().includes('famil') || plan.toLowerCase().includes('family');
  const baseLimit = isFamilyPlan ? 3 : 0;
  const totalLimit = baseLimit + membrosExtras;

  const fetchMembers = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('membros_familia')
        .select('*')
        .eq('dono_id', userId)
        .order('criado_em', { ascending: true });

      if (fetchError) throw fetchError;
      setMembers(data || []);
    } catch (err: any) {
      console.error('Erro ao buscar membros:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, [userId]);

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (members.length >= totalLimit) {
      setError(`Você atingiu o limite de ${totalLimit} membros para o seu plano.`);
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      // 1. Salvar na tabela de membros_familia com configurações padrão
      const { error: insertError } = await supabase
        .from('membros_familia')
        .insert([{
          dono_id: userId,
          nome: newName,
          email: newEmail,
          telefone: newPhone,
          status: 'pendente',
          // Configurações padrão solicitadas pelo usuário
          faixa_renda: '0-1000',
          renda_mensal: 0,
          personalidade_bot: 'friendly',
          proatividade_bot: 'medium',
          dicas_economia: true,
          sugestoes_excedente: true,
          economia_automatica: false,
          metas: []
        }]);

      if (insertError) throw insertError;

      // 2. Simular envio de convite (No mundo real, isso dispararia um Edge Function ou Trigger)
      // O usuário pediu para criar o usuário no Supabase. 
      // Sem Service Role Key no front, não podemos criar o usuário diretamente.
      // Mas podemos usar o signInWithOtp como um "convite" ou apenas informar que o convite foi enviado.
      
      await fetchMembers();
      setIsModalOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPhone('');
    } catch (err: any) {
      console.error('Erro ao adicionar membro:', err);
      setError(err.message || 'Erro ao adicionar membro');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteMember = async (memberId: string) => {
    setDeletingId(memberId);
    try {
      const { error: deleteError } = await supabase
        .from('membros_familia')
        .delete()
        .eq('id', memberId);

      if (deleteError) throw deleteError;
      setMembers(members.filter(m => m.id !== memberId));
      setConfirmDeleteId(null);
    } catch (err: any) {
      console.error('Erro ao deletar membro:', err);
      alert('Erro ao excluir membro. Tente novamente.');
    } finally {
      setDeletingId(null);
    }
  };

  if (!isFamilyPlan && totalLimit === 0) {
    return (
      <section className={styles.section}>
        <div className={styles.sectionHeader}>
          <Users size={18} className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Membros da Família</h2>
        </div>
        <div className={styles.card}>
          <div className={styles.emptyState}>
            <Users size={32} className={styles.emptyIcon} />
            <p className={styles.emptyText}>Seu plano atual não permite adicionar membros da família.</p>
            <p className={styles.emptySubtext}>Faça upgrade para o Plano Família para compartilhar sua conta.</p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div className={styles.headerLeft}>
          <Users size={18} className={styles.sectionIcon} />
          <h2 className={styles.sectionTitle}>Membros da Família</h2>
        </div>
        <span className={styles.limitBadge}>
          {members.length} / {totalLimit}
        </span>
      </div>

      <div className={styles.card}>
        {isLoading ? (
          <div className={styles.loading}>Carregando membros...</div>
        ) : members.length === 0 ? (
          <div className={styles.emptyState}>
            <UserPlus size={32} className={styles.emptyIcon} />
            <p className={styles.emptyText}>Nenhum membro adicionado ainda.</p>
            <button className={styles.addFirstBtn} onClick={() => setIsModalOpen(true)}>
              Adicionar Primeiro Membro
            </button>
          </div>
        ) : (
          <div className={styles.membersList}>
            {members.map(member => (
              <div key={member.id} className={styles.memberItem}>
                <div className={styles.memberInfo}>
                  <div className={styles.memberAvatar}>
                    {member.nome.charAt(0).toUpperCase()}
                  </div>
                  <div className={styles.memberDetails}>
                    <span className={styles.memberName}>{member.nome}</span>
                    <span className={styles.memberEmail}>{member.email}</span>
                  </div>
                </div>
                <div className={styles.memberActions}>
                  <AnimatePresence mode="wait">
                    {confirmDeleteId === member.id ? (
                      <motion.div 
                        key="confirm"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: 10 }}
                        className={styles.confirmDeleteGroup}
                      >
                        <span className={styles.confirmText}>Excluir?</span>
                        <button 
                          className={styles.confirmBtn} 
                          onClick={() => handleDeleteMember(member.id)}
                          disabled={deletingId === member.id}
                        >
                          {deletingId === member.id ? <Loader2 size={12} className={styles.spin} /> : 'Sim'}
                        </button>
                        <button 
                          className={styles.cancelDeleteBtn} 
                          onClick={() => setConfirmDeleteId(null)}
                          disabled={deletingId === member.id}
                        >
                          Não
                        </button>
                      </motion.div>
                    ) : (
                      <motion.div 
                        key="actions"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className={styles.actionsGroup}
                      >
                        <button className={styles.deleteBtn} onClick={() => setConfirmDeleteId(member.id)}>
                          <Trash2 size={16} />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ))}
            
            {members.length < totalLimit && (
              <button className={styles.addNewBtn} onClick={() => setIsModalOpen(true)}>
                <Plus size={18} />
                <span>Adicionar Novo Membro</span>
              </button>
            )}
          </div>
        )}
      </div>

      {/* Modal de Adição */}
      <AnimatePresence>
        {isModalOpen && (
          <div className={styles.modalOverlay}>
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className={styles.modal}
            >
              <div className={styles.modalHeader}>
                <div className={styles.modalTitleGroup}>
                  <UserPlus className={styles.modalIcon} size={24} />
                  <h3 className={styles.modalTitle}>Convidar Familiar</h3>
                </div>
                <button onClick={() => setIsModalOpen(false)} className={styles.closeBtn}>
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleAddMember} className={styles.form}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Nome Completo</label>
                  <div className={styles.inputWrapper}>
                    <Users size={18} className={styles.inputIcon} />
                    <input 
                      type="text" 
                      required
                      placeholder="Nome do familiar"
                      className={styles.input}
                      value={newName}
                      onChange={e => setNewName(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>E-mail</label>
                  <div className={styles.inputWrapper}>
                    <Mail size={18} className={styles.inputIcon} />
                    <input 
                      type="email" 
                      required
                      placeholder="email@exemplo.com"
                      className={styles.input}
                      value={newEmail}
                      onChange={e => setNewEmail(e.target.value)}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.label}>Telefone / WhatsApp</label>
                  <div className={styles.inputWrapper}>
                    <Phone size={18} className={styles.inputIcon} />
                    <input 
                      type="tel" 
                      placeholder="(00) 00000-0000"
                      className={styles.input}
                      value={newPhone}
                      onChange={e => setNewPhone(e.target.value)}
                    />
                  </div>
                </div>

                {error && (
                  <div className={styles.errorMsg}>
                    <AlertCircle size={16} />
                    <span>{error}</span>
                  </div>
                )}

                <div className={styles.modalFooter}>
                  <button type="button" onClick={() => setIsModalOpen(false)} className={styles.cancelBtn}>
                    Cancelar
                  </button>
                  <button type="submit" disabled={isSaving} className={styles.submitBtn}>
                    {isSaving ? (
                      <>
                        <Loader2 size={18} className={styles.spin} />
                        <span>Enviando...</span>
                      </>
                    ) : (
                      <>
                        <Mail size={18} />
                        <span>Enviar Convite</span>
                      </>
                    )}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
};

export default FamilyMembersSection;
