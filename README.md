# wppbot — Bot de Gincana para WhatsApp

Bot Node.js que entra em grupos do WhatsApp e responde automaticamente as
perguntas postadas pelo(s) **líder(es)** de uma gincana, usando IA
(OpenAI ou Google Gemini).

> Construído com `whatsapp-web.js` + ESM + arquitetura modular,
> com **dashboard web** integrada para configurar e monitorar tudo
> em tempo real, e **PostgreSQL** para persistir grupos, líderes,
> histórico e configurações.

---

## Recursos

- Detecta apenas mensagens **em grupos** vindas de **líderes escolhidos por grupo**.
- Ignora mensagens próprias.
- Resposta via **OpenAI** ou **Gemini** (escolha no `.env`).
- **PostgreSQL** persiste grupos, participantes, líderes selecionados,
  histórico de perguntas/respostas e a configuração de runtime.
- Cada grupo tem seus próprios líderes — selecionados na dashboard a
  partir da lista de participantes reais do grupo.
- Sistema de **cache** em memória (mesma pergunta = resposta instantânea).
- **Cooldown** por líder, para reduzir risco de banimento.
- **Retry** com backoff exponencial e **timeout** por tentativa.
- **Fallback** configurável caso a IA falhe.
- **Filtro de perguntas** (descarta mensagens que não parecem pergunta).
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
│   ├── config/                   # variáveis de ambiente por domínio (ai, bot, db…)
│   ├── core/                     # domínio puro (prompt, pricing, filtros, normalize)
│   ├── platform/                 # logger, retry, crash handlers
│   ├── infra/db/                 # PostgreSQL (pool, migrate, schema, repositories)
│   ├── providers/                # adapters externos (ai, ocr, audio, whatsapp)
│   ├── modules/                  # features stateful (cache, state, groups, history…)
│   ├── pipeline/                 # use cases (handleIncomingMessage, answerQuestion)
│   ├── web/                      # dashboard HTTP + WebSocket
│   │   ├── server.js             # bootstrap Express + Socket.IO
│   │   ├── auth.js               # token opcional (API + WS)
│   │   ├── socket.js             # broadcast em tempo real
│   │   ├── routes/               # um arquivo por domínio de rota
│   │   └── public/               # UI estática
│   └── index.js                  # entrypoint
```

Imports via aliases Node (`package.json#imports`), ex.: `#config`, `#providers/ai`, `#modules/groups`, `#pipeline/handleIncomingMessage`.

```
wppbot/ (continuação)
├── docker-compose.yml            # serviço Postgres
├── ecosystem.config.cjs          # config PM2
├── .env.example
├── .gitignore
├── package.json
└── README.md
```

---

## 1. Instalação

> Pré-requisitos: **Node.js 18+**, **Docker** (para o Postgres) e
> **Chromium**/Chrome instalado no sistema (necessário em Linux/WSL pelo
> `whatsapp-web.js`/Puppeteer).

```bash
# Em Ubuntu/Debian/WSL, se ainda não tiver:
sudo apt update
sudo apt install -y chromium-browser fonts-liberation libnss3 libatk-bridge2.0-0 \
  libgtk-3-0 libxss1 libasound2

# Clone/copie este projeto e dentro da pasta:
npm install

# Sobe o Postgres (lê POSTGRES_* do .env):
docker compose up -d
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
| `DATABASE_URL`        | string de conexão do Postgres (default: `postgres://wppbot:wppbot@localhost:5432/wppbot`) |
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` / `POSTGRES_PORT` | usados pelo `docker-compose.yml` |
| `ALLOWED_GROUPS`      | IDs dos grupos. Vazio = qualquer grupo em que houver líder definido |
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

> Dica: na dashboard, a aba **Grupos & Líderes** já mostra esse ID e os
> grupos disponíveis automaticamente.

---

## 2.1 Escolhendo os líderes pela dashboard

A partir desta versão os líderes são definidos **por grupo** e não mais
no `.env`. O fluxo é:

1. Conecte o WhatsApp escaneando o QR Code.
2. Abra a dashboard em `http://localhost:3000`.
3. Na seção **Grupos & Líderes**, clique em **★ Gerenciar líderes** no
   grupo desejado.
4. O modal abre com os participantes reais do grupo. Clique em **↻ sincronizar**
   na primeira vez (busca a lista via WhatsApp).
5. Use **☆ tornar líder** ou **★ remover líder** para cada pessoa.

O bot passa a responder *imediatamente* às perguntas dos líderes
selecionados — não é preciso reiniciar.

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

## 7. Produção em VPS com Docker

Já existe um `Dockerfile.production` e o perfil `production` no
`docker-compose.yml` que sobe o bot **e** o Postgres juntos.

### Passos na VPS (Ubuntu/Debian)

```bash
# 1) Instalar Docker Engine + Compose plugin (se ainda não tiver)
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER && newgrp docker

# 2) Clonar o projeto e preencher o .env
git clone https://github.com/SEU_USUARIO/wppbot.git
cd wppbot
cp .env.example .env
nano .env                      # preencha as chaves de IA, etc.

# 3) Subir Postgres + bot
docker compose --profile production up -d --build

# 4) Acompanhar logs / pegar o QR Code
docker compose --profile production logs -f bot
```

