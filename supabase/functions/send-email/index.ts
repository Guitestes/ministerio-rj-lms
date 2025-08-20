import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface EmailRequest {
  to: Array<{ email: string; name?: string }>
  subject: string
  content: string
  templateId?: string
  campaignId?: string
  variables?: Record<string, string>
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')

    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    // Verify user is authenticated
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token)
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Parse request body
    const { to, subject, content, templateId, campaignId, variables, isBulk } = await req.json()
    const emailRequest: EmailRequest = { to, subject, content, templateId, campaignId, variables }

    // Get SendGrid API key from environment
    const sendGridApiKey = Deno.env.get('SENDGRID_API_KEY')
    if (!sendGridApiKey) {
      throw new Error('SendGrid API key not configured')
    }

    let logIds: string[] = [];

    if (isBulk && Array.isArray(emailRequest.to)) {
      // Handle bulk email sending
      const batchSize = 1000; // SendGrid limit
      const batches: Array<{ email: string; name?: string }[]> = [];
      
      for (let i = 0; i < emailRequest.to.length; i += batchSize) {
        batches.push(emailRequest.to.slice(i, i + batchSize));
      }

      for (const batch of batches) {
        const emailData = {
          personalizations: batch.map(recipient => ({
            to: [{ email: recipient.email, name: recipient.name }],
            subject: emailRequest.subject,
            ...(emailRequest.variables && { dynamic_template_data: emailRequest.variables })
          })),
          from: {
            email: 'noreply@oneeduca.com',
            name: 'OneEduca'
          },
          content: [{
            type: 'text/html',
            value: emailRequest.content
          }],
          ...(emailRequest.templateId && { template_id: emailRequest.templateId })
        };

        // Send email via SendGrid
        const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${sendGridApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(emailData)
        });

        if (!sendGridResponse.ok) {
          const errorText = await sendGridResponse.text();
          throw new Error(`SendGrid API error: ${sendGridResponse.status} - ${errorText}`);
        }

        // Log each batch
        const logData = {
          recipients: batch.map((r: { email: string; name?: string }) => r.email),
          subject: emailRequest.subject,
          template_id: emailRequest.templateId || null,
          campaign_id: emailRequest.campaignId || null,
          status: 'sent' as const,
          sent_at: new Date().toISOString()
        };

        const { data: logResult, error: logError } = await supabaseClient
          .from('email_logs')
          .insert(logData)
          .select()
          .single();

        if (logError) {
          console.error('Failed to log email:', logError);
        } else if (logResult?.id) {
          logIds.push(logResult.id);
        }
      }
    } else {
      // Handle single email sending
      const emailData = {
        personalizations: emailRequest.to.map(recipient => ({
          to: [{ email: recipient.email, name: recipient.name }],
          subject: emailRequest.subject,
          ...(emailRequest.variables && { dynamic_template_data: emailRequest.variables })
        })),
        from: {
          email: 'noreply@oneeduca.com',
          name: 'OneEduca'
        },
        content: [{
          type: 'text/html',
          value: emailRequest.content
        }],
        ...(emailRequest.templateId && { template_id: emailRequest.templateId })
      };

      // Send email via SendGrid
      const sendGridResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sendGridApiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(emailData)
      });

      if (!sendGridResponse.ok) {
        const errorText = await sendGridResponse.text();
        throw new Error(`SendGrid API error: ${sendGridResponse.status} - ${errorText}`);
      }

      // Log email to database
      const logData = {
        recipients: emailRequest.to.map((r: { email: string; name?: string }) => r.email),
        subject: emailRequest.subject,
        template_id: emailRequest.templateId || null,
        campaign_id: emailRequest.campaignId || null,
        status: 'sent' as const,
        sent_at: new Date().toISOString()
      };

      const { data: logResult, error: logError } = await supabaseClient
        .from('email_logs')
        .insert(logData)
        .select()
        .single();

      if (logError) {
        console.error('Failed to log email:', logError);
      } else if (logResult?.id) {
        logIds.push(logResult.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email sent successfully',
        logId: logIds[0] || null,
        logIds: logIds
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    
    return new Response(
      JSON.stringify({ 
        error: 'Failed to send email', 
        details: error.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})