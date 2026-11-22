const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();
const PORT = process.env.PORT || 5000;
const AUTH_SECRET = process.env.AUTH_SECRET || 'dev-secret-key-change-in-env';

app.use(cors());
app.use(express.json());

// Password hashing & verification helpers (built-in Node crypto)
function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

function verifyPassword(password, storedHash) {
  const [salt, key] = storedHash.split(':');
  if (!salt || !key) return false;
  const derived = crypto.scryptSync(password, salt, 64);
  const keyBuffer = Buffer.from(key, 'hex');
  if (derived.length !== keyBuffer.length) return false;
  return crypto.timingSafeEqual(derived, keyBuffer);
}

// Signed token helpers
function createToken(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(data)
    .digest('base64url');
  return `${data}.${signature}`;
}

function verifyToken(token) {
  const parts = token.split('.');
  if (parts.length !== 2) return null;
  const [data, signature] = parts;
  const expectedSig = crypto
    .createHmac('sha256', AUTH_SECRET)
    .update(data)
    .digest('base64url');
  const sigBuf = Buffer.from(signature);
  const expBuf = Buffer.from(expectedSig);
  if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
    return null;
  }
  const parsed = JSON.parse(Buffer.from(data, 'base64url').toString('utf8'));
  if (parsed.exp && Date.now() > parsed.exp) return null;
  return parsed;
}

// Input validation helper for plant records
function validatePlantInput(body) {
  const errors = [];
  if (!body.name || typeof body.name !== 'string' || body.name.trim().length < 2) {
    errors.push('Plant name is required and must be at least 2 characters.');
  }
  if (!body.scientificName || typeof body.scientificName !== 'string' || body.scientificName.trim().length < 2) {
    errors.push('Scientific name is required and must be at least 2 characters.');
  }
  if (body.heightInches !== undefined && body.heightInches !== '') {
    const num = Number(body.heightInches);
    if (Number.isNaN(num) || num <= 0) {
      errors.push('Height must be a positive number.');
    }
  }
  return errors;
}

let mongoServer;
let Plant;
let User;
const revokedTokens = new Set();

