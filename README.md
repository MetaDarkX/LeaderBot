# wppbot — Bot de Gincana para WhatsApp

Bot Node.js que entra em grupos do WhatsApp e responde automaticamente as
perguntas postadas pelo(s) **líder(es)** de uma gincana, usando IA
(OpenAI ou Google Gemini).

> Construído com `whatsapp-web.js` + ESM + arquitetura modular,
> com **dashboard web** integrada para configurar e monitorar tudo
> em tempo real.

---

## Recursos

- Detecta apenas mensagens **em grupos** vindas de **líderes autorizados**.
- Ignora mensagens próprias.
- Resposta via **OpenAI** ou **Gemini** (escolha no `.env`).
- Sistema de **cache** de respostas (mesma pergunta = resposta instantânea).
- **Cooldown** por líder, para reduzir risco de banimento.
- **Retry** com backoff exponencial e **timeout** por tentativa.
- **Fallback** configurável caso a IA falhe.
- **Filtro de perguntas** (descarta mensagens que não parecem pergunta).
- **Múltiplos líderes** e **múltiplos grupos** suportados.
- Sessão do WhatsApp **persistida** em `.wwebjs_auth/`.
- Logs coloridos e bonitos no terminal.
- Stubs prontos para **OCR** e **transcrição de áudio**.
- **Dashboard web** com QR Code, métricas, configuração em runtime,
  histórico de perguntas, logs em tempo real e teste de IA.
- Pronto para rodar em produção com **PM2**.

---

## Estrutura

```
wppbot/
├── src/
│   ├── services/
│   │   ├── aiService.js          # OpenAI / Gemini
│   │   ├── cacheService.js       # cache em memória
│   │   ├── cooldownService.js    # cooldown por líder
│   │   ├── stateService.js       # estado + configs em runtime
│   │   ├── statsService.js       # métricas agregadas
│   │   ├── historyService.js     # histórico Q/A em memória
│   │   ├── ocrService.js         # placeholder OCR (futuro)
│   │   └── audioService.js       # placeholder áudio (futuro)
│   ├── handlers/
│   │   ├── messageHandler.js     # roteador principal
│   │   ├── questionHandler.js    # cache → IA → fallback
│   │   └── errorHandler.js       # handlers globais
│   ├── utils/
│   │   ├── logger.js             # logs + bus de eventos
│   │   ├── retry.js              # retry + timeout
│   │   ├── filters.js            # validações
│   │   └── helpers.js            # utilitários
│   ├── web/                      # ◀ dashboard web
│   │   ├── server.js             # Express + Socket.IO + API
│   │   └── public/
│   │       ├── index.html
│   │       ├── styles.css
│   │       └── app.js
│   ├── config.js                 # config central + validação
│   └── index.js                  # entrypoint
├── ecosystem.config.cjs          # config PM2
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 1. Instalação

> Pré-requisitos: **Node.js 18+** e **Chromium**/Chrome instalado no sistema
> (necessário em Linux/WSL pelo `whatsapp-web.js`/Puppeteer).

```bash
# Em Ubuntu/Debian/WSL, se ainda não tiver:
sudo apt update
sudo apt install -y chromium-browser fonts-liberation libnss3 libatk-bridge2.0-0 \
  libgtk-3-0 libxss1 libasound2

