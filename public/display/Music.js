'use strict';

class Music {
  constructor() {
    this.ctx = null;
    this.playing = false;
    this.bpm = 150;
    this.scheduledSources = [];
    this.nextMelodyTime = 0;
    this.nextBassTime = 0;
    this.nextDrumTime = 0;
    this.melodyIndex = 0;
    this.bassIndex = 0;
    this.drumIndex = 0;
    this.scheduleTimer = null;
    this.melodyGain = null;
    this.bassGain = null;
    this.drumGain = null;
    this.masterGain = null;
    this.generation = 0;
    this.passCount = 0;
    this.noiseBuffer = null;

    // Note frequencies (Hz). Sharps use 's' suffix (e.g. Gs2 = G#2)
    const E2 = 82.41, Gs2 = 103.83, A2 = 110.00, B2 = 123.47;
    const C3 = 130.81, D3 = 146.83, E3 = 164.81, F3 = 174.61, Gs3 = 207.65, A3 = 220.00, B3 = 246.94;
    const Gs4 = 415.30, A4 = 440.00, B4 = 493.88, C5 = 523.25, D5 = 587.33, E5 = 659.25, F5 = 698.46, G5 = 783.99, A5 = 880.00;
    const R = 0; // rest

    // Theme A — Korobeiniki main theme (8 measures)
    this.melodyA = [
      // Phrase 1
      [E5, 2], [B4, 1], [C5, 1], [D5, 2], [C5, 1], [B4, 1],
      [A4, 2], [A4, 1], [C5, 1], [E5, 2], [D5, 1], [C5, 1],
      [B4, 3], [C5, 1], [D5, 2], [E5, 2],
      [C5, 2], [A4, 2], [A4, 2], [R, 2],
      // Phrase 2
      [R, 1], [D5, 2], [F5, 1], [A5, 2], [G5, 1], [F5, 1],
      [E5, 3], [C5, 1], [E5, 2], [D5, 1], [C5, 1],
      [B4, 3], [C5, 1], [D5, 2], [E5, 2],
      [C5, 2], [A4, 2], [A4, 2], [R, 2],
    ];

    this.bassA = [
      [E2, 2], [E3, 2], [E2, 2], [E3, 2],
      [A2, 2], [A3, 2], [A2, 2], [A3, 2],
      [Gs2, 2], [Gs3, 2], [E2, 2], [E3, 2],
      [A2, 2], [A3, 2], [A2, 2], [R, 2],
      [D3, 2], [D3, 2], [F3, 2], [F3, 2],
      [C3, 2], [C3, 2], [E3, 2], [E3, 2],
      [Gs2, 2], [Gs3, 2], [E2, 2], [E3, 2],
      [A2, 2], [A3, 2], [A2, 2], [R, 2],
    ];

    // Theme B — Contrasting lyrical section (8 measures)
    // Longer note values, stepwise motion, more lyrical feel
    this.melodyB = [
      // m1: E5 half, C5 half
      [E5, 4], [C5, 4],
      // m2: D5 half, B4 half
      [D5, 4], [B4, 4],
      // m3: C5 half, A4 half
      [C5, 4], [A4, 4],
      // m4: Gs4 half, B4 half
      [Gs4, 4], [B4, 4],
      // m5: A4 half, C5 half (ascending resolution)
      [A4, 4], [C5, 4],
      // m6: B4 half, D5 half
      [B4, 4], [D5, 4],
      // m7: C5 half, E5 half
      [C5, 4], [E5, 4],
      // m8: D5 dotted-half, rest quarter
      [D5, 6], [R, 2],
    ];

    this.bassB = [
      // m1: Am
      [A2, 2], [A3, 2], [A2, 2], [A3, 2],
      // m2: Em
      [E2, 2], [E3, 2], [E2, 2], [E3, 2],
      // m3: Am
      [A2, 2], [A3, 2], [A2, 2], [A3, 2],
      // m4: E (major feel with G#)
      [E2, 2], [Gs3, 2], [E2, 2], [Gs3, 2],
      // m5: Am
      [A2, 2], [A3, 2], [A2, 2], [A3, 2],
      // m6: Em -> B
      [E2, 2], [E3, 2], [B2, 2], [B3, 2],
      // m7: C -> E
      [C3, 2], [C3, 2], [E3, 2], [E3, 2],
      // m8: Am
      [A2, 2], [A3, 2], [A2, 2], [R, 2],
    ];

    // Full sequence: A-B-A-B
    this.fullMelody = [...this.melodyA, ...this.melodyB, ...this.melodyA, ...this.melodyB];
    this.fullBass = [...this.bassA, ...this.bassB, ...this.bassA, ...this.bassB];

    // Drum pattern: one measure of 4/4
    // Each entry: [type, eighth-note position within measure]
    // K=kick, S=snare, H=hi-hat
    // Kick on 1, 3; Snare on 2, 4; Hi-hats on all eighths
    this.drumPattern = [
      ['K', 0], ['H', 0],
      ['H', 1],
      ['S', 2], ['H', 2],
      ['H', 3],
      ['K', 4], ['H', 4],
      ['H', 5],
      ['S', 6], ['H', 6],
      ['H', 7],
    ];
  }

