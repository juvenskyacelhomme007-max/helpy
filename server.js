const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// MIDDLEWARES DE BASE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sèvi fichye HTML, CSS, JS ki statik yo
app.use(express.static(__dirname));

// MEMWA TANPORÈ (W ap ka konekte yon baz de done PostgreSQL isit la)
const users = [];
const services = [];

// 1. ROUTE ENSKRIPSYON (REGISTER)
app.post('/api/register', (req, res) => {
  const { name, email, password, phone } = req.body;
  
  if (!email || !password || !name) {
    return res.status(400).json({ error: true, message: "Tanpri ranpli tout chan ki obligatwa yo." });
  }

  const existingUser = users.find(u => u.email === email.toLowerCase());
  if (existingUser) {
    return res.status(400).json({ error: true, message: "Imèl sa a gen yon kont deja." });
  }

  const newUser = {
    id: "user_" + Date.now(),
    name,
    email: email.toLowerCase(),
    phone: phone || "",
    password // Nan vèsyon ak PostgreSQL, n ap hash mo de pas sa a ak bcrypt
  };

  users.push(newUser);
  res.json({ success: true, user_id: newUser.id, name: newUser.name, email: newUser.email });
});

// 2. ROUTE KONEKSYON (LOGIN)
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: true, message: "Tanpri antre imèl ak mo de pas ou." });
  }

  const user = users.find(u => u.email === email.toLowerCase() && u.password === password);

  if (!user) {
    return res.status(400).json({ error: true, message: "Imèl oswa mo de pas enkorèk." });
  }

  res.json({ success: true, user_id: user.id, name: user.name, email: user.email });
});

// 3. ROUTE PROFIL ITILIZATÈ
app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const user = users.find(u => u.id === userId);
  
  if (user) {
    res.json({ id: user.id, name: user.name, email: user.email, phone: user.phone });
  } else {
    res.json({ id: userId, name: "Utilisateur HELPY", email: "utilisateur@helpy.com" });
  }
});

// 4. ROUTE PUBLICATION SERVICE
app.post('/api/services', (req, res) => {
  const { title, category, location, phone, image_url, description, user_id } = req.body;
  
  if (!title || !category || !location) {
    return res.status(400).json({ error: true, message: "Tanpri ranpli tout chan ki obligatwa yo." });
  }

  const newService = {
    id: "srv_" + Date.now(),
    title,
    category,
    location,
    phone,
    image_url: image_url || "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80",
    description,
    user_id,
    created_at: new Date()
  };

  services.push(newService);
  res.json({ success: true, service: newService });
});

// 5. ROUTE OBTENIR TOUT SERVICES
app.get('/api/services', (req, res) => {
  res.json(services);
});

// DEMARRAGE DU SERVEUR
app.listen(PORT, () => {
  console.log(`Sèvè HELPY ap mache sou pòt ${PORT}`);
});
