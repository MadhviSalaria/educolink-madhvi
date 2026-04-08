import { Router } from 'express';
import multer from 'multer';
import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const router = Router();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const uploadsDir = path.resolve(__dirname, '../../uploads');

await fs.mkdir(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const base = path
      .basename(file.originalname || 'file', ext)
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '')
      .slice(0, 60) || 'file';

    cb(null, `${Date.now()}-${base}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 25 * 1024 * 1024,
  },
});

function toPublicFile(fileName, stats, req) {
  return {
    name: fileName,
    size: stats.size,
    uploadedAt: stats.birthtime?.toISOString?.() || new Date(stats.mtime).toISOString(),
    url: `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(fileName)}`,
  };
}

router.get('/files', async (req, res) => {
  const items = await fs.readdir(uploadsDir);

  const files = await Promise.all(
    items.map(async (name) => {
      const fullPath = path.join(uploadsDir, name);
      const stats = await fs.stat(fullPath);
      return stats.isFile() ? toPublicFile(name, stats, req) : null;
    }),
  );

  files.sort((a, b) => (a?.uploadedAt < b?.uploadedAt ? 1 : -1));

  return res.json({ files: files.filter(Boolean) });
});

router.post('/files/upload', upload.single('file'), (req, res) => {
  if (!req.file) {
    return res.status(400).json({ message: 'No file uploaded. Use field name "file".' });
  }

  const response = {
    name: req.file.filename,
    originalName: req.file.originalname,
    size: req.file.size,
    uploadedAt: new Date().toISOString(),
    url: `${req.protocol}://${req.get('host')}/uploads/${encodeURIComponent(req.file.filename)}`,
  };

  return res.status(201).json({ file: response });
});

export default router;
