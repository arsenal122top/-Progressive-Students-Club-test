require('dotenv').config();

const express = require('express');
const path = require('path');

const app = express();
const port = Number(process.env.PORT || 3000);
const botToken = process.env.BOT_TOKEN;
const chatId = process.env.CHAT_ID;

app.use(express.json({ limit: '1mb' }));
app.use(express.static(path.join(__dirname)));

function validatePayload(body) {
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const contact = typeof body.contact === 'string' ? body.contact.trim() : '';
  const message = typeof body.message === 'string' ? body.message.trim() : '';

  if (name.length < 2) {
    return { error: '\u0418\u043c\u044f \u0434\u043e\u043b\u0436\u043d\u043e \u0441\u043e\u0434\u0435\u0440\u0436\u0430\u0442\u044c \u043c\u0438\u043d\u0438\u043c\u0443\u043c 2 \u0441\u0438\u043c\u0432\u043e\u043b\u0430.' };
  }

  if (contact.length < 3) {
    return { error: '\u0423\u043a\u0430\u0436\u0438\u0442\u0435 Telegram \u0438\u043b\u0438 WhatsApp.' };
  }

  if (message.length < 10) {
    return { error: '\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435 \u0434\u043e\u043b\u0436\u043d\u043e \u0441\u043e\u0434\u0435\u0440\u0436\u0430\u0442\u044c \u043c\u0438\u043d\u0438\u043c\u0443\u043c 10 \u0441\u0438\u043c\u0432\u043e\u043b\u043e\u0432.' };
  }

  return { name, contact, message };
}

async function sendToTelegram({ name, contact, message }) {
  if (!botToken || !chatId) {
    throw new Error('BOT_TOKEN or CHAT_ID is not configured.');
  }

  const text = [
    `\u0418\u043c\u044f: ${name}`,
    `\u041a\u043e\u043d\u0442\u0430\u043a\u0442: ${contact}`,
    `\u0421\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435: ${message}`,
  ].join('\n');

  const response = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      chat_id: chatId,
      text,
    }),
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.ok) {
    throw new Error(data.description || 'Telegram API request failed.');
  }
}

app.post('/api/contact', async (req, res) => {
  const payload = validatePayload(req.body || {});

  if (payload.error) {
    return res.status(400).json({ ok: false, error: payload.error });
  }

  try {
    await sendToTelegram(payload);
    return res.json({ ok: true, message: 'Message sent successfully.' });
  } catch (error) {
    console.error('Telegram send failed:', error);
    return res.status(500).json({
      ok: false,
      error: '\u041d\u0435 \u0443\u0434\u0430\u043b\u043e\u0441\u044c \u043e\u0442\u043f\u0440\u0430\u0432\u0438\u0442\u044c \u0441\u043e\u043e\u0431\u0449\u0435\u043d\u0438\u0435. \u041f\u043e\u043f\u0440\u043e\u0431\u0443\u0439\u0442\u0435 \u043f\u043e\u0437\u0436\u0435.',
    });
  }
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
