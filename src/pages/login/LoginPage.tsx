import React, { useState } from 'react';
import { LogIn, User, Lock, Mail, ArrowRight, MessageCircle, AlertCircle, Eye, EyeOff } from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../../lib/supabase';
import styles from './LoginPage.module.css';

interface LoginPageProps {
  onLogin: () => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [view, setView] = useState<'login' | 'forgot-password'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;
      // App.tsx handles navigation via onAuthStateChange
    } catch (err: any) {
      let message = 'Erro ao entrar. Verifique suas credenciais.';
      
      if (err.message === 'Invalid login credentials') {
        message = 'E-mail ou senha incorretos. Por favor, tente novamente.';
      } else if (err.message === 'Email not confirmed') {
        message = 'Por favor, confirme seu e-mail antes de entrar.';
      } else if (err.message === 'User not found') {
        message = 'Usuário não encontrado.';
      } else if (err.status === 429) {
        message = 'Muitas tentativas. Tente novamente em alguns minutos.';
      }
      
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin,
      });

      if (error) throw error;
      setIsSent(true);
    } catch (err: any) {
      setError(err.message || 'Erro ao enviar e-mail de recuperação.');
    } finally {
      setIsLoading(false);
    }
  };

  if (view === 'forgot-password') {
    return (
      <div className={styles.container}>
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className={styles.card}
        >
          <div className={styles.header}>
            <div className={styles.logoWrapper}>
              <div className={styles.logoIcon}>
                <Lock size={32} color="#fff" />
              </div>
            </div>
            <h2 className={styles.title}>Recuperar Senha</h2>
            <p className={styles.subtitle}>
              {isSent 
                ? 'Enviamos as instruções para o seu e-mail.' 
                : 'Insira seu e-mail para receber as instruções de recuperação.'}
            </p>
          </div>

          {error && (
            <div className={styles.errorAlert}>
              <AlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          {!isSent ? (
            <form className={styles.form} onSubmit={handleForgotPassword}>
              <div className={styles.inputGroup}>
                <div className={styles.inputWrapper}>
                  <div className={styles.inputIcon}>
                    <Mail size={20} />
                  </div>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                    placeholder="Seu e-mail cadastrado"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className={styles.submitBtn}
              >
                {isLoading ? (
                  <>
                    <svg className={styles.spinner} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                      <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
                    </svg>
                    Enviando...
                  </>
                ) : (
                  <>
                    Enviar Instruções <ArrowRight size={20} />
                  </>
                )}
              </button>
            </form>
          ) : (
            <div className={styles.footer} style={{ marginTop: '1rem' }}>
              <p className={styles.subtitle} style={{ marginBottom: '1.5rem' }}>
                Verifique sua caixa de entrada e siga os passos para criar uma nova senha.
              </p>
            </div>
          )}

          <div className={styles.footer}>
            <button 
              onClick={() => { setView('login'); setIsSent(false); setError(null); }} 
              className={styles.signupLink}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Voltar para o Login
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={styles.card}
      >
        <div className={styles.header}>
          <div className={styles.logoWrapper}>
            <div className={styles.logoIcon}>
              <MessageCircle size={32} color="#fff" />
            </div>
          </div>
          <h2 className={styles.title}>ZapPoupe</h2>
          <p className={styles.subtitle}>
            Bem-vindo de volta! Entre na sua conta para continuar.
          </p>
        </div>

        {error && (
          <div className={styles.errorAlert}>
            <AlertCircle size={18} />
            <span>{error}</span>
          </div>
        )}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <div className={styles.inputWrapper}>
              <div className={styles.inputIcon}>
                <Mail size={20} />
              </div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={styles.input}
                placeholder="Seu e-mail"
              />
            </div>
            <div className={styles.inputWrapper}>
              <div className={styles.inputIcon}>
                <Lock size={20} />
              </div>
              <input
                type={showPassword ? "text" : "password"}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                placeholder="Sua senha"
              />
              <button
                type="button"
                className={styles.passwordToggle}
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>

          <div className={styles.options}>
            <label className={styles.rememberMe}>
              <input
                type="checkbox"
                className={styles.checkbox}
              />
              <span>Lembrar de mim</span>
            </label>

            <button 
              type="button"
              onClick={() => { setView('forgot-password'); setError(null); }} 
              className={styles.forgotPassword}
              style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
            >
              Esqueceu a senha?
            </button>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className={styles.submitBtn}
          >
            {isLoading ? (
              <>
                <svg className={styles.spinner} width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                  <path d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" fill="currentColor" />
                </svg>
                Entrando...
              </>
            ) : (
              <>
                Entrar <ArrowRight size={20} />
              </>
            )}
          </button>
        </form>
      </motion.div>
    </div>
  );
};

export default LoginPage;
