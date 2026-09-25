// =====================================================
// HELPY - COMPLETE BACKEND
// Railway + PostgreSQL - NO SUPABASE
// =====================================================

const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(express.static(__dirname));

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is missing.");
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

const LISTING_TYPES = [
  "business",
  "product",
  "service",
  "realestate",
  "vehicle"
];

// =====================================================
// DATABASE HELPERS
// =====================================================

async function columnExists(table, column) {
  const result = await pool.query(
    `SELECT 1
     FROM information_schema.columns
     WHERE table_schema = 'public'
       AND table_name = $1
       AND column_name = $2
     LIMIT 1`,
    [table, column]
  );

  return result.rows.length > 0;
}

async function addColumnIfMissing(table, column, definition) {
  if (!(await columnExists(table, column))) {
    await pool.query(
      `ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`
    );
  }
}

// =====================================================
// DATABASE INITIALIZATION
// =====================================================

async function initializeDatabase() {

  // =========================
  // USERS
  // =========================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone VARCHAR(30),
      whatsapp VARCHAR(30),
      photo_url TEXT,
      bio TEXT,
      location VARCHAR(150),
      role VARCHAR(30) DEFAULT 'user',
      status VARCHAR(30) DEFAULT 'active',
      verified BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await addColumnIfMissing(
    "users",
    "phone",
    "VARCHAR(30)"
  );

  await addColumnIfMissing(
    "users",
    "whatsapp",
    "VARCHAR(30)"
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
    "VARCHAR(150)"
  );

  await addColumnIfMissing(
    "users",
    "role",
    "VARCHAR(30) DEFAULT 'user'"
  );

  await addColumnIfMissing(
    "users",
    "status",
    "VARCHAR(30) DEFAULT 'active'"
  );

  await addColumnIfMissing(
    "users",
    "verified",
    "BOOLEAN DEFAULT false"
  );

  // =========================
  // BUSINESSES
  // =========================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      name VARCHAR(150) NOT NULL,
      category VARCHAR(100),
      description TEXT,
      location VARCHAR(150),
      phone VARCHAR(30),
      whatsapp VARCHAR(30),
      image_url TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // =========================
  // PRODUCTS
  // =========================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
      title VARCHAR(150) NOT NULL,
      description TEXT,
      price NUMERIC(12,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'HTG',
      category VARCHAR(100),
      location VARCHAR(150),
      whatsapp VARCHAR(30),
      phone VARCHAR(30),
      image_url TEXT,
      quantity INTEGER DEFAULT 1,
      status VARCHAR(30) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  await addColumnIfMissing(
    "products",
    "user_id",
    "INTEGER REFERENCES users(id) ON DELETE SET NULL"
  );

  await addColumnIfMissing(
    "products",
    "phone",
    "VARCHAR(30)"
  );

  await addColumnIfMissing(
    "products",
    "whatsapp",
    "VARCHAR(30)"
  );

  await addColumnIfMissing(
    "products",
    "status",
    "VARCHAR(30) DEFAULT 'active'"
  );

  // =========================
  // SERVICES
  // =========================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      business_id INTEGER REFERENCES businesses(id) ON DELETE SET NULL,
      title VARCHAR(150) NOT NULL,
      description TEXT,
      price NUMERIC(12,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'HTG',
      category VARCHAR(100),
      location VARCHAR(150),
      whatsapp VARCHAR(30),
      phone VARCHAR(30),
      image_url TEXT,
      status VARCHAR(30) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // =========================
  // LISTINGS
  // =========================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS listings (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(30) NOT NULL,
      title VARCHAR(200) NOT NULL,
      description TEXT,
      category VARCHAR(100),
      location VARCHAR(150),
      phone VARCHAR(30),
      whatsapp VARCHAR(30),
      price NUMERIC(12,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'HTG',
      image_url TEXT,
      status VARCHAR(30) DEFAULT 'active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // =========================
  // REVIEWS
  // =========================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      business_id INTEGER REFERENCES businesses(id) ON DELETE CASCADE,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
      comment TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // =========================
  // MESSAGES
  // =========================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // =========================
  // REPORTS
  // =========================

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      listing_id INTEGER,
      reason TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
  `);

  console.log("HELPY database tables ready");
}

// =====================================================
// HELPERS
// =====================================================

function getUserId(req) {

  const raw = req.headers["x-user-id"];

  if (!raw) {
    return null;
  }

  const id = Number.parseInt(raw, 10);

  if (!Number.isInteger(id) || id <= 0) {
    return null;
  }

  return id;
}

function cleanText(value) {

  if (
    value === undefined ||
    value === null
  ) {
    return "";
  }

  return String(value).trim();
}

function publicUser(row) {

  if (!row) {
    return null;
  }

  return {
    id: row.id,
    name: row.name,
    email: row.email,
    phone: row.phone || null,
    whatsapp: row.whatsapp || null,
    photo_url: row.photo_url || null,
    bio: row.bio || null,
    location: row.location || null,
    role: row.role || "user",
    status: row.status || "active",
    verified: Boolean(row.verified),
    created_at: row.created_at
  };
}

function requireUser(req, res) {

  const userId = getUserId(req);

  if (!userId) {

    res.status(401).json({
      error: "Login required"
    });

    return null;
  }

  return userId;
}

// =====================================================
// HOME
// =====================================================

app.get("/", (req, res) => {

  res.sendFile(
    path.join(__dirname, "index.html")
  );

});

// =====================================================
// HEALTH
// =====================================================

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
      "HEALTH DATABASE ERROR:",
      error
    );

    res.status(503).json({
      status: "error",
      service: "HELPY",
      database: "disconnected"
    });

  }

});

// =====================================================
// AUTH - REGISTER
// =====================================================

async function registerUser(req, res) {

  try {

    const name =
      cleanText(req.body.name);

    const email =
      cleanText(req.body.email).toLowerCase();

    const password =
      String(req.body.password || "");

    const phone =
      cleanText(req.body.phone) || null;

    const whatsapp =
      cleanText(req.body.whatsapp) || null;

    const location =
      cleanText(req.body.location) || null;

    if (
      !name ||
      !email ||
      !password
    ) {

      return res.status(400).json({
        error:
          "Name, email and password are required"
      });

    }

    if (name.length < 2) {

      return res.status(400).json({
        error: "Name is too short"
      });

    }

    if (password.length < 6) {

      return res.status(400).json({
        error:
          "Password must contain at least 6 characters"
      });

    }

    const exists =
      await pool.query(
        `
        SELECT id
        FROM users
        WHERE LOWER(email) = LOWER($1)
        LIMIT 1
        `,
        [email]
      );

    if (exists.rows.length) {

      return res.status(409).json({
        error:
          "Email already exists"
      });

    }

    const passwordHash =
      await bcrypt.hash(
        password,
        12
      );

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
          $5,
          $6,
          'user',
          'active',
          false
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
          passwordHash,
          phone,
          whatsapp,
          location
        ]
      );

    const user =
      publicUser(result.rows[0]);

    return res.status(201).json({

      status: "ok",

      statut: "ok",

      message:
        "Account created successfully",

      user

    });

  } catch (error) {

    console.error(
      "REGISTER ERROR:",
      error
    );

    return res.status(500).json({
      error:
        "Unable to create account"
    });

  }

}

// =====================================================
// AUTH - LOGIN
// =====================================================

async function loginUser(req, res) {

  try {

    const email =
      cleanText(req.body.email).toLowerCase();

    const password =
      String(req.body.password || "");

    if (!email || !password) {

      return res.status(400).json({
        error:
          "Email and password are required"
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

    if (!result.rows.length) {

      return res.status(401).json({
        error:
          "Invalid email or password"
      });

    }

    const account =
      result.rows[0];

    if (
      account.status &&
      account.status !== "active"
    ) {

      return res.status(403).json({
        error:
          "This account is not active"
      });

    }

    const valid =
      await bcrypt.compare(
        password,
        account.password
      );

    if (!valid) {

      return res.status(401).json({
        error:
          "Invalid email or password"
      });

    }

    return res.json({

      status: "ok",

      statut: "ok",

      message:
        "Login successful",

      user:
        publicUser(account)

    });

  } catch (error) {

    console.error(
      "LOGIN ERROR:",
      error
    );

    return res.status(500).json({
      error:
        "Unable to login"
    });

  }

}

// Nouvo frontend
app.post(
  "/api/auth/register",
  registerUser
);

app.post(
  "/api/auth/login",
  loginUser
);

// Ansyen frontend
app.post(
  "/api/register",
  registerUser
);

app.post(
  "/api/login",
  loginUser
);

// =====================================================
// AUTH - ME
// =====================================================

app.get(
  "/api/auth/me",
  async (req, res) => {

    try {

      const userId =
        getUserId(req) ||
        Number.parseInt(
          req.query.user_id,
          10
        );

      if (
        !Number.isInteger(userId) ||
        userId <= 0
      ) {

        return res.status(401).json({
          error:
            "Login required"
        });

      }

      const result =
        await pool.query(
          `
          SELECT *
          FROM users
          WHERE id=$1
          `,
          [userId]
        );

      if (!result.rows.length) {

        return res.status(404).json({
          error:
            "User not found"
        });

      }

      res.json({
        status: "ok",
        user:
          publicUser(result.rows[0])
      });

    } catch (error) {

      console.error(
        "AUTH ME ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Server error"
      });

    }

  }
);

// =====================================================
// PROFILE
// =====================================================

app.get(
  "/api/profile",
  async (req, res) => {

    try {

      const userId =
        requireUser(req, res);

      if (!userId) return;

      const result =
        await pool.query(
          `
          SELECT *
          FROM users
          WHERE id=$1
          `,
          [userId]
        );

      if (!result.rows.length) {

        return res.status(404).json({
          error:
            "User not found"
        });

      }

      res.json({
        status: "ok",
        user:
          publicUser(result.rows[0])
      });

    } catch (error) {

      console.error(
        "GET PROFILE ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Server error"
      });

    }

  }
);

app.put(
  "/api/profile",
  async (req, res) => {

    try {

      const userId =
        requireUser(req, res);

      if (!userId) return;

      const name =
        cleanText(req.body.name);

      if (!name) {

        return res.status(400).json({
          error:
            "Name is required"
        });

      }

      const result =
        await pool.query(
          `
          UPDATE users
          SET
            name=$1,
            phone=$2,
            whatsapp=$3,
            photo_url=$4,
            bio=$5,
            location=$6
          WHERE id=$7
          RETURNING *
          `,
          [
            name,
            cleanText(req.body.phone) || null,
            cleanText(req.body.whatsapp) || null,
            cleanText(req.body.photo_url) || null,
            cleanText(req.body.bio) || null,
            cleanText(req.body.location) || null,
            userId
          ]
        );

      if (!result.rows.length) {

        return res.status(404).json({
          error:
            "User not found"
        });

      }

      res.json({

        status: "ok",

        message:
          "Profile updated",

        user:
          publicUser(result.rows[0])

      });

    } catch (error) {

      console.error(
        "UPDATE PROFILE ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Server error"
      });

    }

  }
);

// =====================================================
// PRODUCTS - CREATE
// =====================================================

app.post(
  "/api/products",
  async (req, res) => {

    try {

      const userId =
        requireUser(req, res);

      if (!userId) return;

      const title =
        cleanText(
          req.body.title ||
          req.body.name
        );

      const whatsapp =
        cleanText(
          req.body.whatsapp
        );

      if (!title) {

        return res.status(400).json({
          error:
            "Product title is required"
        });

      }

      if (!whatsapp) {

        return res.status(400).json({
          error:
            "WhatsApp is required"
        });

      }

      const result =
        await pool.query(
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
            $1,$2,$3,$4,$5,$6,$7,
            $8,$9,$10,$11,$12,'active'
          )
          RETURNING *
          `,
          [
            userId,
            req.body.business_id || null,
            title,
            cleanText(
              req.body.description
            ) || null,
            Number(req.body.price) || 0,
            cleanText(
              req.body.currency
            ) || "HTG",
            cleanText(
              req.body.category
            ) || null,
            cleanText(
              req.body.location
            ) || null,
            whatsapp,
            cleanText(
              req.body.phone
            ) || null,
            cleanText(
              req.body.image_url
            ) || null,
            Math.max(
              1,
              Number.parseInt(
                req.body.quantity,
                10
              ) || 1
            )
          ]
        );

      res.status(201).json({

        status: "ok",

        message:
          "Product created",

        product:
          result.rows[0]

      });

    } catch (error) {

      console.error(
        "CREATE PRODUCT ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Unable to create product"
      });

    }

  }
);

