
import { supabase } from '@/integrations/supabase/client';

export interface Lead {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  source?: string;
  status: 'new' | 'contacted' | 'qualified' | 'converted' | 'lost';
  score?: number;
  company?: string;
  position?: string;
  notes?: string;
  assigned_to?: string;
  conversion_date?: string;
  converted_to_user_id?: string;
  created_at?: string;
  updated_at?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  utm_content?: string;
  utm_term?: string;
}

export interface LeadInteraction {
  id?: string;
  lead_id?: string;
  user_id?: string;
  interaction_type: 'call' | 'email' | 'meeting' | 'demo' | 'proposal' | 'follow_up';
  subject: string;
  description?: string;
  outcome?: string;
  next_action?: string;
  next_action_date?: string;
  created_by: string;
  created_at?: string;
}

export interface MarketingCampaign {
  id?: string;
  name: string;
  type: 'email' | 'social_media' | 'google_ads' | 'facebook_ads' | 'content' | 'event';
  description?: string;
  start_date: string;
  end_date?: string;
  budget?: number;
  target_audience?: string;
  goals?: string;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'cancelled';
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface CampaignMetrics {
  id?: string;
  campaign_id: string;
  metric_date: string;
  impressions?: number;
  clicks?: number;
  conversions?: number;
  cost?: number;
  leads_generated?: number;
  enrollments?: number;
  revenue?: number;
}

class CRMService {
  // ==================== LEADS ====================
  
  async getLeads() {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        assigned_to_profile:profiles!leads_assigned_to_fkey(name, email),
        converted_user:profiles!leads_converted_to_user_id_fkey(name, email)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getLeadById(id: string) {
    const { data, error } = await supabase
      .from('leads')
      .select(`
        *,
        assigned_to_profile:profiles!leads_assigned_to_fkey(name, email),
        interactions:lead_interactions(
          *,
          created_by_profile:profiles!lead_interactions_created_by_fkey(name)
        )
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createLead(lead: Lead) {
    const { data, error } = await supabase
      .from('leads')
      .insert([lead])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateLead(id: string, updates: Partial<Lead>) {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteLead(id: string) {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  async calculateLeadScore(leadId: string) {
    const { data, error } = await supabase
      .rpc('calculate_lead_score', { lead_uuid: leadId });

    if (error) throw error;
    return data;
  }

  async convertLeadToUser(leadId: string, userId: string) {
    const { data, error } = await supabase
      .rpc('convert_lead_to_user', { 
        lead_uuid: leadId, 
        user_uuid: userId 
      });

    if (error) throw error;
    return data;
  }

  // ==================== INTERAÇÕES ====================

  async getLeadInteractions(leadId: string) {
    const { data, error } = await supabase
      .from('lead_interactions')
      .select(`
        *,
        created_by_profile:profiles!lead_interactions_created_by_fkey(name)
      `)
      .eq('lead_id', leadId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async createLeadInteraction(interaction: LeadInteraction) {
    const { data, error } = await supabase
      .from('lead_interactions')
      .insert([interaction])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ==================== CAMPANHAS ====================

  async getMarketingCampaigns() {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select(`
        *,
        created_by_profile:profiles!marketing_campaigns_created_by_fkey(name),
        metrics:campaign_metrics(
          impressions,
          clicks,
          conversions,
          cost,
          leads_generated,
          enrollments,
          revenue
        )
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async createMarketingCampaign(campaign: MarketingCampaign) {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert([campaign])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateMarketingCampaign(id: string, updates: Partial<MarketingCampaign>) {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteCampaign(id: string) {
    const { error } = await supabase
      .from('marketing_campaigns')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== MÉTRICAS DE CAMPANHAS ====================

  async getCampaignMetrics(campaignId: string) {
    const { data, error } = await supabase
      .from('campaign_metrics')
      .select('*')
      .eq('campaign_id', campaignId)
      .order('metric_date', { ascending: false });

    if (error) throw error;
    return data;
  }

  async addCampaignMetrics(metrics: CampaignMetrics) {
    const { data, error } = await supabase
      .from('campaign_metrics')
      .insert([metrics])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ==================== RELATÓRIOS ====================

  async getLeadsReport(dateFrom?: string, dateTo?: string) {
    let query = supabase
      .from('leads')
      .select('*');

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data, error } = await query;
    if (error) throw error;

    // Processar dados para relatório
    const statusCounts = data.reduce((acc, lead) => {
      acc[lead.status] = (acc[lead.status] || 0) + 1;
      return acc;
    }, {});

    const sourceCounts = data.reduce((acc, lead) => {
      acc[lead.source || 'Unknown'] = (acc[lead.source || 'Unknown'] || 0) + 1;
      return acc;
    }, {});

    return {
      totalLeads: data.length,
      statusBreakdown: statusCounts,
      sourceBreakdown: sourceCounts,
      conversionRate: statusCounts.converted ? 
        (statusCounts.converted / data.length * 100).toFixed(2) : '0.00'
    };
  }

  async getCampaignPerformance() {
    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select(`
        id,
        name,
        type,
        budget,
        metrics:campaign_metrics(
          impressions,
          clicks,
          conversions,
          cost,
          leads_generated,
          revenue
        )
      `);

    if (error) throw error;

    return data.map(campaign => {
      const totalMetrics = campaign.metrics.reduce((acc, metric) => {
        acc.impressions += metric.impressions || 0;
        acc.clicks += metric.clicks || 0;
        acc.conversions += metric.conversions || 0;
        acc.cost += metric.cost || 0;
        acc.leads_generated += metric.leads_generated || 0;
        acc.revenue += metric.revenue || 0;
        return acc;
      }, {
        impressions: 0,
        clicks: 0,
        conversions: 0,
        cost: 0,
        leads_generated: 0,
        revenue: 0
      });

      return {
        ...campaign,
        totalMetrics,
        ctr: totalMetrics.impressions > 0 ? 
          (totalMetrics.clicks / totalMetrics.impressions * 100).toFixed(2) : '0.00',
        cpc: totalMetrics.clicks > 0 ? 
          (totalMetrics.cost / totalMetrics.clicks).toFixed(2) : '0.00',
        roi: totalMetrics.cost > 0 ? 
          ((totalMetrics.revenue - totalMetrics.cost) / totalMetrics.cost * 100).toFixed(2) : '0.00'
      };
    });
  }
}

export const crmService = new CRMService();
