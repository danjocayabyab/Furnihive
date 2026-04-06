// Test script to verify Supabase connection
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://flwvghsjwhxtwlzgylao.supabase.co';
const supabaseAnonKey = 'your_anon_key_here'; // Replace with actual key

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function testConnection() {
  console.log('Testing Supabase connection...');
  
  try {
    // Test basic connection
    const { data, error } = await supabase.from('profiles').select('count');
    console.log('Connection test:', { data, error });
    
    // Test signup
    const { data: signupData, error: signupError } = await supabase.auth.signUp({
      email: 'test@example.com',
      password: 'password123',
      options: {
        data: {
          first_name: 'Test',
          last_name: 'User',
          role: 'buyer',
        },
        emailRedirectTo: 'http://localhost:5173/verify-email',
      },
    });
    
    console.log('Signup test:', { signupData, signupError });
    
  } catch (err) {
    console.error('Test error:', err);
  }
}

testConnection();