// =====================================================
// PRODUCTS - LIST
// =====================================================

app.get(
  "/api/products",
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            p.*,
            u.name AS seller_name,
            u.photo_url AS seller_photo
          FROM products p
          LEFT JOIN users u
            ON u.id=p.user_id
          WHERE
            COALESCE(
              p.status,
              'active'
            )='active'
          ORDER BY p.id DESC
          `
        );

      res.json({

        status: "ok",

        products:
          result.rows

      });

    } catch (error) {

      console.error(
        "GET PRODUCTS ERROR:",
        error

    );

      if (!result.rows.length) {
        return res.status(404).json({
          error: "Product not found"
        });
      }

      res.json({
        status: "ok",
        product: result.rows[0]
      });

    } catch (error) {
      console.error(
        "GET PRODUCT ERROR:",
        error
      );

      res.status(500).json({
        error: "Unable to load product"
      });
    }
  }
);

// =====================================================
// SERVICES - CREATE
// =====================================================

app.post(
  "/api/services",
  async (req, res) => {

    try {

      const userId = requireUser(req, res);

      if (!userId) return;

      const title = cleanText(
        req.body.title ||
        req.body.name
      );

      const whatsapp = cleanText(
        req.body.whatsapp
      );

      if (!title) {
        return res.status(400).json({
          error: "Service title is required"
        });
      }

      if (!whatsapp) {
        return res.status(400).json({
          error: "WhatsApp is required"
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
          $1,$2,$3,$4,$5,$6,$7,
          $8,$9,$10,$11,'active'
        )
        RETURNING *
        `,
        [
          userId,
          req.body.business_id || null,
          title,
          cleanText(req.body.description) || null,
          Number(req.body.price) || 0,
          cleanText(req.body.currency) || "HTG",
          cleanText(req.body.category) || null,
          cleanText(req.body.location) || null,
          whatsapp,
          cleanText(req.body.phone) || null,
          cleanText(req.body.image_url) || null
        ]
      );

      res.status(201).json({
        status: "ok",
        message: "Service created",
        service: result.rows[0]
      });

    } catch (error) {

      console.error(
        "CREATE SERVICE ERROR:",
        error
      );

      res.status(500).json({
        error: "Unable to create service"
      });
    }
  }
);

