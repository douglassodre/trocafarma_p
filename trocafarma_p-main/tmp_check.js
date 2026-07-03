const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://sfbmelnwdslnyyyzxlzb.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNmYm1lbG53ZHNsbnl5eXp4bHpiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY3NTU1NDIsImV4cCI6MjA4MjMzMTU0Mn0.FasE7Iahi3RgdR7xm5eCUvzJAeM8s1ibpu-1gDlW76Y';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
    const { data: cols, error: colsError } = await supabase.rpc('query', {
        // Can't easily use raw queries without postgres access. Let's try to update a test row and see the error.
    });

    const { data, error } = await supabase
        .from('solicitacoes_urgentes')
        .select('*')
        .limit(1);

    console.log("Error querying directly:", error);

    // Get an ID to test update (this will fail RLS if not logged in, but we can see the format)
    if (data && data.length > 0) {
        console.log("Trying to update status to FINALIZADA...");
        const res = await supabase.from('solicitacoes_urgentes').update({ status: 'FINALIZADA' }).eq('id', data[0].id);
        console.log(res.error);

        console.log("Trying to update status to INATIVA...");
        const res2 = await supabase.from('solicitacoes_urgentes').update({ status: 'INATIVA' }).eq('id', data[0].id);
        console.log(res2.error);
    }
}
check();
