import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import artifactRoutes from './routes.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Basic health of env config
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  console.warn('[Artifact Storage API] SUPABASE_URL or SUPABASE_SERVICE_KEY not set. API will start, but database calls will fail until configured.');
}

// Middleware
app.use(cors({
  origin: '*', // For Trinity Test demo; tighten in production
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
}));
app.use(express.json({ limit: '10mb' }));

// Routes
app.use('/api', artifactRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    supabase_url_configured: Boolean(process.env.SUPABASE_URL),
    supabase_key_configured: Boolean(process.env.SUPABASE_SERVICE_KEY)
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`[Artifact Storage API] Listening on port ${PORT}`);
});






















