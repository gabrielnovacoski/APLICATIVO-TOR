
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://dystsudjmawlgsvlccbv.supabase.co';
const supabaseAnonKey = 'sb_publishable_M75234QWAt5xzqKkT61xew_9_23G3Gq';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkUsers() {
    console.log('Verificando perfis de usuários...');

    const { data: profiles, error } = await supabase
        .from('user_profiles')
        .select('*');

    if (error) {
        console.error('Erro ao buscar perfis:', error);
        process.exit(1);
    }

    console.log('Perfis encontrados:', JSON.stringify(profiles, null, 2));
}

checkUsers();
