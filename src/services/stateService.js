// ============================================================
//  services/stateService.js
//  Mantém o estado global do bot (status, QR, pausa, info do
//  usuário logado, configs mutáveis) e emite eventos via
//  EventEmitter para qualquer ouvinte (ex.: a UI Web).
// ============================================================

import { EventEmitter } from 'node:events';
import { config } from '../config.js';

class StateService extends EventEmitter {
  constructor() {
    super();
    this.state = {
      status: 'initializing', // initializing | qr | authenticated | ready | disconnected | error
      qrDataUrl: null,        // data URL com o SVG/PNG do QR (quando status === 'qr')
      me: null,               // { number, pushname } quando 'ready'
      paused: false,          // se true, o bot ignora mensagens
      startedAt: Date.now(),
      lastError: null,
      // Configs editáveis em runtime (clone das configs estáticas)
      runtimeConfig: {
        aiProvider: config.ai.provider,
        leaderNumbers: [...config.bot.leaderNumbers],
        allowedGroups: [...config.bot.allowedGroups],
        cooldownMs: config.bot.cooldownMs,
        maxQuestionLength: config.bot.maxQuestionLength,
        fallbackAnswer: config.ai.fallbackAnswer,
      },
    };
  }

  /** Snapshot serializável do estado. */
  snapshot() {
    return {
      ...this.state,
      uptimeMs: Date.now() - this.state.startedAt,
    };
  }

  /** Atualiza chaves do estado e emite 'change'. */
  update(patch) {
    this.state = { ...this.state, ...patch };
    this.emit('change', this.snapshot());
  }

  /** Atualiza um campo dentro de runtimeConfig. */
  patchRuntimeConfig(patch) {
    this.state.runtimeConfig = { ...this.state.runtimeConfig, ...patch };
    this.emit('change', this.snapshot());
    this.emit('config', this.state.runtimeConfig);
  }

  setStatus(status, extra = {}) {
    this.update({ status, ...extra });
  }

  setQR(qrDataUrl) {
    this.update({ status: 'qr', qrDataUrl });
  }

  setReady(me) {
    this.update({ status: 'ready', qrDataUrl: null, me });
  }

  setError(message) {
    this.update({ status: 'error', lastError: message });
  }

  togglePaused(value) {
    this.update({ paused: typeof value === 'boolean' ? value : !this.state.paused });
    return this.state.paused;
  }

  get runtime() {
    return this.state.runtimeConfig;
  }

  get paused() {
    return this.state.paused;
  }
}

export const stateService = new StateService();
