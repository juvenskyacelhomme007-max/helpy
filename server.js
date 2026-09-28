const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");
const { Pool } = require("pg");

const app = express();

const PORT = Number(process.env.PORT || 3000);

const DATABASE_URL = process.env.DATABASE_URL || "";

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: DATABASE_URL
    ? { rejectUnauthorized: false }
    : undefined
});


/* ==================================================
   MIDDLEWARE
   ================================================== */

app.use(cors());

app.use(
  express.json({
    limit: "25mb"
  })
);

app.use(
  express.urlencoded({
    extended: true,
    limit: "25mb"
  })
);


/* ==================================================
   HELPERS
   ================================================== */

const clean = (value, max = 5000) => {
  if (value == null) return "";

  return String(value)
    .trim()
    .slice(0, max);
};


const uid = (req) => {
  return (
    Number(
      req.headers["x-user-id"] ||
      req.body?.user_id ||
      req.query?.user_id
    ) || null
  );
};


function err(res, error) {

  console.error("HELPY API ERROR:", error);

  return res.status(500).json({
    statut: "erreur",
    message: "Une erreur interne est survenue."
  });
}


/* ==================================================
   DATABASE
   ================================================== */

async function db() {

  /*
    ==================================================
    USERS
    ==================================================
  */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      email VARCHAR(255) UNIQUE NOT NULL,
      password TEXT NOT NULL,
      phone VARCHAR(60),
      whatsapp VARCHAR(60),
      country VARCHAR(120),
      city VARCHAR(120),
      description TEXT,
      profile_photo TEXT,
      role VARCHAR(30) DEFAULT 'user',
      status VARCHAR(30) DEFAULT 'active',
      verified BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);


  /*
    ==================================================
    MIGRATION USERS
    ==================================================
  */

  await pool.query(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS phone VARCHAR(60),
      ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(60),
      ADD COLUMN IF NOT EXISTS country VARCHAR(120),
      ADD COLUMN IF NOT EXISTS city VARCHAR(120),
      ADD COLUMN IF NOT EXISTS description TEXT,
      ADD COLUMN IF NOT EXISTS profile_photo TEXT,
      ADD COLUMN IF NOT EXISTS role VARCHAR(30) DEFAULT 'user',
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS verified BOOLEAN DEFAULT FALSE,
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  `);


  /*
    ==================================================
    PRODUCTS
    ==================================================
  */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS products (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      title VARCHAR(255),
      description TEXT DEFAULT '',
      price NUMERIC(14,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      category VARCHAR(150),
      quantity INTEGER DEFAULT 1,
      condition VARCHAR(80),
      country VARCHAR(120),
      city VARCHAR(120),
      location VARCHAR(255),
      whatsapp VARCHAR(60),
      image TEXT DEFAULT '',
      images TEXT DEFAULT '[]',
      status VARCHAR(30) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);


  /*
    ==================================================
    MIGRATION PRODUCTS
    ==================================================
  */

  await pool.query(`
    ALTER TABLE products
      ADD COLUMN IF NOT EXISTS user_id INTEGER,
      ADD COLUMN IF NOT EXISTS name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS title VARCHAR(255),
      ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS price NUMERIC(14,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD',
      ADD COLUMN IF NOT EXISTS category VARCHAR(150),
      ADD COLUMN IF NOT EXISTS quantity INTEGER DEFAULT 1,
      ADD COLUMN IF NOT EXISTS condition VARCHAR(80),
      ADD COLUMN IF NOT EXISTS country VARCHAR(120),
      ADD COLUMN IF NOT EXISTS city VARCHAR(120),
      ADD COLUMN IF NOT EXISTS location VARCHAR(255),
      ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(60),
      ADD COLUMN IF NOT EXISTS image TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS images TEXT DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  `);


  /*
    ==================================================
    SERVICES
    ==================================================
  */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS services (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      title VARCHAR(255),
      description TEXT DEFAULT '',
      price NUMERIC(14,2) DEFAULT 0,
      currency VARCHAR(10) DEFAULT 'USD',
      category VARCHAR(150),
      country VARCHAR(120),
      city VARCHAR(120),
      location VARCHAR(255),
      whatsapp VARCHAR(60),
      image TEXT DEFAULT '',
      images TEXT DEFAULT '[]',
      status VARCHAR(30) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);


  /*
    ==================================================
    MIGRATION SERVICES
    ==================================================
  */

  await pool.query(`
    ALTER TABLE services
      ADD COLUMN IF NOT EXISTS user_id INTEGER,
      ADD COLUMN IF NOT EXISTS name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS title VARCHAR(255),
      ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS price NUMERIC(14,2) DEFAULT 0,
      ADD COLUMN IF NOT EXISTS currency VARCHAR(10) DEFAULT 'USD',
      ADD COLUMN IF NOT EXISTS category VARCHAR(150),
      ADD COLUMN IF NOT EXISTS country VARCHAR(120),
      ADD COLUMN IF NOT EXISTS city VARCHAR(120),
      ADD COLUMN IF NOT EXISTS location VARCHAR(255),
      ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(60),
      ADD COLUMN IF NOT EXISTS image TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS images TEXT DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  `);


  /*
    ==================================================
    BUSINESSES
    ==================================================
  */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS businesses (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      name VARCHAR(255) NOT NULL,
      category VARCHAR(150),
      description TEXT DEFAULT '',
      phone VARCHAR(60),
      whatsapp VARCHAR(60),
      country VARCHAR(120),
      city VARCHAR(120),
      address VARCHAR(255),
      image TEXT DEFAULT '',
      images TEXT DEFAULT '[]',
      status VARCHAR(30) DEFAULT 'active',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);


  /*
    ==================================================
    MIGRATION BUSINESSES
    ==================================================
  */

  await pool.query(`
    ALTER TABLE businesses
      ADD COLUMN IF NOT EXISTS user_id INTEGER,
      ADD COLUMN IF NOT EXISTS name VARCHAR(255),
      ADD COLUMN IF NOT EXISTS category VARCHAR(150),
      ADD COLUMN IF NOT EXISTS description TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS phone VARCHAR(60),
      ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(60),
      ADD COLUMN IF NOT EXISTS country VARCHAR(120),
      ADD COLUMN IF NOT EXISTS city VARCHAR(120),
      ADD COLUMN IF NOT EXISTS address VARCHAR(255),
      ADD COLUMN IF NOT EXISTS image TEXT DEFAULT '',
      ADD COLUMN IF NOT EXISTS images TEXT DEFAULT '[]',
      ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'active',
      ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
  `);


  /*
    ==================================================
    FAVORITES
    ==================================================
  */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS favorites (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      item_type VARCHAR(40),
      item_id INTEGER,
      created_at TIMESTAMPTZ DEFAULT NOW(),
      UNIQUE(user_id, item_type, item_id)
    );
  `);


  /*
    ==================================================
    MESSAGES
    ==================================================
  */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS messages (
      id SERIAL PRIMARY KEY,
      sender_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      receiver_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      message TEXT NOT NULL,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);


  /*
    ==================================================
    REVIEWS
    ==================================================
  */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reviews (
      id SERIAL PRIMARY KEY,
      reviewer_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      reviewed_user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      rating INTEGER CHECK(rating BETWEEN 1 AND 5),
      comment TEXT DEFAULT '',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);


  /*
    ==================================================
    NOTIFICATIONS
    ==================================================
  */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS notifications (
      id SERIAL PRIMARY KEY,
      user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
      type VARCHAR(50),
      title VARCHAR(255),
      message TEXT,
      is_read BOOLEAN DEFAULT FALSE,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);


  /*
    ==================================================
    REPORTS
    ==================================================
  */

  await pool.query(`
    CREATE TABLE IF NOT EXISTS reports (
      id SERIAL PRIMARY KEY,
      reporter_id INTEGER,
      reported_user_id INTEGER,
      product_id INTEGER,
      service_id INTEGER,
      business_id INTEGER,
      type VARCHAR(50),
      reason VARCHAR(255),
      description TEXT,
      status VARCHAR(30) DEFAULT 'pending',
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `);

}


