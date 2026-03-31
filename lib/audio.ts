
const audioCtx = typeof window !== 'undefined' ? new (window.AudioContext || (window as any).webkitAudioContext)() : null;

export const resumeAudio = () => {
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

export const playBeep = (frequency = 440, duration = 0.1, volume = 0.1) => {
  if (!audioCtx) return;
  resumeAudio();
  const oscillator = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  oscillator.connect(gainNode);
  gainNode.connect(audioCtx.destination);

  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(frequency, audioCtx.currentTime);
  gainNode.gain.setValueAtTime(volume, audioCtx.currentTime);
  gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);

  oscillator.start();
  oscillator.stop(audioCtx.currentTime + duration);
};

export const playSuccessBeep = () => {
  playBeep(880, 0.1, 0.1);
};

export const playCheckinBeep = () => {
  playBeep(660, 0.1, 0.1);
  setTimeout(() => playBeep(880, 0.1, 0.1), 100);
};

export const playErrorBeep = () => {
  playBeep(220, 0.3, 0.1);
};