  init() {
    if (this.ctx) return;
    this.ctx = new AudioContext();

    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 0.3;
    this.masterGain.connect(this.ctx.destination);

    this.melodyGain = this.ctx.createGain();
    this.melodyGain.gain.value = 0.45;
    this.melodyGain.connect(this.masterGain);

    this.bassGain = this.ctx.createGain();
    this.bassGain.gain.value = 0.35;
    this.bassGain.connect(this.masterGain);

    this.drumGain = this.ctx.createGain();
    this.drumGain.gain.value = 0.5;
    this.drumGain.connect(this.masterGain);

    // Pre-generate 1s of white noise for snare/hi-hat
    const sampleRate = this.ctx.sampleRate;
    this.noiseBuffer = this.ctx.createBuffer(1, sampleRate, sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    for (let i = 0; i < sampleRate; i++) {
      data[i] = Math.random() * 2 - 1;
    }
  }

  start() {
    this.init();
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(e => console.warn('AudioContext resume failed:', e));
    }

    // Cancel any existing scheduler before starting a new one
    if (this.scheduleTimer) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }

    this.generation++;
    this.playing = true;
    this.melodyIndex = 0;
    this.bassIndex = 0;
    this.drumIndex = 0;
    this.passCount = 0;
    this.scheduledSources = [];
    this.masterGain.gain.cancelScheduledValues(this.ctx.currentTime);
    this.masterGain.gain.setValueAtTime(0.3, this.ctx.currentTime);

