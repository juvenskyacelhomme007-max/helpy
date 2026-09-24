<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>HELPY</title>
  <link rel="stylesheet" href="style.css">
  <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
</head>
<body>

  <div class="app-container">
    <!-- HEADER -->
    <div class="header">
      <div class="logo">
        <div class="logo-badge"><i class="fa-solid fa-handshake"></i></div>
        HELPY
      </div>
      <div>
        <a href="login.html" style="color: var(--primary); font-size: 14px; text-decoration: none; font-weight: 600;">Connexion</a>
      </div>
    </div>

    <!-- HERO CARD -->
    <div class="hero-card">
      <h1>Bienvenue sur HELPY !</h1>
      <p>Trouvez facilement des services et professionnels près de chez vous.</p>
    </div>

    <!-- SEARCH BAR -->
    <div class="search-box">
      <i class="fa-solid fa-magnifying-glass" style="color: var(--text-gray);"></i>
      <input type="text" placeholder="Rechercher un service, un commerce...">
    </div>

    <!-- CATEGORIES -->
    <div class="section-title">Catégories</div>
    <div class="categories-grid">
      <div class="category-chip"><i class="fa-solid fa-utensils"></i> Restaurants</div>
      <div class="category-chip"><i class="fa-solid fa-bag-shopping"></i> Magasins</div>
      <div class="category-chip"><i class="fa-solid fa-house"></i> Logement</div>
      <div class="category-chip"><i class="fa-solid fa-wrench"></i> Services</div>
    </div>
  </div>

  <!-- BOTTOM NAVIGATION BAR -->
  <div class="bottom-nav">
    <a href="index.html" class="nav-item active">
      <i class="fa-solid fa-house"></i>
      <span>Accueil</span>
    </a>
    <a href="#" class="nav-item">
      <i class="fa-solid fa-magnifying-glass"></i>
      <span>Rechercher</span>
    </a>
    <a href="#" class="nav-item">
      <i class="fa-solid fa-plus-circle" style="font-size: 22px; color: var(--primary);"></i>
      <span>Publier</span>
    </a>
    <a href="register.html" class="nav-item">
      <i class="fa-solid fa-user"></i>
      <span>Profil</span>
    </a>
  </div>

</body>
</html>
