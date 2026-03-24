import React, { useState, useEffect } from 'react';
import { fetchLatestVehicleKm } from '../services/sheetsService';
import { supabase } from '../lib/supabase';
import PersonnelAbsences from '../components/PersonnelAbsences';



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
  status: 'OPERANDO' | 'BAIXADA'; // Novo: status de operação
  model: string;
  year: string;
  plate: string;
  odometer: number;
  oilInterval: number;
  lastOilChangeOdometer: number;
  tiresInterval: number;
  lastTiresChangeOdometer: number;
  brakesInterval: number;
  lastBrakesChangeOdometer: number;
  color: string;
}

interface PersonnelAbsence {
  id?: string;
  personnel_id: string;
  type: string;
  start_date: string;
  end_date: string;
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
    tiresInterval: 60000,
    lastTiresChangeOdometer: 10000,
    brakesInterval: 40000,
    lastBrakesChangeOdometer: 10000,
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
    tiresInterval: 60000,
    lastTiresChangeOdometer: 40000,
    brakesInterval: 40000,
    lastBrakesChangeOdometer: 40000,
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
  const [activeAbsences, setActiveAbsences] = useState<PersonnelAbsence[]>([]);

  const fetchData = async () => {
    setLoading(true);

       // Buscar Viaturas
    const { data: vData } = await supabase.from('vehicles').select('*');
    
    let mappedVehicles: Vehicle[] = [];
    if (vData && vData.length > 0) {
      mappedVehicles = vData.map(v => ({
        ...v,
        oilInterval: v.oil_interval,
        lastOilChangeOdometer: v.last_oil_change_odometer,
        tiresInterval: v.tires_interval || 60000,
        lastTiresChangeOdometer: v.last_tires_change_odometer || v.odometer,
        brakesInterval: v.brakes_interval || 40000,
        lastBrakesChangeOdometer: v.last_brakes_change_odometer || v.odometer
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
        last_oil_change_odometer: v.lastOilChangeOdometer,
        tires_interval: v.tiresInterval,
        last_tires_change_odometer: v.lastTiresChangeOdometer,
        brakes_interval: v.brakesInterval,
        last_brakes_change_odometer: v.lastBrakesChangeOdometer
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

    // Buscar Afastamentos Ativos
    const today = new Date().toISOString().split('T')[0];
    const { data: aData } = await supabase.from('personnel_absences')
      .select('*')
      .lte('start_date', today)
      .gte('end_date', today);
    if (aData) setActiveAbsences(aData);

    // Buscar Equipes
    const { data: tData } = await supabase.from('operational_teams').select('*');
    if (tData && tData.length > 0) {
      setTeams(tData.map(t => ({
        ...t,
        members: typeof t.members === 'string' ? JSON.parse(t.members) : t.members
      })));
    } else {
      // Se banco vazio, cria as iniciais e já pega os IDs reais (UUIDs) de volta
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
  }, []);



  const [editId, setEditId] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);

  const [editVehicleId, setEditVehicleId] = useState<string | null>(null);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);



  // Função para sincronizar KM da planilha
  const syncVehicleKm = async () => {
    setIsSyncing(true);
    const updatedVehicles = await Promise.all(vehicles.map(async (v) => {
      const latestKm = await fetchLatestVehicleKm(v.id);
      if (latestKm !== null) {
        // Atualizar no Supabase
        await supabase.from('vehicles').update({ odometer: latestKm }).eq('id', v.id);
        return { ...v, odometer: latestKm };
      }
      return v;
    }));

    // Re-ordenar após atualização
    const sortedUpdated = updatedVehicles.sort((a, b) => {
      if (a.id === 'TOR 0003') return -1;
      if (b.id === 'TOR 0003') return 1;
      if (a.id === 'TOR 0004') return -1;
      if (b.id === 'TOR 0004') return 1;
      return a.id.localeCompare(b.id);
    });

    setVehicles(sortedUpdated);
    setIsSyncing(false);
  };



  const handleStartEdit = (team: Team) => {
    setEditId(team.id);
    const members = [...team.members];
    const roles = ['GESTOR', 'MOTORISTA', '3º HOMEM', '4º HOMEM'];

    // Garante 4 slots para edição
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
        console.error('Erro ao salvar equipe:', error);
        alert(`Erro ao salvar no banco de dados: ${error.message}`);
      }
      setIsSaving(false);
    }
  };