// =====================================================
// SERVICES - LIST
// =====================================================

app.get(
  "/api/services",
  async (req, res) => {

    try {

      const result = await pool.query(
        `
        SELECT
          s.*,
          u.name AS provider_name,
          u.photo_url AS provider_photo
        FROM services s
        LEFT JOIN users u
          ON u.id = s.user_id
        WHERE COALESCE(
          s.status,
          'active'
        ) = 'active'
        ORDER BY s.id DESC
        `
      );

      res.json({
        status: "ok",
        services: result.rows
      });

    } catch (error) {

      console.error(
        "GET SERVICES ERROR:",
        error
      );

      res.status(500).json({
        error: "Unable to load services"
      });
    }
  }
);

// =====================================================
// SERVICE DETAILS
// =====================================================

app.get(
  "/api/services/:id",
  async (req, res) => {

    try {

      const result = await pool.query(
        `
        SELECT
          s.*,
          u.name AS provider_name,
          u.photo_url AS provider_photo
        FROM services s
        LEFT JOIN users u
          ON u.id = s.user_id
        WHERE s.id = $1
        `,
        [req.params.id]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          error: "Service not found"
        });
      }

      res.json({
        status: "ok",
        service: result.rows[0]
      });

    } catch (error) {

      console.error(
        "GET SERVICE ERROR:",
        error
      );

      res.status(500).json({
        error: "Unable to load service"
      });
    }
  }
);

