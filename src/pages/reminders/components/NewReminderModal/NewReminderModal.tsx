import React, { useState, useEffect } from 'react';
import { X, Check, Calendar, Clock, RefreshCw } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { supabase } from '../../../../lib/supabase';
import styles from './NewReminderModal.module.css';

interface NewReminderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialData?: {
    id: string;
    title: string;
    date: string;
    time: string;
    frequency: string;
  } | null;
}

const NewReminderModal: React.FC<NewReminderModalProps> = ({ isOpen, onClose, onSuccess, initialData }) => {
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [time, setTime] = useState('09:00');
  const [frequency, setFrequency] = useState('Único');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (initialData) {
      setTitle(initialData.title);
      setDate(initialData.date);
      setTime(initialData.time || '09:00');
      setFrequency(initialData.frequency || 'Único');
    } else {
      setTitle('');
      setDate(new Date().toISOString().split('T')[0]);
      setTime('09:00');
      setFrequency('Único');
    }
  }, [initialData, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado.');

      const payload = {
        title,
        date,
        time,
        frequency,
      };

      if (initialData) {
        const { error } = await supabase
          .from('reminders')
          .update(payload)
          .eq('id', initialData.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('reminders')
          .insert([{ ...payload, user_id: user.id }]);
        if (error) throw error;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Erro ao salvar lembrete');
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
              <h2 className={styles.title}>{initialData ? 'Editar Lembrete' : 'Novo Lembrete'}</h2>
              <button onClick={onClose} className={styles.closeBtn}>
                <X size={24} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <label className={styles.label}>O que você precisa lembrar?</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={styles.input}
                  placeholder="Ex: Pagar fatura, Reunião, Academia..."
                />
              </div>

              <div className={styles.row}>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Data</label>
                  <input
                    type="date"
                    required
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className={styles.input}
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label className={styles.label}>Horário</label>
                  <input
                    type="time"
                    required
                    value={time}
                    onChange={(e) => setTime(e.target.value)}
                    className={styles.input}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.label}>Repetir</label>
                <select
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                  className={styles.select}
                >
                  <option value="Único">Não repetir</option>
                  <option value="Diário">Diário</option>
                  <option value="Semanal">Semanal</option>
                  <option value="Mensal">Mensal</option>
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
                    <span>Salvar Lembrete</span>
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

export default NewReminderModal;
