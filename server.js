/*
========================================================
HELPY — SERVER.JS
Marketplace mondial
Produits • Services • Entreprises
Node.js + Express + PostgreSQL
========================================================
*/

const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();

const PORT = Number(process.env.PORT || 3000);
const DATABASE_URL = process.env.DATABASE_URL || "";


// ======================================================
// CONNEXION POSTGRESQL
// ======================================================

if (!DATABASE_URL) {
  console.warn("ATTENTION : DATABASE_URL n'est pas définie.");
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL
    ? { rejectUnauthorized: false }
    : undefined
});


// ======================================================
// MIDDLEWARES
// ======================================================

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


// ======================================================
// OUTILS
// ======================================================

function clean(value, max = 5000) {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value)
    .trim()
    .slice(0, max);
}


function numberOrNull(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const number = Number(value);

  return Number.isFinite(number)
    ? number
    : null;
}


function normalizeEmail(email) {
  return clean(email, 255).toLowerCase();
}


function publicUser(user) {
  if (!user) {
    return null;
  }

  return {
    id: user.id,
    name: user.name,
    email: user.email,

    phone: user.phone || null,
    whatsapp: user.whatsapp || null,

    country: user.country || null,
    city: user.city || null,

    description: user.description || null,

    profile_photo: user.profile_photo || null,

    role: user.role || "user",
    status: user.status || "active",
    verified: Boolean(user.verified),
    created_at: user.created_at
  };
}


function sendServerError(res, error) {
  console.error("HELPY ERROR:", error);

  return res.status(500).json({
    statut: "erreur",
    message: "Une erreur interne est survenue."
  });
}


// ======================================================
// INITIALISATION DE LA BASE DE DONNÉES
// ======================================================

async function initializeDatabase() {

  const client = await pool.connect();

  try {

    await client.query("BEGIN");


    // ==================================================
    // USERS
    // ==================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(150) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password TEXT NOT NULL,
        whatsapp VARCHAR(50),
        role VARCHAR(30) NOT NULL DEFAULT 'user',
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        verified BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);


    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50)
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS role VARCHAR(30) NOT NULL DEFAULT 'user'
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) NOT NULL DEFAULT 'active'
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS verified BOOLEAN NOT NULL DEFAULT FALSE
    `);

    await client.query(`
      ALTER TABLE users
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    `);

await client.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS phone VARCHAR(50)
`);

await client.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS country VARCHAR(120)
`);

await client.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS city VARCHAR(120)
`);

await client.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS description TEXT
`);

await client.query(`
  ALTER TABLE users
  ADD COLUMN IF NOT EXISTS profile_photo TEXT
