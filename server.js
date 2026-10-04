// 家用 KTV 點歌系統：電視播放 + 手機點歌
// 啟動：npm install → npm start
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const os = require('os');
const { Server } = require('socket.io');
const QRCode = require('qrcode');

// ---- 讀取 .env（不額外裝套件）----
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*)\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}
const PORT = Number(process.env.PORT) || 3000;
const API_KEY = process.env.YT_API_KEY || '';

const app = express();
const server = http.createServer(app);
const io = new Server(server);
app.use(express.static(path.join(__dirname, 'public')));

// 虛擬網卡（VirtualBox、VMware、Hyper-V、WSL、Docker、VPN）的 IP 手機連不到，要排除
const VIRTUAL = /virtual|vmware|vbox|hyper-v|vethernet|wsl|docker|br-|veth|tailscale|zerotier|vpn|tun|tap|utun/i;
function lanIPs() {
  const real = [], virt = [];
  for (const [name, list] of Object.entries(os.networkInterfaces())) {
    for (const i of list || []) {
      if (i.family !== 'IPv4' && i.family !== 4) continue;
      if (i.internal || i.address.startsWith('169.254.')) continue;
      (VIRTUAL.test(name) || i.address === '192.168.56.1' ? virt : real).push(i.address);
    }
  }
  const rank = a => a.startsWith('192.168.') ? 0 : a.startsWith('10.') ? 1 : a.startsWith('172.') ? 2 : 3;
  return [...real.sort((a, b) => rank(a) - rank(b)), ...virt];
}
// 自動抓錯時，可在 .env 寫 HOST_IP=192.168.x.x 指定
function lanIP() { return process.env.HOST_IP || lanIPs()[0] || 'localhost'; }

// ---- 共用狀態 ----
const state = { queue: [], current: null, playing: false, volume: 80, history: [] };
let uid = 1;
const isVideoId = v => typeof v === 'string' && /^[\w-]{11}$/.test(v);
const clean = (s, n = 120) => String(s || '').slice(0, n);

function broadcast() { io.emit('state', state); }
function playNext() {
  if (state.current) {
    state.history.unshift(state.current);
    state.history = state.history.slice(0, 50);
  }
  state.current = state.queue.shift() || null;
  state.playing = !!state.current;
  broadcast();
}

// ---- API ----
app.get('/api/info', async (req, res) => {
  const url = `http://${lanIP()}:${PORT}/`;
  const qr = await QRCode.toDataURL(url, { margin: 1, width: 360, color: { dark: '#1B1033', light: '#FFFFFF' } });
  res.json({ url, qr, hasKey: !!API_KEY });
});

const decode = s => String(s)
  .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>');
const cache = new Map(); // 節省 YouTube API 配額

app.get('/api/search', async (req, res) => {
  const q = clean(req.query.q, 80).trim();
  if (!q) return res.json({ items: [] });
  if (!API_KEY) return res.status(400).json({ error: '尚未設定 YT_API_KEY，請在 .env 填入 YouTube API 金鑰。也可以直接貼上 YouTube 連結點歌。' });
  const hit = cache.get(q);
  if (hit && Date.now() - hit.t < 30 * 60 * 1000) return res.json({ items: hit.items });
  const params = new URLSearchParams({
    part: 'snippet', type: 'video', maxResults: '20', q, key: API_KEY,
    videoEmbeddable: 'true', regionCode: 'TW', relevanceLanguage: 'zh-Hant', safeSearch: 'none'
  });
  try {
    const r = await fetch(`https://www.googleapis.com/youtube/v3/search?${params}`);
    const j = await r.json();
    if (!r.ok) return res.status(502).json({ error: j?.error?.message || 'YouTube 搜尋失敗' });
    const items = (j.items || []).filter(it => it.id?.videoId).map(it => ({
      videoId: it.id.videoId,
      title: decode(it.snippet.title),
      channel: decode(it.snippet.channelTitle),
      thumb: it.snippet.thumbnails?.medium?.url || it.snippet.thumbnails?.default?.url || ''
    }));
    cache.set(q, { t: Date.now(), items });
    res.json({ items });
  } catch (e) {
    res.status(502).json({ error: '連不到 YouTube，請確認網路。' });
  }
});

