// ============================================================
//  ecosystem.config.cjs  -  Configuração do PM2
//  Use:
//    pm2 start ecosystem.config.cjs
//    pm2 logs wppbot
//    pm2 save && pm2 startup
// ============================================================

module.exports = {
  apps: [
    {
      name: 'wppbot',
      script: 'src/index.js',
      // Node moderno com suporte nativo a ESM — não precisa de loader
      interpreter: 'node',
      // Reiniciar se cair
      autorestart: true,
      // Não reiniciar em loop infinito caso o erro seja persistente
      max_restarts: 10,
      restart_delay: 5000,
      // Limite de memória: se passar de 500MB, PM2 reinicia o processo
      max_memory_restart: '500M',
      // IMPORTANTE para persistência da sessão do WhatsApp:
      // o Chromium precisa de tempo para finalizar a escrita de IndexedDB
      // e cookies onde o token da sessão fica salvo. O default do PM2 é
      // 1600ms, curto demais — o Chrome é morto antes de flushar e o
      // próximo boot pede QR. 15s dá folga sobrando para o shutdown gracioso.
      kill_timeout: 15000,
      // Logs
      out_file: './logs/out.log',
      error_file: './logs/error.log',
      merge_logs: true,
      time: true,
      // Variáveis de ambiente (também são lidas do .env via dotenv)
      env: {
        NODE_ENV: 'production',
      },
    },
  ],
};
