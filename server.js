// ============================================================
// HELPY - GLOBAL MARKETPLACE BACKEND
// SERVER.JS - PART 1/10
// Railway PostgreSQL
// ============================================================

const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();

const PORT = process.env.PORT || 3000;


// ============================================================
// MIDDLEWARE
// ============================================================

app.use(cors());

app.use(
  express.json({
    limit: "10mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "10mb"
  })
);

app.use(express.static(__dirname));


// ============================================================
// DATABASE
// ============================================================

if (!process.env.DATABASE_URL) {
  console.error("ERROR: DATABASE_URL is missing.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,

  ssl: {
    rejectUnauthorized: false
  }
});


// ============================================================
// CONSTANTS
// ============================================================

const LISTING_TYPES = [
  "product",
  "service",
  "business",
  "realestate",
  "vehicle"
];


// ============================================================
// DATABASE HELPERS
// ============================================================

async function columnExists(table, column) {
  const result = await pool.query(
    `
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = $1
      AND column_name = $2
    LIMIT 1
    `,
    [table, column]
  );

  return result.rows.length > 0;
}


async function addColumnIfMissing(
  table,
  column,
  definition
) {
  const exists = await columnExists(
    table,
    column
  );

  if (!exists) {
    await pool.query(
      `
      ALTER TABLE ${table}
      ADD COLUMN ${column} ${definition}
      `
    );
  }
}


// ============================================================
// BASIC HELPERS
// ============================================================

function cleanText(value) {
  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
}


function normalizeEmail(email) {
  return cleanText(email).toLowerCase();
}


function getUserId(req) {
  const value =
    req.headers["x-user-id"] ||
    req.headers["user-id"] ||
    req.body?.user_id ||
    req.query?.user_id;

  const id = Number(value);

  if (
    !Number.isInteger(id) ||
    id <= 0
  ) {
    return null;
  }

  return id;
}


function numberValue(
  value,
  fallback = 0
) {
  const number = Number(value);

  if (!Number.isFinite(number)) {
    return fallback;
  }

  return number;
}


// ============================================================
// START DATABASE INITIALIZATION
// ============================================================

async function initializeDatabase() {

  // ----------------------------------------------------------
  // USERS
  // ----------------------------------------------------------

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,

      name VARCHAR(150) NOT NULL,

      email VARCHAR(255)
        UNIQUE NOT NULL,

      password TEXT NOT NULL,

      phone VARCHAR(50),

      whatsapp VARCHAR(50),

      photo_url TEXT,

      bio TEXT,

      location VARCHAR(200),

      role VARCHAR(50)
        DEFAULT 'user',

      status VARCHAR(50)
        DEFAULT 'active',

      verified BOOLEAN
        DEFAULT false,

      created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
    )
  `);


  // ----------------------------------------------------------
  // USERS MIGRATIONS
  // ----------------------------------------------------------

  await addColumnIfMissing(
    "users",
    "phone",
    "VARCHAR(50)"
  );

  await addColumnIfMissing(
    "users",
    "whatsapp",
    "VARCHAR(50)"
  );

  await addColumnIfMissing(
    "users",
    "photo_url",
    "TEXT"
  );

  await addColumnIfMissing(
    "users",
    "bio",
    "TEXT"
  );

  await addColumnIfMissing(
    "users",
    "location",
    "VARCHAR(200)"
  );

  await addColumnIfMissing(
    "users",
    "role",
    "VARCHAR(50) DEFAULT 'user'"
  );

  await addColumnIfMissing(
    "users",
    "status",
    "VARCHAR(50) DEFAULT 'active'"
  );

  await addColumnIfMissing(
    "users",
    "verified",
    "BOOLEAN DEFAULT false"
  );


  // ----------------------------------------------------------
  // BUSINESSES
  // ----------------------------------------------------------

  await pool.query(`
    CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY,

      user_id INTEGER
        REFERENCES users(id)
        ON DELETE CASCADE,

      name VARCHAR(200)
        NOT NULL,

      category VARCHAR(150),

      description TEXT,

      location VARCHAR(200),

      phone VARCHAR(50),

      whatsapp VARCHAR(50),

      image_url TEXT,

      website TEXT,

      status VARCHAR(50)
        DEFAULT 'active',

      created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
    )
  `);


  // ----------------------------------------------------------
  // PRODUCTS
  // ----------------------------------------------------------

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,

      user_id INTEGER
        REFERENCES users(id)
        ON DELETE SET NULL,

      business_id INTEGER
        REFERENCES businesses(id)
        ON DELETE SET NULL,

      title VARCHAR(200)
        NOT NULL,

      description TEXT,

      price NUMERIC(14,2)
        DEFAULT 0,

      currency VARCHAR(10)
        DEFAULT 'HTG',

      category VARCHAR(150),

      location VARCHAR(200),

      whatsapp VARCHAR(50),

      phone VARCHAR(50),

      image_url TEXT,

      quantity INTEGER
        DEFAULT 1,

      status VARCHAR(50)
        DEFAULT 'active',

      created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
    )
  `);


  // ----------------------------------------------------------
  // SERVICES
  // ----------------------------------------------------------

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,

      user_id INTEGER
        REFERENCES users(id)
        ON DELETE SET NULL,

      business_id INTEGER
        REFERENCES businesses(id)
        ON DELETE SET NULL,

      title VARCHAR(200)
        NOT NULL,

      description TEXT,

      price NUMERIC(14,2)
        DEFAULT 0,

      currency VARCHAR(10)
        DEFAULT 'HTG',

      category VARCHAR(150),

      location VARCHAR(200),

      whatsapp VARCHAR(50),

      phone VARCHAR(50),

      image_url TEXT,

      status VARCHAR(50)
        DEFAULT 'active',

      created_at TIMESTAMP
        DEFAULT CURRENT_TIMESTAMP
    )
  `);


  console.log(
    "HELPY database initialization started."
  );
}


// ============================================================
// END PART 1/10
// ============================================================

// ============================================================
// HELPY - PART 2/10
// DATABASE MIGRATIONS + HEALTH + REGISTER
// ============================================================


// ============================================================
// BUSINESS MIGRATIONS
// ============================================================

async function initializeBusinessMigrations() {

  await addColumnIfMissing(
    "businesses",
    "status",
    "VARCHAR(50) DEFAULT 'active'"
  );

  await addColumnIfMissing(
    "businesses",
    "website",
    "TEXT"
  );

  await addColumnIfMissing(
    "businesses",
    "phone",
    "VARCHAR(50)"
  );

  await addColumnIfMissing(
    "businesses",
    "whatsapp",
    "VARCHAR(50)"
  );

  await addColumnIfMissing(
    "businesses",
    "image_url",
    "TEXT"
  );

}


// ============================================================
// PRODUCT MIGRATIONS
// ============================================================

async function initializeProductMigrations() {

  await addColumnIfMissing(
    "products",
    "business_id",
    "INTEGER"
  );

  await addColumnIfMissing(
    "products",
    "whatsapp",
    "VARCHAR(50)"
  );

  await addColumnIfMissing(
    "products",
    "phone",
    "VARCHAR(50)"
  );

  await addColumnIfMissing(
    "products",
    "image_url",
    "TEXT"
  );

  await addColumnIfMissing(
    "products",
    "quantity",
    "INTEGER DEFAULT 1"
  );

  await addColumnIfMissing(
    "products",
    "currency",
    "VARCHAR(10) DEFAULT 'HTG'"
  );

  await addColumnIfMissing(
    "products",
    "status",
    "VARCHAR(50) DEFAULT 'active'"
  );

}


// ============================================================
// SERVICE MIGRATIONS
// ============================================================

async function initializeServiceMigrations() {

  await addColumnIfMissing(
    "services",
    "business_id",
    "INTEGER"
  );

  await addColumnIfMissing(
    "services",
    "whatsapp",
    "VARCHAR(50)"
  );

  await addColumnIfMissing(
    "services",
    "phone",
    "VARCHAR(50)"
  );

  await addColumnIfMissing(
    "services",
    "image_url",
    "TEXT"
  );

  await addColumnIfMissing(
    "services",
    "currency",
    "VARCHAR(10) DEFAULT 'HTG'"
  );

  await addColumnIfMissing(
    "services",
    "status",
    "VARCHAR(50) DEFAULT 'active'"
  );

}


// ============================================================
// HEALTH CHECK
// ============================================================

app.get("/api/health", async (req, res) => {

  try {

    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      service: "HELPY",
      database: "connected"
    });

  } catch (error) {

    console.error(
      "HEALTH ERROR:",
      error
    );

    res.status(500).json({
      status: "error",
      service: "HELPY",
      database: "disconnected"
    });

  }

});


// ============================================================
// API INFORMATION
// ============================================================

app.get("/api", (req, res) => {

  res.json({
    statut: "ok",
    service: "HELPY",
    message: "HELPY API is running.",
    version: "1.0.0"
  });

});


// ============================================================
// REGISTER
// ============================================================

app.post("/api/register", async (req, res) => {

  try {

    const name =
      cleanText(req.body.name);

    const email =
      normalizeEmail(req.body.email);

    const password =
      cleanText(req.body.password);

    const phone =
      cleanText(req.body.phone);

    const whatsapp =
      cleanText(req.body.whatsapp);

    const location =
      cleanText(req.body.location);

    const bio =
      cleanText(req.body.bio);


    // --------------------------------------------------------
    // VALIDATION
    // --------------------------------------------------------

    if (
      !name ||
      !email ||
      !password
    ) {

      return res.status(400).json({
        statut: "erreur",
        message:
          "Nom, email et mot de passe sont obligatoires."
      });

    }


    if (password.length < 6) {

      return res.status(400).json({
        statut: "erreur",
        message:
          "Le mot de passe doit contenir au moins 6 caractères."
      });

    }


    // --------------------------------------------------------
    // CHECK EXISTING ACCOUNT
    // --------------------------------------------------------

    const existing =
      await pool.query(
        `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
        `,
        [email]
      );


    if (
      existing.rows.length > 0
    ) {

      return res.status(409).json({
        statut: "erreur",
        message:
          "Un compte avec cet email existe déjà."
      });

    }


    // --------------------------------------------------------
    // HASH PASSWORD
    // --------------------------------------------------------

    const hashedPassword =
      await bcrypt.hash(
        password,
        10
      );


    // --------------------------------------------------------
    // CREATE USER
    // --------------------------------------------------------

    const result =
      await pool.query(
        `
        INSERT INTO users
        (
          name,
          email,
          password,
          phone,
          whatsapp,
          location,
          bio
        )
        VALUES
        (
          $1,
          $2,
          $3,
          $4,
          $5,
          $6,
          $7
        )
        RETURNING
          id,
          name,
          email,
          phone,
          whatsapp,
          photo_url,
          bio,
          location,
          role,
          status,
          verified,
          created_at
        `,
        [
          name,
          email,
          hashedPassword,
          phone,
          whatsapp,
          location,
          bio
        ]
      );


    const user =
      result.rows[0];


    res.status(201).json({

      statut: "ok",

      message:
        "Compte créé avec succès.",

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        whatsapp: user.whatsapp || "",
        photo_url: user.photo_url || "",
        bio: user.bio || "",
        location: user.location || "",
        role: user.role || "user",
        status: user.status || "active",
        verified: Boolean(user.verified),
        created_at: user.created_at
      }

    });


  } catch (error) {

    console.error(
      "REGISTER ERROR:",
      error
    );

    res.status(500).json({

      statut: "erreur",

      message:
        "Impossible de créer le compte."

    });

  }

});


// ============================================================
// END PART 2/10
// ============================================================

// ============================================================
// HELPY - PART 3/10
// LOGIN + USER PROFILE
// ============================================================


// ============================================================
// LOGIN
// ============================================================

app.post("/api/login", async (req, res) => {

  try {

    const email =
      normalizeEmail(req.body.email);

    const password =
      cleanText(req.body.password);


    if (!email || !password) {

      return res.status(400).json({
        statut: "erreur",
        message:
          "Email et mot de passe sont obligatoires."
      });

    }


    const result =
      await pool.query(
        `
        SELECT *
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
        `,
        [email]
      );


    if (result.rows.length === 0) {

      return res.status(401).json({
        statut: "erreur",
        message:
          "Compte introuvable."
      });

    }


    const user =
      result.rows[0];


    if (
      user.status &&
      user.status !== "active"
    ) {

      return res.status(403).json({
        statut: "erreur",
        message:
          "Ce compte n'est pas actif."
      });

    }


    const passwordValid =
      await bcrypt.compare(
        password,
        user.password
      );


    if (!passwordValid) {

      return res.status(401).json({
        statut: "erreur",
        message:
          "Mot de passe incorrect."
      });

    }


    res.json({

      statut: "ok",

      message:
        "Connexion réussie.",

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        whatsapp: user.whatsapp || "",
        photo_url: user.photo_url || "",
        bio: user.bio || "",
        location: user.location || "",
        role: user.role || "user",
        status: user.status || "active",
        verified: Boolean(user.verified),
        created_at: user.created_at
      }

    });


  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );

    res.status(500).json({

      statut: "erreur",

      message:
        "Impossible de se connecter."

    });

  }

});


// ============================================================
// GET CURRENT USER
// ============================================================

app.get("/api/me", async (req, res) => {

  try {

    const userId =
      getUserId(req);


    if (!userId) {

      return res.status(401).json({
        statut: "erreur",
        message:
          "Utilisateur non identifié."
      });

    }


    const result =
      await pool.query(
        `
        SELECT
          id,
          name,
          email,
          phone,
          whatsapp,
          photo_url,
          bio,
          location,
          role,
          status,
          verified,
          created_at
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [userId]
      );


    if (result.rows.length === 0) {

      return res.status(404).json({
        statut: "erreur",
        message:
          "Utilisateur introuvable."
      });

    }


    const user =
      result.rows[0];


    res.json({

      statut: "ok",

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        whatsapp: user.whatsapp || "",
        photo_url: user.photo_url || "",
        bio: user.bio || "",
        location: user.location || "",
        role: user.role || "user",
        status: user.status || "active",
        verified: Boolean(user.verified),
        created_at: user.created_at
      }

    });


  } catch (error) {

    console.error(
      "ME ERROR:",
      error
    );

    res.status(500).json({

      statut: "erreur",

      message:
        "Impossible de récupérer le compte."

    });

  }

});


