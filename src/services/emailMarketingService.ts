
import { supabase } from '@/integrations/supabase/client';

export interface EmailTemplate {
  id?: string;
  name: string;
  subject: string;
  html_content: string;
  text_content?: string;
  template_type: 'newsletter' | 'welcome' | 'course_reminder' | 'promotional' | 'follow_up';
  is_active?: boolean;
  created_by: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmailList {
  id?: string;
  name: string;
  description?: string;
  list_type: 'students' | 'prospects' | 'alumni' | 'teachers' | 'custom';
  is_active?: boolean;
  created_by: string;
  created_at?: string;
}

export interface EmailCampaign {
  id?: string;
  name: string;
  subject: string;
  template_id?: string;
  list_id: string;
  html_content: string;
  text_content?: string;
  scheduled_at?: string;
  sent_at?: string;
  status: 'draft' | 'scheduled' | 'sending' | 'sent' | 'cancelled';
  total_recipients?: number;
  sent_count?: number;
  delivered_count?: number;
  opened_count?: number;
  clicked_count?: number;
  bounced_count?: number;
  unsubscribed_count?: number;
  created_by: string;
  created_at?: string;
}

class EmailMarketingService {
  // ==================== TEMPLATES ====================

  async getEmailTemplates() {
    const { data, error } = await supabase
      .from('email_templates')
      .select(`
        *,
        created_by_profile:profiles!email_templates_created_by_fkey(name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getEmailTemplateById(id: string) {
    const { data, error } = await supabase
      .from('email_templates')
      .select('*')
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createEmailTemplate(template: EmailTemplate) {
    const { data, error } = await supabase
      .from('email_templates')
      .insert([template])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateEmailTemplate(id: string, updates: Partial<EmailTemplate>) {
    const { data, error } = await supabase
      .from('email_templates')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteEmailTemplate(id: string) {
    const { error } = await supabase
      .from('email_templates')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== LISTAS ====================

  async getEmailLists() {
    const { data, error } = await supabase
      .from('email_lists')
      .select(`
        *,
        created_by_profile:profiles!email_lists_created_by_fkey(name),
        contacts:email_list_contacts(count)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async createEmailList(list: EmailList) {
    const { data, error } = await supabase
      .from('email_lists')
      .insert([list])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateEmailList(id: string, updates: Partial<EmailList>) {
    const { data, error } = await supabase
      .from('email_lists')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async deleteEmailList(id: string) {
    const { error } = await supabase
      .from('email_lists')
      .delete()
      .eq('id', id);

    if (error) throw error;
  }

  // ==================== CONTATOS DAS LISTAS ====================

  async getListContacts(listId: string) {
    const { data, error } = await supabase
      .from('email_list_contacts')
      .select('*')
      .eq('list_id', listId)
      .order('subscribed_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async addContactToList(listId: string, email: string, name?: string, leadId?: string, userId?: string) {
    const { data, error } = await supabase
      .from('email_list_contacts')
      .insert([{
        list_id: listId,
        email,
        name,
        lead_id: leadId,
        user_id: userId
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async removeContactFromList(listId: string, email: string) {
    const { error } = await supabase
      .from('email_list_contacts')
      .delete()
      .eq('list_id', listId)
      .eq('email', email);

    if (error) throw error;
  }

  async unsubscribeContact(listId: string, email: string) {
    const { data, error } = await supabase
      .from('email_list_contacts')
      .update({
        status: 'unsubscribed',
        unsubscribed_at: new Date().toISOString()
      })
      .eq('list_id', listId)
      .eq('email', email)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ==================== CAMPANHAS ====================

  async getEmailCampaigns() {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        template:email_templates(name),
        list:email_lists(name),
        created_by_profile:profiles!email_campaigns_created_by_fkey(name)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  }

  async getEmailCampaignById(id: string) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .select(`
        *,
        template:email_templates(*),
        list:email_lists(*),
        tracking:email_tracking(event_type, count)
      `)
      .eq('id', id)
      .single();

    if (error) throw error;
    return data;
  }

  async createEmailCampaign(campaign: EmailCampaign) {
    // Se usar template, buscar o conteúdo
    if (campaign.template_id) {
      const template = await this.getEmailTemplateById(campaign.template_id);
      campaign.html_content = template.html_content;
      campaign.text_content = template.text_content;
      campaign.subject = template.subject;
    }

    // Contar destinatários
    const { count } = await supabase
      .from('email_list_contacts')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', campaign.list_id)
      .eq('status', 'subscribed');

    campaign.total_recipients = count || 0;

    const { data, error } = await supabase
      .from('email_campaigns')
      .insert([campaign])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async updateEmailCampaign(id: string, updates: Partial<EmailCampaign>) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .update(updates)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async scheduleEmailCampaign(id: string, scheduledAt: string) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .update({
        status: 'scheduled',
        scheduled_at: scheduledAt
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async sendEmailCampaignNow(id: string) {
    // Simular envio imediato
    const { data, error } = await supabase
      .from('email_campaigns')
      .update({
        status: 'sent',
        sent_at: new Date().toISOString(),
        sent_count: 'total_recipients' // Em produção, seria o número real de emails enviados
      })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async cancelEmailCampaign(id: string) {
    const { data, error } = await supabase
      .from('email_campaigns')
      .update({ status: 'cancelled' })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  // ==================== TRACKING ====================

  async trackEmailEvent(campaignId: string, recipientEmail: string, eventType: string, eventData?: any) {
    const { data, error } = await supabase
      .from('email_tracking')
      .insert([{
        campaign_id: campaignId,
        recipient_email: recipientEmail,
        event_type: eventType,
        event_data: eventData
      }])
      .select()
      .single();

    if (error) throw error;
    return data;
  }

  async getCampaignAnalytics(campaignId: string) {
    const { data, error } = await supabase
      .from('email_tracking')
      .select('event_type')
      .eq('campaign_id', campaignId);

    if (error) throw error;

    const analytics = data.reduce((acc, event) => {
      acc[event.event_type] = (acc[event.event_type] || 0) + 1;
      return acc;
    }, {});

    return analytics;
  }

  // ==================== AUTOMAÇÃO ====================

  async createWelcomeEmailSequence(userId: string) {
    // Buscar template de boas-vindas
    const { data: template } = await supabase
      .from('email_templates')
      .select('*')
      .eq('template_type', 'welcome')
      .eq('is_active', true)
      .single();

    if (!template) return null;

    // Buscar dados do usuário
    const { data: user } = await supabase
      .from('profiles')
      .select('email, name')
      .eq('id', userId)
      .single();

    if (!user) return null;

    // Criar campanha automática
    const campaign = await this.createEmailCampaign({
      name: `Boas-vindas - ${user.name}`,
      subject: template.subject,
      template_id: template.id,
      list_id: 'welcome-sequence', // Lista especial para sequências
      html_content: template.html_content.replace('{{name}}', user.name),
      text_content: template.text_content?.replace('{{name}}', user.name),
      status: 'scheduled',
      scheduled_at: new Date(Date.now() + 5 * 60000).toISOString(), // 5 minutos
      created_by: 'system'
    });

    return campaign;
  }

  // ==================== RELATÓRIOS ====================

  async getEmailMarketingReport(dateFrom?: string, dateTo?: string) {
    let query = supabase
      .from('email_campaigns')
      .select('*');

    if (dateFrom) {
      query = query.gte('created_at', dateFrom);
    }
    if (dateTo) {
      query = query.lte('created_at', dateTo);
    }

    const { data, error } = await query;
    if (error) throw error;

    const totalCampaigns = data.length;
    const totalSent = data.reduce((acc, campaign) => acc + (campaign.sent_count || 0), 0);
    const totalDelivered = data.reduce((acc, campaign) => acc + (campaign.delivered_count || 0), 0);
    const totalOpened = data.reduce((acc, campaign) => acc + (campaign.opened_count || 0), 0);
    const totalClicked = data.reduce((acc, campaign) => acc + (campaign.clicked_count || 0), 0);

    return {
      totalCampaigns,
      totalSent,
      totalDelivered,
      totalOpened,
      totalClicked,
      deliveryRate: totalSent > 0 ? (totalDelivered / totalSent * 100).toFixed(2) : '0.00',
      openRate: totalDelivered > 0 ? (totalOpened / totalDelivered * 100).toFixed(2) : '0.00',
      clickRate: totalOpened > 0 ? (totalClicked / totalOpened * 100).toFixed(2) : '0.00'
    };
  }
}

export const emailMarketingService = new EmailMarketingService();
