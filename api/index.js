const express = require("express");
const cors = require("cors");
const db = require("../db");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

app.get("/api/animes", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT * FROM animes");
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/animes", async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        a.id,
        a.title,
        a.genre,
        a.description,
        a.image_url,
        IFNULL(AVG(r.rating), 0) AS rating
      FROM animes a
      LEFT JOIN ratings r ON a.id = r.anime_id
      GROUP BY a.id
    `);

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/api/animes/:id/user/:userId", async (req, res) => {
  try {
    const { id, userId } = req.params;

    const [rows] = await db.query(
      "SELECT rating FROM ratings WHERE anime_id = ? AND user_id = ?",
      [id, userId]
    );

    res.json(rows[0] || { rating: 0 });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/animes", async (req, res) => {
  try {
    const { title, genre, description, image_url } = req.body;

    await db.query(
      "INSERT INTO animes (title, genre, description, image_url) VALUES (?, ?, ?, ?)",
      [title, genre, description, image_url]
    );

    res.json({ message: "Anime added" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put("/api/animes/:id/rating", async (req, res) => {
  try {
    const { rating, userId } = req.body;
    const animeId = req.params.id;

    await db.query(
      `INSERT INTO ratings (user_id, anime_id, rating)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE rating = ?`,
      [userId, animeId, rating, rating]
    );

    res.json({ message: "Rating saved" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/animes/:id/comment", async (req, res) => {
  try {
    const { comment } = req.body;

    await db.query(
      "INSERT INTO comments (anime_id, comment) VALUES (?, ?)",
      [req.params.id, comment]
    );

    res.json({ message: "Comment added" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/animes/:id/comments", async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT * FROM comments WHERE anime_id = ?",
      [req.params.id]
    );
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete("/api/animes/:id", async (req, res) => {
  try {
    await db.query("DELETE FROM comments WHERE anime_id = ?", [req.params.id]);
    await db.query("DELETE FROM animes WHERE id = ?", [req.params.id]);

    res.json({ message: "Anime and comments deleted" });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const bcrypt = require("bcrypt");

app.post("/api/signup", async (req, res) => {
  try {
    const { email, password, name} = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);

    await db.query(
      "INSERT INTO users (email, password, name) VALUES (?, ? , ?)",
      [email, hashedPassword, name]
    );

    res.json({ message: "User created" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    const [rows] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (rows.length === 0) {
      return res.status(400).json({ error: "User not found" });
    }

    const user = rows[0];

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ error: "Wrong password" });
    }

    res.json({ message: "Login success", userId: user.id });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});
// GET PROFILE
app.get("/api/user/:id", async (req, res) => {
  const [rows] = await db.query(
    "SELECT id, email, name FROM users WHERE id = ?",
    [req.params.id]
  );
  res.json(rows[0]);
});

// UPDATE NAME
app.put("/api/user/:id", async (req, res) => {
  const { name } = req.body;

  await db.query(
    "UPDATE users SET name = ? WHERE id = ?",
    [name, req.params.id]
  );

  res.json({ message: "Updated" });
});
module.exports = app;