`);

    // ==================================================
    // PRODUCTS
    // ==================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS products (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        price NUMERIC(14,2) NOT NULL DEFAULT 0,
        category VARCHAR(150) DEFAULT '',
        location VARCHAR(255) DEFAULT '',
        whatsapp VARCHAR(50) DEFAULT '',
        image TEXT DEFAULT '',
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);


    await client.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS user_id INTEGER
    `);

    await client.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS price NUMERIC(14,2) DEFAULT 0
    `);

    await client.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS category VARCHAR(150) DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50) DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS image TEXT DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active'
    `);

    await client.query(`
      ALTER TABLE products
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
    `);


    // ==================================================
    // SERVICES
    // ==================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS services (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        price NUMERIC(14,2) NOT NULL DEFAULT 0,
        category VARCHAR(150) DEFAULT '',
        location VARCHAR(255) DEFAULT '',
        whatsapp VARCHAR(50) DEFAULT '',
        image TEXT DEFAULT '',
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);


    await client.query(`
      ALTER TABLE services
      ADD COLUMN IF NOT EXISTS user_id INTEGER
    `);

    await client.query(`
      ALTER TABLE services
      ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE services
      ADD COLUMN IF NOT EXISTS price NUMERIC(14,2) DEFAULT 0
    `);

    await client.query(`
      ALTER TABLE services
      ADD COLUMN IF NOT EXISTS category VARCHAR(150) DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE services
      ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE services
      ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50) DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE services
      ADD COLUMN IF NOT EXISTS image TEXT DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE services
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active'
    `);

    await client.query(`
      ALTER TABLE services
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
    `);


    // ==================================================
    // BUSINESSES
    // ==================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS businesses (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        category VARCHAR(150) DEFAULT '',
        location VARCHAR(255) DEFAULT '',
        phone VARCHAR(50) DEFAULT '',
        whatsapp VARCHAR(50) DEFAULT '',
        email VARCHAR(255) DEFAULT '',
        website VARCHAR(500) DEFAULT '',
        image TEXT DEFAULT '',
        status VARCHAR(30) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);


    await client.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS user_id INTEGER
    `);

    await client.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS description TEXT DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS category VARCHAR(150) DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS location VARCHAR(255) DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS phone VARCHAR(50) DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(50) DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS email VARCHAR(255) DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS website VARCHAR(500) DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS image TEXT DEFAULT ''
    `);

    await client.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active'
    `);

    await client.query(`
      ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()
    `);


    // ==================================================
    // NOTIFICATIONS
    // ==================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        type VARCHAR(50) DEFAULT 'system',
        title VARCHAR(255) NOT NULL,
        message TEXT DEFAULT '',
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);


    // ==================================================
    // FAVORITES
    // ==================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS favorites (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id, product_id)
      )
    `);


    // ==================================================
    // MESSAGES
    // ==================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS messages (
        id SERIAL PRIMARY KEY,
        sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        is_read BOOLEAN NOT NULL DEFAULT FALSE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);


    // ==================================================
    // REVIEWS
    // ==================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id SERIAL PRIMARY KEY,
        reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        reviewed_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
        comment TEXT DEFAULT '',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(reviewer_id, reviewed_user_id)
      )
    `);


    // ==================================================
    // REPORTS
    // ==================================================

    await client.query(`
      CREATE TABLE IF NOT EXISTS reports (
        id SERIAL PRIMARY KEY,
        reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        reported_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        product_id INTEGER REFERENCES products(id) ON DELETE SET NULL,
        service_id INTEGER REFERENCES services(id) ON DELETE SET NULL,
        business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
        type VARCHAR(50) DEFAULT 'other',
        reason VARCHAR(255) NOT NULL,
        description TEXT DEFAULT '',
        status VARCHAR(30) NOT NULL DEFAULT 'pending',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);


    // ==================================================
    // INDEX
    // ==================================================

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_user_id
      ON products(user_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_products_status
      ON products(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_services_user_id
      ON services(user_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_services_status
      ON services(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_businesses_user_id
      ON businesses(user_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_businesses_status
      ON businesses(status)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_sender
      ON messages(sender_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_messages_receiver
      ON messages(receiver_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_notifications_user
      ON notifications(user_id)
    `);

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reports_status
      ON reports(status)
    `);


    await client.query("COMMIT");

    console.log("HELPY database initialized.");

  } catch (error) {

    await client.query("ROLLBACK");

    throw error;

  } finally {

    client.release();

  }
}

// ======================================================
// PART 2 — AUTO-ADMIN INTERNE
// ======================================================

async function ensureAutoAdmin() {
  try {
    const email = normalizeEmail(process.env.ADMIN_EMAIL);
    const name = clean(
      process.env.ADMIN_NAME || "HELPY Admin",
      150
    );
    const password = String(
      process.env.ADMIN_PASSWORD || ""
    );

    if (!email || !password) {
      console.log(
        "Auto-Admin : ADMIN_EMAIL ou ADMIN_PASSWORD non configuré."
      );

      return null;
    }

    const existing = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = $1
      LIMIT 1
      `,
      [email]
    );

    if (existing.rows.length > 0) {

      const result = await pool.query(
        `
        UPDATE users
        SET
          name = $2,
          role = 'admin',
          status = 'active',
          verified = TRUE
        WHERE id = $1
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
          existing.rows[0].id,
          name
        ]
      );

      console.log(
        "Auto-Admin : compte administrateur confirmé."
      );

      return result.rows[0];
    }

    const passwordHash = await bcrypt.hash(
      password,
      12
    );

    const result = await pool.query(
      `
      INSERT INTO users
      (
        name,
        email,
        password,
        role,
        status,
        verified
      )
      VALUES
      (
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
        name,
        email,
        passwordHash
      ]
    );

    console.log(
      "Auto-Admin : compte créé automatiquement."
    );

    return result.rows[0];

  } catch (error) {

    console.error(
      "Erreur Auto-Admin :",
      error
    );

    return null;
  }
}


// ======================================================
// RÉCUPÉRER L'AUTO-ADMIN
// ======================================================

async function getAutoAdmin() {
  try {

    const email = normalizeEmail(
      process.env.ADMIN_EMAIL
    );

    if (!email) {
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
      WHERE
        LOWER(email) = $1
        AND role = 'admin'
        AND status = 'active'
      LIMIT 1
      `,
      [email]
    );

    return result.rows[0] || null;

  } catch (error) {

    console.error(
      "Erreur récupération Auto-Admin :",
      error
    );

    return null;
  }
}


// ======================================================
// ALERTE ADMIN INTERNE
// ======================================================

async function createAdminAlert({
  type = "security",
  title = "Alerte HELPY",
  message = "",
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

    const result = await pool.query(
      `
      INSERT INTO notifications
      (
        user_id,
        type,
        title,
        message
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4
      )
      RETURNING *
      `,
      [
        admin.id,
        type,
        title,
        finalMessage
      ]
    );

    return result.rows[0];

  } catch (error) {

    console.error(
      "Erreur alerte Auto-Admin :",
      error
    );

    return null;
  }
}


// ======================================================
// TERMES NÉCESSITANT UNE VÉRIFICATION
// ======================================================

const PROHIBITED_TERMS = [
  "arme",
  "armes",
  "explosif",
  "explosifs",
  "drogue",
  "drogues",
  "stupéfiant",
  "stupéfiants",
  "faux document",
  "faux papiers",
  "contrefaçon"
];


// ======================================================
// MODÉRATION AUTOMATIQUE
// ======================================================

function autoModerateListing({
  title,
  description,
  category
}) {

  const text = `
    ${title || ""}
    ${description || ""}
    ${category || ""}
  `.toLowerCase();

  const foundTerm =
    PROHIBITED_TERMS.find(
      term => text.includes(term)
    );

  if (foundTerm) {

    return {
      status: "pending",
      reason:
        "Cette annonce nécessite une vérification."
    };
  }

  if (
    !clean(title) ||
    !clean(category)
  ) {

    return {
      status: "pending",
      reason:
        "Informations insuffisantes."
    };
  }

  return {
    status: "approved",
    reason: null
  };
}


// ======================================================
// DÉTECTION D'ACTIVITÉ SUSPECTE
// ======================================================

async function detectSuspiciousActivity(userId) {

  const id = Number(userId);

  if (!id || Number.isNaN(id)) {

    return {
      suspicious: false,
      reasons: [],
      activity: {}
    };
  }

  const products = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM products
    WHERE
      user_id = $1
      AND created_at >= NOW() - INTERVAL '10 minutes'
    `,
    [id]
  );

  const services = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM services
    WHERE
      user_id = $1
      AND created_at >= NOW() - INTERVAL '10 minutes'
    `,
    [id]
  );

  const reports = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM reports
    WHERE
      reporter_id = $1
      AND created_at >= NOW() - INTERVAL '30 minutes'
    `,
    [id]
  );

  const messages = await pool.query(
    `
    SELECT COUNT(*)::int AS count
    FROM messages
    WHERE
      sender_id = $1
      AND created_at >= NOW() - INTERVAL '10 minutes'
    `,
    [id]
  );

  const activity = {
    products_10min:
      products.rows[0].count,

    services_10min:
      services.rows[0].count,

    reports_30min:
      reports.rows[0].count,

    messages_10min:
      messages.rows[0].count
  };

  const reasons = [];

  if (activity.products_10min >= 5) {
    reasons.push(
      "Plusieurs produits ont été créés rapidement."
    );
  }

  if (activity.services_10min >= 5) {
    reasons.push(
      "Plusieurs services ont été créés rapidement."
    );
  }

  if (activity.reports_30min >= 10) {
    reasons.push(
      "Nombre élevé de signalements envoyés."
    );
  }

  if (activity.messages_10min >= 50) {
    reasons.push(
      "Nombre très élevé de messages envoyés rapidement."
    );
  }

  return {
    suspicious: reasons.length > 0,
    reasons,
    activity
  };
}


// ======================================================
// CONTRÔLE AUTOMATIQUE D'UN UTILISATEUR
// ======================================================

async function autoCheckUser(userId) {

  try {

    const id = Number(userId);

    if (!id || Number.isNaN(id)) {

      return {
        checked: false,
        suspicious: false
      };
    }

    const result = await pool.query(
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

    if (!result.rows.length) {

      return {
        checked: false,
        suspicious: false
      };
    }

    const user = result.rows[0];

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
      message: analysis.reasons.join(" "),
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
      "Erreur contrôle utilisateur :",
      error
    );

    return {
      checked: false,
      suspicious: false,
      error: true
    };
  }
}

// ======================================================
// PART 3 — AUTHENTIFICATION
// ======================================================


// ======================================================
// REGISTER
// ======================================================

app.post("/api/register", async (req, res) => {

  try {

    const name = clean(
      req.body.name,
      150
    );

    const email = normalizeEmail(
      req.body.email
    );

    const password = String(
      req.body.password || ""
    );

    const whatsapp = clean(
      req.body.whatsapp,
      50
    );


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


    const existing = await pool.query(
      `
      SELECT id
      FROM users
      WHERE LOWER(email) = $1
      LIMIT 1
      `,
      [email]
    );


    if (existing.rows.length > 0) {

      return res.status(409).json({
        statut: "erreur",
        message:
          "Cette adresse email est déjà utilisée."
      });
    }


    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );


    const result = await pool.query(
      `
      INSERT INTO users
      (
        name,
        email,
        password,
        whatsapp,
        role,
        status,
        verified
      )
      VALUES
      (
        $1,
        $2,
        $3,
        $4,
        'user',
        'active',
        FALSE
      )
      RETURNING
        id,
        name,
        email,
        whatsapp,
        role,
        status,
        verified,
        created_at
      `,
      [
        name,
        email,
        passwordHash,
        whatsapp
      ]
    );


    const user =
      result.rows[0];


    await pool.query(
      `
      INSERT INTO notifications
      (
        user_id,
        type,
        title,
        message
      )
      VALUES
      (
        $1,
        'account',
        'Bienvenue sur HELPY',
        'Votre compte HELPY a été créé avec succès.'
      )
      `,
      [user.id]
    );


    // Vérification automatique
    await autoCheckUser(
      user.id
    );


    return res.status(201).json({

      statut: "ok",

      message:
        "Compte créé avec succès.",

      user:
        publicUser(user)

    });


  } catch (error) {

    return sendServerError(
      res,
      error
    );
  }
});


// ======================================================
// LOGIN
// ======================================================

app.post("/api/login", async (req, res) => {

  try {

    const email =
      normalizeEmail(
        req.body.email
      );

    const password =
      String(
        req.body.password || ""
      );


    if (
      !email ||
      !password
    ) {

      return res.status(400).json({
        statut: "erreur",
        message:
          "Email et mot de passe sont obligatoires."
      });
    }


    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE LOWER(email) = $1
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


    if (
      user.status !== "active"
    ) {

      return res.status(403).json({
        statut: "erreur",
        message:
          "Ce compte n'est pas actif."
      });
    }


    // Contrôle automatique
    await autoCheckUser(
      user.id
    );


    return res.json({

      statut: "ok",

      message:
        "Connexion réussie.",

      user:
        publicUser(user)

    });


  } catch (error) {

    return sendServerError(
      res,
      error
    );
  }
});


// ======================================================
// RÉCUPÉRER UN UTILISATEUR
// ======================================================

app.get(
  "/api/users/:id",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);


      if (
        !id ||
        Number.isNaN(id)
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
            whatsapp,
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


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Utilisateur introuvable."
        });
      }


      return res.json({

        statut: "ok",

        user:
          publicUser(
            result.rows[0]
          )

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// MODIFIER PROFIL COMPLET
// ======================================================

app.put(
  "/api/users/:id",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      if (
        !id ||
        Number.isNaN(id)
      ) {

        return res.status(400).json({

          statut: "erreur",

          message:
            "Utilisateur invalide."

        });

      }


      const name =
        clean(
          req.body.name,
          150
        );


      const phone =
        clean(
          req.body.phone ||
          req.body.telephone,
          50
        );


      const whatsapp =
        clean(
          req.body.whatsapp ||
          req.body.whatsapp_number ||
          phone,
          50
        );


      const country =
        clean(
          req.body.country ||
          req.body.pays,
          120
        );


      const city =
        clean(
          req.body.city ||
          req.body.ville,
          120
        );


      const description =
        clean(
          req.body.description ||
          req.body.bio,
          5000
        );


      const profilePhoto =
        clean(
          req.body.profile_photo ||
          req.body.profilePhoto ||
          req.body.avatar ||
          "",
          9000000
        );


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

            country = $4,

            city = $5,

            description = $6,

            profile_photo = $7

          WHERE id = $8

          RETURNING
            id,
            name,
            email,
            phone,
            whatsapp,
            country,
            city,
            description,
            profile_photo,
            role,
            status,
            verified,
            created_at
          `,

          [
            name,
            phone,
            whatsapp,
            country,
            city,
            description,
            profilePhoto,
            id
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({

          statut: "erreur",

          message:
            "Utilisateur introuvable."

        });

      }


      const user =
        result.rows[0];


      return res.json({

        statut: "ok",

        message:
          "Profil mis à jour avec succès.",

        user:
          publicUser(user)

      });


    } catch (error) {

      console.error(
        "Erreur modification profil :",
        error
      );


      return res.status(500).json({

        statut: "erreur",

        message:
          "Impossible de modifier le profil."

      });

    }

  }
);


// ======================================================
// CHANGER MOT DE PASSE
// ======================================================

