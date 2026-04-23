import React, { useState, useEffect } from 'react';
import styles from './FinancesPage.module.css';
import { TrendingUp, TrendingDown, Calendar, Repeat, Trash2, Edit2, DollarSign } from 'lucide-react';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { supabase } from '../../../../lib/supabase';
import NewFinanceModal from '../NewFinanceModal/NewFinanceModal';

interface FinanceEntry {
  id: string;
  description: string;
  amount: number;
  type: 'income' | 'expense';
  frequency: string;
  due_day: number;
}

const FinancesPage: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [activeType, setActiveType] = useState<'income' | 'expense'>('income');
  const [entries, setEntries] = useState<FinanceEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<FinanceEntry | null>(null);

  const fetchFinances = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const { data, error } = await supabase
        .from('recurring_finances')
        .select('*')
        .order('due_day', { ascending: true });

      if (error) throw error;

      if (data) {
        setEntries(data.map((f: any) => ({
          id: f.id,
          description: f.description,
          amount: f.amount,
          type: f.type,
          frequency: f.frequency,
          due_day: f.due_day
        })));
      }
    } catch (error) {
      console.error('Erro ao buscar finanças:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchFinances();

    const channel = supabase
      .channel('recurring_finances_changes')
      .on('postgres_changes', { event: '*', table: 'recurring_finances', schema: 'public' }, () => {
        fetchFinances(true);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('recurring_finances')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Erro ao deletar finança:', error);
    }
  };

  const handleEdit = (entry: FinanceEntry) => {
    setEditingEntry(entry);
    setIsModalOpen(true);
  };

  const filteredEntries = entries.filter(e => e.type === activeType);
  const totalValue = filteredEntries.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.typeSelector}>
          <button 
            className={`${styles.typeBtn} ${activeType === 'income' ? styles.activeIncome : ''}`}
            onClick={() => setActiveType('income')}
          >
            <TrendingUp size={18} />
            <span>Receitas</span>
          </button>
          <button 
            className={`${styles.typeBtn} ${activeType === 'expense' ? styles.activeExpense : ''}`}
            onClick={() => setActiveType('expense')}
          >
            <TrendingDown size={18} />
            <span>Despesas</span>
          </button>
        </div>
        
        <div className={styles.summary}>
          <span className={styles.summaryLabel}>Total {activeType === 'income' ? 'Receitas' : 'Despesas'}</span>
          <span className={`${styles.summaryValue} ${activeType === 'income' ? styles.incomeText : styles.expenseText}`}>
            R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
          </span>
        </div>
      </header>

      <div className={styles.content}>
        <div className={styles.listHeader}>
          <h2 className={styles.title}>Programação Financeira</h2>
          {/* Botão removido daqui conforme solicitado */}
        </div>

        <div className={styles.list}>
          {isLoading ? (
            <div className={styles.loading}>Carregando programação...</div>
          ) : filteredEntries.length === 0 ? (
            <div className={styles.emptyState}>
              <DollarSign size={48} className={styles.emptyIcon} />
              <p>Nenhuma {activeType === 'income' ? 'receita' : 'despesa'} programada.</p>
            </div>
          ) : (
            filteredEntries.map(entry => (
              <div key={entry.id} className={styles.card}>
                <div className={styles.cardInfo}>
                  <div className={`${styles.iconBox} ${entry.type === 'income' ? styles.incomeBg : styles.expenseBg}`}>
                    {entry.type === 'income' ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                  </div>
                  <div className={styles.details}>
                    <h3 className={styles.entryTitle}>{entry.description}</h3>
                    <div className={styles.meta}>
                      <span className={styles.frequencyTag}>
                        <Repeat size={12} />
                        {entry.frequency}
                      </span>
                      <span className={styles.dayTag}>
                        <Calendar size={12} />
                        Dia {entry.due_day}
                      </span>
                    </div>
                  </div>
                </div>
                <div className={styles.cardRight}>
                  <span className={`${styles.value} ${entry.type === 'income' ? styles.incomeText : styles.expenseText}`}>
                    R$ {entry.amount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                  </span>
                  <div className={styles.actions}>
                    <button className={styles.actionBtn} onClick={() => handleEdit(entry)}>
                      <Edit2 size={16} />
                    </button>
                    <button className={`${styles.actionBtn} ${styles.deleteBtn}`} onClick={() => handleDelete(entry.id)}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <NewFinanceModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingEntry(null);
        }} 
        onSuccess={() => fetchFinances(true)}
        initialData={editingEntry}
      />
    </div>
  );
};

export default FinancesPage;
