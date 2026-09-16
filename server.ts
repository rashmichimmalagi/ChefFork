import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@insforge/sdk';

async function startServer() {
  const app = express();
  const PORT = 3000;
  const insforge = createClient({
    baseUrl: process.env.VITE_INSFORGE_URL || 'https://did2k7x3.ap-southeast.insforge.app',
    anonKey: process.env.VITE_INSFORGE_ANON_KEY || undefined,
  });

  // Basic middleware
  app.use(express.json());

  app.post('/api/auth/login-username', async (req, res) => {
    const username = typeof req.body?.username === 'string' ? req.body.username.trim() : '';
    const password = typeof req.body?.password === 'string' ? req.body.password : '';

    if (!username || !password) {
      res.status(400).json({ message: 'Invalid username or password' });
      return;
    }

    try {
      const { data: profile, error: profileError } = await insforge.database
        .from('profiles')
        .select('email')
        .ilike('username', username)
        .limit(1)
        .single();

      if (profileError || !profile?.email) {
        res.status(401).json({ message: 'Invalid username or password' });
        return;
      }

      const { data, error } = await insforge.auth.signInWithPassword({
        email: profile.email,
        password,
      });

      if (error || !data) {
        res.status(401).json({ message: error?.message || 'Invalid username or password' });
        return;
      }

      res.json(data);
    } catch {
      res.status(401).json({ message: 'Invalid username or password' });
    }
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      app: 'ChefFork',
      backend: 'InsForge Cloud (ChefConnect)',
      time: new Date().toISOString()
    });
  });

  // Serve static assets (videos, images) from public directory
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ChefFork server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});