/* ==================================================
   MODERATION
   ================================================== */

const moderation = (object) => {

  const text = `
    ${object.title || object.name || ""}
    ${object.description || ""}
    ${object.category || ""}
  `.toLowerCase();

  const forbidden = [
    "arme",
    "armes",
    "explosif",
    "drogue",
    "stupéfiant",
    "faux papiers",
    "contrefaçon"
  ];

  return forbidden.some(
    word => text.includes(word)
  )
    ? "review"
    : "active";
};


/* ==================================================
   HEALTH
   ================================================== */

app.get("/api/health", async (req, res) => {

  try {

    await pool.query("SELECT 1");

    res.json({
      status: "ok",
      service: "HELPY",
      database: "connected"
    });

  } catch (error) {

    console.error("HEALTH ERROR:", error);

    res.status(503).json({
      status: "error",
      service: "HELPY",
      database: "disconnected"
    });
  }
});


/* ==================================================
   REGISTER
   ================================================== */

app.post("/api/register", async (req, res) => {

  try {

    const name = clean(req.body.name, 150);

    const email = clean(
      req.body.email,
      255
    ).toLowerCase();

    const password = String(
      req.body.password || ""
    );


    if (
      !name ||
      !email ||
      password.length < 6
    ) {

      return res.status(400).json({
        message:
          "Nom, email et mot de passe (6 caractères minimum) requis."
      });
    }


    const exists = await pool.query(
      "SELECT id FROM users WHERE email=$1",
      [email]
    );


    if (exists.rowCount) {

      return res.status(409).json({
        message:
          "Cet email est déjà utilisé."
      });
    }


    const hash = await bcrypt.hash(
      password,
      12
    );


    const result = await pool.query(
      `
      INSERT INTO users(
        name,
        email,
        password,
        whatsapp,
        country,
        city
      )
      VALUES(
        $1,
        $2,
        $3,
        $4,
        $5,
        $6
      )
      RETURNING
        id,
        name,
        email,
        phone,
        whatsapp,
        country,
        city,
        role,
        status,
        verified,
        created_at
      `,
      [
        name,
        email,
        hash,
        clean(req.body.whatsapp, 60),
        clean(req.body.country, 120),
        clean(req.body.city, 120)
      ]
    );


    res.status(201).json({
      statut: "ok",
      utilisateur: result.rows[0]
    });

  } catch (error) {

    err(res, error);
  }
});


