const express = require("express");
const axios = require("axios");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();
const app = express();

const { getInterswitchAppToken, verifyNIN } = require("./utility");


app.use(cors());
app.use(express.json());

// In-memory storage (replace with real database later)
const users = new Map();

// Signup endpoint with NIN verification
app.post("/api/signup", async (req, res) => {
  
  try {
    const { firstName, lastName, nin, email, password } = req.body;
    
    // Validate input
    if (!firstName || !lastName || !nin || !email || !password) {
      return res.status(400).json({
        success: false,
        error: "All fields (firstName, lastName, NIN, email, password) are required"
      });
    }
     
    // Check if user already exists
    if (users.has(email)) {
      return res.status(400).json({
        success: false,
        error: "User already exists"
      });
    }
    
    // Step 1: Get Interswitch token
    const token = await getInterswitchAppToken();
    
    // Step 2: Verify NIN with Interswitch
    const ninData = await verifyNIN(nin, firstName, lastName, token);

    // Step 3: Check if NIN verification was successful
    if (ninData.responseCode !== "00") {
      return res.status(400).json({
        success: false,
        error: "NIN verification failed",
        details: ninData.responseMessage
      });
    }

    // Step 4: Extract verified user data from Interswitch response
    const verifiedData = ninData.data || {};
    
    const userData = {
      id: Date.now().toString(),
      email,
      password, // In production, hash this with bcrypt!
      nin,
      firstName: verifiedData.firstName || verifiedData.firstname,
      lastName: verifiedData.lastName || verifiedData.surname || verifiedData.lastname,
      middleName: verifiedData.middleName || verifiedData.middlename,
      dateOfBirth: verifiedData.dateOfBirth || verifiedData.birthdate,
      phoneNumber: verifiedData.phoneNumber || verifiedData.phone,
      gender: verifiedData.gender,
      verified: true,
      createdAt: new Date().toISOString()
    };

    // Step 5: Save to your database (currently in-memory)
    users.set(email, userData);

    // Step 6: Return success (don't send password back!)
    const { password: _, ...userWithoutPassword } = userData;

    res.json({
      success: true,
      message: "User registered successfully with verified NIN",
      user: userWithoutPassword
    });

  } catch (error) {
    console.error("Signup error:", error.response?.data || error.message);
    
    res.status(error.response?.status || 500).json({
      success: false,
      error: "Signup failed",
      details: error.response?.data || error.message
    });
  }
});

// Login endpoint
app.post("/api/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required"
      });
    }

    const user = users.get(email);

    if (!user || user.password !== password) {
      return res.status(401).json({
        success: false,
        error: "Invalid credentials"
      });
    }

    const { password: _, ...userWithoutPassword } = user;

    res.json({
      success: true,
      message: "Login successful",
      user: userWithoutPassword
    });

  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({
      success: false,
      error: "Login failed"
    });
  }
});

// Health check
app.get("/", (req, res) => {
  res.json({ 
    message: "LectureAI API is running",
    endpoints: {
      signup: "POST /api/signup",
      login: "POST /api/login"
    }
  });
});

// Get all users (for testing - remove in production!)
app.get("/api/users", (req, res) => {
  const allUsers = Array.from(users.values()).map(user => {
    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  });
  res.json({ users: allUsers });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});