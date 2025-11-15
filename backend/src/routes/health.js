const express = require('express');
const router = express.Router();


router.get('/health', (_req, res) => {
  res.json({ ok: true, ts: Date.now() });
});


router.get('/ping', (_req, res) => res.sendStatus(204));

module.exports = router;
