import Phaser from 'phaser';

export class AudioManager {
  constructor(scene) {
    this.scene = scene;
    this.sounds = {};
    this.music = {};
    this.masterVolume = 1;
    this.sfxVolume = 0.8;
    this.musicVolume = 0.5;
    this.isMuted = false;
  }

  preload() {
    // Load sound effects
    const sfxList = [
      'card_deal',
      'card_play',
      'tick',
      'timer_expire',
      'correct',
      'wrong',
      'gun_click',
      'gun_fire',
      'heartbeat',
      'victory',
      'countdown',
    ];

    // Load music tracks
    const musicList = [
      'menu_bgm',
      'lobby_bgm',
      'game_bgm',
      'trigger_bgm',
    ];

    // For now, we'll create placeholder sounds
    // In production, replace with actual audio files
    console.log('AudioManager: Preloading sounds...');
  }

  init() {
    // Create sound objects (placeholders)
    this.sounds = {
      card_deal: this.createPlaceholderSound('card_deal'),
      card_play: this.createPlaceholderSound('card_play'),
      tick: this.createPlaceholderSound('tick'),
      timer_expire: this.createPlaceholderSound('timer_expire'),
      correct: this.createPlaceholderSound('correct'),
      wrong: this.createPlaceholderSound('wrong'),
      gun_click: this.createPlaceholderSound('gun_click'),
      gun_fire: this.createPlaceholderSound('gun_fire'),
      heartbeat: this.createPlaceholderSound('heartbeat'),
      victory: this.createPlaceholderSound('victory'),
      countdown: this.createPlaceholderSound('countdown'),
    };

    this.music = {
      menu_bgm: this.createPlaceholderMusic('menu_bgm'),
      lobby_bgm: this.createPlaceholderMusic('lobby_bgm'),
      game_bgm: this.createPlaceholderMusic('game_bgm'),
      trigger_bgm: this.createPlaceholderMusic('trigger_bgm'),
    };
  }

  createPlaceholderSound(name) {
    // Placeholder - in production, load actual audio files
    return {
      name,
      play: (config = {}) => {
        console.log(`Playing sound: ${name}`, config);
      },
      stop: () => {},
      setVolume: (vol) => {},
    };
  }

  createPlaceholderMusic(name) {
    // Placeholder - in production, load actual audio files
    return {
      name,
      isPlaying: false,
      play: (config = {}) => {
        console.log(`Playing music: ${name}`, config);
        this.isPlaying = true;
      },
      stop: () => {
        this.isPlaying = false;
      },
      setVolume: (vol) => {},
      setLoop: (loop) => {},
    };
  }

  playSound(name, config = {}) {
    if (this.isMuted) return;

    const sound = this.sounds[name];
    if (sound) {
      sound.play({
        volume: this.sfxVolume * this.masterVolume,
        ...config,
      });
    }
  }

  playMusic(name, config = {}) {
    if (this.isMuted) return;

    // Stop current music
    this.stopMusic();

    const music = this.music[name];
    if (music) {
      music.play({
        volume: this.musicVolume * this.masterVolume,
        loop: true,
        ...config,
      });
    }
  }

  stopMusic() {
    Object.values(this.music).forEach(music => {
      if (music.isPlaying) {
        music.stop();
      }
    });
  }

  setMasterVolume(volume) {
    this.masterVolume = Phaser.Math.Clamp(volume, 0, 1);
  }

  setSfxVolume(volume) {
    this.sfxVolume = Phaser.Math.Clamp(volume, 0, 1);
  }

  setMusicVolume(volume) {
    this.musicVolume = Phaser.Math.Clamp(volume, 0, 1);
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopMusic();
    }
    return this.isMuted;
  }

  // Convenience methods for common sounds
  playCardDeal() {
    this.playSound('card_deal');
  }

  playCardPlay() {
    this.playSound('card_play');
  }

  playTick() {
    this.playSound('tick');
  }

  playTimerExpire() {
    this.playSound('timer_expire');
  }

  playCorrect() {
    this.playSound('correct');
  }

  playWrong() {
    this.playSound('wrong');
  }

  playGunClick() {
    this.playSound('gun_click');
  }

  playGunFire() {
    this.playSound('gun_fire');
  }

  playHeartbeat() {
    this.playSound('heartbeat');
  }

  playVictory() {
    this.playSound('victory');
  }

  playCountdown() {
    this.playSound('countdown');
  }
}
