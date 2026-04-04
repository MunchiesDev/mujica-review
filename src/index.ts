import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import { handleWebhook } from './webhook.controller';

const app = express();
app.use(express.json());

// Verificar firma del webhook de GitHub
function verifySignature(req: express.Request): boolean {
  const signature = req.headers['x-hub-signature-256'] as string;
  const body = JSON.stringify(req.body);
  const expected = 'sha256=' + crypto
    .createHmac('sha256', process.env.GITHUB_WEBHOOK_SECRET!)
    .update(body)
    .digest('hex');
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

app.post('/webhooks/github', async (req, res) => {
  if (!verifySignature(req)) {
    return res.status(401).send('Invalid signature');
  }

  const event = req.headers['x-github-event'] as string;
  res.status(200).send('OK'); // Responder rápido

  // Procesar en background
  handleWebhook(event, req.body).catch(console.error);
});

app.listen(3002, () => console.log('Mujica listening on :3002'));
