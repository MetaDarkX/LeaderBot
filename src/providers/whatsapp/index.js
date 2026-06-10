// ============================================================
//  providers/whatsapp/index.js
//  Entry point do provider WhatsApp.
// ============================================================

export {
  createClient,
  cleanupStaleChromiumLocks,
  defaultSessionDir,
  enableLitePageMode,
} from './client.js';

export { extractText } from './extractText.js';
