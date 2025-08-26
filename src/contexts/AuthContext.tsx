
import { createContext, useContext, useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { User } from "@/types";
import { adaptSupabaseUser } from "@/utils/userAdapter";
import { roleService } from "@/services/roleService";

interface AuthContextType {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isAdmin: () => boolean;
  isProfessor: () => boolean;
  isStudent: () => boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  isLoading: true,
  isAdmin: () => false,
  isProfessor: () => false,
  isStudent: () => false,
  login: async () => {},
  register: async () => {},
  logout: async () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);

  /**
   * Processa o usuário autenticado e garante que tenha o papel correto
   */
  const processAuthenticatedUser = async (supabaseUser: any): Promise<User | null> => {
    if (!supabaseUser) return null;
    
    const adaptedUser = adaptSupabaseUser(supabaseUser);
    if (!adaptedUser) return null;
    
    // Usar o serviço de papéis para garantir consistência
    try {
      await roleService.ensureCorrectRole(adaptedUser);
    } catch (error) {
      console.warn('Aviso: Não foi possível verificar/atualizar papel do usuário:', error);
      // Não é crítico, continuar com o usuário adaptado
    }
    
    return adaptedUser;
  };

  useEffect(() => {
    // Set up auth state listener first
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log(`Auth state changed: ${event}`);
        setSession(session);
        
        // Processar usuário de forma assíncrona
        const processedUser = await processAuthenticatedUser(session?.user ?? null);
        setUser(processedUser);
        
        // Reset login attempts when auth state changes successfully
        if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          setLoginAttempts(0);
          setIsRetrying(false);
        }
        
        setIsLoading(false);
      }
    );

    // Then check for existing session
    const initializeAuth = async () => {
      try {
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Error getting session:', error);
          // Try to refresh the session if there was an error
          await supabase.auth.refreshSession();
          const refreshResult = await supabase.auth.getSession();
          setSession(refreshResult.data.session);
          const processedUser = await processAuthenticatedUser(refreshResult.data.session?.user ?? null);
          setUser(processedUser);
        } else {
          setSession(data.session);
          const processedUser = await processAuthenticatedUser(data.session?.user ?? null);
          setUser(processedUser);
        }
      } catch (err) {
        console.error('Failed to initialize auth:', err);
      } finally {
        setIsLoading(false);
      }
    };
    
    initializeAuth();

    return () => subscription.unsubscribe();
  }, []);

  const isAdmin = (): boolean => {
    return roleService.isAdmin(user);
  };

  const isProfessor = (): boolean => {
    return roleService.isProfessor(user);
  };

  const isStudent = (): boolean => {
    return roleService.isStudent(user);
  };

  const login = async (email: string, password: string) => {
    try {
      setIsLoading(true);
      console.log("Tentando login com:", email);
      
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      
      if (error) {
        throw error;
      }
      
      console.log("Login bem-sucedido");
      toast.success("Login realizado com sucesso!");
      
      // O estado será atualizado automaticamente pelo listener onAuthStateChange
      // Não precisamos atualizar manualmente aqui
      
      // Reset login attempts on successful login
      setLoginAttempts(0);
      setIsRetrying(false);
    } catch (error: any) {
      console.error("Login error:", error);
      toast.error(`Erro ao fazer login: ${error.message}`);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      console.log("Tentando registrar com:", email, name);
      
      // Determinar o papel correto baseado no email
      const correctRole = roleService.getDefaultRole(email);
      
      // Register the user com o papel correto
      const { error: signUpError, data } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            name,
            role: correctRole,
          },
        },
      });

      if (signUpError) throw signUpError;
      
      console.log("Registro bem-sucedido");
      toast.success("Registro realizado com sucesso!");
    } catch (error: any) {
      console.error("Registration error:", error);
      toast.error(`Erro ao registrar: ${error.message}`);
      throw error;
    }
  };

  const logout = async () => {
    try {
      setIsLoading(true);
      
      // Usar o método signOut com scope 'local' para manter tokens de refresh
      const { error } = await supabase.auth.signOut({ scope: 'local' });
      if (error) throw error;
      
      // Limpar estados locais
      setSession(null);
      setUser(null);
      setLoginAttempts(0);
      setIsRetrying(false);
      
      // Limpar cache do serviço de papéis
      roleService.clearCache();
      
      toast.success("Logout realizado com sucesso!");
    } catch (error: any) {
      console.error("Logout error:", error);
      toast.error(`Erro ao sair: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        session,
        user,
        isLoading,
        isAdmin,
        isProfessor,
        isStudent,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
