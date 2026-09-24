const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;

const app = express();
const PORT = process.env.PORT || 3000;

// 1. MIDDLEWARES DE BASE
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Sèvi fichye HTML, CSS, JS ki statik yo
app.use(express.static(__dirname));

// 2. CONFIGURATION DES SESSIONS
app.use(session({
  secret: process.env.SESSION_SECRET || 'helpy_secret_key_123',
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Mete true si w ap itilize HTTPS strikteman
}));

// 3. INITIALISATION PASSPORT
app.use(passport.initialize());
app.use(passport.session());

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((obj, done) => {
  done(null, obj);
});

// 4. STRATÉGIE GOOGLE OAUTH
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;

if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_SECRET) {
  passport.use(new GoogleStrategy({
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: "https://helpy-production-c2f2.up.railway.app/api/auth/google/callback"
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        // Enfòmasyon ki soti nan kont Google itilizatè a
        const user = {
          id: profile.id,
          name: profile.displayName,
          email: profile.emails && profile.emails[0] ? profile.emails[0].value : "",
          avatar: profile.photos && profile.photos[0] ? profile.photos[0].value : ""
        };

        // Si w gen yon baz de done (PostgreSQL/MySQL/MongoDB), w ka sove itilizatè a isit la.
        
        return done(null, user);
      } catch (error) {
        return done(error, null);
      }
    }
  ));
} else {
  console.warn("AVÈTISMAN: GOOGLE_CLIENT_ID ak GOOGLE_CLIENT_SECRET poko configure nan Variables d'environnement Railway yo.");
}

// 5. ROUTES D'AUTHENTIFICATION GOOGLE

// Lè itilizatè a klike sou "Se connecter avec Google"
app.get('/api/auth/google', (req, res, next) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.status(500).json({ error: true, message: "Google OAuth poko configure sou sèvè a." });
  }
  passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
});

// Lè Google fin valide itilizatè a, li retounen sou lyen sa a
app.get('/api/auth/google/callback', 
  passport.authenticate('google', { failureRedirect: '/login.html' }),
  (req, res) => {
    // Koneksyon reyalize ak siksè!
    const userId = req.user.id;
    // Redirije sou paj prensipal la ak ID itilizatè a nan lyen an
    res.redirect(`/index.html?user_id=${userId}`);
  }
);

// 6. ROUTES API POU KONEKSYON AK ENSKRIPSYON KLASIK (EMAIL/PASSWORD)

// Memwa tanporè pou test (remplacer par une base de données si nécessaire)
const users = [];
const services = [];

app.post('/api/register', (req, res) => {
  const { name, email, password, phone } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: true, message: "Tanpri ranpli tout chan yo." });
  }

  const existingUser = users.find(u => u.email === email);
  if (existingUser) {
    return res.status(400).json({ error: true, message: "Imèl sa a gen yon kont deja." });
  }

  const newUser = {
    id: "user_" + Date.now(),
    name,
    email,
    phone,
    password
  };

  users.push(newUser);
  res.json({ success: true, user_id: newUser.id, name: newUser.name, email: newUser.email });
});

app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const user = users.find(u => u.email === email && u.password === password);

  if (!user) {
    return res.status(400).json({ error: true, message: "Imèl oswa mo de pas enkorèk." });
  }

  res.json({ success: true, user_id: user.id, name: user.name, email: user.email });
});

app.get('/api/users/:id', (req, res) => {
  const userId = req.params.id;
  const user = users.find(u => u.id === userId);
  if (user) {
    res.json(user);
  } else {
    res.json({ id: userId, name: "Utilisateur HELPY", email: "utilisateur@helpy.com" });
  }
});

// 7. ROUTES POU PUBLICATION AK RECHERCHE DES SERVICES

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

app.get('/api/services', (req, res) => {
  res.json(services);
});

// 8. DEMARRAGE DU SERVEUR
app.listen(PORT, () => {
  console.log(`Sèvè HELPY ap mache sou pòt ${PORT}`);
});
