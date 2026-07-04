// routes/sosRoutes.js

const express = require('express');
const { sendSos } = require('../controllers/sosController');
const { authenticate } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/sos  (mount this router at "/api" in your main server file)
router.post('/sos', authenticate, sendSos);

module.exports = router;
