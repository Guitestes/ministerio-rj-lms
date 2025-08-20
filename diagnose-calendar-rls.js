import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ynbbpcurdsbijxaazive.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InluYmJwY3VyZHNiaWp4YWF6aXZlIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NDQ5MTc5OCwiZXhwIjoyMDcwMDY3Nzk4fQ.olW15brQSZ82h9HwCx3VFpGZVMk9LobOGItUiLgRpaI';
const supabase = createClient(supabaseUrl, supabaseKey);

async function diagnoseRLS() {
  try {
    const { data, error } = await supabase
      .from('pg_policies')
      .select('*')
      .eq('tablename', 'calendar_events')
      .eq('schemaname', 'public');

    if (error) throw error;
    console.log('Current RLS Policies for calendar_events:', data);
  } catch (error) {
    console.error('Error querying policies:', error);
  }
}

diagnoseRLS();