// ============================================================
// GET PROFILE BY ID
// ============================================================

app.get("/api/profile/:id", async (req, res) => {

  try {

    const userId =
      Number(req.params.id);


    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {

      return res.status(400).json({
        statut: "erreur",
        message:
          "Identifiant utilisateur invalide."
      });

    }


    const result =
      await pool.query(
        `
        SELECT
          id,
          name,
          email,
          phone,
          whatsapp,
          photo_url,
          bio,
          location,
          role,
          status,
          verified,
          created_at
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [userId]
      );


    if (result.rows.length === 0) {

      return res.status(404).json({
        statut: "erreur",
        message:
          "Profil introuvable."
      });

    }


    const user =
      result.rows[0];


    res.json({

      statut: "ok",

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        whatsapp: user.whatsapp || "",
        photo_url: user.photo_url || "",
        bio: user.bio || "",
        location: user.location || "",
        role: user.role || "user",
        status: user.status || "active",
        verified: Boolean(user.verified),
        created_at: user.created_at
      }

    });


  } catch (error) {

    console.error(
      "PROFILE ERROR:",
      error
    );

    res.status(500).json({

      statut: "erreur",

      message:
        "Impossible de récupérer le profil."

    });

  }

});


// ============================================================
// UPDATE PROFILE
// ============================================================

app.put("/api/profile", async (req, res) => {

  try {

    const userId =
      getUserId(req);


    if (!userId) {

      return res.status(401).json({
        statut: "erreur",
        message:
          "Utilisateur non identifié."
      });

    }


    const name =
      cleanText(req.body.name);

    const phone =
      cleanText(req.body.phone);

    const whatsapp =
      cleanText(req.body.whatsapp);

    const photoUrl =
      cleanText(req.body.photo_url);

    const bio =
      cleanText(req.body.bio);

    const location =
      cleanText(req.body.location);


    const result =
      await pool.query(
        `
        UPDATE users
        SET
          name = COALESCE(
            NULLIF($1, ''),
            name
          ),
          phone = $2,
          whatsapp = $3,
          photo_url = $4,
          bio = $5,
          location = $6
        WHERE id = $7
        RETURNING
          id,
          name,
          email,
          phone,
          whatsapp,
                    photo_url,
          bio,
          location,
          role,
          status,
          verified,
          created_at
        FROM users
        WHERE id = $1
        LIMIT 1
        `,
        [userId]
      );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Utilisateur introuvable."
      });
    }

    const user = result.rows[0];

    res.json({
      statut: "ok",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        whatsapp: user.whatsapp || "",
        photo_url: user.photo_url || "",
        bio: user.bio || "",
        location: user.location || "",
        role: user.role || "user",
        status: user.status || "active",
        verified: Boolean(user.verified),
        created_at: user.created_at
      }
          }
    });

  } catch (error) {

    console.error("ME ERROR:", error);

    res.status(500).json({
      statut: "erreur",
      message: "Impossible de récupérer le compte."
    });

  }
});

// ============================================================
// HELPY - PART 4A
// PROFILE BY ID
// ============================================================

app.get("/api/profile/:id", async (req, res) => {

  try {

    const userId = Number(req.params.id);

    if (
      !Number.isInteger(userId) ||
      userId <= 0
    ) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant utilisateur invalide."
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        phone,
        whatsapp,
        photo_url,
        bio,
        location,
        role,
        status,
        verified,
        created_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (result.rows.length === 0) {

      return res.status(404).json({
        statut: "erreur",
        message: "Profil introuvable."
      });

    }

    const user = result.rows[0];

    res.json({
      statut: "ok",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        whatsapp: user.whatsapp || "",
        photo_url: user.photo_url || "",
        bio: user.bio || "",
        location: user.location || "",
        role: user.role || "user",
        status: user.status || "active",
        verified: Boolean(user.verified),
        created_at: user.created_at
      }
        });

  } catch (error) {

    console.error(
      "PROFILE ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message: "Impossible de récupérer le profil."
    });

  }

});

// ============================================================
// HELPY - PART 5A
// UPDATE PROFILE
// ============================================================

app.put("/api/profile", async (req, res) => {

  try {

    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        statut: "erreur",
        message: "Utilisateur non identifié."
      });
    }

    const name = cleanText(req.body.name);
    const phone = cleanText(req.body.phone);
    const whatsapp = cleanText(req.body.whatsapp);
    const photoUrl = cleanText(req.body.photo_url);
    const bio = cleanText(req.body.bio);
    const location = cleanText(req.body.location);

    const result = await pool.query(
      `
      UPDATE users
      SET
        name = COALESCE(NULLIF($1, ''), name),
        phone = $2,
        whatsapp = $3,
        photo_url = $4,
        bio = $5,
        location = $6
      WHERE id = $7
      RETURNING
        id,
        name,
        email,
        phone,
        whatsapp,
        photo_url,
        bio,
        location,
        role,
        status,
        verified,
        created_at
      `,
      [
        name,
        phone,
        whatsapp,
        photoUrl,
        bio,
        location,
        userId
      ]
    );

    if (result.rows.length === 0) {

      return res.status(404).json({
        statut: "erreur",
        message: "Utilisateur introuvable."
      });

    }

    const user = result.rows[0];

    res.json({
      statut: "ok",
      message: "Profil mis à jour.",
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone || "",
        whatsapp: user.whatsapp || "",
        photo_url: user.photo_url || "",
        bio: user.bio || "",
        location: user.location || "",
        role: user.role || "user",
        status: user.status || "active",
        verified: Boolean(user.verified),
        created_at: user.created_at
      }
    });

  } catch (error) {

    console.error(
      "UPDATE PROFILE ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message: "Impossible de modifier le profil."
    });

  }

});

// ============================================================
// HELPY - PART 6A
// PRODUCTS - LIST
// ============================================================

app.get("/api/products", async (req, res) => {

  try {

    const result = await pool.query(`
      SELECT
        p.id,
        p.user_id,
        p.business_id,
        p.title,
        p.description,
        p.price,
        p.currency,
        p.category,
        p.location,
        p.whatsapp,
        p.phone,
        p.image_url,
        p.quantity,
        p.status,
        p.created_at,

        u.name AS seller_name

      FROM products p

      LEFT JOIN users u
        ON u.id = p.user_id

      WHERE p.status = 'active'

      ORDER BY p.created_at DESC
    `);

    res.json({
      statut: "ok",
      produits: result.rows
    });

  } catch (error) {

    console.error(
      "GET PRODUCTS ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message: "Impossible de récupérer les produits."
    });

  }

});

// ============================================================
// HELPY - PART 6B
// PRODUCT DETAILS
// ============================================================

app.get("/api/products/:id", async (req, res) => {

  try {

    const productId = Number(req.params.id);

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant produit invalide."
      });
    }

    const result = await pool.query(
      `
      SELECT
        p.id,
        p.user_id,
        p.business_id,
        p.title,
        p.description,
        p.price,
        p.currency,
        p.category,
        p.location,
        p.whatsapp,
        p.phone,
        p.image_url,
        p.quantity,
        p.status,
        p.created_at,

        u.name AS seller_name,
        u.email AS seller_email

      FROM products p

      LEFT JOIN users u
        ON u.id = p.user_id

      WHERE p.id = $1
      LIMIT 1
      `,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Produit introuvable."
      });
    }

    res.json({
      statut: "ok",
      produit: result.rows[0]
    });

  } catch (error) {

    console.error(
      "GET PRODUCT ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message: "Impossible de récupérer le produit."
    });

  }

});

// ============================================================
// HELPY - PART 6C
// CREATE PRODUCT
// ============================================================

app.post("/api/products", async (req, res) => {

  try {

    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        statut: "erreur",
        message: "Utilisateur non identifié."
      });
    }

    const title = cleanText(req.body.title);
    const description = cleanText(req.body.description);
    const category = cleanText(req.body.category);
    const location = cleanText(req.body.location);
    const whatsapp = cleanText(req.body.whatsapp);
    const phone = cleanText(req.body.phone);
    const imageUrl = cleanText(req.body.image_url);
    const currency = cleanText(req.body.currency) || "HTG";

    const price = numberValue(
      req.body.price,
      0
    );

    const quantity = Math.max(
      1,
      Math.floor(
        numberValue(req.body.quantity, 1)
      )
    );

    const businessId =
      req.body.business_id
        ? Number(req.body.business_id)
        : null;

    if (!title) {
      return res.status(400).json({
        statut: "erreur",
        message: "Le titre du produit est obligatoire."
      });
    }

    if (!whatsapp && !phone) {
      return res.status(400).json({
        statut: "erreur",
        message: "Un numéro WhatsApp ou téléphone est obligatoire."
      });
    }

    const result = await pool.query(
      `
      INSERT INTO products
      (
        user_id,
        business_id,
        title,
        description,
        price,
        currency,
        category,
        location,
        whatsapp,
        phone,
        image_url,
        quantity,
        status
      )
      VALUES
      (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'active'
      )
      RETURNING *
      `,
      [
        userId,
        businessId,
        title,
        description,
        price,
        currency,
        category,
        location,
        whatsapp,
        phone,
        imageUrl,
        quantity
      ]
    );

    res.status(201).json({
      statut: "ok",
      message: "Produit créé avec succès.",
      produit: result.rows[0]
    });

  } catch (error) {

    console.error(
      "CREATE PRODUCT ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message: "Impossible de créer le produit."
    });

  }

});

// ============================================================
// HELPY - PART 6D
// UPDATE PRODUCT
// ============================================================

app.put("/api/products/:id", async (req, res) => {

  try {

    const userId = getUserId(req);
    const productId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        statut: "erreur",
        message: "Utilisateur non identifié."
      });
    }

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant produit invalide."
      });
    }

    const title = cleanText(req.body.title);
    const description = cleanText(req.body.description);
    const category = cleanText(req.body.category);
    const location = cleanText(req.body.location);
    const whatsapp = cleanText(req.body.whatsapp);
    const phone = cleanText(req.body.phone);
    const imageUrl = cleanText(req.body.image_url);
    const currency = cleanText(req.body.currency) || "HTG";

    const price = numberValue(req.body.price, 0);

    const quantity = Math.max(
      1,
      Math.floor(numberValue(req.body.quantity, 1))
    );

    const result = await pool.query(
      `
      UPDATE products
      SET
        title = $1,
        description = $2,
        price = $3,
        currency = $4,
        category = $5,
        location = $6,
        whatsapp = $7,
        phone = $8,
        image_url = $9,
        quantity = $10
      WHERE id = $11
        AND user_id = $12
      RETURNING *
      `,
      [
        title,
        description,
        price,
        currency,
        category,
        location,
        whatsapp,
        phone,
        imageUrl,
        quantity,
        productId,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Produit introuvable ou non autorisé."
      });
    }

    res.json({
      statut: "ok",
      message: "Produit modifié avec succès.",
      produit: result.rows[0]
    });

  } catch (error) {

    console.error(
      "UPDATE PRODUCT ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message: "Impossible de modifier le produit."
    });

  }

});

// ============================================================
// HELPY - PART 6E
// DELETE PRODUCT
// ============================================================

app.delete("/api/products/:id", async (req, res) => {

  try {

    const userId = getUserId(req);
    const productId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        statut: "erreur",
        message: "Utilisateur non identifié."
      });
    }

    if (!Number.isInteger(productId) || productId <= 0) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant produit invalide."
      });
    }

    const result = await pool.query(
      `
      DELETE FROM products
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
      [productId, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Produit introuvable ou non autorisé."
      });
    }

    res.json({
      statut: "ok",
      message: "Produit supprimé avec succès."
    });

  } catch (error) {

    console.error(
      "DELETE PRODUCT ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message: "Impossible de supprimer le produit."
    });

  }

});

