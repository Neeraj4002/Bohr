/**
 * Notification Service
 * Handles desktop notifications and sound effects
 */

// Sound files - these would be in /public/sounds/
const SOUNDS = {
  timerComplete: '/sounds/timer-complete.mp3',
  breakStart: '/sounds/break-start.mp3',
  tick: '/sounds/tick.mp3',
  achievement: '/sounds/achievement.mp3',
} as const;

type SoundType = keyof typeof SOUNDS;

// Audio cache to prevent loading same sound multiple times
const audioCache: Map<string, HTMLAudioElement> = new Map();

/**
 * Check and request notification permission
 */
export async function ensureNotificationPermission(): Promise<boolean> {
  try {
    // Use web Notification API
    if ('Notification' in window) {
      if (Notification.permission === 'granted') return true;
      if (Notification.permission !== 'denied') {
        const result = await Notification.requestPermission();
        return result === 'granted';
      }
    }
    
    return false;
  } catch (error) {
    console.warn('Notifications not available:', error);
    return false;
  }
}

/**
 * Send a desktop notification
 */
export async function notify(title: string, body?: string): Promise<void> {
  try {
    // Use web Notification API
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification(title, { body, icon: '/favicon.ico' });
    }
  } catch (error) {
    console.warn('Failed to send notification:', error);
  }
}

/**
 * Play a sound effect
 */
export async function playSound(type: SoundType, volume: number = 0.5): Promise<void> {
  try {
    const soundPath = SOUNDS[type];
    
    let audio = audioCache.get(soundPath);
    if (!audio) {
      audio = new Audio(soundPath);
      audioCache.set(soundPath, audio);
    }
    
    audio.volume = Math.max(0, Math.min(1, volume));
    audio.currentTime = 0;
    
    await audio.play();
  } catch (error) {
    console.warn('Failed to play sound:', error);
  }
}

/**
 * Preload sounds for faster playback
 */
export function preloadSounds(): void {
  Object.values(SOUNDS).forEach((path) => {
    if (!audioCache.has(path)) {
      const audio = new Audio();
      audio.preload = 'auto';
      audio.src = path;
      audioCache.set(path, audio);
    }
  });
}

/**
 * Timer-specific notifications
 */
export const timerNotifications = {
  async sessionComplete(skillName?: string): Promise<void> {
    await notify(
      '🎯 Focus Session Complete!',
      skillName 
        ? `Great work on ${skillName}! Time for a break.`
        : 'Great work! Time for a break.'
    );
    await playSound('timerComplete');
  },

  async breakComplete(): Promise<void> {
    await notify(
      '☕ Break Over!',
      'Ready to get back to work?'
    );
    await playSound('breakStart');
  },

  async achievementUnlocked(name: string, description: string): Promise<void> {
    await notify(
      `🏆 Achievement Unlocked: ${name}!`,
      description
    );
    await playSound('achievement');
  },

  async streakReminder(streak: number): Promise<void> {
    await notify(
      `🔥 Keep Your Streak Alive!`,
      `You're on a ${streak} day streak. Don't forget to practice today!`
    );
  },
};

export default {
  ensureNotificationPermission,
  notify,
  playSound,
  preloadSounds,
  timerNotifications,
};
