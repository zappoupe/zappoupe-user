import React, { useState } from 'react';
import styles from './MainContent.module.css';
import DashboardGrid from '../DashboardGrid/DashboardGrid';
import DashboardGridMobile from '../DashboardGrid/DashboardGridMobile';
import TransactionsPage from '../../../finances/components/TransactionsPage/TransactionsPage';
import FinancesPage from '../../../finances/components/FinancesPage/FinancesPage';
import RemindersPage from '../../../reminders/components/RemindersPage/RemindersPage';
import ProfilePage from '../../../profile/components/ProfilePage/ProfilePage';
import SettingsPage from '../../../settings/components/SettingsPage/SettingsPage';
import NewTransactionModal from '../../../finances/components/NewTransactionModal/NewTransactionModal';
import NewFinanceModal from '../../../finances/components/NewFinanceModal/NewFinanceModal';
import NewReminderModal from '../../../reminders/components/NewReminderModal/NewReminderModal';
import { useMediaQuery } from '../../../../hooks/useMediaQuery';
import { Calendar, Plus } from 'lucide-react';
import { supabase } from '../../../../lib/supabase';

interface MainContentProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onLogout: () => void;
}

const MainContent: React.FC<MainContentProps> = ({ activeTab, setActiveTab, onLogout }) => {
  const isMobile = useMediaQuery('(max-width: 768px)');
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [isReminderModalOpen, setIsReminderModalOpen] = useState(false);
  const [userName, setUserName] = useState<string>('');

  React.useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const userEmail = user.email || '';
        
        // 1. Primeiro verifica se é membro da família (por ID ou Email)
        const { data: familyMember } = await supabase
          .from('membros_familia')
          .select('nome')
          .or(`convidado_id.eq.${user.id},email.eq.${userEmail}`)
          .maybeSingle();

        if (familyMember?.nome) {
          setUserName(familyMember.nome);
        } else {
          // 2. Se não for membro, tenta pegar da tabela assinaturas (dono)
          const { data: assinatura } = await supabase
            .from('assinaturas')
            .select('nome')
            .eq('id', user.id)
            .maybeSingle();
          
          if (assinatura?.nome) {
            setUserName(assinatura.nome);
          } else {
            // Fallback para metadata ou email
            setUserName(user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário');
          }
        }
      }
    };
    fetchUser();
  }, []);

  const getFirstName = (fullName: string) => {
    return fullName.split(' ')[0];
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return isMobile ? <DashboardGridMobile /> : <DashboardGrid />;
      case 'transactions':
        return <TransactionsPage />;
      case 'finances':
        return <FinancesPage />;
      case 'reminders':
        return <RemindersPage />;
      case 'profile':
        return <ProfilePage onLogout={onLogout} />;
      case 'settings':
        return <SettingsPage />;
      default:
        return (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            Página em desenvolvimento...
          </div>
        );
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'dashboard': return `Olá, ${getFirstName(userName)}!`;
      case 'transactions': return 'Transações';
      case 'finances': return 'Planejamento Financeiro';
      case 'reminders': return 'Lembretes';
      case 'profile': return 'Meu Perfil';
      case 'settings': return 'Configurações';
      default: return 'ZapPoupe';
    }
  };

  const getPageSubtitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Seu panorama financeiro de hoje.';
      case 'transactions': return 'Confira o histórico detalhado dos seus gastos.';
      case 'finances': return 'Gerencie suas receitas e despesas fixas ou recorrentes.';
      case 'reminders': return 'Organize seus compromissos e não esqueça de nada.';
      case 'profile': return 'Gerencie suas informações e sua assinatura.';
      case 'settings': return 'Configure as metas e o comportamento do seu bot.';
      default: return '';
    }
  };

  const handleAddClick = () => {
    if (activeTab === 'finances') {
      setIsFinanceModalOpen(true);
    } else if (activeTab === 'reminders') {
      setIsReminderModalOpen(true);
    } else {
      setIsTransactionModalOpen(true);
    }
  };

  const getButtonLabel = () => {
    if (activeTab === 'finances') return 'Adicionar finança';
    if (activeTab === 'reminders') return 'Novo Lembrete';
    return 'Nova Transação';
  };

  return (
    <main className={`${styles.main} ${isMobile ? styles.mobile : ''}`}>
      <header className={styles.header}>
        <div className={styles.titleGroup}>
          <h1 className={styles.title}>{getPageTitle()}</h1>
          <p className={styles.subtitle}>{getPageSubtitle()}</p>
        </div>

        {activeTab !== 'profile' && activeTab !== 'settings' && (
          <div className={styles.controls}>
            {!isMobile && activeTab !== 'reminders' && (
              <div className={styles.periodSelector}>
                <Calendar size={18} />
                <select className={styles.select}>
                  <option>Este Mês</option>
                  <option>Mês Passado</option>
                </select>
              </div>
            )}
            <button className={styles.primaryBtn} onClick={handleAddClick}>
              <Plus size={18} />
              {!isMobile && (
                <span>{getButtonLabel()}</span>
              )}
            </button>
          </div>
        )}
      </header>

      {renderContent()}

      <NewTransactionModal 
        isOpen={isTransactionModalOpen} 
        onClose={() => setIsTransactionModalOpen(false)} 
        onSuccess={() => {}}
      />

      <NewFinanceModal 
        isOpen={isFinanceModalOpen} 
        onClose={() => setIsFinanceModalOpen(false)} 
        onSuccess={() => {}}
      />

      <NewReminderModal 
        isOpen={isReminderModalOpen}
        onClose={() => setIsReminderModalOpen(false)}
        onSuccess={() => {}}
      />
    </main>
  );
};

export default MainContent;
