import React, { useState, useEffect } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';
import { supabase } from '../../../../lib/supabase';
import styles from './CategoryChart.module.css';
import { Loader2 } from 'lucide-react';

interface CategoryData {
  name: string;
  value: number;
  color: string;
}

const COLORS = [
  '#4a5d4a', // Primary
  '#7a8d7a', // Secondary
  '#a3b1a3', // Tertiary
  '#cbd5cb', // Quaternary
  '#e2e8f0', // Others
];

const CategoryChart: React.FC = () => {
  const [data, setData] = useState<CategoryData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalExpenses, setTotalExpenses] = useState(0);

  const fetchCategoryData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Busca todas as despesas do mês atual
      const now = new Date();
      const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

      const { data: transactions, error } = await supabase
        .from('transactions')
        .select('category, amount')
        .eq('user_id', user.id)
        .eq('type', 'expense')
        .gte('date', firstDayOfMonth);

      if (error) throw error;

      if (transactions) {
        const categories: { [key: string]: number } = {};
        let total = 0;

        transactions.forEach(t => {
          const cat = t.category || 'Outros';
          categories[cat] = (categories[cat] || 0) + Math.abs(t.amount);
          total += Math.abs(t.amount);
        });

        const chartData = Object.entries(categories)
          .map(([name, value], index) => ({
            name,
            value,
            color: COLORS[index % COLORS.length]
          }))
          .sort((a, b) => b.value - a.value);

        setData(chartData);
        setTotalExpenses(total);
      }
    } catch (error) {
      console.error('Erro ao buscar dados por categoria:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCategoryData();

    const channel = supabase
      .channel('category_chart_changes')
      .on('postgres_changes', { event: '*', table: 'transactions', schema: 'public' }, () => {
        fetchCategoryData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} size={24} />
      </div>
    );
  }

  if (data.length === 0) {
    return (
      <div className={styles.noData}>
        <p>Nenhuma despesa registrada este mês.</p>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.chartWrapper}>
        <ResponsiveContainer width="100%" height={200}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              paddingAngle={5}
              dataKey="value"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip 
              formatter={(value: number) => `R$ ${value.toFixed(2)}`}
              contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }}
            />
          </PieChart>
        </ResponsiveContainer>
        <div className={styles.centerLabel}>
          <span className={styles.totalValue}>R$ {totalExpenses.toFixed(0)}</span>
          <span className={styles.totalLabel}>Total</span>
        </div>
      </div>
      
      <div className={styles.legend}>
        {data.slice(0, 3).map((item, index) => (
          <div key={index} className={styles.legendItem}>
            <span className={styles.dot} style={{ backgroundColor: item.color }}></span>
            <span className={styles.categoryName}>{item.name}</span>
            <span className={styles.categoryPercent}>
              {((item.value / totalExpenses) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryChart;
