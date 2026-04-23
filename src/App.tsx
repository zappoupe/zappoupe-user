/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Sidebar from './pages/dashboard/components/Sidebar/Sidebar';
import MainContent from './pages/dashboard/components/MainContent/MainContent';
import BottomNav from './pages/dashboard/components/BottomNav/BottomNav';
import LoginPage from './pages/login/LoginPage';
import { useMediaQuery } from './hooks/useMediaQuery';
import { supabase } from './lib/supabase';
import './globals.css';

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const isMobile = useMediaQuery('(max-width: 768px)');

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (!session) {
        setActiveTab('dashboard');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  if (!session) {
    return <LoginPage onLogin={() => {}} />; // Session update is handled by onAuthStateChange
  }

  return (
    <div className="app-layout">
      <Sidebar activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      <div className="content-wrapper">
        <MainContent activeTab={activeTab} setActiveTab={setActiveTab} onLogout={handleLogout} />
      </div>
      {isMobile && <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />}
    </div>
  );
}
