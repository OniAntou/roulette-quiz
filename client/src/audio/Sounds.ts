let audioCtx: AudioContext | null = null;
let gunFireBuffer: AudioBuffer | null = null;
let gunClickBuffer: AudioBuffer | null = null;
let cardPlayBuffer: AudioBuffer | null = null;
let emptyGunBuffer: AudioBuffer | null = null;

let bgmOsc: OscillatorNode | null = null;
let bgmGain: GainNode | null = null;
let bgmLfo: OscillatorNode | null = null;
let menuMusicInterval: number | null = null;
let menuNextNoteTime = 0;
let menuCurrentNote = 0;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
    
    // Preload custom gunshot MP3
    fetch('/sounds/gunshot.mp3')
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => audioCtx!.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        gunFireBuffer = audioBuffer;
      })
      .catch(e => console.error("Error loading custom gunshot audio:", e));

    // Preload custom gunclick MP3
    fetch('/sounds/gunclick.mp3')
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => audioCtx!.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        gunClickBuffer = audioBuffer;
      })
      .catch(e => console.error("Error loading custom gunclick audio:", e));

    // Preload custom cardplay MP3
    fetch('/sounds/cardplay.mp3')
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => audioCtx!.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        cardPlayBuffer = audioBuffer;
      })
      .catch(e => console.error("Error loading custom cardplay audio:", e));

    // Preload custom empty gun shot MP3
    fetch('/sounds/emptygun.mp3')
      .then(response => response.arrayBuffer())
      .then(arrayBuffer => audioCtx!.decodeAudioData(arrayBuffer))
      .then(audioBuffer => {
        emptyGunBuffer = audioBuffer;
      })
      .catch(e => console.error("Error loading custom empty gun audio:", e));
  }
  return audioCtx;
}

function playTone(
  type: OscillatorType,
  freqStart: number,
  freqEnd: number,
  duration: number,
  volStart: number,
  volEnd: number = 0.001,
  delayTime: number = 0
) {
  const ctx = getCtx();
  const t = ctx.currentTime + delayTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, t);
  if (freqEnd !== freqStart) {
    osc.frequency.exponentialRampToValueAtTime(Math.max(freqEnd, 1), t + duration);
  }

  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volStart, t + Math.min(0.01, duration * 0.1));
  gain.gain.exponentialRampToValueAtTime(Math.max(volEnd, 0.0001), t + duration);

  osc.connect(gain);
  gain.connect(ctx.destination);
  
  osc.start(t);
  osc.stop(t + duration);
}