app.put(
  "/api/users/:id/password",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const currentPassword =
        String(
          req.body.current_password || ""
        );

      const newPassword =
        String(
          req.body.new_password || ""
        );


      if (
        !id ||
        !currentPassword ||
        !newPassword
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Informations incomplètes."
        });
      }


      if (
        newPassword.length < 6
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Le nouveau mot de passe doit contenir au moins 6 caractères."
        });
      }


      const result =
        await pool.query(
          `
          SELECT
            id,
            password
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [id]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Utilisateur introuvable."
        });
      }


      const valid =
        await bcrypt.compare(
          currentPassword,
          result.rows[0].password
        );


      if (!valid) {

        return res.status(401).json({
          statut: "erreur",
          message:
            "Ancien mot de passe incorrect."
        });
      }


      const newHash =
        await bcrypt.hash(
          newPassword,
          12
        );


      await pool.query(
        `
        UPDATE users
        SET password = $1
        WHERE id = $2
        `,
        [
          newHash,
          id
        ]
      );


      return res.json({

        statut: "ok",

        message:
          "Mot de passe modifié avec succès."

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);

// ======================================================
// PART 4 — PRODUITS
// ======================================================


// ======================================================
// LISTE DES PRODUITS
// ======================================================

app.get("/api/products", async (req, res) => {

  try {

    const search =
      clean(req.query.search, 150);

    const category =
      clean(req.query.category, 100);

    const location =
      clean(req.query.location, 150);

    const params = [];
    const conditions = [
      "p.status = 'active'"
    ];

    if (search) {

      params.push(`%${search}%`);

      conditions.push(`
        (
          p.title ILIKE $${params.length}
          OR p.description ILIKE $${params.length}
          OR p.category ILIKE $${params.length}
        )
      `);
    }

    if (category) {

      params.push(category);

      conditions.push(
        `p.category ILIKE $${params.length}`
      );
    }

    if (location) {

      params.push(`%${location}%`);

      conditions.push(
        `p.location ILIKE $${params.length}`
      );
    }


    const result =
      await pool.query(
        `
        SELECT
          p.id,
          p.user_id,
          p.title,
          p.description,
          p.price,
          p.currency,
          p.category,
          p.location,
          p.whatsapp,
          p.images,
          p.status,
          p.created_at,
          u.name AS seller_name,
          u.verified AS seller_verified
        FROM products p
        LEFT JOIN users u
          ON u.id = p.user_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY p.created_at DESC
        `,
        params
      );


    return res.json({

      statut: "ok",

      produits:
        result.rows

    });


  } catch (error) {

    return sendServerError(
      res,
      error
    );
  }
});


// ======================================================
// RÉCUPÉRER UN PRODUIT
// ======================================================

app.get(
  "/api/products/:id",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);


      if (
        !id ||
        Number.isNaN(id)
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Identifiant produit invalide."
        });
      }


      const result =
        await pool.query(
          `
          SELECT
            p.id,
            p.user_id,
            p.title,
            p.description,
            p.price,
            p.currency,
            p.category,
            p.location,
            p.whatsapp,
            p.images,
            p.status,
            p.created_at,
            p.updated_at,
            u.name AS seller_name,
            u.email AS seller_email,
            u.verified AS seller_verified
          FROM products p
          LEFT JOIN users u
            ON u.id = p.user_id
          WHERE p.id = $1
          LIMIT 1
          `,
          [id]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Produit introuvable."
        });
      }


      return res.json({

        statut: "ok",

        produit:
          result.rows[0]

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// AJOUTER UN PRODUIT
// ======================================================

app.post(
  "/api/products",
  async (req, res) => {

    try {

      const userId =
        Number(
          req.body.user_id
        );

      const title =
        clean(
          req.body.title,
          200
        );

      const description =
        clean(
          req.body.description,
          5000
        );

      const price =
        numberOrNull(
          req.body.price
        );

      const currency =
        clean(
          req.body.currency || "USD",
          10
        ).toUpperCase();

      const category =
        clean(
          req.body.category,
          100
        );

      const location =
        clean(
          req.body.location,
          150
        );

      const whatsapp =
        clean(
          req.body.whatsapp,
          50
        );

      let images =
        req.body.images || [];


      if (
        !Array.isArray(images)
      ) {

        images = [
          images
        ];
      }


      images =
        images
          .map(item =>
            clean(item, 1000)
          )
          .filter(Boolean)
          .slice(0, 10);


      if (
        !userId ||
        !title ||
        !category ||
        !whatsapp
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Utilisateur, titre, catégorie et WhatsApp sont obligatoires."
        });
      }


      const userResult =
        await pool.query(
          `
          SELECT
            id,
            name,
            status,
            role
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [userId]
        );


      if (
        userResult.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Utilisateur introuvable."
        });
      }


      if (
        userResult.rows[0].status !==
        "active"
      ) {

        return res.status(403).json({
          statut: "erreur",
          message:
            "Ce compte n'est pas actif."
        });
      }


      const moderation =
        autoModerateListing({

          title,
          description,
          category,
          whatsapp

        });


      const result =
        await pool.query(
          `
          INSERT INTO products
          (
            user_id,
            title,
            description,
            price,
            currency,
            category,
            location,
            whatsapp,
            images,
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
            $10
          )
          RETURNING *
          `,
          [
            userId,
            title,
            description,
            price,
            currency,
            category,
            location,
            whatsapp,
            JSON.stringify(images),
            moderation.status
          ]
        );


      const product =
        result.rows[0];


      await pool.query(
        `
        INSERT INTO notifications
        (
          user_id,
          type,
          title,
          message
        )
        VALUES
        (
          $1,
          'product',
          $2,
          $3
        )
        `,
        [
          userId,
          moderation.status === "approved"
            ? "Produit publié"
            : "Produit en vérification",
          moderation.reason
            ? `Votre produit "${title}" a été envoyé en vérification.`
            : `Votre produit "${title}" est maintenant publié.`
        ]
      );


      if (
        moderation.status === "pending"
      ) {

        await createAdminAlert(
          `Produit en vérification : ${title}`,
          `Le produit créé par l'utilisateur ${userId} nécessite une vérification automatique.`
        );
      }


      await autoCheckUser(
        userId
      );


      return res.status(201).json({

        statut: "ok",

        message:
          moderation.status === "approved"
            ? "Produit ajouté avec succès."
            : "Produit ajouté et placé en vérification.",

        produit:
          product

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// MODIFIER UN PRODUIT
// ======================================================

app.put(
  "/api/products/:id",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const userId =
        Number(req.body.user_id);

      const title =
        clean(
          req.body.title,
          200
        );

      const description =
        clean(
          req.body.description,
          5000
        );

      const price =
        numberOrNull(
          req.body.price
        );

      const currency =
        clean(
          req.body.currency || "USD",
          10
        ).toUpperCase();

      const category =
        clean(
          req.body.category,
          100
        );

      const location =
        clean(
          req.body.location,
          150
        );

      const whatsapp =
        clean(
          req.body.whatsapp,
          50
        );


      if (
        !id ||
        !userId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Produit ou utilisateur invalide."
        });
      }


      if (
        !title ||
        !category ||
        !whatsapp
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Titre, catégorie et WhatsApp sont obligatoires."
        });
      }


      const owner =
        await pool.query(
          `
          SELECT
            id,
            user_id
          FROM products
          WHERE id = $1
          LIMIT 1
          `,
          [id]
        );


      if (
        owner.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Produit introuvable."
        });
      }


      if (
        Number(owner.rows[0].user_id) !==
        userId
      ) {

        return res.status(403).json({
          statut: "erreur",
          message:
            "Vous n'êtes pas autorisé à modifier ce produit."
        });
      }


      const moderation =
        autoModerateListing({

          title,
          description,
          category,
          whatsapp

        });


      const result =
        await pool.query(
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
            status = $8,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $9
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
            moderation.status,
            id
          ]
        );


      return res.json({

        statut: "ok",

        message:
          "Produit mis à jour avec succès.",

        produit:
          result.rows[0]

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// SUPPRIMER UN PRODUIT
// ======================================================

app.delete(
  "/api/products/:id",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const userId =
        Number(req.body.user_id);


      if (
        !id ||
        !userId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Informations invalides."
        });
      }


      const result =
        await pool.query(
          `
          DELETE FROM products
          WHERE id = $1
          AND user_id = $2
          RETURNING id
          `,
          [
            id,
            userId
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Produit introuvable ou non autorisé."
        });
      }


      return res.json({

        statut: "ok",

        message:
          "Produit supprimé avec succès."

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);

// ======================================================
// PART 5 — SERVICES
// ======================================================


// ======================================================
// LISTE DES SERVICES
// ======================================================

app.get("/api/services", async (req, res) => {

  try {

    const search =
      clean(req.query.search, 150);

    const category =
      clean(req.query.category, 100);

    const location =
      clean(req.query.location, 150);

    const params = [];

    const conditions = [
      "s.status = 'active'"
    ];


    if (search) {

      params.push(`%${search}%`);

      conditions.push(`
        (
          s.title ILIKE $${params.length}
          OR s.description ILIKE $${params.length}
          OR s.category ILIKE $${params.length}
        )
      `);
    }


    if (category) {

      params.push(category);

      conditions.push(
        `s.category ILIKE $${params.length}`
      );
    }


    if (location) {

      params.push(`%${location}%`);

      conditions.push(
        `s.location ILIKE $${params.length}`
      );
    }


    const result =
      await pool.query(
        `
        SELECT
          s.id,
          s.user_id,
          s.title,
          s.description,
          s.price,
          s.currency,
          s.category,
          s.location,
          s.whatsapp,
          s.images,
          s.status,
          s.created_at,
          s.updated_at,
          u.name AS provider_name,
          u.verified AS provider_verified
        FROM services s
        LEFT JOIN users u
          ON u.id = s.user_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY s.created_at DESC
        `,
        params
      );


    return res.json({

      statut: "ok",

      services:
        result.rows

    });


  } catch (error) {

    return sendServerError(
      res,
      error
    );
  }
});


// ======================================================
// RÉCUPÉRER UN SERVICE
// ======================================================

app.get(
  "/api/services/:id",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);


      if (
        !id ||
        Number.isNaN(id)
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Identifiant service invalide."
        });
      }


      const result =
        await pool.query(
          `
          SELECT
            s.id,
            s.user_id,
            s.title,
            s.description,
            s.price,
            s.currency,
            s.category,
            s.location,
            s.whatsapp,
            s.images,
            s.status,
            s.created_at,
            s.updated_at,
            u.name AS provider_name,
            u.email AS provider_email,
            u.verified AS provider_verified
          FROM services s
          LEFT JOIN users u
            ON u.id = s.user_id
          WHERE s.id = $1
          LIMIT 1
          `,
          [id]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Service introuvable."
        });
      }


      return res.json({

        statut: "ok",

        service:
          result.rows[0]

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// AJOUTER UN SERVICE
// ======================================================

app.post(
  "/api/services",
  async (req, res) => {

    try {

      const userId =
        Number(
          req.body.user_id
        );

      const title =
        clean(
          req.body.title,
          200
        );

      const description =
        clean(
          req.body.description,
          5000
        );

      const price =
        numberOrNull(
          req.body.price
        );

      const currency =
        clean(
          req.body.currency || "USD",
          10
        ).toUpperCase();

      const category =
        clean(
          req.body.category,
          100
        );

      const location =
        clean(
          req.body.location,
          150
        );

      const whatsapp =
        clean(
          req.body.whatsapp,
          50
        );

      let images =
        req.body.images || [];


      if (
        !Array.isArray(images)
      ) {

        images = [
          images
        ];
      }


      images =
        images
          .map(item =>
            clean(item, 1000)
          )
          .filter(Boolean)
          .slice(0, 10);


      if (
        !userId ||
        !title ||
        !category ||
        !whatsapp
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Utilisateur, titre, catégorie et WhatsApp sont obligatoires."
        });
      }


      const userResult =
        await pool.query(
          `
          SELECT
            id,
            status,
            role
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [userId]
        );


      if (
        userResult.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Utilisateur introuvable."
        });
      }


      if (
        userResult.rows[0].status !==
        "active"
      ) {

        return res.status(403).json({
          statut: "erreur",
          message:
            "Ce compte n'est pas actif."
        });
      }


      const moderation =
        autoModerateListing({

          title,
          description,
          category,
          whatsapp

        });


      const result =
        await pool.query(
          `
          INSERT INTO services
          (
            user_id,
            title,
            description,
            price,
            currency,
            category,
            location,
            whatsapp,
            images,
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
            $10
          )
          RETURNING *
          `,
          [
            userId,
            title,
            description,
            price,
            currency,
            category,
            location,
            whatsapp,
            JSON.stringify(images),
            moderation.status
          ]
        );


      const service =
        result.rows[0];


      await pool.query(
        `
        INSERT INTO notifications
        (
          user_id,
          type,
          title,
          message
        )
        VALUES
        (
          $1,
          'service',
          $2,
          $3
        )
        `,
        [
          userId,

          moderation.status === "approved"
            ? "Service publié"
            : "Service en vérification",

          moderation.status === "approved"
            ? `Votre service "${title}" est maintenant publié.`
            : `Votre service "${title}" a été placé en vérification.`
        ]
      );


      if (
        moderation.status === "pending"
      ) {

        await createAdminAlert(
          `Service en vérification : ${title}`,
          `Le service créé par l'utilisateur ${userId} nécessite une vérification automatique.`
        );
      }


      await autoCheckUser(
        userId
      );


      return res.status(201).json({

        statut: "ok",

        message:
          moderation.status === "approved"
            ? "Service ajouté avec succès."
            : "Service ajouté et placé en vérification.",

        service:
          service

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// MODIFIER UN SERVICE
// ======================================================

app.put(
  "/api/services/:id",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const userId =
        Number(req.body.user_id);

      const title =
        clean(
          req.body.title,
          200
        );

      const description =
        clean(
          req.body.description,
          5000
        );

      const price =
        numberOrNull(
          req.body.price
        );

      const currency =
        clean(
          req.body.currency || "USD",
          10
        ).toUpperCase();

      const category =
        clean(
          req.body.category,
          100
        );

      const location =
        clean(
          req.body.location,
          150
        );

      const whatsapp =
        clean(
          req.body.whatsapp,
          50
        );


      if (
        !id ||
        !userId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Service ou utilisateur invalide."
        });
      }


      if (
        !title ||
        !category ||
        !whatsapp
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Titre, catégorie et WhatsApp sont obligatoires."
        });
      }


      const owner =
        await pool.query(
          `
          SELECT
            id,
            user_id
          FROM services
          WHERE id = $1
          LIMIT 1
          `,
          [id]
        );


      if (
        owner.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Service introuvable."
        });
      }


      if (
        Number(owner.rows[0].user_id) !==
        userId
      ) {

        return res.status(403).json({
          statut: "erreur",
          message:
            "Vous n'êtes pas autorisé à modifier ce service."
        });
      }


      const moderation =
        autoModerateListing({

          title,
          description,
          category,
          whatsapp

        });


      const result =
        await pool.query(
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
            status = $8,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $9
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
            moderation.status,
            id
          ]
        );


      return res.json({

        statut: "ok",

        message:
          "Service mis à jour avec succès.",

        service:
          result.rows[0]

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// SUPPRIMER UN SERVICE
// ======================================================

app.delete(
  "/api/services/:id",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const userId =
        Number(req.body.user_id);


      if (
        !id ||
        !userId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Informations invalides."
        });
      }


      const result =
        await pool.query(
          `
          DELETE FROM services
          WHERE id = $1
          AND user_id = $2
          RETURNING id
          `,
          [
            id,
            userId
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Service introuvable ou non autorisé."
        });
      }


      return res.json({

        statut: "ok",

        message:
          "Service supprimé avec succès."

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);

// ======================================================
// PART 6 — ENTREPRISES / BUSINESSES
// ======================================================


// ======================================================
// LISTE DES ENTREPRISES
// ======================================================

app.get("/api/businesses", async (req, res) => {

  try {

    const search =
      clean(req.query.search, 150);

    const category =
      clean(req.query.category, 100);

    const location =
      clean(req.query.location, 150);

    const params = [];

    const conditions = [
      "b.status = 'active'"
    ];


    if (search) {

      params.push(`%${search}%`);

      conditions.push(`
        (
          b.name ILIKE $${params.length}
          OR b.description ILIKE $${params.length}
          OR b.category ILIKE $${params.length}
        )
      `);
    }


    if (category) {

      params.push(category);

      conditions.push(
        `b.category ILIKE $${params.length}`
      );
    }


    if (location) {

      params.push(`%${location}%`);

      conditions.push(
        `b.location ILIKE $${params.length}`
      );
    }


    const result =
      await pool.query(
        `
        SELECT
          b.id,
          b.user_id,
          b.name,
          b.description,
          b.category,
          b.location,
          b.address,
          b.phone,
          b.whatsapp,
          b.email,
          b.website,
          b.logo,
          b.cover_image,
          b.status,
          b.created_at,
          b.updated_at,
          u.name AS owner_name,
          u.verified AS owner_verified
        FROM businesses b
        LEFT JOIN users u
          ON u.id = b.user_id
        WHERE ${conditions.join(" AND ")}
        ORDER BY b.created_at DESC
        `,
        params
      );


    return res.json({

      statut: "ok",

      entreprises:
        result.rows

    });


  } catch (error) {

    return sendServerError(
      res,
      error
    );
  }
});


// ======================================================
// RÉCUPÉRER UNE ENTREPRISE
// ======================================================

app.get(
  "/api/businesses/:id",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);


      if (
        !id ||
        Number.isNaN(id)
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Identifiant entreprise invalide."
        });
      }


      const result =
        await pool.query(
          `
          SELECT
            b.id,
            b.user_id,
            b.name,
            b.description,
            b.category,
            b.location,
            b.address,
            b.phone,
            b.whatsapp,
            b.email,
            b.website,
            b.logo,
            b.cover_image,
            b.status,
            b.created_at,
            b.updated_at,
            u.name AS owner_name,
            u.email AS owner_email,
            u.verified AS owner_verified
          FROM businesses b
          LEFT JOIN users u
            ON u.id = b.user_id
          WHERE b.id = $1
          LIMIT 1
          `,
          [id]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Entreprise introuvable."
        });
      }


      return res.json({

        statut: "ok",

        entreprise:
          result.rows[0]

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// AJOUTER UNE ENTREPRISE
// ======================================================

app.post(
  "/api/businesses",
  async (req, res) => {

    try {

      const userId =
        Number(
          req.body.user_id
        );

      const name =
        clean(
          req.body.name,
          200
        );

      const description =
        clean(
          req.body.description,
          5000
        );

      const category =
        clean(
          req.body.category,
          100
        );

      const location =
        clean(
          req.body.location,
          150
        );

      const address =
        clean(
          req.body.address,
          300
        );

      const phone =
        clean(
          req.body.phone,
          50
        );

      const whatsapp =
        clean(
          req.body.whatsapp,
          50
        );

      const email =
        normalizeEmail(
          req.body.email
        );

      const website =
        clean(
          req.body.website,
          500
        );

      const logo =
        clean(
          req.body.logo,
          2000
        );

      const coverImage =
        clean(
          req.body.cover_image,
          2000
        );


      if (
        !userId ||
        !name ||
        !category ||
        !whatsapp
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Utilisateur, nom, catégorie et WhatsApp sont obligatoires."
        });
      }


      const userResult =
        await pool.query(
          `
          SELECT
            id,
            status,
            role
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [userId]
        );


      if (
        userResult.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Utilisateur introuvable."
        });
      }


      if (
        userResult.rows[0].status !==
        "active"
      ) {

        return res.status(403).json({
          statut: "erreur",
          message:
            "Ce compte n'est pas actif."
        });
      }


      const moderation =
        autoModerateListing({

          title: name,

          description,

          category,

          whatsapp

        });


      const result =
        await pool.query(
          `
          INSERT INTO businesses
          (
            user_id,
            name,
            description,
            category,
            location,
            address,
            phone,
            whatsapp,
            email,
            website,
            logo,
            cover_image,
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
            $12,
            $13
          )
          RETURNING *
          `,
          [
            userId,
            name,
            description,
            category,
            location,
            address,
            phone,
            whatsapp,
            email || null,
            website,
            logo,
            coverImage,
            moderation.status
          ]
        );


      const business =
        result.rows[0];


      await pool.query(
        `
        INSERT INTO notifications
        (
          user_id,
          type,
          title,
          message
        )
        VALUES
        (
          $1,
          'business',
          $2,
          $3
        )
        `,
        [
          userId,

          moderation.status === "approved"
            ? "Entreprise publiée"
            : "Entreprise en vérification",

          moderation.status === "approved"
            ? `Votre entreprise "${name}" est maintenant publiée sur HELPY.`
            : `Votre entreprise "${name}" a été placée en vérification.`
        ]
      );


      if (
        moderation.status === "pending"
      ) {

        await createAdminAlert(
          `Entreprise en vérification : ${name}`,
          `L'entreprise créée par l'utilisateur ${userId} nécessite une vérification automatique.`
        );
      }


      await autoCheckUser(
        userId
      );


      return res.status(201).json({

        statut: "ok",

        message:
          moderation.status === "approved"
            ? "Entreprise créée avec succès."
            : "Entreprise créée et placée en vérification.",

        entreprise:
          business

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// MODIFIER UNE ENTREPRISE
// ======================================================

app.put(
  "/api/businesses/:id",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const userId =
        Number(req.body.user_id);

      const name =
        clean(
          req.body.name,
          200
        );

      const description =
        clean(
          req.body.description,
          5000
        );

      const category =
        clean(
          req.body.category,
          100
        );

      const location =
        clean(
          req.body.location,
          150
        );

      const address =
        clean(
          req.body.address,
          300
        );

      const phone =
        clean(
          req.body.phone,
          50
        );

      const whatsapp =
        clean(
          req.body.whatsapp,
          50
        );

      const email =
        normalizeEmail(
          req.body.email
        );

      const website =
        clean(
          req.body.website,
          500
        );

      const logo =
        clean(
          req.body.logo,
          2000
        );

      const coverImage =
        clean(
          req.body.cover_image,
          2000
        );


      if (
        !id ||
        !userId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Entreprise ou utilisateur invalide."
        });
      }


      if (
        !name ||
        !category ||
        !whatsapp
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Nom, catégorie et WhatsApp sont obligatoires."
        });
      }


      const owner =
        await pool.query(
          `
          SELECT
            id,
            user_id
          FROM businesses
          WHERE id = $1
          LIMIT 1
          `,
          [id]
        );


      if (
        owner.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Entreprise introuvable."
        });
      }


      if (
        Number(owner.rows[0].user_id) !==
        userId
      ) {

        return res.status(403).json({
          statut: "erreur",
          message:
            "Vous n'êtes pas autorisé à modifier cette entreprise."
        });
      }


      const moderation =
        autoModerateListing({

          title: name,

          description,

          category,

          whatsapp

        });


      const result =
        await pool.query(
          `
          UPDATE businesses
          SET
            name = $1,
            description = $2,
            category = $3,
            location = $4,
            address = $5,
            phone = $6,
            whatsapp = $7,
            email = $8,
            website = $9,
            logo = $10,
            cover_image = $11,
            status = $12,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $13
          RETURNING *
          `,
          [
            name,
            description,
            category,
            location,
            address,
            phone,
            whatsapp,
            email || null,
            website,
            logo,
            coverImage,
            moderation.status,
            id
          ]
        );


      return res.json({

        statut: "ok",

        message:
          "Entreprise mise à jour avec succès.",

        entreprise:
          result.rows[0]

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// SUPPRIMER UNE ENTREPRISE
// ======================================================

app.delete(
  "/api/businesses/:id",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const userId =
        Number(req.body.user_id);


      if (
        !id ||
        !userId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Informations invalides."
        });
      }


      const result =
        await pool.query(
          `
          DELETE FROM businesses
          WHERE id = $1
          AND user_id = $2
          RETURNING id
          `,
          [
            id,
            userId
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Entreprise introuvable ou non autorisée."
        });
      }


      return res.json({

        statut: "ok",

        message:
          "Entreprise supprimée avec succès."

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);

// ======================================================
// PART 7 — NOTIFICATIONS + FAVORIS
// ======================================================


// ======================================================
// NOTIFICATIONS UTILISATEUR
// ======================================================

app.get(
  "/api/notifications/:userId",
  async (req, res) => {

    try {

      const userId =
        Number(req.params.userId);


      if (
        !userId ||
        Number.isNaN(userId)
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

        notifications:
          result.rows

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// NOMBRE DE NOTIFICATIONS NON LUES
// ======================================================

app.get(
  "/api/notifications/:userId/unread-count",
  async (req, res) => {

    try {

      const userId =
        Number(req.params.userId);


      if (
        !userId ||
        Number.isNaN(userId)
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
          SELECT COUNT(*)::INTEGER AS count
          FROM notifications
          WHERE user_id = $1
          AND is_read = FALSE
          `,
          [userId]
        );


      return res.json({

        statut: "ok",

        count:
          result.rows[0].count

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// MARQUER UNE NOTIFICATION COMME LUE
// ======================================================

app.put(
  "/api/notifications/:id/read",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const userId =
        Number(req.body.user_id);


      if (
        !id ||
        !userId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Informations invalides."
        });
      }


      const result =
        await pool.query(
          `
          UPDATE notifications
          SET is_read = TRUE
          WHERE id = $1
          AND user_id = $2
          RETURNING *
          `,
          [
            id,
            userId
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Notification introuvable."
        });
      }


      return res.json({

        statut: "ok",

        notification:
          result.rows[0]

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// MARQUER TOUTES LES NOTIFICATIONS COMME LUES
// ======================================================

app.put(
  "/api/notifications/read-all",
  async (req, res) => {

    try {

      const userId =
        Number(req.body.user_id);


      if (
        !userId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Utilisateur invalide."
        });
      }


      const result =
        await pool.query(
          `
          UPDATE notifications
          SET is_read = TRUE
          WHERE user_id = $1
          AND is_read = FALSE
          `,
          [userId]
        );


      return res.json({

        statut: "ok",

        message:
          "Toutes les notifications ont été marquées comme lues.",

        updated:
          result.rowCount

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// SUPPRIMER UNE NOTIFICATION
// ======================================================

app.delete(
  "/api/notifications/:id",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const userId =
        Number(req.body.user_id);


      if (
        !id ||
        !userId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Informations invalides."
        });
      }


      const result =
        await pool.query(
          `
          DELETE FROM notifications
          WHERE id = $1
          AND user_id = $2
          RETURNING id
          `,
          [
            id,
            userId
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Notification introuvable."
        });
      }


      return res.json({

        statut: "ok",

        message:
          "Notification supprimée."

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// AJOUTER AUX FAVORIS
// ======================================================

app.post(
  "/api/favorites",
  async (req, res) => {

    try {

      const userId =
        Number(req.body.user_id);

      const itemType =
        clean(
          req.body.item_type,
          30
        ).toLowerCase();

      const itemId =
        Number(req.body.item_id);


      if (
        !userId ||
        !itemId ||
        !itemType
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Utilisateur, type et élément sont obligatoires."
        });
      }


      const allowedTypes = [
        "product",
        "service",
        "business"
      ];


      if (
        !allowedTypes.includes(
          itemType
        )
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Type de favori invalide."
        });
      }


      const user =
        await pool.query(
          `
          SELECT id
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [userId]
        );


      if (
        user.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Utilisateur introuvable."
        });
      }


      let tableName = "";


      if (
        itemType === "product"
      ) {
        tableName = "products";
      }

      if (
        itemType === "service"
      ) {
        tableName = "services";
      }

      if (
        itemType === "business"
      ) {
        tableName = "businesses";
      }


      const item =
        await pool.query(
          `
          SELECT id
          FROM ${tableName}
          WHERE id = $1
          LIMIT 1
          `,
          [itemId]
        );


      if (
        item.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Élément introuvable."
        });
      }


      const result =
        await pool.query(
          `
          INSERT INTO favorites
          (
            user_id,
            item_type,
            item_id
          )
          VALUES
          (
            $1,
            $2,
            $3
          )
          ON CONFLICT
          (
            user_id,
            item_type,
            item_id
          )
          DO NOTHING
          RETURNING *
          `,
          [
            userId,
            itemType,
            itemId
          ]
        );


      return res.status(201).json({

        statut: "ok",

        message:
          result.rows.length > 0
            ? "Ajouté aux favoris."
            : "Cet élément est déjà dans vos favoris.",

        favori:
          result.rows[0] || null

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// LISTE DES FAVORIS
// ======================================================

app.get(
  "/api/favorites/:userId",
  async (req, res) => {

    try {

      const userId =
        Number(req.params.userId);


      if (
        !userId ||
        Number.isNaN(userId)
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
            f.id,
            f.user_id,
            f.item_type,
            f.item_id,
            f.created_at,

            CASE
              WHEN f.item_type = 'product'
                THEN p.title
              WHEN f.item_type = 'service'
                THEN s.title
              WHEN f.item_type = 'business'
                THEN b.name
            END AS item_name

          FROM favorites f

          LEFT JOIN products p
            ON f.item_type = 'product'
            AND f.item_id = p.id

          LEFT JOIN services s
            ON f.item_type = 'service'
            AND f.item_id = s.id

          LEFT JOIN businesses b
            ON f.item_type = 'business'
            AND f.item_id = b.id

          WHERE f.user_id = $1

          ORDER BY f.created_at DESC
          `,
          [userId]
        );


      return res.json({

        statut: "ok",

        favoris:
          result.rows

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// RETIRER UN FAVORI
// ======================================================

app.delete(
  "/api/favorites",
  async (req, res) => {

    try {

      const userId =
        Number(req.body.user_id);

      const itemType =
        clean(
          req.body.item_type,
          30
        ).toLowerCase();

      const itemId =
        Number(req.body.item_id);


      if (
        !userId ||
        !itemId ||
        !itemType
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Informations invalides."
        });
      }


      const result =
        await pool.query(
          `
          DELETE FROM favorites
          WHERE user_id = $1
          AND item_type = $2
          AND item_id = $3
          RETURNING id
          `,
          [
            userId,
            itemType,
            itemId
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Favori introuvable."
        });
      }


      return res.json({

        statut: "ok",

        message:
          "Retiré des favoris."

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);

// ======================================================
// PART 8 — MESSAGES + AVIS / REVIEWS
// ======================================================


// ======================================================
// ENVOYER UN MESSAGE
// ======================================================

app.post(
  "/api/messages",
  async (req, res) => {

    try {

      const senderId =
        Number(req.body.sender_id);

      const receiverId =
        Number(req.body.receiver_id);

      const content =
        clean(
          req.body.content,
          5000
        );


      if (
        !senderId ||
        !receiverId ||
        !content
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Expéditeur, destinataire et message sont obligatoires."
        });
      }


      if (
        senderId === receiverId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Vous ne pouvez pas vous envoyer un message à vous-même."
        });
      }


      const users =
        await pool.query(
          `
          SELECT
            id,
            status
          FROM users
          WHERE id IN ($1, $2)
          `,
          [
            senderId,
            receiverId
          ]
        );


      if (
        users.rows.length !== 2
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Utilisateur introuvable."
        });
      }


      const inactive =
        users.rows.some(
          user =>
            user.status !== "active"
        );


      if (inactive) {

        return res.status(403).json({
          statut: "erreur",
          message:
            "Un des comptes n'est pas actif."
        });
      }


      const result =
        await pool.query(
          `
          INSERT INTO messages
          (
            sender_id,
            receiver_id,
            content
          )
          VALUES
          (
            $1,
            $2,
            $3
          )
          RETURNING *
          `,
          [
            senderId,
            receiverId,
            content
          ]
        );


      const message =
        result.rows[0];


      await pool.query(
        `
        INSERT INTO notifications
        (
          user_id,
          type,
          title,
          message
        )
        VALUES
        (
          $1,
          'message',
          'Nouveau message',
          'Vous avez reçu un nouveau message sur HELPY.'
        )
        `,
        [receiverId]
      );


      await autoCheckUser(
        senderId
      );


      return res.status(201).json({

        statut: "ok",

        message:
          "Message envoyé.",

        data:
          message

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// CONVERSATION ENTRE DEUX UTILISATEURS
// ======================================================

app.get(
  "/api/messages/:userId/:otherUserId",
  async (req, res) => {

    try {

      const userId =
        Number(req.params.userId);

      const otherUserId =
        Number(req.params.otherUserId);


      if (
        !userId ||
        !otherUserId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Identifiants invalides."
        });
      }


      const result =
        await pool.query(
          `
          SELECT
            m.id,
            m.sender_id,
            m.receiver_id,
            m.content,
            m.is_read,
            m.created_at,
            u.name AS sender_name
          FROM messages m
          LEFT JOIN users u
            ON u.id = m.sender_id
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
          [
            userId,
            otherUserId
          ]
        );


      return res.json({

        statut: "ok",

        messages:
          result.rows

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// LISTE DES CONVERSATIONS
// ======================================================

app.get(
  "/api/messages/:userId",
  async (req, res) => {

    try {

      const userId =
        Number(req.params.userId);


      if (
        !userId
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
          SELECT DISTINCT ON (other_user_id)

            other_user_id,

            other_user_name,

            content,

            created_at,

            unread_count

          FROM
          (
            SELECT

              CASE
                WHEN m.sender_id = $1
                  THEN m.receiver_id
                ELSE m.sender_id
              END AS other_user_id,

              CASE
                WHEN m.sender_id = $1
                  THEN receiver.name
                ELSE sender.name
              END AS other_user_name,

              m.content,

              m.created_at,

              (
                SELECT COUNT(*)::INTEGER
                FROM messages unread
                WHERE unread.sender_id =
                  CASE
                    WHEN m.sender_id = $1
                      THEN m.receiver_id
                    ELSE m.sender_id
                  END
                AND unread.receiver_id = $1
                AND unread.is_read = FALSE
              ) AS unread_count

            FROM messages m

            LEFT JOIN users sender
              ON sender.id = m.sender_id

            LEFT JOIN users receiver
              ON receiver.id = m.receiver_id

            WHERE
              m.sender_id = $1
              OR m.receiver_id = $1
          ) conversations

          ORDER BY
            other_user_id,
            created_at DESC
          `,
          [userId]
        );


      return res.json({

        statut: "ok",

        conversations:
          result.rows

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// NOMBRE DE MESSAGES NON LUS
// ======================================================

app.get(
  "/api/messages/:userId/unread-count",
  async (req, res) => {

    try {

      const userId =
        Number(req.params.userId);


      if (
        !userId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Utilisateur invalide."
        });
      }


      const result =
        await pool.query(
          `
          SELECT COUNT(*)::INTEGER AS count
          FROM messages
          WHERE receiver_id = $1
          AND is_read = FALSE
          `,
          [userId]
        );


      return res.json({

        statut: "ok",

        count:
          result.rows[0].count

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// MARQUER LES MESSAGES COMME LUS
// ======================================================

app.put(
  "/api/messages/read",
  async (req, res) => {

    try {

      const userId =
        Number(req.body.user_id);

      const otherUserId =
        Number(req.body.other_user_id);


      if (
        !userId ||
        !otherUserId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Informations invalides."
        });
      }


      const result =
        await pool.query(
          `
          UPDATE messages
          SET is_read = TRUE
          WHERE sender_id = $1
          AND receiver_id = $2
          AND is_read = FALSE
          `,
          [
            otherUserId,
            userId
          ]
        );


      return res.json({

        statut: "ok",

        message:
          "Messages marqués comme lus.",

        updated:
          result.rowCount

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// SUPPRIMER UN MESSAGE
// ======================================================

app.delete(
  "/api/messages/:id",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const userId =
        Number(req.body.user_id);


      if (
        !id ||
        !userId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Informations invalides."
        });
      }


      const result =
        await pool.query(
          `
          DELETE FROM messages
          WHERE id = $1
          AND sender_id = $2
          RETURNING id
          `,
          [
            id,
            userId
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Message introuvable ou non autorisé."
        });
      }


      return res.json({

        statut: "ok",

        message:
          "Message supprimé."

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// AJOUTER UN AVIS
// ======================================================

app.post(
  "/api/reviews",
  async (req, res) => {

    try {

      const userId =
        Number(req.body.user_id);

      const itemType =
        clean(
          req.body.item_type,
          30
        ).toLowerCase();

      const itemId =
        Number(req.body.item_id);

      const rating =
        Number(req.body.rating);

      const comment =
        clean(
          req.body.comment,
          3000
        );


      if (
        !userId ||
        !itemId ||
        !itemType ||
        !rating
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Utilisateur, élément et note sont obligatoires."
        });
      }


      if (
        rating < 1 ||
        rating > 5
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "La note doit être comprise entre 1 et 5."
        });
      }


      const allowedTypes = [
        "product",
        "service",
        "business"
      ];


      if (
        !allowedTypes.includes(
          itemType
        )
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Type d'avis invalide."
        });
      }


      let tableName = "";


      if (
        itemType === "product"
      ) {
        tableName = "products";
      }

      if (
        itemType === "service"
      ) {
        tableName = "services";
      }

      if (
        itemType === "business"
      ) {
        tableName = "businesses";
      }


      const item =
        await pool.query(
          `
          SELECT
            id,
            user_id
          FROM ${tableName}
          WHERE id = $1
          LIMIT 1
          `,
          [itemId]
        );


      if (
        item.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Élément introuvable."
        });
      }


      // Empêcher le propriétaire
      // de noter son propre élément.
      if (
        Number(item.rows[0].user_id) ===
        userId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Vous ne pouvez pas évaluer votre propre publication."
        });
      }


      const result =
        await pool.query(
          `
          INSERT INTO reviews
          (
            user_id,
            item_type,
            item_id,
            rating,
            comment
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5
          )
          RETURNING *
          `,
          [
            userId,
            itemType,
            itemId,
            rating,
            comment
          ]
        );


      return res.status(201).json({

        statut: "ok",

        message:
          "Avis ajouté avec succès.",

        avis:
          result.rows[0]

      });


    } catch (error) {

      // Gestion d'un avis déjà existant
      if (
        error.code === "23505"
      ) {

        return res.status(409).json({
          statut: "erreur",
          message:
            "Vous avez déjà évalué cet élément."
        });
      }


      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// LISTE DES AVIS
// ======================================================

app.get(
  "/api/reviews/:itemType/:itemId",
  async (req, res) => {

    try {

      const itemType =
        clean(
          req.params.itemType,
          30
        ).toLowerCase();

      const itemId =
        Number(req.params.itemId);


      if (
        !itemId ||
        !itemType
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Informations invalides."
        });
      }


      const result =
        await pool.query(
          `
          SELECT
            r.id,
            r.user_id,
            r.item_type,
            r.item_id,
            r.rating,
            r.comment,
            r.created_at,
            u.name AS user_name,
            u.verified AS user_verified
          FROM reviews r
          LEFT JOIN users u
            ON u.id = r.user_id
          WHERE r.item_type = $1
          AND r.item_id = $2
          ORDER BY r.created_at DESC
          `,
          [
            itemType,
            itemId
          ]
        );


      const averageResult =
        await pool.query(
          `
          SELECT
            COALESCE(
              ROUND(
                AVG(rating)::numeric,
                1
              ),
              0
            ) AS average,

            COUNT(*)::INTEGER AS total

          FROM reviews

          WHERE item_type = $1
          AND item_id = $2
          `,
          [
            itemType,
            itemId
          ]
        );


      return res.json({

        statut: "ok",

        avis:
          result.rows,

        evaluation: {
          moyenne:
            Number(
              averageResult.rows[0].average
            ),

          total:
            averageResult.rows[0].total
        }

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// SUPPRIMER SON AVIS
// ======================================================

app.delete(
  "/api/reviews/:id",
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const userId =
        Number(req.body.user_id);


      if (
        !id ||
        !userId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Informations invalides."
        });
      }


      const result =
        await pool.query(
          `
          DELETE FROM reviews
          WHERE id = $1
          AND user_id = $2
          RETURNING id
          `,
          [
            id,
            userId
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Avis introuvable ou non autorisé."
        });
      }


      return res.json({

        statut: "ok",

        message:
          "Avis supprimé."

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);

// ======================================================
// PART 9 — SIGNALEMENTS / REPORTS + AUTO-ADMIN
// ======================================================


// ======================================================
// CRÉER UN SIGNALEMENT
// ======================================================

app.post(
  "/api/reports",
  async (req, res) => {

    try {

      const reporterId =
        Number(req.body.user_id);

      const itemType =
        clean(
          req.body.item_type,
          30
        ).toLowerCase();

      const itemId =
        Number(req.body.item_id);

      const reason =
        clean(
          req.body.reason,
          200
        );

      const description =
        clean(
          req.body.description,
          3000
        );


      if (
        !reporterId ||
        !itemType ||
        !itemId ||
        !reason
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Utilisateur, élément et motif sont obligatoires."
        });
      }


      const allowedTypes = [
        "product",
        "service",
        "business",
        "user",
        "message"
      ];


      if (
        !allowedTypes.includes(
          itemType
        )
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Type de signalement invalide."
        });
      }


      const reporter =
        await pool.query(
          `
          SELECT
            id,
            status,
            role
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [reporterId]
        );


      if (
        reporter.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Utilisateur introuvable."
        });
      }


      if (
        reporter.rows[0].status !==
        "active"
      ) {

        return res.status(403).json({
          statut: "erreur",
          message:
            "Ce compte n'est pas actif."
        });
      }


      const result =
        await pool.query(
          `
          INSERT INTO reports
          (
            reporter_id,
            item_type,
            item_id,
            reason,
            description,
            status
          )
          VALUES
          (
            $1,
            $2,
            $3,
            $4,
            $5,
            'pending'
          )
          RETURNING *
          `,
          [
            reporterId,
            itemType,
            itemId,
            reason,
            description
          ]
        );


      const report =
        result.rows[0];


      await createAdminAlert(
        "Nouveau signalement",
        `Un utilisateur a signalé ${itemType} #${itemId}. Motif : ${reason}`
      );


      await autoCheckUser(
        reporterId
      );


      return res.status(201).json({

        statut: "ok",

        message:
          "Signalement envoyé. Il sera vérifié automatiquement.",

        signalement:
          report

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// MES SIGNALEMENTS
// ======================================================

app.get(
  "/api/reports/user/:userId",
  async (req, res) => {

    try {

      const userId =
        Number(req.params.userId);


      if (
        !userId
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Utilisateur invalide."
        });
      }


      const result =
        await pool.query(
          `
          SELECT
            id,
            reporter_id,
            item_type,
            item_id,
            reason,
            description,
            status,
            created_at,
            updated_at
          FROM reports
          WHERE reporter_id = $1
          ORDER BY created_at DESC
          `,
          [userId]
        );


      return res.json({

        statut: "ok",

        signalements:
          result.rows

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// MIDDLEWARE ADMIN
// ======================================================
//
// L'administration reste cachée du frontend.
// Ces routes nécessitent un compte ayant role='admin'.
// ======================================================

async function requireAdmin(req, res, next) {

  try {

    const possibleIds = [
      req.headers["x-user-id"],
      req.body && req.body.user_id,
      req.query && req.query.user_id
    ];


    let adminId = null;


    for (
      const value of possibleIds
    ) {

      const parsed =
        Number(value);

      if (
        parsed &&
        !Number.isNaN(parsed)
      ) {

        adminId = parsed;

        break;
      }
    }


    if (
      !adminId
    ) {

      return res.status(401).json({
        statut: "erreur",
        message:
          "Accès administrateur requis."
      });
    }


    const result =
      await pool.query(
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
        AND role = 'admin'
        AND status = 'active'
        LIMIT 1
        `,
        [adminId]
      );


    if (
      result.rows.length === 0
    ) {

      return res.status(403).json({
        statut: "erreur",
        message:
          "Accès administrateur refusé."
      });
    }


    req.admin =
      result.rows[0];


    next();


  } catch (error) {

    return sendServerError(
      res,
      error
    );
  }
}


// ======================================================
// DASHBOARD AUTO-ADMIN
// ======================================================

app.get(
  "/api/admin/dashboard",
  requireAdmin,
  async (req, res) => {

    try {

      const users =
        await pool.query(
          `
          SELECT COUNT(*)::INTEGER AS total
          FROM users
          WHERE role <> 'admin'
          `
        );


      const products =
        await pool.query(
          `
          SELECT COUNT(*)::INTEGER AS total
          FROM products
          `
        );


      const services =
        await pool.query(
          `
          SELECT COUNT(*)::INTEGER AS total
          FROM services
          `
        );


      const businesses =
        await pool.query(
          `
          SELECT COUNT(*)::INTEGER AS total
          FROM businesses
          `
        );


      const reports =
        await pool.query(
          `
          SELECT COUNT(*)::INTEGER AS total
          FROM reports
          WHERE status = 'pending'
          `
        );


      const pendingProducts =
        await pool.query(
          `
          SELECT COUNT(*)::INTEGER AS total
          FROM products
          WHERE status = 'pending'
          `
        );


      const pendingServices =
        await pool.query(
          `
          SELECT COUNT(*)::INTEGER AS total
          FROM services
          WHERE status = 'pending'
          `
        );


      const pendingBusinesses =
        await pool.query(
          `
          SELECT COUNT(*)::INTEGER AS total
          FROM businesses
          WHERE status = 'pending'
          `
        );


      return res.json({

        statut: "ok",

        dashboard: {

          utilisateurs:
            users.rows[0].total,

          produits:
            products.rows[0].total,

          services:
            services.rows[0].total,

          entreprises:
            businesses.rows[0].total,

          signalements_en_attente:
            reports.rows[0].total,

          produits_en_verification:
            pendingProducts.rows[0].total,

          services_en_verification:
            pendingServices.rows[0].total,

          entreprises_en_verification:
            pendingBusinesses.rows[0].total

        }

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// LISTE DES SIGNALEMENTS POUR ADMIN
// ======================================================

app.get(
  "/api/admin/reports",
  requireAdmin,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            r.id,
            r.reporter_id,
            r.item_type,
            r.item_id,
            r.reason,
            r.description,
            r.status,
            r.created_at,
            r.updated_at,
            u.name AS reporter_name,
            u.email AS reporter_email
          FROM reports r
          LEFT JOIN users u
            ON u.id = r.reporter_id
          ORDER BY
            CASE
              WHEN r.status = 'pending'
                THEN 0
              ELSE 1
            END,
            r.created_at DESC
          LIMIT 500
          `
        );


      return res.json({

        statut: "ok",

        signalements:
          result.rows

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// TRAITER UN SIGNALEMENT
// ======================================================

app.put(
  "/api/admin/reports/:id",
  requireAdmin,
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const status =
        clean(
          req.body.status,
          30
        ).toLowerCase();


      const allowedStatuses = [
        "pending",
        "reviewed",
        "resolved",
        "rejected"
      ];


      if (
        !id ||
        !allowedStatuses.includes(
          status
        )
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Statut de signalement invalide."
        });
      }


      const result =
        await pool.query(
          `
          UPDATE reports
          SET
            status = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
          `,
          [
            status,
            id
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Signalement introuvable."
        });
      }


      return res.json({

        statut: "ok",

        message:
          "Signalement mis à jour.",

        signalement:
          result.rows[0]

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// LISTE DES PRODUITS EN VÉRIFICATION
// ======================================================

app.get(
  "/api/admin/products/pending",
  requireAdmin,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            p.*,
            u.name AS seller_name,
            u.email AS seller_email
          FROM products p
          LEFT JOIN users u
            ON u.id = p.user_id
          WHERE p.status = 'pending'
          ORDER BY p.created_at ASC
          LIMIT 500
          `
        );


      return res.json({

        statut: "ok",

        produits:
          result.rows

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// LISTE DES SERVICES EN VÉRIFICATION
// ======================================================

app.get(
  "/api/admin/services/pending",
  requireAdmin,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            s.*,
            u.name AS provider_name,
            u.email AS provider_email
          FROM services s
          LEFT JOIN users u
            ON u.id = s.user_id
          WHERE s.status = 'pending'
          ORDER BY s.created_at ASC
          LIMIT 500
          `
        );


      return res.json({

        statut: "ok",

        services:
          result.rows

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// LISTE DES ENTREPRISES EN VÉRIFICATION
// ======================================================

app.get(
  "/api/admin/businesses/pending",
  requireAdmin,
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            b.*,
            u.name AS owner_name,
            u.email AS owner_email
          FROM businesses b
          LEFT JOIN users u
            ON u.id = b.user_id
          WHERE b.status = 'pending'
          ORDER BY b.created_at ASC
          LIMIT 500
          `
        );


      return res.json({

        statut: "ok",

        entreprises:
          result.rows

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// ADMIN : CHANGER LE STATUT D'UN PRODUIT
// ======================================================

app.put(
  "/api/admin/products/:id/status",
  requireAdmin,
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const status =
        clean(
          req.body.status,
          30
        ).toLowerCase();


      const allowedStatuses = [
        "active",
        "pending",
        "blocked"
      ];


      if (
        !id ||
        !allowedStatuses.includes(
          status
        )
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Statut produit invalide."
        });
      }


      const result =
        await pool.query(
          `
          UPDATE products
          SET
            status = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
          `,
          [
            status,
            id
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Produit introuvable."
        });
      }


      return res.json({

        statut: "ok",

        message:
          "Statut du produit mis à jour.",

        produit:
          result.rows[0]

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// ADMIN : CHANGER LE STATUT D'UN SERVICE
// ======================================================

app.put(
  "/api/admin/services/:id/status",
  requireAdmin,
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const status =
        clean(
          req.body.status,
          30
        ).toLowerCase();


      const allowedStatuses = [
        "active",
        "pending",
        "blocked"
      ];


      if (
        !id ||
        !allowedStatuses.includes(
          status
        )
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Statut service invalide."
        });
      }


      const result =
        await pool.query(
          `
          UPDATE services
          SET
            status = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
          `,
          [
            status,
            id
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Service introuvable."
        });
      }


      return res.json({

        statut: "ok",

        message:
          "Statut du service mis à jour.",

        service:
          result.rows[0]

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// ADMIN : CHANGER LE STATUT D'UNE ENTREPRISE
// ======================================================

app.put(
  "/api/admin/businesses/:id/status",
  requireAdmin,
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const status =
        clean(
          req.body.status,
          30
        ).toLowerCase();


      const allowedStatuses = [
        "active",
        "pending",
        "blocked"
      ];


      if (
        !id ||
        !allowedStatuses.includes(
          status
        )
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Statut entreprise invalide."
        });
      }


      const result =
        await pool.query(
          `
          UPDATE businesses
          SET
            status = $1,
            updated_at = CURRENT_TIMESTAMP
          WHERE id = $2
          RETURNING *
          `,
          [
            status,
            id
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Entreprise introuvable."
        });
      }


      return res.json({

        statut: "ok",

        message:
          "Statut de l'entreprise mis à jour.",

        entreprise:
          result.rows[0]

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);

// ======================================================
// PART 10 — ADMIN + GESTION DES UTILISATEURS
// ======================================================


// ======================================================
// LISTE DES UTILISATEURS POUR AUTO-ADMIN
// ======================================================

app.get(
  "/api/admin/users",
  requireAdmin,
  async (req, res) => {

    try {

      const status =
        clean(
          req.query.status,
          30
        ).toLowerCase();

      const params = [];

      let condition = `
        role <> 'admin'
      `;


      if (status) {

        params.push(status);

        condition += `
          AND status = $1
        `;
      }


      const result =
        await pool.query(
          `
          SELECT
            id,
            name,
            email,
            whatsapp,
            role,
            status,
            verified,
            created_at
          FROM users
          WHERE ${condition}
          ORDER BY created_at DESC
          LIMIT 500
          `,
          params
        );


      return res.json({

        statut: "ok",

        utilisateurs:
          result.rows

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// VOIR UN UTILISATEUR POUR ADMIN
// ======================================================

app.get(
  "/api/admin/users/:id",
  requireAdmin,
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);


      if (
        !id
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Utilisateur invalide."
        });
      }


      const result =
        await pool.query(
          `
          SELECT
            id,
            name,
            email,
            whatsapp,
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


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Utilisateur introuvable."
        });
      }


      const products =
        await pool.query(
          `
          SELECT COUNT(*)::INTEGER AS total
          FROM products
          WHERE user_id = $1
          `,
          [id]
        );


      const services =
        await pool.query(
          `
          SELECT COUNT(*)::INTEGER AS total
          FROM services
          WHERE user_id = $1
          `,
          [id]
        );


      const businesses =
        await pool.query(
          `
          SELECT COUNT(*)::INTEGER AS total
          FROM businesses
          WHERE user_id = $1
          `,
          [id]
        );


      const reports =
        await pool.query(
          `
          SELECT COUNT(*)::INTEGER AS total
          FROM reports
          WHERE reporter_id = $1
          `,
          [id]
        );


      return res.json({

        statut: "ok",

        utilisateur:
          result.rows[0],

        statistiques: {

          produits:
            products.rows[0].total,

          services:
            services.rows[0].total,

          entreprises:
            businesses.rows[0].total,

          signalements:
            reports.rows[0].total

        }

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// ADMIN : ACTIVER / BLOQUER UN UTILISATEUR
// ======================================================

app.put(
  "/api/admin/users/:id/status",
  requireAdmin,
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const status =
        clean(
          req.body.status,
          30
        ).toLowerCase();


      const allowedStatuses = [
        "active",
        "blocked",
        "pending"
      ];


      if (
        !id ||
        !allowedStatuses.includes(
          status
        )
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Statut utilisateur invalide."
        });
      }


      const target =
        await pool.query(
          `
          SELECT
            id,
            role
          FROM users
          WHERE id = $1
          LIMIT 1
          `,
          [id]
        );


      if (
        target.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Utilisateur introuvable."
        });
      }


      if (
        target.rows[0].role ===
        "admin"
      ) {

        return res.status(403).json({
          statut: "erreur",
          message:
            "Le compte administrateur principal ne peut pas être modifié ici."
        });
      }


      const result =
        await pool.query(
          `
          UPDATE users
          SET
            status = $1
          WHERE id = $2
          RETURNING
            id,
            name,
            email,
            whatsapp,
            role,
            status,
            verified,
            created_at
          `,
          [
            status,
            id
          ]
        );


      await pool.query(
        `
        INSERT INTO notifications
        (
          user_id,
          type,
          title,
          message
        )
        VALUES
        (
          $1,
          'account',
          $2,
          $3
        )
        `,
        [
          id,

          status === "active"
            ? "Compte activé"
            : "Compte mis à jour",

          status === "active"
            ? "Votre compte HELPY est actif."
            : `Le statut de votre compte est maintenant : ${status}.`
        ]
      );


      return res.json({

        statut: "ok",

        message:
          "Statut utilisateur mis à jour.",

        utilisateur:
          result.rows[0]

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// ADMIN : VÉRIFIER / DÉVÉRIFIER UN UTILISATEUR
// ======================================================

app.put(
  "/api/admin/users/:id/verification",
  requireAdmin,
  async (req, res) => {

    try {

      const id =
        Number(req.params.id);

      const verified =
        Boolean(
          req.body.verified
        );


      if (
        !id
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Utilisateur invalide."
        });
      }


      const result =
        await pool.query(
          `
          UPDATE users
          SET
            verified = $1
          WHERE id = $2
          AND role <> 'admin'
          RETURNING
            id,
            name,
            email,
            whatsapp,
            role,
            status,
            verified,
            created_at
          `,
          [
            verified,
            id
          ]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          statut: "erreur",
          message:
            "Utilisateur introuvable."
        });
      }


      await pool.query(
        `
        INSERT INTO notifications
        (
          user_id,
          type,
          title,
          message
        )
        VALUES
        (
          $1,
          'account',
          'Vérification du compte',
          $2
        )
        `,
        [
          id,

          verified
            ? "Votre compte a été vérifié sur HELPY."
            : "La vérification de votre compte a été retirée."
        ]
      );


      return res.json({

        statut: "ok",

        message:
          verified
            ? "Utilisateur vérifié."
            : "Vérification retirée.",

        utilisateur:
          result.rows[0]

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// ADMIN : RECHERCHE GLOBALE
// ======================================================

app.get(
  "/api/admin/search",
  requireAdmin,
  async (req, res) => {

    try {

      const q =
        clean(
          req.query.q,
          150
        );


      if (
        !q
      ) {

        return res.status(400).json({
          statut: "erreur",
          message:
            "Recherche vide."
        });
      }


      const search =
        `%${q}%`;


      const users =
        await pool.query(
          `
          SELECT
            id,
            name,
            email,
            role,
            status,
            verified
          FROM users
          WHERE
            name ILIKE $1
            OR email ILIKE $1
          ORDER BY created_at DESC
          LIMIT 50
          `,
          [search]
        );


      const products =
        await pool.query(
          `
          SELECT
            id,
            user_id,
            title,
            category,
            status
          FROM products
          WHERE
            title ILIKE $1
            OR description ILIKE $1
            OR category ILIKE $1
          ORDER BY created_at DESC
          LIMIT 50
          `,
          [search]
        );


      const services =
        await pool.query(
          `
          SELECT
            id,
            user_id,
            title,
            category,
            status
          FROM services
          WHERE
            title ILIKE $1
            OR description ILIKE $1
            OR category ILIKE $1
          ORDER BY created_at DESC
          LIMIT 50
          `,
          [search]
        );


      const businesses =
        await pool.query(
          `
          SELECT
            id,
            user_id,
            name,
            category,
            status
          FROM businesses
          WHERE
            name ILIKE $1
            OR description ILIKE $1
            OR category ILIKE $1
          ORDER BY created_at DESC
          LIMIT 50
          `,
          [search]
        );


      return res.json({

        statut: "ok",

        recherche: q,

        utilisateurs:
          users.rows,

        produits:
          products.rows,

        services:
          services.rows,

        entreprises:
          businesses.rows

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// ADMIN : NOTIFICATIONS ADMIN
// ======================================================

app.get(
  "/api/admin/notifications",
  requireAdmin,
  async (req, res) => {

    try {

      const admin =
        req.admin;


      const result =
        await pool.query(
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
          LIMIT 200
          `,
          [admin.id]
        );


      return res.json({
        statut: "ok",

        notifications:
          result.rows

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);


// ======================================================
// ADMIN : MARQUER SES NOTIFICATIONS COMME LUES
// ======================================================

app.put(
  "/api/admin/notifications/read-all",
  requireAdmin,
  async (req, res) => {

    try {

      const admin =
        req.admin;


      const result =
        await pool.query(
          `
          UPDATE notifications
          SET
            is_read = TRUE
          WHERE user_id = $1
          AND is_read = FALSE
          `,
          [admin.id]
        );


      return res.json({

        statut: "ok",

        message:
          "Notifications administrateur marquées comme lues.",

        updated:
          result.rowCount

      });


    } catch (error) {

      return sendServerError(
        res,
        error
      );
    }
  }
);

// ======================================================
// PART 11 — HEALTH CHECK + FRONTEND + ERREURS + START
// ======================================================


// ======================================================
// HEALTH CHECK
// ======================================================

app.get("/api/health", async (req, res) => {

  try {

    await pool.query("SELECT 1");

    return res.json({
      status: "ok",
      service: "HELPY",
      database: "connected"
    });

  } catch (error) {

    return res.status(503).json({
      status: "error",
      service: "HELPY",
      database: "disconnected"
    });
  }
});


// ======================================================
// TEST SIMPLE DE L'API
// ======================================================

app.get("/api", (req, res) => {

  return res.json({
    statut: "ok",
    service: "HELPY API",
    version: "1.0.0",
    message: "API HELPY opérationnelle."
  });

});


// ======================================================
// SERVIR LES FICHIERS FRONTEND
// ======================================================

app.use(
  express.static(
    path.join(__dirname)
  )
);


// ======================================================
// PAGE D'ACCUEIL
// ======================================================

app.get("/", (req, res) => {

  return res.sendFile(
    path.join(
      __dirname,
      "index.html"
    )
  );

});


// ======================================================
// ROUTE 404 POUR LES API
// ======================================================

app.use("/api", (req, res) => {

  return res.status(404).json({
    statut: "erreur",
    message: "Route API introuvable."
  });

});


// ======================================================
// GESTION DES ERREURS JSON
// ======================================================

app.use(
  (error, req, res, next) => {

    console.error(
      "Erreur serveur :",
      error
    );


    if (
      error &&
      error.type ===
      "entity.parse.failed"
    ) {

      return res.status(400).json({
        statut: "erreur",
        message:
          "Données JSON invalides."
      });
    }


    return res.status(500).json({
      statut: "erreur",
      message:
        "Une erreur interne est survenue."
    });

  }
);


// ======================================================
// DÉMARRAGE DU SERVEUR
// ======================================================

async function startServer() {

  try {

    console.log(
      "======================================"
    );

    console.log(
      "        HELPY - DÉMARRAGE"
    );

    console.log(
      "======================================"
    );


    // Vérifier la connexion PostgreSQL
    await pool.query(
      "SELECT 1"
    );

    console.log(
      "Base de données : CONNECTÉE"
    );


    // Créer / confirmer Auto-Admin
    await ensureAutoAdmin();


    // Démarrer Express
    app.listen(
      PORT,
      "0.0.0.0",
      () => {

        console.log(
          `HELPY est démarré sur le port ${PORT}`
        );

        console.log(
          "API : /api"
        );

        console.log(
          "Health : /api/health"
        );

      }
    );


  } catch (error) {

    console.error(
      "Impossible de démarrer HELPY :",
      error
    );


    process.exit(1);

  }

}


// ======================================================
// LANCER HELPY
// ======================================================

startServer();
       