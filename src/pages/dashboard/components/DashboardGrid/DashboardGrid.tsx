import React, { useState, useEffect } from 'react';
import styles from './DashboardGrid.module.css';
import KpiCard from '../KpiCard/KpiCard';
import ActivityTable from '../ActivityTable/ActivityTable';
import CategoryChart from '../CategoryChart/CategoryChart';
import { TrendingUp, TrendingDown, Wallet, PieChart } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

const DashboardGrid: React.FC = () => {
  const [totals, setTotals] = useState({
    income: 0,
    expense: 0,
    balance: 0,
    savingsRate: 0
  });

  const fetchTotals = async () => {
    try {
      const { data, error } = await supabase
        .from('transactions')
        .select('amount, type');

      if (error) throw error;

      if (data) {
        const income = data
          .filter(t => t.type === 'income')
          .reduce((acc, curr) => acc + curr.amount, 0);
        
        const expense = data
          .filter(t => t.type === 'expense')
          .reduce((acc, curr) => acc + curr.amount, 0);

        const balance = income - expense;
        const savingsRate = income > 0 ? ((income - expense) / income) * 100 : 0;

        setTotals({ income, expense, balance, savingsRate });
      }
    } catch (error) {
      console.error('Erro ao buscar totais do dashboard:', error);
    }
  };

  useEffect(() => {
    fetchTotals();

    const channel = supabase
      .channel('dashboard_totals')
      .on('postgres_changes', { event: '*', table: 'transactions', schema: 'public' }, () => {
        fetchTotals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const kpis = [
    { title: 'Receitas Totais', value: `R$ ${totals.income.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingUp, variant: 'primary' as const },
    { title: 'Despesas Totais', value: `R$ ${totals.expense.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: TrendingDown, variant: 'secondary' as const },
    { title: 'Saldo Atual', value: `R$ ${totals.balance.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`, icon: Wallet, variant: 'tertiary' as const },
    { title: '% de Economia', value: `${totals.savingsRate.toFixed(1)}%`, icon: PieChart, variant: 'primary' as const }
  ];

  return (
    <section className={styles.container}>
      <div className={styles.kpiGrid}>
        {kpis.map((kpi, index) => (
          <KpiCard
            key={index}
            {...kpi}
            colorVariant={kpi.variant}
          />
        ))}
      </div>
      
      <div className={styles.mainGrid}>
        <div className={styles.chartSection}>
          <div className={styles.cardHeader}>
            <h2 className={styles.sectionTitle}>Gastos por Categoria</h2>
            <button className={styles.moreBtn}>Ver Detalhes</button>
          </div>
          <CategoryChart />
        </div>

        <div className={styles.activitySection}>
          <div className={styles.cardHeader}>
            <h2 className={styles.sectionTitle}>Atividades Recentes</h2>
            <button className={styles.moreBtn}>Ver Tudo</button>
          </div>
          <ActivityTable />
        </div>
      </div>
    </section>
  );
};

export default DashboardGrid;
