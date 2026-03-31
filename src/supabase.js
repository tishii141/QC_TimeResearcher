import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = 'https://mhrfeveailywjzywhdrw.supabase.co'
const SUPABASE_KEY = 'sb_publishable_X9gxJffDqms2kntmddK5tA_1sm76-u4'

export const sb = createClient(SUPABASE_URL, SUPABASE_KEY)
