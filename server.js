const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

// Memwa tanporè pwojè a
const users = [];
const services = [];

// ROUT PAJ HTML YO
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'register.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'login.html')));
app.get('/publish', (req, res) => res.sendFile(path.join(__dirname, 'publish.html')));

// API ENSKRIPSYON
app.post('/api/register', (req, res) => {
  const { name, email, password } = req.body;
  if (!name || !email || !password) return res.status(400).json({ error: 'Ranpli tout chan yo.' });
  
  if (users.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Imèl sa a gen yon kont deja.' });
  }

  users.push({ id: Date.now(), name, email, password });
  res.status(201).json({ message: 'Kont kreye ak siksè!' });
});

// API KONEKSYON
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);
  
  if (!user) {
    return res.status(400).json({ error: 'Imèl oswa mo de pas pa bon.' });
  }

  res.json({ message: 'Konekte ak siksè!', user: { name: user.name, email: user.email } });
});

// API SÈVIS (Pibliye ak Lis)
app.post('/api/services', (req, res) => {
  const { title, category, phone, description } = req.body;
  if (!title || !category || !phone) return res.status(400).json({ error: 'Mete enfòmasyon ki nesesè yo.' });

  const newService = { id: Date.now(), title, category, phone, description };
  services.push(newService);
  res.status(201).json({ message: 'Sèvis pibliye!', service: newService });
});

app.get('/api/services', (req, res) => {
  res.json(services);
});

app.listen(PORT, () => {
  console.log(`HELPY backend ap mache sou pòt ${PORT}`);
});
