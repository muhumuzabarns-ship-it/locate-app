import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://geaitemndlefubjitxwo.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdlYWl0ZW1uZGxlZnViaml0eHdvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODgxNzM1NDIsImV4cCI6MjEwMzc0OTU0Mn0.nW1uzhVWs4YFH2YYNDdxanYJRYM_4Dvwl4B2OQEiCQE'

export const supabase = createClient(supabaseUrl, supabaseKey)