import { create } from 'zustand';

interface CelebrationState {
  showConfetti: boolean;
  triggerConfetti: () => void;
}

export const useCelebrationStore = create<CelebrationState>((set) => ({
  showConfetti: false,
  triggerConfetti: () => {
    set({ showConfetti: true });
    // Auto-reset after animation
    setTimeout(() => {
      set({ showConfetti: false });
    }, 3000);
  },
}));