/* ==================================================
   LOGIN
   ================================================== */

app.post("/api/login", async (req, res) => {

  try {

    const email = clean(
      req.body.email,
      255
    ).toLowerCase();

    const password = String(
      req.body.password || ""
    );


    const result = await pool.query(
      `
      SELECT *
      FROM users
      WHERE email=$1
      LIMIT 1
      `,
      [email]
    );


    if (
      !result.rowCount ||
      !(await bcrypt.compare(
        password,
        result.rows[0].password
      ))
    ) {

      return res.status(401).json({
        message:
          "Email ou mot de passe incorrect."
      });
    }


    const user = result.rows[0];


    res.json({
      statut: "ok",
      utilisateur: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        whatsapp: user.whatsapp,
        country: user.country,
        city: user.city,
        description: user.description,
        profile_photo: user.profile_photo,
        role: user.role,
        status: user.status,
        verified: user.verified,
        created_at: user.created_at
      }
    });

  } catch (error) {

    err(res, error);
  }
});


/* ==================================================
   GET USER PROFILE
   ================================================== */

app.get("/api/users/:id", async (req, res) => {

  try {

    const result = await pool.query(
      `
      SELECT
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
      FROM users
      WHERE id=$1
      `,
      [req.params.id]
    );


    if (!result.rowCount) {

      return res.status(404).json({
        message:
          "Utilisateur introuvable."
      });
    }


    res.json({
      statut: "ok",
      utilisateur: result.rows[0]
    });

  } catch (error) {

    err(res, error);
  }
});


/* ==================================================
   UPDATE USER PROFILE
   ================================================== */