// ============================================================
// PART 7A - SERVICES
// GET ALL SERVICES
// ============================================================

app.get("/api/services", async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
        s.id,
        s.user_id,
        s.business_id,
        s.title,
        s.description,
        s.price,
        s.currency,
        s.category,
        s.location,
        s.whatsapp,
        s.phone,
        s.image_url,
        s.status,
        s.created_at,
        u.name AS provider_name
      FROM services s
      LEFT JOIN users u
        ON u.id = s.user_id
      WHERE s.status = 'active'
      ORDER BY s.created_at DESC
    `);

    res.json({
      statut: "ok",
      services: result.rows
    });

  } catch (error) {

    console.error(
      "GET SERVICES ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message: "Impossible de récupérer les services."
    });

  }
});


// ============================================================
// GET ONE SERVICE
// ============================================================

app.get("/api/services/:id", async (req, res) => {
  try {

    const serviceId = Number(req.params.id);

    if (
      !Number.isInteger(serviceId) ||
      serviceId <= 0
    ) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant service invalide."
      });
    }

    const result = await pool.query(
      `
      SELECT
        s.id,
        s.user_id,
        s.business_id,
        s.title,
        s.description,
        s.price,
        s.currency,
        s.category,
        s.location,
        s.whatsapp,
        s.phone,
        s.image_url,
        s.status,
        s.created_at,
        u.name AS provider_name,
        u.email AS provider_email
      FROM services s
      LEFT JOIN users u
        ON u.id = s.user_id
      WHERE s.id = $1
      LIMIT 1
      `,
      [serviceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Service introuvable."
      });
    }

    res.json({
      statut: "ok",
      service: result.rows[0]
    });

  } catch (error) {

    console.error(
      "GET SERVICE ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message: "Impossible de récupérer le service."
    });

  }
});

// ============================================================
// PART 7B - CREATE SERVICE
// ============================================================

app.post("/api/services", async (req, res) => {
  try {

    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        statut: "erreur",
        message: "Utilisateur non identifié."
      });
    }

    const title = cleanText(req.body.title);
    const description = cleanText(req.body.description);
    const category = cleanText(req.body.category);
    const location = cleanText(req.body.location);
    const whatsapp = cleanText(req.body.whatsapp);
    const phone = cleanText(req.body.phone);
    const imageUrl = cleanText(req.body.image_url);
    const currency =
      cleanText(req.body.currency) || "HTG";

    const price = numberValue(
      req.body.price,
      0
    );

    const businessId =
      req.body.business_id
        ? Number(req.body.business_id)
        : null;

    if (!title) {
      return res.status(400).json({
        statut: "erreur",
        message: "Le titre du service est obligatoire."
      });
    }

    if (!whatsapp && !phone) {
      return res.status(400).json({
        statut: "erreur",
        message:
          "Un numéro WhatsApp ou téléphone est obligatoire."
      });
    }

    const result = await pool.query(
      `
      INSERT INTO services
      (
        user_id,
        business_id,
        title,
        description,
        price,
        currency,
        category,
        location,
        whatsapp,
        phone,
        image_url,
        status
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        'active'
      )
      RETURNING *
      `,
      [
        userId,
        businessId,
        title,
        description,
        price,
        currency,
        category,
        location,
        whatsapp,
        phone,
        imageUrl
      ]
    );

    res.status(201).json({
      statut: "ok",
      message: "Service créé avec succès.",
      service: result.rows[0]
    });

  } catch (error) {

    console.error(
      "CREATE SERVICE ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message: "Impossible de créer le service."
    });

  }
});

// ============================================================
// PART 7C - UPDATE SERVICE
// ============================================================

app.put("/api/services/:id", async (req, res) => {
  try {

    const userId = getUserId(req);
    const serviceId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        statut: "erreur",
        message: "Utilisateur non identifié."
      });
    }

    if (
      !Number.isInteger(serviceId) ||
      serviceId <= 0
    ) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant service invalide."
      });
    }

    const title = cleanText(req.body.title);
    const description = cleanText(req.body.description);
    const category = cleanText(req.body.category);
    const location = cleanText(req.body.location);
    const whatsapp = cleanText(req.body.whatsapp);
    const phone = cleanText(req.body.phone);
    const imageUrl = cleanText(req.body.image_url);

    const currency =
      cleanText(req.body.currency) || "HTG";

    const price = numberValue(
      req.body.price,
      0
    );

    const result = await pool.query(
      `
      UPDATE services
      SET
        title = $1,
        description = $2,
        price = $3,
        currency = $4,
        category = $5,
        location = $6,
        whatsapp = $7,
        phone = $8,
        image_url = $9
      WHERE id = $10
        AND user_id = $11
      RETURNING *
      `,
      [
        title,
        description,
        price,
        currency,
        category,
        location,
        whatsapp,
        phone,
        imageUrl,
        serviceId,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message:
          "Service introuvable ou non autorisé."
      });
    }

    res.json({
      statut: "ok",
      message: "Service modifié avec succès.",
      service: result.rows[0]
    });

  } catch (error) {

    console.error(
      "UPDATE SERVICE ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message: "Impossible de modifier le service."
    });

  }
});

// ============================================================
// PART 7D - DELETE SERVICE
// ============================================================

app.delete("/api/services/:id", async (req, res) => {
  try {

    const userId = getUserId(req);
    const serviceId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        statut: "erreur",
        message: "Utilisateur non identifié."
      });
    }

    if (
      !Number.isInteger(serviceId) ||
      serviceId <= 0
    ) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant service invalide."
      });
    }

    const result = await pool.query(
      `
      DELETE FROM services
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
      [
        serviceId,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message:
          "Service introuvable ou non autorisé."
      });
    }

    res.json({
      statut: "ok",
      message: "Service supprimé avec succès."
    });

  } catch (error) {

    console.error(
      "DELETE SERVICE ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de supprimer le service."
    });

  }
});

// ============================================================
// PART 8A - BUSINESSES / ENTREPRISES
// GET ALL BUSINESSES
// ============================================================

app.get("/api/businesses", async (req, res) => {
  try {

    const result = await pool.query(`
      SELECT
        b.id,
        b.user_id,
        b.name,
        b.category,
        b.description,
        b.location,
        b.phone,
        b.whatsapp,
        b.image_url,
        b.website,
        b.status,
        b.created_at,
        u.name AS owner_name
      FROM businesses b
      LEFT JOIN users u
        ON u.id = b.user_id
      WHERE b.status = 'active'
      ORDER BY b.created_at DESC
    `);

    res.json({
      statut: "ok",
      entreprises: result.rows
    });

  } catch (error) {

    console.error(
      "GET BUSINESSES ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de récupérer les entreprises."
    });

  }
});


// ============================================================
// GET ONE BUSINESS
// ============================================================

app.get("/api/businesses/:id", async (req, res) => {
  try {

    const businessId = Number(req.params.id);

    if (
      !Number.isInteger(businessId) ||
      businessId <= 0
    ) {
      return res.status(400).json({
        statut: "erreur",
        message:
          "Identifiant entreprise invalide."
      });
    }

    const result = await pool.query(
      `
      SELECT
        b.id,
        b.user_id,
        b.name,
        b.category,
        b.description,
        b.location,
        b.phone,
        b.whatsapp,
        b.image_url,
        b.website,
        b.status,
        b.created_at,
        u.name AS owner_name,
        u.email AS owner_email
      FROM businesses b
      LEFT JOIN users u
        ON u.id = b.user_id
      WHERE b.id = $1
      LIMIT 1
      `,
      [businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message:
          "Entreprise introuvable."
      });
    }

    res.json({
      statut: "ok",
      entreprise: result.rows[0]
    });

  } catch (error) {

    console.error(
      "GET BUSINESS ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de récupérer l'entreprise."
    });

  }
});

// ============================================================
// PART 8B - CREATE BUSINESS / ENTREPRISE
// ============================================================

app.post("/api/businesses", async (req, res) => {
  try {

    const userId = getUserId(req);

    if (!userId) {
      return res.status(401).json({
        statut: "erreur",
        message: "Utilisateur non identifié."
      });
    }

    const name = cleanText(req.body.name);
    const category = cleanText(req.body.category);
    const description = cleanText(req.body.description);
    const location = cleanText(req.body.location);
    const phone = cleanText(req.body.phone);
    const whatsapp = cleanText(req.body.whatsapp);
    const imageUrl = cleanText(req.body.image_url);
    const website = cleanText(req.body.website);

    if (!name) {
      return res.status(400).json({
        statut: "erreur",
        message:
          "Le nom de l'entreprise est obligatoire."
      });
    }

    if (!whatsapp && !phone) {
      return res.status(400).json({
        statut: "erreur",
        message:
          "Un numéro WhatsApp ou téléphone est obligatoire."
      });
    }

    const result = await pool.query(
      `
      INSERT INTO businesses
      (
        user_id,
        name,
        category,
        description,
        location,
        phone,
        whatsapp,
        image_url,
        website,
        status
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        'active'
      )
      RETURNING *
      `,
      [
        userId,
        name,
        category,
        description,
        location,
        phone,
        whatsapp,
        imageUrl,
        website
      ]
    );

    res.status(201).json({
      statut: "ok",
      message:
        "Entreprise créée avec succès.",
      entreprise: result.rows[0]
    });

  } catch (error) {

    console.error(
      "CREATE BUSINESS ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de créer l'entreprise."
    });

  }
});

// ============================================================
// PART 8C - UPDATE BUSINESS / ENTREPRISE
// ============================================================

app.put("/api/businesses/:id", async (req, res) => {
  try {

    const userId = getUserId(req);
    const businessId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        statut: "erreur",
        message: "Utilisateur non identifié."
      });
    }

    if (
      !Number.isInteger(businessId) ||
      businessId <= 0
    ) {
      return res.status(400).json({
        statut: "erreur",
        message:
          "Identifiant entreprise invalide."
      });
    }

    const name = cleanText(req.body.name);
    const category = cleanText(req.body.category);
    const description = cleanText(req.body.description);
    const location = cleanText(req.body.location);
    const phone = cleanText(req.body.phone);
    const whatsapp = cleanText(req.body.whatsapp);
    const imageUrl = cleanText(req.body.image_url);
    const website = cleanText(req.body.website);

    if (!name) {
      return res.status(400).json({
        statut: "erreur",
        message:
          "Le nom de l'entreprise est obligatoire."
      });
    }

    if (!whatsapp && !phone) {
      return res.status(400).json({
        statut: "erreur",
        message:
          "Un numéro WhatsApp ou téléphone est obligatoire."
      });
    }

    const result = await pool.query(
      `
      UPDATE businesses
      SET
        name = $1,
        category = $2,
        description = $3,
        location = $4,
        phone = $5,
        whatsapp = $6,
        image_url = $7,
        website = $8
      WHERE id = $9
        AND user_id = $10
      RETURNING *
      `,
      [
        name,
        category,
        description,
        location,
        phone,
        whatsapp,
        imageUrl,
        website,
        businessId,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message:
          "Entreprise introuvable ou non autorisée."
      });
    }

    res.json({
      statut: "ok",
      message:
        "Entreprise modifiée avec succès.",
      entreprise: result.rows[0]
    });

  } catch (error) {

    console.error(
      "UPDATE BUSINESS ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de modifier l'entreprise."
    });

  }
});

// ============================================================
// PART 8D - DELETE BUSINESS / ENTREPRISE
// ============================================================

