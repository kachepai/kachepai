import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

app.use(cors({
  origin: true,
  credentials: true
}));

app.use(helmet());
app.use(express.json());

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      mobile: user.mobile
    },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function getTokenFromRequest(req) {
  const auth = req.headers.authorization || "";

  if (!auth.startsWith("Bearer ")) {
    return null;
  }

  return auth.slice(7);
}

async function authUser(req, res, next) {
  try {
    const token = getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        error: "Login required"
      });
    }

    const payload = jwt.verify(token, JWT_SECRET);

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.id) }
    });

    if (!user) {
      return res.status(401).json({
        error: "User not found"
      });
    }

    req.user = user;
    next();
  } catch (error) {
    return res.status(401).json({
      error: "Invalid or expired login"
    });
  }
}

app.get("/", (req, res) => {
  res.json({
    message: "Kachepai Backend is running!"
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

app.post("/api/auth/register", async (req, res) => {
  try {
    const { mobile, password, name } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        error: "Mobile number and password are required"
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        error: "Password must be at least 6 characters"
      });
    }

    const existingUser = await prisma.user.findUnique({
      where: { mobile }
    });

    if (existingUser) {
      return res.status(409).json({
        error: "This mobile number is already registered"
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        mobile,
        name: name || null,
        passwordHash,
        mobileVerified: false
      }
    });

    const token = createToken(user);

    res.status(201).json({
      message: "Account created successfully",
      token,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile
      }
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Could not create account"
    });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        error: "Mobile number and password are required"
      });
    }

    const user = await prisma.user.findUnique({
      where: { mobile }
    });

    if (!user || !user.passwordHash) {
      return res.status(401).json({
        error: "Invalid mobile number or password"
      });
    }

    const validPassword = await bcrypt.compare(
      password,
      user.passwordHash
    );

    if (!validPassword) {
      return res.status(401).json({
        error: "Invalid mobile number or password"
      });
    }

    const token = createToken(user);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        mobile: user.mobile
      }
    });
  } catch (error) {
    console.error(error);

    res.status(500).json({
      error: "Login failed"
    });
  }
});

app.get("/api/me", authUser, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      mobile: req.user.mobile
    }
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
