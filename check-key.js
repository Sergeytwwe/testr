const { createClient } = require('@supabase/supabase-js');

// Проверяем переменные окружения
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
  console.error('Missing Supabase environment variables');
}

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_ANON_KEY || ''
);

module.exports = async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    // Проверяем подключение к Supabase
    if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
      return res.status(500).json({ error: 'Server configuration error' });
    }

    const { hwid, key, first_val, second_val } = req.body;

    if (!hwid || !key || first_val === undefined || second_val === undefined) {
      return res.status(400).json({ error: 'Missing required fields: hwid, key, first_val, second_val' });
    }

    // Тестовый запрос к Supabase
    const { data: keyData, error } = await supabase
      .from('activation_keys')
      .select('*')
      .eq('key', key)
      .limit(1)
      .single();

    if (error) {
      console.error('Supabase error:', error);
      // Если ключа нет, но ошибка не "not found"
      if (error.code !== 'PGRST116') {
        return res.status(500).json({ error: 'Database error: ' + error.message });
      }
      return res.status(401).json({ error: 'Invalid key' });
    }

    if (!keyData) {
      return res.status(401).json({ error: 'Key not found' });
    }

    // Простая успешная ответ для теста
    const newfirst_val = 3 * first_val * first_val + 7 * first_val - 19;
    const newsecond_val = 5 * second_val * second_val * second_val - 11 * second_val + 42;

    res.status(200).json({
      status: 'allow',
      newfirst_val: newfirst_val,
      newsecond_val: newsecond_val,
      days: 30,
      is_dev: false,
      message: 'API is working!'
    });

  } catch (error) {
    console.error('Global error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      details: error.message 
    });
  }
};
