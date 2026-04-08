import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.routes.js';
import billingRoutes from './routes/billing.routes.js';
import userRoutes from './routes/user.routes.js';
import contentRoutes from './routes/content.routes.js';
import filesRoutes from './routes/files.routes.js';
import learnerRoutes from './routes/learner.routes.js';
import wellwisherRoutes from './routes/wellwisher.routes.js';
import messagesRoutes from './routes/messages.routes.js';
import callsRoutes from './routes/calls.routes.js';
import { errorHandler, notFoundHandler } from './middleware/errorHandler.js';

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const allowedOrigins = (process.env.CORS_ORIGINS || 'http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174')
  .split(',')
  .map((v) => v.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }),
);

app.use(express.json({ limit: '1mb' }));
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.get('/', (_req, res) => {
  return res.json({
    ok: true,
    service: 'educolink-backend',
    message: 'EducoLink backend is running.',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      user: '/api/user',
      learner: '/api/learner',
      wellwisher: '/api/wellwisher',
      calls: '/api/calls',
      content: '/api/modules',
      files: '/api/files',
      aiAsk: '/api/ai/ask',
      syllabusAnalyze: '/api/ai/syllabus-analyze',
    },
  });
});

app.get('/api/health', (_req, res) => {
  return res.json({
    ok: true,
    service: 'educolink-backend',
    time: new Date().toISOString(),
  });
});

app.use('/api/auth', authRoutes);
app.use('/api', billingRoutes);
app.use('/api/user', userRoutes);
app.use('/api', learnerRoutes);
app.use('/api', wellwisherRoutes);
app.use('/api', messagesRoutes);
app.use('/api', callsRoutes);
app.use('/api', contentRoutes);
app.use('/api', filesRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

export default app;