// =====================================================
// BUSINESSES - CREATE
// =====================================================

app.post(
  "/api/businesses",
  async (req, res) => {

    try {

      const userId = requireUser(req, res);

      if (!userId) return;

      const name = cleanText(
        req.body.name
      );

      if (!name) {
        return res.status(400).json({
          error: "Business name is required"
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
          image_url
        )
        VALUES
        (
          $1,$2,$3,$4,
          $5,$6,$7,$8
        )
        RETURNING *
        `,
        [
          userId,
          name,
          cleanText(req.body.category) || null,
          cleanText(req.body.description) || null,
          cleanText(req.body.location) || null,
          cleanText(req.body.phone) || null,
          cleanText(req.body.whatsapp) || null,
          cleanText(req.body.image_url) || null
        ]
      );

      res.status(201).json({
        status: "ok",
        message: "Business created",
        business: result.rows[0]
      });

    } catch (error) {

      console.error(
        "CREATE BUSINESS ERROR:",
        error
      );

      res.status(500).json({
        error: "Unable to create business"
      });
    }
  }
);

// =====================================================
// BUSINESSES - LIST
// =====================================================

app.get(
  "/api/businesses",
  async (req, res) => {

    try {

      const result = await pool.query(
        `
        SELECT
          b.*,
          u.name AS owner_name,
          u.photo_url AS owner_photo
        FROM businesses b
        LEFT JOIN users u
          ON u.id = b.user_id
        ORDER BY b.id DESC
        `
      );

      res.json({
        status: "ok",
        entreprises: result.rows,
        businesses: result.rows
      });

    } catch (error) {

      console.error(
        "GET BUSINESSES ERROR:",
        error
      );

      res.status(500).json({
        error: "Unable to load businesses"
      });
    }
  }
);

// =====================================================
// BUSINESS DETAILS
// =====================================================

app.get(
  "/api/businesses/:id",
  async (req, res) => {

    try {

      const result = await pool.query(
        `
        SELECT
          b.*,
          u.name AS owner_name,
          u.photo_url AS owner_photo
        FROM businesses b
        LEFT JOIN users u
          ON u.id = b.user_id
        WHERE b.id = $1
        `,
        [req.params.id]
      );

      if (!result.rows.length) {
        return res.status(404).json({
          error: "Business not found"
        });
      }

      res.json({
        status: "ok",
        business: result.rows[0]
      });

    } catch (error) {

      console.error(
        "GET BUSINESS ERROR:",
        error
      );

      res.status(500).json({
        error: "Unable to load business"
      });

// ============================================================
// LISTINGS
// ============================================================

app.post("/api/listings", async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const {
      type,
      title,
      description,
      category,
      location,
      phone,
      whatsapp,
      price,
      currency,
      image_url
    } = req.body;

    const allowedTypes = [
      "business",
      "product",
      "service",
      "realestate",
      "vehicle"
    ];

    if (!type || !allowedTypes.includes(type)) {
      return res.status(400).json({
        error: "Invalid listing type"
      });
    }

    if (!title || !title.trim()) {
      return res.status(400).json({
        error: "Title is required"
      });
    }

    if (!whatsapp || !whatsapp.trim()) {
      return res.status(400).json({
        error: "WhatsApp number is required"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO listings
      (
        user_id,
        type,
        title,
        description,
        category,
        location,
        phone,
        whatsapp,
        price,
        currency,
        image_url,
        status
      )
      VALUES
      ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'active')
      RETURNING *
      `,
      [
        userId,
        type,
        cleanText(title),
        cleanText(description),
        cleanText(category),
        cleanText(location),
        cleanText(phone),
        cleanText(whatsapp),
        price || 0,
        currency || "HTG",
        cleanText(image_url)
      ]
    );

    res.status(201).json({
      status: "ok",
      listing: result.rows[0]
    });

  } catch (error) {
    console.error("CREATE LISTING ERROR:", error);

    res.status(500).json({
      error: "Unable to create listing"
    });
  }
});


// ============================================================
// GET LISTINGS
// ============================================================

app.get("/api/listings", async (req, res) => {
  try {
    const { type, category } = req.query;

    let query = `
      SELECT
        l.*,
        u.name AS seller_name
      FROM listings l
      LEFT JOIN users u
        ON u.id = l.user_id
      WHERE l.status = 'active'
    `;

    const values = [];

    if (type) {
      values.push(type);
      query += ` AND l.type = $${values.length}`;
    }

    if (category) {
      values.push(category);
      query += ` AND l.category ILIKE $${values.length}`;
    }

    query += `
      ORDER BY l.created_at DESC
    `;

    const result = await pool.query(query, values);

    res.json({
      status: "ok",
      listings: result.rows
    });

  } catch (error) {
    console.error("GET LISTINGS ERROR:", error);

    res.status(500).json({
      error: "Unable to load listings"
    });
  }
});


// ============================================================
// GET SINGLE LISTING
// ============================================================

app.get("/api/listings/:id", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        l.*,
        u.name AS seller_name
      FROM listings l
      LEFT JOIN users u
        ON u.id = l.user_id
      WHERE l.id = $1
      `,
      [req.params.id]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Listing not found"
      });
    }

    res.json({
      status: "ok",
      listing: result.rows[0]
    });

  } catch (error) {
    console.error("GET LISTING ERROR:", error);

    res.status(500).json({
      error: "Unable to load listing"
    });
  }
});


// ============================================================
// UPDATE LISTING
// ============================================================

app.put("/api/listings/:id", async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const {
      title,
      description,
      category,
      location,
      phone,
      whatsapp,
      price,
      currency,
      image_url
    } = req.body;

    const result = await pool.query(
      `
      UPDATE listings
      SET
        title = COALESCE($1, title),
        description = COALESCE($2, description),
        category = COALESCE($3, category),
        location = COALESCE($4, location),
        phone = COALESCE($5, phone),
        whatsapp = COALESCE($6, whatsapp),
        price = COALESCE($7, price),
        currency = COALESCE($8, currency),
        image_url = COALESCE($9, image_url),
        updated_at = NOW()
      WHERE id = $10
        AND user_id = $11
      RETURNING *
      `,
      [
        cleanText(title),
        cleanText(description),
        cleanText(category),
        cleanText(location),
        cleanText(phone),
        cleanText(whatsapp),
        price,
        currency,
        cleanText(image_url),
        req.params.id,
        userId
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Listing not found or not owned by user"
      });
    }

    res.json({
      status: "ok",
      listing: result.rows[0]
    });

  } catch (error) {
    console.error("UPDATE LISTING ERROR:", error);

    res.status(500).json({
      error: "Unable to update listing"
    });
  }
});


// ============================================================
// DELETE LISTING
// ============================================================

app.delete("/api/listings/:id", async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const result = await pool.query(
      `
      DELETE FROM listings
      WHERE id = $1
        AND user_id = $2
      RETURNING id
      `,
      [
        req.params.id,
        userId
      ]
    );

    if (!result.rows.length) {
      return res.status(404).json({
        error: "Listing not found or not owned by user"
      });
    }

    res.json({
      status: "ok",
      message: "Listing deleted"
    });

  } catch (error) {
    console.error("DELETE LISTING ERROR:", error);

    res.status(500).json({
      error: "Unable to delete listing"
    });
  }
});


// ============================================================
// GLOBAL SEARCH
// ============================================================

app.get("/api/search", async (req, res) => {
  try {
    const q = cleanText(req.query.q);

    if (!q) {
      return res.json({
        status: "ok",
        businesses: [],
        products: [],
        services: [],
        listings: []
      });
    }

    const search = `%${q}%`;

    const businesses = await pool.query(
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
      LIMIT 50
      `,
      [search]
    );

    const products = await pool.query(
      `
      SELECT
        p.*,
        u.name AS seller_name
      FROM products p
      LEFT JOIN users u
        ON u.id = p.user_id
      WHERE p.status = 'active'
      AND (
        p.name ILIKE $1
        OR p.description ILIKE $1
        OR p.category ILIKE $1
        OR p.location ILIKE $1
      )
      ORDER BY p.created_at DESC
      LIMIT 50
      `,
      [search]
    );

    const services = await pool.query(
      `
      SELECT
        s.*,
        u.name AS provider_name
      FROM services s
      LEFT JOIN users u
        ON u.id = s.user_id
      WHERE s.status = 'active'
      AND (
        s.name ILIKE $1
        OR s.description ILIKE $1
        OR s.category ILIKE $1
        OR s.location ILIKE $1
      )
      ORDER BY s.created_at DESC
      LIMIT 50
      `,
      [search]
    );

    const listings = await pool.query(
      `
      SELECT
        l.*,
        u.name AS seller_name
      FROM listings l
      LEFT JOIN users u
        ON u.id = l.user_id
      WHERE l.status = 'active'
      AND (
        l.title ILIKE $1
        OR l.description ILIKE $1
        OR l.category ILIKE $1
        OR l.location ILIKE $1
      )
      ORDER BY l.created_at DESC
      LIMIT 50
      `,
      [search]
    );

    res.json({
      status: "ok",
      query: q,
      businesses: businesses.rows,
      products: products.rows,
      services: services.rows,
      listings: listings.rows
    });

  } catch (error) {
    console.error("SEARCH ERROR:", error);

    res.status(500).json({
      error: "Search failed"
    });
  }
});


