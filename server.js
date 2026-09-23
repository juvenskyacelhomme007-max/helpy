const express = require("express");
const cors = require("cors");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

// =====================================================
// DATABASE
// =====================================================

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL
    ? { rejectUnauthorized: false }
    : false
});

async function initializeDatabase() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE,
        password TEXT,
        phone VARCHAR(30),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await pool.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        description TEXT,
        category VARCHAR(100),
        location VARCHAR(200),
        phone VARCHAR(50),
        whatsapp VARCHAR(50),
        email VARCHAR(150),
        website VARCHAR(255),
        image_url TEXT,
        owner_name VARCHAR(150),
        status VARCHAR(30) DEFAULT 'active',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    console.log("✅ Database initialized");
  } catch (error) {
    console.error("❌ Database initialization error:");
    console.error(error.message);
  }
}

// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true }));

// =====================================================
// SECURITY / ESCAPE
// =====================================================

function escapeHTML(value) {
  if (value === null || value === undefined) return "";

  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function cleanPhone(value) {
  if (!value) return "";
  return String(value).replace(/[^\d+]/g, "");
}

function whatsappNumber(value) {
  if (!value) return "";

  let number = String(value).replace(/\D/g, "");

  // Haiti number without country code
  if (number.length === 8) {
    number = "509" + number;
  }

  return number;
}

// =====================================================
// GLOBAL HTML
// =====================================================

function pageTemplate(title, content) {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">

<title>${escapeHTML(title)} - HELPY</title>

<style>

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family: Arial, Helvetica, sans-serif;
  background: #f4f7fb;
  color: #172033;
}

a {
  text-decoration: none;
}

.navbar {
  background: #0b63f6;
  color: white;
  padding: 15px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  position: sticky;
  top: 0;
  z-index: 100;
}

.logo {
  color: white;
  font-size: 25px;
  font-weight: 900;
}

.nav-links {
  display: flex;
  gap: 10px;
  align-items: center;
}

.nav-links a {
  color: white;
  font-size: 14px;
  font-weight: 700;
}

.container {
  width: 94%;
  max-width: 1100px;
  margin: 25px auto;
}

.hero {
  background: linear-gradient(135deg, #075cf0, #00a6ff);
  color: white;
  border-radius: 22px;
  padding: 35px 25px;
  margin-bottom: 25px;
  box-shadow: 0 10px 30px rgba(0,0,0,.12);
}

.hero h1 {
  margin: 0 0 10px;
  font-size: 34px;
}

.hero p {
  margin: 0 0 20px;
  font-size: 16px;
  opacity: .95;
}

.search-box {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.search-box input {
  flex: 1;
  min-width: 200px;
  padding: 15px;
  border: 0;
  border-radius: 12px;
  font-size: 16px;
}

button,
.btn {
  border: none;
  border-radius: 12px;
  padding: 13px 18px;
  cursor: pointer;
  font-weight: 800;
  font-size: 15px;
  display: inline-block;
}

.btn-primary {
  background: #0b63f6;
  color: white;
}

.btn-success {
  background: #16a34a;
  color: white;
}

.btn-dark {
  background: #172033;
  color: white;
}

.btn-light {
  background: white;
  color: #0b63f6;
}

.card {
  background: white;
  border-radius: 18px;
  padding: 20px;
  margin-bottom: 18px;
  box-shadow: 0 5px 20px rgba(0,0,0,.07);
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
  gap: 18px;
}

.business-card {
  overflow: hidden;
  padding: 0;
}

.business-image {
  width: 100%;
  height: 190px;
  object-fit: cover;
  background: #e9eef5;
}

.business-content {
  padding: 18px;
}

.business-name {
  font-size: 21px;
  font-weight: 900;
  margin-bottom: 8px;
}

.badge {
  display: inline-block;
  background: #e8f1ff;
  color: #075cf0;
  padding: 6px 10px;
  border-radius: 30px;
  font-size: 12px;
  font-weight: 800;
  margin-bottom: 10px;
}

.muted {
  color: #697386;
}

.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 15px;
}

.form-group {
  margin-bottom: 16px;
}

.form-group label {
  display: block;
  font-weight: 800;
  margin-bottom: 7px;
}

.form-group input,
.form-group textarea,
.form-group select {
  width: 100%;
  padding: 14px;
  border: 1px solid #d8dee9;
  border-radius: 12px;
  font-size: 15px;
  background: white;
}

.form-group textarea {
  min-height: 120px;
  resize: vertical;
}

.success {
  background: #dcfce7;
  color: #166534;
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 15px;
}

.error {
  background: #fee2e2;
  color: #991b1b;
  padding: 15px;
  border-radius: 12px;
  margin-bottom: 15px;
}

.footer {
  text-align: center;
  padding: 35px 15px;
  margin-top: 40px;
  background: #172033;
  color: white;
}

.detail-image {
  width: 100%;
  max-height: 430px;
  object-fit: cover;
  border-radius: 18px;
}

.info-row {
  padding: 13px 0;
  border-bottom: 1px solid #edf0f4;
}

.info-label {
  font-weight: 900;
}

.empty {
  text-align: center;
  padding: 50px 20px;
  color: #697386;
}

@media(max-width:600px) {

  .navbar {
    padding: 13px;
  }

  .logo {
    font-size: 21px;
  }

  .nav-links a {
    font-size: 12px;
  }

  .hero {
    padding: 27px 18px;
  }

  .hero h1 {
    font-size: 27px;
  }

  .actions .btn {
    width: 100%;
    text-align: center;
  }

}

</style>
</head>

<body>

<nav class="navbar">

<a class="logo" href="/">HElPY</a>

<div class="nav-links">
<a href="/">Accueil</a>
<a href="/businesses">Entreprises</a>
<a href="/add-business">Ajouter</a>
</div>

</nav>

<main class="container">

${content}

</main>

<footer class="footer">
<strong>HElPY</strong>
<br>
Trouvez facilement les entreprises et services en Haïti.
<br><br>
© ${new Date().getFullYear()} HELPY
</footer>

</body>
</html>`;
}

// =====================================================
// HOME
// =====================================================

app.get("/", async (req, res) => {

  let businesses = [];

  try {
    const result = await pool.query(`
      SELECT *
      FROM businesses
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 6
    `);

    businesses = result.rows;

  } catch (error) {
    console.error(error.message);
  }

  const cards = businesses.map(businessCard).join("");

  const content = `
    <section class="hero">

      <h1>Bienvenue sur HELPY 🇭🇹</h1>

      <p>
        Trouvez rapidement des entreprises, commerces et services
        près de vous en Haïti.
      </p>

      <form action="/businesses" method="GET" class="search-box">

        <input
          type="text"
          name="q"
          placeholder="Rechercher une entreprise ou un service..."
        >

        <button class="btn-light" type="submit">
          🔎 Rechercher
        </button>

      </form>

    </section>

    <div style="display:flex;justify-content:space-between;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:15px;">

      <h2>Entreprises récentes</h2>

      <a class="btn btn-primary" href="/add-business">
        + Ajouter une entreprise
      </a>

    </div>

    ${
      businesses.length
        ? `<div class="grid">${cards}</div>`
        : `
          <div class="card empty">
            <h3>Aucune entreprise pour le moment</h3>
            <p>Ajoutez la première entreprise sur HELPY.</p>

            <a class="btn btn-primary" href="/add-business">
              Ajouter une entreprise
            </a>
          </div>
        `
    }
  `;

  res.send(pageTemplate("Accueil", content));
});

// =====================================================
// BUSINESS CARD
// =====================================================

function businessCard(business) {

  const image = business.image_url
    ? escapeHTML(business.image_url)
    : "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=900&q=80";

  return `
    <article class="card business-card">

      <img
        class="business-image"
        src="${image}"
        alt="${escapeHTML(business.name)}"
        loading="lazy"
      >

      <div class="business-content">

        <span class="badge">
          ${escapeHTML(business.category || "Entreprise")}
        </span>

        <div class="business-name">
          ${escapeHTML(business.name)}
        </div>

        <p class="muted">
          📍 ${escapeHTML(business.location || "Haïti")}
        </p>

        <p>
          ${escapeHTML(
            business.description
              ? business.description.substring(0, 120)
              : "Découvrez cette entreprise sur HELPY."
          )}
        </p>

        <a
          class="btn btn-primary"
          href="/business/${business.id}"
        >
          Voir détails
        </a>

      </div>

    </article>
  `;
}

// =====================================================
// BUSINESSES PAGE
// =====================================================

app.get("/businesses", async (req, res) => {

  const q = String(req.query.q || "").trim();

  let businesses = [];

  try {

    let result;

    if (q) {

      result = await pool.query(
        `
        SELECT *
        FROM businesses
        WHERE status = 'active'
        AND (
          name ILIKE $1
          OR description ILIKE $1
          OR category ILIKE $1
          OR location ILIKE $1
        )
        ORDER BY created_at DESC
        `,
        [`%${q}%`]
      );

    } else {

      result = await pool.query(`
        SELECT *
        FROM businesses
        WHERE status = 'active'
        ORDER BY created_at DESC
      `);

    }

    businesses = result.rows;

  } catch (error) {

    console.error(error.message);

    return res.status(500).send(
      pageTemplate(
        "Erreur",
        `
        <div class="error">
          Impossible de récupérer les entreprises.
        </div>
        `
      )
    );
  }

  const cards = businesses.map(businessCard).join("");

  const content = `

    <div class="card">

      <h1>Entreprises & Services</h1>

      <form action="/businesses" method="GET" class="search-box">

        <input
          type="text"
          name="q"
          value="${escapeHTML(q)}"
          placeholder="Rechercher..."
        >

        <button class="btn btn-primary">
          🔎 Rechercher
        </button>

      </form>

    </div>

    ${
      q
        ? `<p class="muted">
            Résultats pour : <strong>${escapeHTML(q)}</strong>
          </p>`
        : ""
    }

    ${
      businesses.length
        ? `<div class="grid">${cards}</div>`
        : `
          <div class="card empty">
            <h2>Aucun résultat</h2>
            <p>Aucune entreprise ne correspond à votre recherche.</p>
          </div>
        `
    }

  `;

  res.send(pageTemplate("Entreprises", content));
});

// =====================================================
// ADD BUSINESS PAGE
// =====================================================

app.get("/add-business", (req, res) => {

  const content = `

    <div class="card">

      <h1>Ajouter une entreprise</h1>

      <p class="muted">
        Présentez votre entreprise ou votre service sur HELPY.
      </p>

      <form action="/api/businesses" method="POST">

        <div class="form-group">
          <label>Nom de l'entreprise *</label>

          <input
            name="name"
            required
            placeholder="Ex: Boutique Juvensky"
          >
        </div>

        <div class="form-group">
          <label>Catégorie *</label>

          <select name="category" required>

            <option value="">Choisir une catégorie</option>

            <option>Restaurant</option>
            <option>Boutique</option>
            <option>Technologie</option>
            <option>Beauté</option>
            <option>Construction</option>
            <option>Transport</option>
            <option>Santé</option>
            <option>Éducation</option>
            <option>Services</option>
            <option>Autre</option>

          </select>

        </div>

        <div class="form-group">

          <label>Description</label>

          <textarea
            name="description"
            placeholder="Décrivez votre entreprise..."
          ></textarea>

        </div>

        <div class="form-group">

          <label>Localisation *</label>

          <input
            name="location"
            required
            placeholder="Ex: Delmas, Port-au-Prince"
          >

        </div>

        <div class="form-group">

          <label>Téléphone</label>

          <input
            name="phone"
            type="tel"
            placeholder="Ex: 509..."
          >

        </div>

        <div class="form-group">

          <label>WhatsApp</label>

          <input
            name="whatsapp"
            type="tel"
            placeholder="Ex: 509..."
          >

        </div>

        <div class="form-group">

          <label>Email</label>

          <input
            name="email"
            type="email"
            placeholder="contact@example.com"
          >

        </div>

        <div class="form-group">

          <label>Site web</label>

          <input
            name="website"
            type="url"
            placeholder="https://..."
          >

        </div>

        <div class="form-group">

          <label>URL de l'image</label>

          <input
            name="image_url"
            type="url"
            placeholder="https://..."
          >

        </div>

        <div class="form-group">

          <label>Nom du propriétaire/contact</label>

          <input
            name="owner_name"
            placeholder="Nom du responsable"
          >

        </div>

        <button class="btn btn-primary" type="submit">
          🚀 Ajouter l'entreprise
        </button>

      </form>

    </div>

  `;

  res.send(pageTemplate("Ajouter une entreprise", content));
});

// =====================================================
// BUSINESS DETAILS
// =====================================================

app.get("/business/:id", async (req, res) => {

  const id = Number(req.params.id);

  if (!Number.isInteger(id)) {
    return res.status(400).send(
      pageTemplate(
        "Erreur",
        `<div class="error">ID invalide.</div>`
      )
    );
  }

  try {

    const result = await pool.query(
      `
      SELECT *
      FROM businesses
      WHERE id = $1
      `,
      [id]
    );

    if (!result.rows.length) {

      return res.status(404).send(
        pageTemplate(
          "Entreprise introuvable",
          `
          <div class="card empty">

            <h2>Entreprise introuvable</h2>

            <a class="btn btn-primary" href="/businesses">
              Retour aux entreprises
            </a>

          </div>
          `
        )
      );

    }

    const business = result.rows[0];

    const image = business.image_url
      ? escapeHTML(business.image_url)
      : "https://images.unsplash.com/photo-1524758631624-e2822e304c36?auto=format&fit=crop&w=1200&q=80";

    const phone = cleanPhone(business.phone);
    const whatsapp = whatsappNumber(business.whatsapp);

    const phoneButton = phone
      ? `
        <a
          class="btn btn-primary"
          href="tel:${escapeHTML(phone)}"
        >
          📞 Appeler
        </a>
      `
      : "";

    const whatsappButton = whatsapp
      ? `
        <a
          class="btn btn-success"
          href="https://wa.me/${