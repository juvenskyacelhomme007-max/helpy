const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Base de données en mémoire (ou ka moute l ak SQLite/MongoDB pita)
let users = [
  { id: 1, name: "Juvensky Acel'homme", email: "juvensky@example.com", phone: "+509 3700-0000" }
];

let items = [
  { id: 1, type: "product", title: "iPhone 13 Pro", category: "Électronique", price: 650, description: "En très bon état, 128GB.", location: "Port-au-Prince" },
  { id: 2, type: "service", title: "Développement Web", category: "Informatique", price: 200, description: "Création de sites web et applications.", location: "Cap-Haïtien" },
  { id: 3, type: "business", title: "Tech Solutions", category: "Entreprise", price: 0, description: "Services informatiques professionnels.", location: "Delmas" }
];

// --- ROUTES API ---

// 1. Profil / User API
app.get('/api/user/:id', (req, res) => {
  const user = users.find(u => u.id == req.params.id) || users[0];
  res.json(user);
});

app.put('/api/user/:id', (req, res) => {
  const { name, email, phone } = req.body;
  let user = users.find(u => u.id == req.params.id);
  if (user) {
    user.name = name || user.name;
    user.email = email || user.email;
    user.phone = phone || user.phone;
    return res.json({ success: true, user });
  }
  res.status(404).json({ error: "Utilisateur non trouvé" });
});

// 2. Annonces (Produits, Services, Entreprises) API
app.get('/api/items', (req, res) => {
  const { type, query } = req.query;
  let result = items;

  if (type) {
    result = result.filter(i => i.type === type);
  }
  if (query) {
    const q = query.toLowerCase();
    result = result.filter(i => i.title.toLowerCase().includes(q) || i.description.toLowerCase().includes(q));
  }

  res.json(result);
});

app.post('/api/items', (req, res) => {
  const { type, title, category, price, description, location } = req.body;
  
  if (!title || !type) {
    return res.status(400).json({ error: "Titre et type requis" });
  }

  const newItem = {
    id: items.length + 1,
    type,
    title,
    category: category || "Général",
    price: price || 0,
    description: description || "",
    location: location || "Haïti"
  };

  items.unshift(newItem); // Ajoute au début
  res.status(201).json({ success: true, item: newItem });
});

// Serve frontend HTML for all root routes
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Serveur HELPY lancé sur le port ${PORT}`);
});
