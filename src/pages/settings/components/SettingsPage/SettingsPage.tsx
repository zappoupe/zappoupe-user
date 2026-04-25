import React, { useState, useEffect } from 'react';
import styles from './SettingsPage.module.css';
import { 
  Target, 
  Bot, 
  TrendingUp, 
  PiggyBank, 
  Save, 
  Zap, 
  Brain, 
  Coins,
  Wallet,
  Loader2,
  CheckCircle2,
  Plus
} from 'lucide-react';
import { supabase } from '../../../../lib/supabase';
import GoalModal from '../GoalModal/GoalModal';

interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentAmount: number;
  deadline?: string;
}

const SettingsPage: React.FC = () => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'success' | 'error'>('idle');

  // Estados das configurações
  const [botTone, setBotTone] = useState('friendly');
  const [botProactivity, setBotProactivity] = useState('medium');
  const [surplusStrategy, setSurplusStrategy] = useState(true);
  const [autoSaving, setAutoSaving] = useState(false);
  const [personalizedTips, setPersonalizedTips] = useState(true);
  const [incomeRange, setIncomeRange] = useState('1001-5000');
  const [customIncome, setCustomIncome] = useState('');
  const [metas, setMetas] = useState<Goal[]>([]);

  // Modal de Meta
  const [isGoalModalOpen, setIsGoalModalOpen] = useState(false);
  const [selectedGoal, setSelectedGoal] = useState<Goal | null>(null);

  const [isFamilyMember, setIsFamilyMember] = useState(false);
  const [memberRecordId, setMemberRecordId] = useState<string | null>(null);
  const [isAdminUser, setIsAdminUser] = useState(false);
  const [adminUserRecordId, setAdminUserRecordId] = useState<string | null>(null);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 1. Primeiro verifica se é um membro da família convidado
      const { data: familyMember, error: familyError } = await supabase
        .from('membros_familia')
        .select('*')
        .or(`convidado_id.eq.${user.id},email.eq.${user.email}`)
        .maybeSingle();

      if (familyError) {
        console.error('Erro ao buscar membro da família:', familyError);
      }

      if (familyMember) {
        setIsFamilyMember(true);
        setMemberRecordId(familyMember.id);
        
        // Carrega as configurações do registro do membro
        setBotTone(familyMember.personalidade_bot || 'friendly');
        setBotProactivity(familyMember.proatividade_bot || 'medium');
        setSurplusStrategy(familyMember.sugestoes_excedente ?? true);
        setAutoSaving(familyMember.economia_automatica ?? false);
        setPersonalizedTips(familyMember.dicas_economia ?? true);
        setIncomeRange(familyMember.faixa_renda || '0-1000');
        setCustomIncome(familyMember.renda_mensal?.toString() || '');
        setMetas(familyMember.metas || []);

        // Se o convidado_id ainda for nulo, vincula agora para facilitar buscas futuras
        if (!familyMember.convidado_id) {
          await supabase
            .from('membros_familia')
            .update({ convidado_id: user.id })
            .eq('id', familyMember.id);
        }
      } else {
        // 2. Verifica se é usuário admin (por email)
        const { data: adminUser } = await supabase
          .from('admin_users')
          .select('*')
          .eq('email', user.email)
          .maybeSingle();

        if (adminUser) {
          setIsAdminUser(true);
          setAdminUserRecordId(adminUser.id);
          setBotTone(adminUser.personalidade_bot || 'friendly');
          setBotProactivity(adminUser.proatividade_bot || 'medium');
          setSurplusStrategy(adminUser.sugestoes_excedente ?? true);
          setAutoSaving(adminUser.economia_automatica ?? false);
          setPersonalizedTips(adminUser.dicas_economia ?? true);
          setIncomeRange(adminUser.faixa_renda || '1001-5000');
          setCustomIncome(adminUser.renda_mensal?.toString() || '');
          setMetas(adminUser.metas || []);
        } else {
          // 3. Se não for membro nem admin, busca na tabela configuracoes_usuario (dono)
          const { data, error } = await supabase
            .from('configuracoes_usuario')
            .select('*')
            .eq('id', user.id)
            .maybeSingle();

          if (error) throw error;

          if (data) {
            setBotTone(data.personalidade_bot || 'friendly');
            setBotProactivity(data.proatividade_bot || 'medium');
            setSurplusStrategy(data.sugestoes_excedente ?? true);
            setAutoSaving(data.economia_automatica ?? false);
            setPersonalizedTips(data.dicas_economia ?? true);
            setIncomeRange(data.faixa_renda || '1001-5000');
            setCustomIncome(data.renda_mensal?.toString() || '');
            setMetas(data.metas || []);
          } else {
            await supabase.from('configuracoes_usuario').insert([{
              id: user.id,
              personalidade_bot: 'friendly',
              proatividade_bot: 'medium',
              faixa_renda: '1001-5000'
            }]);
          }
        }
      }
    } catch (err) {
      console.error('Erro ao carregar configurações:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async (updatedMetas?: Goal[]) => {
    setIsSaving(true);
    setSaveStatus('idle');
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Usuário não autenticado');

      const updateData = {
        renda_mensal: parseFloat(customIncome) || 0,
        faixa_renda: incomeRange,
        personalidade_bot: botTone,
        proatividade_bot: botProactivity,
        dicas_economia: personalizedTips,
        sugestoes_excedente: surplusStrategy,
        economia_automatica: autoSaving,
        metas: updatedMetas !== undefined ? updatedMetas : metas,
        atualizado_em: new Date().toISOString()
      };

      if (isFamilyMember && memberRecordId) {
        // Salva na tabela membros_familia
        const { error } = await supabase
          .from('membros_familia')
          .update(updateData)
          .eq('id', memberRecordId);

        if (error) {
          console.error('Erro ao salvar em membros_familia:', error);
          throw error;
        }
      } else if (isAdminUser && adminUserRecordId) {
        // Salva na tabela admin_users
        const { error } = await supabase
          .from('admin_users')
          .update(updateData)
          .eq('id', adminUserRecordId);

        if (error) {
          console.error('Erro ao salvar em admin_users:', error);
          throw error;
        }
      } else {
        // Salva na tabela configuracoes_usuario (dono)
        const { error } = await supabase
          .from('configuracoes_usuario')
          .upsert({
            id: user.id,
            ...updateData
          });

        if (error) {
          console.error('Erro ao salvar em configuracoes_usuario:', error);
          throw error;
        }
      }

      setSaveStatus('success');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (err) {
      console.error('Erro ao salvar configurações:', err);
      setSaveStatus('error');
    } finally {
      setIsSaving(false);
    }
  };

  const handleGoalSave = (goal: Goal | null) => {
    let newMetas: Goal[];
    if (goal === null) {
      // Deletar meta
      newMetas = metas.filter(m => m.id !== selectedGoal?.id);
    } else {
      const exists = metas.find(m => m.id === goal.id);
      if (exists) {
        newMetas = metas.map(m => m.id === goal.id ? goal : m);
      } else {
        newMetas = [...metas, goal];
      }
    }
    setMetas(newMetas);
    handleSave(newMetas);
  };

  const openGoalModal = (goal: Goal | null) => {
    setSelectedGoal(goal);
    setIsGoalModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <Loader2 className={styles.spinner} size={40} />
        <p>Carregando suas preferências...</p>
      </div>
    );
  }

  const currentGoal = metas[0]; // Por enquanto focamos na meta principal

  return (
    <div className={styles.container}>
      <div className={styles.aiBanner}>
        <div className={styles.aiBannerIcon}>
          <Brain size={24} />
        </div>
        <div className={styles.aiBannerContent}>
          <h3 className={styles.aiBannerTitle}>Preferências da sua IA</h3>
          <p className={styles.aiBannerText}>
            Personalize como o ZapPoupe interage com você. Ao ajustar o tom de voz e a proatividade, 
            você define se ele deve ser mais direto e reativo ou proativo e amigável. 
            <strong> Importante:</strong> Estas configurações otimizam exclusivamente o processamento de linguagem natural e o perfil comportamental do bot, não interferindo na integridade ou no cálculo dos seus relatórios financeiros consolidados.
          </p>
        </div>
      </div>

      <div className={styles.grid}>
        {/* Left Column: Bot Personality & Behavior */}
        <div className={styles.mainColumn}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Wallet size={18} className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Perfil Financeiro</h2>
            </div>
            <div className={styles.card}>
              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingTitle}>Renda Mensal</span>
                  <span className={styles.settingDesc}>Informe sua faixa de renda para dicas mais precisas</span>
                </div>
                <div className={styles.incomeGrid}>
                  {['0-1000', '1001-5000', '5001-10000', '10001+', 'other'].map((range) => (
                    <button 
                      key={range}
                      className={`${styles.optionBtn} ${incomeRange === range ? styles.activeOption : ''}`}
                      onClick={() => setIncomeRange(range)}
                    >
                      {range === 'other' ? 'Outro' : range.replace('-', ' - ')}
                    </button>
                  ))}
                </div>

                {incomeRange === 'other' && (
                  <div className={styles.customIncomeWrapper}>
                    <div className={styles.inputPrefix}>R$</div>
                    <input 
                      type="number" 
                      className={styles.customInput}
                      placeholder="Digite sua renda mensal..."
                      value={customIncome}
                      onChange={(e) => setCustomIncome(e.target.value)}
                    />
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Bot size={18} className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Personalidade do Bot</h2>
            </div>
            <div className={styles.card}>
              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingTitle}>Tom de Voz</span>
                  <span className={styles.settingDesc}>Como o ZapPoupe deve falar com você</span>
                </div>
                <div className={styles.optionsGrid}>
                  {[
                    { id: 'friendly', label: 'Amigável' },
                    { id: 'direct', label: 'Direto' },
                    { id: 'formal', label: 'Formal' }
                  ].map((tone) => (
                    <button 
                      key={tone.id}
                      className={`${styles.optionBtn} ${botTone === tone.id ? styles.activeOption : ''}`}
                      onClick={() => setBotTone(tone.id)}
                    >
                      {tone.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.settingItem}>
                <div className={styles.settingInfo}>
                  <span className={styles.settingTitle}>Nível de Proatividade</span>
                  <span className={styles.settingDesc}>Define a frequência e intensidade das dicas de economia</span>
                </div>
                <div className={styles.optionsGrid}>
                  {[
                    { id: 'low', label: 'Reativo' },
                    { id: 'medium', label: 'Equilibrado' },
                    { id: 'high', label: 'Proativo' }
                  ].map((level) => (
                    <button 
                      key={level.id}
                      className={`${styles.optionBtn} ${botProactivity === level.id ? styles.activeOption : ''}`}
                      onClick={() => setBotProactivity(level.id)}
                    >
                      {level.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className={styles.divider} />

              <div className={styles.settingItem}>
                <div className={styles.toggleRow}>
                  <div className={styles.actionInfo}>
                    <span className={styles.actionTitle}>Dicas de Economia</span>
                    <span className={styles.actionDesc}>O bot analisa seus gastos para sugerir economias</span>
                  </div>
                  <div className={styles.switchContainer}>
                    <span className={`${styles.switchLabel} ${personalizedTips ? styles.labelActive : ''}`}>
                      {personalizedTips ? 'Ativado' : 'Desativado'}
                    </span>
                    <button 
                      className={`${styles.switch} ${personalizedTips ? styles.switchOn : ''}`}
                      onClick={() => setPersonalizedTips(!personalizedTips)}
                    >
                      <div className={styles.switchHandle} />
                    </button>
                  </div>
                </div>

                {personalizedTips && (
                  <div className={styles.tipPreview}>
                    <div className={styles.tipCard}>
                      <Coins size={20} className={styles.tipIcon} />
                      <p className={styles.tipText}>
                        {botProactivity === 'high' 
                          ? '"Você gastou 15% a mais com delivery este mês. Que tal cozinhar em casa hoje?"'
                          : botProactivity === 'medium'
                          ? '"Notei um aumento nos seus gastos fixos. Vamos revisar suas assinaturas?"'
                          : '"Dica: Reservar 10% do seu salário logo ao receber ajuda a bater suas metas."'}
                      </p>
                    </div>
                    <span className={styles.previewLabel}>Exemplo de dica ({
                      botProactivity === 'high' ? 'Proativo' : botProactivity === 'medium' ? 'Equilibrado' : 'Reativo'
                    })</span>
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Brain size={18} className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Estratégia Financeira</h2>
            </div>
            <div className={styles.card}>
              <div className={styles.toggleRow}>
                <div className={styles.actionIcon}>
                  <TrendingUp size={20} />
                </div>
                <div className={styles.actionInfo}>
                  <span className={styles.actionTitle}>Sugestões de Excedente</span>
                  <span className={styles.actionDesc}>O bot sugere o que fazer com o dinheiro que sobrar</span>
                </div>
                <div className={styles.switchContainer}>
                  <span className={`${styles.switchLabel} ${surplusStrategy ? styles.labelActive : ''}`}>
                    {surplusStrategy ? 'Ativado' : 'Desativado'}
                  </span>
                  <button 
                    className={`${styles.switch} ${surplusStrategy ? styles.switchOn : ''}`}
                    onClick={() => setSurplusStrategy(!surplusStrategy)}
                  >
                    <div className={styles.switchHandle} />
                  </button>
                </div>
              </div>
              <div className={styles.divider} />
              <div className={styles.toggleRow}>
                <div className={styles.actionIcon}>
                  <PiggyBank size={20} />
                </div>
                <div className={styles.actionInfo}>
                  <span className={styles.actionTitle}>Economia Automática</span>
                  <span className={styles.actionDesc}>Arredondamento de compras e transferências</span>
                </div>
                <div className={styles.switchContainer}>
                  <span className={`${styles.switchLabel} ${autoSaving ? styles.labelActive : ''}`}>
                    {autoSaving ? 'Ativado' : 'Desativado'}
                  </span>
                  <button 
                    className={`${styles.switch} ${autoSaving ? styles.switchOn : ''}`}
                    onClick={() => setAutoSaving(!autoSaving)}
                  >
                    <div className={styles.switchHandle} />
                  </button>
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Column: Goals */}
        <div className={styles.sideColumn}>
          <section className={styles.section}>
            <div className={styles.sectionHeader}>
              <Target size={18} className={styles.sectionIcon} />
              <h2 className={styles.sectionTitle}>Metas Financeiras</h2>
            </div>
            <div className={styles.card}>
              {currentGoal ? (
                <div className={styles.goalItem} onClick={() => openGoalModal(currentGoal)} style={{ cursor: 'pointer' }}>
                  <div className={styles.goalInfo}>
                    <span className={styles.goalName}>{currentGoal.name}</span>
                    <span className={styles.goalProgress}>
                      {((currentGoal.currentAmount / currentGoal.targetAmount) * 100).toFixed(0)}% concluído
                    </span>
                  </div>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill} 
                      style={{ width: `${Math.min(100, (currentGoal.currentAmount / currentGoal.targetAmount) * 100)}%` }} 
                    />
                  </div>
                </div>
              ) : (
                <div className={styles.noGoal}>
                  <p>Você ainda não definiu uma meta financeira.</p>
                </div>
              )}
              
              <button className={styles.addGoalBtn} onClick={() => openGoalModal(currentGoal || null)}>
                {currentGoal ? <TrendingUp size={16} /> : <Plus size={16} />}
                <span>{currentGoal ? 'Gerenciar Meta' : 'Nova Meta'}</span>
              </button>
            </div>
          </section>

          <div className={styles.saveActions}>
            <button 
              className={`${styles.saveBtn} ${saveStatus === 'success' ? styles.saveSuccess : ''}`}
              onClick={() => handleSave()}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className={styles.spinner} size={20} />
              ) : saveStatus === 'success' ? (
                <CheckCircle2 size={20} />
              ) : (
                <Save size={20} />
              )}
              <span>
                {isSaving ? 'Salvando...' : saveStatus === 'success' ? 'Salvo!' : 'Salvar Configurações'}
              </span>
            </button>
            {saveStatus === 'error' && (
              <p className={styles.errorMsg}>Erro ao salvar. Tente novamente.</p>
            )}
          </div>
        </div>
      </div>

      <GoalModal 
        isOpen={isGoalModalOpen}
        onClose={() => setIsGoalModalOpen(false)}
        onSave={handleGoalSave}
        initialGoal={selectedGoal}
      />
    </div>
  );
};

export default SettingsPage;