app.put("/api/users/:id", async (req, res) => {

  try {

    const result = await pool.query(
      `
      UPDATE users
      SET
        name=COALESCE(
          NULLIF($1,''),
          name
        ),
        phone=$2,
        whatsapp=$3,
        country=$4,
        city=$5,
        description=$6
      WHERE id=$7
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
        clean(req.body.name, 150),
        clean(req.body.phone, 60),
        clean(req.body.whatsapp, 60),
        clean(req.body.country, 120),
        clean(req.body.city, 120),
        clean(req.body.description, 2000),
        req.params.id
      ]
    );


    if (!result.rowCount) {

      return res.status(404).json({
        message:
          "Utilisateur introuvable."
      });
    }


    res.json({
      statut: "ok",
      utilisateur: result.rows[0],
      message:
        "Votre profil a été mis à jour avec succès."
    });

  } catch (error) {

    err(res, error);
  }
});


/* ==================================================
   PRODUCTS / SERVICES
   ================================================== */

function itemRoutes(type, table) {

  /*
    GET ALL
  */

  app.get(
    "/api/" + type,
    async (req, res) => {

      try {

        const result = await pool.query(
          `
          SELECT *
          FROM ${table}
          WHERE status='active'
          ORDER BY created_at DESC
          `
        );


        if (type === "products") {

          return res.json({
            statut: "ok",
            produits: result.rows
          });

        }


        res.json({
          statut: "ok",
          services: result.rows
        });

      } catch (error) {

        err(res, error);
      }
    }
  );


  /*
    GET ONE
  */

  app.get(
    "/api/" + type + "/:id",
    async (req, res) => {

      try {

        const result = await pool.query(
          `
          SELECT *
          FROM ${table}
          WHERE id=$1
          `,
          [req.params.id]
        );


        if (!result.rowCount) {

          return res.status(404).json({
            message:
              "Introuvable."
          });
        }


        res.json({
          statut: "ok",
          item: result.rows[0]
        });

      } catch (error) {

        err(res, error);
      }
    }
  );


  /*
    CREATE
  */

  app.post(
    "/api/" + type,
    async (req, res) => {

      try {

        const body = req.body;

        const userId = uid(req);


        if (!userId) {

          return res.status(401).json({
            message:
              "Connexion requise."
          });
        }


        const title = clean(
          body.title || body.name,
          255
        );


        const status =
          moderation(body);


        const images =
          Array.isArray(body.images)
            ? body.images.slice(0, 8)
            : [];


        if (
          !title ||
          !clean(body.whatsapp, 60)
        ) {

          return res.status(400).json({
            message:
              "Nom/titre et WhatsApp sont obligatoires."
          });
        }


        let result;


        if (type === "products") {

          result = await pool.query(
            `
            INSERT INTO products(
              user_id,
              name,
              title,
              description,
              price,
              currency,
              category,
              quantity,
              condition,
              country,
              city,
              location,
              whatsapp,
              image,
              images,
              status
            )
            VALUES(
              $1,
              $2,
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
              $13,
              $14,
              $15
            )
            RETURNING *
            `,
            [
              userId,
              title,
              clean(body.description),
              Number(body.price) || 0,
              clean(body.currency
              clean(body.currency, 10) || "USD",
              clean(body.category, 150),
              Number(body.quantity) || 1,
              clean(body.condition, 80),
              clean(body.country, 120),
              clean(body.city, 120),
              clean(
                body.location || body.city,
                255
              ),
              clean(body.whatsapp, 60),
              images[0] ||
                clean(
                  body.image ||
                  body.image_url,
                  1000000
                ),
              JSON.stringify(images),
              status
            ]
          );

        } else {

          result = await pool.query(
            `
            INSERT INTO services(
              user_id,
              name,
              title,
              description,
              price,
              currency,
              category,
              country,
              city,
              location,
              whatsapp,
              image,
              images,
              status
            )
            VALUES(
              $1,
              $2,
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
              title,
              clean(body.description),
              Number(body.price) || 0,
              clean(body.currency, 10) || "USD",
              clean(body.category, 150),
              clean(body.country, 120),
              clean(body.city, 120),
              clean(
                body.location || body.city,
                255
              ),
              clean(body.whatsapp, 60),
              images[0] ||
                clean(
                  body.image ||
                  body.image_url,
                  1000000
                ),
              JSON.stringify(images),
              status
            ]
          );
        }

        res.status(201).json({
          statut: "ok",
          message:
            status === "review"
              ? "Publication envoyée en vérification."
              : "Publication réussie.",
          item: result.rows[0]
        });

      } catch (error) {

        err(res, error);
      }
    }
  );
}


itemRoutes(
  "products",
  "products"
);

itemRoutes(
  "services",
  "services"
);


/* ==================================================
   BUSINESSES
   ================================================== */

