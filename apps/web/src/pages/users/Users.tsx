import { useState, useEffect } from 'react';
import { Search, Plus, UserPlus, Shield, CheckCircle, Clock, AlertTriangle, UserCog, Mail, Phone, Lock, Edit2, Trash2, Key, X } from 'lucide-react';
import { apiFetch } from '../../stores/authStore';

export default function Users() {
    const [searchTerm, setSearchTerm] = useState('');
    const [users, setUsers] = useState<any[]>([]);
    const [selectedRole, setSelectedRole] = useState('all');
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isAddOpen, setIsAddOpen] = useState(false);
    const [addingUser, setAddingUser] = useState(false);
    const [newUser, setNewUser] = useState({
        name: '', email: '', phone: '', role: 'atendimento', commissionPercent: 15
    });

    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingUserId, setEditingUserId] = useState<string | null>(null);
    const [editingUser, setEditingUser] = useState(false);
    const [editUserData, setEditUserData] = useState({
        name: '', email: '', phone: '', role: 'atendimento', commissionPercent: 15
    });

    const loadUsers = async () => {
        setLoading(true);
        const res = await apiFetch('/api/users');
        if (res.success) {
            setUsers(res.data);
        }
        setLoading(false);
    };

    useEffect(() => {
        loadUsers();
    }, []);

    const toggleStatus = async (id: string, currentStatus: boolean) => {
        const res = await apiFetch(`/api/users/${id}/status`, {
            method: 'PUT',
            body: JSON.stringify({ isActive: !currentStatus })
        });
        if (res.success) {
            loadUsers();
        }
    };

    const handleCreateUser = async (e: React.FormEvent) => {
        e.preventDefault();
        setAddingUser(true);
        try {
            const res = await apiFetch('/api/users', {
                method: 'POST',
                body: JSON.stringify({
                    name: newUser.name,
                    email: newUser.email,
                    phone: newUser.phone,
                    role: newUser.role,
                    commissionPercent: newUser.role === 'representante' ? newUser.commissionPercent : undefined
                })
            });
            if (res.success) {
                setIsAddOpen(false);
                setNewUser({ name: '', email: '', phone: '', role: 'atendimento', commissionPercent: 15 });
                loadUsers();
            } else {
                alert('Erro ao criar usuário: ' + (res.error || 'Desconhecido'));
            }
        } catch (error) {
            alert('Erro ao criar usuário');
        } finally {
            setAddingUser(false);
        }
    };

    const openEditModal = (user: any) => {
        setEditUserData({
            name: user.name || '',
            email: user.email || '',
            phone: user.phone || '',
            role: user.role || 'atendimento',
            commissionPercent: user.commissionPercent ? Number(user.commissionPercent) : 15
        });
        setEditingUserId(user.id);
        setIsEditOpen(true);
    };

    const handleEditUser = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingUserId) return;
        setEditingUser(true);
        try {
            const res = await apiFetch(`/api/users/${editingUserId}`, {
                method: 'PUT',
                body: JSON.stringify({
                    name: editUserData.name,
                    email: editUserData.email,
                    phone: editUserData.phone,
                    role: editUserData.role,
                    commissionPercent: editUserData.role === 'representante' ? editUserData.commissionPercent : undefined
                })
            });
            if (res.success) {
                setIsEditOpen(false);
                loadUsers();
            } else {
                alert('Erro ao editar usuário: ' + (res.error || 'Desconhecido'));
            }
        } catch (error) {
            alert('Erro ao editar usuário');
        } finally {
            setEditingUser(false);
        }
    };

    const handleResetPassword = async (id: string) => {
        if (!confirm('Deseja realmente redefinir a senha deste usuário para "senha123"? Ele precisará alterá-la no próximo acesso.')) return;

        const res = await apiFetch(`/api/users/${id}/reset-password`, {
            method: 'PUT'
        });
        if (res.success) {
            alert('Senha redefinida com sucesso.');
            loadUsers();
        } else {
            alert('Erro ao redefinir a senha: ' + (res.error || 'Desconhecido'));
        }
    };

    const filteredUsers = users.filter((u: any) => {
        const nameMatch = u.name?.toLowerCase().includes(searchTerm.toLowerCase());
        const emailMatch = u.email?.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesSearch = nameMatch || emailMatch;
        const matchesRole = selectedRole === 'all' || u.role === selectedRole;
        return matchesSearch && matchesRole;
    });

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin': return 'bg-purple-500/10 text-purple-400 border border-purple-500/20';
            case 'gestor': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
            case 'financeiro': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
            case 'atendimento': return 'bg-amber-500/10 text-amber-400 border border-amber-500/20';
            case 'representante': return 'bg-imperio-500/10 text-imperio-400 border border-imperio-500/20';
            default: return 'bg-dark-700 text-dark-300';
        }
    };

    const getStatusBadge = (status: string) => {
        if (status === 'active') return <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-success/10 text-success text-xs font-medium"><CheckCircle size={12} /> Ativo</span>;
        return <span className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-danger/10 text-danger text-xs font-medium"><AlertTriangle size={12} /> Bloqueado</span>;
    };

    return (
        <div className="h-full flex flex-col bg-dark-950 text-white relative">
            {/* Cabecalho Principal */}
            <div className="flex-none p-6 border-b border-dark-800 bg-dark-900/50">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                            <Shield className="text-imperio-500" size={28} />
                            Usuários & Permissões
                        </h1>
                        <p className="text-dark-400 mt-1">Gestão de acessos, representantes e comissionamentos base</p>
                    </div>
                    <div className="flex gap-3">
                        <button onClick={() => setIsAddOpen(true)} className="btn-primary flex items-center gap-2">
                            <UserPlus size={18} />
                            Novo Usuário
                        </button>
                    </div>
                </div>

                {/* Filtros */}
                <div className="mt-6 flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1 max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-dark-500" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nome ou email..."
                            className="input-field pl-10 w-full"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <select
                        className="input-field w-full md:w-48"
                        value={selectedRole}
                        onChange={(e) => setSelectedRole(e.target.value)}
                    >
                        <option value="all">Todos os Perfis</option>
                        <option value="admin">Administrador</option>
                        <option value="gestor">Gestor</option>
                        <option value="atendimento">Atendimento</option>
                        <option value="representante">Representante</option>
                        <option value="financeiro">Financeiro</option>
                    </select>
                </div>
            </div>

            {/* Listagem */}
            <div className="flex-1 overflow-auto p-6">
                <div className="bg-dark-900 border border-dark-800 rounded-xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm whitespace-nowrap">
                            <thead className="bg-dark-800/50 text-dark-300">
                                <tr>
                                    <th className="px-6 py-4 font-medium">Usuário</th>
                                    <th className="px-6 py-4 font-medium">Perfil & Comiss.</th>
                                    <th className="px-6 py-4 font-medium">Contato</th>
                                    <th className="px-6 py-4 font-medium">Status</th>
                                    <th className="px-6 py-4 font-medium">Último Acesso</th>
                                    <th className="px-6 py-4 font-medium text-right">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-dark-800">
                                {filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-dark-800/30 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-semibold text-white">{user.name}</span>
                                                <span className="text-xs text-dark-400">{user.email}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 items-start">
                                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${getRoleBadge(user.role)}`}>
                                                    {user.role}
                                                </span>
                                                {user.role === 'representante' && (
                                                    <span className="text-xs text-dark-400">Comissão: <span className="text-white font-medium">{user.commissionPercent}%</span></span>
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col gap-1 text-xs text-dark-400">
                                                <span className="flex items-center gap-1.5"><Phone size={12} /> {user.phone || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{getStatusBadge(user.isActive ? 'active' : 'blocked')}</td>
                                        <td className="px-6 py-4">
                                            <span className="flex items-center gap-1.5 text-dark-400 text-xs text-muted">
                                                <Clock size={12} /> {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleDateString() : 'Nunca acessou'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => openEditModal(user)} className="p-1.5 rounded bg-dark-800 text-dark-300 hover:text-imperio-400 hover:bg-imperio-500/10 transition" title="Editar Usuário">
                                                    <Edit2 size={14} />
                                                </button>
                                                <button onClick={() => handleResetPassword(user.id)} className="p-1.5 rounded bg-dark-800 text-dark-300 hover:text-amber-400 hover:bg-amber-400/10 transition" title="Resetar Senha">
                                                    <Key size={14} />
                                                </button>
                                                {user.isActive ? (
                                                    <button onClick={() => toggleStatus(user.id, user.isActive)} className="p-1.5 rounded bg-dark-800 text-dark-300 hover:text-danger hover:bg-danger/10 transition" title="Bloquear Acesso">
                                                        <Lock size={14} />
                                                    </button>
                                                ) : (
                                                    <button onClick={() => toggleStatus(user.id, user.isActive)} className="p-1.5 rounded bg-dark-800 text-dark-300 hover:text-success hover:bg-success/10 transition" title="Desbloquear Acesso">
                                                        <CheckCircle size={14} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        {filteredUsers.length === 0 && !loading && (
                            <div className="p-8 text-center text-dark-400">
                                Nenhum usuário encontrado com estes filtros.
                            </div>
                        )}
                        {loading && (
                            <div className="p-8 flex justify-center">
                                <div className="w-8 h-8 border-2 border-imperio-500 border-t-transparent rounded-full animate-spin" />
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Modal Novo Usuário */}
            {isAddOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 min-h-screen">
                    <div className="bg-dark-900 border border-dark-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-5 md:p-6 border-b border-dark-800 shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white">Criar Novo Usuário</h3>
                                <p className="text-sm text-dark-400 mt-1">Insira os dados do novo membro da equipe</p>
                            </div>
                            <button onClick={() => setIsAddOpen(false)} className="p-2 hover:bg-dark-800 rounded-xl transition-colors text-dark-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 md:p-6 overflow-y-auto">
                            <form id="addUserForm" onSubmit={handleCreateUser} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-dark-300">Nome Completo <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={newUser.name}
                                        onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                        className="input-field w-full bg-dark-950 border-dark-800"
                                        placeholder="Ex: João Silva"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-dark-300">E-mail <span className="text-danger">*</span></label>
                                    <input
                                        type="email"
                                        required
                                        value={newUser.email}
                                        onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                                        className="input-field w-full bg-dark-950 border-dark-800"
                                        placeholder="joao@exemplo.com"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-dark-300">Telefone / WhatsApp</label>
                                    <input
                                        type="text"
                                        value={newUser.phone}
                                        onChange={e => setNewUser({ ...newUser, phone: e.target.value })}
                                        className="input-field w-full bg-dark-950 border-dark-800"
                                        placeholder="(00) 00000-0000"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-dark-300">Perfil de Acesso <span className="text-danger">*</span></label>
                                    <select
                                        value={newUser.role}
                                        onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                        className="input-field w-full bg-dark-950 border-dark-800"
                                    >
                                        <option value="admin">Administrador</option>
                                        <option value="gestor">Gestor</option>
                                        <option value="atendimento">Atendimento</option>
                                        <option value="representante">Representante</option>
                                        <option value="financeiro">Financeiro</option>
                                    </select>
                                </div>

                                {newUser.role === 'representante' && (
                                    <div className="space-y-1.5 animate-fade-in">
                                        <label className="text-sm font-medium text-dark-300">Comissão (%) <span className="text-danger">*</span></label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                required
                                                value={newUser.commissionPercent}
                                                onChange={e => setNewUser({ ...newUser, commissionPercent: Number(e.target.value) })}
                                                className="input-field w-full bg-dark-950 border-dark-800 pr-10"
                                                placeholder="15"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 font-medium">%</span>
                                        </div>
                                        <p className="text-xs text-dark-500">A comissão padrão base sugerida é de 15%.</p>
                                    </div>
                                )}

                                <div className="pt-4 bg-dark-900 border-t border-dark-800 flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsAddOpen(false)}
                                        className="px-4 py-2 rounded-xl text-sm font-medium bg-dark-800 text-white hover:bg-dark-700 transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={addingUser}
                                        className="px-4 py-2 rounded-xl text-sm font-medium btn-primary disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {addingUser ? (
                                            <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Criando...</>
                                        ) : 'Criar Usuário'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Editar Usuário */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 min-h-screen">
                    <div className="bg-dark-900 border border-dark-800 rounded-2xl w-full max-w-lg shadow-2xl flex flex-col max-h-[90vh]">
                        <div className="flex items-center justify-between p-5 md:p-6 border-b border-dark-800 shrink-0">
                            <div>
                                <h3 className="text-xl font-bold text-white">Editar Usuário</h3>
                                <p className="text-sm text-dark-400 mt-1">Atualize os dados e comissão do usuário</p>
                            </div>
                            <button onClick={() => setIsEditOpen(false)} className="p-2 hover:bg-dark-800 rounded-xl transition-colors text-dark-400">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-5 md:p-6 overflow-y-auto">
                            <form id="editUserForm" onSubmit={handleEditUser} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-dark-300">Nome Completo <span className="text-danger">*</span></label>
                                    <input
                                        type="text"
                                        required
                                        value={editUserData.name}
                                        onChange={e => setEditUserData({ ...editUserData, name: e.target.value })}
                                        className="input-field w-full bg-dark-950 border-dark-800"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-dark-300">E-mail <span className="text-danger">*</span></label>
                                    <input
                                        type="email"
                                        required
                                        value={editUserData.email}
                                        onChange={e => setEditUserData({ ...editUserData, email: e.target.value })}
                                        className="input-field w-full bg-dark-950 border-dark-800"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-dark-300">Telefone / WhatsApp</label>
                                    <input
                                        type="text"
                                        value={editUserData.phone}
                                        onChange={e => setEditUserData({ ...editUserData, phone: e.target.value })}
                                        className="input-field w-full bg-dark-950 border-dark-800"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-sm font-medium text-dark-300">Perfil de Acesso <span className="text-danger">*</span></label>
                                    <select
                                        value={editUserData.role}
                                        onChange={e => setEditUserData({ ...editUserData, role: e.target.value })}
                                        className="input-field w-full bg-dark-950 border-dark-800"
                                    >
                                        <option value="admin">Administrador</option>
                                        <option value="gestor">Gestor</option>
                                        <option value="atendimento">Atendimento</option>
                                        <option value="representante">Representante</option>
                                        <option value="financeiro">Financeiro</option>
                                    </select>
                                </div>

                                {editUserData.role === 'representante' && (
                                    <div className="space-y-1.5 animate-fade-in">
                                        <label className="text-sm font-medium text-dark-300">Comissão (%) <span className="text-danger">*</span></label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="0"
                                                max="100"
                                                step="0.1"
                                                required
                                                value={editUserData.commissionPercent}
                                                onChange={e => setEditUserData({ ...editUserData, commissionPercent: Number(e.target.value) })}
                                                className="input-field w-full bg-dark-950 border-dark-800 pr-10"
                                            />
                                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-dark-500 font-medium">%</span>
                                        </div>
                                    </div>
                                )}

                                <div className="pt-4 bg-dark-900 border-t border-dark-800 flex justify-end gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditOpen(false)}
                                        className="px-4 py-2 rounded-xl text-sm font-medium bg-dark-800 text-white hover:bg-dark-700 transition"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={editingUser}
                                        className="px-4 py-2 rounded-xl text-sm font-medium btn-primary disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {editingUser ? (
                                            <><div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" /> Salvando...</>
                                        ) : 'Salvar Alterações'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
