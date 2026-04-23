import React from 'react';
import styles from './BottomNav.module.css';
import { LayoutDashboard, Receipt, User, Settings, Bell, Wallet, MessageCircle } from 'lucide-react'; // MessageCircle importado

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
    // Removi ou reposicionei 'settings' caso a barra fique com muitos ícones, mas mantive abaixo. 
    // Pode ser que fique espremido na tela mobile com 7 ícones, teste no seu app.
    { id: 'settings', icon: Settings, label: 'Config' },
  ];

  // Função para abrir o WhatsApp
  const handleWhatsAppClick = () => {
    window.open('https://wa.me/554891039242', '_blank');
  };

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

      {/* Botão extra dedicado ao WhatsApp */}
      <button 
        className={styles.item}
        onClick={handleWhatsAppClick}
      >
        <MessageCircle size={24} color="#25D366" /> 
      </button>
    </nav>
  );
};

export default BottomNav;