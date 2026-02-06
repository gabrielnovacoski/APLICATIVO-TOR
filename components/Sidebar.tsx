
import React from 'react';
import { ViewType } from '../types';

interface SidebarProps {
  activeView: ViewType;
  onViewChange: (view: ViewType) => void;
  isLoggedIn: boolean;
  onLoginToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, isLoggedIn, onLoginToggle, mobileOpen, onMobileClose }) => {
  const navItems = [
    { id: ViewType.PRODUCTIVITY, label: 'Produtividade/Relatório', icon: 'dashboard' },
    { id: ViewType.OPERATIONAL, label: 'Operacional', icon: 'sensors' },
    { id: ViewType.SETTINGS, label: 'Configurações', icon: 'settings' },
  ];

  // Logo atualizado via upload do usuário
  const torCrestUrl = "/sidebar-logo.png";

  const handleItemClick = (id: ViewType) => {
    onViewChange(id);
    onMobileClose(); // Fecha menu ao clicar no mobile
  };

  return (
    <>
      {/* Mobile Overlay */}
      {mobileOpen && (
        <div
          onClick={onMobileClose}
          className="fixed inset-0 bg-black/50 z-40 md:hidden backdrop-blur-sm animate-in fade-in duration-300"
        />
      )}

      <aside className={`
        fixed md:sticky top-0 h-screen z-50 md:z-20 
        w-64 bg-tor-dark text-white flex flex-col shrink-0 shadow-2xl 
        transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0
      `}>

        <div className="p-10 flex flex-col items-center border-b border-white/5 bg-gradient-to-b from-slate-800/40 to-transparent relative overflow-hidden">
          {/* Efeito de Brilho de Fundo */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-yellow-500/10 blur-[60px] rounded-full pointer-events-none"></div>

          {/* Botão fechar mobile */}
          <button
            onClick={onMobileClose}
            className="absolute top-4 right-4 text-white/50 hover:text-white md:hidden"
          >
            <span className="material-symbols-outlined">close</span>
          </button>

          <div className="transition-all hover:scale-110 duration-700 flex flex-col items-center relative z-10 w-full px-2">
            <div className="relative p-2 rounded-[32px] bg-white shadow-[0_20px_40px_rgba(0,0,0,0.5)] mb-8 flex items-center justify-center w-full max-w-[210px] aspect-square group">
              <img
                src={torCrestUrl}
                alt="Brasão TOR SC"
                className="w-full h-auto transition-transform duration-700 group-hover:scale-105"
              />
            </div>

            <div className="text-center space-y-2">
              <p className="text-[13px] font-black text-yellow-500 uppercase tracking-[0.1em] leading-tight drop-shadow-sm">
                TÁTICO OSTENSIVO RODOVIÁRIO
              </p>
              <p className="text-[11px] font-black text-slate-300 uppercase tracking-[0.3em] opacity-90">
                CPMRV - SC
              </p>
            </div>
          </div>

        </div>

        <nav className="flex-1 p-4 space-y-1.5 mt-4 overflow-y-auto">
          {navItems.map((item) => (
            <React.Fragment key={item.id}>
              <button
                onClick={() => handleItemClick(item.id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${activeView === item.id
                  ? 'bg-tor-blue text-white font-bold shadow-lg shadow-tor-blue/30 ring-1 ring-white/10'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white'
                  }`}
              >
                <span className={`material-symbols-outlined text-xl ${activeView === item.id ? 'filled-icon' : ''}`}>
                  {item.icon}
                </span>
                <span className="text-sm tracking-tight">{item.label}</span>
              </button>

              {item.id === ViewType.OPERATIONAL && (
                <a
                  href="https://docs.google.com/forms/d/e/1FAIpQLSeaa0GqlVfumLJacwGmfF_YBNLwJtnGSCgSvIroqxygmO9PIg/viewform"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 text-slate-400 hover:bg-white/5 hover:text-white group"
                >
                  <span className="material-symbols-outlined text-xl group-hover:text-yellow-500 transition-colors">
                    edit_note
                  </span>
                  <span className="text-sm tracking-tight">Preencher Dados</span>
                </a>
              )}
            </React.Fragment>
          ))}
        </nav>

        <div className="p-4 mt-auto">
          <button
            onClick={onLoginToggle}
            className={`w-full flex items-center gap-3 p-3 rounded-2xl border transition-all ${isLoggedIn ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-slate-800/40 border-white/5'}`}
          >
            <div className={`size-10 rounded-full bg-slate-700 border overflow-hidden shrink-0 shadow-inner ${isLoggedIn ? 'border-emerald-500' : 'border-slate-500/50'}`}>
              <img
                alt="Oficial"
                src="https://picsum.photos/seed/police-officer-sc/100/100"
                className={`w-full h-full object-cover transition-all ${isLoggedIn ? '' : 'grayscale-[0.5]'}`}
              />
            </div>
            <div className="min-w-0 flex-1 text-left">
              <p className="text-sm font-bold truncate leading-tight uppercase">Gestor</p>
              <p className={`text-[9px] uppercase font-black tracking-tighter opacity-70 ${isLoggedIn ? 'text-emerald-500' : 'text-slate-400'}`}>
                {isLoggedIn ? 'ADMINISTRADOR ON' : 'TOR - CPMRv'}
              </p>
            </div>
            <span className={`material-symbols-outlined text-lg ${isLoggedIn ? 'text-emerald-500' : 'text-slate-500'}`}>
              {isLoggedIn ? 'lock_open' : 'login'}
            </span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
