const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcryptjs");

const {
  pool,
  initializeDatabase
} = require("./database");

const app = express();

const PORT =
  process.env.PORT || 3000;


// =====================================================
// MIDDLEWARE
// =====================================================

app.use(cors());

app.use(
  express.json({
    limit: "10mb"
  })
);

app.use(
  express.urlencoded({
    extended: true
  })
);


// =====================================================
// HEALTH
// =====================================================

app.get("/api/health", (req, res) => {

  res.json({
    status: "ok",
    service: "HELPY"
  });

});


// =====================================================
// DATABASE TEST
// =====================================================

app.get("/api/db-test", async (req, res) => {

  try {

    const result =
      await pool.query("SELECT NOW()");

    res.json({
      status: "ok",
      database: "connected",
      time: result.rows[0].now
    });

  } catch (error) {

    console.error(
      "DB TEST ERROR:",
      error
    );

    res.status(500).json({
      status: "error",
      database: "not connected",
      message: error.message
    });

  }

});


// =====================================================
// USERS
// =====================================================

app.get("/api/users", async (req, res) => {

  try {

    const result =
      await pool.query(`
        SELECT
          id,
          name,
          email,
          phone,
          role,
          status,
          verified,
          created_at
        FROM users
        ORDER BY id DESC
      `);

    res.json({
      status: "ok",
      users: result.rows
    });

  } catch (error) {

    console.error(
      "USERS ERROR:",
      error
    );

    res.status(500).json({
      status: "error",
      message: "Unable to load users"
    });

  }

});


// =====================================================
// REGISTER
// =====================================================

app.post(
  "/api/auth/register",
  async (req, res) => {

    try {

      const {
        name,
        email,
        phone,
        password
      } = req.body;

      if (
        !name ||
        !password ||
        (!email && !phone)
      ) {

        return res.status(400).json({
          status: "error",
          message:
            "Name, password and email or phone are required"
        });

      }

      if (password.length < 6) {

        return res.status(400).json({
          status: "error",
          message:
            "Password must contain at least 6 characters"
        });

      }

      const existingUser =
        await pool.query(
          `
          SELECT id
          FROM users
          WHERE
            ($1 IS NOT NULL AND email = $1)
            OR
            ($2 IS NOT NULL AND phone = $2)
          `,
          [
            email || null,
            phone || null
          ]
        );

      if (
        existingUser.rows.length > 0
      ) {

        return res.status(409).json({
          status: "error",
          message:
            "User already exists"
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
            phone,
            password_hash
          )
          VALUES
          ($1,$2,$3,$4)
          RETURNING
            id,
            name,
            email,
            phone,
            role,
            status,
            verified,
            created_at
          `,
          [
            name.trim(),
            email || null,
            phone || null,
            passwordHash
          ]
        );

      res.status(201).json({
        status: "ok",
        message:
          "Account created successfully",
        user:
          result.rows[0]
      });

    } catch (error) {

      console.error(
        "REGISTER ERROR:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Unable to create account"
      });

    }

  }
);


// =====================================================
// LOGIN
// =====================================================

app.post(
  "/api/auth/login",
  async (req, res) => {

    try {

      const {
        identifier,
        password
      } = req.body;

      if (
        !identifier ||
        !password
      ) {

        return res.status(400).json({
          status: "error",
          message:
            "Email/téléphone et mot de passe sont requis"
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
            password_hash,
            role,
            status,
            verified
          FROM users
          WHERE
            email = $1
            OR phone = $1
          LIMIT 1
          `,
          [
            identifier.trim()
          ]
        );

      if (
        result.rows.length === 0
      ) {

        return res.status(401).json({
          status: "error",
          message:
            "Compte introuvable"
        });

      }

      const user =
        result.rows[0];

      const passwordMatch =
        await bcrypt.compare(
          password,
          user.password_hash
        );

      if (!passwordMatch) {

        return res.status(401).json({
          status: "error",
          message:
            "Mot de passe incorrect"
        });

      }

      if (
        user.status !== "active"
      ) {

        return res.status(403).json({
          status: "error",
          message:
            "Ce compte est désactivé"
        });

      }

      delete user.password_hash;

      res.json({
        status: "ok",
        message:
          "Connexion réussie",
        user
      });

    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Erreur serveur"
      });

    }

  }
);


// =====================================================
// PRODUCTS
// =====================================================