app.delete("/api/businesses/:id", async (req, res) => {
  try {

    const userId = getUserId(req);
    const businessId = Number(req.params.id);

    if (!userId) {
      return res.status(401).json({
        statut: "erreur",
        message: "Utilisateur non identifié."
      });
    }

    if (
      !Number.isInteger(businessId) ||
      businessId <= 0
    ) {
      return res.status(400).json({
        statut: "erreur",
        message:
          "Identifiant entreprise invalide."
      });
    }

    const result = await pool.query(
      `
      DELETE FROM businesses
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
      [
        businessId,
        userId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message:
          "Entreprise introuvable ou non autorisée."
      });
    }

    res.json({
      statut: "ok",
      message:
        "Entreprise supprimée avec succès."
    });

  } catch (error) {

    console.error(
      "DELETE BUSINESS ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de supprimer l'entreprise."
    });

  }
});

// ============================================================
// PART 9A - GLOBAL SEARCH
// ============================================================

app.get("/api/search", async (req, res) => {
  try {

    const q = cleanText(req.query.q);

    if (!q) {
      return res.json({
        statut: "ok",
        resultats: []
      });
    }

    const search = `%${q}%`;

    const products = await pool.query(
      `
      SELECT
        p.id,
        p.title,
        p.description,
        p.price,
        p.currency,
        p.category,
        p.location,
        p.image_url,
        'product' AS type
      FROM products p
      WHERE p.status = 'active'
        AND (
          p.title ILIKE $1
          OR p.description ILIKE $1
          OR p.category ILIKE $1
          OR p.location ILIKE $1
        )
      ORDER BY p.created_at DESC
      LIMIT 30
      `,
      [search]
    );

    const services = await pool.query(
      `
      SELECT
        s.id,
        s.title,
        s.description,
        s.price,
        s.currency,
        s.category,
        s.location,
        s.image_url,
        'service' AS type
      FROM services s
      WHERE s.status = 'active'
        AND (
          s.title ILIKE $1
          OR s.description ILIKE $1
          OR s.category ILIKE $1
          OR s.location ILIKE $1
        )
      ORDER BY s.created_at DESC
      LIMIT 30
      `,
      [search]
    );

    const businesses = await pool.query(
      `
      SELECT
        b.id,
        b.name AS title,
        b.description,
        b.category,
        b.location,
        b.image_url,
        'business' AS type
      FROM businesses b
      WHERE b.status = 'active'
        AND (
          b.name ILIKE $1
          OR b.description ILIKE $1
          OR b.category ILIKE $1
          OR b.location ILIKE $1
        )
      ORDER BY b.created_at DESC
      LIMIT 30
      `,
      [search]
    );

    res.json({
      statut: "ok",
      resultats: [
        ...products.rows,
        ...services.rows,
        ...businesses.rows
      ]
    });

  } catch (error) {

    console.error(
      "GLOBAL SEARCH ERROR:",
      error
    );

    res.status(500).json({
      statut: "erreur",
      message:
        "Impossible d'effectuer la recherche."
    });

  }
});
res.status(500).json({
  statut: "erreur",
  message:
    "Impossible d'effectuer la recherche."
});

  }
});

// ==================================================
// PART 9B — NOTIFICATIONS HELPY
// ==================================================

app.get("/api/notifications/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant utilisateur invalide."
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        user_id,
        type,
        title,
        message,
        is_read,
        created_at
      FROM notifications
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
      `,
      [userId]
    );

    return res.json({
      statut: "ok",
      notifications: result.rows
    });

  } catch (error) {
    console.error("Erreur notifications :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de récupérer les notifications."
    });
  }
});


// ==================================================
// MARQUER UNE NOTIFICATION COMME LUE
// ==================================================

app.put("/api/notifications/:id/read", async (req, res) => {
  try {
    const notificationId = Number(req.params.id);

    if (!notificationId || Number.isNaN(notificationId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant de notification invalide."
      });
    }

    const result = await pool.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE id = $1
      RETURNING
        id,
        user_id,
        type,
        title,
        message,
        is_read,
        created_at
      `,
      [notificationId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Notification introuvable."
      });
    }

    return res.json({
      statut: "ok",
      message: "Notification marquée comme lue.",
      notification: result.rows[0]
    });

  } catch (error) {
    console.error("Erreur lecture notification :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de modifier la notification."
    });
  }
});


// ==================================================
// MARQUER TOUTES LES NOTIFICATIONS COMME LUES
// ==================================================

app.put("/api/notifications/user/:userId/read-all", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant utilisateur invalide."
      });
    }

    await pool.query(
      `
      UPDATE notifications
      SET is_read = TRUE
      WHERE user_id = $1
      `,
      [userId]
    );

    return res.json({
      statut: "ok",
      message: "Toutes les notifications ont été marquées comme lues."
    });

  } catch (error) {
    console.error("Erreur lecture notifications :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de modifier les notifications."
    });
  }
});


// ==================================================
// COMPTER LES NOTIFICATIONS NON LUES
// ==================================================

app.get("/api/notifications/:userId/unread-count", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant utilisateur invalide."
      });
    }

    const result = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM notifications
      WHERE user_id = $1
        AND is_read = FALSE
      `,
      [userId]
    );

    return res.json({
      statut: "ok",
      unread: Number(result.rows[0].count)
    });

  } catch (error) {
    console.error("Erreur compteur notifications :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de compter les notifications."
    });
  }
});

// ==================================================
// PART 9C — FAVORIS HELPY
// ==================================================

app.get("/api/favorites/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant utilisateur invalide."
      });
    }

    const result = await pool.query(
      `
      SELECT
        f.id,
        f.user_id,
        f.product_id,
        f.created_at,
        p.name,
        p.description,
        p.price,
        p.category,
        p.location,
        p.image_url,
        p.status
      FROM favorites f
      INNER JOIN products p
        ON p.id = f.product_id
      WHERE f.user_id = $1
      ORDER BY f.created_at DESC
      `,
      [userId]
    );

    return res.json({
      statut: "ok",
      favoris: result.rows
    });

  } catch (error) {
    console.error("Erreur récupération favoris :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de récupérer les favoris."
    });
  }
});


// ==================================================
// AJOUTER UN PRODUIT AUX FAVORIS
// ==================================================

app.post("/api/favorites", async (req, res) => {
  try {
    const userId = Number(req.body.user_id);
    const productId = Number(req.body.product_id);

    if (
      !userId ||
      Number.isNaN(userId) ||
      !productId ||
      Number.isNaN(productId)
    ) {
      return res.status(400).json({
        statut: "erreur",
        message: "Utilisateur ou produit invalide."
      });
    }

    const product = await pool.query(
      `
      SELECT id
      FROM products
      WHERE id = $1
        AND status = 'active'
      `,
      [productId]
    );

    if (product.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Produit introuvable."
      });
    }

    const existing = await pool.query(
      `
      SELECT id
      FROM favorites
      WHERE user_id = $1
        AND product_id = $2
      `,
      [userId, productId]
    );

    if (existing.rows.length > 0) {
      return res.json({
        statut: "ok",
        message: "Produit déjà présent dans les favoris.",
        favorite_id: existing.rows[0].id
      });
    }

    const result = await pool.query(
      `
      INSERT INTO favorites (
        user_id,
        product_id
      )
      VALUES ($1, $2)
      RETURNING
        id,
        user_id,
        product_id,
        created_at
      `,
      [userId, productId]
    );

    return res.status(201).json({
      statut: "ok",
      message: "Produit ajouté aux favoris.",
      favori: result.rows[0]
    });

  } catch (error) {
    console.error("Erreur ajout favori :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible d'ajouter le produit aux favoris."
    });
  }
});


// ==================================================
// SUPPRIMER UN FAVORI
// ==================================================

app.delete("/api/favorites/:userId/:productId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const productId = Number(req.params.productId);

    if (
      !userId ||
      Number.isNaN(userId) ||
      !productId ||
      Number.isNaN(productId)
    ) {
      return res.status(400).json({
        statut: "erreur",
        message: "Utilisateur ou produit invalide."
      });
    }

    const result = await pool.query(
      `
      DELETE FROM favorites
      WHERE user_id = $1
        AND product_id = $2
      RETURNING id
      `,
      [userId, productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Favori introuvable."
      });
    }

    return res.json({
      statut: "ok",
      message: "Produit retiré des favoris."
    });

  } catch (error) {
    console.error("Erreur suppression favori :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de supprimer le favori."
    });
  }
});


// ==================================================
// VÉRIFIER SI UN PRODUIT EST DANS LES FAVORIS
// ==================================================

app.get("/api/favorites/:userId/:productId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);
    const productId = Number(req.params.productId);

    if (
      !userId ||
      Number.isNaN(userId) ||
      !productId ||
      Number.isNaN(productId)
    ) {
      return res.status(400).json({
        statut: "erreur",
        message: "Utilisateur ou produit invalide."
      });
    }

    const result = await pool.query(
      `
      SELECT id
      FROM favorites
      WHERE user_id = $1
        AND product_id = $2
      `,
      [userId, productId]
    );

    return res.json({
      statut: "ok",
      favori: result.rows.length > 0,
      favorite_id:
        result.rows.length > 0
          ? result.rows[0].id
          : null
    });

  } catch (error) {
    console.error("Erreur vérification favori :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de vérifier le favori."
    });
  }
});

// ==================================================
// PART 9D — MESSAGERIE HELPY
// ==================================================

app.get("/api/messages/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant utilisateur invalide."
      });
    }

    const result = await pool.query(
      `
      SELECT
        m.id,
        m.sender_id,
        m.receiver_id,
        m.message,
        m.is_read,
        m.created_at,
        sender.name AS sender_name,
        receiver.name AS receiver_name
      FROM messages m
      LEFT JOIN users sender
        ON sender.id = m.sender_id
      LEFT JOIN users receiver
        ON receiver.id = m.receiver_id
      WHERE m.sender_id = $1
         OR m.receiver_id = $1
      ORDER BY m.created_at ASC
      LIMIT 500
      `,
      [userId]
    );

    return res.json({
      statut: "ok",
      messages: result.rows
    });

  } catch (error) {
    console.error("Erreur récupération messages :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de récupérer les messages."
    });
  }
});


// ==================================================
// RÉCUPÉRER UNE CONVERSATION ENTRE DEUX UTILISATEURS
// ==================================================

app.get(
  "/api/messages/:userId/with/:otherUserId",
  async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const otherUserId = Number(req.params.otherUserId);

      if (
        !userId ||
        Number.isNaN(userId) ||
        !otherUserId ||
        Number.isNaN(otherUserId)
      ) {
        return res.status(400).json({
          statut: "erreur",
          message: "Identifiant utilisateur invalide."
        });
      }

      const result = await pool.query(
        `
        SELECT
          m.id,
          m.sender_id,
          m.receiver_id,
          m.message,
          m.is_read,
          m.created_at,
          sender.name AS sender_name,
          receiver.name AS receiver_name
        FROM messages m
        LEFT JOIN users sender
          ON sender.id = m.sender_id
        LEFT JOIN users receiver
          ON receiver.id = m.receiver_id
        WHERE
          (
            m.sender_id = $1
            AND m.receiver_id = $2
          )
          OR
          (
            m.sender_id = $2
            AND m.receiver_id = $1
          )
        ORDER BY m.created_at ASC
        `,
        [userId, otherUserId]
      );

      return res.json({
        statut: "ok",
        messages: result.rows
      });

    } catch (error) {
      console.error("Erreur conversation :", error);

      return res.status(500).json({
        statut: "erreur",
        message: "Impossible de récupérer la conversation."
      });
    }
  }
);


// ==================================================
// ENVOYER UN MESSAGE
// ==================================================

app.post("/api/messages", async (req, res) => {
  try {
    const senderId = Number(req.body.sender_id);
    const receiverId = Number(req.body.receiver_id);
    const message = String(req.body.message || "").trim();

    if (
      !senderId ||
      Number.isNaN(senderId) ||
      !receiverId ||
      Number.isNaN(receiverId)
    ) {
      return res.status(400).json({
        statut: "erreur",
        message: "Expéditeur ou destinataire invalide."
      });
    }

    if (senderId === receiverId) {
      return res.status(400).json({
        statut: "erreur",
        message: "Vous ne pouvez pas vous envoyer un message."
      });
    }

    if (!message) {
      return res.status(400).json({
        statut: "erreur",
        message: "Le message ne peut pas être vide."
      });
    }

    if (message.length > 5000) {
      return res.status(400).json({
        statut: "erreur",
        message: "Le message est trop long."
      });
    }

    const users = await pool.query(
      `
      SELECT id
      FROM users
      WHERE id = ANY($1::int[])
      `,
      [[senderId, receiverId]]
    );

    if (users.rows.length !== 2) {
      return res.status(404).json({
        statut: "erreur",
        message: "Utilisateur introuvable."
      });
    }

    const result = await pool.query(
      `
      INSERT INTO messages (
        sender_id,
        receiver_id,
        message,
        is_read
      )
      VALUES ($1, $2, $3, FALSE)
      RETURNING
        id,
        sender_id,
        receiver_id,
        message,
        is_read,
        created_at
      `,
      [senderId, receiverId, message]
    );

    return res.status(201).json({
      statut: "ok",
      message: "Message envoyé.",
      data: result.rows[0]
    });

  } catch (error) {
    console.error("Erreur envoi message :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible d'envoyer le message."
    });
  }
});


