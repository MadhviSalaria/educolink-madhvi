import { promises as fs } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getUsersCollection, isMongoConfigured } from './mongo.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const dbFilePath = path.resolve(__dirname, '../../data/db.json');

let inMemoryDb = null;
let writeQueue = Promise.resolve();

async function ensureDbFile() {
  try {
    await fs.access(dbFilePath);
  } catch {
    await fs.mkdir(path.dirname(dbFilePath), { recursive: true });
    await fs.writeFile(dbFilePath, JSON.stringify({ users: [], tasks: [], sosRequests: [], taskSubmissions: [], messages: [] }, null, 2), 'utf-8');
  }
}

function ensureCollections(db) {
  if (!Array.isArray(db.users)) db.users = [];
  if (!Array.isArray(db.tasks)) db.tasks = [];
  if (!Array.isArray(db.sosRequests)) db.sosRequests = [];
  if (!Array.isArray(db.taskSubmissions)) db.taskSubmissions = [];
  if (!Array.isArray(db.messages)) db.messages = [];
}

export async function loadDb() {
  if (inMemoryDb) {
    return inMemoryDb;
  }

  await ensureDbFile();
  const raw = await fs.readFile(dbFilePath, 'utf-8');
  inMemoryDb = JSON.parse(raw || '{"users": [], "tasks": [], "sosRequests": [], "taskSubmissions": []}');
  ensureCollections(inMemoryDb);
  return inMemoryDb;
}

export async function saveDb() {
  if (!inMemoryDb) {
    return;
  }

  writeQueue = writeQueue.then(() => fs.writeFile(dbFilePath, JSON.stringify(inMemoryDb, null, 2), 'utf-8'));
  await writeQueue;
}

export async function findUserByEmail(email) {
  const normalized = String(email).toLowerCase().trim();

  if (isMongoConfigured()) {
    try {
      const users = await getUsersCollection();
      if (users) {
        return users.findOne({ email: normalized }, { projection: { _id: 0 } });
      }
    } catch {
      // Fall through to local file fallback for development resilience.
    }
  }

  const db = await loadDb();
  return db.users.find((u) => u.email === normalized) || null;
}

export async function findUserById(id) {
  if (isMongoConfigured()) {
    try {
      const users = await getUsersCollection();
      if (users) {
        return users.findOne({ id: String(id) }, { projection: { _id: 0 } });
      }
    } catch {
      // Fall through to local file fallback for development resilience.
    }
  }

  const db = await loadDb();
  return db.users.find((u) => u.id === String(id)) || null;
}

export async function listUsers() {
  if (isMongoConfigured()) {
    try {
      const users = await getUsersCollection();
      if (users) {
        return users.find({}, { projection: { _id: 0 } }).toArray();
      }
    } catch {
      // Fall through to local file fallback for development resilience.
    }
  }

  const db = await loadDb();
  return [...db.users];
}

export async function upsertUser(user) {
  const normalizedEmail = String(user.email || '').toLowerCase().trim();
  const normalizedUser = {
    ...user,
    email: normalizedEmail,
    updatedAt: new Date().toISOString(),
  };

  if (isMongoConfigured()) {
    try {
      const users = await getUsersCollection();
      if (users) {
        const existing = await users.findOne({ $or: [{ id: normalizedUser.id }, { email: normalizedEmail }] }, { projection: { _id: 0 } });
        const merged = {
          ...(existing || {}),
          ...normalizedUser,
          createdAt: existing?.createdAt || normalizedUser.createdAt || new Date().toISOString(),
        };

        await users.updateOne(
          { email: normalizedEmail },
          { $set: merged },
          { upsert: true },
        );

        return merged;
      }
    } catch {
      // Fall through to local file fallback for development resilience.
    }
  }

  const db = await loadDb();
  const idx = db.users.findIndex((u) => u.id === normalizedUser.id || u.email === normalizedEmail);
  if (idx >= 0) {
    db.users[idx] = { ...db.users[idx], ...normalizedUser };
  } else {
    db.users.push(normalizedUser);
  }
  await saveDb();
  return normalizedUser;
}

export async function listTasks() {
  const db = await loadDb();
  return [...db.tasks];
}

export async function findTaskById(taskId) {
  const db = await loadDb();
  return db.tasks.find((task) => task.id === String(taskId)) || null;
}

export async function upsertTask(task) {
  const db = await loadDb();
  const normalizedTask = {
    ...task,
    updatedAt: new Date().toISOString(),
  };
  const index = db.tasks.findIndex((entry) => entry.id === normalizedTask.id);
  if (index >= 0) {
    db.tasks[index] = { ...db.tasks[index], ...normalizedTask };
  } else {
    db.tasks.push(normalizedTask);
  }
  await saveDb();
  return normalizedTask;
}

export async function listSosRequests() {
  const db = await loadDb();
  return [...db.sosRequests];
}

export async function createSosRequest(entry) {
  const db = await loadDb();
  db.sosRequests.push(entry);
  await saveDb();
  return entry;
}

export async function listTaskSubmissions() {
  const db = await loadDb();
  return [...db.taskSubmissions];
}

export async function createTaskSubmission(entry) {
  const db = await loadDb();
  db.taskSubmissions.push(entry);
  await saveDb();
  return entry;
}

export async function listMessages() {
  const db = await loadDb();
  return [...db.messages];
}

export async function createMessage(entry) {
  const db = await loadDb();
  db.messages.push(entry);
  await saveDb();
  return entry;
}

export async function clearConversationMessages(userAId, userBId) {
  const db = await loadDb();
  const a = String(userAId || '').trim();
  const b = String(userBId || '').trim();

  const before = db.messages.length;
  db.messages = db.messages.filter(
    (m) =>
      !(
        (m.senderId === a && m.receiverId === b) ||
        (m.senderId === b && m.receiverId === a)
      ),
  );
  const removedCount = before - db.messages.length;

  await saveDb();
  return { removedCount };
}
