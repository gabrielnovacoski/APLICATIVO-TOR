import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { PersonnelAbsence } from '../types';

interface PersonnelAbsencesProps {
    isLoggedIn: boolean;
}

const PersonnelAbsences: React.FC<PersonnelAbsencesProps> = ({ isLoggedIn }) => {
    const [absences, setAbsences] = useState<PersonnelAbsence[]>([]);
    const [personnel, setPersonnel] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [showAddModal, setShowAddModal] = useState(false);
    const [editingAbsence, setEditingAbsence] = useState<PersonnelAbsence | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Form state
    const [formData, setFormData] = useState({
        personnel_id: '',
        type: 'Férias',
        start_date: '',
        end_date: '',
        description: ''
    });

    const fetchData = async () => {
        setLoading(true);

        // Fetch absences with personnel info
        const { data: aData, error: aError } = await supabase
            .from('personnel_absences')
            .select(`
        *,
        personnel (
          name,
          graduation
        )
      `)
            .order('start_date', { ascending: true });

        if (aData) setAbsences(aData);

        // Fetch all personnel for the select dropdown
        const { data: pData } = await supabase
            .from('personnel')
            .select('id, name, graduation')
            .order('graduation', { ascending: true });

        if (pData) setPersonnel(pData);

        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        const payload = {
            personnel_id: formData.personnel_id,
            type: formData.type,
            start_date: formData.start_date,
            end_date: formData.end_date,
            description: formData.description
        };

        let error;
        if (editingAbsence) {
            const { error: updateError } = await supabase
                .from('personnel_absences')
                .update(payload)
                .eq('id', editingAbsence.id);
            error = updateError;
        } else {
            const { error: insertError } = await supabase
                .from('personnel_absences')
                .insert(payload);
            error = insertError;
        }

        if (!error) {
            await fetchData();
            handleCloseModal();
        } else {
            alert('Erro ao salvar: ' + error.message);
        }
        setIsSaving(false);
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Deseja excluir este afastamento?')) return;

        const { error } = await supabase
            .from('personnel_absences')
            .delete()
            .eq('id', id);

        if (!error) {
            fetchData();
        } else {
            alert('Erro ao excluir: ' + error.message);
        }
    };

    const handleEdit = (absence: PersonnelAbsence) => {
        setEditingAbsence(absence);
        setFormData({
            personnel_id: absence.personnel_id,
            type: absence.type,
            start_date: absence.start_date,
            end_date: absence.end_date,
            description: absence.description || ''
        });
        setShowAddModal(true);
    };

    const handleCloseModal = () => {
        setShowAddModal(false);
        setEditingAbsence(null);
        setFormData({
            personnel_id: '',
            type: 'Férias',
            start_date: '',
            end_date: '',
            description: ''
        });
    };

    const formatDate = (dateStr: string) => {
        const [year, month, day] = dateStr.split('-');
        return `${day}/${month}/${year}`;
    };

    if (loading && absences.length === 0) {
        return <div className="p-8 text-center text-slate-400 font-bold uppercase tracking-widest text-xs">Carregando afastamentos...</div>;
    }

    return (
        <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden mb-8">
            <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                    <div className="size-10 rounded-xl bg-orange-50 text-orange-500 flex items-center justify-center">
                        <span className="material-symbols-outlined text-2xl filled-icon">event_busy</span>
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-slate-900 text-lg font-bold uppercase tracking-wider leading-tight">Afastamentos e Licenças</h3>
                        <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Controle de efetivo fora de serviço</p>
                    </div>
                </div>
                {isLoggedIn && (
                    <button
                        onClick={() => setShowAddModal(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-tor-dark text-white hover:bg-slate-800 rounded-xl transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-tor-dark/10"
                    >
                        <span className="material-symbols-outlined text-sm">add</span>
                        Adicionar Afastamento
                    </button>
                )}
            </div>

            <div className="p-4 md:p-6">
                {absences.length === 0 ? (
                    <div className="text-center py-8 bg-slate-50 rounded-2xl border-2 border-dashed border-slate-200">
                        <span className="material-symbols-outlined text-3xl text-slate-300 mb-1">person_off</span>
                        <p className="text-slate-400 font-bold text-[10px] uppercase tracking-widest">Nenhum policial afastado</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
                        {absences.map((absence) => (
                            <div key={absence.id} className="group relative bg-white border border-slate-200 rounded-xl p-3 hover:shadow-md transition-all">
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[8px] font-black text-orange-500 uppercase tracking-widest mb-0.5 truncate">{absence.type}</span>
                                        <h4 className="text-slate-900 font-black text-[11px] uppercase leading-tight truncate">
                                            {absence.personnel?.graduation} {absence.personnel?.name}
                                        </h4>
                                    </div>
                                    {isLoggedIn && (
                                        <div className="flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                            <button onClick={() => handleEdit(absence)} className="size-5 rounded bg-slate-100 text-slate-500 hover:bg-tor-blue hover:text-white flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[10px]">edit</span>
                                            </button>
                                            <button onClick={() => handleDelete(absence.id)} className="size-5 rounded bg-slate-100 text-slate-500 hover:bg-red-500 hover:text-white flex items-center justify-center">
                                                <span className="material-symbols-outlined text-[10px]">delete</span>
                                            </button>
                                        </div>
                                    )}
                                </div>

                                <div className="space-y-2">
                                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-2">
                                        <span className="material-symbols-outlined text-slate-400 text-sm">calendar_month</span>
                                        <div className="flex flex-col min-w-0">
                                            <p className="text-[8px] font-black text-slate-400 uppercase tracking-tighter leading-none mb-0.5">Período</p>
                                            <p className="text-[9px] font-bold text-slate-700 whitespace-nowrap">
                                                {formatDate(absence.start_date)} - {formatDate(absence.end_date)}
                                            </p>
                                        </div>
                                    </div>

                                    {absence.description && (
                                        <p className="text-[8px] text-slate-500 italic px-1 truncate" title={absence.description}>"{absence.description}"</p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Modal Adicionar/Editar */}
            {showAddModal && (
                <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="bg-white rounded-[32px] shadow-2xl max-w-md w-full overflow-hidden border border-white/20 animate-in zoom-in-95 duration-300">
                        <div className="bg-tor-dark p-6 text-white flex justify-between items-center">
                            <div className="flex items-center gap-3">
                                <div className="size-10 bg-white/10 rounded-xl flex items-center justify-center">
                                    <span className="material-symbols-outlined text-orange-400">{editingAbsence ? 'edit' : 'add'}</span>
                                </div>
                                <h3 className="text-lg font-black uppercase tracking-tight">
                                    {editingAbsence ? 'Editar Afastamento' : 'Novo Afastamento'}
                                </h3>
                            </div>
                            <button onClick={handleCloseModal} className="hover:bg-white/10 p-2 rounded-full transition-colors">
                                <span className="material-symbols-outlined text-2xl">close</span>
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="p-8 space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Policial</label>
                                <select
                                    required
                                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-tor-blue rounded-2xl px-4 py-3 text-sm font-bold"
                                    value={formData.personnel_id}
                                    onChange={e => setFormData({ ...formData, personnel_id: e.target.value })}
                                >
                                    <option value="">Selecione o Policial</option>
                                    {personnel.map(p => (
                                        <option key={p.id} value={p.id}>{p.graduation} {p.name}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo de Afastamento</label>
                                <select
                                    required
                                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-tor-blue rounded-2xl px-4 py-3 text-sm font-bold"
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value })}
                                >
                                    <option value="Férias">Férias</option>
                                    <option value="Atestado">Atestado</option>
                                    <option value="Licença Médica">Licença Médica</option>
                                    <option value="Licença Especial">Licença Especial</option>
                                    <option value="Curso">Curso</option>
                                    <option value="Outros">Outros</option>
                                </select>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Início</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-slate-50 border-2 border-slate-100 focus:border-tor-blue rounded-2xl px-4 py-3 text-sm font-bold"
                                        value={formData.start_date}
                                        onChange={e => setFormData({ ...formData, start_date: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Término</label>
                                    <input
                                        type="date"
                                        required
                                        className="w-full bg-slate-50 border-2 border-slate-100 focus:border-tor-blue rounded-2xl px-4 py-3 text-sm font-bold"
                                        value={formData.end_date}
                                        onChange={e => setFormData({ ...formData, end_date: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Observações (Opcional)</label>
                                <textarea
                                    className="w-full bg-slate-50 border-2 border-slate-100 focus:border-tor-blue rounded-2xl px-4 py-3 text-sm font-bold resize-none"
                                    rows={2}
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="submit"
                                    disabled={isSaving}
                                    className="flex-1 bg-tor-dark text-white py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:bg-slate-800 transition-all shadow-xl shadow-tor-dark/20 disabled:opacity-50"
                                >
                                    {isSaving ? 'Salvando...' : 'Salvar Afastamento'}
                                </button>
                                <button
                                    type="button"
                                    onClick={handleCloseModal}
                                    className="flex-1 text-slate-400 py-4 rounded-2xl font-black uppercase tracking-widest text-xs hover:text-slate-600 transition-all"
                                >
                                    Cancelar
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PersonnelAbsences;