Na primeira execução o QR Code aparece nos logs **e** na dashboard
(`http://IP_DA_VPS:3000`). Depois de escanear, a sessão fica no volume
`wppbot-auth` — você não precisa escanear de novo, mesmo se o container
for recriado.

### Atualizar versão

```bash
git pull
docker compose --profile production up -d --build
```

### Backup da sessão e do banco

```bash
# Sessão do WhatsApp
docker run --rm -v wppbot-auth:/data -v "$PWD":/backup alpine \
  tar czf /backup/wppbot-auth.tgz -C /data .

# Banco
docker compose exec -T postgres pg_dump -U wppbot wppbot > wppbot.sql
```

### Expondo a dashboard

A dashboard escuta em `0.0.0.0:3000` dentro do container e é publicada
na VPS na mesma porta. **Não exponha sem proteção em IP público.**

#### Opção A — Acesso direto via `http://IP:3000`

Para testes ou redes internas. Você precisa **liberar a porta** na VPS:

```bash
# Firewall do SO (Ubuntu/Debian):
sudo ufw allow 3000/tcp && sudo ufw reload

# Confirma que está escutando externamente:
sudo ss -tlnp | grep 3000
```

Se for VPS em AWS / GCP / Azure / DigitalOcean / Oracle, **também
precisa liberar a porta 3000 no Security Group / Firewall do painel
da nuvem** — esse é o motivo mais comum de "não abre" mesmo com tudo
certo na VPS.

#### Opção B — HTTPS automático com Caddy (recomendado)

Já incluso no `docker-compose.yml` no perfil `https`. Caddy obtém
certificado Let's Encrypt automaticamente.

1. **DNS**: aponte um registro A do seu domínio para o IP da VPS.
2. **Firewall**: libere portas **80** e **443** (não a 3000):
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   sudo ufw reload
   ```
   (E também no Security Group da nuvem, se aplicável.)
3. **Configure** no `.env`:
   ```env
   DASHBOARD_DOMAIN=bot.seudominio.com
   DASHBOARD_EMAIL=voce@email.com
   WEB_TOKEN=algumtoken         # opcional, mas recomendado
   ```
4. **Suba** com os dois perfis:
   ```bash
   docker compose --profile production --profile https up -d --build
   ```
5. Acesse `https://bot.seudominio.com/?token=algumtoken`.

> Quer parar de expor a 3000 ao mundo? Edite o serviço `bot` no
> `docker-compose.yml` e troque `- "${WEB_PORT:-3000}:3000"` por
> `expose: ["3000"]`. Aí só o Caddy fala com o bot.

#### Opção C — Cloudflare Tunnel

Sem precisar abrir nenhuma porta:
```bash
# Na VPS, com o bot já rodando em :3000:
docker run -d --restart unless-stopped --name cloudflared \
  cloudflare/cloudflared:latest tunnel --no-autoupdate \
  --url http://host.docker.internal:3000
```
Cole o token gerado no painel do Cloudflare Zero Trust.

Em qualquer das opções acima, defina `WEB_TOKEN=algumtoken` no `.env`
para exigir token na UI/API.

### Detalhes da imagem

O `Dockerfile.production` é multi-stage:

1. **deps**: instala apenas `dependencies` (`npm ci --omit=dev`) usando
   cache do BuildKit.
2. **runtime**: `node:20-bookworm-slim` + Chromium do sistema + libs
   necessárias para o Puppeteer. Sobe como usuário `node`, usa `tini`
   como PID 1 e expõe `3000`.

Volumes persistidos:
- `wppbot-pgdata` → dados do Postgres
- `wppbot-auth` → `.wwebjs_auth` (sessão do WhatsApp)
- `wppbot-cache` → `.wwebjs_cache` (cache do whatsapp-web.js)
- `wppbot-logs` → `logs/`

Variáveis sobrescritas no compose:
- `DATABASE_URL` aponta para o serviço `postgres` da rede do compose.
- `CHROME_PATH=/usr/bin/chromium`.
- `WEB_HOST=0.0.0.0`.

---

## 8. Produção com PM2 (alternativa, sem Docker)

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

## 9. Suporte futuro: OCR e Áudio

Já existem dois providers prontos para serem implementados:

- `src/providers/ocr/index.js` — extrai texto de imagens.
- `src/providers/audio/index.js` — transcreve áudios.

Ambos têm exemplos em comentário usando o `openai` que você **já tem
instalado** (GPT-4o Vision para imagem, Whisper para áudio). Basta descomentar
o exemplo, ajustar e pronto: o pipeline (`handleIncomingMessage`) já chama
esses providers automaticamente quando uma mensagem chega com imagem ou áudio.

---

## 10. Troubleshooting

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
1. Existe pelo menos 1 líder definido para o grupo na dashboard
   (**Grupos & Líderes → ★ Gerenciar líderes**).
2. O grupo está em `ALLOWED_GROUPS` (ou deixe vazio).
3. `LOG_LEVEL=debug` mostra exatamente por que cada mensagem foi ignorada.

**Erro `Falha ao conectar/migrar o Postgres`** — verifique se o serviço
está no ar:
```bash
docker compose ps
docker compose logs postgres
```
Confira também `DATABASE_URL` no `.env`.

---

## Licença

ISC
