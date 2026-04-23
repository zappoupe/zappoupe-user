import React, { useState, useEffect } from 'react';
import styles from './ActivityTable.module.css';
import { supabase } from '../../../../lib/supabase';

interface ActivityTableProps {
  compact?: boolean;
}

interface Transaction {
  id: string;
  date: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
}

const ActivityTable: React.FC<ActivityTableProps> = ({ compact = false }) => {
  const [activities, setActivities] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchRecentTransactions = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false })
        .limit(5);

      if (error) throw error;
      if (data) setActivities(data);
    } catch (error) {
      console.error('Erro ao buscar atividades recentes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchRecentTransactions();

    const channel = supabase
      .channel('dashboard_activity')
      .on('postgres_changes', { event: '*', table: 'transactions', schema: 'public' }, () => {
        fetchRecentTransactions();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) return <div className={styles.loading}>Carregando...</div>;

  return (
    <div className={`${styles.wrapper} ${compact ? styles.compactWrapper : ''}`}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th>Data</th>
            {!compact && <th>Descrição</th>}
            {!compact && <th>Categoria</th>}
            <th className={styles.alignRight}>Valor</th>
          </tr>
        </thead>
        <tbody>
          {activities.map((item) => (
            <tr key={item.id}>
              <td>{new Date(item.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}</td>
              {!compact && <td>{item.description}</td>}
              {!compact && <td>{item.category}</td>}
              <td className={`${item.type === 'income' ? styles.positive : styles.negative} ${styles.alignRight}`}>
                {item.type === 'income' ? '+' : '-'} R$ {Math.abs(item.amount).toFixed(2).replace('.', ',')}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ActivityTable;