  const handleStartEditVehicle = (vehicle: Vehicle) => {
    setEditVehicleId(vehicle.id);
    setEditingVehicle({ ...vehicle });
  };


  const handleSaveVehicle = async () => {
    if (editingVehicle && editVehicleId) {
      setIsSaving(true);
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
          last_oil_change_odometer: editingVehicle.lastOilChangeOdometer,
          tires_interval: editingVehicle.tiresInterval,
          last_tires_change_odometer: editingVehicle.lastTiresChangeOdometer,
          brakes_interval: editingVehicle.brakesInterval,
          last_brakes_change_odometer: editingVehicle.lastBrakesChangeOdometer
        });

      if (!error) {
        if (editingVehicle.id !== editVehicleId) {
          fetchData();
        } else {
          const newVehicles = vehicles.map(v => v.id === editVehicleId ? editingVehicle : v);
          const sortedNew = newVehicles.sort((a, b) => {
            if (a.id === 'TOR 0003') return -1;
            if (b.id === 'TOR 0003') return 1;
            if (a.id === 'TOR 0004') return -1;
            if (b.id === 'TOR 0004') return 1;
            return a.id.localeCompare(b.id);
          });
          setVehicles(sortedNew);
        }
        setEditVehicleId(null);
        setEditingVehicle(null);
        alert('Dados da viatura atualizados!');
      } else {
        console.error('Erro ao salvar viatura:', error);
        alert(`Erro ao salvar viatura: ${error.message}`);
      }
      setIsSaving(false);
    }
  };





  const calculateLife = (lastChangeOdo: number, interval: number, currentOdo: number) => {
    const nextChangeKm = lastChangeOdo + interval;
    const remainingKm = nextChangeKm - currentOdo;
    const life = (remainingKm / interval) * 100;
    return Math.max(0, Math.min(100, Math.round(life || 0)));
  };


  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="size-16 border-4 border-tor-blue border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-900 font-black uppercase tracking-widest text-sm">Sincronizando com o Supabase...</p>
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
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
        {teams.map((team) => (
          <div key={team.id} className="bg-white rounded-[24px] md:rounded-[32px] p-5 md:p-8 border border-slate-100 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all duration-500">
            <div className={`absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -translate-y-12 translate-x-12 opacity-50`}></div>

            <div className="flex justify-between items-start mb-6 md:mb-8 relative z-10">
              <div className="flex gap-3 md:gap-5 flex-1">
                <div className={`size-12 md:size-16 rounded-[18px] md:rounded-[22px] bg-blue-50 flex items-center justify-center text-tor-blue shadow-inner shrink-0`}>
                  <span className="material-symbols-outlined text-2xl md:text-4xl filled-icon">shield</span>
                </div>
                <div className="flex-1">
                  {editId === team.id ? (
                    <input
                      className="text-xl font-black text-slate-900 leading-tight mb-1 bg-slate-50 border-none p-1 rounded-md w-full"
                      value={editingTeam?.name}
                      onChange={e => setEditingTeam(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                  ) : (
                    <h3 className="text-lg md:text-xl font-black text-slate-900 leading-tight mb-0.5">{team.name}</h3>
                  )}

                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-slate-400 text-lg mt-0.5">explore</span>
                    <div className="text-xs font-bold leading-relaxed flex-1">
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

            <div className="space-y-4 relative z-10">
              <p className="text-[10px] md:text-[11px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-2 text-center">
                GUARNIÇÃO
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-4">
                {(editId === team.id ? editingTeam!.members : team.members.filter(m => m.name.trim() !== '')).map((member, idx) => {
                  return (


                    <div key={idx} className="flex items-center gap-3 p-3 rounded-xl bg-white border border-slate-200 shadow-sm transition-all group/member">
                      <div className="size-9 rounded-full bg-white flex items-center justify-center text-slate-300 border border-slate-100 shadow-sm group-hover/member:text-slate-500 overflow-hidden transition-colors">
                        {getRankIcon(member.name) ? (
                          <img src={getRankIcon(member.name)!} className="w-full h-full object-contain p-1" alt="rank" />
                        ) : (
                          <span className="material-symbols-outlined text-xl">{member.icon}</span>
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
                              {personnelList.map((p: any) => {
                                const isAbsent = activeAbsences.find(a => a.personnel_id === p.id);
                                return (
                                  <option 
                                    key={p.id} 
                                    value={`${p.graduation} ${p.name}`}
                                    disabled={!!isAbsent}
                                    style={isAbsent ? { color: '#ef4444' } : {}}
                                  >
                                    {p.graduation} {p.name} {isAbsent ? `(Afastado: ${isAbsent.type})` : ''}
                                  </option>
                                );
                              })}


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
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Sincronizado com Google Sheets</p>
            </div>
          </div>
          {/* Botão de sincronizar removido pois agora é automático */}

        </div>

        <div className="p-3 md:p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-8">
          {vehicles.map((vehicle) => {
            const currentVehicle = editVehicleId === vehicle.id ? editingVehicle! : vehicle;
            const oilLife = calculateLife(currentVehicle.lastOilChangeOdometer, currentVehicle.oilInterval, currentVehicle.odometer);
            const tiresLife = calculateLife(currentVehicle.lastTiresChangeOdometer, currentVehicle.tiresInterval, currentVehicle.odometer);
            const brakesLife = calculateLife(currentVehicle.lastBrakesChangeOdometer, currentVehicle.brakesInterval, currentVehicle.odometer);
            
            const nextChange = (currentVehicle.lastOilChangeOdometer || 0) + (currentVehicle.oilInterval || 0);
            const remainingKm = nextChange - (currentVehicle.odometer || 0);
            const isUrgent = remainingKm <= 500 || ( (currentVehicle.lastTiresChangeOdometer + currentVehicle.tiresInterval) - currentVehicle.odometer <= 500 ) || ( (currentVehicle.lastBrakesChangeOdometer + currentVehicle.brakesInterval) - currentVehicle.odometer <= 500 );

            return (
              <div key={vehicle.id} className={`space-y-4 md:space-y-6 ${vehicle.id === 'TOR-02' ? 'lg:border-l lg:border-slate-50 lg:pl-8' : ''}`}>
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
                      <div className={`px-4 py-1.5 rounded-xl text-white font-black text-sm shadow-lg bg-tor-blue shadow-tor-blue/20`}>
                        {vehicle.id}
                      </div>
                    )}

                    <div>
                      {editVehicleId === vehicle.id ? (
                        <div className="flex flex-col gap-1">
                          <input
                            className="bg-slate-50 border-none rounded text-base md:text-lg font-black text-slate-900 p-1 w-32"
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
                        <div className="flex flex-col">
                          <h4 className="text-slate-900 font-black text-base md:text-lg">
                            {vehicle.model}
                            <span className="text-slate-300 font-bold text-xs md:text-sm ml-2">{vehicle.year}</span>
                            <span className={`ml-3 px-2 py-0.5 rounded-full text-[8px] md:text-[9px] font-black ${vehicle.status === 'OPERANDO' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                              {vehicle.status}
                            </span>
                          </h4>
                        </div>

                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    {editVehicleId === vehicle.id ? (
                      <input
                        className="bg-slate-50 border-none rounded text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 py-1 w-24"
                        value={editingVehicle?.plate}
                        onChange={e => setEditingVehicle(prev => prev ? { ...prev, plate: e.target.value } : null)}
                      />
                    ) : (
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-md">{vehicle.plate}</span>
                    )}
                    {isLoggedIn && editVehicleId !== vehicle.id && (
                      <button onClick={() => handleStartEditVehicle(vehicle)} className="size-8 rounded-full bg-slate-50 text-slate-400 hover:bg-tor-blue hover:text-white flex items-center justify-center transition-all">
                        <span className="material-symbols-outlined text-sm">edit</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3">
                  {[
                    { label: 'Odômetro', value: vehicle.odometer, key: 'odometer', currentVal: editingVehicle?.odometer },
                    { label: 'Próx. Óleo', value: vehicle.lastOilChangeOdometer + vehicle.oilInterval, key: 'oil', currentVal: (editingVehicle?.lastOilChangeOdometer || 0) + (editingVehicle?.oilInterval || 0)},
                    { label: 'Próx. Pneus', value: vehicle.lastTiresChangeOdometer + vehicle.tiresInterval, key: 'tires', currentVal: (editingVehicle?.lastTiresChangeOdometer || 0) + (editingVehicle?.tiresInterval || 0)},
                    { label: 'Próx. Freio', value: vehicle.lastBrakesChangeOdometer + vehicle.brakesInterval, key: 'brakes', currentVal: (editingVehicle?.lastBrakesChangeOdometer || 0) + (editingVehicle?.brakesInterval || 0)}
                  ].map(item => (
                    <div key={item.label} className="p-2 md:p-3 bg-slate-50 rounded-xl border border-slate-100">
                      <p className="text-[8px] md:text-[9px] text-slate-400 uppercase font-black tracking-tighter mb-1">{item.label}</p>
                      {editVehicleId === vehicle.id ? (
                        <input
                          type="number"
                          className="w-full bg-white border-slate-200 rounded text-[10px] md:text-sm font-black text-slate-800 p-0.5"
                          value={item.currentVal || 0}
                          onChange={e => {
                            const val = parseInt(e.target.value) || 0;
                            setEditingVehicle(prev => {
                                if(!prev) return null;
                                if (item.key === 'odometer') return { ...prev, odometer: val };
                                if (item.key === 'oil') return { ...prev, oilInterval: val - prev.lastOilChangeOdometer };
                                if (item.key === 'tires') return { ...prev, tiresInterval: val - prev.lastTiresChangeOdometer };
                                if (item.key === 'brakes') return { ...prev, brakesInterval: val - prev.lastBrakesChangeOdometer };
                                return prev;
                            });
                          }}
                        />
                      ) : (
                        <p className="text-[10px] md:text-sm font-black text-slate-800">{item.value.toLocaleString('pt-BR')} km</p>
                      )}
                    </div>
                  ))}
                </div>

                <div className="space-y-4">
                  {[
                    {label: 'Óleo Motor', life: oilLife, rem: (currentVehicle.lastOilChangeOdometer + currentVehicle.oilInterval) - currentVehicle.odometer},
                    {label: 'Pneus', life: tiresLife, rem: (currentVehicle.lastTiresChangeOdometer + currentVehicle.tiresInterval) - currentVehicle.odometer},
                    {label: 'Freios', life: brakesLife, rem: (currentVehicle.lastBrakesChangeOdometer + currentVehicle.brakesInterval) - currentVehicle.odometer}
                  ].map(stat => (
                      <div key={stat.label} className="space-y-1">
                        <div className="flex justify-between items-end px-1">
                          <p className="text-[9px] text-slate-500 font-black uppercase tracking-widest">{stat.label}</p>
                          <div className="flex items-baseline gap-2">
                             <p className={`text-[8px] font-bold ${stat.rem <= 500 ? 'text-red-500 animate-pulse' : 'text-slate-400'}`}>{Math.max(0, stat.rem).toLocaleString('pt-BR')} km</p>
                             <p className={`text-[10px] font-black ${stat.life < 20 ? 'text-red-500' : 'text-tor-blue'}`}>{stat.life}%</p>
                          </div>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner">
                          <div className={`h-full transition-all duration-1000 rounded-full ${stat.life < 20 ? 'bg-red-500' : 'bg-gradient-to-r from-tor-blue to-sky-400'}`} style={{ width: `${stat.life}%` }}></div>
                        </div>
                      </div>
                  ))}
                  
                  {isUrgent && (
                    <div className="flex flex-col items-center gap-1 pt-2">
                      <p className="text-[10px] font-black text-red-600 uppercase tracking-widest animate-flash-red text-center leading-tight">
                        ⚠️ MANUTENÇÃO CRÍTICA NECESSÁRIA ⚠️
                      </p>
                    </div>
                  )}
                </div>

                {editVehicleId === vehicle.id && (
                  <div className="flex justify-end gap-3 pt-2">
                    <button onClick={() => setEditVehicleId(null)} disabled={isSaving} className="text-[10px] font-black uppercase tracking-widest text-slate-400 hover:text-slate-600 disabled:opacity-50">Cancelar</button>
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