// ==================================================
// MARQUER LES MESSAGES COMME LUS
// ==================================================

app.put(
  "/api/messages/:userId/with/:otherUserId/read",
  async (req, res) => {
    try {
      const userId = Number(req.params.userId);
      const otherUserId = Number(req.params.otherUserId);

      if (
        !userId ||
        Number.isNaN(userId) ||
        !otherUserId ||
        Number.isNaN(otherUserId)
      ) {
        return res.status(400).json({
          statut: "erreur",
          message: "Identifiant utilisateur invalide."
        });
      }

      await pool.query(
        `
        UPDATE messages
        SET is_read = TRUE
        WHERE sender_id = $2
          AND receiver_id = $1
          AND is_read = FALSE
        `,
        [userId, otherUserId]
      );

      return res.json({
        statut: "ok",
        message: "Messages marqués comme lus."
      });

    } catch (error) {
      console.error("Erreur lecture messages :", error);

      return res.status(500).json({
        statut: "erreur",
        message: "Impossible de marquer les messages comme lus."
      });
    }
  }
);


// ==================================================
// COMPTER LES MESSAGES NON LUS
// ==================================================

app.get("/api/messages/:userId/unread-count", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant utilisateur invalide."
      });
    }

    const result = await pool.query(
      `
      SELECT COUNT(*) AS count
      FROM messages
      WHERE receiver_id = $1
        AND is_read = FALSE
      `,
      [userId]
    );

    return res.json({
      statut: "ok",
      unread: Number(result.rows[0].count)
    });

  } catch (error) {
    console.error("Erreur compteur messages :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de compter les messages non lus."
    });
  }
});

// ==================================================
// PART 9E — ÉVALUATIONS / REVIEWS HELPY
// ==================================================

app.get("/api/reviews/user/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant utilisateur invalide."
      });
    }

    const result = await pool.query(
      `
      SELECT
        r.id,
        r.reviewer_id,
        r.reviewed_user_id,
        r.rating,
        r.comment,
        r.created_at,
        reviewer.name AS reviewer_name
      FROM reviews r
      LEFT JOIN users reviewer
        ON reviewer.id = r.reviewer_id
      WHERE r.reviewed_user_id = $1
      ORDER BY r.created_at DESC
      LIMIT 200
      `,
      [userId]
    );

    return res.json({
      statut: "ok",
      evaluations: result.rows
    });

  } catch (error) {
    console.error("Erreur récupération évaluations :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de récupérer les évaluations."
    });
  }
});


// ==================================================
// AJOUTER UNE ÉVALUATION
// ==================================================

app.post("/api/reviews", async (req, res) => {
  try {
    const reviewerId = Number(req.body.reviewer_id);
    const reviewedUserId = Number(req.body.reviewed_user_id);
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "").trim();

    if (
      !reviewerId ||
      Number.isNaN(reviewerId) ||
      !reviewedUserId ||
      Number.isNaN(reviewedUserId)
    ) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant utilisateur invalide."
      });
    }

    if (reviewerId === reviewedUserId) {
      return res.status(400).json({
        statut: "erreur",
        message: "Vous ne pouvez pas évaluer votre propre compte."
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        statut: "erreur",
        message: "La note doit être comprise entre 1 et 5."
      });
    }

    if (comment.length > 2000) {
      return res.status(400).json({
        statut: "erreur",
        message: "Le commentaire est trop long."
      });
    }

    const users = await pool.query(
      `
      SELECT id
      FROM users
      WHERE id = ANY($1::int[])
      `,
      [[reviewerId, reviewedUserId]]
    );

    if (users.rows.length !== 2) {
      return res.status(404).json({
        statut: "erreur",
        message: "Utilisateur introuvable."
      });
    }

    const existing = await pool.query(
      `
      SELECT id
      FROM reviews
      WHERE reviewer_id = $1
        AND reviewed_user_id = $2
      `,
      [reviewerId, reviewedUserId]
    );

    if (existing.rows.length > 0) {
      return res.status(409).json({
        statut: "erreur",
        message: "Vous avez déjà évalué cet utilisateur."
      });
    }

    const result = await pool.query(
      `
      INSERT INTO reviews (
        reviewer_id,
        reviewed_user_id,
        rating,
        comment
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        reviewer_id,
        reviewed_user_id,
        rating,
        comment,
        created_at
      `,
      [
        reviewerId,
        reviewedUserId,
        rating,
        comment || null
      ]
    );

    return res.status(201).json({
      statut: "ok",
      message: "Évaluation enregistrée.",
      evaluation: result.rows[0]
    });

  } catch (error) {
    console.error("Erreur ajout évaluation :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible d'enregistrer l'évaluation."
    });
  }
});


// ==================================================
// MODIFIER UNE ÉVALUATION
// ==================================================

app.put("/api/reviews/:id", async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    const reviewerId = Number(req.body.reviewer_id);
    const rating = Number(req.body.rating);
    const comment = String(req.body.comment || "").trim();

    if (!reviewId || Number.isNaN(reviewId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant d'évaluation invalide."
      });
    }

    if (!reviewerId || Number.isNaN(reviewerId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant utilisateur invalide."
      });
    }

    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({
        statut: "erreur",
        message: "La note doit être comprise entre 1 et 5."
      });
    }

    if (comment.length > 2000) {
      return res.status(400).json({
        statut: "erreur",
        message: "Le commentaire est trop long."
      });
    }

    const result = await pool.query(
      `
      UPDATE reviews
      SET
        rating = $1,
        comment = $2
      WHERE id = $3
        AND reviewer_id = $4
      RETURNING
        id,
        reviewer_id,
        reviewed_user_id,
        rating,
        comment,
        created_at
      `,
      [
        rating,
        comment || null,
        reviewId,
        reviewerId
      ]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Évaluation introuvable ou non autorisée."
      });
    }

    return res.json({
      statut: "ok",
      message: "Évaluation modifiée.",
      evaluation: result.rows[0]
    });

  } catch (error) {
    console.error("Erreur modification évaluation :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de modifier l'évaluation."
    });
  }
});


// ==================================================
// SUPPRIMER UNE ÉVALUATION
// ==================================================

app.delete("/api/reviews/:id", async (req, res) => {
  try {
    const reviewId = Number(req.params.id);
    const reviewerId = Number(req.body.reviewer_id);

    if (!reviewId || Number.isNaN(reviewId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant d'évaluation invalide."
      });
    }

    if (!reviewerId || Number.isNaN(reviewerId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant utilisateur invalide."
      });
    }

    const result = await pool.query(
      `
      DELETE FROM reviews
      WHERE id = $1
        AND reviewer_id = $2
      RETURNING id
      `,
      [reviewId, reviewerId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Évaluation introuvable ou non autorisée."
      });
    }

    return res.json({
      statut: "ok",
      message: "Évaluation supprimée."
    });

  } catch (error) {
    console.error("Erreur suppression évaluation :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de supprimer l'évaluation."
    });
  }
});


// ==================================================
// MOYENNE DES ÉVALUATIONS D'UN UTILISATEUR
// ==================================================

app.get("/api/reviews/user/:userId/summary", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant utilisateur invalide."
      });
    }

    const result = await pool.query(
      `
      SELECT
        COUNT(*)::int AS total_reviews,
        COALESCE(ROUND(AVG(rating)::numeric, 2), 0) AS average_rating,
        COUNT(*) FILTER (WHERE rating = 5)::int AS five_stars,
        COUNT(*) FILTER (WHERE rating = 4)::int AS four_stars,
        COUNT(*) FILTER (WHERE rating = 3)::int AS three_stars,
        COUNT(*) FILTER (WHERE rating = 2)::int AS two_stars,
        COUNT(*) FILTER (WHERE rating = 1)::int AS one_star
      FROM reviews
      WHERE reviewed_user_id = $1
      `,
      [userId]
    );

    return res.json({
      statut: "ok",
      resume: result.rows[0]
    });

  } catch (error) {
    console.error("Erreur résumé évaluations :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de calculer la moyenne des évaluations."
    });
  }
});

// ==================================================
// PART 9F — SIGNALEMENTS / PLAINTES HELPY
// ==================================================

app.post("/api/reports", async (req, res) => {
  try {
    const reporterId = Number(req.body.reporter_id);
    const reportedUserId = req.body.reported_user_id
      ? Number(req.body.reported_user_id)
      : null;

    const productId = req.body.product_id
      ? Number(req.body.product_id)
      : null;

    const serviceId = req.body.service_id
      ? Number(req.body.service_id)
      : null;

    const businessId = req.body.business_id
      ? Number(req.body.business_id)
      : null;

    const type = String(req.body.type || "").trim();
    const reason = String(req.body.reason || "").trim();
    const description = String(req.body.description || "").trim();

    if (!reporterId || Number.isNaN(reporterId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant du signalement invalide."
      });
    }

    if (!type) {
      return res.status(400).json({
        statut: "erreur",
        message: "Le type de signalement est obligatoire."
      });
    }

    if (!reason) {
      return res.status(400).json({
        statut: "erreur",
        message: "La raison du signalement est obligatoire."
      });
    }

    if (description.length > 5000) {
      return res.status(400).json({
        statut: "erreur",
        message: "La description est trop longue."
      });
    }

    const reporter = await pool.query(
      `
      SELECT id
      FROM users
      WHERE id = $1
      `,
      [reporterId]
    );

    if (reporter.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Utilisateur signalant introuvable."
      });
    }

    if (reportedUserId !== null) {
      const reportedUser = await pool.query(
        `
        SELECT id
        FROM users
        WHERE id = $1
        `,
        [reportedUserId]
      );

      if (reportedUser.rows.length === 0) {
        return res.status(404).json({
          statut: "erreur",
          message: "Utilisateur signalé introuvable."
        });
      }
    }

    const result = await pool.query(
      `
      INSERT INTO reports (
        reporter_id,
        reported_user_id,
        product_id,
        service_id,
        business_id,
        type,
        reason,
        description,
        status
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        'pending'
      )
      RETURNING
        id,
        reporter_id,
        reported_user_id,
        product_id,
        service_id,
        business_id,
        type,
        reason,
        description,
        status,
        created_at
      `,
      [
        reporterId,
        reportedUserId,
        productId,
        serviceId,
        businessId,
        type,
        reason,
        description || null
      ]
    );

    return res.status(201).json({
      statut: "ok",
      message: "Signalement envoyé avec succès.",
      signalement: result.rows[0]
    });

  } catch (error) {
    console.error("Erreur création signalement :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible d'envoyer le signalement."
    });
  }
});


// ==================================================
// RÉCUPÉRER LES SIGNALEMENTS D'UN UTILISATEUR
// ==================================================

app.get("/api/reports/user/:userId", async (req, res) => {
  try {
    const userId = Number(req.params.userId);

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant utilisateur invalide."
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        reporter_id,
        reported_user_id,
        product_id,
        service_id,
        business_id,
        type,
        reason,
        description,
        status,
        created_at,
        updated_at
      FROM reports
      WHERE reporter_id = $1
      ORDER BY created_at DESC
      LIMIT 100
      `,
      [userId]
    );

    return res.json({
      statut: "ok",
      signalements: result.rows
    });

  } catch (error) {
    console.error("Erreur récupération signalements :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de récupérer les signalements."
    });
  }
});


// ==================================================
// ADMIN — RÉCUPÉRER TOUS LES SIGNALEMENTS
// ==================================================

app.get("/api/admin/reports", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        r.id,
        r.reporter_id,
        r.reported_user_id,
        r.product_id,
        r.service_id,
        r.business_id,
        r.type,
        r.reason,
        r.description,
        r.status,
        r.created_at,
        r.updated_at,

        reporter.name AS reporter_name,
        reported.name AS reported_user_name

      FROM reports r

      LEFT JOIN users reporter
        ON reporter.id = r.reporter_id

      LEFT JOIN users reported
        ON reported.id = r.reported_user_id

      ORDER BY r.created_at DESC
      LIMIT 500
      `
    );

    return res.json({
      statut: "ok",
      signalements: result.rows
    });

  } catch (error) {
    console.error("Erreur admin signalements :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de récupérer les signalements."
    });
  }
});


// ==================================================
// ADMIN — MODIFIER LE STATUT D'UN SIGNALEMENT
// ==================================================

