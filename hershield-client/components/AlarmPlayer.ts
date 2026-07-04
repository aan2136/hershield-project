// components/AlarmPlayer.ts

class AlarmPlayer {
  private static instance: AlarmPlayer;
  private audio: HTMLAudioElement | null = null;
  private isPlaying = false;
  private volume = 1.0;
  private pendingPlay: Promise<void> | null = null;

  private constructor() {}

  public static getInstance(): AlarmPlayer {
    if (!AlarmPlayer.instance) {
      AlarmPlayer.instance = new AlarmPlayer();
    }
    return AlarmPlayer.instance;
  }

  private ensureAudio(): HTMLAudioElement | null {
    if (typeof window === 'undefined') return null;

    if (!this.audio) {
      const audio = new Audio('/alarm.mp3');
      audio.loop = true;
      audio.volume = this.volume;
      audio.preload = 'auto';
      this.audio = audio;
    }

    return this.audio;
  }

  public play(): void {
    const audio = this.ensureAudio();
    if (!audio) return;

    audio.loop = true;
    audio.volume = this.volume;

    if (this.isPlaying && !audio.paused) return;

    try {
      audio.currentTime = audio.currentTime || 0;
    } catch {
      // Some browsers throw if currentTime is set before metadata loads; ignore.
    }

    this.pendingPlay = audio
      .play()
      .then(() => {
        this.isPlaying = true;
      })
      .catch((error: unknown) => {
        this.isPlaying = false;
        // Autoplay was blocked (e.g. no prior user gesture). Retry on next
        // user interaction instead of throwing, so callers don't crash.
        console.warn('AlarmPlayer: playback blocked by browser', error);

        if (typeof window !== 'undefined') {
          const retry = () => {
            this.play();
            window.removeEventListener('click', retry);
            window.removeEventListener('touchstart', retry);
            window.removeEventListener('keydown', retry);
          };
          window.addEventListener('click', retry, { once: true });
          window.addEventListener('touchstart', retry, { once: true });
          window.addEventListener('keydown', retry, { once: true });
        }
      });
  }

  public stop(): void {
    if (!this.audio) {
      this.isPlaying = false;
      return;
    }

    try {
      this.audio.pause();
      this.audio.currentTime = 0;
    } catch {
      // Ignore errors from browsers that disallow resetting currentTime.
    }

    this.isPlaying = false;
  }

  public setVolume(level: number): void {
    const clamped = Math.min(1, Math.max(0, level));
    this.volume = clamped;

    if (this.audio) {
      this.audio.volume = clamped;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export default AlarmPlayer;