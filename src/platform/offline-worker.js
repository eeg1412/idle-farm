import { settleOfflineWorld } from './world-save.js';

self.onmessage = ({ data: { base, now } }) => {
  const draft = structuredClone(base);
  settleOfflineWorld(base, draft, now);
  self.postMessage(draft);
};
