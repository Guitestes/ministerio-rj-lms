import { supabase } from '../integrations/supabase/client';

interface EmailTemplate {
  id: string;
  name: string;
  subject: string;
  content: string;
  variables?: string[];
}

interface EmailRecipient {
  email: string;
  name?: string;
}

interface SendEmailParams {
  to: EmailRecipient[];
  subject: string;
  content: string;
  templateId?: string;
  campaignId?: string;
  variables?: Record<string, string>;
}

interface EmailLog {
  id: string;
  recipients: string[];
  subject: string;
  template_id?: string;
  campaign_id?: string;
  status: 'sent' | 'failed' | 'pending';
  error_message?: string;
  sent_at: string;
  created_at: string;
}

interface EmailMetric {
  id: string;
  email_log_id: string;
  recipient_email: string;
  event_type: 'delivered' | 'opened' | 'clicked' | 'bounced' | 'spam' | 'unsubscribed';
  event_data?: any;
  timestamp: string;
}

class EmailService {
  constructor() {
    // Email sending is now handled by Supabase Edge Functions
  }

  async sendEmail(params: SendEmailParams): Promise<string | null> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: params.to,
          subject: params.subject,
          content: params.content,
          templateId: params.templateId,
          campaignId: params.campaignId,
          variables: params.variables
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to send email');
      }

      return data?.logId || null;
    } catch (error: any) {
      console.error('Error sending email:', error);
      
      // Log the failed email
      await this.logEmailSent({
        recipients: params.to,
        subject: params.subject,
        template_id: params.templateId,
        campaign_id: params.campaignId,
        status: 'failed',
        error: error.message
      });
      
      throw error;
    }
  }

  async sendBulkEmail(recipients: EmailRecipient[], subject: string, content: string, templateId?: string, campaignId?: string): Promise<string[]> {
    try {
      const { data, error } = await supabase.functions.invoke('send-email', {
        body: {
          to: recipients,
          subject: subject,
          content: content,
          templateId: templateId,
          campaignId: campaignId,
          isBulk: true
        }
      });

      if (error) {
        throw new Error(error.message || 'Failed to send bulk email');
      }

      return data?.logIds || [];
    } catch (error) {
      console.error('Error sending bulk email:', error);
      throw error;
    }
  }

  async sendCampaignEmail(campaignId: string, listId: string): Promise<boolean> {
    try {
      // Get campaign details
      const { data: campaign, error: campaignError } = await supabase
        .from('marketing_campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        throw new Error('Campaign not found');
      }

      // Get email list recipients
      const { data: listRecipients, error: listError } = await supabase
        .from('email_list_subscribers')
        .select(`
          email,
          name,
          email_lists!inner(id, name)
        `)
        .eq('email_lists.id', listId)
        .eq('status', 'active');

      if (listError) {
        throw new Error('Error fetching email list recipients');
      }

      if (!listRecipients || listRecipients.length === 0) {
        throw new Error('No active recipients found in email list');
      }

      const recipients: EmailRecipient[] = listRecipients.map(recipient => ({
        email: recipient.email,
        name: recipient.name,
      }));

      // Send bulk email
      await this.sendBulkEmail(
        recipients,
        campaign.name,
        campaign.content || 'Conteúdo da campanha',
        campaign.email_template_id
      );

      // Update campaign status
      await supabase
        .from('marketing_campaigns')
        .update({ 
          status: 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', campaignId);

      return true;
    } catch (error) {
      console.error('Error sending campaign email:', error);
      throw error;
    }
  }

  private async logEmailSent(logData: {
    recipients: EmailRecipient[];
    subject: string;
    template_id?: string;
    campaign_id?: string;
    status: 'sent' | 'failed' | 'pending';
    error?: string;
  }): Promise<string | null> {
    try {
      const { data, error } = await supabase.from('email_logs').insert({
        recipients: logData.recipients.map(r => r.email),
        subject: logData.subject,
        template_id: logData.template_id,
        campaign_id: logData.campaign_id,
        status: logData.status,
        error_message: logData.error,
        sent_at: new Date().toISOString(),
      }).select('id').single();

      if (error) throw error;
      return data?.id || null;
    } catch (error) {
      console.error('Error logging email:', error);
      return null;
    }
  }

  // Métodos para gerenciar métricas de email
  async logEmailMetric(logId: string, recipientEmail: string, eventType: EmailMetric['event_type'], eventData?: any): Promise<void> {
    try {
      await supabase.from('email_metrics').insert({
        email_log_id: logId,
        recipient_email: recipientEmail,
        event_type: eventType,
        event_data: eventData,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error logging email metric:', error);
    }
  }

  async getEmailLogs(limit = 50, offset = 0): Promise<EmailLog[]> {
    try {
      const { data, error } = await supabase
        .from('email_logs')
        .select('*')
        .order('sent_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching email logs:', error);
      throw error;
    }
  }

  async getEmailMetrics(logId?: string, recipientEmail?: string): Promise<EmailMetric[]> {
    try {
      let query = supabase.from('email_metrics').select('*');
      
      if (logId) {
        query = query.eq('email_log_id', logId);
      }
      
      if (recipientEmail) {
        query = query.eq('recipient_email', recipientEmail);
      }
      
      const { data, error } = await query.order('timestamp', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching email metrics:', error);
      throw error;
    }
  }

  // Métodos para gerenciar assinantes de listas
  async addSubscriberToList(listId: string, email: string, name?: string): Promise<void> {
    try {
      await supabase.from('email_list_subscribers').insert({
        email_list_id: listId,
        email,
        name,
        status: 'active',
      });
    } catch (error) {
      console.error('Error adding subscriber to list:', error);
      throw error;
    }
  }

  async removeSubscriberFromList(listId: string, email: string): Promise<void> {
    try {
      await supabase
        .from('email_list_subscribers')
        .update({ 
          status: 'unsubscribed',
          unsubscribed_at: new Date().toISOString()
        })
        .eq('email_list_id', listId)
        .eq('email', email);
    } catch (error) {
      console.error('Error removing subscriber from list:', error);
      throw error;
    }
  }

  async getListSubscribers(listId: string, status: 'active' | 'unsubscribed' | 'bounced' = 'active'): Promise<EmailRecipient[]> {
    try {
      const { data, error } = await supabase
        .from('email_list_subscribers')
        .select('email, name')
        .eq('email_list_id', listId)
        .eq('status', status);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching list subscribers:', error);
      throw error;
    }
  }

  async getEmailTemplates(): Promise<EmailTemplate[]> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Error fetching email templates:', error);
      throw error;
    }
  }

  async createEmailTemplate(template: Omit<EmailTemplate, 'id'>): Promise<EmailTemplate> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .insert(template)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error creating email template:', error);
      throw error;
    }
  }

  async updateEmailTemplate(id: string, updates: Partial<EmailTemplate>): Promise<EmailTemplate> {
    try {
      const { data, error } = await supabase
        .from('email_templates')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error updating email template:', error);
      throw error;
    }
  }

  async deleteEmailTemplate(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('email_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;
    } catch (error) {
      console.error('Error deleting email template:', error);
      throw error;
    }
  }

  async testEmailConnection(): Promise<boolean> {
    try {
      const { data, error } = await supabase.functions.invoke('test-email-connection');
      
      if (error) {
        console.error('Email connection test failed:', error);
        return false;
      }
      
      return data?.success || false;
    } catch (error) {
      console.error('Email connection test failed:', error);
      return false;
    }
  }
}

export const emailService = new EmailService();
export default emailService;