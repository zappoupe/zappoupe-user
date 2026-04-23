import React from 'react';
import styles from './KpiCard.module.css';
import { LucideIcon } from 'lucide-react';

interface KpiCardProps {
  title: string;
  value: string;
  percentage?: string;
  icon: LucideIcon;
  trend?: 'up' | 'down' | 'neutral';
  colorVariant?: 'primary' | 'secondary' | 'tertiary';
  compact?: boolean;
}

const KpiCard: React.FC<KpiCardProps> = ({ 
  title, 
  value, 
  percentage, 
  icon: Icon, 
  trend,
  colorVariant = 'primary',
  compact = false
}) => {
  const isPositive = trend === 'up';
  
  if (compact) {
    return (
      <div className={`${styles.card} ${styles[colorVariant]} ${styles.compact}`}>
        <div className={styles.compactHeader}>
          <div className={styles.iconContainerCompact}>
            <Icon size={18} strokeWidth={2.5} />
          </div>
          <span className={styles.titleCompact}>{title}</span>
        </div>
        <div className={styles.compactContent}>
          <h3 className={styles.valueCompact}>{value}</h3>
          {percentage && (
            <span className={`${styles.badgeCompact} ${isPositive ? styles.up : styles.down}`}>
              {isPositive ? '↑' : '↓'} {percentage}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${styles[colorVariant]}`}>
      <div className={styles.glow} />
      <div className={styles.header}>
        <div className={styles.info}>
          <span className={styles.title}>{title}</span>
          <h3 className={styles.value}>{value}</h3>
        </div>
        <div className={styles.iconContainer}>
          <Icon size={24} strokeWidth={2.5} />
        </div>
      </div>
      {percentage && (
        <div className={styles.footer}>
          <span className={`${styles.badge} ${isPositive ? styles.up : styles.down}`}>
            {isPositive ? '↑' : '↓'} {percentage}
          </span>
          <span className={styles.period}>vs. mês anterior</span>
        </div>
      )}
    </div>
  );
};

export default KpiCard;
