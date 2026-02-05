
import { supabase } from '../lib/supabase';
import type { User, AuthError } from '@supabase/supabase-js';

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  role: 'admin' | 'editor' | 'viewer';
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface SignUpData {
  email: string;
  password: string;
  fullName: string;
  role?: 'admin' | 'editor' | 'viewer';
}

export interface AuthResponse {
  user: User | null;
  error: AuthError | null;
}

/**
 * Serviço de Autenticação usando Supabase Auth
 */
class AuthService {
  /**
   * Cadastrar novo usuário (apenas admins podem fazer isso)
   */
  async signUp(data: SignUpData): Promise<AuthResponse> {
    try {
      const { data: authData, error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            role: data.role || 'viewer',
          },
        },
      });

      if (error) {
        console.error('Erro no signUp:', error);
        return { user: null, error };
      }

      return { user: authData.user, error: null };
    } catch (err) {
      console.error('Erro inesperado no signUp:', err);
      return { user: null, error: err as AuthError };
    }
  }

  /**
   * Fazer login
   */
  async signIn(email: string, password: string): Promise<AuthResponse> {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Erro no signIn:', error);
        return { user: null, error };
      }

      // Verificar se o usuário está ativo
      if (data.user) {
        const profile = await this.getUserProfile(data.user.id);
        if (profile && !profile.is_active) {
          await this.signOut();
          return {
            user: null,
            error: {
              message: 'Usuário desativado. Entre em contato com o administrador.',
              name: 'UserInactiveError',
              status: 403,
            } as AuthError,
          };
        }
      }

      return { user: data.user, error: null };
    } catch (err) {
      console.error('Erro inesperado no signIn:', err);
      return { user: null, error: err as AuthError };
    }
  }

  /**
   * Fazer logout
   */
  async signOut(): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.error('Erro no signOut:', error);
        return { error };
      }
      return { error: null };
    } catch (err) {
      console.error('Erro inesperado no signOut:', err);
      return { error: err as AuthError };
    }
  }

  /**
   * Obter usuário atualmente logado
   */
  async getCurrentUser(): Promise<User | null> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      return user;
    } catch (err) {
      console.error('Erro ao obter usuário atual:', err);
      return null;
    }
  }

  /**
   * Obter sessão atual
   */
  async getSession() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return session;
    } catch (err) {
      console.error('Erro ao obter sessão:', err);
      return null;
    }
  }

  /**
   * Obter perfil do usuário
   */
  async getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
      console.log('🔍 Buscando perfil para ID:', userId);
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Erro Supabase ao buscar perfil:', error);
        return null;
      }

      console.log('✅ Perfil encontrado:', data);
      return data;
    } catch (err) {
      console.error('❌ Erro inesperado ao obter perfil:', err);
      return null;
    }
  }

  /**
   * Listar todos os usuários (apenas para admins)
   */
  async getAllUsers(): Promise<UserProfile[]> {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Erro ao listar usuários:', error);
        return [];
      }

      return data || [];
    } catch (err) {
      console.error('Erro inesperado ao listar usuários:', err);
      return [];
    }
  }

  /**
   * Atualizar role de um usuário (apenas admins)
   */
  async updateUserRole(userId: string, newRole: 'admin' | 'editor' | 'viewer'): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ role: newRole })
        .eq('id', userId);

      if (error) {
        console.error('Erro ao atualizar role:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Erro inesperado ao atualizar role:', err);
      return false;
    }
  }

  /**
   * Ativar/desativar usuário (apenas admins)
   */
  async toggleUserActive(userId: string, isActive: boolean): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update({ is_active: isActive })
        .eq('id', userId);

      if (error) {
        console.error('Erro ao alterar status do usuário:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Erro inesperado ao alterar status:', err);
      return false;
    }
  }

  /**
   * Deletar usuário (apenas admins)
   */
  async deleteUser(userId: string): Promise<boolean> {
    try {
      // Primeiro deletar o perfil (o auth.users será deletado em cascata)
      const { error } = await supabase
        .from('user_profiles')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Erro ao deletar usuário:', error);
        return false;
      }

      return true;
    } catch (err) {
      console.error('Erro inesperado ao deletar usuário:', err);
      return false;
    }
  }

  /**
   * Alterar senha do usuário atual
   */
  async updatePassword(newPassword: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) {
        console.error('Erro ao atualizar senha:', error);
        return { error };
      }

      return { error: null };
    } catch (err) {
      console.error('Erro inesperado ao atualizar senha:', err);
      return { error: err as AuthError };
    }
  }

  /**
   * Enviar email de recuperação de senha
   */
  async resetPasswordRequest(email: string): Promise<{ error: AuthError | null }> {
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        console.error('Erro ao solicitar reset de senha:', error);
        return { error };
      }

      return { error: null };
    } catch (err) {
      console.error('Erro inesperado ao solicitar reset:', err);
      return { error: err as AuthError };
    }
  }

  /**
   * Verificar se há usuários cadastrados no sistema
   */
  async hasAnyUsers(): Promise<boolean> {
    try {
      const { count, error } = await supabase
        .from('user_profiles')
        .select('*', { count: 'exact', head: true });

      if (error) {
        console.error('Erro ao verificar usuários:', error);
        return false;
      }

      return (count || 0) > 0;
    } catch (err) {
      console.error('Erro inesperado ao verificar usuários:', err);
      return false;
    }
  }

  /**
   * Criar primeiro usuário admin (setup inicial - sem autenticação necessária)
   */
  async createFirstAdmin(email: string, password: string, fullName: string): Promise<AuthResponse> {
    try {
      // Verificar se já existe algum usuário
      const hasUsers = await this.hasAnyUsers();
      if (hasUsers) {
        return {
          user: null,
          error: {
            message: 'Sistema já possui usuários cadastrados',
            name: 'SetupAlreadyCompleted',
            status: 400,
          } as AuthError,
        };
      }

      // Criar o primeiro admin
      const { data: authData, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role: 'admin',
          },
        },
      });

      if (error) {
        console.error('Erro ao criar primeiro admin:', error);
        return { user: null, error };
      }

      return { user: authData.user, error: null };
    } catch (err) {
      console.error('Erro inesperado ao criar primeiro admin:', err);
      return { user: null, error: err as AuthError };
    }
  }

  /**
   * Listener para mudanças de autenticação
   */
  onAuthStateChange(callback: (user: User | null) => void) {
    return supabase.auth.onAuthStateChange((_event, session) => {
      callback(session?.user ?? null);
    });
  }
}

export const authService = new AuthService();