function playFilteredNoise(
  duration: number,
  volStart: number,
  filterFreqStart: number,
  filterFreqEnd: number,
  delayTime: number = 0
) {
  const ctx = getCtx();
  const t = ctx.currentTime + delayTime;
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const source = ctx.createBufferSource();
  source.buffer = buffer;

  const filter = ctx.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.setValueAtTime(filterFreqStart, t);
  filter.frequency.exponentialRampToValueAtTime(Math.max(filterFreqEnd, 1), t + duration);

  const gain = ctx.createGain();
  gain.gain.setValueAtTime(0, t);
  gain.gain.linearRampToValueAtTime(volStart, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

  source.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  source.start(t);
}

export const Sounds = {
  startMenuBGM() {
    try {
      const ctx = getCtx();
      if (ctx.state === 'suspended') {
        ctx.resume();
      }
      if (menuMusicInterval) return;

      menuNextNoteTime = ctx.currentTime + 0.1;
      menuCurrentNote = 0;

      const tempo = 160; // Metal tempo
      const secondsPerBeat = 60.0 / tempo;
      const lookahead = 25.0; // ms
      const scheduleAheadTime = 0.1; // s

      // Create Distortion Curve for the Guitar
      let distCurve = new Float32Array(44100);
      for (let i = 0; i < 44100; ++i) {
        const x = (i * 2) / 44100 - 1;
        distCurve[i] = ((3 + 400) * x * 20 * (Math.PI / 180)) / (Math.PI + 400 * Math.abs(x));
      }
      
      const distNode = ctx.createWaveShaper();
      distNode.curve = distCurve;
      distNode.oversample = '4x';
      
      const compNode = ctx.createDynamicsCompressor();
      compNode.threshold.value = -10;
      compNode.knee.value = 10;
      compNode.ratio.value = 12;
      compNode.attack.value = 0.003;
      compNode.release.value = 0.1;

      // Master volume for menu
      const masterGain = ctx.createGain();
      masterGain.gain.value = 0.3; // keep it a bit lower to not blast ears completely
      
      distNode.connect(compNode);
      compNode.connect(masterGain);
      masterGain.connect(ctx.destination);

      function nextNote() {
        const secondsPerStep = secondsPerBeat / 4; // 16th notes
        menuNextNoteTime += secondsPerStep;
        menuCurrentNote++;
        if (menuCurrentNote === 16) menuCurrentNote = 0;
      }

      function scheduleNote(stepNumber: number, time: number) {
        // Heavy Metal Guitar Riff (E Minor)
        // E2, G2, A2, Bb2, B2
        const riffFreq = [
          82.41, 82.41, 82.41, 82.41,  // chug
          98.00, 98.00, 110.00, 116.54, // walk up
          82.41, 82.41, 82.41, 82.41,  // chug
          123.47, 116.54, 110.00, 98.00 // walk down
        ];
        
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        
        osc1.type = 'sawtooth';
        osc1.frequency.value = riffFreq[stepNumber];
        
        osc2.type = 'square';
        osc2.frequency.value = riffFreq[stepNumber] * 1.01; // slightly detuned for thickness

        const filter = ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(3000, time);
        filter.frequency.exponentialRampToValueAtTime(800, time + 0.1);

        gain1.gain.setValueAtTime(0, time);
        // Palm mute effect: faster decay on E2 (82.41)
        let decayTime = riffFreq[stepNumber] === 82.41 ? 0.08 : 0.15;
        gain1.gain.linearRampToValueAtTime(0.4, time + 0.01);
        gain1.gain.exponentialRampToValueAtTime(0.001, time + decayTime);

        osc1.connect(filter);
        osc2.connect(filter);
        filter.connect(gain1);
        gain1.connect(distNode);
        
        osc1.start(time);
        osc1.stop(time + decayTime);
        osc2.start(time);
        osc2.stop(time + decayTime);

        // Double Kick Drum (8th notes)
        if (stepNumber % 2 === 0) {
          const kick = ctx.createOscillator();
          const kickGain = ctx.createGain();
          kick.type = 'sine';
          kick.frequency.setValueAtTime(100, time);
          kick.frequency.exponentialRampToValueAtTime(0.01, time + 0.15);
          
          kickGain.gain.setValueAtTime(0, time);
          kickGain.gain.linearRampToValueAtTime(0.9, time + 0.005);
          kickGain.gain.exponentialRampToValueAtTime(0.001, time + 0.15);
          
          kick.connect(kickGain);
          kickGain.connect(compNode);
          kick.start(time);
          kick.stop(time + 0.15);
        }

        // Heavy Snare on beat 2 and 4 (steps 4 and 12)
        if (stepNumber === 4 || stepNumber === 12) {
          const snareDuration = 0.2;
          const snareBuffer = ctx.createBuffer(1, ctx.sampleRate * snareDuration, ctx.sampleRate);
          const data = snareBuffer.getChannelData(0);
          for (let i = 0; i < snareBuffer.length; i++) data[i] = Math.random() * 2 - 1;
          
          const snareNoise = ctx.createBufferSource();
          snareNoise.buffer = snareBuffer;
          
          const snareFilter = ctx.createBiquadFilter();
          snareFilter.type = 'bandpass';
          snareFilter.frequency.value = 2500;
          
          const snareGain = ctx.createGain();
          snareGain.gain.setValueAtTime(0, time);
          snareGain.gain.linearRampToValueAtTime(0.8, time + 0.01);
          snareGain.gain.exponentialRampToValueAtTime(0.001, time + snareDuration);
          
          snareNoise.connect(snareFilter);
          snareFilter.connect(snareGain);
          snareGain.connect(compNode);
          snareNoise.start(time);
          
          // Snare body/pop
          const pop = ctx.createOscillator();
          const popGain = ctx.createGain();
          pop.type = 'triangle';
          pop.frequency.setValueAtTime(250, time);
          pop.frequency.exponentialRampToValueAtTime(100, time + 0.1);
          popGain.gain.setValueAtTime(0, time);
          popGain.gain.linearRampToValueAtTime(0.7, time + 0.01);
          popGain.gain.exponentialRampToValueAtTime(0.001, time + 0.1);
          pop.connect(popGain);
          popGain.connect(compNode);
          pop.start(time);
          pop.stop(time + 0.1);
        }
        
        // Ride Cymbal/Hi-hat off-beats
        if (stepNumber % 4 !== 0) {
          const hhDuration = 0.05;
          const hhBuffer = ctx.createBuffer(1, ctx.sampleRate * hhDuration, ctx.sampleRate);
          const data = hhBuffer.getChannelData(0);
          for (let i = 0; i < hhBuffer.length; i++) data[i] = Math.random() * 2 - 1;
          
          const hhSource = ctx.createBufferSource();
          hhSource.buffer = hhBuffer;
          
          const hhFilter = ctx.createBiquadFilter();
          hhFilter.type = 'highpass';
          hhFilter.frequency.value = 8000;
          
          const hhGain = ctx.createGain();
          hhGain.gain.setValueAtTime(0, time);
          hhGain.gain.linearRampToValueAtTime(0.1, time + 0.005);
          hhGain.gain.exponentialRampToValueAtTime(0.001, time + hhDuration);
          
          hhSource.connect(hhFilter);
          hhFilter.connect(hhGain);
          hhGain.connect(compNode);
          
          hhSource.start(time);
        }
      }

      function scheduler() {
        while (menuNextNoteTime < ctx.currentTime + scheduleAheadTime) {
          scheduleNote(menuCurrentNote, menuNextNoteTime);
          nextNote();
        }
      }

      menuMusicInterval = window.setInterval(scheduler, lookahead);
    } catch (e) {}
  },

  stopMenuBGM() {
    try {
      if (menuMusicInterval) {
        window.clearInterval(menuMusicInterval);
        menuMusicInterval = null;
      }
    } catch (e) {}
  },
  startBGM() {
    try {
      const ctx = getCtx();
      if (bgmOsc) return;
      
      bgmOsc = ctx.createOscillator();
      bgmOsc.type = 'sawtooth';
      bgmOsc.frequency.value = 45; 
      
      bgmLfo = ctx.createOscillator();
      bgmLfo.type = 'sine';
      bgmLfo.frequency.value = 1.2; 

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 200; 

      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 100; 

      bgmLfo.connect(lfoGain);
      lfoGain.connect(filter.frequency);

      bgmGain = ctx.createGain();
      bgmGain.gain.value = 0.12; 
      
      bgmOsc.connect(filter);
      filter.connect(bgmGain);
      bgmGain.connect(ctx.destination);
      
      bgmOsc.start();
      bgmLfo.start();
    } catch (e) {}
  },

  stopBGM() {
    try {
      if (bgmOsc) { bgmOsc.stop(); bgmOsc.disconnect(); bgmOsc = null; }
      if (bgmLfo) { bgmLfo.stop(); bgmLfo.disconnect(); bgmLfo = null; }
      if (bgmGain) { bgmGain.disconnect(); bgmGain = null; }
    } catch (e) {}
  },

  cardDeal() {
    playFilteredNoise(0.12, 0.3, 4000, 200);
    playTone('triangle', 800, 200, 0.05, 0.1);
  },

  cardFlip() {
    playTone('square', 1400, 1400, 0.04, 0.08);
    playTone('square', 2000, 2400, 0.06, 0.08, 0.001, 0.05);
  },

  cardPlay() {
    const ctx = getCtx();
    if (cardPlayBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = cardPlayBuffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = 1.0;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start();
      return;
    }

    playTone('sine', 400, 40, 0.15, 0.3);
    playFilteredNoise(0.1, 0.15, 2000, 100);
    playTone('triangle', 800, 800, 0.05, 0.05);
  },

  correct() {
    playTone('sine', 523.25, 523.25, 0.2, 0.15); 
    playTone('triangle', 659.25, 659.25, 0.2, 0.1, 0.001, 0.08);
    playTone('sine', 783.99, 783.99, 0.3, 0.15, 0.001, 0.16);
    playTone('triangle', 987.77, 987.77, 0.5, 0.2, 0.001, 0.24);
  },

  wrong() {
    playTone('sawtooth', 150, 80, 0.4, 0.3);
    playTone('square', 154, 82, 0.4, 0.2);
    playFilteredNoise(0.3, 0.2, 3000, 500);
  },

  tick() {
    playTone('square', 800, 200, 0.03, 0.1);
    playFilteredNoise(0.02, 0.1, 5000, 5000);
  },

  timerWarning() {
    playTone('square', 1000, 1000, 0.1, 0.15);
    playTone('sawtooth', 1050, 1050, 0.1, 0.1);
  },

  heartbeat(volume: number = 1.0) {
    const ctx = getCtx();
    const t = ctx.currentTime;
    
    // First thump (lub)
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(60, t);
    osc1.frequency.exponentialRampToValueAtTime(30, t + 0.1);
    
    gain1.gain.setValueAtTime(0, t);
    gain1.gain.linearRampToValueAtTime(volume, t + 0.05);
    gain1.gain.exponentialRampToValueAtTime(0.01, t + 0.3);
    
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    
    osc1.start(t);
    osc1.stop(t + 0.3);
    
    // Second thump (dub)
    const t2 = t + 0.3; // delayed by 300ms
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(65, t2);
    osc2.frequency.exponentialRampToValueAtTime(35, t2 + 0.1);
    
    gain2.gain.setValueAtTime(0, t2);
    gain2.gain.linearRampToValueAtTime(volume * 0.8, t2 + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.01, t2 + 0.4);
    
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    
    osc2.start(t2);
    osc2.stop(t2 + 0.4);
  },

  gunClick() {
    const ctx = getCtx();
    
    if (gunClickBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = gunClickBuffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = 1.0;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start();
      return;
    }

    playFilteredNoise(0.04, 0.3, 8000, 1000);
    playTone('square', 200, 200, 0.05, 0.2);
  },

  gunFire() {
    const ctx = getCtx();
    const t = ctx.currentTime;
    
    // Play the custom MP3 if it has successfully loaded
    if (gunFireBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = gunFireBuffer;
      
      const gainNode = ctx.createGain();
      gainNode.gain.value = 1.0; // Full volume
      
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start();
      return;
    }

    // 1. Distortion Curve for MASSIVE clipping (Fallback Synth)
    const makeDistortionCurve = (amount = 100) => {
      const n_samples = 44100;
      const curve = new Float32Array(n_samples);
      const deg = Math.PI / 180;
      for (let i = 0; i < n_samples; ++i) {
        const x = (i * 2) / n_samples - 1;
        curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
      }
      return curve;
    };

    const distortion = ctx.createWaveShaper();
    distortion.curve = makeDistortionCurve(150); // Heavy overdrive
    distortion.oversample = '4x';

    // 2. Master Compressor to prevent blowing out speakers
    const compressor = ctx.createDynamicsCompressor();
    compressor.threshold.setValueAtTime(-10, t);
    compressor.knee.setValueAtTime(5, t);
    compressor.ratio.setValueAtTime(15, t);
    compressor.attack.setValueAtTime(0.001, t);
    compressor.release.setValueAtTime(0.2, t);

    distortion.connect(compressor);
    compressor.connect(ctx.destination);

    // 3. SUB-BASS KICK (The physical punch)
    const subOsc = ctx.createOscillator();
    const subGain = ctx.createGain();
    subOsc.type = 'sine'; // Sine works best with heavy distortion
    subOsc.frequency.setValueAtTime(300, t); // Starts high
    subOsc.frequency.exponentialRampToValueAtTime(20, t + 0.3); // Dives deep
    
    subGain.gain.setValueAtTime(6, t); // Insanely overdriven gain
    subGain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
    
    subOsc.connect(subGain);
    subGain.connect(distortion);
    subOsc.start(t);
    subOsc.stop(t + 0.4);

    // 4. THE EXPLOSION (Noise burst)
    const bufferSize = ctx.sampleRate * 0.8; 
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1); 
    }
    const noiseSource = ctx.createBufferSource();
    noiseSource.buffer = buffer;
    
    // Filter to make it sound like a heavy boom
    const noiseFilter = ctx.createBiquadFilter();
    noiseFilter.type = 'lowpass';
    noiseFilter.frequency.setValueAtTime(8000, t); // Start crisp
    noiseFilter.frequency.exponentialRampToValueAtTime(150, t + 0.6); // Sweep down
    
    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(5, t); // Very loud noise
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 0.8);
    
    noiseSource.connect(noiseFilter);
    noiseFilter.connect(noiseGain);
    noiseGain.connect(distortion);
    noiseSource.start(t);

    // 5. THE CRACK (High freq mechanical snap)
    const crackOsc = ctx.createOscillator();
    const crackGain = ctx.createGain();
    crackOsc.type = 'square';
    crackOsc.frequency.setValueAtTime(2000, t);
    crackOsc.frequency.exponentialRampToValueAtTime(50, t + 0.1);
    crackGain.gain.setValueAtTime(2, t);
    crackGain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    
    crackOsc.connect(crackGain);
    crackGain.connect(distortion);
    crackOsc.start(t);
    crackOsc.stop(t + 0.1);
  },

  gunSurvive() {
    const ctx = getCtx();
    
    if (emptyGunBuffer) {
      const source = ctx.createBufferSource();
      source.buffer = emptyGunBuffer;
      const gainNode = ctx.createGain();
      gainNode.gain.value = 1.0;
      source.connect(gainNode);
      gainNode.connect(ctx.destination);
      source.start();
      return;
    }

    const t = ctx.currentTime;
    // High-pitched metallic "Click" ping
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.setValueAtTime(1200, t);
    osc.frequency.exponentialRampToValueAtTime(200, t + 0.1);
    
    gain.gain.setValueAtTime(0.4, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.1);
    
    // Tiny sharp noise for the mechanical snap
    playFilteredNoise(0.03, 0.5, 8000, 1000);
    
    osc.connect(gain);
    gain.connect(ctx.destination);
    
    osc.start(t);
    osc.stop(t + 0.1);
  },

  victory() {
    const notes = [523, 659, 784, 1047];
    notes.forEach((freq, i) => {
      playTone('sine', freq, freq, 0.2, 0.25, 0.001, i * 0.12);
    });
  },

  newRound() {
    playTone('sine', 440, 440, 0.1, 0.15, 0.001, 0);
    playTone('sine', 550, 550, 0.1, 0.15, 0.001, 0.08);
    playTone('sine', 660, 660, 0.15, 0.2, 0.001, 0.16);
  },

  buttonClick() {
    playTone('sine', 700, 700, 0.04, 0.1);
  },

  buttonHover() {
    try {
      playTone('sine', 1100, 1100, 0.015, 0.04);
    } catch (e) {
      // Ignored if audio context is not allowed to start yet
    }
  },

  cardSelect() {
    playTone('triangle', 700, 600, 0.08, 0.08);
  },



  countdown(isUrgent: boolean) {
    if (isUrgent) {
      playTone('square', 1200, 1200, 0.06, 0.12);
    } else {
      playTone('sine', 600, 600, 0.06, 0.12);
    }
  },
};
