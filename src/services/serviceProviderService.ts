import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export interface ServiceProvider {
  id?: string;
  name: string;
  contact_person?: string;
  email?: string;
  phone?: string;
  service_type: string;
  service_category?: string;
  service_subcategory?: string;
  company_data?: any;
}

export interface PriceTableItem {
  id?: string;
  provider_id: string;
  service_name: string;
  price: number;
  unit?: string;
}

export interface ProviderPerformance {
  provider_id: string;
  provider_name: string;
  average_score: number;
  total_contracts: number;
}

export const serviceProviderService = {
  async getServiceProviders(): Promise<ServiceProvider[]> {
    try {
      const { data, error } = await supabase
        .from('service_providers')
        .select('*');
      if (error) throw error;
      return data || [];
    } catch (error: any) {
      console.error('Error fetching service providers:', error);
      toast.error('Failed to fetch service providers.');
      return [];
    }
  },

  async createServiceProvider(provider: ServiceProvider): Promise<boolean> {
    try {
      // Ensure company_data is valid JSON if it's a string
      if (typeof provider.company_data === 'string' && provider.company_data.trim()) {
        provider.company_data = JSON.parse(provider.company_data);
      }
      const { error } = await supabase
        .from('service_providers')
        .insert(provider);
      if (error) throw error;
      toast.success('Service provider created successfully!');
      return true;
    } catch (error: any) {
      console.error('Error creating service provider:', error);
      toast.error(`Failed to create service provider: ${error.message}`);
      return false;
    }
  },

  async updateServiceProvider(id: string, provider: ServiceProvider): Promise<boolean> {
    try {
      // Ensure company_data is valid JSON if it's a string
      if (typeof provider.company_data === 'string' && provider.company_data.trim()) {
        provider.company_data = JSON.parse(provider.company_data);
      }
      const { error } = await supabase
        .from('service_providers')
        .update(provider)
        .eq('id', id);
      if (error) throw error;
      toast.success('Service provider updated successfully!');
      return true;
    } catch (error: any) {
      console.error('Error updating service provider:', error);
      toast.error(`Failed to update service provider: ${error.message}`);
      return false;
    }
  },

  async deleteServiceProvider(id: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('service_providers')
        .delete()
        .eq('id', id);
      if (error) throw error;
      toast.success('Service provider deleted successfully!');
      return true;
    } catch (error: any) {
      console.error('Error deleting service provider:', error);
      toast.error(`Failed to delete service provider: ${error.message}`);
      return false;
    }
  },

  // Functions for managing contracts related to a provider
  async getContractsForProvider(providerId: string) {
    const { data, error } = await supabase
      .from('contracts')
      .select('*')
      .eq('provider_id', providerId);
    if (error) {
      toast.error(`Failed to fetch contracts: ${error.message}`);
      return [];
    }
    return data;
  },

  async updateContractEvaluation(contractId: string, evaluation: { evaluation_score?: number; evaluation_comments?: string }) {
    const { error } = await supabase
      .from('contracts')
      .update(evaluation)
      .eq('id', contractId);
    if (error) {
      toast.error(`Failed to update evaluation: ${error.message}`);
      return false;
    }
    toast.success('Evaluation updated successfully!');
    return true;
  },

  async createContract(contractData: any) {
    const { error } = await supabase.from('contracts').insert(contractData);
    if (error) {
      toast.error(`Failed to create contract: ${error.message}`);
      return null;
    }
    toast.success('Contract created successfully!');
    return true;
  },

  async updateContract(contractId: string, contractData: any) {
    const { error } = await supabase.from('contracts').update(contractData).eq('id', contractId);
    if (error) {
      toast.error(`Failed to update contract: ${error.message}`);
      return null;
    }
    toast.success('Contract updated successfully!');
    return true;
  },

  async deleteContract(contractId: string) {
    const { error } = await supabase.from('contracts').delete().eq('id', contractId);
    if (error) {
      toast.error(`Failed to delete contract: ${error.message}`);
      return false;
    }
    toast.success('Contract deleted successfully!');
    return true;
  },

  // Functions for managing price tables
  async getPriceTableForProvider(providerId: string): Promise<PriceTableItem[]> {
    const { data, error } = await supabase
      .from('price_tables')
      .select('*')
      .eq('provider_id', providerId);
    if (error) {
      toast.error(`Failed to fetch price table: ${error.message}`);
      return [];
    }
    return data || [];
  },

  async createPriceTableItem(item: Omit<PriceTableItem, 'id'>): Promise<boolean> {
    const { error } = await supabase.from('price_tables').insert(item);
    if (error) {
      toast.error(`Failed to create price table item: ${error.message}`);
      return false;
    }
    toast.success('Price table item created successfully!');
    return true;
  },

  async updatePriceTableItem(id: string, item: Partial<PriceTableItem>): Promise<boolean> {
    const { error } = await supabase.from('price_tables').update(item).eq('id', id);
    if (error) {
      toast.error(`Failed to update price table item: ${error.message}`);
      return false;
    }
    toast.success('Price table item updated successfully!');
    return true;
  },

  async deletePriceTableItem(id: string): Promise<boolean> {
    const { error } = await supabase.from('price_tables').delete().eq('id', id);
    if (error) {
      toast.error(`Failed to delete price table item: ${error.message}`);
      return false;
    }
    toast.success('Price table item deleted successfully!');
    return true;
  },

  async getProviderPerformanceReport(): Promise<ProviderPerformance[]> {
    const { data, error } = await supabase.rpc('get_provider_performance');
    if (error) {
      toast.error(`Failed to fetch performance report: ${error.message}`);
      console.error('Error fetching performance report:', error);
      return [];
    }
    return data || [];
  },
};
