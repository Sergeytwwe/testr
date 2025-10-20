const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_ANON_KEY
);

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { hwid, key, first_val, second_val } = req.body;

    if (!hwid || !key || !first_val || !second_val) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Проверяем ключ в базе
    const { data: keyData, error } = await supabase
      .from('activation_keys')
      .select('*')
      .eq('key', key)
      .eq('is_used', false)
      .eq('expired', false)
      .single();

    if (error || !keyData) {
      return res.status(401).json({ error: 'Invalid or expired key' });
    }

    // Проверяем срок действия
    if (keyData.expires_at && new Date(keyData.expires_at) < new Date()) {
      // Помечаем ключ как просроченный
      await supabase
        .from('activation_keys')
        .update({ expired: true })
        .eq('key', key);
      
      return res.status(401).json({ error: 'Key expired' });
    }

    // Проверяем, не использован ли ключ с другим HWID
    const { data: existingHwid } = await supabase
      .from('key_activations')
      .select('hwid')
      .eq('key', key)
      .neq('hwid', hwid)
      .single();

    if (existingHwid) {
      return res.status(401).json({ error: 'Key already activated on different device' });
    }

    // Записываем активацию
    const { error: activationError } = await supabase
      .from('key_activations')
      .upsert({
        key: key,
        hwid: hwid,
        activated_at: new Date().toISOString(),
        first_val: first_val,
        second_val: second_val,
        last_check: new Date().toISOString()
      }, {
        onConflict: 'key, hwid'
      });

    if (activationError) {
      console.error('Activation error:', activationError);
      return res.status(500).json({ error: 'Activation failed' });
    }

    // Вычисляем математические значения для проверки
    const newfirst_val = 3 * first_val * first_val + 7 * first_val - 19;
    const newsecond_val = 5 * second_val * second_val * second_val - 11 * second_val + 42;

    // Рассчитываем оставшиеся дни
    let days_left = 'unlimited';
    let is_dev = false;

    if (keyData.expires_at) {
      const expires = new Date(keyData.expires_at);
      const now = new Date();
      const diffTime = expires - now;
      days_left = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      days_left = Math.max(0, days_left);
    }

    // Проверяем, является ли пользователь разработчиком (уровень 3)
    const { data: creatorData } = await supabase
      .from('user_levels')
      .select('level')
      .eq('user_id', keyData.created_by)
      .single();

    if (creatorData && creatorData.level === 3) {
      is_dev = true;
    }

    res.status(200).json({
      status: 'allow',
      newfirst_val: newfirst_val,
      newsecond_val: newsecond_val,
      days: days_left,
      is_dev: is_dev
    });

  } catch (error) {
    console.error('Check key error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};