# Clone/copie este projeto e dentro da pasta:
npm install
```

Se o Puppeteer reclamar do Chromium, descubra o caminho com
`which chromium-browser` (ou `which google-chrome`) e coloque em `CHROME_PATH` no `.env`.

---

## 2. Configurar o `.env`

```bash
cp .env.example .env
```

Edite o `.env`:

| Variável              | Descrição |
|-----------------------|-----------|
| `AI_PROVIDER`         | `openai` ou `gemini` |
| `OPENAI_API_KEY`      | chave da OpenAI (se usar OpenAI) |
| `OPENAI_MODEL`        | ex.: `gpt-4o-mini` (rápido e barato) |
| `GEMINI_API_KEY`      | chave do Google AI Studio |
| `GEMINI_MODEL`        | ex.: `gemini-1.5-flash` |
| `LEADER_NUMBERS`      | telefones do(s) líder(es), separados por vírgula. Ex.: `5511999999999,5521988888888` |
| `ALLOWED_GROUPS`      | IDs dos grupos. Vazio = qualquer grupo em que o líder esteja |
| `COOLDOWN_MS`         | intervalo mínimo entre respostas a um mesmo líder (ms) |
| `CACHE_TTL_SECONDS`   | quanto tempo manter respostas no cache |
| `AI_MAX_RETRIES`      | retries em caso de falha da IA |
| `AI_TIMEOUT_MS`       | timeout por tentativa |
| `MAX_QUESTION_LENGTH` | descarta mensagens muito longas |
| `FALLBACK_ANSWER`     | resposta usada quando a IA falha |
| `SESSION_NAME`        | nome da pasta da sessão |
| `CHROME_PATH`         | (opcional) caminho do Chrome/Chromium |
| `LOG_LEVEL`           | `debug` / `info` / `warn` / `error` |
| `WEB_ENABLED`         | `true` (padrão) liga a dashboard |
| `WEB_HOST`            | `0.0.0.0` (padrão) |
| `WEB_PORT`            | `3000` (padrão) |
| `WEB_TOKEN`           | (opcional) protege a UI; acesse com `?token=XYZ` |

### Como descobrir o ID de um grupo?

Rode o bot com `LOG_LEVEL=debug` e mande qualquer mensagem no grupo:
o `chat.id._serialized` aparece nos logs (algo como `120363025XXXXXXXXX@g.us`).

---

## 3. Rodar

```bash
# desenvolvimento (com auto-reload)
npm run dev

# normal
npm start
```

Na primeira execução vai aparecer um **QR Code** no terminal **e** na dashboard web (em `http://localhost:3000`).
No celular: **WhatsApp → Aparelhos conectados → Conectar um aparelho** e escaneie.

A sessão fica salva em `.wwebjs_auth/` — você só precisa escanear uma vez.

### Dashboard Web

Abra `http://localhost:3000` (ou a porta definida em `WEB_PORT`).
Recursos da UI:

- **Status** da conexão WhatsApp em tempo real (com QR quando precisa autenticar).
- **Métricas**: mensagens recebidas, respondidas, hits de cache, chamadas de IA, fallbacks, latência média.
- **Configuração em runtime**: edite líderes, grupos permitidos, cooldown, tamanho máximo de pergunta e mensagem de fallback **sem reiniciar o bot**.
- **Pausar / Retomar** o bot com um clique.
- **Lista dinâmica de grupos** em que o bot está, com botão "+ Permitir" para adicionar à allowlist.
- **Histórico** das últimas 100 perguntas/respostas (com origem: cache/IA/fallback).
- **Logs em tempo real** com filtro por nível.
- **Testar IA**: envie uma pergunta manual sem passar pelo WhatsApp.
- **Limpar cache** e **resetar cooldown** com um clique.

> Se quiser proteger a UI, defina `WEB_TOKEN=algumtoken` no `.env`
> e acesse `http://localhost:3000/?token=algumtoken`.
>
> Para expor externamente, é recomendado proxy reverso com HTTPS
> (nginx/Caddy/Cloudflare Tunnel) — **não exponha sem token** em IPs públicos.

---

## 4. Como melhorar a velocidade de resposta

1. **Use um modelo pequeno**: `gpt-4o-mini` (OpenAI) ou `gemini-1.5-flash` (Google) são bem mais rápidos que os "grandes".
2. **Mantenha o cache ligado** (`CACHE_TTL_SECONDS` ≥ 1800). Perguntas repetidas viram resposta instantânea.
3. **Reduza `max_tokens`** no `aiService.js` (já está em 200, o que é suficiente para respostas de gincana).
4. **Suba o bot perto da API**: VPS nos EUA tem latência muito menor com OpenAI/Gemini.
5. **Mantenha a sessão**: `LocalAuth` evita reinicializar o WhatsApp Web a cada execução.
6. **Use `chat.sendStateTyping()` + reply direto** (já implementado) — o WhatsApp prioriza o envio.
7. **Filtros eficientes** no `filters.js` evitam chamadas inúteis de IA.