// ============================================================
// REVIEWS
// ============================================================

app.post("/api/reviews", async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const {
      business_id,
      rating,
      comment
    } = req.body;

    if (!business_id) {
      return res.status(400).json({
        error: "business_id is required"
      });
    }

    const numericRating = Number(rating);

    if (
      !Number.isInteger(numericRating) ||
      numericRating < 1 ||
      numericRating > 5
    ) {
      return res.status(400).json({
        error: "Rating must be between 1 and 5"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO reviews
      (
        business_id,
        user_id,
        rating,
        comment
      )
      VALUES
      ($1,$2,$3,$4)
      RETURNING *
      `,
      [
        business_id,
        userId,
        numericRating,
        cleanText(comment)
      ]
    );

    res.status(201).json({
      status: "ok",
      review: result.rows[0]
    });

  } catch (error) {
    console.error("CREATE REVIEW ERROR:", error);

    res.status(500).json({
      error: "Unable to create review"
    });
  }
});


// ============================================================
// GET BUSINESS REVIEWS
// ============================================================

app.get("/api/reviews/:businessId", async (req, res) => {
  try {
    const result = await pool.query(
      `
      SELECT
        r.*,
        u.name AS user_name
      FROM reviews r
      LEFT JOIN users u
        ON u.id = r.user_id
      WHERE r.business_id = $1
      ORDER BY r.created_at DESC
      `,
      [req.params.businessId]
    );

    res.json({
      status: "ok",
      reviews: result.rows
    });

  } catch (error) {
    console.error("GET REVIEWS ERROR:", error);

    res.status(500).json({
      error: "Unable to load reviews"
    });
  }
});


// ============================================================
// MESSAGES
// ============================================================

app.post("/api/messages", async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const {
      receiver_id,
      message
    } = req.body;

    if (!receiver_id || !message || !message.trim()) {
      return res.status(400).json({
        error: "receiver_id and message are required"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO messages
      (
        sender_id,
        receiver_id,
        message
      )
      VALUES
      ($1,$2,$3)
      RETURNING *
      `,
      [
        userId,
        receiver_id,
        cleanText(message)
      ]
    );

    res.status(201).json({
      status: "ok",
      message: result.rows[0]
    });

  } catch (error) {
    console.error("SEND MESSAGE ERROR:", error);

    res.status(500).json({
      error: "Unable to send message"
    });
  }
});


