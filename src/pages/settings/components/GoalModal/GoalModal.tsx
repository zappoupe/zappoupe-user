import React, { useState, useEffect } from 'react';
import { X, Target, TrendingUp, Plus, Minus, Save, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import styles from './GoalModal.module.css';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
}

interface GoalModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (goal: Goal | null) => void;
  initialGoal: Goal | null;
}

const GoalModal: React.FC<GoalModalProps> = ({ isOpen, onClose, onSave, initialGoal }) => {
  const [name, setName] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [currentAmount, setCurrentAmount] = useState('');
  const [addValue, setAddValue] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (initialGoal) {
      setName(initialGoal.name);
      setTargetAmount(initialGoal.targetAmount.toString());
      setCurrentAmount(initialGoal.currentAmount.toString());
      setIsEditing(false);
      setShowDeleteConfirm(false);
    } else {
      setName('');
      setTargetAmount('');
      setCurrentAmount('0');
      setIsEditing(true);
      setShowDeleteConfirm(false);
    }
  }, [initialGoal, isOpen]);

  const handleSave = () => {
    if (!name || !targetAmount) return;

    const newGoal: Goal = {
      id: initialGoal?.id || crypto.randomUUID(),
      name,
      targetAmount: parseFloat(targetAmount),
      currentAmount: parseFloat(currentAmount),
    };

    onSave(newGoal);
    onClose();
  };

  const handleAddProgress = () => {
    const val = parseFloat(addValue);
    if (isNaN(val)) return;
    
    const newCurrent = parseFloat(currentAmount) + val;
    setCurrentAmount(newCurrent.toString());
    setAddValue('');
  };

  const handleDelete = () => {
    onSave(null);
    onClose();
  };

  const progress = initialGoal ? (parseFloat(currentAmount) / parseFloat(targetAmount)) * 100 : 0;
  const cappedProgress = Math.min(100, Math.max(0, progress));

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
                <div className={styles.iconTitleRow}>
                  <Target className={styles.headerIcon} size={28} />
                  <h2 className={styles.title}>{initialGoal ? 'Gerenciar Meta' : 'Nova Meta Financeira'}</h2>
                </div>
                <p className={styles.subtitle}>
                  {initialGoal ? 'Acompanhe e alimente seu progresso' : 'Defina um objetivo para o seu dinheiro'}
                </p>
              </div>
              <button onClick={onClose} className={styles.closeBtn}>
                <X size={20} />
              </button>
            </div>

            <div className={styles.content}>
              {initialGoal && !isEditing ? (
                <div className={styles.viewMode}>
                  <div className={styles.progressCard}>
                    <div className={styles.progressHeader}>
                      <span className={styles.goalName}>{name}</span>
                      <span className={styles.percentage}>{cappedProgress.toFixed(0)}%</span>
                    </div>
                    <div className={styles.progressBar}>
                      <motion.div 
                        initial={{ width: 0 }}
                        animate={{ width: `${cappedProgress}%` }}
                        className={styles.progressFill} 
                      />
                    </div>
                    <div className={styles.amounts}>
                      <span className={styles.current}>R$ {parseFloat(currentAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                      <span className={styles.target}>de R$ {parseFloat(targetAmount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
                    </div>
                  </div>

                  <div className={styles.feedSection}>
                    <label className={styles.label}>Alimentar Meta</label>
                    <div className={styles.feedInputGroup}>
                      <div className={styles.inputPrefix}>R$</div>
                      <input 
                        type="number" 
                        className={styles.feedInput}
                        placeholder="Quanto você quer guardar hoje?"
                        value={addValue}
                        onChange={(e) => setAddValue(e.target.value)}
                      />
                      <button className={styles.addBtn} onClick={handleAddProgress}>
                        <Plus size={18} />
                        <span>Adicionar</span>
                      </button>
                    </div>
                  </div>

                  <div className={styles.footerActions}>
                    <button className={styles.editBtn} onClick={() => setIsEditing(true)}>Editar Detalhes</button>
                    <button className={styles.saveChangesBtn} onClick={handleSave}>
                      <Save size={18} />
                      <span>Salvar Progresso</span>
                    </button>
                  </div>
                </div>
              ) : (
                <div className={styles.editMode}>
                  <div className={styles.inputGroup}>
                    <label className={styles.label}>Nome da Meta</label>
                    <div className={styles.inputWrapper}>
                      <Target size={18} className={styles.inputIcon} />
                      <input 
                        type="text" 
                        className={styles.input}
                        placeholder="Ex: Reserva de Emergência, Viagem..."
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className={styles.row}>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Valor Objetivo</label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.prefix}>R$</span>
                        <input 
                          type="number" 
                          className={styles.input}
                          placeholder="0,00"
                          value={targetAmount}
                          onChange={(e) => setTargetAmount(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className={styles.inputGroup}>
                      <label className={styles.label}>Valor Atual</label>
                      <div className={styles.inputWrapper}>
                        <span className={styles.prefix}>R$</span>
                        <input 
                          type="number" 
                          className={styles.input}
                          placeholder="0,00"
                          value={currentAmount}
                          onChange={(e) => setCurrentAmount(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>

                  <div className={styles.footerActions}>
                    {initialGoal && (
                      <div className={styles.deleteContainer}>
                        {showDeleteConfirm ? (
                          <div className={styles.deleteConfirmRow}>
                            <span className={styles.confirmText}>Excluir?</span>
                            <button className={styles.confirmDeleteBtn} onClick={handleDelete}>Sim</button>
                            <button className={styles.cancelDeleteBtn} onClick={() => setShowDeleteConfirm(false)}>Não</button>
                          </div>
                        ) : (
                          <button className={styles.deleteBtn} onClick={() => setShowDeleteConfirm(true)}>
                            <Trash2 size={20} />
                          </button>
                        )}
                      </div>
                    )}
                    <div style={{ flex: 1 }} />
                    <button className={styles.cancelBtn} onClick={() => initialGoal ? setIsEditing(false) : onClose()}>Cancelar</button>
                    <button className={styles.confirmBtn} onClick={handleSave}>
                      {initialGoal ? 'Atualizar Meta' : 'Criar Meta'}
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

export default GoalModal;
