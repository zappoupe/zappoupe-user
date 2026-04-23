import React from 'react';
import styles from './DaySelector.module.css';
import { motion } from 'motion/react';

interface DaySelectorProps {
  selectedDay: number;
  frequency: 'mensal' | 'semanal' | 'unico';
  onChange: (day: number) => void;
}

const DaySelector: React.FC<DaySelectorProps> = ({ selectedDay, frequency, onChange }) => {
  const days = Array.from({ length: 31 }, (_, i) => i + 1);

  const isRecurringDay = (day: number) => {
    if (frequency !== 'semanal') return false;
    if (day === selectedDay) return false;
    
    // Check if it's a multiple of 7 days away from selectedDay
    const diff = Math.abs(day - selectedDay);
    return diff % 7 === 0;
  };

  return (
    <div className={styles.container}>
      <label className={styles.label}>Selecione o dia do mês</label>
      <div className={styles.grid}>
        {days.map((day) => {
          const isSelected = day === selectedDay;
          const isRecurring = isRecurringDay(day);
          
          return (
            <motion.button
              key={day}
              type="button"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className={`
                ${styles.dayBtn} 
                ${isSelected ? styles.selected : ''} 
                ${isRecurring ? styles.recurring : ''}
              `}
              onClick={() => onChange(day)}
            >
              {day}
            </motion.button>
          );
        })}
      </div>
      {frequency === 'semanal' && (
        <p className={styles.hint}>
          * Marcado para repetir a cada 7 dias a partir do dia {selectedDay}.
        </p>
      )}
    </div>
  );
};

export default DaySelector;
