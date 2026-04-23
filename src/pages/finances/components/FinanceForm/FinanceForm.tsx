import React from 'react';
import styles from './FinanceForm.module.css';
import FrequencySelector from '../FrequencySelector/FrequencySelector';
import DaySelector from '../DaySelector/DaySelector';

interface FinanceFormProps {
  formData: {
    title: string;
    value: string;
    type: 'income' | 'expense';
    frequency: 'mensal' | 'semanal' | 'unico';
    day: number;
  };
  setFormData: (data: any) => void;
  onSubmit: (e: React.FormEvent) => void;
  submitLabel: string;
}

const FinanceForm: React.FC<FinanceFormProps> = ({ formData, setFormData, onSubmit, submitLabel }) => {
  return (
    <form onSubmit={onSubmit} className={styles.form}>
      <div className={styles.inputGroup}>
        <label className={styles.label}>O que é esse registro?</label>
        <input 
          type="text" 
          required 
          placeholder="Ex: Aluguel, Salário, Freelance..."
          className={styles.input}
          value={formData.title}
          onChange={e => setFormData({...formData, title: e.target.value})}
        />
      </div>
      
      <div className={styles.inputGroup}>
        <label className={styles.label}>Valor (R$)</label>
        <div className={styles.inputWrapper}>
          <span className={styles.currency}>R$</span>
          <input 
            type="number" 
            step="0.01"
            required
            placeholder="0,00"
            className={`${styles.input} ${styles.inputWithCurrency}`}
            value={formData.value}
            onChange={e => setFormData({...formData, value: e.target.value})}
          />
        </div>
      </div>

      <FrequencySelector 
        value={formData.frequency} 
        onChange={(val) => setFormData({...formData, frequency: val})} 
      />

      <DaySelector 
        selectedDay={formData.day}
        frequency={formData.frequency}
        onChange={(day) => setFormData({...formData, day})}
      />

      <button type="submit" className={styles.submitBtn}>
        {submitLabel}
      </button>
    </form>
  );
};

export default FinanceForm;
