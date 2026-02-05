
import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { authService } from '../services/authService';
import type { UserProfile } from '../types';


interface Personnel {
  id: string;
  name: string;
  graduation: string;
}

const graduations = ['SOLDADO', 'CABO', '3º SGT', '2º SGT', '1º SGT', 'SUB TEN'];

const SettingsView: React.FC<{ isLoggedIn: boolean; userProfile: UserProfile | null }> = ({ isLoggedIn, userProfile }) => {

  const [activeTab, setActiveTab] = useState<'profile' | 'system' | 'security'>('profile');
  const [loading, setLoading] = useState(true);
  const [personnelList, setPersonnelList] = useState<Personnel[]>([]);
  const [newPerson, setNewPerson] = useState<Omit<Personnel, 'id'>>({ name: '', graduation: 'SOLDADO' });

  // Estados para gerenciamento de usuários
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Estados para cadastro de novo usuário
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserFullName, setNewUserFullName] = useState('');
  const [newUserRole, setNewUserRole] = useState<'admin' | 'editor' | 'viewer'>('viewer');
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [userCreationError, setUserCreationError] = useState('');

  // Estados para alteração de senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState(false);
  const [passwordUpdateError, setPasswordUpdateError] = useState('');
  const [passwordUpdateSuccess, setPasswordUpdateSuccess] = useState(false);

  const isAdmin = userProfile?.role === 'admin';


  const fetchPersonnel = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('personnel')
      .select('*')
      .order('graduation', { ascending: true });

    if (!error && data) {
      setPersonnelList(data);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    setLoadingUsers(true);
    const usersList = await authService.getAllUsers();
    setUsers(usersList);
    setLoadingUsers(false);
  };

  useEffect(() => {
    fetchPersonnel();
    if (isLoggedIn && isAdmin) {
      fetchUsers();
    }
  }, [isLoggedIn, isAdmin]);

  const handleAddPersonnel = async () => {
    if (newPerson.name.trim()) {
      const { data, error } = await supabase
        .from('personnel')
        .insert([{
          name: newPerson.name.toUpperCase(),
          graduation: newPerson.graduation
        }])
        .select();

      if (!error) {
        setPersonnelList(prev => [...prev, data[0]]);
        setNewPerson({ name: '', graduation: 'SOLDADO' });
      }
    }
  };

  const handleDeletePersonnel = async (id: string) => {
    if (confirm('Deseja remover este policial do efetivo?')) {
      const { error } = await supabase
        .from('personnel')
        .delete()
        .eq('id', id);

      if (!error) {
        setPersonnelList(personnelList.filter(p => p.id !== id));
      }
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setUserCreationError('');
    setIsCreatingUser(true);

    try {
      const { error } = await authService.signUp({
        email: newUserEmail,
        password: newUserPassword,
        fullName: newUserFullName,
        role: newUserRole,
      });

      if (error) {
        setUserCreationError(error.message || 'Erro ao criar usuário');
        setIsCreatingUser(false);
        return;
      }

      // Recarregar lista de usuários
      await fetchUsers();
      setNewUserEmail('');
      setNewUserPassword('');
      setNewUserFullName('');
      setNewUserRole('viewer');
      setUserCreationError('');
    } catch (err) {
      setUserCreationError('Erro inesperado ao criar usuário');
    } finally {
      setIsCreatingUser(false);
    }
  };

  const handleToggleUserActive = async (userId: string, currentStatus: boolean) => {
    setUpdatingUserId(userId);
    const success = await authService.toggleUserActive(userId, !currentStatus);
    if (success) {
      setUsers(users.map(u => u.id === userId ? { ...u, is_active: !currentStatus } : u));
    }
    setUpdatingUserId(null);
  };

  const handleUpdateUserRole = async (userId: string, newRole: 'admin' | 'editor' | 'viewer') => {
    setUpdatingUserId(userId);
    const success = await authService.updateUserRole(userId, newRole);
    if (success) {
      setUsers(users.map(u => u.id === userId ? { ...u, role: newRole } : u));
    }
    setUpdatingUserId(null);
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('Tem certeza que deseja deletar este usuário? Esta ação é irreversível.')) return;

    setUpdatingUserId(userId);
    const success = await authService.deleteUser(userId);
    if (success) {
      setUsers(users.filter(u => u.id !== userId));
    }
    setUpdatingUserId(null);
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordUpdateError('');
    setPasswordUpdateSuccess(false);

    if (newPassword !== confirmPassword) {
      setPasswordUpdateError('As senhas não coincidem');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordUpdateError('A senha deve ter no mínimo 6 caracteres');
      return;
    }

    setIsUpdatingPassword(true);

    try {
      const { error } = await authService.updatePassword(newPassword);

      if (error) {
        setPasswordUpdateError(error.message || 'Erro ao atualizar senha');
        setIsUpdatingPassword(false);
        return;
      }

      setPasswordUpdateSuccess(true);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setTimeout(() => setPasswordUpdateSuccess(false), 5000);
    } catch (err) {
      setPasswordUpdateError('Erro inesperado ao atualizar senha');
    } finally {
      setIsUpdatingPassword(false);
    }
  };


  const getRankIcon = (graduation: string) => {
    const g = graduation.toUpperCase();
    const v = '?v=300';
    if (g.includes('SUB TEN')) return `/ranks/subten.png${v}`;
    if (g.includes('1º SGT')) return `/ranks/1sgt.png${v}`;
    if (g.includes('2º SGT')) return `/ranks/2sgt.png${v}`;
    if (g.includes('3º SGT')) return `/ranks/3sgt.png${v}`;
    if (g.includes('CABO')) return `/ranks/cabo.png${v}`;
    if (g.includes('SOLDADO')) return `/ranks/soldado.png${v}`;
    return null;
  };

  const getRoleIcon = (role: string) => {
    if (role === 'admin') return 'admin_panel_settings';
    if (role === 'editor') return 'edit';
    return 'visibility';
  };

  const getRoleColor = (role: string) => {
    if (role === 'admin') return 'text-purple-600 bg-purple-50 border-purple-200';
    if (role === 'editor') return 'text-blue-600 bg-blue-50 border-blue-200';
    return 'text-slate-600 bg-slate-50 border-slate-200';
  };

  const getRoleLabel = (role: string) => {
    if (role === 'admin') return 'Administrador';
    if (role === 'editor') return 'Editor';
    return 'Visualizador';
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col md:flex-row gap-8">
        {/* Navigation Sidebar for Settings */}
        <div className="w-full md:w-64 shrink-0 space-y-2">
          {[
            { id: 'profile', label: 'Cadastro do Efetivo', icon: 'badge' },
            { id: 'system', label: 'Preferências do Sistema', icon: 'settings_suggest' },
            { id: 'security', label: 'Segurança e Usuários', icon: 'lock' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`w-full flex items-center gap-3 px-5 py-4 rounded-2xl transition-all border ${activeTab === tab.id
                ? 'bg-tor-dark text-white border-tor-dark shadow-lg shadow-tor-dark/20 font-bold'
                : 'bg-white text-slate-500 border-slate-100 hover:border-slate-300 hover:bg-slate-50'
                }`}
            >
              <span className={`material-symbols-outlined text-xl ${activeTab === tab.id ? 'filled-icon' : ''}`}>
                {tab.icon}
              </span>
              <span className="text-sm tracking-tight">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 space-y-6">
          {activeTab === 'profile' && (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-8 border-b border-slate-50 flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-tor-blue/10 text-tor-blue flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">badge</span>
                </div>
                <div>
                  <h3 className="text-slate-900 text-lg font-bold uppercase tracking-wider">Cadastro do Efetivo</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Gerencie os policiais que trabalham no TOR</p>
                </div>
              </div>

              <div className="p-8 space-y-8">
                {isLoggedIn && (
                  <div className="bg-slate-50 p-6 rounded-3xl border border-slate-100 space-y-4">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Novo Policial</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome de Guerra</label>
                        <input
                          className="w-full h-12 px-4 rounded-xl bg-white border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-tor-blue/20 focus:border-tor-blue transition-all"
                          placeholder="EX: SILVA"
                          value={newPerson.name}
                          onChange={e => setNewPerson({ ...newPerson, name: e.target.value })}
                        />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Graduação</label>
                        <select
                          className="w-full h-12 px-4 rounded-xl bg-white border border-slate-200 text-sm font-bold focus:ring-2 focus:ring-tor-blue/20 focus:border-tor-blue transition-all"
                          value={newPerson.graduation}
                          onChange={e => setNewPerson({ ...newPerson, graduation: e.target.value })}
                        >
                          {graduations.map(g => <option key={g} value={g}>{g}</option>)}
                        </select>
                      </div>
                      <div className="flex items-end">
                        <button
                          onClick={handleAddPersonnel}
                          className="w-full h-12 bg-tor-blue text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-tor-blue/20 hover:bg-sky-600 transition-all flex items-center justify-center gap-2"
                        >
                          <span className="material-symbols-outlined text-sm">add</span> Cadastrar
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Policiais Cadastrados ({personnelList.length})</p>

                  {loading ? (
                    <div className="flex justify-center py-12">
                      <div className="size-8 border-4 border-tor-blue border-t-transparent rounded-full animate-spin"></div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {personnelList.map((person) => {
                        const rankIcon = getRankIcon(person.graduation);
                        return (
                          <div key={person.id} className="bg-white p-5 rounded-2xl border border-slate-100 flex items-center justify-between group hover:border-tor-accent/30 transition-all">
                            <div className="flex items-center gap-4">
                              <div className="size-12 rounded-full overflow-hidden flex items-center justify-center bg-slate-50 border border-slate-100">
                                {rankIcon ? (
                                  <img src={rankIcon} alt={person.graduation} className="w-full h-full object-contain p-1" />
                                ) : (
                                  <span className="material-symbols-outlined text-xl text-slate-400">person</span>
                                )}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-800">{person.name}</p>
                                <p className="text-[9px] font-black text-tor-blue uppercase tracking-tighter">{person.graduation}</p>
                              </div>
                            </div>
                            {isLoggedIn && (
                              <button
                                onClick={() => handleDeletePersonnel(person.id)}
                                className="size-8 rounded-full text-slate-300 hover:text-red-500 hover:bg-red-50 transition-all flex items-center justify-center"
                              >
                                <span className="material-symbols-outlined text-sm">delete</span>
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
              <div className="p-8 border-b border-slate-50 flex items-center gap-4">
                <div className="size-12 rounded-2xl bg-tor-blue/10 text-tor-blue flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">settings_suggest</span>
                </div>
                <div>
                  <h3 className="text-slate-900 text-lg font-bold uppercase tracking-wider">Preferências do Sistema</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Configure sua experiência de uso</p>
                </div>
              </div>
              <div className="p-8 space-y-6">
                {[
                  { id: 'ai', title: 'Assistência de IA Ativa', desc: 'Permite que o Gemini analise dados em tempo real para gerar insights operacionais.', icon: 'auto_awesome', active: true },
                  { id: 'notif', title: 'Notificações Críticas', desc: 'Receber alertas sonoros e visuais para ocorrências de alta prioridade.', icon: 'notifications_active', active: true },
                  { id: 'stats', title: 'Auto-refresh de Estatísticas', desc: 'Atualizar os gráficos de produtividade a cada 5 minutos automaticamente.', icon: 'sync', active: false },
                ].map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-6 bg-slate-50/50 rounded-2xl border border-slate-100 group hover:bg-white hover:border-slate-200 transition-all">
                    <div className="flex gap-4">
                      <div className="size-12 rounded-xl bg-white flex items-center justify-center text-slate-400 border border-slate-100 group-hover:text-tor-blue transition-colors">
                        <span className="material-symbols-outlined text-2xl">{item.icon}</span>
                      </div>
                      <div>
                        <p className="text-sm font-black text-slate-800">{item.title}</p>
                        <p className="text-xs text-slate-400 font-medium leading-relaxed max-w-sm">{item.desc}</p>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" defaultChecked={item.active} />
                      <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-tor-blue"></div>
                    </label>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              {/* Gerenciamento de Usuários - Apenas para Admins */}
              {isAdmin && (
                <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
                  <div className="p-8 border-b border-slate-50 flex items-center gap-4">
                    <div className="size-12 rounded-2xl bg-purple-100 text-purple-600 flex items-center justify-center">
                      <span className="material-symbols-outlined text-2xl">group</span>
                    </div>
                    <div>
                      <h3 className="text-slate-900 text-lg font-bold uppercase tracking-wider">Gerenciamento de Usuários</h3>
                      <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Controle quem pode acessar o sistema</p>
                    </div>
                  </div>

                  <div className="p-8 space-y-8">
                    {/* Formulário de Cadastro */}
                    <form onSubmit={handleCreateUser} className="bg-gradient-to-br from-purple-50 to-blue-50 p-6 rounded-3xl border border-purple-100 space-y-4">
                      <p className="text-[10px] font-black text-purple-600 uppercase tracking-widest ml-1">Cadastrar Novo Usuário</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                          <input
                            required
                            type="text"
                            className="w-full h-12 px-4 rounded-xl bg-white border border-purple-200 text-sm font-bold focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                            placeholder="Ex: João Silva"
                            value={newUserFullName}
                            onChange={e => setNewUserFullName(e.target.value)}
                            disabled={isCreatingUser}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                          <input
                            required
                            type="email"
                            className="w-full h-12 px-4 rounded-xl bg-white border border-purple-200 text-sm font-bold focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                            placeholder="usuario@exemplo.com"
                            value={newUserEmail}
                            onChange={e => setNewUserEmail(e.target.value)}
                            disabled={isCreatingUser}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Inicial</label>
                          <input
                            required
                            type="password"
                            minLength={6}
                            className="w-full h-12 px-4 rounded-xl bg-white border border-purple-200 text-sm font-bold focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                            placeholder="Mínimo 6 caracteres"
                            value={newUserPassword}
                            onChange={e => setNewUserPassword(e.target.value)}
                            disabled={isCreatingUser}
                          />
                        </div>
                        <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Permissão</label>
                          <select
                            className="w-full h-12 px-4 rounded-xl bg-white border border-purple-200 text-sm font-bold focus:ring-2 focus:ring-purple-200 focus:border-purple-400 transition-all"
                            value={newUserRole}
                            onChange={e => setNewUserRole(e.target.value as any)}
                            disabled={isCreatingUser}
                          >
                            <option value="viewer">Visualizador</option>
                            <option value="editor">Editor</option>
                            <option value="admin">Administrador</option>
                          </select>
                        </div>
                      </div>

                      {userCreationError && (
                        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-bold animate-shake">
                          {userCreationError}
                        </div>
                      )}

                      <button
                        type="submit"
                        disabled={isCreatingUser}
                        className={`w-full h-12 bg-purple-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-purple-600/20 ${isCreatingUser ? 'opacity-50 cursor-not-allowed' : 'hover:bg-purple-700'} transition-all flex items-center justify-center gap-2`}
                      >
                        {isCreatingUser ? (
                          <>
                            <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                            Criando...
                          </>
                        ) : (
                          <>
                            <span className="material-symbols-outlined text-sm">person_add</span>
                            Cadastrar Usuário
                          </>
                        )}
                      </button>
                    </form>

                    {/* Lista de Usuários */}
                    <div className="space-y-4">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Usuários Cadastrados ({users.length})</p>

                      {loadingUsers ? (
                        <div className="flex justify-center py-12">
                          <div className="size-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {users.map((user) => (
                            <div key={user.id} className={`bg-white p-5 rounded-2xl border transition-all ${user.is_active ? 'border-slate-100' : 'border-red-200 bg-red-50/50'} ${updatingUserId === user.id ? 'opacity-50 pointer-events-none' : ''}`}>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-4 flex-1">
                                  <div className={`size-12 rounded-full flex items-center justify-center border ${getRoleColor(user.role)}`}>
                                    <span className="material-symbols-outlined text-xl">{getRoleIcon(user.role)}</span>
                                  </div>
                                  <div className="flex-1">
                                    <p className="text-sm font-black text-slate-800">{user.full_name || 'Sem nome'}</p>
                                    <p className="text-xs text-slate-500 font-medium">{user.email}</p>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <select
                                      value={user.role}
                                      onChange={(e) => handleUpdateUserRole(user.id, e.target.value as any)}
                                      disabled={user.id === userProfile?.id}
                                      className={`h-9 px-3 rounded-lg text-xs font-bold border ${getRoleColor(user.role)} focus:ring-2 focus:ring-purple-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
                                    >
                                      <option value="admin">Administrador</option>
                                      <option value="editor">Editor</option>
                                      <option value="viewer">Visualizador</option>
                                    </select>

                                    <button
                                      onClick={() => handleToggleUserActive(user.id, user.is_active)}
                                      disabled={user.id === userProfile?.id}
                                      className={`h-9 px-3 rounded-lg text-xs font-bold transition-all flex items-center gap-1 disabled:opacity-50 disabled:cursor-not-allowed ${user.is_active ? 'bg-green-50 text-green-600 border border-green-200 hover:bg-green-100' : 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100'}`}
                                    >
                                      <span className="material-symbols-outlined text-sm">{user.is_active ? 'check_circle' : 'cancel'}</span>
                                      {user.is_active ? 'Ativo' : 'Inativo'}
                                    </button>

                                    {user.id !== userProfile?.id && (
                                      <button
                                        onClick={() => handleDeleteUser(user.id)}
                                        className="size-9 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 border border-transparent hover:border-red-200 transition-all flex items-center justify-center"
                                      >
                                        <span className="material-symbols-outlined text-sm">delete</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Alteração de Senha */}
              <div className="bg-white rounded-[32px] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in duration-300">
                <div className="p-8 border-b border-slate-50 flex items-center gap-4">
                  <div className="size-12 rounded-2xl bg-tor-blue/10 text-tor-blue flex items-center justify-center">
                    <span className="material-symbols-outlined text-2xl">lock</span>
                  </div>
                  <div>
                    <h3 className="text-slate-900 text-lg font-bold uppercase tracking-wider">Alterar Senha</h3>
                    <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Atualize sua senha de acesso</p>
                  </div>
                </div>
                <form onSubmit={handleUpdatePassword} className="p-8 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Mínimo 6 caracteres"
                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-tor-blue/20 focus:border-tor-blue transition-all"
                        value={newPassword}
                        onChange={e => setNewPassword(e.target.value)}
                        disabled={isUpdatingPassword}
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        placeholder="Digite novamente"
                        className="w-full h-12 px-4 rounded-xl bg-slate-50 border border-slate-200 text-sm focus:ring-2 focus:ring-tor-blue/20 focus:border-tor-blue transition-all"
                        value={confirmPassword}
                        onChange={e => setConfirmPassword(e.target.value)}
                        disabled={isUpdatingPassword}
                      />
                    </div>
                  </div>

                  {passwordUpdateError && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-600 font-bold animate-shake">
                      {passwordUpdateError}
                    </div>
                  )}

                  {passwordUpdateSuccess && (
                    <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-xs text-green-600 font-bold flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">check_circle</span>
                      Senha atualizada com sucesso!
                    </div>
                  )}

                  <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 flex gap-4">
                    <span className="material-symbols-outlined text-amber-500 text-2xl">info</span>
                    <div className="text-xs text-amber-800 font-medium leading-relaxed">
                      A nova senha deve conter pelo menos 6 caracteres para garantir a segurança do sistema.
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      disabled={isUpdatingPassword}
                      className={`bg-tor-dark text-white px-8 py-3 rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-tor-dark/20 ${isUpdatingPassword ? 'opacity-50 cursor-not-allowed' : 'hover:bg-slate-800'} transition-all flex items-center gap-2`}
                    >
                      {isUpdatingPassword ? (
                        <>
                          <span className="material-symbols-outlined text-sm animate-spin">sync</span>
                          Atualizando...
                        </>
                      ) : (
                        'Atualizar Senha'
                      )}
                    </button>
                  </div>

                  {/* Debug Info Footer */}
                  <div className="mt-8 bg-slate-50 p-4 rounded-xl border border-slate-100">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm">bug_report</span>
                      Informações de Diagnóstico
                    </p>
                    <div className="grid grid-cols-2 gap-4 text-[10px] font-mono text-slate-500">
                      <div>
                        <span className="font-bold text-slate-700">ID:</span> {userProfile?.id || 'N/A'}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Role:</span>
                        <span className={`ml-1 px-1.5 py-0.5 rounded ${userProfile?.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-slate-200'}`}>
                          {userProfile?.role || 'None'}
                        </span>
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Ativo:</span> {userProfile?.is_active ? 'Sim' : 'Não'}
                      </div>
                      <div>
                        <span className="font-bold text-slate-700">Email:</span> {userProfile?.email || 'N/A'}
                      </div>
                    </div>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      <footer className="flex flex-col md:flex-row items-center justify-between gap-4 pt-8 border-t border-slate-200/50">
        <div className="flex items-center gap-2">
          <span className="size-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Conectado à Intranet PMRv SC</p>
        </div>
        <div className="flex items-center gap-6">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Versão v3.2.0-STABLE</p>
          <div className="h-4 w-px bg-slate-200"></div>
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">© 2024 TOR Digital Solutions</p>
        </div>
      </footer>
    </div>
  );
};

export default SettingsView;
