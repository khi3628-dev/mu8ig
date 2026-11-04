"""Make a seamless loop: find the loop length (near N bars) where the audio after the loop point
# Usage (from zoo-tycoon/): ffmpeg -i art/bgm-original.mp3 -ar 44100 -ac 2 /tmp/src.wav
#   python3 tools/loop_bgm.py /tmp/src.wav /tmp/loop.wav && ffmpeg -i /tmp/loop.wav -b:a 128k assets/bgm.mp3
matches the start best, then crossfade the tail into the head."""
import sys, wave, numpy as np
src, out = sys.argv[1], sys.argv[2]
w = wave.open(src); sr = w.getframerate()
x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).reshape(-1, 2).astype(np.float32) / 32768
m = x.mean(1)
usable = 51.8                                    # music body ends ~52 s, an outro follows
s0 = int(np.argmax(np.abs(m) > 0.02))            # first sound
c = int(1.0 * sr)                                # crossfade length
win = int(2.0 * sr)
head = m[s0:s0 + win]
best, bestL = -2, None
for L in range(int(46 * sr), int((usable - 1.0) * sr) - s0, int(0.005 * sr)):
    seg = m[s0 + L:s0 + L + win]
    if len(seg) < win: break
    r = np.dot(head, seg) / (np.linalg.norm(head) * np.linalg.norm(seg) + 1e-9)
    if r > best: best, bestL = r, L
L = bestL
y = x[s0:s0 + L].copy()
t = np.linspace(0, 1, c)[:, None]
fade_in, fade_out = np.sin(t * np.pi / 2), np.cos(t * np.pi / 2)   # equal-power crossfade
y[:c] = x[s0:s0 + c] * fade_in + x[s0 + L:s0 + L + c] * fade_out
y = np.clip(y, -1, 1)
o = wave.open(out, 'wb'); o.setnchannels(2); o.setsampwidth(2); o.setframerate(sr)
o.writeframes((y * 32767).astype(np.int16).tobytes()); o.close()
print(f'start {s0/sr:.3f}s, loop length {L/sr:.3f}s, match {best:.3f}')
