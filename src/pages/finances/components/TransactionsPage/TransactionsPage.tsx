import React, { useState, useEffect, useRef } from 'react';
import styles from './TransactionsPage.module.css';
import { Search, Filter, ArrowUpCircle, ArrowDownCircle, MoreVertical, Calendar, Plus, Edit2, Trash2 } from 'lucide-react';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { supabase } from '../../../../lib/supabase';
import NewTransactionModal from '../NewTransactionModal/NewTransactionModal';

interface Transaction {
  id: string;
  date: string;
  rawDate: string;
  description: string;
  category: string;
  amount: number;
  type: 'income' | 'expense';
}

const TransactionsPage: React.FC = () => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [searchTerm, setSearchTerm] = useState('');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [activeMenu, setActiveMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const fetchTransactions = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const { data, error } = await supabase
        .from('transactions')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      if (data) {
        setTransactions(data.map((t: any) => ({
          id: t.id,
          date: new Date(t.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
          rawDate: t.date,
          description: t.description,
          category: t.category,
          amount: t.amount,
          type: t.type
        })));
      }
    } catch (error) {
      console.error('Erro ao buscar transações:', error);
    } finally {
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();

    // Real-time subscription
    const channel = supabase
      .channel('transactions_changes')
      .on('postgres_changes', { event: '*', table: 'transactions', schema: 'public' }, () => {
        fetchTransactions(true); // Silent update for real-time
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setActiveMenu(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleDelete = async (id: string) => {
    // Removendo window.confirm pois é bloqueado em iframes
    try {
      // Fecha o menu imediatamente
      setActiveMenu(null);

      const { error } = await supabase
        .from('transactions')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Erro Supabase:', error);
        throw error;
      }
      
      // A atualização da lista acontece via Realtime
    } catch (error: any) {
      console.error('Erro detalhado ao deletar:', error);
    }
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setIsModalOpen(true);
    setActiveMenu(null);
  };

  const filteredTransactions = transactions.filter(t => 
    t.description.toLowerCase().includes(searchTerm.toLowerCase()) || 
    t.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <header className={styles.header}>
        <div className={styles.searchWrapper}>
          <Search size={18} className={styles.searchIcon} />
          <input 
            type="text" 
            placeholder="Buscar transações..." 
            className={styles.searchInput}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className={styles.headerActions}>
          <button className={styles.filterBtn}>
            <Filter size={18} />
            {!isMobile && <span>Filtros</span>}
          </button>
        </div>
      </header>

      <div className={styles.listCard}>
        <div className={styles.listHeader}>
          <h2 className={styles.listTitle}>Histórico Detalhado</h2>
          <div className={styles.headerRight}>
            <div className={styles.dateRange}>
              <Calendar size={16} />
              <span>Março 2026</span>
            </div>
          </div>
        </div>

        <div className={styles.list}>
          {isLoading ? (
            <div className={styles.loading}>Carregando transações...</div>
          ) : filteredTransactions.length === 0 ? (
            <div className={styles.empty}>Nenhuma transação encontrada.</div>
          ) : (
            filteredTransactions.map((t) => (
              <div key={t.id} className={styles.item}>
                <div className={styles.itemLeft}>
                  <div className={`${styles.iconWrapper} ${t.type === 'income' ? styles.incomeIcon : styles.expenseIcon}`}>
                    {t.type === 'income' ? <ArrowUpCircle size={20} /> : <ArrowDownCircle size={20} />}
                  </div>
                  <div className={styles.itemInfo}>
                    <span className={styles.itemDesc}>{t.description}</span>
                    <div className={styles.itemMeta}>
                      <span className={styles.itemCat}>{t.category}</span>
                      <span className={styles.dot}>•</span>
                      <span className={styles.itemDate}>{t.date}</span>
                    </div>
                  </div>
                </div>
                <div className={styles.itemRight}>
                  <span className={`${styles.itemVal} ${t.type === 'income' ? styles.income : styles.expense}`}>
                    {t.type === 'income' ? '+' : '-'} R$ {Math.abs(t.amount).toFixed(2).replace('.', ',')}
                  </span>
                  <div className={styles.menuContainer}>
                    <button 
                      className={styles.moreBtn}
                      onClick={() => setActiveMenu(activeMenu === t.id ? null : t.id)}
                    >
                      <MoreVertical size={18} />
                    </button>
                    {activeMenu === t.id && (
                      <div className={styles.dropdown} ref={menuRef}>
                        <button onClick={() => handleEdit(t)} className={styles.dropdownItem}>
                          <Edit2 size={14} />
                          <span>Editar</span>
                        </button>
                        <button onClick={() => handleDelete(t.id)} className={`${styles.dropdownItem} ${styles.delete}`}>
                          <Trash2 size={14} />
                          <span>Excluir</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <NewTransactionModal 
        isOpen={isModalOpen} 
        onClose={() => {
          setIsModalOpen(false);
          setEditingTransaction(null);
        }} 
        onSuccess={() => fetchTransactions(true)}
        initialData={editingTransaction}
      />
    </div>
  );
};

export default TransactionsPage;