// 貼連結點歌用：不需要 API 金鑰
app.get('/api/video/:id', async (req, res) => {
  const id = req.params.id;
  if (!isVideoId(id)) return res.status(400).json({ error: '連結格式不對' });
  try {
    const r = await fetch(`https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=${id}`);
    if (!r.ok) return res.status(404).json({ error: '找不到這部影片，或影片不開放嵌入' });
    const j = await r.json();
    res.json({ videoId: id, title: j.title, channel: j.author_name, thumb: `https://i.ytimg.com/vi/${id}/mqdefault.jpg` });
  } catch {
    res.status(502).json({ error: '連不到 YouTube，請確認網路。' });
  }
});

// ---- 即時同步 ----
io.on('connection', socket => {
  socket.emit('state', state);

  socket.on('add', s => {
    if (!s || !isVideoId(s.videoId)) return;
    const song = {
      id: uid++, videoId: s.videoId, title: clean(s.title), channel: clean(s.channel, 60),
      thumb: clean(s.thumb, 300), by: clean(s.by, 12) || '來賓', addedAt: Date.now()
    };
    if (s.next) state.queue.unshift(song); else state.queue.push(song);
    io.emit('toast', `${song.by} ${s.next ? '插播' : '點了'}：${song.title}`);
    if (!state.current) playNext(); else broadcast();
  });

  socket.on('remove', id => { state.queue = state.queue.filter(s => s.id !== id); broadcast(); });

  socket.on('top', id => {
    const i = state.queue.findIndex(s => s.id === id);
    if (i > 0) { state.queue.unshift(state.queue.splice(i, 1)[0]); broadcast(); }
  });

  socket.on('clear', () => { state.queue = []; broadcast(); });

  socket.on('skip', () => playNext());

  socket.on('toggle', () => {
    if (!state.current) return;
    state.playing = !state.playing;
    io.emit('cmd', { type: state.playing ? 'play' : 'pause' });
    broadcast();
  });

  socket.on('replay', () => { if (state.current) io.emit('cmd', { type: 'restart' }); });

  socket.on('volume', v => {
    state.volume = Math.max(0, Math.min(100, Number(v) || 0));
    io.emit('cmd', { type: 'volume', value: state.volume });
    broadcast();
  });

  // 以下由電視端回報
  socket.on('ended', id => { if (state.current?.id === id) playNext(); });
  socket.on('tvError', ({ id, code } = {}) => {
    if (state.current?.id !== id) return;
    const reason = (code === 101 || code === 150) ? '版權方不允許嵌入播放' : '影片無法播放';
    io.emit('toast', `已跳過「${state.current.title}」：${reason}`);
    playNext();
  });
  socket.on('tvPlaying', p => {
    if (typeof p === 'boolean' && p !== state.playing) { state.playing = p; broadcast(); }
  });
  socket.on('progress', p => socket.broadcast.emit('progress', p));
});

server.listen(PORT, '0.0.0.0', () => {
  const ip = lanIP();
  console.log('\n🎤 家用 KTV 已啟動');
  console.log(`   電視開：http://${ip}:${PORT}/tv.html`);
  console.log(`   手機開：http://${ip}:${PORT}/  （或掃電視上的 QR Code）`);
  const others = lanIPs().filter(a => a !== ip);
  if (others.length) {
    console.log('   手機打不開的話，換這些網址試試看（找到能開的，在 .env 寫 HOST_IP=那個IP）：');
    for (const a of others) console.log(`     http://${a}:${PORT}/`);
  }
  if (!API_KEY) console.log('   ⚠️ 尚未設定 YT_API_KEY：只能貼 YouTube 連結點歌，不能搜尋');
  console.log('');
});
