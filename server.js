const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Sèvi tout fichye estatistik yo (HTML, CSS, imaj, JS)
app.use(express.static(path.join(__dirname)));

const users = [];

// Rout pou voye paj yo
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/register', (req, res) => {
  res.sendFile(path.join(__dirname, 'register.html'));
});

// API Enskripsyon
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Tanpri ranpli tout chan yo.' });
  }

  const userExists = users.find(u => u.email === email);
  if (userExists) {
    return res.status(400).json({ error: 'Imèl sa a gen yon kont deja.' });
  }

  const newUser = { id: Date.now(), name, email, password };
  users.push(newUser);

  res.status(201).json({ message: 'Kont ou kreye ak siksè!' });
});

app.listen(PORT, () => {
  console.log(`Sèvè a ap mache sou pòt ${PORT}`);
});
