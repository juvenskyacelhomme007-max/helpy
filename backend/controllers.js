const getHome = (req, res) => {
  res.json({
    app: "HELPY",
    message: "Welcome to HELPY API"
  });
};

const getHealth = (req, res) => {
  res.json({
    status: "ok",
    service: "HELPY"
  });
};

module.exports = {
  getHome,
  getHealth
};