app.get(
  "/api/businesses",
  async (req, res) => {

    try {

      const result = await pool.query(
        `
        SELECT *
        FROM businesses
        WHERE status='active'
        ORDER BY created_at DESC
        `
      );

      res.json({
        statut: "ok",
        entreprises: result.rows
      });

    } catch (error) {

      err(res, error);
    }
  }
);


app.get(
  "/api/businesses/:id",
  async (req, res) => {

    try {

      const result = await pool.query(
        `
        SELECT *
        FROM businesses
        WHERE id=$1
        `,
        [req.params.id]
      );

      if (!result.rowCount) {

        return res.status(404).json({
          message:
            "Entreprise introuvable."
        });
      }

      res.json({
        statut: "ok",
        entreprise: result.rows[0]
      });

    } catch (error) {

      err(res, error);
    }
  }
);


app.post(
  "/api/businesses",
  async (req, res) => {

    try {

      const userId = uid(req);

      const body = req.body;

      if (!userId) {

        return res.status(401).json({
          message:
            "Connexion requise."
        });
      }

      if (
        !clean(body.name, 255) ||
        !clean(body.whatsapp, 60)
      ) {

        return res.status(400).json({
          message:
            "Nom et WhatsApp sont obligatoires."
        });
      }

      const images =
        Array.isArray(body.images)
          ? body.images.slice(0, 8)
          : [];

      const result = await pool.query(
        `
        INSERT INTO businesses(
          user_id,
          name,
          category,
          description,
          phone,
          whatsapp,
          country,
          city,
          address,
          image,
          images,
          status
        )
        VALUES(
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
          $12
        )
        RETURNING *
        `,
        [
          userId,
          clean(body.name, 255),
          clean(body.category, 150),
          clean(body.description),
          clean(body.phone, 60),
          clean(body.whatsapp, 60),
          clean(body.country, 120),
          clean(body.city, 120),
          clean(body.address, 255),
          images[0] ||
            clean(
              body.image ||
              body.image_url,
              1000000
            ),
          JSON.stringify(images),
          moderation(body)
        ]
      );

      res.status(201).json({
        statut: "ok",
        entreprise: result.rows[0]
      });

    } catch (error) {

      err(res, error);
    }
  }
);


/* ==================================================
   SEARCH
   ================================================== */

app.get(
  "/api/search",
  async (req, res) => {

    try {

      const q =
        "%" +
        clean(req.query.q, 100) +
        "%";

      const [
        products,
        services,
        businesses
      ] = await Promise.all([

        pool.query(
          `
          SELECT *
          FROM products
          WHERE status='active'
          AND (
            title ILIKE $1
            OR description ILIKE $1
            OR category ILIKE $1
          )
          LIMIT 50
          `,
          [q]
        ),

        pool.query(
          `
          SELECT *
          FROM services
          WHERE status='active'
          AND (
            title ILIKE $1
            OR description ILIKE $1
            OR category ILIKE $1
          )
          LIMIT 50
          `,
          [q]
        ),

        pool.query(
          `
          SELECT *
          FROM businesses
          WHERE status='active'
          AND (
            name ILIKE $1
            OR description ILIKE $1
            OR category ILIKE $1
          )
          LIMIT 50
          `,
          [q]
        )

      ]);

      res.json({
        statut: "ok",
        produits: products.rows,
        services: services.rows,
        entreprises: businesses.rows
      });

    } catch (error) {

      err(res, error);
    }
  }
);


/* ==================================================
   STATIC FRONTEND
   ================================================== */

app.use(
  express.static(__dirname)
);


app.get(
  "/",
  (req, res) => {

    res.sendFile(
      path.join(
        __dirname,
        "index.html"
      )
    );
  }
);


/* ==================================================
   API 404
   ================================================== */

app.use(
  "/api",
  (req, res) => {

    res.status(404).json({
      message:
        "Route API introuvable."
    });
  }
);


/* ==================================================
   START SERVER
   ================================================== */

(async () => {

  try {

    await db();

    app.listen(
      PORT,
      "0.0.0.0",
      () => {

        console.log(
          "HELPY running on " + PORT
        );

      }
    );

  } catch (error) {

    console.error(
      "HELPY startup failed",
      error
    );

    process.exit(1);
  }

})();