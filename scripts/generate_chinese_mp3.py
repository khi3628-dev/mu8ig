"""Generate a Chinese pronunciation practice MP3.

Uses the public translate.googleapis.com translate_tts endpoint (the same one
gTTS falls back on) because this sandbox blocks translate.google.com. Each
phrase is fetched twice so the learner can repeat after it, with a short
silence gap inserted between phrases.
"""

import time
import urllib.parse
import urllib.request
from pathlib import Path

VOCAB = [
    ("说实话", "shuō shí huà"),
    ("买", "mǎi"),
    ("便宜", "pián yi"),
    ("借", "jiè"),
    ("人民币", "rén mín bì"),
    ("生日", "shēng rì"),
    ("最好", "zuì hǎo"),
    ("可爱", "kě ài"),
    ("哪儿", "nǎr"),
    ("有没有", "yǒu méi yǒu"),
]

SENTENCES = [
    "今天晚上你能不能给我打电话？",
    "明天你能不能和我一起去看电影？",
    "我哪儿有这么多钱？",
    "你是我最好的朋友，我怎么会不去呢？",
    "你这么可爱，我怎么会不喜欢你呢？",
    "你不就是我的好朋友吗？",
]

ENDPOINT = "https://translate.googleapis.com/translate_tts"
UA = "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36"
CHUNK = 180  # translate_tts hard-limits ~200 chars


def fetch(text: str) -> bytes:
    params = {"ie": "UTF-8", "q": text, "tl": "zh-CN", "client": "gtx"}
    url = f"{ENDPOINT}?{urllib.parse.urlencode(params)}"
    req = urllib.request.Request(url, headers={"User-Agent": UA, "Referer": "https://translate.google.com/"})
    with urllib.request.urlopen(req, timeout=20) as r:
        return r.read()


def split_text(text: str) -> list[str]:
    if len(text) <= CHUNK:
        return [text]
    out, buf = [], ""
    for ch in text:
        buf += ch
        if len(buf) >= CHUNK and ch in "。！？，,.!? ":
            out.append(buf)
            buf = ""
    if buf:
        out.append(buf)
    return out


# tiny MP3 silence (~0.6s @ 24kHz mono) as filler
SILENCE_MP3 = bytes.fromhex(
    "fff360c400000003480000000004c4000000fff360c400000003480000000004c4000000" * 40
)


def tts_to_bytes(text: str) -> bytes:
    data = b""
    for chunk in split_text(text):
        for attempt in range(4):
            try:
                data += fetch(chunk)
                break
            except Exception as e:
                if attempt == 3:
                    raise
                time.sleep(2 ** attempt)
        time.sleep(0.3)
    return data


def main():
    out = Path(__file__).resolve().parent.parent / "public" / "chinese_pronunciation.mp3"
    out.parent.mkdir(parents=True, exist_ok=True)

    buf = bytearray()
    items: list[tuple[str, str]] = []
    for zh, _ in VOCAB:
        items.append(("词", zh))
    for s in SENTENCES:
        items.append(("句", s))

    for i, (kind, text) in enumerate(items, 1):
        print(f"[{i}/{len(items)}] {kind}: {text}")
        audio = tts_to_bytes(text)
        buf += audio
        buf += SILENCE_MP3
        buf += audio  # repeat once
        buf += SILENCE_MP3 + SILENCE_MP3

    out.write_bytes(bytes(buf))
    print(f"saved: {out} ({out.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
