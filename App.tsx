
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ProductivityView from './views/ProductivityView';
import ReportsView from './views/ReportsView';
import OperationalView from './views/OperationalView';
import SettingsView from './views/SettingsView';
import { ViewType, UserProfile } from './types';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import { authService } from './services/authService';
import type { User } from '@supabase/supabase-js';




const App: React.FC = () => {
  const [activeView, setActiveView] = useState<ViewType>(ViewType.PRODUCTIVITY);
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Estados de Autenticação
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showSetupModal, setShowSetupModal] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);

  // Estados do formulário de login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Estados do formulário de setup inicial
  const [setupEmail, setSetupEmail] = useState('');
  const [setupPassword, setSetupPassword] = useState('');
  const [setupFullName, setSetupFullName] = useState('');
  const [setupError, setSetupError] = useState('');
  const [isSettingUp, setIsSettingUp] = useState(false);

  const datePickerRef = useRef<HTMLDivElement>(null);
  const reportRef = useRef<HTMLDivElement>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const isLoggedIn = currentUser !== null && userProfile !== null && userProfile.is_active;

  // Carregar perfil do usuário
  const loadUserProfile = useCallback(async (userId: string) => {
    const profile = await authService.getUserProfile(userId);
    setUserProfile(profile);
  }, []);

  // Verificar autenticação ao carregar
  useEffect(() => {
    const checkAuth = async () => {
      console.log('🔄 App.tsx: Iniciando checkAuth...');
      setIsCheckingAuth(true);

      // Verificar se há usuários no sistema
      const hasUsers = await authService.hasAnyUsers();
      console.log('🔄 App.tsx: hasAnyUsers?', hasUsers);

      if (!hasUsers) {
        // Se não há usuários, mostrar tela de setup
        setShowSetupModal(true);
        setIsCheckingAuth(false);
        return;
      }

      // Verificar sessão atual
      const user = await authService.getCurrentUser();
      console.log('🔄 App.tsx: getCurrentUser:', user);

      if (user) {
        setCurrentUser(user);
        console.log('🔄 App.tsx: Chamando loadUserProfile para:', user.id);
        await loadUserProfile(user.id);
      } else {
        console.log('🔄 App.tsx: Nenhum usuário na sessão.');
      }

      setIsCheckingAuth(false);
    };

    checkAuth();

    // Listener para mudanças de autenticação
    const { data: { subscription } } = authService.onAuthStateChange(async (user) => {
      setCurrentUser(user);
      if (user) {
        await loadUserProfile(user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [loadUserProfile]);

  // Handler para setup inicial
  const handleSetupSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSetupError('');
    setIsSettingUp(true);

    try {
      const { user, error } = await authService.createFirstAdmin(
        setupEmail,
        setupPassword,
        setupFullName
      );

      if (error) {
        setSetupError(error.message || 'Erro ao criar administrador');
        setIsSettingUp(false);
        return;
      }

      if (user) {
        setCurrentUser(user);
        await loadUserProfile(user.id);
        setShowSetupModal(false);
        setSetupEmail('');
        setSetupPassword('');
        setSetupFullName('');
      }
    } catch (err) {
      setSetupError('Erro inesperado ao criar administrador');
    } finally {
      setIsSettingUp(false);
    }
  };

  const handleToggleLogin = () => {
    if (!isLoggedIn) {
      setShowLoginModal(true);
    } else {
      if (confirm('Deseja sair do sistema?')) {
        authService.signOut();
        setCurrentUser(null);
        setUserProfile(null);
        localStorage.removeItem('teams');
      }
    }
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError('');
    setIsLoggingIn(true);

    try {
      const { user, error } = await authService.signIn(loginEmail, loginPassword);

      if (error) {
        setLoginError(error.message || 'Credenciais incorretas');
        setIsLoggingIn(false);
        setTimeout(() => setLoginError(''), 3000);
        return;
      }

      if (user) {
        setCurrentUser(user);
        await loadUserProfile(user.id);
        setShowLoginModal(false);
        setLoginEmail('');
        setLoginPassword('');
      }
    } catch (err) {
      setLoginError('Erro ao fazer login');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Estados de Data
  const now = new Date();
  const [startDate, setStartDate] = useState<Date>(new Date(now.getFullYear(), 0, 1));
  const [endDate, setEndDate] = useState<Date>(now);


  // Estados de visualização do calendário
  const [viewMonthStart, setViewMonthStart] = useState<Date>(new Date(now.getFullYear(), now.getMonth(), 1));
  const [viewMonthEnd, setViewMonthEnd] = useState<Date>(new Date(now.getFullYear(), now.getMonth(), 1));

  const cpmrvCrestUrl = "/cpmrv-crest.png";

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
        setShowDatePicker(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);


  const handleDownloadPdf = async () => {
    if (!reportRef.current) return;

    setIsExporting(true);
    // Tempo para fechar menus ou atualizar estados da UI
    await new Promise(r => setTimeout(r, 200));

    try {
      const element = reportRef.current;
      const originalStyle = element.style.cssText;

      // Forçar largura padrão para garantir layout consistente no PDF
      element.style.width = '1200px';
      element.style.height = 'auto';
      element.style.minHeight = 'auto';

      const canvas = await html2canvas(element, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#f8fafc',
        windowWidth: 1200,
        scrollX: 0,
        scrollY: -window.scrollY // Compensar scroll atual
      });

      element.style.cssText = originalStyle;

      const imgData = canvas.toDataURL('image/png', 1.0);
      const pdf = jsPDF as any;

      const pdfWidth = 595; // A4 pt width
      const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

      // Se for muito longo, usa altura dinâmica, senão usa A4 padrão
      const format = pdfHeight > 842 ? [pdfWidth, pdfHeight] : 'a4';

      const doc = new pdf({
        orientation: 'portrait',
        unit: 'pt',
        format: format
      });

      doc.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
      doc.save(`Relatorio_TOR_${startDate.toLocaleDateString().replace(/\//g, '-')}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar o relatório. Verifique se há dados no período.');
    } finally {
      setIsExporting(false);
    }
  };







  const renderView = () => {
    switch (activeView) {

      case ViewType.PRODUCTIVITY: return <ProductivityView startDate={startDate} endDate={endDate} isLoggedIn={isLoggedIn} />;
      case ViewType.OPERATIONAL: return <OperationalView isLoggedIn={isLoggedIn} />;
      case ViewType.SETTINGS: return <SettingsView isLoggedIn={isLoggedIn} userProfile={userProfile} />;
      default: return <ProductivityView startDate={startDate} endDate={endDate} isLoggedIn={isLoggedIn} />;

    }

  };


  const getViewTitle = () => {
    switch (activeView) {
      case ViewType.PRODUCTIVITY: return 'Produtividade/Relatório';
      case ViewType.OPERATIONAL: return 'Gestão Operacional';
      case ViewType.SETTINGS: return 'Configurações do Sistema';
      default: return 'Produtividade/Relatório';
    }

  };

  const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
  const changeMonth = (date: Date, delta: number) => new Date(date.getFullYear(), date.getMonth() + delta, 1);
  const formatMonthYear = (date: Date) => {
    const months = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
    return `${months[date.getMonth()]}. DE ${date.getFullYear()}`;
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar 
        activeView={activeView} 
        onViewChange={setActiveView} 
        isLoggedIn={isLoggedIn} 
        onLoginToggle={handleToggleLogin} 
        mobileOpen={isMobileMenuOpen}
        onMobileClose={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-8 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsMobileMenuOpen(true)}
              className="md:hidden p-2 -ml-2 text-slate-500 hover:bg-slate-100 rounded-lg"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <h1 className="text-lg md:text-xl font-bold text-slate-800 truncate">{getViewTitle()}</h1>
          </div>



          <div className="flex items-center gap-4">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">selecione o período</span>
            <div className="relative" ref={datePickerRef}>



              <button
                onClick={() => setShowDatePicker(!showDatePicker)}
                className="flex items-center gap-3 bg-slate-100 hover:bg-slate-200 px-4 py-2 rounded-lg border border-slate-200 transition-all text-slate-700"
              >
                <span className="material-symbols-outlined text-slate-500 text-sm">calendar_month</span>
                <span className="text-xs font-bold uppercase tracking-tight">
                  {formatMonthYear(startDate)}
                </span>
                <span className="material-symbols-outlined text-slate-400 text-sm">expand_more</span>
              </button>

              {showDatePicker && (
                <div className="absolute top-full right-0 mt-2 w-[520px] bg-white rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.2)] border border-slate-200 overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">

                  <div className="bg-tor-dark p-4 flex justify-between items-center border-b border-slate-700">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Período dos Dados</span>
                  </div>

                  <div className="p-6 grid grid-cols-2 gap-8 bg-white">
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Data de início</p>

                        <div className="flex items-center justify-between px-2 bg-slate-50 rounded-xl py-1">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setViewMonthStart(changeMonth(viewMonthStart, -12))} className="text-slate-400 hover:text-tor-blue p-1 rounded-lg hover:bg-white transition-colors"><span className="material-symbols-outlined text-lg">keyboard_double_arrow_left</span></button>
                            <button onClick={() => setViewMonthStart(changeMonth(viewMonthStart, -1))} className="text-slate-400 hover:text-tor-blue p-1 rounded-lg hover:bg-white transition-colors"><span className="material-symbols-outlined text-lg">chevron_left</span></button>
                          </div>

                          <div className="flex items-center gap-1 font-black text-slate-700 text-xs">
                            <select
                              value={viewMonthStart.getMonth()}
                              onChange={(e) => setViewMonthStart(new Date(viewMonthStart.getFullYear(), parseInt(e.target.value), 1))}
                              className="bg-transparent border-none p-0 pr-6 text-[10px] font-black uppercase focus:ring-0 cursor-pointer"
                            >
                              {['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'].map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                              ))}
                            </select>
                            <select
                              value={viewMonthStart.getFullYear()}
                              onChange={(e) => setViewMonthStart(new Date(parseInt(e.target.value), viewMonthStart.getMonth(), 1))}
                              className="bg-transparent border-none p-0 pr-6 text-[10px] font-black uppercase focus:ring-0 cursor-pointer"
                            >
                              {Array.from({ length: 20 }).map((_, i) => {
                                const y = new Date().getFullYear() - 10 + i;
                                return <option key={y} value={y}>{y}</option>;
                              })}
                            </select>
                          </div>

                          <div className="flex items-center gap-1">
                            <button onClick={() => setViewMonthStart(changeMonth(viewMonthStart, 1))} className="text-slate-400 hover:text-tor-blue p-1 rounded-lg hover:bg-white transition-colors"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
                            <button onClick={() => setViewMonthStart(changeMonth(viewMonthStart, 12))} className="text-slate-400 hover:text-tor-blue p-1 rounded-lg hover:bg-white transition-colors"><span className="material-symbols-outlined text-lg">keyboard_double_arrow_right</span></button>
                          </div>
                        </div>

                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">

                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, idx) => <span key={`${d}-${idx}`} className="text-[10px] font-bold text-slate-300 py-1">{d}</span>)}

                        {Array.from({ length: getDaysInMonth(viewMonthStart.getFullYear(), viewMonthStart.getMonth()) }).map((_, i) => {
                          const day = i + 1;
                          const isSelected = startDate.getDate() === day && startDate.getMonth() === viewMonthStart.getMonth() && startDate.getFullYear() === viewMonthStart.getFullYear();
                          return (
                            <button key={i} onClick={() => setStartDate(new Date(viewMonthStart.getFullYear(), viewMonthStart.getMonth(), day))} className={`text-[10px] font-bold py-2 rounded-lg transition-colors ${isSelected ? 'bg-tor-blue text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>{day}</button>

                          );
                        })}
                      </div>
                    </div>
                    <div className="space-y-4">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Data de término</p>

                        <div className="flex items-center justify-between px-2 bg-slate-50 rounded-xl py-1">
                          <div className="flex items-center gap-1">
                            <button onClick={() => setViewMonthEnd(changeMonth(viewMonthEnd, -12))} className="text-slate-400 hover:text-tor-blue p-1 rounded-lg hover:bg-white transition-colors"><span className="material-symbols-outlined text-lg">keyboard_double_arrow_left</span></button>
                            <button onClick={() => setViewMonthEnd(changeMonth(viewMonthEnd, -1))} className="text-slate-400 hover:text-tor-blue p-1 rounded-lg hover:bg-white transition-colors"><span className="material-symbols-outlined text-lg">chevron_left</span></button>
                          </div>

                          <div className="flex items-center gap-1 font-black text-slate-700 text-xs">
                            <select
                              value={viewMonthEnd.getMonth()}
                              onChange={(e) => setViewMonthEnd(new Date(viewMonthEnd.getFullYear(), parseInt(e.target.value), 1))}
                              className="bg-transparent border-none p-0 pr-6 text-[10px] font-black uppercase focus:ring-0 cursor-pointer"
                            >
                              {['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'].map((m, i) => (
                                <option key={i} value={i}>{m}</option>
                              ))}
                            </select>
                            <select
                              value={viewMonthEnd.getFullYear()}
                              onChange={(e) => setViewMonthEnd(new Date(parseInt(e.target.value), viewMonthEnd.getMonth(), 1))}
                              className="bg-transparent border-none p-0 pr-6 text-[10px] font-black uppercase focus:ring-0 cursor-pointer"
                            >
                              {Array.from({ length: 20 }).map((_, i) => {
                                const y = new Date().getFullYear() - 10 + i;
                                return <option key={y} value={y}>{y}</option>;
                              })}
                            </select>
                          </div>

                          <div className="flex items-center gap-1">
                            <button onClick={() => setViewMonthEnd(changeMonth(viewMonthEnd, 1))} className="text-slate-400 hover:text-tor-blue p-1 rounded-lg hover:bg-white transition-colors"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
                            <button onClick={() => setViewMonthEnd(changeMonth(viewMonthEnd, 12))} className="text-slate-400 hover:text-tor-blue p-1 rounded-lg hover:bg-white transition-colors"><span className="material-symbols-outlined text-lg">keyboard_double_arrow_right</span></button>
                          </div>
                        </div>

                      </div>
                      <div className="grid grid-cols-7 gap-1 text-center">

                        {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map((d, idx) => <span key={`${d}-${idx}`} className="text-[10px] font-bold text-slate-300 py-1">{d}</span>)}

                        {Array.from({ length: getDaysInMonth(viewMonthEnd.getFullYear(), viewMonthEnd.getMonth()) }).map((_, i) => {
                          const day = i + 1;
                          const isSelected = endDate.getDate() === day && endDate.getMonth() === viewMonthEnd.getMonth() && endDate.getFullYear() === viewMonthEnd.getFullYear();
                          return (
                            <button key={i} onClick={() => setEndDate(new Date(viewMonthEnd.getFullYear(), viewMonthEnd.getMonth(), day))} className={`text-[10px] font-bold py-2 rounded-lg transition-colors ${isSelected ? 'bg-tor-blue text-white shadow-md' : 'text-slate-600 hover:bg-slate-100'}`}>{day}</button>
                          );
                        })}
                      </div>
                    </div>
                  </div>

                  <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-center items-center">
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Os dados serão atualizados ao clicar num dia acima</p>
                  </div>

                </div>
              )}
            </div>
            <button
              onClick={handleDownloadPdf}
              disabled={isExporting}
              className={`${isExporting ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'} bg-tor-dark text-white p-2 rounded-lg transition-colors shadow-lg shadow-tor-dark/10 flex items-center justify-center`}
              title="Baixar Relatório em PDF"
            >
              <span className={`material-symbols-outlined text-sm ${isExporting ? 'animate-spin' : ''}`}>
                {isExporting ? 'sync' : 'download'}
              </span>
            </button>

          </div>
        </header>

        <main className="p-8 pb-12 max-w-[1600px] mx-auto w-full flex-1">
          <div ref={reportRef} className="bg-slate-50 rounded-3xl p-4 min-h-full">
            {renderView()}
          </div>
        </main>


        <footer className="px-4 md:px-8 py-8 md:py-10 flex flex-col md:flex-row items-center justify-between gap-8 border-t border-slate-200/50 bg-white/30">
          <div className="flex flex-col md:flex-row items-center gap-4 md:gap-6 text-center md:text-left">
            <img
              src={cpmrvCrestUrl}
              alt="Brasão PMRv SC"
              className="h-14 md:h-16 w-auto drop-shadow-md"
            />
            <div className="flex flex-col">
              <p className="text-[10px] md:text-[9px] text-slate-500 md:text-slate-400 font-black uppercase tracking-[0.1em] md:tracking-[0.15em] leading-tight max-w-[280px] md:max-w-none">
                COMANDO DE POLÍCIA MILITAR RODOVIÁRIA DE SANTA CATARINA
              </p>
              <p className="text-[9px] md:text-[8px] text-slate-400 font-black uppercase tracking-[0.1em] md:tracking-[0.15em] leading-tight opacity-80 mt-1 md:mt-0">
                TOR - TÁTICO OSTENSIVO RODOVIÁRIO
              </p>
            </div>
          </div>
          <div className="text-center md:text-right flex flex-col justify-center gap-1">
            <p className="text-[8px] md:text-[7px] text-slate-400 font-black uppercase tracking-[0.15em] leading-tight opacity-70">
              DADOS ATUALIZADOS EM:
            </p>
            <p className="text-[9px] md:text-[7px] text-slate-500 md:text-slate-400 font-black uppercase tracking-[0.15em] leading-tight">
              {now.toLocaleDateString('pt-BR')} {now.getHours()}:{now.getMinutes().toString().padStart(2, '0')}
            </p>
          </div>
        </footer>
      </div>

      {showLoginModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-sm w-full overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="bg-tor-dark p-8 pb-10 text-white text-center relative">
              <div className="size-20 bg-tor-blue/20 rounded-3xl mx-auto mb-6 flex items-center justify-center border border-white/10 shadow-inner">
                <span className="material-symbols-outlined text-4xl text-tor-blue filled-icon">lock</span>
              </div>
              <h3 className="text-xl font-black mb-2 uppercase tracking-tight">Área do Comandante</h3>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest leading-relaxed">
                Insira a credencial de acesso para<br />habilitar o modo de edição
              </p>
            </div>

            <form onSubmit={handleLoginSubmit} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail de Acesso</label>
                <input
                  type="email"
                  autoFocus
                  required
                  placeholder="seu@email.com"
                  className={`w-full bg-slate-50 border-2 ${loginError ? 'border-red-500' : 'border-slate-100'} focus:border-tor-blue focus:ring-0 rounded-2xl px-5 py-4 text-sm font-bold transition-all`}
                  value={loginEmail}
                  onChange={e => setLoginEmail(e.target.value)}
                  disabled={isLoggingIn}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha de Acesso</label>
                <input
                  type="password"
                  required
                  placeholder="••••••••"
                  className={`w-full bg-slate-50 border-2 ${loginError ? 'border-red-500 animate-shake' : 'border-slate-100'} focus:border-tor-blue focus:ring-0 rounded-2xl px-5 py-4 text-sm font-bold transition-all`}
                  value={loginPassword}
                  onChange={e => setLoginPassword(e.target.value)}
                  disabled={isLoggingIn}
                />
                {loginError && <p className="text-[10px] text-red-500 font-bold text-center mt-2 animate-bounce">{loginError}</p>}
              </div>

              <div className="flex flex-col gap-3 pt-2">
                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className={`w-full bg-tor-dark text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs ${isLoggingIn ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'} transition-all shadow-xl shadow-tor-dark/20 flex items-center justify-center gap-2 group`}
                >
                  {isLoggingIn ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                      Entrando...
                    </>
                  ) : (
                    <>
                      Entrar no Sistema
                      <span className="material-symbols-outlined text-sm group-hover:translate-x-1 transition-transform">arrow_forward</span>
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowLoginModal(false); setLoginEmail(''); setLoginPassword(''); setLoginError(''); }}
                  disabled={isLoggingIn}
                  className="w-full text-slate-400 py-3 rounded-xl font-bold uppercase tracking-widest text-[10px] hover:text-slate-600 transition-all disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSetupModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/90 backdrop-blur-md animate-in fade-in duration-300">
          <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
            <div className="bg-gradient-to-br from-tor-dark to-slate-800 p-8 pb-10 text-white text-center relative">
              <div className="size-24 bg-gradient-to-br from-tor-blue/30 to-tor-blue/10 rounded-3xl mx-auto mb-6 flex items-center justify-center border border-white/10 shadow-inner">
                <span className="material-symbols-outlined text-5xl text-tor-blue filled-icon">verified_user</span>
              </div>
              <h3 className="text-2xl font-black mb-2 uppercase tracking-tight">Configuração Inicial</h3>
              <p className="text-slate-300 text-xs font-bold uppercase tracking-widest leading-relaxed">
                Bem-vindo ao sistema TOR<br />
                Crie o primeiro administrador
              </p>
            </div>

            <form onSubmit={handleSetupSubmit} className="p-8 space-y-5">
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
                <span className="material-symbols-outlined text-tor-blue text-xl shrink-0">info</span>
                <p className="text-[10px] text-blue-900 font-medium leading-relaxed">
                  Esta conta terá privilégios de administrador e poderá gerenciar todos os usuários do sistema.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input
                  type="text"
                  autoFocus
                  required
                  placeholder="Ex: João Silva"
                  className={`w-full bg-slate-50 border-2 ${setupError ? 'border-red-500' : 'border-slate-100'} focus:border-tor-blue focus:ring-0 rounded-2xl px-5 py-4 text-sm font-bold transition-all`}
                  value={setupFullName}
                  onChange={e => setSetupFullName(e.target.value)}
                  disabled={isSettingUp}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                <input
                  type="email"
                  required
                  placeholder="admin@exemplo.com"
                  className={`w-full bg-slate-50 border-2 ${setupError ? 'border-red-500' : 'border-slate-100'} focus:border-tor-blue focus:ring-0 rounded-2xl px-5 py-4 text-sm font-bold transition-all`}
                  value={setupEmail}
                  onChange={e => setSetupEmail(e.target.value)}
                  disabled={isSettingUp}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha</label>
                <input
                  type="password"
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className={`w-full bg-slate-50 border-2 ${setupError ? 'border-red-500 animate-shake' : 'border-slate-100'} focus:border-tor-blue focus:ring-0 rounded-2xl px-5 py-4 text-sm font-bold transition-all`}
                  value={setupPassword}
                  onChange={e => setSetupPassword(e.target.value)}
                  disabled={isSettingUp}
                />
                {setupError && <p className="text-[10px] text-red-500 font-bold text-center mt-2 animate-bounce">{setupError}</p>}
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSettingUp}
                  className={`w-full bg-gradient-to-r from-tor-dark to-slate-800 text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs ${isSettingUp ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-2xl hover:shadow-tor-dark/30'} transition-all shadow-xl shadow-tor-dark/20 flex items-center justify-center gap-2 group`}
                >
                  {isSettingUp ? (
                    <>
                      <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                      Criando Administrador...
                    </>
                  ) : (
                    <>
                      <span className="material-symbols-outlined text-sm">verified_user</span>
                      Criar Administrador
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



    </div>
  );
};

export default App;
