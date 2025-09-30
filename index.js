import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
import express from 'express';
import { Telegraf } from 'telegraf';

const {
  BOT_TOKEN,
  WEBHOOK_URL,            // optional on Render
  WEBHOOK_SECRET_PATH
} = process.env;

if (!BOT_TOKEN || !WEBHOOK_SECRET_PATH) {
  console.error('Set BOT_TOKEN and WEBHOOK_SECRET_PATH env vars');
  process.exit(1);
}

const bot = new Telegraf(BOT_TOKEN);

function downloadWithYtDlp(url) {
  return new Promise((resolve, reject) => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'igdl-'));
    const outTemplate = path.join(tmpDir, '%(title)s.%(ext)s');

    const args = [
      url,
      '-o', outTemplate,
      '--no-playlist',
      '--merge-output-format', 'mp4',
      '--retries', '3',
      '--quiet',
      '--no-warnings'
    ];

    const proc = spawn('yt-dlp', args);

    proc.on('error', (err) => reject(err));
    proc.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(`yt-dlp exited with code ${code}`));
        return;
      }
      const files = fs.readdirSync(tmpDir).filter(f => !f.endsWith('.part'));
      if (!files.length) {
        reject(new Error('No file downloaded'));
        return;
      }
      resolve({ filePath: path.join(tmpDir, files[0]), tmpDir });
    });
  });
}

const isIgLink = (t) => /(https?:\/\/)?(www\.)?(instagram\.com|instagr\.am)\//i.test(t || '');

async function handleText(ctx, text, chatIdToPost) {
  if (!isIgLink(text)) {
    if (ctx.chat?.type === 'private') {
      await ctx.reply('Отправь ссылку на публичный пост/Reels Instagram.');
    }
    return;
  }

  const statusMsg = await ctx.reply?.('Скачиваю…').catch(() => null);

  try {
    const { filePath, tmpDir } = await downloadWithYtDlp(text);

    await ctx.telegram.sendVideo(
      chatIdToPost,
      { source: filePath },
      { caption: `Источник: ${text}` }
    );

    if (statusMsg) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        undefined,
        'Готово ✅'
      ).catch(() => {});
    }

    try { fs.unlinkSync(filePath); } catch {}
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch {}

  } catch (err) {
    console.error(err);
    if (statusMsg) {
      await ctx.telegram.editMessageText(
        ctx.chat.id,
        statusMsg.message_id,
        undefined,
        `Ошибка: ${err.message}`
      ).catch(() => {});
    } else {
      await ctx.reply?.(`Ошибка: ${err.message}`).catch(() => {});
    }
  }
}

bot.start(async (ctx) => {
  if (ctx.chat?.type === 'private') {
    await ctx.reply('Кинь ссылку на пост/Reels IG — я загружу видео в этот же чат/канал.');
  }
});

bot.on('message', async (ctx) => {
  const text = ctx.message?.text || ctx.message?.caption || '';
  const chatId = ctx.chat?.id;
  if (chatId == null) return;
  await handleText(ctx, text, chatId);
});

bot.on('channel_post', async (ctx) => {
  const text = ctx.channelPost?.text || ctx.channelPost?.caption || '';
  const chatId = ctx.chat?.id;
  if (chatId == null) return;
  await handleText(ctx, text, chatId);
});

const app = express();
app.use(express.json());

const hookPath = `/${WEBHOOK_SECRET_PATH}`;

// Prefer WEBHOOK_URL; otherwise use Render's RENDER_EXTERNAL_URL
const baseUrl = (WEBHOOK_URL || process.env.RENDER_EXTERNAL_URL || '').replace(/\/$/, '');
if (!baseUrl) {
  console.warn('WEBHOOK_URL/RENDER_EXTERNAL_URL not set yet. Set it to receive updates.');
}
const webhookUrl = baseUrl ? `${baseUrl}${hookPath}` : null;

async function setWebhookIfPossible() {
  if (!webhookUrl) return;
  try {
    await bot.telegram.setWebhook(webhookUrl);
    console.log('Webhook set:', webhookUrl);
  } catch (e) {
    console.error('Failed to set webhook:', e);
  }
}

app.post(hookPath, (req, res) => bot.webhookCallback(hookPath)(req, res));
app.get('/', (_req, res) => res.status(200).send('OK'));

const PORT = process.env.PORT || 3000;
app.listen(PORT, async () => {
  console.log('Server listening on', PORT);
  await setWebhookIfPossible();
});
