import React, { useState, useEffect } from 'react';
import { X, ArrowUpCircle, ArrowDownCircle, Check, Calendar, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../../../lib/supabase';
import styles from './NewFinanceModal.module.css';

interface NewFinanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    id: string;
    description: string;
    amount: number;
    type: 'income' | 'expense';
    frequency: string;
    due_day: number;
  } | null;
}

const NewFinanceModal: React.FC<NewFinanceModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [type, setType] = useState<'income' | 'expense'>('expense');
  const [description, setDescription] = useState('');
  const [amount, setAmount] = useState('');
  const [frequency, setFrequency] = useState('Mensal');
  const [dueDay, setDueDay] = useState('1');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setType(initialData.type);
      setDescription(initialData.description);
      setAmount(initialData.amount.toString().replace('.', ','));
      setFrequency(initialData.frequency);
      setDueDay(initialData.due_day.toString());
    } else {
      setType('expense');
      setDescription('');
      setAmount('');
      setFrequency('Mensal');
      setDueDay('1');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const numericAmount = parseFloat(amount.replace(',', '.'));
      if (isNaN(numericAmount)) throw new Error('Valor inválido.');

      const payload = {
        description,
        amount: numericAmount,
        type,
        frequency,
        due_day: parseInt(dueDay),
      };

      if (initialData) {
        const { error } = await supabase
          .from('recurring_finances')
          .update(payload)
          .eq('id', initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('recurring_finances')
          .insert([{ ...payload, user_id: user.id }]);
        if (error) throw error;

        // Lógica de Auto-Transação: Se o dia de vencimento for hoje, cria a transação automaticamente
        const today = new Date().getDate();
        if (parseInt(dueDay) === today) {
          await supabase
            .from('transactions')
            .insert([{
              user_id: user.id,
              description: `[Auto] ${description}`,
              amount: numericAmount,
              type,
              category: 'Programação Fixa',
              date: new Date().toISOString()
            }]);
        }
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar finança');
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
              <h2 className={styles.title}>{initialData ? 'Editar Programação' : 'Nova Programação'}</h2>
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
                  <span>Receita Fixa</span>
                </button>
                <button
                  type="button"
                  className={`${styles.typeBtn} ${type === 'expense' ? styles.activeExpense : ''}`}
                  onClick={() => setType('expense')}
                >
                  <ArrowDownCircle size={20} />
                  <span>Despesa Fixa</span>
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
                  placeholder="Ex: Aluguel, Internet, Salário..."
                />
              </div>

              <div className={styles.row}>
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
                  <label className={styles.label}>Dia do Vencimento</label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={dueDay}
                    onChange={(e) => setDueDay(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Frequência</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className={styles.select}
                >
                  <option value="Mensal">Mensal</option>
                  <option value="Semanal">Semanal</option>
                  <option value="Anual">Anual</option>
                  <option value="Único">Único</option>
                </select>
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
                    <span>Salvar Programação</span>
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

export default NewFinanceModal;