async function startServer() {
  try {
    mongoServer = await MongoMemoryServer.create();
    await mongoose.connect(mongoServer.getUri());
    console.log('Connected to In-Memory MongoDB successfully!');

    const plantSchema = new mongoose.Schema({
      name: { type: String, required: true, trim: true },
      scientificName: { type: String, required: true, trim: true },
      sunlight: { type: String, trim: true },
      soil: { type: String, trim: true },
      heightInches: Number,
      bloomSeason: { type: String, trim: true }
    });

    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true, trim: true, lowercase: true },
      passwordHash: { type: String, required: true },
      role: { type: String, default: 'user', enum: ['user', 'admin'] }
    });

    Plant = mongoose.model('Plant', plantSchema);
    User = mongoose.model('User', userSchema);

    // Seed initial plants if empty
    const plantCount = await Plant.countDocuments();
    if (plantCount === 0) {
      await Plant.insertMany([
        { name: 'Purple Coneflower', scientificName: 'Echinacea purpurea', sunlight: 'Full Sun', soil: 'Loam', heightInches: 36, bloomSeason: 'Summer' },
        { name: 'Butterfly Weed', scientificName: 'Asclepias tuberosa', sunlight: 'Full Sun', soil: 'Sand', heightInches: 24, bloomSeason: 'Summer' },
        { name: 'Wild Bergamot', scientificName: 'Monarda fistulosa', sunlight: 'Part Shade', soil: 'Clay', heightInches: 30, bloomSeason: 'Summer' }
      ]);
    }

    // Seed a default user if none exist
    const userCount = await User.countDocuments();
    if (userCount === 0) {
      await User.create({
        username: 'gardener',
        passwordHash: hashPassword('PlantPass123!'),
        role: 'user'
      });
    }

    // Auth middleware for protected routes
    const requireAuth = (req, res, next) => {
      const authHeader = req.headers.authorization || '';
      const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
      if (!token || revokedTokens.has(token)) {
        return res.status(401).json({ error: 'Authentication required. Please log in.' });
      }
      const decoded = verifyToken(token);
      if (!decoded) {
        return res.status(401).json({ error: 'Invalid or expired session token.' });
      }
      req.user = decoded;
      req.token = token;
      next();
    };

    // --- AUTH ROUTES ---

    // Registration with input validation
    app.post('/api/auth/register', async (req, res) => {
      try {
        const { username, password } = req.body;
        const cleanUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';

        if (!cleanUsername || cleanUsername.length < 3) {
          return res.status(400).json({ error: 'Username must be at least 3 characters long.' });
        }
        if (typeof password !== 'string' || password.length < 6) {
          return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        }

        const existing = await User.findOne({ username: cleanUsername });
        if (existing) {
          return res.status(409).json({ error: 'Username already exists.' });
        }

        const user = await User.create({
          username: cleanUsername,
          passwordHash: hashPassword(password),
          role: 'user'
        });

        const token = createToken({
          id: user._id.toString(),
          username: user.username,
          role: user.role,
          exp: Date.now() + 1000 * 60 * 60 * 24
        });

        res.status(201).json({
          message: 'Registration successful.',
          token,
          user: { username: user.username, role: user.role }
        });
      } catch (err) {
        res.status(500).json({ error: 'Failed to register user.' });
      }
    });

    // Login with input validation & password verification
    app.post('/api/auth/login', async (req, res) => {
      try {
        const { username, password } = req.body;
        const cleanUsername = typeof username === 'string' ? username.trim().toLowerCase() : '';

        if (!cleanUsername || typeof password !== 'string' || !password) {
          return res.status(400).json({ error: 'Username and password are required.' });
        }

        const user = await User.findOne({ username: cleanUsername });
        if (!user || !verifyPassword(password, user.passwordHash)) {
          return res.status(401).json({ error: 'Invalid username or password.' });
        }

        const token = createToken({
          id: user._id.toString(),
          username: user.username,
          role: user.role,
          exp: Date.now() + 1000 * 60 * 60 * 24
        });

        res.json({
          message: 'Login successful.',
          token,
          user: { username: user.username, role: user.role }
        });
      } catch (err) {
        res.status(500).json({ error: 'Login failed.' });
      }
    });

    // Logout (revokes current token)
    app.post('/api/auth/logout', requireAuth, (req, res) => {
      revokedTokens.add(req.token);
      res.json({ message: 'Logged out successfully.' });
    });

    // --- PLANT ROUTES ---

    // Public read route
    app.get('/plants', async (req, res) => {
      try {
        const plants = await Plant.find({});
        res.json(plants);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    });

    // Protected write routes (require login + validated input)
    app.post('/plants', requireAuth, async (req, res) => {
      const validationErrors = validatePlantInput(req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({ error: validationErrors.join(' ') });
      }

      try {
        const payload = {
          name: req.body.name.trim(),
          scientificName: req.body.scientificName.trim(),
          sunlight: req.body.sunlight ? req.body.sunlight.trim() : '',
          soil: req.body.soil ? req.body.soil.trim() : '',
          heightInches: req.body.heightInches !== '' && req.body.heightInches !== undefined
            ? Number(req.body.heightInches)
            : undefined,
          bloomSeason: req.body.bloomSeason ? req.body.bloomSeason.trim() : ''
        };
        const savedPlant = await Plant.create(payload);
        res.status(201).json(savedPlant);
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    });

    app.put('/plants/:id', requireAuth, async (req, res) => {
      const validationErrors = validatePlantInput(req.body);
      if (validationErrors.length > 0) {
        return res.status(400).json({ error: validationErrors.join(' ') });
      }

      try {
        const updatedPlant = await Plant.findByIdAndUpdate(
          req.params.id,
          {
            name: req.body.name.trim(),
            scientificName: req.body.scientificName.trim(),
            sunlight: req.body.sunlight ? req.body.sunlight.trim() : '',
            soil: req.body.soil ? req.body.soil.trim() : '',
            heightInches: req.body.heightInches !== '' && req.body.heightInches !== undefined
              ? Number(req.body.heightInches)
              : undefined,
            bloomSeason: req.body.bloomSeason ? req.body.bloomSeason.trim() : ''
          },
          { new: true, runValidators: true }
        );
        if (!updatedPlant) return res.status(404).json({ message: 'Plant not found' });
        res.json(updatedPlant);
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    });

    app.delete('/plants/:id', requireAuth, async (req, res) => {
      try {
        const deletedPlant = await Plant.findByIdAndDelete(req.params.id);
        if (!deletedPlant) return res.status(404).json({ message: 'Plant not found' });
        res.json(deletedPlant);
      } catch (err) {
        res.status(400).json({ error: err.message });
      }
    });

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Server startup error:', err);
  }
}

startServer();
