const express = require("express");
const cors = require("cors");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

// ================================
// MIDDLEWARE
// ================================
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sèvi tout fichye frontend yo
app.use(express.static(__dirname));

// ================================
// MEMWA TANPORÈ
// ================================
const users = [];
const services = [];
const businesses = [];

// ================================
// PAGES HTML
// ================================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.get("/register", (req, res) => {
  res.sendFile(path.join(__dirname, "register.html"));
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "login.html"));
});

app.get("/publish", (req, res) => {
  res.sendFile(path.join(__dirname, "publish.html"));
});

app.get("/add-business", (req, res) => {
  res.sendFile(path.join(__dirname, "add-business.html"));
});

app.get("/business-details", (req, res) => {
  res.sendFile(path.join(__dirname, "business-details.html"));
});

// ================================
// HEALTH CHECK
// ================================
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "HELPY backend ap mache",
    port: PORT
  });
});

// ================================
// REGISTER
// ================================
app.post("/api/register", (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      error: "Ranpli tout chan yo."
    });
  }

  const existingUser = users.find(
    (user) => user.email === email
  );

  if (existingUser) {
    return res.status(400).json({
      error: "Imèl sa a gen yon kont deja."
    });
  }

  const user = {
    id: Date.now(),
    name,
    email,
    password
  };

  users.push(user);

  res.status(201).json({
    message: "Kont kreye ak siksè!",
    user: {
      name: user.name,
      email: user.email
    }
  });
});

// ================================
// LOGIN
// ================================
app.post("/api/login", (req, res) => {
  const { email, password } = req.body;

  const user = users.find(
    (u) => u.email === email && u.password === password
  );

  if (!user) {
    return res.status(400).json({
      error: "Imèl oswa mo de pas pa bon."
    });
  }

  res.json({
    message: "Konekte ak siksè!",
    user: {
      name: user.name,
      email: user.email
    }
  });
});

// ================================
// BUSINESSES
// ================================

// Lis tout antrepriz
app.get("/api/businesses", (req, res) => {
  res.json({
    statut: "ok",
    entreprises: businesses
  });
});

// Ajoute yon antrepriz
app.post("/api/businesses", (req, res) => {
  const {
    name,
    category,
    description,
    phone,
    whatsapp,
    address,
    location,
    image_url
  } = req.body;

  if (!name || !category) {
    return res.status(400).json({
      error: "Non antrepriz la ak kategori a obligatwa."
    });
  }

  const business = {
    id: Date.now(),
    name,
    category,
    description: description || "",
    phone: phone || "",
    whatsapp: whatsapp || "",
    address: address || "",
    location: location || "",
    image_url: image_url || "",
    created_at: new Date().toISOString()
  };

  businesses.push(business);

  res.status(201).json({
    statut: "ok",
    message: "Antrepriz ajoute ak siksè!",
    entreprise: business
  });
});

// Detay yon antrepriz
app.get("/api/businesses/:id", (req, res) => {
  const id = Number(req.params.id);

  const business = businesses.find(
    (b) => b.id === id
  );

  if (!business) {
    return res.status(404).json({
      error: "Antrepriz pa jwenn."
    });
  }

  res.json({
    statut: "ok",
    entreprise: business
  });
});

// ================================
// SERVICES
// ================================

// Pibliye sèvis
app.post("/api/services", (req, res) => {
  const {
    title,
    category,
    phone,
    description
  } = req.body;

  if (!title || !category || !phone) {
    return res.status(400).json({
      error: "Mete enfòmasyon ki nesesè yo."
    });
  }

  const newService = {
    id: Date.now(),
    title,
    category,
    phone,
    description: description || "",
    created_at: new Date().toISOString()
  };

  services.push(newService);

  res.status(201).json({
    message: "Sèvis pibliye!",
    service: newService
  });
});

// Lis sèvis yo
app.get("/api/services", (req, res) => {
  res.json({
    status: "ok",
    services
  });
});

// ================================
// 404 API
// ================================
app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API route pa jwenn."
  });
});

// ================================
// START SERVER
// ================================
app.listen(PORT, "0.0.0.0", () => {
  console.log(`HELPY backend ap mache sou pò ${PORT}`);
});