app.get(
  "/api/products",
  async (req, res) => {

    try {

      const result =
        await pool.query(`
          SELECT
            p.*,
            u.name AS seller_name
          FROM products p
          LEFT JOIN users u
            ON u.id = p.user_id
          WHERE p.status = 'active'
          ORDER BY p.id DESC
        `);

      res.json({
        status: "ok",
        products:
          result.rows
      });

    } catch (error) {

      console.error(
        "PRODUCTS ERROR:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Unable to load products"
      });

    }

  }
);


app.post(
  "/api/products",
  async (req, res) => {

    try {

      const {
        user_id,
        title,
        description,
        price,
        currency,
        category,
        location,
        whatsapp,
        image_url,
        quantity
      } = req.body;

      if (
        !user_id ||
        !title ||
        price === undefined ||
        !whatsapp
      ) {

        return res.status(400).json({
          status: "error",
          message:
            "user_id, title, price and WhatsApp are required"
        });

      }

      const user =
        await pool.query(
          `
          SELECT id
          FROM users
          WHERE id = $1
          `,
          [user_id]
        );

      if (
        user.rows.length === 0
      ) {

        return res.status(404).json({
          status: "error",
          message:
            "User not found"
        });

      }

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
            image_url,
            quantity
          )
          VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
          RETURNING *
          `,
          [
            user_id,
            title.trim(),
            description || null,
            price,
            currency || "HTG",
            category || null,
            location || null,
            whatsapp.trim(),
            image_url || null,
            quantity || 1
          ]
        );

      res.status(201).json({
        status: "ok",
        message:
          "Product created successfully",
        product:
          result.rows[0]
      });

    } catch (error) {

      console.error(
        "CREATE PRODUCT ERROR:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Unable to create product",
        details:
          error.message
      });

    }

  }
);


app.get(
  "/api/products/:id",
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            p.*,
            u.name AS seller_name
          FROM products p
          LEFT JOIN users u
            ON u.id = p.user_id
          WHERE p.id = $1
          `,
          [req.params.id]
        );

      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          status: "error",
          message:
            "Product not found"
        });

      }

      res.json({
        status: "ok",
        product:
          result.rows[0]
      });

    } catch (error) {

      console.error(
        "GET PRODUCT ERROR:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Unable to load product"
      });

    }

  }
);


// =====================================================
// SERVICES
// =====================================================

app.get(
  "/api/services",
  async (req, res) => {

    try {

      const result =
        await pool.query(`
          SELECT
            s.*,
            u.name AS provider_name
          FROM services s
          LEFT JOIN users u
            ON u.id = s.user_id
          WHERE s.status = 'active'
          ORDER BY s.id DESC
        `);

      res.json({
        status: "ok",
        services:
          result.rows
      });

    } catch (error) {

      console.error(
        "SERVICES ERROR:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Unable to load services"
      });

    }

  }
);


app.post(
  "/api/services",
  async (req, res) => {

    try {

      const {
        user_id,
        title,
        description,
        price,
        currency,
        category,
        location,
        whatsapp,
        image_url
      } = req.body;

      if (
        !user_id ||
        !title ||
        price === undefined ||
        !whatsapp
      ) {

        return res.status(400).json({
          status: "error",
          message:
            "user_id, title, price and WhatsApp are required"
        });

      }

      const user =
        await pool.query(
          `
          SELECT id
          FROM users
          WHERE id = $1
          `,
          [user_id]
        );

      if (
        user.rows.length === 0
      ) {

        return res.status(404).json({
          status: "error",
          message:
            "User not found"
        });

      }

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
            image_url
          )
          VALUES
          ($1,$2,$3,$4,$5,$6,$7,$8,$9)
          RETURNING *
          `,
          [
            user_id,
            title.trim(),
            description || null,
            price,
            currency || "HTG",
            category || null,
            location || null,
            whatsapp.trim(),
            image_url || null
          ]
        );

      res.status(201).json({
        status: "ok",
        message:
          "Service created successfully",
        service:
          result.rows[0]
      });

    } catch (error) {

      console.error(
        "CREATE SERVICE ERROR:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Unable to create service",
        details:
          error.message
      });

    }

  }
);


app.get(
  "/api/services/:id",
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            s.*,
            u.name AS provider_name
          FROM services s
          LEFT JOIN users u
            ON u.id = s.user_id
          WHERE s.id = $1
          `,
          [req.params.id]
        );

      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          status: "error",
          message:
            "Service not found"
        });

      }

      res.json({
        status: "ok",
        service:
          result.rows[0]
      });

    } catch (error) {

      console.error(
        "GET SERVICE ERROR:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Unable to load service"
      });

    }

  }
);


