// Vercel serverless endpoint: reads the public live API and returns only boss fields.
export default async function handler(req, res) {
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed' });
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    let response;
    try {
      response = await fetch('https://www.starserver.online/api/live', {
        signal: controller.signal,
        headers: { 'Accept': 'application/json', 'User-Agent': 'StarBossMonitor/1.0' }
      });
    } finally { clearTimeout(timer); }
    if (!response.ok) throw new Error(`Upstream HTTP ${response.status}`);
    const data = await response.json();
    // API shape was observed in browser screenshots; support a common envelope as a fallback.
    const bosses = Array.isArray(data?.bosses) ? data.bosses :
      Array.isArray(data?.data?.bosses) ? data.data.bosses : null;
    if (!bosses) throw new Error('No bosses array in API response');
    const clean = bosses.map(b => ({
      key: String(b.key ?? ''),
      name: String(b.name ?? '이름 없음'),
      category: String(b.category ?? ''),
      status: String(b.status ?? ''),
      next_spawn_at: b.next_spawn_at ?? null,
      interval_minutes: Number.isFinite(Number(b.interval_minutes)) ? Number(b.interval_minutes) : null,
      schedule_kind: String(b.schedule_kind ?? '')
    }));
    res.setHeader('Cache-Control', 'public, s-maxage=10, stale-while-revalidate=10');
    res.status(200).json({ bosses: clean, fetched_at: new Date().toISOString() });
  } catch (err) {
    res.setHeader('Cache-Control', 'no-store');
    res.status(502).json({ error: '보스 데이터를 가져오지 못했습니다.', detail: String(err.message || err) });
  }
}
