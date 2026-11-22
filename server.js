import express from 'express';
import { ObjectId } from 'mongodb';
import { closeConnection, connectWithRetry, getNotesCollection, isConnected } from './db.js';

const PORT = Number(process.env.PORT) || 3000;
const MAX_TEXT_LENGTH = 10_000;

const app = express();
app.use(express.json({ limit: '64kb' }));

// Returns 200 once MongoDB is connected and 503 before that.
app.get('/health', (_req, res) => {
  if (!isConnected()) return res.status(503).json({ status: 'starting' });
  res.json({ status: 'ok' });
});

// Writes a note: curl -X POST -H 'Content-Type: application/json' -d '{"text":"hello"}' localhost:8080/notes
app.post('/notes', async (req, res, next) => {
  try {
    const text = req.body?.text;
    if (typeof text !== 'string' || text.trim().length === 0 || text.length > MAX_TEXT_LENGTH) {
      return res.status(400).json({ error: `"text" must be a non-empty string of at most ${MAX_TEXT_LENGTH} characters` });
    }
    if (!isConnected()) return res.status(503).json({ error: 'Database is not connected yet' });

    const note = { text, createdAt: new Date() };
    const { insertedId } = await getNotesCollection().insertOne(note);
    res.status(201).json({ _id: insertedId, ...note });
  } catch (error) {
    next(error);
  }
});

// Reads a note back by the _id that POST /notes returned.
app.get('/notes/:id', async (req, res, next) => {
  try {
    if (!ObjectId.isValid(req.params.id)) return res.status(400).json({ error: 'Invalid note id' });
    if (!isConnected()) return res.status(503).json({ error: 'Database is not connected yet' });

    const note = await getNotesCollection().findOne({ _id: new ObjectId(req.params.id) });
    if (!note) return res.status(404).json({ error: 'Note not found' });
    res.json(note);
  } catch (error) {
    next(error);
  }
});

// Malformed JSON bodies and unexpected errors end up here.
// eslint-disable-next-line no-unused-vars
app.use((error, _req, res, _next) => {
  if (error.type === 'entity.parse.failed') return res.status(400).json({ error: 'Request body is not valid JSON' });
  if (error.type === 'entity.too.large') return res.status(413).json({ error: 'Request body is too large' });
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

const server = app.listen(PORT, () => console.log(`Listening on port ${PORT}`));
connectWithRetry();

// Docker sends SIGTERM on `docker stop`. Exit promptly instead of waiting for the 10 second kill.
for (const signal of ['SIGTERM', 'SIGINT']) {
  process.on(signal, () => {
    server.close(async () => {
      await closeConnection();
      process.exit(0);
    });
  });
}
