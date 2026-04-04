import React, { useState, useEffect, useRef } from 'react';
import { fetchLatestVehicleKm } from '../services/sheetsService';
import { supabase } from '../lib/supabase';
import PersonnelAbsences from '../components/PersonnelAbsences';
import { PersonnelAbsence as Leave } from '../types';

interface Member {
  name: string;
  role: string;
  icon: string;
}

interface Team {
  id: string;
  name: string;
  sector: string;
  status: string;
  color: string;
  members: Member[];
}

interface Vehicle {
  id: string;
  prefix: string;
  status: 'OPERANDO' | 'BAIXADA';
  model: string;
  year: string;
  plate: string;
  odometer: number;
  oilInterval: number;
  lastOilChangeOdometer: number;
  color: string;
}

const initialTeams: Team[] = [
  {
    id: '1',
    name: 'EQUIPE ALFA',
    sector: 'Eixo Norte / Rod. Anhanguera',
    status: 'Patrulhamento',
    color: 'tor-blue',
    members: [
      { name: 'Sgt. Silva', role: 'GESTOR', icon: 'person' },
      { name: 'Cb. Oliveira', role: 'MOTORISTA', icon: 'navigation' },
      { name: 'Sd. Pereira', role: 'AUXILIAR 1', icon: 'shield' },
      { name: 'Sd. Lima', role: 'AUXILIAR 2', icon: 'shield' },
    ]
  },
  {
    id: '2',
    name: 'EQUIPE BRAVO',
    sector: 'Região Central / Rod. Castelo',
    status: 'Ocorrência',
    color: 'tor-blue',
    members: [
      { name: 'Sgt. Santos', role: 'GESTOR', icon: 'person' },
      { name: 'Sd. Costa', role: 'MOTORISTA', icon: 'navigation' },
      { name: 'Cb. Mendes', role: '3º HOMEM', icon: 'shield' },
      { name: 'Sd. Rocha', role: '4º HOMEM', icon: 'shield' },
    ]
  }
];

const initialVehicles: Vehicle[] = [
  {
    id: 'TOR-01',
    prefix: '4582',
    status: 'OPERANDO',
    model: 'Toyota SW4',
    year: '2024',
    plate: 'ABC-1234',
    odometer: 12450,
    oilInterval: 10000,
    lastOilChangeOdometer: 10000,
    color: 'tor-blue'
  },
  {
    id: 'TOR-02',
    prefix: '7337',
    status: 'OPERANDO',
    model: 'Toyota SW4',
    year: '2022',
    plate: 'XYZ-5678',
    odometer: 45892,
    oilInterval: 10000,
    lastOilChangeOdometer: 40000,
    color: 'tor-blue'
  }
];

const getRankIcon = (nameOrGraduation: string) => {
  const normalized = nameOrGraduation.toUpperCase();
  const v = '?v=300';
  if (normalized.includes('SUB TEN')) return `/ranks/subten.png${v}`;
  if (normalized.includes('1º SGT')) return `/ranks/1sgt.png${v}`;
  if (normalized.includes('2º SGT')) return `/ranks/2sgt.png${v}`;
  if (normalized.includes('3º SGT')) return `/ranks/3sgt.png${v}`;
  if (normalized.includes('CABO')) return `/ranks/cabo.png${v}`;
  if (normalized.includes('SOLDADO')) return `/ranks/soldado.png${v}`;
  return null;
};

