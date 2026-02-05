import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

interface Personnel {
    id: string;
    name: string;
    graduation: string;
}

export interface Leave {
    id: string;
    personnel_id: string;
    type: string;
    start_date: string;
    end_date: string;
    observation: string;
    personnel?: Personnel;
}

interface LeavesPanelProps {
    isLoggedIn: boolean;
}

const LeavesPanel: React.FC<LeavesPanelProps> = ({ isLoggedIn }) => {
    const [leaves, setLeaves] = useState<Leave[]>([]);
    const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
    const [isAdding, setIsAdding] = useState(false);
    const [loading, setLoading] = useState(true);

    // Form states
    const [selectedPersonnel, setSelectedPersonnel] = useState('');
    const [type, setType] = useState('Férias');
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [observation, setObservation] = useState('');

    const fetchLeaves = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('personnel_leaves')
            .select(`
        *,
        personnel:personnel_id (name, graduation)
      `)
            .order('start_date', { ascending: false });

        if (!error && data) {
            setLeaves(data);
        }
        setLoading(false);
    };

    const fetchPersonnel = async () => {
        const { data } = await supabase.from('personnel').select('*').order('graduation');
        if (data) setPersonnelList(data);
    };

    useEffect(() => {
        fetchLeaves();
        if (isLoggedIn) fetchPersonnel();
    }, [isLoggedIn]);

    const handleAddLeave = async (e: React.FormEvent) => {
        e.preventDefault();
        const { error } = await supabase.from('personnel_leaves').insert([
            {
                personnel_id: selectedPersonnel,
                type,
                start_date: startDate,
                end_date: endDate,
                observation
            }
        ]);

        if (!error) {
            setIsAdding(false);
            resetForm();
            fetchLeaves();
        } else {
            alert('Erro ao adicionar afastamento: ' + error.message);
        }
    };

    const handleDelete = async (id: string) => {
        if (confirm('Remover este afastamento?')) {
            await supabase.from('personnel_leaves').delete().eq('id', id);
            fetchLeaves();
        }
    };

    const resetForm = () => {
        setSelectedPersonnel('');
        setType('Férias');
        setStartDate('');
        setEndDate('');
        setObservation('');
    };

    const getStatusColor = (type: string) => {
        switch (type) {
            case 'Férias': return 'text-orange-500 bg-orange-50 border-orange-100';
            case 'Licença': return 'text-purple-500 bg-purple-50 border-purple-100';
            case 'Atestado': return 'text-red-500 bg-red-50 border-red-100';
            default: return 'text-slate-500 bg-slate-50 border-slate-100';
        }
    };

    const formatDate = (dateStr: string) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    return (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden mb-8">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-orange-50 text-orange-500 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl">event_busy</span>
                    </div>
                    <div>
                        <h3 className="text-slate-900 text-lg font-bold uppercase tracking-wider">Afastamentos e Licenças</h3>
                        <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Controle de efetivo fora de serviço</p>
                    </div>
                </div>
                {isLoggedIn && (
                    <button
                        onClick={() => setIsAdding(!isAdding)}
                        className="bg-tor-dark text-white px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-tor-dark/20 flex items-center gap-2"
                    >
                        <span className="material-symbols-outlined text-sm">{isAdding ? 'close' : 'add'}</span>
                        {isAdding ? 'Cancelar' : 'Adicionar Afastamento'}
                    </button>
                )}
            </div>

            {isAdding && (
                <div className="bg-slate-50 p-8 border-b border-slate-100 animate-in slide-in-from-top-4">
                    <form onSubmit={handleAddLeave} className="max-w-4xl mx-auto space-y-6">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Policial</label>
                                <select
                                    required
                                    className="w-full h-12 px-4 rounded-xl bg-white border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-tor-blue/20 focus:border-tor-blue"
                                    value={selectedPersonnel}
                                    onChange={e => setSelectedPersonnel(e.target.value)}
                                >
                                    <option value="">Selecione...</option>
                                    {personnelList.map(p => (
                                        <option key={p.id} value={p.id}>{p.graduation} {p.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Afastamento</label>
                                <select
                                    className="w-full h-12 px-4 rounded-xl bg-white border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-tor-blue/20 focus:border-tor-blue"
                                    value={type}
                                    onChange={e => setType(e.target.value)}
                                >
                                    <option value="Férias">Férias</option>
                                    <option value="Licença">Licença</option>
                                    <option value="Atestado">Atestado Médico</option>
                                    <option value="Outro">Outro</option>
                                </select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Início</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full h-12 px-4 rounded-xl bg-white border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-tor-blue/20 focus:border-tor-blue"
                                    value={startDate}
                                    onChange={e => setStartDate(e.target.value)}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data Término</label>
                                <input
                                    type="date"
                                    required
                                    className="w-full h-12 px-4 rounded-xl bg-white border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-tor-blue/20 focus:border-tor-blue"
                                    value={endDate}
                                    onChange={e => setEndDate(e.target.value)}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observação (Opcional)</label>
                            <input
                                type="text"
                                placeholder="Ex: Cirurgia, Tratamento..."
                                className="w-full h-12 px-4 rounded-xl bg-white border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-tor-blue/20 focus:border-tor-blue"
                                value={observation}
                                onChange={e => setObservation(e.target.value)}
                            />
                        </div>
                        <div className="flex justify-end pt-2">
                            <button
                                type="submit"
                                className="bg-tor-blue text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-sky-600 transition-all shadow-lg shadow-tor-blue/20"
                            >
                                Salvar Registro
                            </button>
                        </div>
                    </form>
                </div>
            )}

            <div className="p-8">
                {loading ? (
                    <div className="flex justify-center py-8">
                        <div className="size-8 border-4 border-slate-200 border-t-orange-500 rounded-full animate-spin"></div>
                    </div>
                ) : leaves.length === 0 ? (
                    <div className="text-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-slate-400 font-bold uppercase text-xs">Nenhum afastamento registrado.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {leaves.map((leave) => (
                            <div key={leave.id} className={`p-5 rounded-2xl border ${getStatusColor(leave.type)} relative group hover:shadow-md transition-all`}>
                                {isLoggedIn && (
                                    <button
                                        onClick={() => handleDelete(leave.id)}
                                        className="absolute top-3 right-3 text-slate-300 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                    >
                                        <span className="material-symbols-outlined text-lg">delete</span>
                                    </button>
                                )}

                                <p className={`text-[9px] font-black uppercase tracking-widest mb-2 ${getStatusColor(leave.type).split(' ')[0]}`}>
                                    {leave.type}
                                </p>

                                <div className="mb-4">
                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">{leave.personnel?.graduation}</p>
                                    <p className="text-lg font-black text-slate-800 leading-tight">{leave.personnel?.name}</p>
                                </div>

                                <div className="bg-white/50 rounded-lg p-2 mb-2">
                                    <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter mb-0.5">Período</p>
                                    <div className="flex items-center gap-2 text-xs font-black text-slate-600">
                                        <span className="material-symbols-outlined text-sm">calendar_today</span>
                                        {formatDate(leave.start_date)} — {formatDate(leave.end_date)}
                                    </div>
                                </div>

                                {leave.observation && (
                                    <p className="text-[10px] font-medium text-slate-400 italic">"{leave.observation}"</p>
                                )}
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
};

export default LeavesPanel;
