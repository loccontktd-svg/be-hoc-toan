"""Tạo file giọng đọc tiếng Việt (edge-tts) cho mọi câu trong voice/list.json.
Chỉ tạo file còn thiếu, nên chạy lại bao nhiêu lần cũng được."""
import asyncio
import json
import sys
from pathlib import Path

import edge_tts

VOICE = "vi-VN-HoaiMyNeural"
RATE = "-8%"      # đọc chậm hơn một chút cho bé
PITCH = "+8Hz"    # giọng tươi hơn

ROOT = Path(__file__).resolve().parent.parent / "voice"


async def one(sem, item, stats):
    out = ROOT / item["f"]
    if out.exists() and out.stat().st_size > 500:
        stats["skip"] += 1
        return
    async with sem:
        for attempt in range(4):
            try:
                tmp = out.with_suffix(".part")
                await edge_tts.Communicate(item["t"], VOICE, rate=RATE, pitch=PITCH).save(str(tmp))
                tmp.replace(out)
                stats["ok"] += 1
                return
            except Exception as e:  # mạng chập chờn -> thử lại
                if attempt == 3:
                    stats["fail"] += 1
                    print("FAIL", item["t"], e, file=sys.stderr)
                await asyncio.sleep(1.5 * (attempt + 1))


async def main():
    items = json.loads((ROOT / "list.json").read_text(encoding="utf-8"))
    stats = {"ok": 0, "skip": 0, "fail": 0}
    sem = asyncio.Semaphore(8)
    await asyncio.gather(*(one(sem, it, stats) for it in items))
    keep = {it["f"] for it in items}
    removed = 0
    for f in ROOT.glob("*.mp3"):
        if f.name not in keep:
            f.unlink()
            removed += 1
    print(f"total={len(items)} new={stats['ok']} existed={stats['skip']} fail={stats['fail']} removed_old={removed}")


asyncio.run(main())
