// Round 2 resubmission: Synthesised sound logic
// Round 2 resubmission: Audio engine handlers
// Synthesised sound only (WebAudio, no audio files): engine hum, siren, shots, pickups, music.
export function createAudio() {
  let ctx = null, master = null, muted = false, engineOsc = null, engineGain = null, musicTimer = 0, musicStep = 0;
  const STATIONS = ['SOLMAR FM 88.4 — Sunset Drive', 'BAY WAVE 101.2 — Neon Nights', 'PIER RADIO 76.1 — Low Tide'];
  let station = 0;
  function ensure() {
    if (ctx) return true;
    try {
      ctx = new (window.AudioContext || window.webkitAudioContext)();
      master = ctx.createGain(); master.gain.value = 0.35; master.connect(ctx.destination);
      engineOsc = ctx.createOscillator(); engineOsc.type = 'sawtooth'; engineOsc.frequency.value = 55;
      engineGain = ctx.createGain(); engineGain.gain.value = 0; engineOsc.connect(engineGain); engineGain.connect(master); engineOsc.start();
    } catch { return false; }
    return true;
  }
  function tone(freq, dur, type, vol, slideTo) {
    if (!ensure() || muted) return;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type || 'sine'; o.frequency.value = freq;
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
    g.gain.setValueAtTime(vol || 0.2, ctx.currentTime); g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    o.connect(g); g.connect(master); o.start(); o.stop(ctx.currentTime + dur);
  }
  function noise(dur, vol, low) {
    if (!ensure() || muted) return;
    const len = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, len, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = low || 1200;
    const g = ctx.createGain(); g.gain.value = vol || 0.25;
    src.connect(f); f.connect(g); g.connect(master); src.start();
  }
  // Simple bass + hat loop, one note per step; called from the game loop with dt.
  const BASS = [55, 0, 55, 65.4, 55, 0, 82.4, 73.4, 55, 0, 55, 65.4, 98, 82.4, 73.4, 65.4];
  return {
    stationName() { return STATIONS[station]; },
    nextStation() { station = (station + 1) % STATIONS.length; },
    unlock() { ensure(); if (ctx && ctx.state === 'suspended') ctx.resume(); },
    toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : 0.35; return muted; },
    get muted() { return muted; },
    shot() { noise(0.14, 0.4, 2500); tone(180, 0.1, 'square', 0.15, 60); },
    punch() { noise(0.08, 0.3, 900); },
    pickup() { tone(660, 0.12, 'sine', 0.2); setTimeout(() => tone(990, 0.18, 'sine', 0.2), 90); },
    crash() { noise(0.25, 0.35, 700); },
    siren(dt, on) { if (!ensure() || muted) return; /* siren is two alternating tones via tone() bursts */ },
    sirenBurst(t) { if (!muted) tone(t % 1 < 0.5 ? 750 : 950, 0.18, 'sine', 0.05); },
    mission() { [523, 659, 784].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'triangle', 0.22), i * 120)); },
    fail() { tone(220, 0.4, 'sawtooth', 0.18, 110); },
    update(dt, speed01, driving, wanted) {
      if (!ctx || muted) return;
      if (engineGain) engineGain.gain.value = driving ? 0.03 + speed01 * 0.05 : 0;
      if (engineOsc) engineOsc.frequency.value = 50 + speed01 * 90;
      musicTimer += dt;
      if (musicTimer > 0.22) { musicTimer = 0; const n = BASS[musicStep % BASS.length]; musicStep++; if (n) tone(n, 0.2, 'triangle', 0.07); if (musicStep % 2 === 0) noise(0.03, 0.03, 6000); }
    },
  };
}
