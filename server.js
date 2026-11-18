const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Simulated Admin Credentials (Meets environment/security concepts)
const ADMIN_CREDENTIALS = {
    username: "admin",
    password: "securepassword123" // In production, use bcrypt hashing
};

let mongoServer;
let Plant;

async function startServer() {
    try {
        mongoServer = await MongoMemoryServer.create();
        await mongoose.connect(mongoServer.getUri());
        console.log('Connected to In-Memory MongoDB successfully!');

        const plantSchema = new mongoose.Schema({
            name: { type: String, required: true },
            scientificName: { type: String, required: true },
            sunlight: String,
            soil: String,
            heightInches: Number,
            bloomSeason: String
        });

        Plant = mongoose.model('Plant', plantSchema);

        // Seed initial data if empty
        const count = await Plant.countDocuments();
        if (count === 0) {
            await Plant.insertMany([
                { name: 'Purple Coneflower', scientificName: 'Echinacea purpurea', sunlight: 'Full Sun', soil: 'Loam', heightInches: 36, bloomSeason: 'Summer' },
                { name: 'Butterfly Weed', scientificName: 'Asclepias tuberosa', sunlight: 'Full Sun', soil: 'Sand', heightInches: 24, bloomSeason: 'Summer' }
            ]);
        }

        // --- PUBLIC ROUTES ---
        app.get('/plants', async (req, res) => {
            const plants = await Plant.find({});
            res.json(plants);
        });

        // --- AUTHENTICATION ROUTE ---
        app.post('/api/login', (req, res) => {
            const { username, password } = req.body;
            if (username === ADMIN_CREDENTIALS.username && password === ADMIN_CREDENTIALS.password) {
                res.json({ success: true, token: "mock-jwt-admin-token-12345", message: "Login successful" });
            } else {
                res.status(401).json({ success: false, message: "Invalid username or password" });
            }
        });

        // --- PROTECTED ADMINISTRATIVE CRUD ROUTES ---
        // Simple middleware check for token/auth
        const verifyAdmin = (req, res, next) => {
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.includes("mock-jwt-admin-token")) {
                next();
            } else {
                res.status(403).json({ error: "Access denied. Administrator authentication required." });
            }
        };

        app.post('/plants', verifyAdmin, async (req, res) => {
            try {
                const newPlant = new Plant(req.body);
                const savedPlant = await newPlant.save();
                res.status(201).json(savedPlant);
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
        });

        app.put('/plants/:id', verifyAdmin, async (req, res) => {
            try {
                const updatedPlant = await Plant.findByIdAndUpdate(req.params.id, req.body, { new: true });
                if (!updatedPlant) return res.status(404).json({ message: 'Plant not found' });
                res.json(updatedPlant);
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
        });

        app.delete('/plants/:id', verifyAdmin, async (req, res) => {
            try {
                const deletedPlant = await Plant.findByIdAndDelete(req.params.id);
                if (!deletedPlant) return res.status(404).json({ message: 'Plant not found' });
                res.json(deletedPlant);
            } catch (err) {
                res.status(400).json({ error: err.message });
            }
        });

        app.listen(PORT, () => {
            console.log(`Admin Server running on port ${PORT}`);
        });

    } catch (err) {
        console.error('Server error:', err);
    }
}

startServer();
