import React, { useState, useEffect } from 'react';
import styles from './RemindersPage.module.css';
import { Bell, Calendar as CalendarIcon, Clock, Trash2, Edit2, Check, RefreshCw } from 'lucide-react';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { supabase } from '../../../../lib/supabase';
import NewReminderModal from '../NewReminderModal/NewReminderModal';

interface Reminder {
  id: string;
  title: string;
  date: string;
  time: string;
  completed: boolean;
  frequency: string;
}

const RemindersPage: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<Reminder | null>(null);

  const fetchReminders = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const { data, error } = await supabase
        .from('reminders')
        .select('*')
        .order('date', { ascending: true })
        .order('time', { ascending: true });

      if (error) throw error;

      if (data) {
        setReminders(data.map((r: any) => ({
          id: r.id,
          title: r.title,
          date: r.date,
          time: r.time,
          completed: r.completed,
          frequency: r.frequency
        })));
      }
    } catch (error) {
      console.error('Erro ao buscar lembretes:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();

    // Subscribe to real-time changes
    const channel = supabase
      .channel('reminders_realtime')
      .on(
        'postgres_changes',
        {
          event: '*',
          table: 'reminders',
          schema: 'public'
        },
        (payload) => {
          console.log('Real-time change received:', payload);
          fetchReminders(true);
        }
      )
      .subscribe((status) => {
        console.log('Real-time subscription status:', status);
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string) => {
    // Optimistic update
    const previousReminders = [...reminders];
    setReminders(prev => prev.filter(r => r.id !== id));

    try {
      const { error } = await supabase
        .from('reminders')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao deletar lembrete:', error);
      // Rollback on error
      setReminders(previousReminders);
    }
  };

  const toggleComplete = async (reminder: Reminder) => {
    // Optimistic update
    const previousReminders = [...reminders];
    setReminders(prev => prev.map(r => 
      r.id === reminder.id ? { ...r, completed: !r.completed } : r
    ));

    try {
      const { error } = await supabase
        .from('reminders')
        .update({ completed: !reminder.completed })
        .eq('id', reminder.id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao atualizar lembrete:', error);
      // Rollback on error
      setReminders(previousReminders);
    }
  };

  const handleEdit = (reminder: Reminder) => {
    setEditingReminder(reminder);
    setIsModalOpen(true);
  };

  const pendingCount = reminders.filter(r => !r.completed).length;
  const completedCount = reminders.filter(r => r.completed).length;

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.stats}>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{pendingCount}</span>
            <span className={styles.statLabel}>Pendentes</span>
          </div>
          <div className={styles.statItem}>
            <span className={styles.statValue}>{completedCount}</span>
            <span className={styles.statLabel}>Concluídos</span>
          </div>
        </div>
        {/* Botão removido daqui conforme solicitado */}
      </header>

      <div className={styles.agenda}>
        <h2 className={styles.sectionTitle}>Sua Agenda</h2>
        <div className={styles.list}>
          {isLoading ? (
            <div className={styles.loading}>Carregando lembretes...</div>
          ) : reminders.length === 0 ? (
            <div className={styles.emptyState}>
              <Bell size={48} className={styles.emptyIcon} />
              <p>Nenhum lembrete configurado.</p>
            </div>
          ) : (
            reminders.map(reminder => (
              <div key={reminder.id} className={`${styles.card} ${reminder.completed ? styles.completed : ''}`}>
                <div className={styles.cardMain}>
                  <button 
                    className={`${styles.checkBtn} ${reminder.completed ? styles.checked : ''}`}
                    onClick={() => toggleComplete(reminder)}
                  >
                    {reminder.completed && <Check size={14} />}
                  </button>
                  <div className={styles.info}>
                    <h3 className={styles.title}>{reminder.title}</h3>
                    <div className={styles.meta}>
                      <div className={styles.metaItem}>
                        <CalendarIcon size={14} />
                        <span>{new Date(reminder.date).toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className={styles.metaItem}>
                        <Clock size={14} />
                        <span>{reminder.time?.substring(0, 5)}</span>
                      </div>
                      {reminder.frequency !== 'Único' && (
                        <div className={styles.metaItem}>
                          <RefreshCw size={12} />
                          <span>{reminder.frequency}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className={styles.actions}>
                  <button className={styles.actionBtn} onClick={() => handleEdit(reminder)}>
                    <Edit2 size={16} />
                  </button>
                  <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(reminder.id)}>
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <NewReminderModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingReminder(null);
        }} 
        onSuccess={() => fetchReminders(true)}
        initialData={editingReminder}
      />
    </div>
  );
};

export default RemindersPage;
