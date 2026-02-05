
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import ProductivityView from './views/ProductivityView';
import ReportsView from './views/ReportsView';
import OperationalView from './views/OperationalView';
import SettingsView from './views/SettingsView';
import { ViewType } from './types';
import { getDashboardInsights } from './services/geminiService';

const App: React.FC = () => {
    const [activeView, setActiveView] = useState<ViewType>(ViewType.PRODUCTIVITY);
    const [aiInsight, setAiInsight] = useState<string>('');
    const [isGeneratingAi, setIsGeneratingAi] = useState(false);
    const [showAiModal, setShowAiModal] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const datePickerRef = useRef<HTMLDivElement>(null);

    // Estados de Data
    const now = new Date();
    const [startDate, setStartDate] = useState<Date>(new Date(now.getFullYear(), now.getMonth(), 1));
    const [endDate, setEndDate] = useState<Date>(now);

    // Estados de visualização do calendário
    const [viewMonthStart, setViewMonthStart] = useState<Date>(new Date(now.getFullYear(), now.getMonth(), 1));
    const [viewMonthEnd, setViewMonthEnd] = useState<Date>(new Date(now.getFullYear(), now.getMonth(), 1));

    const cpmrvCrestUrl = "https://lh3.googleusercontent.com/d/1RkMxHaApOvZJlTAGuqKwMbIpRG3Wt_4h";

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (datePickerRef.current && !datePickerRef.current.contains(event.target as Node)) {
                setShowDatePicker(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAiInsight = useCallback(async () => {
        setIsGeneratingAi(true);
        setShowAiModal(true);
        const summary = `Relatório de Produtividade TOR - Período: ${startDate.toLocaleDateString()} a ${endDate.toLocaleDateString()}`;
        const insight = await getDashboardInsights(summary);
        setAiInsight(insight);
        setIsGeneratingAi(false);
    }, [startDate, endDate]);

    const renderView = () => {
        switch (activeView) {
            case ViewType.PRODUCTIVITY: return <ProductivityView />;
            case ViewType.REPORTS: return <ReportsView />;
            case ViewType.OPERATIONAL: return <OperationalView />;
            case ViewType.SETTINGS: return <SettingsView />;
            default: return <ProductivityView />;
        }
    };

    const getViewTitle = () => {
        switch (activeView) {
            case ViewType.PRODUCTIVITY: return 'Relatório de Produtividade';
            case ViewType.REPORTS: return 'Central de Relatórios';
            case ViewType.OPERATIONAL: return 'Gestão Operacional';
            case ViewType.SETTINGS: return 'Configurações do Sistema';
            default: return 'Dashboard';
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
            <Sidebar activeView={activeView} onViewChange={setActiveView} />

            <div className="flex-1 flex flex-col min-w-0 overflow-x-hidden">
                <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-8 sticky top-0 z-40">
                    <div>
                        <h1 className="text-xl font-bold text-slate-800">{getViewTitle()}</h1>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={handleAiInsight}
                            className="flex items-center gap-2 bg-tor-blue/10 text-tor-blue hover:bg-tor-blue/20 px-4 py-2 rounded-lg border border-tor-blue/20 transition-all group"
                        >
                            <span className={`material-symbols-outlined text-sm ${isGeneratingAi ? 'animate-spin' : 'filled-icon'}`}>auto_awesome</span>
                            <span className="text-xs font-bold uppercase tracking-tight">Análise IA</span>
                        </button>

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
                                        <div className="relative">
                                            <select className="bg-slate-800 text-white text-[10px] font-bold border-none rounded-md py-1.5 pl-3 pr-8 focus:ring-0 cursor-pointer uppercase tracking-tight">
                                                <option>Período automático</option>
                                                <option>Personalizado</option>
                                            </select>
                                            <span className="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 text-sm pointer-events-none">expand_more</span>
                                        </div>
                                    </div>
                                    <div className="p-6 grid grid-cols-2 gap-8 bg-white">
                                        <div className="space-y-4">
                                            <div className="text-center">
                                                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Data de início</p>
                                                <div className="flex items-center justify-between px-2">
                                                    <button onClick={() => setViewMonthStart(changeMonth(viewMonthStart, -1))} className="text-slate-400 hover:text-tor-blue"><span className="material-symbols-outlined text-lg">chevron_left</span></button>
                                                    <span className="text-xs font-black text-slate-700 uppercase">{formatMonthYear(viewMonthStart)}</span>
                                                    <button onClick={() => setViewMonthStart(changeMonth(viewMonthStart, 1))} className="text-slate-400 hover:text-tor-blue"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-7 gap-1 text-center">
                                                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <span key={d} className="text-[10px] font-bold text-slate-300 py-1">{d}</span>)}
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
                                                <div className="flex items-center justify-between px-2">
                                                    <button onClick={() => setViewMonthEnd(changeMonth(viewMonthEnd, -1))} className="text-slate-400 hover:text-tor-blue"><span className="material-symbols-outlined text-lg">chevron_left</span></button>
                                                    <span className="text-xs font-black text-slate-700 uppercase">{formatMonthYear(viewMonthEnd)}</span>
                                                    <button onClick={() => setViewMonthEnd(changeMonth(viewMonthEnd, 1))} className="text-slate-400 hover:text-tor-blue"><span className="material-symbols-outlined text-lg">chevron_right</span></button>
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-7 gap-1 text-center">
                                                {['D', 'S', 'T', 'Q', 'Q', 'S', 'S'].map(d => <span key={d} className="text-[10px] font-bold text-slate-300 py-1">{d}</span>)}
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
                                    <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end items-center gap-4">
                                        <button onClick={() => setShowDatePicker(false)} className="text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600">Cancelar</button>
                                        <button onClick={() => setShowDatePicker(false)} className="bg-tor-dark text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-tor-dark/20 hover:bg-slate-800 transition-all">Aplicar</button>
                                    </div>
                                </div>
                            )}
                        </div>
                        <button className="bg-tor-dark text-white p-2 rounded-lg hover:bg-slate-800 transition-colors shadow-lg shadow-tor-dark/10"><span className="material-symbols-outlined text-sm">download</span></button>
                    </div>
                </header>

                <main className="p-8 pb-12 max-w-[1600px] mx-auto w-full flex-1">
                    {renderView()}
                </main>

                <footer className="px-8 py-10 flex items-center justify-between border-t border-slate-200/50 bg-white/30">
                    <div className="flex items-center gap-6">
                        <img
                            src={cpmrvCrestUrl}
                            alt="Brasão PMRv SC"
                            className="h-16 w-auto drop-shadow-md"
                        />
                        <div className="flex flex-col">
                            <p className="text-[9px] text-slate-400 font-black uppercase tracking-[0.15em] leading-tight whitespace-nowrap">
                                COMANDO DE POLÍCIA MILITAR RODOVIÁRIA DE SANTA CATARINA
                            </p>
                            <p className="text-[8px] text-slate-400 font-black uppercase tracking-[0.15em] leading-tight opacity-80">
                                TOR - TÁTICO OSTENSIVO RODOVIÁRIO
                            </p>
                        </div>
                    </div>
                    <div className="text-right flex flex-col justify-center">
                        <p className="text-[7px] text-slate-400 font-black uppercase tracking-[0.15em] leading-tight opacity-70">
                            DADOS ATUALIZADOS EM:
                        </p>
                        <p className="text-[7px] text-slate-400 font-black uppercase tracking-[0.15em] leading-tight">
                            {now.toLocaleDateString('pt-BR')} {now.getHours()}:{now.getMinutes().toString().padStart(2, '0')}
                        </p>
                    </div>
                </footer>
            </div>

            {showAiModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="bg-tor-dark p-6 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <span className="material-symbols-outlined text-yellow-500 filled-icon text-3xl">auto_awesome</span>
                                <h3 className="text-lg font-bold">Insights Estratégicos</h3>
                            </div>
                            <button onClick={() => setShowAiModal(false)} className="hover:bg-white/10 p-2 rounded-full"><span className="material-symbols-outlined">close</span></button>
                        </div>
                        <div className="p-8">
                            {isGeneratingAi ? (
                                <div className="flex flex-col items-center py-12 gap-4">
                                    <div className="size-12 border-4 border-tor-blue border-t-transparent rounded-full animate-spin"></div>
                                    <p className="text-slate-500 font-medium">Analisando base de dados...</p>
                                </div>
                            ) : (
                                <div className="prose prose-slate max-w-none text-slate-700 leading-relaxed font-medium whitespace-pre-wrap">{aiInsight}</div>
                            )}
                            <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                                <button onClick={() => setShowAiModal(false)} className="bg-tor-dark text-white px-6 py-2 rounded-lg font-bold text-sm">Entendido</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default App;