app.put("/api/admin/reports/:id/status", async (req, res) => {
  try {
    const reportId = Number(req.params.id);
    const status = String(req.body.status || "").trim();

    const allowedStatuses = [
      "pending",
      "reviewing",
      "resolved",
      "rejected"
    ];

    if (!reportId || Number.isNaN(reportId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant de signalement invalide."
      });
    }

    if (!allowedStatuses.includes(status)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Statut de signalement invalide."
      });
    }

    const result = await pool.query(
      `
      UPDATE reports
      SET
        status = $1,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
      RETURNING
        id,
        status,
        updated_at
      `,
      [status, reportId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Signalement introuvable."
      });
    }

    return res.json({
      statut: "ok",
      message: "Statut du signalement mis à jour.",
      signalement: result.rows[0]
    });

  } catch (error) {
    console.error("Erreur statut signalement :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de modifier le signalement."
    });
  }
});


// ==================================================
// COMPTER LES SIGNALEMENTS EN ATTENTE
// ==================================================

app.get("/api/admin/reports/pending-count", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT COUNT(*)::int AS count
      FROM reports
      WHERE status IN ('pending', 'reviewing')
      `
    );

    return res.json({
      statut: "ok",
      pending: result.rows[0].count
    });

  } catch (error) {
    console.error("Erreur compteur signalements :", error);

    return res.status(500).json({
      statut: "erreur",
      message: "Impossible de compter les signalements."
    });
  }
});

// ==================================================
// AUTO-ADMIN HELPY
// ==================================================

const ADMIN_EMAIL = String(
  process.env.ADMIN_EMAIL || ""
).trim().toLowerCase();

if (ADMIN_EMAIL) {
  try {
    const adminResult = await pool.query(
      `
      UPDATE users
      SET
        role = 'admin',
        status = 'active',
        verified = TRUE
      WHERE LOWER(email) = $1
      RETURNING
        id,
        name,
        email,
        role,
        status,
        verified
      `,
      [ADMIN_EMAIL]
    );

    if (adminResult.rows.length > 0) {
      console.log(
        "AUTO-ADMIN activé pour :",
        adminResult.rows[0].email
      );
    } else {
      console.log(
        "AUTO-ADMIN : aucun compte trouvé avec ADMIN_EMAIL."
      );
    }

  } catch (error) {
    console.error(
      "Erreur AUTO-ADMIN :",
      error
    );
  }
}

// ==================================================
// PART 9J — CRÉATION AUTOMATIQUE DU COMPTE ADMIN
// ==================================================

const AUTO_ADMIN_EMAIL = String(
  process.env.ADMIN_EMAIL || ""
).trim().toLowerCase();

const AUTO_ADMIN_NAME = String(
  process.env.ADMIN_NAME || "HELPY Admin"
).trim();

const AUTO_ADMIN_PASSWORD = String(
  process.env.ADMIN_PASSWORD || ""
);

if (
  AUTO_ADMIN_EMAIL &&
  AUTO_ADMIN_PASSWORD
) {
  try {
    const existingAdmin = await pool.query(
      `
      SELECT
        id,
        email,
        role
      FROM users
      WHERE LOWER(email) = $1
      LIMIT 1
      `,
      [AUTO_ADMIN_EMAIL]
    );

    if (existingAdmin.rows.length === 0) {

      const bcrypt = require("bcryptjs");

      const hashedAdminPassword =
        await bcrypt.hash(
          AUTO_ADMIN_PASSWORD,
          12
        );

      const newAdmin = await pool.query(
        `
        INSERT INTO users (
          name,
          email,
          password,
          role,
          status,
          verified
        )
        VALUES (
          $1,
          $2,
          $3,
          'admin',
          'active',
          TRUE
        )
        RETURNING
          id,
          name,
          email,
          role,
          status,
          verified,
          created_at
        `,
        [
          AUTO_ADMIN_NAME,
          AUTO_ADMIN_EMAIL,
          hashedAdminPassword
        ]
      );

      console.log(
        "AUTO-ADMIN : compte administrateur créé :",
        newAdmin.rows[0].email
      );

    } else {

      await pool.query(
        `
        UPDATE users
        SET
          role = 'admin',
          status = 'active',
          verified = TRUE
        WHERE id = $1
        `,
        [existingAdmin.rows[0].id]
      );

      console.log(
        "AUTO-ADMIN : compte administrateur confirmé :",
        existingAdmin.rows[0].email
      );
    }

  } catch (error) {
    console.error(
      "Erreur création AUTO-ADMIN :",
      error
    );
  }
}

// ==================================================
// PART 9K — PROTECTION DU ROLE ADMIN
// ==================================================

app.use("/api/admin", async (req, res, next) => {
  try {
    const userId = Number(
      req.headers["x-user-id"] ||
      req.body?.user_id ||
      req.query?.user_id
    );

    if (!userId || Number.isNaN(userId)) {
      return res.status(401).json({
        statut: "erreur",
        message: "Authentification administrateur requise."
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        status,
        verified
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({
        statut: "erreur",
        message: "Compte introuvable."
      });
    }

    const user = result.rows[0];

    if (user.role !== "admin") {
      return res.status(403).json({
        statut: "erreur",
        message: "Accès refusé. Section réservée à HELPY Admin."
      });
    }

    if (user.status !== "active") {
      return res.status(403).json({
        statut: "erreur",
        message: "Compte administrateur désactivé."
      });
    }

    req.admin = user;

    next();

  } catch (error) {
    console.error(
      "Erreur protection admin :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message: "Erreur de sécurité administrateur."
    });
  }
});

// ==================================================
// PART 9L — AUTO-ADMIN CONTROL CENTER HELPY
// ==================================================

app.get("/api/admin/control-center", async (req, res) => {
  try {
    const [
      usersResult,
      productsResult,
      servicesResult,
      businessesResult,
      reportsResult,
      messagesResult,
      reviewsResult
    ] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM users
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM products
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM services
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM businesses
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM reports
        WHERE status IN ('pending', 'reviewing')
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM messages
        WHERE is_read = FALSE
      `),

      pool.query(`
        SELECT COUNT(*)::int AS total
        FROM reviews
      `)
    ]);

    return res.json({
      statut: "ok",

      admin: {
        id: req.admin.id,
        name: req.admin.name,
        email: req.admin.email,
        role: req.admin.role
      },

      statistiques: {
        utilisateurs: usersResult.rows[0].total,
        produits: productsResult.rows[0].total,
        services: servicesResult.rows[0].total,
        entreprises: businessesResult.rows[0].total,
        signalements_en_attente: reportsResult.rows[0].total,
        messages_non_lus: messagesResult.rows[0].total,
        evaluations: reviewsResult.rows[0].total
      },

      systeme: {
        statut: "actif",
        auto_admin: true,
        surveillance: true
      }
    });

  } catch (error) {
    console.error(
      "Erreur control center admin :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de charger le centre de contrôle HELPY."
    });
  }
});


// ==================================================
// ACTIVITÉ RÉCENTE DES UTILISATEURS
// ==================================================

app.get("/api/admin/activity/users", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        id,
        name,
        email,
        role,
        status,
        verified,
        created_at
      FROM users
      ORDER BY created_at DESC
      LIMIT 50
    `);

    return res.json({
      statut: "ok",
      activites: result.rows
    });

  } catch (error) {
    console.error(
      "Erreur activité utilisateurs :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de récupérer l'activité des utilisateurs."
    });
  }
});


// ==================================================
// PRODUITS RÉCENTS POUR ADMIN
// ==================================================

app.get("/api/admin/activity/products", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        p.id,
        p.name,
        p.price,
        p.category,
        p.location,
        p.status,
        p.created_at,
        u.id AS seller_id,
        u.name AS seller_name,
        u.email AS seller_email
      FROM products p
      LEFT JOIN users u
        ON u.id = p.user_id
      ORDER BY p.created_at DESC
      LIMIT 50
    `);

    return res.json({
      statut: "ok",
      produits: result.rows
    });

  } catch (error) {
    console.error(
      "Erreur activité produits :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de récupérer les produits récents."
    });
  }
});


// ==================================================
// SERVICES RÉCENTS POUR ADMIN
// ==================================================

app.get("/api/admin/activity/services", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        s.id,
        s.name,
        s.price,
        s.category,
        s.location,
        s.status,
        s.created_at,
        u.id AS provider_id,
        u.name AS provider_name,
        u.email AS provider_email
      FROM services s
      LEFT JOIN users u
        ON u.id = s.user_id
      ORDER BY s.created_at DESC
      LIMIT 50
    `);

    return res.json({
      statut: "ok",
      services: result.rows
    });

  } catch (error) {
    console.error(
      "Erreur activité services :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de récupérer les services récents."
    });
  }
});


// ==================================================
// ENTREPRISES RÉCENTES POUR ADMIN
// ==================================================

app.get("/api/admin/activity/businesses", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        b.id,
        b.name,
        b.description,
        b.category,
        b.location,
        b.status,
        b.created_at,
        u.id AS owner_id,
        u.name AS owner_name,
        u.email AS owner_email
      FROM businesses b
      LEFT JOIN users u
        ON u.id = b.user_id
      ORDER BY b.created_at DESC
      LIMIT 50
    `);

    return res.json({
      statut: "ok",
      entreprises: result.rows
    });

  } catch (error) {
    console.error(
      "Erreur activité entreprises :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de récupérer les entreprises récentes."
    });
  }
});


// ==================================================
// SUSPICION — ACTIVITÉ RAPIDE
// ==================================================

app.get("/api/admin/security/activity-check", async (req, res) => {
  try {
    const result = await pool.query(`
      SELECT
        user_id,
        COUNT(*)::int AS total_actions
      FROM products
      WHERE
        created_at >= CURRENT_TIMESTAMP - INTERVAL '10 minutes'
      GROUP BY user_id
      HAVING COUNT(*) >= 5
      ORDER BY total_actions DESC
    `);

    return res.json({
      statut: "ok",

      surveillance: {
        periode: "10 dernières minutes",
        seuil: 5
      },

      utilisateurs_suspects: result.rows
    });

  } catch (error) {
    console.error(
      "Erreur surveillance sécurité :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible d'effectuer la surveillance."
    });
  }
});


// ==================================================
// VÉRIFICATION DU SYSTÈME AUTO-ADMIN
// ==================================================

app.get("/api/admin/security/status", async (req, res) => {
  try {
    const adminEmail = String(
      process.env.ADMIN_EMAIL || ""
    ).trim().toLowerCase();

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        status,
        verified
      FROM users
      WHERE LOWER(email) = $1
      LIMIT 1
      `,
      [adminEmail]
    );

    if (result.rows.length === 0) {
      return res.json({
        statut: "ok",
        auto_admin: {
          actif: Boolean(adminEmail),
          compte: false
        }
      });
    }

    const admin = result.rows[0];

    return res.json({
      statut: "ok",

      auto_admin: {
        actif: true,
        compte: true,
        id: admin.id,
        name: admin.name,
        email: admin.email,
        role: admin.role,
        status: admin.status,
        verified: admin.verified
      }
    });

  } catch (error) {
    console.error(
      "Erreur statut auto-admin :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de vérifier le système Auto-Admin."
    });
  }
});

// ==================================================
// PART 9M — AUTO-MODÉRATION HELPY
// ==================================================

async function autoModerateListing({
  title,
  description,
  category
}) {
  const text = [
    title || "",
    description || "",
    category || ""
  ]
    .join(" ")
    .toLowerCase()
    .trim();

  if (!text) {
    return {
      status: "review",
      reason: "Contenu incomplet."
    };
  }

  const prohibitedTerms = [
    "arme",
    "armes",
    "explosif",
    "drogue",
    "stupéfiant",
    "fraude",
    "faux document",
    "faux papiers",
    "contrefaçon"
  ];

  const detectedTerms = prohibitedTerms.filter(
    term => text.includes(term)
  );

  if (detectedTerms.length > 0) {
    return {
      status: "review",
      reason: "Contenu nécessitant une vérification.",
      detected: detectedTerms
    };
  }

  if (text.length < 5) {
    return {
      status: "review",
      reason: "Contenu trop court."
    };
  }

  return {
    status: "approved",
    reason: "Contenu normal."
  };
}


// ==================================================
// MODÉRATION AUTOMATIQUE D'UN PRODUIT
// ==================================================

app.post("/api/admin/moderation/product/:id", async (req, res) => {
  try {
    const productId = Number(req.params.id);

    if (!productId || Number.isNaN(productId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant produit invalide."
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        description,
        category,
        status
      FROM products
      WHERE id = $1
      LIMIT 1
      `,
      [productId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Produit introuvable."
      });
    }

    const product = result.rows[0];

    const moderation = await autoModerateListing({
      title: product.name,
      description: product.description,
      category: product.category
    });

    let newStatus = product.status;

    if (moderation.status === "approved") {
      newStatus = "active";
    } else {
      newStatus = "pending";
    }

    const updated = await pool.query(
      `
      UPDATE products
      SET status = $1
      WHERE id = $2
      RETURNING
        id,
        name,
        description,
        category,
        status
      `,
      [newStatus, productId]
    );

    return res.json({
      statut: "ok",
      moderation: {
        decision: moderation.status,
        raison: moderation.reason,
        detected: moderation.detected || []
      },
      produit: updated.rows[0]
    });

  } catch (error) {
    console.error(
      "Erreur modération produit :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de modérer le produit."
    });
  }
});


