import express from 'express';
import cors from 'cors';
import ownerRouter, { issueDevelopmentOwnerToken } from './owner/ownerRouter.js';

const app = express();

app.use(cors());
app.use(express.json());

app.get('/api/dev/session', (_req, res) => {
  const token = issueDevelopmentOwnerToken();
  if (!token) {
    res.status(404).json({ message: 'Không tìm thấy phiên phát triển.' });
    return;
  }

  res.json({ token, developmentOnly: true });
});

app.use('/api/owner', ownerRouter);

app.get('/api/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'nextvn API is running',
  });
});

export default app;