// =====================================================
// BUSINESSES / ENTREPRISES
// =====================================================


// GET ALL BUSINESSES

app.get(
  "/api/businesses",
  async (req, res) => {

    try {

      const {
        search,
        category,
        location
      } = req.query;

      let query = `
        SELECT
          b.*,
          u.name AS owner_name
        FROM businesses b
        LEFT JOIN users u
          ON u.id = b.user_id
        WHERE
          COALESCE(b.status, 'active') = 'active'
      `;

      const values = [];


      // SEARCH

      if (search) {

        values.push(
          `%${search.trim()}%`
        );

        query += `
          AND (
            b.name ILIKE $${values.length}
            OR b.description ILIKE $${values.length}
            OR b.category ILIKE $${values.length}
            OR b.location ILIKE $${values.length}
          )
        `;

      }


      // CATEGORY

      if (category) {

        values.push(
          category.trim()
        );

        query += `
          AND b.category = $${values.length}
        `;

      }


      // LOCATION

      if (location) {

        values.push(
          `%${location.trim()}%`
        );

        query += `
          AND b.location ILIKE $${values.length}
        `;

      }


      query += `
        ORDER BY b.id DESC
      `;


      const result =
        await pool.query(
          query,
          values
        );


      // Retounen "businesses"
      // + "entreprises" pou compatibilité

      res.json({
        status: "ok",
        statut: "ok",

        businesses:
          result.rows,

        entreprises:
          result.rows
      });

    } catch (error) {

      console.error(
        "BUSINESSES ERROR:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Unable to load businesses",

        details:
          error.message
      });

    }

  }
);


// =====================================================
// GET ONE BUSINESS
// =====================================================

app.get(
  "/api/businesses/:id",
  async (req, res) => {

    try {

      const result =
        await pool.query(
          `
          SELECT
            b.*,
            u.name AS owner_name
          FROM businesses b
          LEFT JOIN users u
            ON u.id = b.user_id
          WHERE b.id = $1
          `,
          [req.params.id]
        );


      if (
        result.rows.length === 0
      ) {

        return res.status(404).json({
          status: "error",
          message:
            "Entreprise introuvable"
        });

      }


      res.json({
        status: "ok",

        business:
          result.rows[0],

        entreprise:
          result.rows[0]
      });

    } catch (error) {

      console.error(
        "GET BUSINESS ERROR:",
        error
      );

      res.status(500).json({
        status: "error",
        message:
          "Unable to load business",

        details:
          error.message
      });

    }

  }
);


// =====================================================
// CREATE BUSINESS
// =====================================================

app.post(
  "/api/businesses",
  async (req, res) => {

    console.log(
      "================================="
    );

    console.log(
      "CREATE BUSINESS REQUEST"
    );

    console.log(
      req.body
    );

    console.log(
      "================================="
    );


    try {

      const {
        user_id,
        name,
        description,
        category,
        location,
        phone,
        whatsapp,
        email,
        image_url,
        website
      } = req.body;


      // -------------------------
      // VALIDATION
      // -------------------------

      if (
        !name ||
        !name.trim()
      ) {

        return res.status(400).json({
          status: "error",
          message:
            "Le nom de l'entreprise est obligatoire"
        });

      }


      // -------------------------
      // USER OPTIONNEL
      // -------------------------

      let finalUserId = null;


      if (
        user_id !== undefined &&
        user_id !== null &&
        user_id !== ""
      ) {

        const numericUserId =
          Number(user_id);


        if (
          !Number.isInteger(
            numericUserId
          )
        ) {

          return res.status(400).json({
            status: "error",
            message:
              "user_id invalide"
          });

        }


        const user =
          await pool.query(
            `
            SELECT id
            FROM users
            WHERE id = $1
            `,
            [numericUserId]
          );


        if (
          user.rows.length === 0
        ) {

          return res.status(404).json({
            status: "error",
            message:
              "Utilisateur introuvable"
          });

        }


        finalUserId =
          numericUserId;

      }


      // -------------------------
      // INSERT
      // -------------------------

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
            phone,
            whatsapp,
            email,
            image_url,
            website,
            status,
            verified,
            created_at,
            updated_at
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
            'active',
            false,
            CURRENT_TIMESTAMP,
            CURRENT_TIMESTAMP
          )
          RETURNING *
          `,
          [
            finalUserId,

            name.trim(),

            description
              ? description.trim()
              : null,

            category
              ? category.trim()
              : null,

            location
              ? location.trim()
              : null,

            phone
              