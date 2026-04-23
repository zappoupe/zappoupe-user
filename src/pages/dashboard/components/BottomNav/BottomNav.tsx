import React from 'react';
import styles from './BottomNav.module.css';
import { LayoutDashboard, Receipt, User, Settings, Bell, Wallet } from 'lucide-react';

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const BottomNav: React.FC<BottomNavProps> = ({ activeTab, setActiveTab }) => {
  const items = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Início' },
    { id: 'transactions', icon: Receipt, label: 'Extrato' },
    { id: 'finances', icon: Wallet, label: 'Finanças' },
    { id: 'reminders', icon: Bell, label: 'Lembretes' },
    { id: 'profile', icon: User, label: 'Perfil' },
    { id: 'settings', icon: Settings, label: 'Config' },
  ];

  return (
    <nav className={styles.nav}>
      {items.map((item) => (
        <button 
          key={item.id} 
          className={`${styles.item} ${activeTab === item.id ? styles.active : ''}`}
          onClick={() => setActiveTab(item.id)}
        >
          <item.icon size={24} />
        </button>
      ))}
    </nav>
  );
};

export default BottomNav;
