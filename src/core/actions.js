// ============================================================
//  core/actions.js
//  Enum de ações possíveis para uma mensagem recebida.
//  Constantes puras — usadas pelo activityService e pela UI.
// ============================================================

export const ACTIONS = Object.freeze({
  ANSWERED:        'answered',
  IGNORED_FROM_ME: 'ignored:from-me',
  IGNORED_DM:      'ignored:not-group',
  IGNORED_GROUP:   'ignored:not-allowed-group',
  IGNORED_LEADER:  'ignored:not-leader',
  IGNORED_PAUSED:  'ignored:paused',
  IGNORED_FILTER:  'ignored:filter',
  IGNORED_CLASSIFY:'ignored:classify',
  IGNORED_COOLDOWN:'ignored:cooldown',
  IGNORED_NO_TEXT: 'ignored:no-text',
  ERROR:           'error',
});