const OperationalView: React.FC<{ isLoggedIn: boolean }> = ({ isLoggedIn }) => {
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [personnelList, setPersonnelList] = useState<any[]>([]);
  const [activeLeaves, setActiveLeaves] = useState<Leave[]>([]);

  // Estados de Edição
  const [editId, setEditId] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [editVehicleId, setEditVehicleId] = useState<string | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Ref para sincronização automática segura
  const vehiclesRef = useRef<Vehicle[]>([]);
  useEffect(() => {
    vehiclesRef.current = vehicles;
  }, [vehicles]);

  const fetchData = async () => {
    setLoading(true);

    // Buscar Afastamentos Ativos (para ícones)
    const today = new Date().toISOString().split('T')[0];
    const { data: leavesData } = await supabase
      .from('personnel_absences')
      .select('*, personnel:personnel_id(name, graduation)')
      .lte('start_date', today)
      .gte('end_date', today);

    if (leavesData) setActiveLeaves(leavesData);

    // Buscar Viaturas
    const { data: vData } = await supabase.from('vehicles').select('*');
    
    let mappedVehicles: Vehicle[] = [];
    if (vData && vData.length > 0) {
      mappedVehicles = vData.map(v => ({
        ...v,
        oilInterval: v.oil_interval,
        lastOilChangeOdometer: v.last_oil_change_odometer
      }));
    } else {
      mappedVehicles = initialVehicles;
      await supabase.from('vehicles').upsert(initialVehicles.map(v => ({
        id: v.id,
        model: v.model,
        year: v.year,
        status: v.status,
        plate: v.plate,
        odometer: v.odometer,
        oil_interval: v.oilInterval,
        last_oil_change_odometer: v.lastOilChangeOdometer
      })));
    }

    // SINCRONIZANDO O KM AUTOMATICAMENTE LOGO DEPOIS DE CARREGAR
    const updatedVehicles = await Promise.all(mappedVehicles.map(async (v) => {
      try {
        const latestKm = await fetchLatestVehicleKm(v.id);
        // Se achou um KM novo diferente do que está no banco atualiza automaticamente!
        if (latestKm !== null && latestKm !== v.odometer) {
          await supabase.from('vehicles').update({ odometer: latestKm }).eq('id', v.id);
          return { ...v, odometer: latestKm };
        }
      } catch (error) {
        console.error('Erro na sincronização automática:', error);
      }
      return v;
    }));

    // Ordenação fixa das viaturas em tela
    const sortedVehicles = updatedVehicles.sort((a, b) => {
      if (a.id === 'TOR 0003') return -1;
      if (b.id === 'TOR 0003') return 1;
      if (a.id === 'TOR 0004') return -1;
      if (b.id === 'TOR 0004') return 1;
      return a.id.localeCompare(b.id);
    });

    setVehicles(sortedVehicles);




    // Buscar Efetivo
    const { data: pData } = await supabase.from('personnel').select('*');
    if (pData) setPersonnelList(pData);

    // Buscar Equipes
    const { data: tData } = await supabase.from('operational_teams').select('*');
    if (tData && tData.length > 0) {
      setTeams(tData.map(t => ({
        ...t,
        members: typeof t.members === 'string' ? JSON.parse(t.members) : t.members
      })));
    } else {
      const { data: insertedData } = await supabase.from('operational_teams').insert(
        initialTeams.map(t => ({
          name: t.name,
          sector: t.sector,
          members: t.members
        }))
      ).select();

      if (insertedData) {
        setTeams(insertedData.map(t => ({
          ...t,
          members: typeof t.members === 'string' ? JSON.parse(t.members) : t.members
        })));
      } else {
        setTeams(initialTeams);
      }
    }

    setLoading(false);
  };

  useEffect(() => {
    fetchData();

    // Polling Automático de KM (a cada 60s)
    const interval = setInterval(() => {
      syncVehicleKm();
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const getMemberStatusIcon = (memberName: string) => {
    // Tenta encontrar um afastamento ativo para este nome
    const leave = activeLeaves.find(l => {
      const pName = l.personnel ? `${l.personnel.graduation} ${l.personnel.name}` : '';
      return memberName.includes(l.personnel?.name || '@@@'); // O match por nome não é ideal, mas funcional sem refatorar toda a estrutura de teams para usar IDs
    });

    if (leave) {
      if (leave.type === 'Férias') return { icon: 'beach_access', color: 'text-orange-500', bg: 'bg-orange-50' }; // Praia
      if (leave.type === 'Licença' || leave.type === 'Atestado') return { icon: 'assignment', color: 'text-purple-500', bg: 'bg-purple-50' }; // Documento
    }

    // Default: Trabalhando (Viatura)
    return { icon: 'local_police', color: 'text-emerald-500', bg: 'bg-emerald-50' };
  };

  const syncVehicleKm = async () => {
    if (vehiclesRef.current.length === 0) return;
    
    setIsSyncing(true);
    const updatedVehicles = await Promise.all(vehiclesRef.current.map(async (v) => {
      const latestKm = await fetchLatestVehicleKm(v.id);
      if (latestKm !== null && latestKm !== v.odometer) {
        await supabase.from('vehicles').update({ odometer: latestKm }).eq('id', v.id);
        return { ...v, odometer: latestKm };
      }
      return v;
    }));
    
    // Só atualiza se houver mudanças reais para evitar re-render desnecessário
    const hasChanges = updatedVehicles.some((v, idx) => v.odometer !== vehiclesRef.current[idx].odometer);
    if (hasChanges) {
      setVehicles(updatedVehicles);
    }
    setIsSyncing(false);
  };

  const handleStartEdit = (team: Team) => {
    setEditId(team.id);
    const members = [...team.members];
    const roles = ['GESTOR', 'MOTORISTA', '3º HOMEM', '4º HOMEM'];
    const fullMembers = roles.map((role, idx) => {
      return members[idx] || { name: '', role: role, icon: 'person' };
    });
    setEditingTeam({ ...team, members: fullMembers });
  };

  const handleSaveEdit = async () => {
    if (editingTeam) {
      setIsSaving(true);
      const cleanedMembers = editingTeam.members.filter(m => m.name.trim() !== '');
      const { error } = await supabase
        .from('operational_teams')
        .upsert({
          id: editingTeam.id,
          name: editingTeam.name,
          sector: editingTeam.sector,
          members: cleanedMembers
        });

      if (!error) {
        setTeams(teams.map(t => t.id === editingTeam.id ? { ...editingTeam, members: cleanedMembers } : t));
        setEditId(null);
        setEditingTeam(null);
        alert('Alterações da guarnição salvas com sucesso!');
      } else {
        alert(`Erro ao salvar: ${error.message}`);
      }
      setIsSaving(false);
    }
  };

  const handleAddNewVehicle = () => {
    const newId = `TEMP-${Date.now()}`;
    const newVehicle: Vehicle = {
      id: '',
      prefix: '',
      status: 'OPERANDO',
      model: '',
      year: new Date().getFullYear().toString(),
      plate: '',
      odometer: 0,
      oilInterval: 10000,
      lastOilChangeOdometer: 0,
      color: 'tor-blue'
    };
    
    setVehicles([ { ...newVehicle, id: newId }, ...vehicles ]);
    setEditVehicleId(newId);
    setEditingVehicle(newVehicle);
  };

  const handleStartEditVehicle = (vehicle: Vehicle) => {
    setEditVehicleId(vehicle.id);
    setEditingVehicle({ ...vehicle });
  };

  const handleSaveVehicle = async () => {
    if (editingVehicle && editVehicleId) {
      if (!editingVehicle.id) {
        alert('Por favor, informe o ID da viatura (ex: TOR-03).');
        return;
      }
      if (!editingVehicle.model || !editingVehicle.plate) {
        alert('Modelo e placa são obrigatórios.');
        return;
      }

      setIsSaving(true);
      const isNew = editVehicleId.startsWith('TEMP-');

      const { error } = await supabase
        .from('vehicles')
        .upsert({
          id: editingVehicle.id,
          model: editingVehicle.model,
          year: editingVehicle.year,
          status: editingVehicle.status,
          plate: editingVehicle.plate,
          odometer: editingVehicle.odometer,
          oil_interval: editingVehicle.oilInterval,
          last_oil_change_odometer: editingVehicle.lastOilChangeOdometer
        });

      if (!error) {
        if (isNew || editingVehicle.id !== editVehicleId) {
          fetchData();
        } else {
          setVehicles(vehicles.map(v => v.id === editVehicleId ? editingVehicle : v));
        }
        setEditVehicleId(null);
        setEditingVehicle(null);
        alert(isNew ? 'Nova viatura registrada!' : 'Dados da viatura atualizados!');
      } else {
        alert(`Erro ao salvar viatura: ${error.message}`);
      }
      setIsSaving(false);
    }
  };

  const calculateOilLife = (v: Vehicle) => {
    const baseInterval = 10000;
    const nextChange = v.lastOilChangeOdometer + v.oilInterval;
    const remainingKm = nextChange - v.odometer;
    const life = (remainingKm / baseInterval) * 100;
    return Math.max(0, Math.min(100, Math.round(life)));
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="size-16 border-4 border-tor-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-900 font-black uppercase tracking-widest text-sm">Carregando dados operacionais e afastamentos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <style>{`
        @keyframes flash-red {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.05); }
        }
        .animate-flash-red {
          animation: flash-red 0.8s ease-in-out infinite;
        }
      `}</style>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
        {teams.map((team) => (
          <div key={team.id} className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -translate-y-12 translate-x-12 opacity-50`}></div>

            <div className="flex justify-between items-start mb-8 relative z-10">
              <div className="flex gap-5 flex-1">
                <div className={`size-16 rounded-[22px] bg-blue-50 flex items-center justify-center text-tor-blue shadow-inner`}>
                  <span className="material-symbols-outlined text-4xl filled-icon">shield</span>
                </div>
                <div className="flex-1 min-w-0">
                  {editId === team.id ? (
                    <input
                      className="text-xl md:text-2xl font-black text-slate-900 leading-tight mb-1 bg-slate-50 border-none p-1 rounded-md w-full"
                      value={editingTeam?.name}
                      onChange={e => setEditingTeam(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                  ) : (
                    <h3 className="text-xl md:text-[28px] font-black text-slate-900 leading-tight mb-1 truncate">{team.name}</h3>
                  )}

                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">explore</span>
                    <div className="text-xs font-bold leading-relaxed flex-1 truncate">
                      <span className="text-slate-400 uppercase tracking-tighter mr-1">Setor: </span>
                      {editId === team.id ? (
                        <input
                          className={`bg-slate-50 border-none p-0.5 rounded-sm w-full ${team.color}`}
                          value={editingTeam?.sector}
                          onChange={e => setEditingTeam(prev => prev ? { ...prev, sector: e.target.value } : null)}
                        />
                      ) : (
                        <span className="text-tor-blue">{team.sector}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex flex-col items-end gap-2">
                {isLoggedIn && editId !== team.id && (
                  <button
                    onClick={() => handleStartEdit(team)}
                    className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-tor-blue flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-xs">edit</span> Editar
                  </button>
                )}
              </div>
            </div>

            <div className="space-y-6 relative z-10">
              <p className="text-[12px] md:text-[14px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-3 text-center">
                GUARNIÇÃO
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {(editId === team.id ? editingTeam!.members : team.members.filter(m => m.name.trim() !== '')).map((member, idx) => {
                  // Calcular ícone de status dinâmico
                  const statusInfo = getMemberStatusIcon(member.name);

                  return (
                    <div key={idx} className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200 shadow-sm transition-all group/member relative">
                      {/* Badge de Status Dinâmico */}
                      <div className={`absolute -top-2 -right-2 p-1.5 rounded-full ${statusInfo.bg} ${statusInfo.color} shadow-sm z-20`}>
                        <span className="material-symbols-outlined text-sm">{statusInfo.icon}</span>
                      </div>

                      <div className="size-9 md:size-11 rounded-full bg-white flex items-center justify-center text-slate-300 border border-slate-100 shadow-sm group-hover/member:text-slate-500 overflow-hidden transition-colors shrink-0">
                        {getRankIcon(member.name) ? (
                          <img src={getRankIcon(member.name)!} className="w-full h-full object-contain p-1" alt="rank" />
                        ) : (
                          <span className="material-symbols-outlined text-lg md:text-xl">{member.icon}</span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        {editId === team.id ? (
                          <>
                            <select
                              className="text-[10px] font-black text-slate-800 bg-white border border-slate-200 rounded px-1.5 py-1 w-full mb-1"
                              value={member.name}
                              onChange={e => {
                                const newMembers = [...editingTeam!.members];
                                newMembers[idx] = {
                                  ...newMembers[idx],
                                  name: e.target.value
                                };
                                setEditingTeam({ ...editingTeam!, members: newMembers });
                              }}
                            >
                              <option value="">REMOVER POLICIAL</option>
                              {personnelList.map((p: any) => (
                                <option key={p.id} value={`${p.graduation} ${p.name}`}>{p.graduation} {p.name}</option>
                              ))}
                            </select>
                            <input
                              className={`text-[9px] font-black text-tor-blue uppercase tracking-tight bg-white border border-slate-200 rounded px-1.5 py-1 w-full`}
                              placeholder="FUNÇÃO"
                              value={member.role}
                              onChange={e => {
                                const newMembers = [...editingTeam!.members];
                                newMembers[idx] = { ...newMembers[idx], role: e.target.value.toUpperCase() };
                                setEditingTeam({ ...editingTeam!, members: newMembers });
                              }}
                            />
                          </>
                        ) : (
                          <>
                            <p className="text-sm font-black text-slate-800">{member.name}</p>
                            <p className={`text-[9px] font-black text-tor-blue uppercase tracking-tight`}>
                              {member.role}
                            </p>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {editId === team.id && (
                <div className="flex justify-end gap-3 pt-4 border-t border-slate-50">
                  <button onClick={() => setEditId(null)} disabled={isSaving} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 disabled:opacity-50">Cancelar</button>
                  <button onClick={handleSaveEdit} disabled={isSaving} className="bg-tor-dark text-white px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all shadow-lg shadow-tor-dark/10 disabled:opacity-50 min-w-[140px]">
                    {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                  </button>
                </div>
              )}

            </div>
          </div>
        ))}
      </div>

      {/* Painel de Afastamentos */}
      <PersonnelAbsences isLoggedIn={isLoggedIn} />

      <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-8 py-6 border-b border-slate-50 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="size-10 rounded-xl bg-tor-blue/10 text-tor-blue flex items-center justify-center">
              <span className={`material-symbols-outlined text-2xl ${isSyncing ? 'animate-spin' : ''}`}>
                {isSyncing ? 'sync' : 'commute'}
              </span>
            </div>
            <div className="flex flex-col">
              <h3 className="text-slate-900 text-lg font-bold uppercase tracking-wider leading-tight">Status das Viaturas</h3>
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">
                {isSyncing ? 'Sincronizando Automaticamente...' : 'Monitoramento Automático Ativo (60s)'}
              </p>
            </div>
          </div>
          {isLoggedIn && (
            <div className="flex items-center gap-3">
              {/* Botão de sincronizar removido pois agora é automático */}
              <button
                onClick={handleAddNewVehicle}
                className="flex items-center gap-2 px-4 py-2 bg-tor-blue hover:bg-tor-dark text-white rounded-xl transition-all text-[10px] font-black uppercase tracking-widest shadow-lg shadow-tor-blue/20"
              >
                <span className="material-symbols-outlined text-sm">add</span>
                Nova Viatura
              </button>
            </div>
          )}

        </div>

        <div className="p-8 grid grid-cols-1 lg:grid-cols-2 gap-12">
          {vehicles.map((vehicle, index) => {
            const currentVehicle = editVehicleId === vehicle.id ? editingVehicle! : vehicle;
            const oilLife = calculateOilLife(currentVehicle);
            const nextChange = currentVehicle.lastOilChangeOdometer + currentVehicle.oilInterval;
            const isUrgent = currentVehicle.odometer >= nextChange;

            return (
              <div key={vehicle.id} className={`space-y-8 ${index % 2 !== 0 ? 'lg:border-l lg:border-slate-50 lg:pl-12' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    {editVehicleId === vehicle.id ? (
                      <input
                        className="bg-slate-50 border-none rounded-[12px] text-tor-blue font-black text-sm p-1.5 w-24 shadow-inner"
                        value={editingVehicle?.id}
                        onChange={e => setEditingVehicle(prev => prev ? { ...prev, id: e.target.value } : null)}
                        placeholder="ID"
                      />
                    ) : (
                      <div className={`px-4 py-1.5 rounded-xl text-white font-black text-sm shadow-lg bg-tor-blue shadow-tor-blue/20 shrink-0`}>
                        {vehicle.id}
                      </div>
                    )}

                    <div className="flex-1 min-w-0">
                      {editVehicleId === vehicle.id ? (
                        <div className="flex flex-col gap-1">
                          <input
                            className="bg-slate-50 border-none rounded text-base md:text-lg font-black text-slate-900 p-1 w-full"
                            value={editingVehicle?.model}
                            onChange={e => setEditingVehicle(prev => prev ? { ...prev, model: e.target.value } : null)}
                            placeholder="MODELO"
                          />
                          <div className="flex gap-2">
                            <input
                              className="bg-slate-50 border-none rounded text-[10px] md:text-xs font-bold text-slate-300 p-0.5 w-16"
                              value={editingVehicle?.year}
                              onChange={e => setEditingVehicle(prev => prev ? { ...prev, year: e.target.value } : null)}
                              placeholder="ANO"
                            />

                            <select
                              className="bg-slate-100 text-slate-600 border-none rounded text-[9px] md:text-[10px] font-black p-0.5 w-24"
                              value={editingVehicle?.status}
                              onChange={e => setEditingVehicle(prev => prev ? { ...prev, status: e.target.value as any } : null)}
                            >
                              <option value="OPERANDO">OPERANDO</option>
                              <option value="BAIXADA">BAIXADA</option>
                            </select>
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col min-w-0">
                          <h4 className="text-slate-900 font-black text-sm md:text-lg flex items-center flex-wrap gap-x-2">
                            <span className="truncate">{vehicle.model}</span>
                            <span className="text-slate-300 font-bold text-xs md:text-sm shrink-0">{vehicle.year}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-black shrink-0 ${vehicle.status === 'OPERANDO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {vehicle.status}
                            </span>
                          </h4>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {editVehicleId === vehicle.id ? (
                      <input
                        className="bg-slate-50 border-none rounded text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-1 w-24"
                        value={editingVehicle?.plate}
                        onChange={e => setEditingVehicle(prev => prev ? { ...prev, plate: e.target.value } : null)}
                      />
                    ) : (
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md whitespace-nowrap">{vehicle.plate}</span>
                    )}
                    {isLoggedIn && editVehicleId !== vehicle.id && (
                      <button onClick={() => handleStartEditVehicle(vehicle)} className="size-8 rounded-full bg-slate-50 text-slate-400 hover:bg-tor-blue hover:text-white flex items-center justify-center transition-all shrink-0">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {[
                    { label: 'Odômetro Atual', value: vehicle.odometer, key: 'odometer' },
                    { label: 'Próx. Troca Óleo', value: vehicle.lastOilChangeOdometer + vehicle.oilInterval, key: 'oil' },
                  ].map(item => (
                    <div key={item.label} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mb-1">{item.label}</p>
                      {editVehicleId === vehicle.id ? (
                        <input
                          type="number"
                          className="w-full bg-white border-slate-200 rounded text-sm font-black text-slate-800 p-0.5"
                          value={item.key === 'odometer' ? editingVehicle?.odometer : (editingVehicle?.lastOilChangeOdometer || 0) + (editingVehicle?.oilInterval || 0)}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            if (item.key === 'odometer') {
                              setEditingVehicle(prev => prev ? { ...prev, odometer: val } : null);
                            } else {
                              // Se editar a PRÓXIMA TROCA, atualizamos o oilInterval baseado no lastOilChangeOdometer atual
                              setEditingVehicle(prev => prev ? { ...prev, oilInterval: val - prev.lastOilChangeOdometer } : null);
                            }
                          }}
                        />
                      ) : (
                        <p className="text-sm font-black text-slate-800">{item.value.toLocaleString('pt-BR')} km</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-end px-1">
                    <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">Vida Útil do Óleo</p>
                    <p className={`text-xs font-black ${oilLife < 20 ? 'text-red-500' : 'text-tor-blue'}`}>
                      {oilLife}%
                    </p>
                  </div>
                  <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                    <div
                      className={`h-full transition-all duration-1000 rounded-full ${oilLife < 20 ? 'bg-red-500' : 'bg-gradient-to-r from-tor-blue to-sky-400'}`}
                      style={{ width: `${oilLife}%` }}
                    ></div>
                  </div>

                  {isUrgent ? (
                    <div className="flex flex-col items-center gap-1 pt-1">
                      <p className="text-[11px] font-black text-red-600 uppercase tracking-widest animate-flash-red">
                        ⚠️ TROCAR DE ÓLEO URGENTE ⚠️
                      </p>
                      <p className="text-[8px] text-red-500 font-bold uppercase tracking-tighter">
                        Vencido por {(currentVehicle.odometer - (currentVehicle.lastOilChangeOdometer + currentVehicle.oilInterval)).toLocaleString('pt-BR')} km
                      </p>
                    </div>
                  ) : (
                    <p className="text-[8px] text-slate-400 font-bold uppercase text-center tracking-tighter">
                      {Math.max(0, (currentVehicle.lastOilChangeOdometer + currentVehicle.oilInterval) - currentVehicle.odometer).toLocaleString('pt-BR')} km restantes para troca
                    </p>
                  )}
                </div>

                {editVehicleId === vehicle.id && (
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => {
                      if (editVehicleId?.startsWith('TEMP-')) {
                        setVehicles(vehicles.filter(v => v.id !== editVehicleId));
                      }
                      setEditVehicleId(null);
                      setEditingVehicle(null);
                    }} disabled={isSaving} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 disabled:opacity-50">Cancelar</button>
                    <button onClick={handleSaveVehicle} disabled={isSaving} className="bg-tor-dark text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-800 transition-all disabled:opacity-50 min-w-[120px]">
                      {isSaving ? 'Salvando...' : 'Salvar Viatura'}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OperationalView;

