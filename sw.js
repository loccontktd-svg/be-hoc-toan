// Lưu app vào máy để chơi được khi không có mạng.
// Mỗi lần sửa app, tăng số VERSION để điện thoại tải bản mới.
const VERSION = "be-hoc-toan-v5";
const VOICE_CACHE = "be-hoc-toan-voice"; // giọng đọc giữ lại qua các phiên bản
const FILES = ["./", "index.html", "app.js", "phrases.js", "manifest.json", "icon-180.png", "icon-192.png", "icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(FILES)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (e) => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter((k) => k !== VERSION && k !== VOICE_CACHE).map((k) => caches.delete(k)));
    await self.clients.claim();
    // Tải sẵn toàn bộ giọng đọc (chỉ file còn thiếu)
    try {
      const list = await (await fetch("voice/list.json", { cache: "no-store" })).json();
      const vc = await caches.open(VOICE_CACHE);
      const have = new Set((await vc.keys()).map((r) => new URL(r.url).pathname.split("/").pop()));
      const need = list.map((x) => x.f).filter((f) => !have.has(f));
      for (let i = 0; i < need.length; i += 20) {
        await Promise.allSettled(need.slice(i, i + 20).map((f) => vc.add("voice/" + f)));
      }
    } catch (err) { /* mạng lỗi: lần sau thử lại */ }
  })());
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // File giọng không đổi -> lấy trong máy trước
  if (url.pathname.includes("/voice/") && url.pathname.endsWith(".mp3")) {
    e.respondWith(caches.open(VOICE_CACHE).then(async (c) => {
      const hit = await c.match(req);
      if (hit) return hit;
      const res = await fetch(req);
      if (res.ok) c.put(req, res.clone());
      return res;
    }));
    return;
  }
  // Còn lại: có mạng lấy bản mới, mất mạng dùng bản đã lưu
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok && url.origin === location.origin) { const copy = res.clone(); caches.open(VERSION).then((c) => c.put(req, copy)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match("index.html")))
  );
});
