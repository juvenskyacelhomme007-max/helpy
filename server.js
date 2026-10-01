const express = require("express");
const path = require("path");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { Pool } = require("pg");

const {
  DATABASE_URL,
  JWT_SECRET,
  PORT = 3000,
  PGSSL
} = process.env;

if (!DATABASE_URL || !JWT_SECRET) {
  console.error("DATABASE_URL et JWT_SECRET sont requis");
  process.exit(1);
}

const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl:
    PGSSL === "true"
      ? { rejectUnauthorized: false }
      : false
});

const app = express();

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

app.use(
  express.static(
    path.join(__dirname, "public")
  )
);

const q = (text, params = []) =>
  pool.query(text, params);

const wrap = (fn) => async (req, res, next) => {
  try {
    await fn(req, res, next);
  } catch (error) {
    console.error(error);

    if (res.headersSent) {
      return next(error);
    }

    res.status(500).json({
      error: "Une erreur est survenue."
    });
  }
};

const bad = (res, message, status = 400) =>
  res.status(status).json({
    error: message
  });

/* =========================================================
   AUTHENTICATION
========================================================= */

const getToken = (req) => {
  const header = req.headers.authorization || "";

  if (!header.startsWith("Bearer ")) {
    return null;
  }

  return header.slice(7).trim();
};

const auth = (req, res, next) => {
  try {
    const token = getToken(req);

    if (!token) {
      return bad(
        res,
        "Vous devez être connecté pour continuer.",
        401
      );
    }

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    );

    req.uid = Number(decoded.id);

    if (!req.uid) {
      return bad(
        res,
        "Session invalide.",
        401
      );
    }

    next();
  } catch {
    return bad(
      res,
      "Votre session a expiré. Veuillez vous reconnecter.",
      401
    );
  }
};

const optAuth = (req, res, next) => {
  try {
    const token = getToken(req);

    if (token) {
      const decoded = jwt.verify(
        token,
        JWT_SECRET
      );

      req.uid = Number(decoded.id) || null;
    }
  } catch {
    req.uid = null;
  }

  next();
};

const tok = (id) =>
  jwt.sign(
    {
      id: Number(id)
    },
    JWT_SECRET,
    {
      expiresIn: "30d"
    }
  );

const pub = (user) => {
  if (!user) return null;

  const {
    password_hash,
    ...safeUser
  } = user;

  return safeUser;
};

/* =========================================================
   NOTIFICATIONS
========================================================= */

const notify = (
  userId,
  type,
  body
) => {
  return q(
    `
    INSERT INTO notifications
    (user_id, type, body)
    VALUES ($1, $2, $3)
    `,
    [
      userId,
      type,
      body
    ]
  ).catch((error) => {
    console.error(
      "Notification error:",
      error.message
    );
  });
};