    // Start bass and drums silent — they fade in on later passes
    this.bassGain.gain.setValueAtTime(0, this.ctx.currentTime);
    this.drumGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.nextMelodyTime = this.ctx.currentTime + 0.1;
    this.nextBassTime = this.ctx.currentTime + 0.1;
    this.nextDrumTime = this.ctx.currentTime + 0.1;
    this.schedule();
  }

  stop() {
    this.playing = false;
    const gen = ++this.generation;

    if (this.scheduleTimer) {
      clearTimeout(this.scheduleTimer);
      this.scheduleTimer = null;
    }

    // Smooth fade-out over 0.4s
    if (this.masterGain && this.ctx) {
      const now = this.ctx.currentTime;
      this.masterGain.gain.cancelScheduledValues(now);
      this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
      this.masterGain.gain.linearRampToValueAtTime(0, now + 0.4);
    }

    // Stop all oscillators after fade completes
    setTimeout(() => {
      if (this.generation !== gen) return;
      for (const src of this.scheduledSources) {
        try { src.stop(); } catch (e) { /* already stopped */ }
      }
      this.scheduledSources = [];
    }, 450);
  }

  schedule() {
    if (!this.playing) return;

    const eighthDuration = 60 / this.bpm / 2;
    const lookahead = 0.2;
    const fullMelodyLen = this.fullMelody.length;
    const fullBassLen = this.fullBass.length;

    // Detect pass transitions based on melody index wrapping
    const prevPass = this.passCount;

    // Schedule melody
    while (this.nextMelodyTime < this.ctx.currentTime + lookahead) {
      // Check for pass boundary
      if (this.melodyIndex > 0 && this.melodyIndex % fullMelodyLen === 0) {
        this.passCount++;
        this.updateArrangement();
      }

      const idx = this.melodyIndex % fullMelodyLen;
      const [freq, eighths] = this.fullMelody[idx];
      const duration = eighths * eighthDuration;

      if (freq > 0) {
        const waveform = this.getMelodyWaveform();
        const detune = this.getDetuneAmount();
        this._playOsc(freq, this.nextMelodyTime, duration * 0.9, this.melodyGain, waveform, detune);
      }

      this.nextMelodyTime += duration;
      this.melodyIndex++;
    }

    // Schedule bass
    while (this.nextBassTime < this.ctx.currentTime + lookahead) {
      const idx = this.bassIndex % fullBassLen;
      const [freq, eighths] = this.fullBass[idx];
      const duration = eighths * eighthDuration;

      if (freq > 0) {
        this._playOsc(freq, this.nextBassTime, duration * 0.85, this.bassGain, 'triangle', 0);
      }

      this.nextBassTime += duration;
      this.bassIndex++;
    }

    // Schedule drums (one measure = 8 eighth notes)
    const measureDuration = 8 * eighthDuration;
    while (this.nextDrumTime < this.ctx.currentTime + lookahead) {
      // Schedule all hits in this measure
      for (const [type, pos] of this.drumPattern) {
        const hitTime = this.nextDrumTime + pos * eighthDuration;
        if (hitTime >= this.ctx.currentTime - 0.01) {
          if (type === 'K') this.playKick(hitTime);
          else if (type === 'S') this.playSnare(hitTime);
          else if (type === 'H') this.playHiHat(hitTime);
        }
      }
      this.nextDrumTime += measureDuration;
      this.drumIndex++;
    }

    this.scheduleTimer = setTimeout(() => this.schedule(), 50);
  }

  _playOsc(freq, time, duration, gainNode, type, detuneCents) {
    const osc = this.ctx.createOscillator();
    const noteGain = this.ctx.createGain();

    osc.type = type;
    osc.frequency.value = freq;

    const release = Math.min(0.02, duration * 0.2);
    noteGain.gain.setValueAtTime(0.001, time);
    noteGain.gain.linearRampToValueAtTime(1, time + 0.01);
    noteGain.gain.setValueAtTime(1, time + duration - release);
    noteGain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(noteGain);
    noteGain.connect(gainNode);

    osc.start(time);
    osc.stop(time + duration + 0.01);

    this.scheduledSources.push(osc);
    osc.onended = () => {
      noteGain.disconnect();
      const idx = this.scheduledSources.indexOf(osc);
      if (idx > -1) this.scheduledSources.splice(idx, 1);
    };

    // Chorus detuning: add a second slightly detuned oscillator
    if (detuneCents > 0) {
      const osc2 = this.ctx.createOscillator();
      const noteGain2 = this.ctx.createGain();

      osc2.type = type;
      osc2.frequency.value = freq;
      osc2.detune.value = detuneCents;

      noteGain2.gain.setValueAtTime(0.001, time);
      noteGain2.gain.linearRampToValueAtTime(0.7, time + 0.01);
      noteGain2.gain.setValueAtTime(0.7, time + duration - release);
      noteGain2.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc2.connect(noteGain2);
      noteGain2.connect(gainNode);

      osc2.start(time);
      osc2.stop(time + duration + 0.01);

      this.scheduledSources.push(osc2);
      osc2.onended = () => {
        noteGain2.disconnect();
        const idx = this.scheduledSources.indexOf(osc2);
        if (idx > -1) this.scheduledSources.splice(idx, 1);
      };
    }
  }

  playNote(freq, time, duration, gainNode, type) {
    this._playOsc(freq, time, duration, gainNode, type, 0);
  }

  playKick(time) {
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(150, time);
    osc.frequency.exponentialRampToValueAtTime(60, time + 0.05);

    oscGain.gain.setValueAtTime(1, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.05);

    osc.connect(oscGain);
    oscGain.connect(this.drumGain);

    osc.start(time);
    osc.stop(time + 0.06);

    this.scheduledSources.push(osc);
    osc.onended = () => {
      oscGain.disconnect();
      const idx = this.scheduledSources.indexOf(osc);
      if (idx > -1) this.scheduledSources.splice(idx, 1);
    };
  }

  playSnare(time) {
    // Noise component (bandpass-filtered)
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const noiseBandpass = this.ctx.createBiquadFilter();
    noiseBandpass.type = 'bandpass';
    noiseBandpass.frequency.value = 3000;
    noiseBandpass.Q.value = 0.7;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.8, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);

    noise.connect(noiseBandpass);
    noiseBandpass.connect(noiseGain);
    noiseGain.connect(this.drumGain);

    noise.start(time);
    noise.stop(time + 0.11);

    this.scheduledSources.push(noise);
    noise.onended = () => {
      noiseGain.disconnect();
      noiseBandpass.disconnect();
      const idx = this.scheduledSources.indexOf(noise);
      if (idx > -1) this.scheduledSources.splice(idx, 1);
    };

    // Body component (triangle oscillator)
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.value = 185;
    oscGain.gain.setValueAtTime(0.5, time);
    oscGain.gain.exponentialRampToValueAtTime(0.001, time + 0.06);

    osc.connect(oscGain);
    oscGain.connect(this.drumGain);

    osc.start(time);
    osc.stop(time + 0.07);

    this.scheduledSources.push(osc);
    osc.onended = () => {
      oscGain.disconnect();
      const idx = this.scheduledSources.indexOf(osc);
      if (idx > -1) this.scheduledSources.splice(idx, 1);
    };
  }

  playHiHat(time) {
    const noise = this.ctx.createBufferSource();
    noise.buffer = this.noiseBuffer;
    const highpass = this.ctx.createBiquadFilter();
    highpass.type = 'highpass';
    highpass.frequency.value = 7000;
    const noiseGain = this.ctx.createGain();
    noiseGain.gain.setValueAtTime(0.3, time);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, time + 0.03);

    noise.connect(highpass);
    highpass.connect(noiseGain);
    noiseGain.connect(this.drumGain);

    noise.start(time);
    noise.stop(time + 0.04);

    this.scheduledSources.push(noise);
    noise.onended = () => {
      noiseGain.disconnect();
      highpass.disconnect();
      const idx = this.scheduledSources.indexOf(noise);
      if (idx > -1) this.scheduledSources.splice(idx, 1);
    };
  }

  updateArrangement() {
    const now = this.ctx.currentTime;
    const fadeTime = 2;

    if (this.passCount === 1) {
      // Pass 1: fade in bass
      this.bassGain.gain.cancelScheduledValues(now);
      this.bassGain.gain.setValueAtTime(this.bassGain.gain.value, now);
      this.bassGain.gain.linearRampToValueAtTime(0.35, now + fadeTime);
    } else if (this.passCount === 2) {
      // Pass 2: fade in drums
      this.drumGain.gain.cancelScheduledValues(now);
      this.drumGain.gain.setValueAtTime(this.drumGain.gain.value, now);
      this.drumGain.gain.linearRampToValueAtTime(0.5, now + fadeTime);
    }
    // Pass 3+: timbre changes handled by getMelodyWaveform/getDetuneAmount
  }

  getMelodyWaveform() {
    // Alternate every 2 passes: square (0-1), sawtooth (2-3), square (4-5), ...
    const cycle = Math.floor(this.passCount / 2) % 2;
    return cycle === 0 ? 'square' : 'sawtooth';
  }

  getDetuneAmount() {
    // Chorus detuning activates at pass 3+
    return this.passCount >= 3 ? 3 : 0;
  }

  setSpeed(level) {
    this.bpm = Math.min(240, 150 + (level - 1) * 3);
  }
}

window.Music = Music;
