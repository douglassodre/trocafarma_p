
import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://sfbmelnwdslnyyyzxlzb.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm1lbG53ZHNsbnl5eXp4bHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NTU1NDIsImV4cCI6MjA4MjMzMTU0Mn0.FasE7Iahi3RgdR7xm5eCUvzJAeM8s1ibpu-1gDlW76Y'

export const supabase = createClient(supabaseUrl, supabaseKey)
