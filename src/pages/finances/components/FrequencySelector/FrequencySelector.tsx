import React from 'react';
import styles from './FrequencySelector.module.css';
import { Repeat, Calendar, Clock } from 'lucide-react';

type Frequency = 'mensal' | 'semanal' | 'unico';

interface FrequencySelectorProps {
  value: Frequency;
  onChange: (value: Frequency) => void;
}

const options: { id: Frequency; label: string; icon: any }[] = [
  { id: 'mensal', label: 'Mensal', icon: Calendar },
  { id: 'semanal', label: 'Semanal', icon: Repeat },
  { id: 'unico', label: 'Único', icon: Clock },
];

const FrequencySelector: React.FC<FrequencySelectorProps> = ({ value, onChange }) => {
  return (
    <div className={styles.container}>
      <label className={styles.label}>Frequência</label>
      <div className={styles.grid}>
        {options.map((option) => {
          const Icon = option.icon;
          const isActive = value === option.id;
          
          return (
            <button
              key={option.id}
              type="button"
              className={`${styles.option} ${isActive ? styles.active : ''}`}
              onClick={() => onChange(option.id)}
            >
              <div className={styles.iconWrapper}>
                <Icon size={18} />
              </div>
              <span className={styles.optionLabel}>{option.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default FrequencySelector;