// ==================================================
// MODÉRATION AUTOMATIQUE D'UN SERVICE
// ==================================================

app.post("/api/admin/moderation/service/:id", async (req, res) => {
  try {
    const serviceId = Number(req.params.id);

    if (!serviceId || Number.isNaN(serviceId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant service invalide."
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        description,
        category,
        status
      FROM services
      WHERE id = $1
      LIMIT 1
      `,
      [serviceId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Service introuvable."
      });
    }

    const service = result.rows[0];

    const moderation = await autoModerateListing({
      title: service.name,
      description: service.description,
      category: service.category
    });

    let newStatus = service.status;

    if (moderation.status === "approved") {
      newStatus = "active";
    } else {
      newStatus = "pending";
    }

    const updated = await pool.query(
      `
      UPDATE services
      SET status = $1
      WHERE id = $2
      RETURNING
        id,
        name,
        description,
        category,
        status
      `,
      [newStatus, serviceId]
    );

    return res.json({
      statut: "ok",
      moderation: {
        decision: moderation.status,
        raison: moderation.reason,
        detected: moderation.detected || []
      },
      service: updated.rows[0]
    });

  } catch (error) {
    console.error(
      "Erreur modération service :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de modérer le service."
    });
  }
});


// ==================================================
// MODÉRATION AUTOMATIQUE D'UNE ENTREPRISE
// ==================================================

app.post("/api/admin/moderation/business/:id", async (req, res) => {
  try {
    const businessId = Number(req.params.id);

    if (!businessId || Number.isNaN(businessId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant entreprise invalide."
      });
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        description,
        category,
        status
      FROM businesses
      WHERE id = $1
      LIMIT 1
      `,
      [businessId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Entreprise introuvable."
      });
    }

    const business = result.rows[0];

    const moderation = await autoModerateListing({
      title: business.name,
      description: business.description,
      category: business.category
    });

    let newStatus = business.status;

    if (moderation.status === "approved") {
      newStatus = "active";
    } else {
      newStatus = "pending";
    }

    const updated = await pool.query(
      `
      UPDATE businesses
      SET status = $1
      WHERE id = $2
      RETURNING
        id,
        name,
        description,
        category,
        status
      `,
      [newStatus, businessId]
    );

    return res.json({
      statut: "ok",
      moderation: {
        decision: moderation.status,
        raison: moderation.reason,
        detected: moderation.detected || []
      },
      entreprise: updated.rows[0]
    });

  } catch (error) {
    console.error(
      "Erreur modération entreprise :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de modérer l'entreprise."
    });
  }
});


// ==================================================
// LISTE DES CONTENUS EN ATTENTE DE VÉRIFICATION
// ==================================================

app.get("/api/admin/moderation/pending", async (req, res) => {
  try {
    const [products, services, businesses] =
      await Promise.all([
        pool.query(`
          SELECT
            id,
            name,
            category,
            status,
            created_at
          FROM products
          WHERE status IN ('pending', 'review', 'verification')
          ORDER BY created_at DESC
          LIMIT 100
        `),

        pool.query(`
          SELECT
            id,
            name,
            category,
            status,
            created_at
          FROM services
          WHERE status IN ('pending', 'review', 'verification')
          ORDER BY created_at DESC
          LIMIT 100
        `),

        pool.query(`
          SELECT
            id,
            name,
            category,
            status,
            created_at
          FROM businesses
          WHERE status IN ('pending', 'review', 'verification')
          ORDER BY created_at DESC
          LIMIT 100
        `)
      ]);

    return res.json({
      statut: "ok",

      en_verification: {
        produits: products.rows,
        services: services.rows,
        entreprises: businesses.rows
      }
    });

  } catch (error) {
    console.error(
      "Erreur contenus en vérification :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de récupérer les contenus en vérification."
    });
  }
});


// ==================================================
// APPROBATION MANUELLE PAR AUTO-ADMIN
// ==================================================

app.put("/api/admin/moderation/:type/:id/approve", async (req, res) => {
  try {
    const type = String(req.params.type || "")
      .trim()
      .toLowerCase();

    const itemId = Number(req.params.id);

    if (!itemId || Number.isNaN(itemId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant invalide."
      });
    }

    const allowedTypes = {
      product: "products",
      service: "services",
      business: "businesses"
    };

    const table = allowedTypes[type];

    if (!table) {
      return res.status(400).json({
        statut: "erreur",
        message: "Type de contenu invalide."
      });
    }

    const result = await pool.query(
      `
      UPDATE ${table}
      SET status = 'active'
      WHERE id = $1
      RETURNING id, status
      `,
      [itemId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Contenu introuvable."
      });
    }

    return res.json({
      statut: "ok",
      message: "Contenu approuvé par HELPY Admin.",
      contenu: result.rows[0]
    });

  } catch (error) {
    console.error(
      "Erreur approbation modération :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible d'approuver le contenu."
    });
  }
});

// ==================================================
// PART 9N — AUTO-DETECTION DES ACTIVITÉS SUSPECTES
// ==================================================

async function detectSuspiciousActivity(userId) {
  try {
    const id = Number(userId);

    if (!id || Number.isNaN(id)) {
      return {
        suspicious: false,
        reasons: []
      };
    }

    const reasons = [];

    // ----------------------------------------------
    // 1. TROP DE PRODUITS EN PEU DE TEMPS
    // ----------------------------------------------

    const productsResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM products
      WHERE user_id = $1
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '10 minutes'
      `,
      [id]
    );

    const recentProducts =
      Number(productsResult.rows[0].total || 0);

    if (recentProducts >= 5) {
      reasons.push(
        "Création rapide de plusieurs produits."
      );
    }

    // ----------------------------------------------
    // 2. TROP DE SERVICES EN PEU DE TEMPS
    // ----------------------------------------------

    const servicesResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM services
      WHERE user_id = $1
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '10 minutes'
      `,
      [id]
    );

    const recentServices =
      Number(servicesResult.rows[0].total || 0);

    if (recentServices >= 5) {
      reasons.push(
        "Création rapide de plusieurs services."
      );
    }

    // ----------------------------------------------
    // 3. TROP DE SIGNALEMENTS
    // ----------------------------------------------

    const reportsResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM reports
      WHERE reporter_id = $1
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '30 minutes'
      `,
      [id]
    );

    const recentReports =
      Number(reportsResult.rows[0].total || 0);

    if (recentReports >= 10) {
      reasons.push(
        "Nombre élevé de signalements en peu de temps."
      );
    }

    // ----------------------------------------------
    // 4. TROP DE MESSAGES
    // ----------------------------------------------

    const messagesResult = await pool.query(
      `
      SELECT COUNT(*)::int AS total
      FROM messages
      WHERE sender_id = $1
        AND created_at >= CURRENT_TIMESTAMP - INTERVAL '10 minutes'
      `,
      [id]
    );

    const recentMessages =
      Number(messagesResult.rows[0].total || 0);

    if (recentMessages >= 50) {
      reasons.push(
        "Volume inhabituel de messages."
      );
    }

    return {
      suspicious: reasons.length > 0,
      reasons,
      activity: {
        products: recentProducts,
        services: recentServices,
        reports: recentReports,
        messages: recentMessages
      }
    };

  } catch (error) {
    console.error(
      "Erreur détection activité suspecte :",
      error
    );

    return {
      suspicious: false,
      reasons: [],
      error: true
    };
  }
}


// ==================================================
// ANALYSER UN UTILISATEUR
// ==================================================

app.get("/api/admin/security/user/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant utilisateur invalide."
      });
    }

    const userResult = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        status,
        verified,
        created_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (userResult.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Utilisateur introuvable."
      });
    }

    const analysis =
      await detectSuspiciousActivity(userId);

    return res.json({
      statut: "ok",

      utilisateur: userResult.rows[0],

      securite: {
        activite_suspecte: analysis.suspicious,
        raisons: analysis.reasons,
        activite: analysis.activity
      }
    });

  } catch (error) {
    console.error(
      "Erreur analyse sécurité utilisateur :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible d'analyser l'activité de l'utilisateur."
    });
  }
});


// ==================================================
// SURVEILLANCE GLOBALE DES UTILISATEURS
// ==================================================

app.get("/api/admin/security/users", async (req, res) => {
  try {
    const usersResult = await pool.query(`
      SELECT
        id,
        name,
        email,
        role,
        status,
        verified,
        created_at
      FROM users
      WHERE status = 'active'
      ORDER BY created_at DESC
      LIMIT 200
    `);

    const suspiciousUsers = [];

    for (const user of usersResult.rows) {
      const analysis =
        await detectSuspiciousActivity(user.id);

      if (analysis.suspicious) {
        suspiciousUsers.push({
          utilisateur: user,
          raisons: analysis.reasons,
          activite: analysis.activity
        });
      }
    }

    return res.json({
      statut: "ok",

      surveillance: {
        utilisateurs_analyses:
          usersResult.rows.length,

        utilisateurs_suspects:
          suspiciousUsers.length
      },

      resultats: suspiciousUsers
    });

  } catch (error) {
    console.error(
      "Erreur surveillance globale :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible d'effectuer la surveillance globale."
    });
  }
});


// ==================================================
// BLOQUER AUTOMATIQUEMENT UN COMPTE SUSPECT
// ==================================================

app.post("/api/admin/security/user/:id/review", async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant utilisateur invalide."
      });
    }

    const analysis =
      await detectSuspiciousActivity(userId);

    if (!analysis.suspicious) {
      return res.json({
        statut: "ok",
        action: "aucune",
        message:
          "Aucune activité suffisamment suspecte détectée.",
        securite: analysis
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET status = 'review'
      WHERE id = $1
        AND role <> 'admin'
      RETURNING
        id,
        name,
        email,
        role,
        status,
        verified
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(403).json({
        statut: "erreur",
        message:
          "Le compte ne peut pas être placé en vérification."
      });
    }

    return res.json({
      statut: "ok",

      action: "verification",

      message:
        "Le compte a été placé en vérification automatique.",

      utilisateur: result.rows[0],

      raisons:
        analysis.reasons
    });

  } catch (error) {
    console.error(
      "Erreur vérification automatique :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de placer le compte en vérification."
    });
  }
});


// ==================================================
// RÉACTIVER UN COMPTE APRÈS VÉRIFICATION
// ==================================================

app.put("/api/admin/security/user/:id/activate", async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        statut: "erreur",
        message: "Identifiant utilisateur invalide."
      });
    }

    const result = await pool.query(
      `
      UPDATE users
      SET status = 'active'
      WHERE id = $1
      RETURNING
        id,
        name,
        email,
        role,
        status,
        verified
      `,
      [userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message: "Utilisateur introuvable."
      });
    }

    return res.json({
      statut: "ok",
      message:
        "Compte réactivé avec succès.",
      utilisateur: result.rows[0]
    });

  } catch (error) {
    console.error(
      "Erreur réactivation sécurité :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de réactiver le compte."
    });
  }
});

// ==================================================
// PART 9O — AUTO-NOTIFICATIONS HELPY
// ==================================================

async function createNotification({
  userId,
  type,
  title,
  message
}) {
  try {
    const id = Number(userId);

    if (!id || Number.isNaN(id)) {
      return null;
    }

    if (!title || !message) {
      return null;
    }

    const result = await pool.query(
      `
      INSERT INTO notifications (
        user_id,
        type,
        title,
        message,
        is_read
      )
      VALUES ($1, $2, $3, $4, FALSE)
      RETURNING
        id,
        user_id,
        type,
        title,
        message,
        is_read,
        created_at
      `,
      [
        id,
        String(type || "system"),
        String(title),
        String(message)
      ]
    );

    return result.rows[0];

  } catch (error) {
    console.error(
      "Erreur création notification :",
      error
    );

    return null;
  }
}


// ==================================================
// NOTIFICATION ADMIN
// ==================================================

async function notifyAdmin({
  type,
  title,
  message
}) {
  try {
    const adminEmail = String(
      process.env.ADMIN_EMAIL || ""
    ).trim().toLowerCase();

    if (!adminEmail) {
      return null;
    }

    const result = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = $1
        AND role = 'admin'
        AND status = 'active'
      LIMIT 1
      `,
      [adminEmail]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return await createNotification({
      userId: result.rows[0].id,
      type: type || "admin",
      title: title || "Nouvelle activité HELPY",
      message: message || "Une nouvelle activité nécessite votre attention."
    });

  } catch (error) {
    console.error(
      "Erreur notification admin :",
      error
    );

    return null;
  }
}


