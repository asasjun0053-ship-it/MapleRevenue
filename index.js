require('dotenv').config();
const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;
const NEXON_API_KEY = process.env.NEXON_API_KEY;
const NEXON_BASE = 'https://open.api.nexon.com/maplestory/v1';

if (!NEXON_API_KEY) {
  console.warn('[경고] NEXON_API_KEY가 설정되지 않았어요. .env 파일을 확인해주세요.');
}

// 프론트엔드에서만 호출하도록 origin 제한 (배포 후 .env의 ALLOWED_ORIGIN을 실제 주소로 좁혀주세요)
const allowedOrigin = process.env.ALLOWED_ORIGIN || '*';
app.use(cors({ origin: allowedOrigin === '*' ? true : allowedOrigin.split(',') }));

// 같은 캐릭터를 짧은 시간 안에 반복 조회하지 않도록 5분 캐시 (넥슨 API 호출 제한 보호용)
const cache = new Map(); // name -> { data, expiresAt }
const CACHE_MS = 5 * 60 * 1000;

function getCached(name) {
  const hit = cache.get(name);
  if (hit && hit.expiresAt > Date.now()) return hit.data;
  return null;
}
function setCached(name, data) {
  cache.set(name, { data, expiresAt: Date.now() + CACHE_MS });
}

async function nexonFetch(path) {
  const res = await fetch(`${NEXON_BASE}${path}`, {
    headers: { 'x-nxopen-api-key': NEXON_API_KEY },
  });
  const body = await res.json();
  if (!res.ok) {
    const err = new Error(body?.error?.message || `넥슨 API 오류 (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return body;
}

// 캐릭터명 → ocid, 기본정보, 전투력을 한 번에 묶어서 반환
app.get('/api/character', async (req, res) => {
  const name = (req.query.name || '').trim();
  if (!name) {
    return res.status(400).json({ error: '캐릭터명(name)을 입력해주세요.' });
  }

  const cached = getCached(name);
  if (cached) return res.json({ ...cached, cached: true });

  try {
    const idData = await nexonFetch(`/id?character_name=${encodeURIComponent(name)}`);
    const ocid = idData.ocid;

    const [basic, stat] = await Promise.all([
      nexonFetch(`/character/basic?ocid=${ocid}`),
      nexonFetch(`/character/stat?ocid=${ocid}`),
    ]);

    const combatPowerStat = stat.final_stat?.find((s) => s.stat_name === '전투력');
    const combatPower = combatPowerStat ? Number(combatPowerStat.stat_value) : null;

    const result = {
      name: basic.character_name,
      level: basic.character_level,
      job: basic.character_class,
      guild: basic.character_guild_name || null,
      world: basic.world_name,
      combatPower,
      imageUrl: basic.character_image,
      updatedAt: new Date().toISOString(),
    };

    setCached(name, result);
    res.json({ ...result, cached: false });
  } catch (err) {
    const status = err.status === 400 ? 404 : (err.status || 500);
    res.status(status).json({
      error: status === 404
        ? `'${name}' 캐릭터를 찾을 수 없어요. 이름을 다시 확인해주세요.`
        : (err.message || '캐릭터 정보를 가져오지 못했어요.'),
    });
  }
});

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(PORT, () => {
  console.log(`메소로그 프록시 서버 실행 중: http://localhost:${PORT}`);
});