// ============================================================
// GET USER MESSAGES
// ============================================================

app.get("/api/messages/:userId", async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    if (String(userId) !== String(req.params.userId)) {
      return res.status(403).json({
        error: "Access denied"
      });
    }

    const result = await pool.query(
      `
      SELECT
        m.*,
        sender.name AS sender_name,
        receiver.name AS receiver_name
      FROM messages m
      LEFT JOIN users sender
        ON sender.id = m.sender_id
      LEFT JOIN users receiver
        ON receiver.id = m.receiver_id
      WHERE m.sender_id = $1
         OR m.receiver_id = $1
      ORDER BY m.created_at DESC
      `,
      [userId]
    );

    res.json({
      status: "ok",
      messages: result.rows
    });

  } catch (error) {
    console.error("GET MESSAGES ERROR:", error);

    res.status(500).json({
      error: "Unable to load messages"
    });
  }
});


// ============================================================
// REPORTS
// ============================================================

app.post("/api/reports", async (req, res) => {
  try {
    const userId = requireUser(req, res);
    if (!userId) return;

    const {
      listing_id,
      reason
    } = req.body;

    if (!listing_id || !reason || !reason.trim()) {
      return res.status(400).json({
        error: "listing_id and reason are required"
      });
    }

    const result = await pool.query(
      `
      INSERT INTO reports
      (
        listing_id,
        user_id,
        reason,
        status
      )
      VALUES
      ($1,$2,$3,'pending')
      RETURNING *
      `,
      [
        listing_id,
        userId,
        cleanText(reason)
      ]
    );

    res.status(201).json({
      status: "ok",
      report: result.rows[0]
    });

  } catch (error) {
    console.error("CREATE REPORT ERROR:", error);

    res.status(500).json({
      error: "Unable to create report"
    });
  }
});


// ============================================================
// API 404
// ============================================================

app.use("/api", (req, res) => {
  res.status(404).json({
    error: "API route not found"
  });
});


// ============================================================
// GLOBAL ERROR HANDLER
// ============================================================

app.use((error, req, res, next) => {
  console.error("SERVER ERROR:", error);

  if (res.headersSent) {
    return next(error);
  }

  res.status(500).json({
    error: "Internal server error"
  });
});


// ============================================================
// START SERVER
// ============================================================

async function startServer() {
  try {
    await pool.query("SELECT 1");

    await initializeDatabase();

    app.listen(
      PORT,
      "0.0.0.0",
      () => {
        console.log(
          `HELPY running on port ${PORT}`
        );
      }
    );

  } catch (error) {
    console.error(
      "HELPY could not start:",
      error
    );

    process.exit(1);
  }
}

startServer();