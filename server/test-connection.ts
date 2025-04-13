import express from 'express';

const app = express();

app.get('/', (req, res) => {
  res.send('Server is working!');
});

app.get('/api/test', (req, res) => {
  res.json({ message: 'API is working!' });
});

const port = 3456;
app.listen(port, '0.0.0.0', () => {
  console.log(`Test server listening on http://0.0.0.0:${port}`);
});