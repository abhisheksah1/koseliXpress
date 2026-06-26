import { Router } from 'express';
import { appendVisitorTrack, getAppState, saveAppState } from '../services/appStateService.js';

const router = Router();

router.get('/', async (_req, res) => {
  try {
    const state = await getAppState();
    if (!state) {
      return res.status(404).json({ error: 'Store not initialized. Frontend will seed on first save.' });
    }
    res.json(state);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load store';
    console.error('GET /api/store error:', err);
    res.status(500).json({ error: message });
  }
});

router.put('/', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid store payload' });
    }
    await saveAppState(req.body);
    res.json({ success: true, message: 'Store saved to MongoDB' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save store';
    console.error('PUT /api/store error:', err);
    res.status(500).json({ error: message });
  }
});

router.post('/visitor-track', async (req, res) => {
  try {
    if (!req.body || typeof req.body !== 'object') {
      return res.status(400).json({ error: 'Invalid visitor track payload' });
    }
    await appendVisitorTrack(req.body);
    res.json({ success: true });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save visitor track';
    console.error('POST /api/store/visitor-track error:', err);
    res.status(500).json({ error: message });
  }
});

export default router;
