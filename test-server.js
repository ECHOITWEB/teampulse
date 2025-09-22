const express = require('express');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = 3001;

// Serve static files
app.use(express.static('.'));

// Serve the test page
app.get('/test-cors', (req, res) => {
  const testPagePath = path.join(__dirname, 'test-cors.html');
  const content = fs.readFileSync(testPagePath, 'utf8');
  res.send(content);
});

// Serve the PDF file
app.get('/test-pdf', (req, res) => {
  const pdfPath = '/Users/pablokim/teampulse/docs/here/Receipt-2216-0082.pdf';
  if (fs.existsSync(pdfPath)) {
    res.sendFile(pdfPath);
  } else {
    res.status(404).send('PDF not found');
  }
});

app.listen(PORT, () => {
  console.log(`Test server running at http://localhost:${PORT}/test-cors`);
  console.log(`Open http://localhost:${PORT}/test-cors in your browser to test`);
});