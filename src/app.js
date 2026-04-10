require('dotenv').config();
const express = require('express');
const orderRoutes = require('./routes/order');
const logger = require('./utils/logger');

const app = express();
app.use(express.json());
app.use('/', orderRoutes);

// Health check endpoint (bonus)
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => logger.info(`Server running on port ${PORT}`));
