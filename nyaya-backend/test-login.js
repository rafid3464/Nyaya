require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

console.log('Testing Supabase Connection to:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey);

async function testLogin() {
    console.log('Attempting to log in as dyevikbraj2005@gmail.com...');
    const { data, error } = await supabase.auth.signInWithPassword({
        email: 'dyevikbraj2005@gmail.com',
        password: 'Dyevik@2005'
    });

    if (error) {
        console.error('Login Error:', error.message, error);
    } else {
        console.log('Login Success!', data.user.id);
    }
}

testLogin();
