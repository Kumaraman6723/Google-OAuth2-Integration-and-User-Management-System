const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const mysql = require("mysql2");

const app = express();
const port = 3001;

app.use(bodyParser.json());
app.use(cors());

// Create a connection to the database
const db = mysql.createConnection({
  host: "localhost",
  user: "username", // replace with your MySQL username
  password: "password", // replace with your MySQL password
  database: "db", // replace with your MySQL database name
});

// Connect to the database
db.connect((err) => {
  if (err) {
    console.error("Error connecting to the database:", err);
    return;
  }
  console.log("Connected to the database.");
});

// Create table if not exists
const createTableQuery = `
  CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255),
    name VARCHAR(255),
    firstname VARCHAR(255),
    lastname VARCHAR(255),
    profilepicture TEXT,
    gender VARCHAR(50),
    birthday DATE,
    password VARCHAR(255)
  );
`;

db.query(createTableQuery, (err, result) => {
  if (err) {
    console.error("Error creating table:", err);
    return;
  }
  console.log("Table created or already exists.");
});

// Endpoint to check if user exists
app.post("/checkUser", (req, res) => {
  const { email } = req.body;

  const checkQuery = "SELECT * FROM users WHERE email = ?";
  db.query(checkQuery, [email], (err, results) => {
    if (err) {
      console.error("Error checking user:", err);
      return res.status(500).send("Error checking user.");
    }

    if (results.length > 0) {
      res.json({ exists: true, userInfo: results[0] });
    } else {
      res.json({ exists: false });
    }
  });
});

// Endpoint to store or update user information
app.post("/storeAuthInfo", (req, res) => {
  const authInfo = req.body;
  console.log("Auth info received:", authInfo);

  // Validate that authInfo contains all necessary properties
  const {
    id,
    email,
    name,
    given_name,
    family_name,
    picture,
    gender,
    birthday,
    password,
  } = authInfo;

  if (
    !id ||
    !email ||
    !name ||
    !given_name ||
    !family_name ||
    !picture ||
    !gender ||
    !birthday ||
    !password
  ) {
    console.error("Missing required auth info fields:", authInfo);
    return res.status(400).send("Missing required auth info fields.");
  }

  // Set gender to 'Not Defined' if it's 'NA'
  let genderValue = gender === "NA" ? "Not Defined" : gender;
  // Set birthday to '2000-01-01' if it's 'N/A'
  let birthdayValue = birthday === "N/A" ? "2000-01-01" : birthday;

  // Store or update authInfo in the database
  const insertQuery = `
    INSERT INTO users (id, email, name, firstname, lastname, profilepicture, gender, birthday, password)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
    email = VALUES(email),
    name = VALUES(name),
    firstname = VALUES(firstname),
    lastname = VALUES(lastname),
    profilepicture = VALUES(profilepicture),
    gender = VALUES(gender),
    birthday = VALUES(birthday),
    password = VALUES(password);
  `;

  db.query(
    insertQuery,
    [
      id,
      email,
      name,
      given_name,
      family_name,
      picture,
      genderValue,
      birthdayValue,
      password,
    ],
    (err, result) => {
      if (err) {
        console.error("Error storing or updating auth info:", err);
        return res.status(500).send("Error storing or updating auth info.");
      }
      res.send("Auth info received and stored/updated.");
    }
  );
});

// Endpoint to update user profile
app.post("/updateProfile", (req, res) => {
  const { id, name, email, gender, birthday, password } = req.body;

  // Update user information in the database
  const updateQuery = `
    UPDATE users 
    SET name = ?,
        email = ?,
        gender = ?,
        birthday = ?,
        password = ?
    WHERE id = ?
  `;

  db.query(
    updateQuery,
    [name, email, gender, birthday, password, id],
    (err, result) => {
      if (err) {
        console.error("Error updating profile:", err);
        return res.status(500).send("Error updating profile.");
      }
      res.send("Profile updated successfully.");
    }
  );
});

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
