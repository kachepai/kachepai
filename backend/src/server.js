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
const JWT_SECRET =
  process.env.JWT_SECRET || "change-this-secret";

/* ======================================================
   AUTH
====================================================== */

function createToken(user) {
  return jwt.sign(
    {
      id: user.id,
      mobile: user.mobile
    },
    JWT_SECRET,
    {
      expiresIn: "30d"
    }
  );
}

function getTokenFromRequest(req) {
  const auth =
    req.headers.authorization || "";

  if (!auth.startsWith("Bearer ")) {
    return null;
  }

  return auth.slice(7);
}

async function authUser(req, res, next) {
  try {
    const token =
      getTokenFromRequest(req);

    if (!token) {
      return res.status(401).json({
        error: "Login required"
      });
    }

    const payload =
      jwt.verify(
        token,
        JWT_SECRET
      );

    const user =
      await prisma.user.findUnique({
        where: {
          id: Number(payload.id)
        }
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

/* ======================================================
   HOME
====================================================== */

app.get("/", (req, res) => {
  res.json({
    message:
      "Kachepai Backend is running!"
  });
});

/* ======================================================
   HEALTH
====================================================== */

app.get("/health", (req, res) => {
  res.json({
    status: "ok"
  });
});

/* ======================================================
   REGISTER
====================================================== */

app.post(
  "/api/auth/register",
  async (req, res) => {

    try {

      const {
        mobile,
        password,
        name
      } = req.body;

      if (!mobile || !password) {
        return res.status(400).json({
          error:
            "Mobile number and password are required"
        });
      }

      if (password.length < 6) {
        return res.status(400).json({
          error:
            "Password must be at least 6 characters"
        });
      }

      const existingUser =
        await prisma.user.findUnique({
          where: {
            mobile
          }
        });

      if (existingUser) {
        return res.status(409).json({
          error:
            "This mobile number is already registered"
        });
      }

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      const user =
        await prisma.user.create({
          data: {
            mobile,
            name: name || null,
            passwordHash,
            mobileVerified: false
          }
        });

      const token =
        createToken(user);

      res.status(201).json({
        message:
          "Account created successfully",

        token,

        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile
        }
      });

    } catch (error) {

      console.error(
        "REGISTER ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not create account"
      });
    }
  }
);

/* ======================================================
   LOGIN
====================================================== */

app.post(
  "/api/auth/login",
  async (req, res) => {

    try {

      const {
        mobile,
        password
      } = req.body;

      if (!mobile || !password) {
        return res.status(400).json({
          error:
            "Mobile number and password are required"
        });
      }

      const user =
        await prisma.user.findUnique({
          where: {
            mobile
          }
        });

      if (
        !user ||
        !user.passwordHash
      ) {
        return res.status(401).json({
          error:
            "Invalid mobile number or password"
        });
      }

      const validPassword =
        await bcrypt.compare(
          password,
          user.passwordHash
        );

      if (!validPassword) {
        return res.status(401).json({
          error:
            "Invalid mobile number or password"
        });
      }

      const token =
        createToken(user);

      res.json({
        message:
          "Login successful",

        token,

        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile
        }
      });

    } catch (error) {

      console.error(
        "LOGIN ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Login failed"
      });
    }
  }
);

/* ======================================================
   CURRENT USER
====================================================== */

app.get(
  "/api/me",
  authUser,
  async (req, res) => {

    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        mobile: req.user.mobile
      }
    });
  }
);

/* ======================================================
   CREATE ORDERS TABLE
====================================================== */

async function ensureOrdersTable() {

  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "Order" (
      "id" SERIAL PRIMARY KEY,
      "userId" INTEGER NOT NULL,
      "customerName" TEXT NOT NULL,
      "mobile" TEXT NOT NULL,
      "address" TEXT NOT NULL,
      "paymentMethod" TEXT NOT NULL DEFAULT 'COD',
      "items" JSONB NOT NULL,
      "total" DOUBLE PRECISION NOT NULL DEFAULT 0,
      "status" TEXT NOT NULL DEFAULT 'PENDING',
      "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
    )
  `);
}

/* ======================================================
   CREATE ORDER
====================================================== */

app.post(
  "/api/orders",
  authUser,
  async (req, res) => {

    try {

      const {
        customerName,
        mobile,
        address,
        paymentMethod,
        items
      } = req.body;

      if (
        !customerName ||
        !mobile ||
        !address
      ) {
        return res.status(400).json({
          error:
            "Customer name, mobile and address are required"
        });
      }

      if (
        !Array.isArray(items) ||
        items.length === 0
      ) {
        return res.status(400).json({
          error:
            "Order items are required"
        });
      }

      await ensureOrdersTable();

      let total = 0;

      for (const item of items) {

        const quantity =
          Math.max(
            1,
            Number(item.quantity || 1)
          );

        const unitPrice =
          Math.max(
            0,
            Number(item.unitPrice || 0)
          );

        total +=
          quantity * unitPrice;
      }

      const safePaymentMethod =
        paymentMethod || "COD";

      const result =
        await prisma.$queryRaw`
          INSERT INTO "Order"
          (
            "userId",
            "customerName",
            "mobile",
            "address",
            "paymentMethod",
            "items",
            "total",
            "status"
          )
          VALUES
          (
            ${req.user.id},
            ${customerName},
            ${mobile},
            ${address},
            ${safePaymentMethod},
            ${JSON.stringify(items)}::jsonb,
            ${total},
            'PENDING'
          )
          RETURNING
            "id",
            "total",
            "status",
            "createdAt"
        `;

      const order =
        result[0];

      res.status(201).json({
        message:
          "Order created successfully",

        
          orderId:
  "KCP-" +
  new Date(order.createdAt)
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, "") +
  "-" +
  String(order.id).padStart(4, "0"),

        id: order.id,

        total:
          Number(order.total),

        status:
          order.status,

        createdAt:
          order.createdAt
      });

    } catch (error) {

      console.error(
        "ORDER ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not create order"
      });
    }
  }
);
/* ======================================================
   UPDATE ORDER STATUS
====================================================== */

app.patch(
  "/api/orders/:id/status",
  async (req, res) => {

    try {

      const adminKey =
        req.headers["x-admin-key"];

      if (
        !process.env.ADMIN_KEY ||
        adminKey !== process.env.ADMIN_KEY
      ) {
        return res.status(403).json({
          error: "Admin access required"
        });
      }

      const orderId =
        Number(req.params.id);

      const { status } =
        req.body;

      const allowedStatuses = [
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED"
      ];

      if (
        !Number.isInteger(orderId) ||
        orderId <= 0
      ) {
        return res.status(400).json({
          error: "Invalid order ID"
        });
      }

      if (
        !allowedStatuses.includes(status)
      ) {
        return res.status(400).json({
          error: "Invalid order status"
        });
      }

      await ensureOrdersTable();

      const result =
        await prisma.$queryRaw`
          UPDATE "Order"
          SET "status" = ${status}
          WHERE "id" = ${orderId}
          RETURNING
            "id",
            "total",
            "status",
            "createdAt"
        `;

      if (!result.length) {
        return res.status(404).json({
          error: "Order not found"
        });
      }

      const order =
        result[0];

      res.json({
        message:
          "Order status updated successfully",

        id:
          order.id,

        status:
          order.status,

        total:
          Number(order.total),

        createdAt:
          order.createdAt
      });

    } catch (error) {

      console.error(
        "ORDER STATUS ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not update order status"
      });
    }
  }
);
/* ======================================================
   START SERVER
====================================================== */

app.listen(
  PORT,
  () => {
    console.log(
      `Server running on port ${PORT}`
    );
  }
);
