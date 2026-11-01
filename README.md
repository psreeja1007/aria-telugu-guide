# Aria · ఆరియా

A friendly Telugu guide that can teach anything. People talk to Aria by typing or with the mic, and she answers in simple Telugu, **pure Telugu** or **Telugu + English** (the user chooses), and reads her answers aloud in a young woman's voice.

Built with Next.js and [Sarvam AI](https://docs.sarvam.ai):

| What | Sarvam API |
|---|---|
| Aria's answers | Chat: `sarvam-105b-conversations` (streamed) |
| Mic → text (Telugu, Tenglish, English) | Speech to Text: `saaras:v4` (`transcribe` for pure Telugu, `codemix` for the mix) |
| Aria's voice | Text to Speech: `bulbul:v4-flash`, `pooja_te_conversation` or `kavitha_te_conversation` |

## Run it locally

```bash
npm install
cp .env.example .env.local   # then paste your key into .env.local
npm run dev                  # http://localhost:3000
```

The mic needs `localhost` or `https`.

## Deploy to Vercel (via GitHub)

1. Push this `aria` folder to a new GitHub repo:
   ```bash
   git init
   git add .
   git commit -m "Aria: Telugu learning assistant"
   git branch -M main
   git remote add origin https://github.com/<you>/aria.git
   git push -u origin main
   ```
   `.env.local` is in `.gitignore`, so your key is **not** pushed.
2. On [vercel.com](https://vercel.com) → **Add New → Project** → import the repo. Vercel detects Next.js automatically.
3. Before deploying, open **Environment Variables** and add `SARVAM_API_KEY` = your key.
4. Click **Deploy**. Every later `git push` redeploys automatically.

## How it's put together

```
src/app/page.tsx              → the whole Aria experience (AriaApp)
src/app/about/page.tsx        → about page and safety info
src/app/api/chat/route.ts     → streams Aria's reply from Sarvam 105B
src/app/api/speak/route.ts    → turns text into Telugu speech (mp3)
src/app/api/transcribe/route.ts → turns a voice recording into text
src/lib/server/prompt.ts      → Aria's personality, style rules and safety rules
src/lib/i18n.ts               → all UI text (pure + mix) and the topic starters
src/lib/text.ts               → splits replies into sentences so Aria starts speaking fast
src/lib/client/speaker.ts     → plays the voice in order (Web Audio)
src/lib/client/recorder.ts    → mic recording (30-second limit)
```

- **The API key stays on the server.** The browser only talks to `/api/*`.
- **Rate limits:** chat 20/min, speak 90/min, and transcribe 20/min per visitor (in-memory, per server instance).
- **Nothing is stored on the server.** Settings live in `localStorage` and the chat in `sessionStorage`, so the conversation is gone when the tab is closed.

### Changing things

- **Add or change topic buttons:** edit `TOPICS` in `src/lib/i18n.ts`.
- **Change how Aria talks:** edit `src/lib/server/prompt.ts`.
- **Change the voice:** edit `VOICES` in `src/lib/settings.ts`. See the [Bulbul voices list](https://docs.sarvam.ai/api/api-guides-tutorials/text-to-speech/voices).

## Cost (Sarvam pricing, Nov 2026)

- A text question costs about ₹0.05.
- A spoken answer costs about ₹0.5. Voice is about ₹1 per 1,000 characters.
- A 10-second voice question costs about ₹0.08.

New accounts get ₹100 of free credits. When credits run out, Aria shows a "service unavailable" message.
