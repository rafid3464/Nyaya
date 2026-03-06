require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
);

async function checkUsers() {
    console.log('Checking Supabase Auth users...');
    const { data, error } = await supabase.auth.admin.listUsers();

    if (error) {
        console.error('Error fetching users:', error);
        return;
    }

    console.log(`Found ${data.users.length} users:`);
    data.users.forEach(u => {
        console.log(`- ${u.email} (ID: ${u.id})`);
    });

    console.log('\nChecking Profiles table...');
    const { data: profiles, error: pError } = await supabase.from('profiles').select('*');
    if (pError) {
        console.error('Error fetching profiles:', pError);
    } else {
        console.log(`Found ${profiles.length} profiles:`);
        profiles.forEach(p => {
            console.log(`- ${p.email} (Name: ${p.name})`);
        });
    }
}

checkUsers();
