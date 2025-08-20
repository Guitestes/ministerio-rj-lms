import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface RequestData {
  id?: string;
  user_id?: string; // Tornar opcional, pois será adicionado pelo serviço
  request_type: string;
  subject: string;
  description?: string;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

export const requestService = {
  // For students to create a new request
  async createRequest(requestData: RequestData) {
    const { data, error } = await supabase
      .from('administrative_requests')
      .insert([requestData])
      .select();

    if (error) {
      toast.error(`Failed to create request: ${error.message}`);
      throw error;
    }
    return data[0];
  },

  // For admins to get all requests
  async getAllRequests() {
    const { data, error } = await supabase
      .from('administrative_requests')
      .select('*, user:profiles!user_id(name, email)');

    if (error) {
      toast.error(`Failed to fetch requests: ${error.message}`);
      throw error;
    }
    return data;
  },

  // For a user to get their own requests
  async getRequestsForUser(userId: string) {
    const { data, error } = await supabase
      .from('administrative_requests')
      .select('*')
      .eq('user_id', userId);

    if (error) {
      toast.error(`Failed to fetch your requests: ${error.message}`);
      throw error;
    }
    return data;
  },

  // Get a single request by its ID, including comments
  async getRequestById(requestId: string) {
    const { data, error } = await supabase
      .from('administrative_requests')
      .select(`
        *,
        user:profiles!user_id(name, email),
        comments:request_comments(*, author:profiles!user_id(name))
      `)
      .eq('id', requestId)
      .single();

    if (error) {
      toast.error(`Failed to fetch request details: ${error.message}`);
      throw error;
    }
    return data;
  },

  // For admins to update a request (e.g., change status, assign)
  async updateRequest(requestId: string, updates: { status?: string; assigned_to?: string }) {
    const { data, error } = await supabase
      .from('administrative_requests')
      .update(updates)
      .eq('id', requestId)
      .select();

    if (error) {
      toast.error(`Failed to update request: ${error.message}`);
      throw error;
    }
    return data[0];
  },

  // For users or admins to add a comment
  async addComment(requestId: string, userId: string, comment: string) {
    const { data, error } = await supabase
      .from('request_comments')
      .insert([{ request_id: requestId, user_id: userId, comment: comment }])
      .select();

    if (error) {
      toast.error(`Failed to add comment: ${error.message}`);
      throw error;
    }
    return data[0];
  },

  // Execute a server-side action for a request
  async executeAction(requestId: string) {
    const { error } = await supabase.rpc('execute_request_action', {
      p_request_id: requestId,
    });

    if (error) {
      toast.error(`Failed to execute action for request: ${error.message}`);
      throw error;
    }
    toast.success("Ação automática executada com sucesso!");
  }
};

// Função para criar uma nova solicitação administrativa
export const createRequest = async (requestData: Omit<RequestData, 'user_id' | 'id' | 'created_at' | 'updated_at' | 'status'>) => {
  // 1. Obter o usuário logado diretamente do Supabase
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  // 2. Verificar se o usuário está autenticado
  if (userError || !user) {
    console.error('Erro ao obter usuário ou usuário não autenticado:', userError?.message);
    throw new Error('Você precisa estar logado para criar uma solicitação.');
  }

  // 3. Verificar se o perfil do usuário existe na tabela profiles
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('id', user.id)
    .single();

  // 4. Se o perfil não existir, criar um
  if (profileError && profileError.code === 'PGRST116') {
    console.log('Perfil não encontrado, criando perfil para o usuário:', user.id);
    
    const { error: createProfileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'Usuário',
        email: user.email,
        role: user.user_metadata?.role || 'student'
      });
    
    if (createProfileError) {
      console.error('Erro ao criar perfil:', createProfileError);
      throw new Error(`Erro ao criar perfil do usuário: ${createProfileError.message}`);
    }
    
    console.log('Perfil criado com sucesso para o usuário:', user.id);
  } else if (profileError) {
    console.error('Erro ao verificar perfil:', profileError);
    throw new Error(`Erro ao verificar perfil do usuário: ${profileError.message}`);
  }

  // 5. Montar o objeto completo da solicitação com o ID do usuário
  const newRequest = {
    ...requestData,
    user_id: user.id,
    status: 'open' // Usar o valor padrão da tabela
  };

  // 6. Inserir a solicitação no banco de dados
  const { data, error } = await supabase
    .from('administrative_requests')
    .insert([newRequest])
    .select()
    .single(); // .single() para retornar o objeto inserido

  if (error) {
    console.error('Erro detalhado ao criar solicitação:', error);
    // Lançar um erro mais descritivo ajuda na depuração no frontend
    throw new Error(`Erro ao criar solicitação: ${error.message}`);
  }

  return data;
};

// Função para buscar todas as solicitações (geralmente para admins)
export const getAllRequests = async () => {
  const { data, error } = await supabase
    .from('administrative_requests')
    .select('*, user:profiles!user_id(name, email)');

  if (error) {
    toast.error(`Failed to fetch requests: ${error.message}`);
    throw error;
  }
  return data;
}
