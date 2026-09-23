// ============================================================
// HELPY - FULL APP FROM ZERO
// Backend + Frontend + API + PostgreSQL
// ============================================================

const express = require("express");
const cors = require("cors");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();

const PORT = process.env.PORT || 3000;

// ============================================================
// DATABASE
// ============================================================

if (!process.env.DATABASE_URL) {
  console.warn("⚠️ DATABASE_URL pa defini.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// ============================================================
// DATABASE INITIALIZATION
// ============================================================

async function initializeDatabase() {
  try {
    // USERS
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // BUSINESSES
    await pool.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        category VARCHAR(100) NOT NULL,
        description TEXT,
        address VARCHAR(250),
        phone VARCHAR(50),
        whatsapp VARCHAR(50),
        email VARCHAR(150),
        website TEXT,
        image_url TEXT,
        owner_name VARCHAR(150),
        status VARCHAR(30) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Database initialized successfully.");
  } catch (error) {
    console.error("❌ Database initialization error:");
    console.error(error.message);
  }
}

// ============================================================
// HELPER
// ============================================================

function escapeHTML(value = "") {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// ============================================================
// HOME PAGE
// ============================================================

app.get("/", async (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>HElPY</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: #f5f7fb;
  color: #172033;
}

header {
  background: #111827;
  color: white;
  padding: 18px 20px;
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav {
  max-width: 1100px;
  margin: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.logo {
  font-size: 27px;
  font-weight: 900;
  letter-spacing: -1px;
}

.logo span {
  color: #22c55e;
}

.nav a {
  color: white;
  text-decoration: none;
  margin-left: 15px;
  font-size: 14px;
}

.hero {
  background:
    linear-gradient(135deg, #111827, #1f2937);
  color: white;
  padding: 70px 20px;
}

.hero-content {
  max-width: 1100px;
  margin: auto;
}

.hero h1 {
  font-size: 45px;
  margin: 0 0 15px;
}

.hero p {
  font-size: 18px;
  max-width: 650px;
  color: #d1d5db;
}

.search-box {
  margin-top: 30px;
  display: flex;
  max-width: 700px;
}

.search-box input {
  flex: 1;
  padding: 17px;
  border: none;
  border-radius: 10px 0 0 10px;
  font-size: 16px;
  outline: none;
}

.search-box button {
  border: none;
  background: #22c55e;
  color: white;
  padding: 0 25px;
  border-radius: 0 10px 10px 0;
  font-weight: bold;
  cursor: pointer;
}

.container {
  max-width: 1100px;
  margin: auto;
  padding: 35px 20px;
}

.section-title {
  font-size: 27px;
  margin-bottom: 20px;
}

.categories {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(130px, 1fr));
  gap: 12px;
}

.category {
  background: white;
  padding: 20px 10px;
  border-radius: 14px;
  text-align: center;
  cursor: pointer;
  box-shadow: 0 3px 12px rgba(0,0,0,.06);
  transition: .2s;
}

.category:hover {
  transform: translateY(-3px);
}

.category .icon {
  font-size: 30px;
}

.business-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
}

.business-card {
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 4px 18px rgba(0,0,0,.07);
}

.business-image {
  height: 160px;
  background: #e5e7eb;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 50px;
}

.business-content {
  padding: 18px;
}

.business-content h3 {
  margin-top: 0;
}

.badge {
  display: inline-block;
  background: #dcfce7;
  color: #166534;
  padding: 5px 9px;
  border-radius: 20px;
  font-size: 12px;
}

.btn {
  display: inline-block;
  border: none;
  background: #111827;
  color: white;
  text-decoration: none;
  padding: 11px 16px;
  border-radius: 9px;
  cursor: pointer;
  margin-top: 10px;
}

.btn-green {
  background: #22c55e;
}

.empty {
  background: white;
  padding: 35px;
  text-align: center;
  border-radius: 15px;
}

footer {
  margin-top: 50px;
  background: #111827;
  color: #9ca3af;
  padding: 35px 20px;
  text-align: center;
}

</style>
</head>

<body>

<header>
  <div class="nav">
    <div class="logo">HE<span>l</span>PY</div>

    <div>
      <a href="/">Accueil</a>
      <a href="/businesses">Entreprises</a>
      <a href="/add-business">Ajouter</a>
    </div>
  </div>
</header>

<section class="hero">

  <div class="hero-content">

    <h1>Trouvez ce dont vous avez besoin.</h1>

    <p>
      HElPY connecte les personnes avec les entreprises,
      services et professionnels disponibles autour d'elles.
    </p>

    <form class="search-box" action="/businesses" method="GET">
      <input
        type="text"
        name="search"
        placeholder="Rechercher une entreprise ou un service..."
      >

      <button type="submit">
        Rechercher
      </button>
    </form>

  </div>

</section>

<div class="container">

  <h2 class="section-title">
    Catégories
  </h2>

  <div class="categories">

    <div class="category" onclick="goCategory('Restaurants')">
      <div class="icon">🍽️</div>
      Restaurants
    </div>

    <div class="category" onclick="goCategory('Informatique')">
      <div class="icon">💻</div>
      Informatique
    </div>

    <div class="category" onclick="goCategory('Beauté')">
      <div class="icon">💄</div>
      Beauté
    </div>

    <div class="category" onclick="goCategory('Transport')">
      <div class="icon">🚗</div>
      Transport
    </div>

    <div class="category" onclick="goCategory('Construction')">
      <div class="icon">🏗️</div>
      Construction
    </div>

    <div class="category" onclick="goCategory('Éducation')">
      <div class="icon">📚</div>
      Éducation
    </div>

    <div class="category" onclick="goCategory('Santé')">
      <div class="icon">🏥</div>
      Santé
    </div>

    <div class="category" onclick="goCategory('Commerce')">
      <div class="icon">🛒</div>
      Commerce
    </div>

  </div>

</div>

<footer>
  <strong>HElPY</strong>
  <br><br>
  Trouvez. Connectez. Aidez.
</footer>

<script>

function goCategory(category) {
  window.location.href =
    "/businesses?category=" +
    encodeURIComponent(category);
}

</script>

</body>
</html>
  `);
});

// ============================================================
// BUSINESSES PAGE
// ============================================================

app.get("/businesses", async (req, res) => {

  try {

    const search = req.query.search || "";
    const category = req.query.category || "";

    let query = `
      SELECT *
      FROM businesses
      WHERE status = 'active'
    `;

    const values = [];

    if (search) {
      values.push("%" + search + "%");

      query += `
        AND (
          name ILIKE $${values.length}
          OR category ILIKE $${values.length}
          OR description ILIKE $${values.length}
          OR address ILIKE $${values.length}
        )
      `;
    }

    if (category) {
      values.push(category);

      query += `
        AND category ILIKE $${values.length}
      `;
    }

    query += `
      ORDER BY created_at DESC
    `;

    const result = await pool.query(query, values);

    const cards = result.rows.map(b => {

      const image = b.image_url
        ? `<img src="${escapeHTML(b.image_url)}"
             style="width:100%;height:160px;object-fit:cover;">`
        : `<div class="business-image">🏢</div>`;

      return `
        <div class="business-card">

          ${image}

          <div class="business-content">

            <span class="badge">
              ${escapeHTML(b.category)}
            </span>

            <h3>
              ${escapeHTML(b.name)}
            </h3>

            <p>
              ${escapeHTML(
                b.description || "Aucune description."
              )}
            </p>

            <p>
              📍 ${escapeHTML(b.address || "Adresse non disponible")}
            </p>

            <a class="btn"
               href="/business/${b.id}">
               Voir détails
            </a>

          </div>

        </div>
      `;
    }).join("");

    res.send(`
<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1.0">
<title>Entreprises - HElPY</title>

<style>

body {
  margin:0;
  font-family:Arial;
  background:#f5f7fb;
  color:#172033;
}

header {
  background:#111827;
  color:white;
  padding:18px;
}

.header {
  max-width:1100px;
  margin:auto;
  display:flex;
  justify-content:space-between;
}

header a {
  color:white;
  text-decoration:none;
  margin-left:15px;
}

.container {
  max-width:1100px;
  margin:auto;
  padding:30px 20px;
}

.search {
  display:flex;
  margin-bottom:30px;
}

.search input {
  flex:1;
  padding:14px;
  border:1px solid #ddd;
  border-radius:9px 0 0 9px;
}

.search button {
  border:none;
  background:#22c55e;
  color:white;
  padding:0 20px;
  border-radius:0 9px 9px 0;
}

.grid {
  display:grid;
  grid-template-columns:repeat(auto-fit,minmax(260px,1fr));
  gap:18px;
}

.card {
  background:white;
  border-radius:15px;
  overflow:hidden;
  box-shadow:0 3px 15px rgba(0,0,0,.07);
}

.card-img {
  height:160px;
  background:#e5e7eb;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:50px;
}

.content {
  padding:18px;
}

.badge {
  background:#dcfce7;
  color:#166534;
  padding:5px 9px;
  border-radius:20px;
  font-size:12px;
}

.btn {
  display:inline-block;
  background:#111827;
  color:white;
  padding:10px 14px;
  border-radius:8px;
  text-decoration:none;
}

</style>
</head>

<body>

<header>
  <div class="header">
    <strong>HElPY</strong>

    <div>
      <a href="/">Accueil</a>
      <a href="/add-business">Ajouter</a>
    </div>
  </div>
</header>

<div class="container">

  <h1>Entreprises & Services</h1>

  <form class="search" method="GET" action="/businesses">

    <input
      name="search"
      value="${escapeHTML(search)}"
      placeholder="Rechercher..."
    >

    <button>
      🔎
    </button>

  </form>

  ${
    cards
      ? `<div class="grid">${cards}</div>`
      : `
        <div style="
          background:white;
          padding:40px;
          text-align:center;
          border-radius:15px;
        ">
          <h2>Aucune entreprise trouvée</h2>

          <p>
            Soyez la première entreprise à rejoindre HElPY.
          </p>

          <a
            href="/add-business"
            style="
              display:inline-block;
              background:#22c55e;
              color:white;
              padding:12px 18px;
              border-radius:8px;
              text-decoration:none;
            "
          >
            Ajouter une entreprise
          </a>
        </div>
      `
  }

</div>

</body>
</html>
    `);

  } catch (error) {

    console.error(error);

    res.status(500).send(`
      <h1>Erreur serveur</h1>
      <p>${escapeHTML(error.message)}</p>
    `);
  }
});

// ============================================================
// ADD BUSINESS PAGE
// ============================================================

app.get("/add-business", (req, res) => {

  res.send(`
<!DOCTYPE html>
<html lang="fr">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1.0"
>

<title>Ajouter une entreprise - HElPY</title>

<style>

* {
  box-sizing:border-box;
}

body {
  margin:0;
  font-family:Arial;
  background:#f5f7fb;
  color:#172033;
}

header {
  background:#111827;
  color:white;
  padding:18px;
}

.header {
  max-width:700px;
  margin:auto;
  display:flex;
  justify-content:space-between;
}

.header a {
  color:white;
  text-decoration:none;
}

.container {
  max-width:700px;
  margin:auto;
  padding:30px 20px;
}

.form {
  background:white;
  padding:25px;
  border-radius:18px;
  box-shadow:0 4px 20px rgba(0,0,0,.08);
}

label {
  display:block;
  margin-top:16px;
  margin-bottom:7px;
  font-weight:bold;
}

input,
textarea,
select {
  width:100%;
  padding:13px;
  border:1px solid #d1d5db;
  border-radius:9px;
  font-size:15px;
}

textarea {
  min-height:100px;
  resize:vertical;
}

button {
  width:100%;
  margin-top:22px;
  padding:15px;
  border:0;
  border-radius:10px;
  background:#22c55e;
  color:white;
  font-size:16px;
  font-weight:bold;
}

#message {
  margin-top:15px;
  padding:12px;
  border-radius:9px;
  display:none;
}

</style>

</head>

<body>

<header>

<div class="header">

<strong>HElPY</strong>

<a href="/">
Accueil
</a>

</div>

</header>

<div class="container">

<h1>Ajouter une entreprise</h1>

<p>
Présentez votre entreprise ou votre service sur HElPY.
</p>

<form id="businessForm" class="form">

<label>Nom de l'entreprise *</label>

<input
  id="name"
  required
  placeholder="Ex: Mon Restaurant"
>

<label>Catégorie *</label>

<select id="category" required>

<option value="">Choisir une catégorie</option>

<option>Restaurants</option>
<option>Informatique</option>
<option>Beauté</option>
<option>Transport</option>
<option>Construction</option>
<option>Éducation</option>
<option>Santé</option>
<option>Commerce</option>
<option>Autre</option>

</select>

<label>Description</label>

<textarea
  id="description"
  placeholder="Décrivez votre entreprise..."
></textarea>

<label>Adresse</label>

<input
  id="address"
  placeholder="Ex: Delmas 33, Haïti"
>

<label>Téléphone</label>

<input
  id="phone"
  placeholder="Ex: 37000000"
>

<label>WhatsApp</label>

<input
  id="whatsapp"
  placeholder="Ex: 37000000"
>

<label>Email</label>

<input
  id="email"
  type="email"
  placeholder="email@example.com"
>

<label>Site web</label>

<input
  id="website"
  placeholder="https://..."
>

<label>URL de l'image</label>

<input
  id="image_url"
  placeholder="https://..."
>

<label>Nom du propriétaire</label>

<input
  id="owner_name"
  placeholder="Votre nom"
>

<button type="submit">
  Ajouter l'entreprise
</button>

<div id="message"></div>

</form>

</div>

<script>

const form = document.getElementById("businessForm");
const message = document.getElementById("message");

form.addEventListener("submit", async function(e) {

  e.preventDefault();

  message.style.display = "block";
  message.innerText = "Enregistrement en cours...";

  const data = {

    name:
      document.getElementById("name").value,

    category:
      document.getElementById("category").value,

    description:
      document.getElementById("description").value,

    address:
      document.getElementById("address").value,

    phone:
      document.getElementById("phone").value,

    whatsapp:
      document.getElementById("whatsapp").value,

    email:
      document.getElementById("email").value,

    website:
      document.getElementById("website").value,

    image_url:
      document.getElementById("image_url").value,

    owner_name:
      document.getElementById("owner_name").value

  };

  try {

    const response = await fetch("/api/businesses", {

      method:"POST",

      headers:{
        "Content-Type":"application/json"
      },

      body:JSON.stringify(data)

    });

    const result = await response.json();

    if (!response.ok) {
      throw new Error(result.message || "Erreur");
    }

    message.style.background = "#dcfce7";
    message.style.color = "#166534";

    message.innerHTML =
      "✅ Entreprise ajoutée avec succès !<br><br>" +
      "<a href='/business/" + result.entreprise.id +
      "'>Voir l'entreprise</a>";

    form.reset();

  } catch(error) {

    message.style.background = "#fee2e2";
    message.style.color = "#991b1b";

    message.innerText =
      "❌ " + error.message;

  }

});

</script>

</body>
</html>
  `);
});

// ============================================================
// BUSINESS DETAILS
// ============================================================

app.get("/business/:id", async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT *
      FROM businesses
      WHERE id = $1
      `,
      [req.params.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).send("Entreprise introuvable.");
    }

    const b = result.rows[0];

    res.send(`
<!DOCTYPE html>

<html lang="fr">

<head>

<meta charset="UTF-8">

<meta
  name="viewport"
  content="width=device-width,initial-scale=1.0"
>

<title>${escapeHTML(b.name)} - HElPY</title>

<style>

body {
  margin:0;
  font-family:Arial;
  background:#f5f7fb;
  color:#172033;
}

header {
  background:#111827;
  color:white;
  padding:18px;
}

.header {
  max-width:800px;
  margin:auto;
  display:flex;
  justify-content:space-between;
}

header a {
  color:white;
  text-decoration:none;
}

.container {
  max-width:800px;
  margin:auto;
  padding:30px 20px;
}

.card {
  background:white;
  border-radius:18px;
  overflow:hidden;
  box-shadow:0 4px 20px rgba(0,0,0,.08);
}

.image {
  width:100%;
  height:260px;
  background:#e5e7eb;
  display:flex;
  align-items:center;
  justify-content:center;
  font-size:70px;
}

.image img {
  width:100%;
  height:100%;
  object-fit:cover;
}

.content {
  padding:25px;
}

.badge {
  display:inline-block;
  background:#dcfce7;
  color:#166534;
  padding:6px 10px;
  border-radius:20px;
}

.contact {
  margin-top:20px;
}

.btn {
  display:inline-block;
  padding:12px 17px;
  background:#22c55e;
  color:white;
  text-decoration:none;
  border-radius:9px;
  margin-right:8px;
  margin-top:8px;
}

</style>

</head>

<body>

<header>

<div class="header">

<strong>HElPY</strong>

<a href="/businesses">
← Retour
</a>

</div>

</header>

<div class="container">

<div class="card">

<div class="image">

${
  b.image_url
  ? `<img src="${escapeHTML(b.image_url)}">`
  : "🏢"
}

</div>

<div class="content">

<span class="badge">
${escapeHTML(b.category)}
</span>

<h1>
${escapeHTML(b.name)}
</h1>

<p>
${escapeHTML(
  b.description || "Aucune description disponible."
)}
</p>

<div class="contact">

<p>
📍 <strong>Adresse:</strong>
${escapeHTML(b.address || "Non disponible")}
</p>

${
  b.phone
  ? `
  <p>
  📞 <strong>Téléphone:</strong>
  ${escapeHTML(b.phone)}
  </p>
  `
  : ""
}

${
  b.whatsapp
  ? `
  <a
    class="btn"
    href="https://wa.me/${escapeHTML(b.whatsapp)}"
    target="_blank"
  >
    WhatsApp
  </a>
  `
  : ""
}

${
  b.phone
  ? `
  <a
    class="btn"
    href="tel:${escap