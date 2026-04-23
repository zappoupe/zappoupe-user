import React, { useState, useEffect } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../../../lib/supabase';
import styles from './NewTransactionModal.module.css';

interface NewTransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    category: string;
  } | null;
}

const NewTransactionModal: React.FC<NewTransactionModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Geral');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setDescription(initialData.description);
      setAmount(initialData.amount.toString().replace('.', ','));
      setCategory(initialData.category);
    } else {
      setType('expense');
      setDescription('');
      setAmount('');
      setCategory('Geral');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error('Usuário não autenticado. Por favor, faça login novamente.');

      const numericAmount = parseFloat(amount.replace(',', '.'));
      if (isNaN(numericAmount)) {
        throw new Error('Por favor, insira um valor numérico válido.');
      }

      if (initialData) {
        // Update existing
        const { error } = await supabase
          .from('transactions')
          .update({
            description,
            amount: numericAmount,
            type,
            category,
          })
          .eq('id', initialData.id);

        if (error) throw error;
      } else {
        // Insert new
        const { error } = await supabase
          .from('transactions')
          .insert([
            {
              user_id: user.id,
              description,
              amount: numericAmount,
              type,
              category,
              date: new Date().toISOString()
            }
          ]);

        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar transação');
    } finally {
      setIsLoading(false);
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
              <h2 className={styles.title}>{initialData ? 'Editar Transação' : 'Nova Transação'}</h2>
              <button onClick={onClose} className={styles.closeBtn}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.typeSelector}>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${type === 'income' ? styles.activeIncome : ''}`}
                  onClick={() => setType('income')}
                >
                  <ArrowUpCircle size={20} />
                  <span>Receita</span>
                </button>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${type === 'expense' ? styles.activeExpense : ''}`}
                  onClick={() => setType('expense')}
                >
                  <ArrowDownCircle size={20} />
                  <span>Despesa</span>
                </button>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Descrição</label>
                <input
                  type="text"
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className={styles.input}
                  placeholder="Ex: Supermercado, Salário..."
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Valor (R$)</label>
                <input
                  type="text"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className={styles.input}
                  placeholder="0,00"
                />
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Categoria</label>
                <input
                  type="text"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className={styles.input}
                  placeholder="Ex: Alimentação, Lazer..."
                />
              </div>

              {error && <p className={styles.error}>{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitBtn}
              >
                {isLoading ? 'Salvando...' : (
                  <>
                    <Check size={20} />
                    <span>Confirmar Transação</span>
                  </>
                )}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export default NewTransactionModal;