/* =========================================================
   DATABASE SCHEMA
========================================================= */

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  phone TEXT,
  whatsapp TEXT,
  country TEXT,
  city TEXT,
  bio TEXT,
  photo TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price NUMERIC(14,2),
  currency TEXT DEFAULT 'USD',
  photos JSONB DEFAULT '[]',
  country TEXT,
  city TEXT,
  quantity INT DEFAULT 1,
  condition TEXT,
  contact TEXT,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS services (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  price NUMERIC(14,2),
  currency TEXT DEFAULT 'USD',
  photos JSONB DEFAULT '[]',
  country TEXT,
  city TEXT,
  whatsapp TEXT,
  phone TEXT,
  availability TEXT,
  contact_method TEXT,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS businesses (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  photos JSONB DEFAULT '[]',
  phone TEXT,
  whatsapp TEXT,
  country TEXT,
  city TEXT,
  address TEXT,
  website TEXT,
  hours TEXT,
  socials TEXT,
  status TEXT DEFAULT 'published',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS favorites (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  item_type TEXT NOT NULL
    CHECK(item_type IN ('products','services','businesses')),
  item_id INT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, item_type, item_id)
);

CREATE TABLE IF NOT EXISTS messages (
  id SERIAL PRIMARY KEY,
  sender_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reviews (
  id SERIAL PRIMARY KEY,
  author_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL
    CHECK(target_type IN ('users','services','businesses')),
  target_id INT NOT NULL,
  rating INT NOT NULL
    CHECK(rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(author_id, target_type, target_id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type TEXT,
  body TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS reports (
  id SERIAL PRIMARY KEY,
  reporter_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_type TEXT NOT NULL,
  target_id INT NOT NULL,
  reason TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS i_products
ON products(status, category, country, city, created_at DESC);

CREATE INDEX IF NOT EXISTS i_services
ON services(status, category, country, city, created_at DESC);

CREATE INDEX IF NOT EXISTS i_businesses
ON businesses(status, category, country, city, created_at DESC);

CREATE INDEX IF NOT EXISTS i_messages
ON messages(receiver_id, is_read);

CREATE INDEX IF NOT EXISTS i_favorites
ON favorites(user_id, item_type, item_id);

CREATE INDEX IF NOT EXISTS i_reviews
ON reviews(target_type, target_id);
`;

/* =========================================================
   DATABASE MIGRATION
========================================================= */

const MIGRATION = `
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS photo TEXT;

ALTER TABLE products ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE products ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';
ALTER TABLE products ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS quantity INT DEFAULT 1;
ALTER TABLE products ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS contact TEXT;
ALTER TABLE products ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
ALTER TABLE products ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE services ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'USD';
ALTER TABLE services ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';
ALTER TABLE services ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS availability TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS contact_method TEXT;
ALTER TABLE services ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
ALTER TABLE services ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE businesses ADD COLUMN IF NOT EXISTS photos JSONB DEFAULT '[]';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS whatsapp TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS country TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS city TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS website TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS hours TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS socials TEXT;
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'published';
ALTER TABLE businesses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE favorites ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE messages ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE messages ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE reviews ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE reviews ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE notifications ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;
ALTER TABLE notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();

ALTER TABLE reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT now();
`;

/* =========================================================
   HEALTH
========================================================= */

app.get(
  "/api/health",
  async (req, res) => {
    try {
      await q("SELECT 1");

      res.json({
        status: "ok",
        service: "HELPY",
        database: "connected"
      });
    } catch (error) {
      console.error(
        "Health error:",
        error.message
      );

      res.status(503).json({
        status: "error",
        service: "HELPY",
        database: "disconnected"
      });
    }
  }
);

/* =========================================================
   AUTH - REGISTER
========================================================= */

app.post(
  "/api/register",
  wrap(async (req, res) => {
    const {
      name,
      email,
      password,
      phone,
      whatsapp,
      country,
      city
    } = req.body || {};

    const cleanName =
      typeof name === "string"
        ? name.trim()
        : "";

    const cleanEmail =
      typeof email === "string"
        ? email.trim().toLowerCase()
        : "";

    if (
      !cleanName ||
      cleanName.length < 2 ||
      !/^\S+@\S+\.\S+$/.test(cleanEmail) ||
      typeof password !== "string" ||
      password.length < 6
    ) {
      return bad(
        res,
        "Veuillez vérifier vos informations."
      );
    }

    const hash =
      await bcrypt.hash(password, 10);

    try {
      const result = await q(
        `
        INSERT INTO users
        (name,email,password_hash,phone,whatsapp,country,city)
        VALUES ($1,$2,$3,$4,$5,$6,$7)
        RETURNING *
        `,
        [
          cleanName,
          cleanEmail,
          hash,
          phone || null,
          whatsapp || null,
          country || null,
          city || null
        ]
      );

      const user = result.rows[0];

      res.status(201).json({
        token: tok(user.id),
        user: pub(user)
      });
    } catch (error) {
      if (error.code === "23505") {
        return bad(
          res,
          "Cet email est déjà utilisé.",
          409
        );
      }

      throw error;
    }
  })
);

/* =========================================================
   AUTH - LOGIN
========================================================= */

app.post(
  "/api/login",
  wrap(async (req, res) => {
    const email =
      typeof req.body?.email === "string"
        ? req.body.email.trim().toLowerCase()
        : "";

    const password =
      typeof req.body?.password === "string"
        ? req.body.password
        : "";

    const result = await q(
      "SELECT * FROM users WHERE email=$1",
      [email]
    );

    const user = result.rows[0];

    if (
      !user ||
      !(await bcrypt.compare(
        password,
        user.password_hash
      ))
    ) {
      return bad(
        res,
        "Email ou mot de passe incorrect.",
        401
      );
    }

    res.json({
      token: tok(user.id),
      user: pub(user)
    });
  })
);

/* =========================================================
   CURRENT USER
========================================================= */

app.get(
  "/api/me",
  auth,
  wrap(async (req, res) => {
    const result = await q(
      "SELECT * FROM users WHERE id=$1",
      [req.uid]
    );

    if (!result.rows[0]) {
      return bad(
        res,
        "Utilisateur introuvable.",
        404
      );
    }

    res.json(
      pub(result.rows[0])
    );
  })
);

/* =========================================================
   USER PROFILE
========================================================= */

app.get(
  "/api/users/:id",
  optAuth,
  wrap(async (req, res) => {
    const id = Number(req.params.id);

    if (!Number.isInteger(id)) {
      return bad(
        res,
        "Utilisateur introuvable.",
        404
      );
    }

    const result = await q(
      `
      SELECT
        u.id,
        u.name,
        u.phone,
        u.whatsapp,
        u.country,
        u.city,
        u.bio,
        u.photo,
        u.created_at,
        COALESCE(
          ROUND(
            AVG(r.rating)::numeric,
            1
          ),
          0
        ) AS rating,
        COUNT(r.id)::int AS reviews_count
      FROM users u
      LEFT JOIN reviews r
        ON r.target_type='users'
       AND r.target_id=u.id
      WHERE u.id=$1
      GROUP BY u.id
      `,
      [id]
    );

    const user = result.rows[0];

    if (!user) {
      return bad(
        res,
        "Utilisateur introuvable.",
        404
      );
    }

    user.products = (
      await q(
        `
        SELECT *
        FROM products
        WHERE user_id=$1
        AND status='published'
        ORDER BY created_at DESC
        LIMIT 50
        `,
        [id]
      )
    ).rows;

    user.services = (
      await q(
        `
        SELECT *
        FROM services
        WHERE user_id=$1
        AND status='published'
        ORDER BY created_at DESC
        LIMIT 50
        `,
        [id]
      )
    ).rows;

    user.businesses = (
      await q(
        `
        SELECT *
        FROM businesses
        WHERE user_id=$1
        AND status='published'
        ORDER BY created_at DESC
        LIMIT 50
        `,
        [id]
      )
    ).rows;

    user.reviews = (
      await q(
        `
        SELECT
          r.*,
          u.name AS author,
          u.photo AS author_photo
        FROM reviews r
        JOIN users u
          ON u.id=r.author_id
        WHERE r.target_type='users'
        AND r.target_id=$1
        ORDER BY r.created_at DESC
        LIMIT 30
        `,
        [id]
      )
    ).rows;

    res.json(user);
  })
);

app.put(
  "/api/users/:id",
  auth,
  wrap(async (req, res) => {
    const id = Number(req.params.id);

    if (id !== req.uid) {
      return bad(
        res,
        "Action non autorisée.",
        403
      );
    }

    const body = req.body || {};

    if (
      body.photo &&
      !/^data:image\/(jpeg|png|webp);base64,/i.test(
        body.photo
      )
    ) {
      return bad(
        res,
        "Format de photo invalide (JPG, PNG, WEBP)."
      );
    }

    const result = await q(
      `
      UPDATE users
      SET
        name=COALESCE(NULLIF($1,''),name),
        bio=$2,
        phone=$3,
        whatsapp=$4,
        country=$5,
        city=$6,
        photo=COALESCE($7,photo)
      WHERE id=$8
      RETURNING *
      `,
      [
        typeof body.name === "string"
          ? body.name.trim().slice(0, 150)
          : "",
        body.bio
          ? String(body.bio).slice(0, 1000)
          : null,
        body.phone
          ? String(body.phone).slice(0, 50)
          : null,
        body.whatsapp
          ? String(body.whatsapp).slice(0, 50)
          : null,
        body.country
          ? String(body.country).slice(0, 100)
          : null,
        body.city
          ? String(body.city).slice(0, 100)
          : null,
        body.photo || null,
        id
      ]
    );

    if (!result.rows[0]) {
      return bad(
        res,
        "Utilisateur introuvable.",
        404
      );
    }

    res.json(
      pub(result.rows[0])
    );
  })
);

/* =========================================================
   MODERATION
========================================================= */

const BANNED =
  /\b(arme à feu|cocaïne|héroïne|weapon|cocaine|escort|porn|viagra)\b/i;

const SPAM =
  /(https?:\/\/\S+.*){3,}|(.)\2{9,}|gagnez \$?\d+|click here|bit\.ly/i;

async function moderate(
  table,
  body,
  userId
) {
  const text =
    `${body.title || ""} ${body.description || ""}`;

  if (
    BANNED.test(text) ||
    SPAM.test(text)
  ) {
    return "pending_review";
  }

  if (
    body.price !== undefined &&
    body.price !== "" &&
    (
      Number.isNaN(Number(body.price)) ||
      Number(body.price) < 0 ||
      Number(body.price) > 1000000000
    )
  ) {
    return "pending_review";
  }

  const duplicate = await q(
    `
    SELECT 1
    FROM ${table}
    WHERE user_id=$1
      AND lower(title)=lower($2)
      AND created_at >
        now()-interval '7 days'
    LIMIT 1
    `,
    [
      userId,
      body.title
    ]
  );

  if (duplicate.rowCount) {
    return "pending_review";
  }

  return "published";
}

/* =========================================================
   LISTING CONFIGURATION
========================================================= */

const T = {
  products: [
    "title",
    "category",
    "description",
    "price",
    "currency",
    "photos",
    "country",
    "city",
    "quantity",
    "condition",
    "contact"
  ],

  services: [
    "title",
    "category",
    "description",
    "price",
    "currency",
    "photos",
    "country",
    "city",
    "whatsapp",
    "phone",
    "availability",
    "contact_method"
  ],

  businesses: [
    "title",
    "category",
    "description",
    "photos",
    "phone",
    "whatsapp",
    "country",
    "city",
    "address",
    "website",
    "hours",
    "socials"
  ]
};

const PHOTO_REGEX =
  /^data:image\/(jpeg|png|webp);base64,/i;

const URL_REGEX =
  /^https?:\/\/.+/i;

/* =========================================================
   CLEAN LISTING DATA
========================================================= */

function cleanListing(
  table,
  body
) {
  const output = {};

  for (const column of T[table]) {
    if (
      body[column] !== undefined
    ) {
      output[column] =
        body[column];
    }
  }

  /* Photos */
  if (
    output.photos !== undefined
  ) {
    const photos =
      Array.isArray(output.photos)
        ? output.photos.slice(0, 5)
        : [];

    for (const photo of photos) {
      if (
        typeof photo !== "string" ||
        (
          !PHOTO_REGEX.test(photo) &&
          !URL_REGEX.test(photo)
        )
      ) {
        return {
          error:
            "Photo invalide (JPG, PNG, WEBP)."
        };
      }
    }

     output.photos =
      JSON.stringify(photos);
  }

  /* Text limits */
  for (
    const key of Object.keys(output)
  ) {
    if (
      typeof output[key] === "string"
    ) {
      const maxLength =
        key === "description"
          ? 4000
          : key === "socials"
          ? 2000
          : 500;

      output[key] =
        output[key]
          .trim()
          .slice(0, maxLength);
    }
  }

  /* Price */
  if (
    output.price === "" ||
    output.price === null
  ) {
    delete output.price;
  }

  if (
    output.price !== undefined
  ) {
    const price =
      Number(output.price);

    if (
      !Number.isFinite(price) ||
      price < 0 ||
      price > 1000000000
    ) {
      return {
        error: "Prix invalide."
      };
    }

    output.price = price;
  }

  /* Quantity */
  if (
    output.quantity !== undefined
  ) {
    const quantity =
      Number(output.quantity);

    if (
      !Number.isInteger(quantity) ||
      quantity < 0 ||
      quantity > 1000000
    ) {
      return {
        error: "Quantité invalide."
      };
    }

    output.quantity =
      quantity;
  }

  return {
    data: output
  };
}

/* =========================================================
   LISTINGS - GET
========================================================= */

for (
  const table of Object.keys(T)
) {

  app.get(
    `/api/${table}`,
    wrap(async (req, res) => {

      const Q =
        req.query || {};

      const where = [
        "x.status='published'"
      ];

      const params = [];

      const add = (
        sql,
        values = []
      ) => {

        let statement =
          sql;

        for (
          const value of values
        ) {
          params.push(value);

          statement =
            statement.replace(
              "?",
              `$${params.length}`
            );
        }

        where.push(statement);
      };

      /* Search */
      if (Q.q) {

        const search =
          `%${String(Q.q).trim()}%`;

        add(
          `
          (
            x.title ILIKE ?
            OR COALESCE(
              x.description,
              ''
            ) ILIKE ?
          )
          `,
          [
            search,
            search
          ]
        );
      }

      /* Category */
      if (Q.category) {
        add(
          "x.category=?",
          [String(Q.category)]
        );
      }

      /* Country */
      if (Q.country) {
        add(
          "x.country=?",
          [String(Q.country)]
        );
      }

      /* City */
      if (Q.city) {
        add(
          "x.city ILIKE ?",
          [String(Q.city)]
        );
      }

      /* User */
      if (
        Q.user &&
        Number.isInteger(
          Number(Q.user)
        )
      ) {
        add(
          "x.user_id=?",
          [Number(Q.user)]
        );
      }

      /* Price filters */
      if (
        table !== "businesses"
      ) {

        if (
          Q.min !== undefined &&
          Q.min !== ""
        ) {
          const min =
            Number(Q.min);

          if (
            Number.isFinite(min)
          ) {
            add(
              "x.price>=?",
              [min]
            );
          }
        }

        if (
          Q.max !== undefined &&
          Q.max !== ""
        ) {
          const max =
            Number(Q.max);

          if (
            Number.isFinite(max)
          ) {
            add(
              "x.price<=?",
              [max]
            );
          }
        }
      }

      /* Sorting */
      let order =
        "x.created_at DESC";

      if (
        table !== "businesses"
      ) {

        if (
          Q.sort === "price_asc"
        ) {
          order =
            "x.price ASC NULLS LAST";
        }

        if (
          Q.sort === "price_desc"
        ) {
          order =
            "x.price DESC NULLS LAST";
        }
      }

      /* Pagination */
      const limit =
        Math.min(
          Math.max(
            Number(Q.limit) || 20,
            1
          ),
          50
        );

      const page =
        Math.max(
          Number(Q.page) || 1,
          1
        );

      const offset =
        (page - 1) * limit;

      params.push(
        limit,
        offset
      );

      const rating =
        table === "products"
          ? `
              0 AS rating,
              0 AS reviews_count
            `
          : ratingSQL(
              table,
              "x.id"
            );

      const result =
        await q(
          `
          SELECT
            x.*,
            u.name AS seller_name,
            u.photo AS seller_photo,
            ${rating}
          FROM ${table} x
          JOIN users u
            ON u.id=x.user_id
          WHERE ${where.join(
            " AND "
          )}
          ORDER BY ${order}
          LIMIT $${params.length - 1}
          OFFSET $${params.length}
          `,
          params
        );

      res.json({
        items: result.rows,
        page,
        limit
      });
    })
  );

  /* =====================================================
     SINGLE LISTING
  ===================================================== */

  app.get(
    `/api/${table}/:id`,
    optAuth,
    wrap(async (req, res) => {

      const id =
        Number(req.params.id);

      if (
        !Number.isInteger(id)
      ) {
        return bad(
          res,
          "Introuvable.",
          404
        );
      }

      const targetType =
        table === "products"
          ? "users"
          : table;

      const targetId =
        table === "products"
          ? "x.user_id"
          : "x.id";

      const result =
        await q(
          `
          SELECT
            x.*,
            u.name AS seller_name,
            u.photo AS seller_photo,
            u.phone AS seller_phone,
            u.whatsapp AS seller_whatsapp,
            ${ratingSQL(
              targetType,
              targetId
            )}
          FROM ${table} x
          JOIN users u
            ON u.id=x.user_id
          WHERE x.id=$1
          `,
          [id]
        );

      const item =
        result.rows[0];

      if (
        !item ||
        (
          item.status !==
            "published" &&
          item.user_id !==
            req.uid
        )
      ) {
        return bad(
          res,
          "Introuvable.",
          404
        );
      }

      item.reviews =
        (
          await q(
            `
            SELECT
              r.rating,
              r.comment,
              r.created_at,
              u.name AS author,
              u.photo AS author_photo
            FROM reviews r
            JOIN users u
              ON u.id=r.author_id
            WHERE
              target_type=$1
              AND target_id=$2
            ORDER BY
              r.created_at DESC
            LIMIT 30
            `,
            [
              targetType,
              table === "products"
                ? item.user_id
                : item.id
            ]
          )
        ).rows;

      res.json(item);
    })
  );

  /* =====================================================
     CREATE LISTING
  ===================================================== */

  app.post(
    `/api/${table}`,
    auth,
    wrap(async (req, res) => {

      const {
        data,
        error
      } =
        clean(
          table,
          req.body || {}
        );

      if (error) {
        return bad(
          res,
          error
        );
      }

      /* Required fields */
      if (
        !data.title ||
        !data.category
      ) {
        return bad(
          res,
          "Veuillez vérifier vos informations."
        );
      }

      /* Product price required */
      if (
        table === "products" &&
        (
          data.price ===
            undefined ||
          !Number.isFinite(
            Number(data.price)
          )
        )
      ) {
        return bad(
          res,
          "Veuillez indiquer un prix valide."
        );
      }

      /* WhatsApp required when selected */
      if (
        table === "services" &&
        data.contact_method ===
          "whatsapp" &&
        !data.whatsapp
      ) {
        return bad(
          res,
          "Le numéro WhatsApp est obligatoire."
        );
      }

      /* Moderation */
      const status =
        await moderate(
          table,
          data,
          req.uid
        );

      const columns = [
        "user_id",
        "status",
        ...Object.keys(data)
      ];

      const values = [
        req.uid,
        status,
        ...Object.values(data)
      ];

      const placeholders =
        values.map(
          (_, index) =>
            `$${index + 1}`
        );

      const result =
        await q(
          `
          INSERT INTO ${table}
          (${columns.join(",")})
          VALUES
          (${placeholders.join(",")})
          RETURNING *
          `,
          values
        );

      await notify(
        req.uid,
        status === "published"
          ? "published"
          : "pending",
        status === "published"
          ? `Votre publication est en ligne : ${data.title}`
          : `Votre publication est en cours de vérification : ${data.title}`
      );

      res.status(201).json(
        result.rows[0]
      );
    })
  );

  /* =====================================================
     UPDATE LISTING
  ===================================================== */

  app.put(
    `/api/${table}/:id`,
    auth,
    wrap(async (req, res) => {

      const {
        data,
        error
      } =
        clean(
          table,
          req.body || {}
        );

      if (error) {
        return bad(
          res,
          error
        );
      }

      const keys =
        Object.keys(data);

      if (!keys.length) {
        return bad(
          res,
          "Aucune modification."
        );
      }

      const values =
        keys.map(
          key => data[key]
        );

      const sets =
        keys.map(
          (key, index) =>
            `${key}=$${index + 1}`
        ).join(",");

      const result =
        await q(
          `
          UPDATE ${table}
          SET ${sets}
          WHERE
            id=$${keys.length + 1}
            AND user_id=$${keys.length + 2}
          RETURNING *
          `,
          [
            ...values,
            Number(req.params.id),
            req.uid
          ]
        );

      if (!result.rows[0]) {
        return bad(
          res,
          "Action non autorisée.",
          403
        );
      }

      res.json(
        result.rows[0]
      );
    })
  );

  /* =====================================================
     DELETE LISTING
  ===================================================== */

  app.delete(
    `/api/${table}/:id`,
    auth,
    wrap(async (req, res) => {

      const id =
        Number(req.params.id);

      const result =
        await q(
          `
          DELETE FROM ${table}
          WHERE id=$1
          AND user_id=$2
          `,
          [
            id,
            req.uid
          ]
        );

      if (!result.rowCount) {
        return bad(
          res,
          "Action non autorisée.",
          403
        );
      }

      await q(
        `
        DELETE FROM favorites
        WHERE item_type=$1
        AND item_id=$2
        `,
        [
          table,
          id
        ]
      );

      res.json({
        ok: true
      });
    })
  );
}

/* =========================================================
   FAVORITES
========================================================= */

app.get(
  "/api/favorites",
  auth,
  wrap(async (req, res) => {

    const favorites =
      (
        await q(
          `
          SELECT *
          FROM favorites
          WHERE user_id=$1
          ORDER BY created_at DESC
          `,
          [req.uid]
        )
      ).rows;

    const output = [];

    for (
      const table of Object.keys(T)
    ) {

      const ids =
        favorites
          .filter(
            item =>
              item.item_type ===
              table
          )
          .map(
            item =>
              item.item_id
          );

      if (!ids.length) {
        continue;
      }

      const result =
        await q(
          `
          SELECT *
          FROM ${table}
          WHERE id=ANY($1)
          AND status='published'
          `,
          [ids]
        );

      for (
        const item of result.rows
      ) {
        output.push({
          ...item,
          item_type: table
        });
      }
    }

    res.json(output);
  })
);

app.post(
  "/api/favorites",
  auth,
  wrap(async (req, res) => {

    const {
      item_type,
      item_id
    } =
      req.body || {};

    const id =
      Number(item_id);

    if (
      !T[item_type] ||
      !Number.isInteger(id)
    ) {
      return bad(
        res,
        "Veuillez vérifier vos informations."
      );
    }

    const item =
      (
        await q(
          `
          SELECT
            user_id,
            title
          FROM ${item_type}
          WHERE id=$1
          `,
          [id]
        )
      ).rows[0];

    if (!item) {
      return bad(
        res,
        "Introuvable.",
        404
      );
    }

    const result =
      await q(
        `
        INSERT INTO favorites
        (user_id,item_type,item_id)
        VALUES($1,$2,$3)
        ON CONFLICT DO NOTHING
        `,
        [
          req.uid,
          item_type,
          id
        ]
      );

    if (
      result.rowCount &&
      item.user_id !== req.uid
    ) {
      await notify(
        item.user_id,
        "favorite",
        `Votre publication a été ajoutée aux favoris : ${item.title}`
      );
    }

    res.json({
      ok: true
    });
  })
);

app.delete(
  "/api/favorites/:type/:id",
  auth,
  wrap(async (req, res) => {

    await q(
      `
      DELETE FROM favorites
      WHERE user_id=$1
      AND item_type=$2
      AND item_id=$3
      `,
      [
        req.uid,
        req.params.type,
        Number(req.params.id)
      ]
    );

    res.json({
      ok: true
    });
  })
);

app.get(
  "/api/favorites/ids",
  auth,
  wrap(async (req, res) => {

    const result =
      await q(
        `
        SELECT
          item_type,
          item_id
        FROM favorites
        WHERE user_id=$1
        `,
        [req.uid]
      );

    res.json(
      result.rows
    );
  })
);

/* =========================================================
   MESSAGES
========================================================= */

app.get(
  "/api/messages",
  auth,
  wrap(async (req, res) => {

    if (req.query.with) {

      const other =
        Number(
          req.query.with
        );

      if (
        !Number.isInteger(other)
      ) {
        return bad(
          res,
          "Utilisateur invalide."
        );
      }

      const result =
        await q(
          `
          SELECT *
          FROM messages
          WHERE
            (
              sender_id=$1
              AND receiver_id=$2
            )
            OR
            (
              sender_id=$2
              AND receiver_id=$1
            )
          ORDER BY created_at ASC
          LIMIT 200
          `,
          [
            req.uid,
            other
          ]
        );

      await q(
        `
        UPDATE messages
        SET is_read=true
        WHERE receiver_id=$1
        AND sender_id=$2
        AND NOT is_read
        `,
        [
          req.uid,
          other
        ]
      );

      return res.json(
        result.rows
      );
    }

    const result =
      await q(
        `
        SELECT DISTINCT ON(o.id)
          o.id AS user_id,
          o.name,
          o.photo,
          m.body,
          m.created_at,

          (
            SELECT COUNT(*)
            FROM messages
            WHERE
              sender_id=o.id
              AND receiver_id=$1
              AND NOT is_read
          )::int AS unread

        FROM messages m

        JOIN users o
          ON o.id =
            CASE
              WHEN m.sender_id=$1
              THEN m.receiver_id
              ELSE m.sender_id
            END

        WHERE
          m.sender_id=$1
          OR m.receiver_id=$1

        ORDER BY
          o.id,
          m.created_at DESC
        `,
        [req.uid]
      );

    result.rows.sort(
      (a,b) =>
        new Date(b.created_at) -
        new Date(a.created_at)
    );

    res.json(
      result.rows
    );
  })
);

app.post(
  "/api/messages",
  auth,
  wrap(async (req, res) => {

    const {
      receiver_id,
      body
    } =
      req.body || {};

    const receiver =
      Number(receiver_id);

    const message =
      typeof body === "string"
        ? body.trim()
        : "";

    if (
      !Number.isInteger(
        receiver
      ) ||
      !message ||
      receiver === req.uid
    ) {
      return bad(
        res,
        "Veuillez vérifier vos informations."
      );
    }

    const exists =
      await q(
        `
        SELECT 1
        FROM users
        WHERE id=$1
        `,
        [receiver]
      );

    if (!exists.rowCount) {
      return bad(
        res,
        "Utilisateur introuvable.",
        404
      );
    }

    const result =
      await q(
        `
        INSERT INTO messages
        (sender_id,receiver_id,body)
        VALUES($1,$2,$3)
        RETURNING *
        `,
        [
          req.uid,
          receiver,
          message.slice(0,2000)
        ]
      );

    await notify(
      receiver,
      "message",
      "Nouveau message reçu"
    );

    res.status(201).json(
      result.rows[0]
    );
  })
);

/* =========================================================
   REVIEWS
========================================================= */

app.get(
  "/api/reviews/:type/:id",
  wrap(async (req, res) => {

    const allowed = [
      "users",
      "services",
      "businesses"
    ];

    if (!allowed.includes(req.params.type)) {
      return bad(res, "Type invalide.");
    }

    const targetId =
      Number(req.params.id);

    if (!Number.isInteger(targetId)) {
      return bad(res, "ID invalide.");
    }

    const result =
      await q(
        `
        SELECT
          r.id,
          r.rating,
          r.comment,
          r.created_at,
          u.id AS author_id,
          u.name AS author,
          u.photo AS author_photo
        FROM reviews r
        JOIN users u
          ON u.id=r.author_id
        WHERE
          r.target_type=$1
          AND r.target_id=$2
        ORDER BY r.created_at DESC
        LIMIT 100
        `,
        [
          req.params.type,
          targetId
        ]
      );

    res.json(result.rows);
  })
);


/* =========================================================
   CREATE REVIEW
========================================================= */

app.post(
  "/api/reviews",
  auth,
  wrap(async (req, res) => {

    const {
      target_type,
      target_id,
      rating,
      comment
    } =
      req.body || {};

    const allowed = [
      "users",
      "services",
      "businesses"
    ];

    const id =
      Number(target_id);

    const stars =
      Number(rating);

    if (
      !allowed.includes(target_type)
    ) {
      return bad(
        res,
        "Type de publication invalide."
      );
    }

    if (
      !Number.isInteger(id)
    ) {
      return bad(
        res,
        "ID invalide."
      );
    }

    if (
      !Number.isInteger(stars) ||
      stars < 1 ||
      stars > 5
    ) {
      return bad(
        res,
        "La note doit être comprise entre 1 et 5."
      );
    }

    const text =
      typeof comment === "string"
        ? comment.trim().slice(0,2000)
        : null;

    let ownerId = null;

    if (
      target_type === "users"
    ) {

      const user =
        await q(
          `
          SELECT id
          FROM users
          WHERE id=$1
          `,
          [id]
        );

      if (!user.rowCount) {
        return bad(
          res,
          "Utilisateur introuvable.",
          404
        );
      }

      ownerId = id;

    } else {

      const table =
        target_type;

      const item =
        await q(
          `
          SELECT
            id,
            user_id
          FROM ${table}
          WHERE id=$1
          `,
          [id]
        );

      if (!item.rowCount) {
        return bad(
          res,
          "Publication introuvable.",
          404
        );
      }

      ownerId =
        item.rows[0].user_id;
    }

    if (
      ownerId === req.uid
    ) {
      return bad(
        res,
        "Vous ne pouvez pas évaluer votre propre publication."
      );
    }

    try {

      const result =
        await q(
          `
          INSERT INTO reviews
          (
            author_id,
            target_type,
            target_id,
            rating,
            comment
          )
          VALUES($1,$2,$3,$4,$5)
          RETURNING *
          `,
          [
            req.uid,
            target_type,
            id,
            stars,
            text
          ]
        );

      if (
        ownerId &&
        ownerId !== req.uid
      ) {
        await notify(
          ownerId,
          "review",
          `Vous avez reçu une nouvelle évaluation de ${stars}/5.`
        );
      }

      res.status(201).json(
        result.rows[0]
      );

    } catch (error) {

      if (
        error.code === "23505"
      ) {
        return bad(
          res,
          "Vous avez déjà évalué cet élément."
        );
      }

      throw error;
    }
  })
);


/* =========================================================
   NOTIFICATIONS
========================================================= */

app.get(
  "/api/notifications",
  auth,
  wrap(async (req, res) => {

    const result =
      await q(
        `
        SELECT *
        FROM notifications
        WHERE user_id=$1
        ORDER BY created_at DESC
        LIMIT 100
        `,
        [req.uid]
      );

    res.json(
      result.rows
    );
  })
);


/* =========================================================
   MARK NOTIFICATION AS READ
========================================================= */

app.put(
  "/api/notifications/:id/read",
  auth,
  wrap(async (req, res) => {

    const id =
      Number(req.params.id);

    if (!Number.isInteger(id)) {
      return bad(
        res,
        "ID invalide."
      );
    }

    await q(
      `
      UPDATE notifications
      SET is_read=true
      WHERE
        id=$1
        AND user_id=$2
      `,
      [
        id,
        req.uid
      ]
    );

    res.json({
      ok: true
    });
  })
);


/* =========================================================
   MARK ALL NOTIFICATIONS AS READ
========================================================= */

app.put(
  "/api/notifications/read-all",
  auth,
  wrap(async (req, res) => {

    await q(
      `
      UPDATE notifications
      SET is_read=true
      WHERE user_id=$1
      `,
      [req.uid]
    );

    res.json({
      ok: true
    });
  })
);


/* =========================================================
   COUNTS
========================================================= */

app.get(
  "/api/counts",
  auth,
  wrap(async (req, res) => {

    const [
      products,
      services,
      businesses,
      favorites,
      unreadMessages,
      unreadNotifications
    ] =
      await Promise.all([

        q(
          `
          SELECT COUNT(*)::int AS count
          FROM products
          WHERE
            user_id=$1
            AND status='published'
          `,
          [req.uid]
        ),

        q(
          `
          SELECT COUNT(*)::int AS count
          FROM services
          WHERE
            user_id=$1
            AND status='published'
          `,
          [req.uid]
        ),

        q(
          `
          SELECT COUNT(*)::int AS count
          FROM businesses
          WHERE
            user_id=$1
            AND status='published'
          `,
          [req.uid]
        ),

        q(
          `
          SELECT COUNT(*)::int AS count
          FROM favorites
          WHERE user_id=$1
          `,
          [req.uid]
        ),

        q(
          `
          SELECT COUNT(*)::int AS count
          FROM messages
          WHERE
            receiver_id=$1
            AND is_read=false
          `,
          [req.uid]
        ),

        q(
          `
          SELECT COUNT(*)::int AS count
          FROM notifications
          WHERE
            user_id=$1
            AND is_read=false
          `,
          [req.uid]
        )
      ]);

    res.json({
      products:
        products.rows[0].count,

      services:
        services.rows[0].count,

      businesses:
        businesses.rows[0].count,

      favorites:
        favorites.rows[0].count,

      unread_messages:
        unreadMessages.rows[0].count,

      unread_notifications:
        unreadNotifications.rows[0].count
    });
  })
);


/* =========================================================
   REPORTS
========================================================= */

app.post(
  "/api/reports",
  auth,
  wrap(async (req, res) => {

    const {
      target_type,
      target_id,
      reason
    } =
      req.body || {};

    const id =
      Number(target_id);

    const allowed =
      [
        "products",
        "services",
        "businesses",
        "users"
      ];

    const text =
      typeof reason === "string"
        ? reason.trim().slice(0,1000)
        : "";

    if (
      !allowed.includes(
        target_type
      )
    ) {
      return bad(
        res,
        "Type de signalement invalide."
      );
    }

    if (
      !Number.isInteger(id)
    ) {
      return bad(
        res,
        "ID invalide."
      );
    }

    if (!text) {
      return bad(
        res,
        "Veuillez indiquer la raison du signalement."
      );
    }

    const result =
      await q(
        `
        INSERT INTO reports
        (
          reporter_id,
          target_type,
          target_id,
          reason
        )
        VALUES($1,$2,$3,$4)
        RETURNING *
        `,
        [
          req.uid,
          target_type,
          id,
          text
        ]
      );

    res.status(201).json({
      ok: true,
      report:
        result.rows[0]
    });
  })
);


/* =========================================================
   SEARCH GLOBAL
========================================================= */

app.get(
  "/api/search",
  optAuth,
  wrap(async (req, res) => {

    const query =
      String(
        req.query.q || ""
      ).trim();

    if (!query) {
      return res.json({
        products: [],
        services: [],
        businesses: []
      });
    }

    const term =
      `%${query}%`;

    const [
      products,
      services,
      businesses
    ] =
      await Promise.all([

        q(
          `
          SELECT
            p.*,
            u.name AS seller_name,
            u.photo AS seller_photo
          FROM products p
          JOIN users u
            ON u.id=p.user_id
          WHERE
            p.status='published'
            AND (
              p.title ILIKE $1
              OR COALESCE(
                p.description,
                ''
              ) ILIKE $1
              OR p.category ILIKE $1
            )
          ORDER BY
            p.created_at DESC
          LIMIT 30
          `,
          [term]
        ),

        q(
          `
          SELECT
            s.*,
            u.name AS seller_name,
            u.photo AS seller_photo,
            ${ratingSQL(
              "services",
              "s.id"
            )}
          FROM services s
          JOIN users u
            ON u.id=s.user_id
          WHERE
            s.status='published'
            AND (
              s.title ILIKE $1
              OR COALESCE(
                s.description,
                ''
              ) ILIKE $1
              OR s.category ILIKE $1
            )
          ORDER BY
            s.created_at DESC
          LIMIT 30
          `,
          [term]
        ),

        q(
          `
          SELECT
            b.*,
            u.name AS owner_name,
            u.photo AS owner_photo,
            ${ratingSQL(
              "businesses",
              "b.id"
            )}
          FROM businesses b
          JOIN users u
            ON u.id=b.user_id
          WHERE
            b.status='published'
            AND (
              b.title ILIKE $1
              OR COALESCE(
                b.description,
                ''
              ) ILIKE $1
              OR b.category ILIKE $1
              OR COALESCE(
                b.city,
                ''
              ) ILIKE $1
              OR COALESCE(
                b.country,
                ''
              ) ILIKE $1
            )
          ORDER BY
            b.created_at DESC
          LIMIT 30
          `,
          [term]
        )
      ]);

    res.json({
      products:
        products.rows,

      services:
        services.rows,

      businesses:
        businesses.rows
    });
  })
);


/* =========================================================
   API 404
========================================================= */

app.use(
  "/api",
  (req, res) => {
    return bad(
      res,
      "Route introuvable.",
      404
    );
  }
);


/* =========================================================
   FRONTEND FALLBACK
========================================================= */

app.get(
  "/{*splat}",
  (req, res) => {
    res.sendFile(
      path.join(
        __dirname,
        "public",
        "index.html"
      )
    );
  }
);


/* =========================================================
   ERROR HANDLER
========================================================= */

app.use(
  (
    error,
    req,
    res,
    next
  ) => {

    console.error(
      "HELPY ERROR:",
      error
    );

    if (
      res.headersSent
    ) {
      return next(error);
    }

    res.status(500).json({
      error:
        "Une erreur est survenue."
    });
  }
);


/* =========================================================
   START SERVER
========================================================= */

(async () => {

  try {

    await q(SCHEMA);

    await q(MIGRATION);

    await q("SELECT 1");

    app.listen(
      PORT,
      () => {
        console.log(
          `HELPY sur le port ${PORT}`
        );
      }
    );

  } catch (error) {

    console.error(
      "Erreur base de données:",
      error.message
    );

    process.exit(1);
  }

})();