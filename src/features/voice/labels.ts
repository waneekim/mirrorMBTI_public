import type { Tone } from '../../lib/prosody';

/** How a reading may sound to a listener. */
export const HEARD_AS: Record<Tone, string> = {
  neutral: '담담하게',
  happy: '기쁘게',
  angry: '화난 듯이',
};
