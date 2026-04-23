import React, { useState, useEffect } from 'react';
import styles from './DashboardGridMobile.module.css';
import KpiCard from '../KpiCard/KpiCard';
import ActivityTable from '../ActivityTable/ActivityTable';
import CategoryChart from '../CategoryChart/CategoryChart';
import { TrendingUp, TrendingDown, Wallet, PieChart } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

const DashboardGridMobile: React.FC = () => {
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
      console.error('Erro ao buscar totais do dashboard mobile:', error);
    }
  };

  useEffect(() => {
    fetchTotals();

    const channel = supabase
      .channel('dashboard_mobile_totals')
      .on('postgres_changes', { event: '*', table: 'transactions', schema: 'public' }, () => {
        fetchTotals();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const formatValue = (val: number) => {
    if (val >= 1000) return `R$ ${(val / 1000).toFixed(1)}k`;
    return `R$ ${val.toFixed(0)}`;
  };

  const kpis = [
    { title: 'Receitas', value: formatValue(totals.income), icon: TrendingUp, variant: 'primary' as const },
    { title: 'Despesas', value: formatValue(totals.expense), icon: TrendingDown, variant: 'secondary' as const },
    { title: 'Saldo', value: formatValue(totals.balance), icon: Wallet, variant: 'tertiary' as const },
    { title: 'Economia', value: `${totals.savingsRate.toFixed(1)}%`, icon: PieChart, variant: 'primary' as const }
  ];

  return (
    <section className={styles.container}>
      <div className={styles.kpiGrid}>
        {kpis.map((kpi, i) => (
          <KpiCard key={i} {...kpi} colorVariant={kpi.variant} compact />
        ))}
      </div>
      
      <div className={styles.section}>
        <div className={styles.card}>
          <h2 className={styles.title}>Gastos por Categoria</h2>
          <CategoryChart />
        </div>
      </div>

      <div className={styles.section}>
        <div className={styles.card}>
          <h2 className={styles.title}>Atividades</h2>
          <ActivityTable compact />
        </div>
      </div>
    </section>
  );
};

export default DashboardGridMobile;