---

## 5. Como evitar limitações / banimento do WhatsApp

- **Use um número dedicado** (não o pessoal). De preferência um chip novo, com chip ativo por algumas semanas antes.
- **Cooldown** já configurado: `COOLDOWN_MS=1500` é um ponto de partida seguro.
- **Não envie respostas em massa**: o bot só responde 1 mensagem por pergunta detectada.
- **Use `reply()`** (cita a mensagem original) em vez de spam de texto solto — já é o padrão.
- **Não rode no mesmo número que você usa pessoalmente** — evita "Aparelhos conectados" sumindo a sessão.
- **Não envie links agressivamente** nem mensagens com formatação suspeita.
- **Adicione variabilidade**: se quiser ser ainda mais "humano", insira um delay aleatório de 200–800ms antes do `reply` (basta um `await sleep(Math.random()*600+200)`).

---

## 6. Como manter a sessão salva

A pasta `.wwebjs_auth/` (na raiz do projeto) guarda os dados da sessão.
Ela está no `.gitignore`. **Não apague** essa pasta, ou você terá que escanear o QR de novo.

- Backup: você pode copiar essa pasta para outro servidor e a sessão segue válida (mesmo número).
- Se a sessão "expirar" (raro, mas acontece), apague `.wwebjs_auth/` e reinicie:
  ```bash
  rm -rf .wwebjs_auth && npm start
  ```

---

## 7. Produção com PM2

```bash
# Instala o PM2 globalmente (uma vez):
npm i -g pm2

# Sobe o bot
npm run pm2:start

# Acompanha logs
npm run pm2:logs

# Reinicia
npm run pm2:restart

# Para
npm run pm2:stop

# Faz o PM2 subir o bot automaticamente no boot do servidor:
pm2 save
pm2 startup            # cole o comando que ele imprimir
```

O `ecosystem.config.cjs` já vem com:

- `autorestart: true`
- `max_memory_restart: 500M` (mata e reinicia se passar disso)
- `max_restarts: 10` e `restart_delay: 5000ms` (evita reinício em loop)
- Logs salvos em `logs/out.log` e `logs/error.log`

---

## 8. Suporte futuro: OCR e Áudio

Já existem dois services prontos para serem implementados:

- `src/services/ocrService.js` — extrai texto de imagens.
- `src/services/audioService.js` — transcreve áudios.

Ambos têm exemplos em comentário usando o `openai` que você **já tem
instalado** (GPT-4o Vision para imagem, Whisper para áudio). Basta descomentar
o exemplo, ajustar e pronto: o `messageHandler` já chama esses services
automaticamente quando uma mensagem chega com imagem ou áudio.

---

## 9. Troubleshooting

**`Failed to launch the browser process`** — instale o Chromium:
```bash
sudo apt install -y chromium-browser
```
e/ou aponte `CHROME_PATH=/usr/bin/chromium` no `.env`.

**QR Code não aparece direito** — aumente o terminal (full screen) ou
reduza o zoom da fonte. O `qrcode-terminal` usa caracteres unicode.

**`Variável de ambiente obrigatória ausente`** — confira o `.env`,
especialmente `LEADER_NUMBERS` e a chave da IA escolhida.

**Bot não responde no grupo** — confira:
1. O número do líder está em `LEADER_NUMBERS` (com DDI, só dígitos).
2. O grupo está em `ALLOWED_GROUPS` (ou deixe vazio).
3. `LOG_LEVEL=debug` mostra exatamente por que cada mensagem foi ignorada.

---

## Licença

ISC