// ==================================================
// NOTIFICATION APRÈS NOUVEAU SIGNALEMENT
// ==================================================

app.post("/api/admin/notifications/test", async (req, res) => {
  try {
    const notification = await notifyAdmin({
      type: "system",
      title: "HELPY Auto-Admin",
      message:
        "Le système de notifications administrateur fonctionne correctement."
    });

    if (!notification) {
      return res.status(404).json({
        statut: "erreur",
        message:
          "Compte administrateur introuvable ou notification impossible."
      });
    }

    return res.json({
      statut: "ok",
      message:
        "Notification administrateur créée.",
      notification
    });

  } catch (error) {
    console.error(
      "Erreur test notification admin :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de créer la notification test."
    });
  }
});


// ==================================================
// CRÉER UNE NOTIFICATION POUR UN UTILISATEUR
// ==================================================

app.post("/api/notifications", async (req, res) => {
  try {
    const userId = Number(req.body.user_id);
    const type = String(
      req.body.type || "system"
    ).trim();

    const title = String(
      req.body.title || ""
    ).trim();

    const message = String(
      req.body.message || ""
    ).trim();

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        statut: "erreur",
        message:
          "Identifiant utilisateur invalide."
      });
    }

    if (!title) {
      return res.status(400).json({
        statut: "erreur",
        message:
          "Le titre de la notification est obligatoire."
      });
    }

    if (!message) {
      return res.status(400).json({
        statut: "erreur",
        message:
          "Le message de la notification est obligatoire."
      });
    }

    const user = await pool.query(
      `
      SELECT id
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [userId]
    );

    if (user.rows.length === 0) {
      return res.status(404).json({
        statut: "erreur",
        message:
          "Utilisateur introuvable."
      });
    }

    const notification =
      await createNotification({
        userId,
        type,
        title,
        message
      });

    if (!notification) {
      return res.status(500).json({
        statut: "erreur",
        message:
          "Impossible de créer la notification."
      });
    }

    return res.status(201).json({
      statut: "ok",
      message:
        "Notification créée.",
      notification
    });

  } catch (error) {
    console.error(
      "Erreur création notification utilisateur :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de créer la notification."
    });
  }
});


// ==================================================
// NOTIFICATION — COMPTE EN VÉRIFICATION
// ==================================================

app.post("/api/admin/notifications/user-review/:id", async (req, res) => {
  try {
    const userId = Number(req.params.id);

    if (!userId || Number.isNaN(userId)) {
      return res.status(400).json({
        statut: "erreur",
        message:
          "Identifiant utilisateur invalide."
      });
    }

    const notification =
      await createNotification({
        userId,
        type: "security",
        title: "Vérification de votre compte",
        message:
          "Votre compte HELPY nécessite une vérification de sécurité."
      });

    if (!notification) {
      return res.status(500).json({
        statut: "erreur",
        message:
          "Impossible d'envoyer la notification."
      });
    }

    return res.json({
      statut: "ok",
      message:
        "Notification envoyée.",
      notification
    });

  } catch (error) {
    console.error(
      "Erreur notification vérification :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible d'envoyer la notification."
    });
  }
});

// ==================================================
// PART 9P — AUTO-ADMIN INTERNE HELPY
// ==================================================

// Cette partie est entièrement interne au serveur.
// Aucun utilisateur normal ne voit ou ne choisit "Admin".


// ==================================================
// IDENTIFIER AUTOMATIQUEMENT L'ADMIN
// ==================================================

async function getAutoAdmin() {
  try {
    const adminEmail = String(
      process.env.ADMIN_EMAIL || ""
    ).trim().toLowerCase();

    if (!adminEmail) {
      return null;
    }

    const result = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        status,
        verified
      FROM users
      WHERE LOWER(email) = $1
        AND role = 'admin'
        AND status = 'active'
      LIMIT 1
      `,
      [adminEmail]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0];

  } catch (error) {
    console.error(
      "Erreur identification Auto-Admin :",
      error
    );

    return null;
  }
}


// ==================================================
// ENREGISTRER UNE ALERTE INTERNE
// ==================================================

async function createAdminAlert({
  type,
  title,
  message,
  userId = null
}) {
  try {
    const admin = await getAutoAdmin();

    if (!admin) {
      return null;
    }

    const finalMessage = userId
      ? `${message} Utilisateur concerné : #${userId}.`
      : message;

    return await createNotification({
      userId: admin.id,
      type: type || "security",
      title: title || "Alerte HELPY",
      message: finalMessage
    });

  } catch (error) {
    console.error(
      "Erreur création alerte Auto-Admin :",
      error
    );

    return null;
  }
}


// ==================================================
// ANALYSE AUTOMATIQUE D'UN COMPTE
// ==================================================

async function autoCheckUser(userId) {
  try {
    const id = Number(userId);

    if (!id || Number.isNaN(id)) {
      return {
        checked: false,
        suspicious: false
      };
    }

    const userResult = await pool.query(
      `
      SELECT
        id,
        name,
        email,
        role,
        status,
        verified,
        created_at
      FROM users
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (userResult.rows.length === 0) {
      return {
        checked: false,
        suspicious: false
      };
    }

    const user = userResult.rows[0];

    // L'Auto-Admin ne bloque jamais son propre compte.
    if (user.role === "admin") {
      return {
        checked: true,
        suspicious: false,
        protected: true,
        user
      };
    }

    const analysis =
      await detectSuspiciousActivity(id);

    if (!analysis.suspicious) {
      return {
        checked: true,
        suspicious: false,
        user,
        activity: analysis.activity
      };
    }

    await createAdminAlert({
      type: "security",
      title: "Activité suspecte détectée",
      message:
        analysis.reasons.join(" "),
      userId: id
    });

    return {
      checked: true,
      suspicious: true,
      user,
      reasons: analysis.reasons,
      activity: analysis.activity
    };

  } catch (error) {
    console.error(
      "Erreur Auto-Admin contrôle utilisateur :",
      error
    );

    return {
      checked: false,
      suspicious: false,
      error: true
    };
  }
}


// ==================================================
// CONTRÔLE AUTOMATIQUE D'UN NOUVEAU PRODUIT
// ==================================================

async function autoCheckProduct(productId) {
  try {
    const id = Number(productId);

    if (!id || Number.isNaN(id)) {
      return null;
    }

    const result = await pool.query(
      `
      SELECT
        id,
        user_id,
        name,
        description,
        category,
        status
      FROM products
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const product = result.rows[0];

    const moderation =
      await autoModerateListing({
        title: product.name,
        description: product.description,
        category: product.category
      });

    if (moderation.status === "approved") {
      await pool.query(
        `
        UPDATE products
        SET status = 'active'
        WHERE id = $1
        `,
        [id]
      );

      return {
        checked: true,
        approved: true,
        product_id: id
      };
    }

    await pool.query(
      `
      UPDATE products
      SET status = 'pending'
      WHERE id = $1
      `,
      [id]
    );

    await createAdminAlert({
      type: "moderation",
      title: "Produit en vérification",
      message:
        `Le produit "${product.name}" nécessite une vérification.`,
      userId: product.user_id
    });

    return {
      checked: true,
      approved: false,
      product_id: id,
      reason: moderation.reason
    };

  } catch (error) {
    console.error(
      "Erreur contrôle automatique produit :",
      error
    );

    return null;
  }
}


// ==================================================
// CONTRÔLE AUTOMATIQUE D'UN NOUVEAU SERVICE
// ==================================================

async function autoCheckService(serviceId) {
  try {
    const id = Number(serviceId);

    if (!id || Number.isNaN(id)) {
      return null;
    }

    const result = await pool.query(
      `
      SELECT
        id,
        user_id,
        name,
        description,
        category,
        status
      FROM services
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const service = result.rows[0];

    const moderation =
      await autoModerateListing({
        title: service.name,
        description: service.description,
        category: service.category
      });

    if (moderation.status === "approved") {
      await pool.query(
        `
        UPDATE services
        SET status = 'active'
        WHERE id = $1
        `,
        [id]
      );

      return {
        checked: true,
        approved: true,
        service_id: id
      };
    }

    await pool.query(
      `
      UPDATE services
      SET status = 'pending'
      WHERE id = $1
      `,
      [id]
    );

    await createAdminAlert({
      type: "moderation",
      title: "Service en vérification",
      message:
        `Le service "${service.name}" nécessite une vérification.`,
      userId: service.user_id
    });

    return {
      checked: true,
      approved: false,
      service_id: id,
      reason: moderation.reason
    };

  } catch (error) {
    console.error(
      "Erreur contrôle automatique service :",
      error
    );

    return null;
  }
}


// ==================================================
// CONTRÔLE AUTOMATIQUE D'UNE ENTREPRISE
// ==================================================

async function autoCheckBusiness(businessId) {
  try {
    const id = Number(businessId);

    if (!id || Number.isNaN(id)) {
      return null;
    }

    const result = await pool.query(
      `
      SELECT
        id,
        user_id,
        name,
        description,
        category,
        status
      FROM businesses
      WHERE id = $1
      LIMIT 1
      `,
      [id]
    );

    if (result.rows.length === 0) {
      return null;
    }

    const business = result.rows[0];

    const moderation =
      await autoModerateListing({
        title: business.name,
        description: business.description,
        category: business.category
      });

    if (moderation.status === "approved") {
      await pool.query(
        `
        UPDATE businesses
        SET status = 'active'
        WHERE id = $1
        `,
        [id]
      );

      return {
        checked: true,
        approved: true,
        business_id: id
      };
    }

    await pool.query(
      `
      UPDATE businesses
      SET status = 'pending'
      WHERE id = $1
      `,
      [id]
    );

    await createAdminAlert({
      type: "moderation",
      title: "Entreprise en vérification",
      message:
        `L'entreprise "${business.name}" nécessite une vérification.`,
      userId: business.user_id
    });

    return {
      checked: true,
      approved: false,
      business_id: id,
      reason: moderation.reason
    };

  } catch (error) {
    console.error(
      "Erreur contrôle automatique entreprise :",
      error
    );

    return null;
  }
}


// ==================================================
// ROUTE INTERNE DE VÉRIFICATION AUTO-ADMIN
// ==================================================

app.get("/api/system/auto-admin/status", async (req, res) => {
  try {
    const admin = await getAutoAdmin();

    return res.json({
      statut: "ok",

      systeme: {
        auto_admin: Boolean(admin),
        surveillance: true,
        moderation_automatique: true
      }
    });

  } catch (error) {
    console.error(
      "Erreur statut système Auto-Admin :",
      error
    );

    return res.status(500).json({
      statut: "erreur",
      message:
        "Impossible de vérifier le système automatique."
    });
  }
});


// ==================================================
// PART FINAL — START HELPY SERVER
// ==================================================

const PORT = process.env.PORT || 3000;

app.get("/api/health", async (req, res) => {
  try {
    await pool.query("SELECT 1");

    return res.json({
      status: "ok",
      service: "HELPY",
      database: "connected"
    });

  } catch (error) {
    console.error(
      "Erreur health check :",
      error
    );

    return res.status(500).json({
      status: "error",
      service: "HELPY",
      database: "disconnected"
    });
  }
});


// ==================================================
// ROUTE 404 API
// ==================================================

app.use("/api", (req, res) => {
  return res.status(404).json({
    statut: "erreur",
    message: "Route API introuvable."
  });
});


// ==================================================
// GESTIONNAIRE D'ERREUR GLOBAL
// ==================================================

app.use((error, req, res, next) => {
  console.error(
    "Erreur serveur HELPY :",
    error
  );

  if (res.headersSent) {
    return next(error);
  }

  return res.status(500).json({
    statut: "erreur",
    message: "Une erreur interne est survenue."
  });
});


// ==================================================
// DÉMARRAGE DU SERVEUR
// ==================================================

async function startServer() {
  try {
    await initializeDatabase();

    app.listen(PORT, "0.0.0.0", () => {
      console.log(
        `HELPY server running on port ${PORT}`
      );
    });

  } catch (error) {
    console.error(
      "Impossible de démarrer HELPY :",
      error
    );

    process.exit(1);
  }
}

startServer();

         