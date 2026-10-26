const express = require('express');
const fs = require('fs');
const path = require('path');
const { resumesDir, verifyResumeSignature } = require('../services/resumeLinks');

const router = express.Router();

// GET /resumes/:file?exp=..&sig=.. — serves a CV only through a valid signed link.
router.get('/:file', (req, res) => {
  const { file } = req.params;
  if (!verifyResumeSignature(file, req.query.exp, req.query.sig)) {
    return res.status(403).json({ message: 'CV linkinin vaxtı bitib və ya etibarsızdır.' });
  }
  const filePath = path.join(resumesDir, path.basename(file));
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'CV tapılmadı.' });
  }
  res.set({
    'Content-Type': 'application/pdf',
    'Content-Disposition': 'inline',
    'Cache-Control': 'private, no-store',
    'X-Content-Type-Options': 'nosniff',
  });
  return res.sendFile(filePath);
});

module.exports = router;
