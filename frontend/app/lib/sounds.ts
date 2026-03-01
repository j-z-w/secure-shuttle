export const SOUNDS = {
  button: "/sounds/sound-button.wav",
  changeWindow: "/sounds/sound-changeWindow.wav",
  typing: "/sounds/sound-typing.wav",
} as const;

const preloaded = new Map<string, HTMLAudioElement>();

function getPreloaded(src: string): HTMLAudioElement {
  let el = preloaded.get(src);
  if (!el) {
    el = new Audio(src);
    el.preload = "auto";
    el.load();
    preloaded.set(src, el);
  }
  return el;
}

export function playSound(src: string, volume = 0.35) {
  try {
    const clone = getPreloaded(src).cloneNode(true) as HTMLAudioElement;
    clone.volume = volume;
    clone.play().catch(() => {
      /* ignore autoplay restrictions */
    });
  } catch {
    /* SSR safety */
  }
}
