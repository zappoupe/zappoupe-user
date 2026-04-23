import React from 'react';
import styles from './Sidebar.module.css';
import { LayoutDashboard, Receipt, User, Settings, LogOut, MessageCircle, Bell, Wallet } from 'lucide-react';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';

interface SidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeTab, setActiveTab, onLogout }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const menuItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'transactions', icon: Receipt, label: 'Transações' },
    { id: 'finances', icon: Wallet, label: 'Finanças' },
    { id: 'reminders', icon: Bell, label: 'Lembretes' },
    { id: 'profile', icon: User, label: 'Perfil' },
    { id: 'settings', icon: Settings, label: 'Configurações' },
  ];

  if (isMobile) return null;

  return (
    <aside className={styles.sidebar}>
      <div className={styles.logo}>
        <div className={styles.logoIcon}>
          <MessageCircle size={24} color="#fff" />
        </div>
        <h1 className={styles.logoText}>ZapPoupe</h1>
      </div>

      <nav className={styles.nav}>
        {menuItems.map((item) => (
          <button 
            key={item.id} 
            className={`${styles.navItem} ${activeTab === item.id ? styles.active : ''}`}
            onClick={() => setActiveTab(item.id)}
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>

      <div className={styles.footer}>
        <button className={styles.logoutBtn} onClick={onLogout}>
          <LogOut size={20} />
          <span>Sair</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
