import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import { PrismaClient } from "@prisma/client";

dotenv.config();

const app = express();
const prisma = new PrismaClient();

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || "change-this-secret";

app.use(cors({ origin: true, credentials: true }));
app.use(helmet());
app.use(express.json({ limit: "2mb" }));

function createToken(user) {
  return jwt.sign(
    { id: user.id },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

function getTokenFromRequest(req) {
  const a = req.headers.authorization || "";
  return a.startsWith("Bearer ") ? a.slice(7) : null;
}

function normalizeEmail(v) {
  return v ? String(v).trim().toLowerCase() : null;
}

function normalizeIdentifier(v) {
  return String(v || "").trim();
}

function slugify(v) {
  return (
    String(v || "")
      .trim()
      .toLowerCase()
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "") ||
    `item-${Date.now()}`
  );
}

function safeUser(user) {
  return {
    id: user.id,
    name: user.name,
    mobile: user.mobile,
    email: user.email,
    accountType: user.accountType,
    department: user.department
      ? {
          id: user.department.id,
          name: user.department.name
        }
      : null,
    role: user.role
      ? {
          id: user.role.id,
          name: user.role.name,
          level: user.role.level
        }
      : null,
    mobileVerified: user.mobileVerified,
    createdAt: user.createdAt
  };
}

function n(v, fallback = 0) {
  const x = Number(v);
  return Number.isFinite(x) ? x : fallback;
}

function dateOrNull(v) {
  return v ? new Date(v) : null;
}

function publicProduct(p) {
  return {
    ...p,
    price: Number(p.price),
    oldPrice: p.oldPrice === null ? null : Number(p.oldPrice),
    rating: p.rating === null ? null : Number(p.rating)
  };
}

function publicOrder(o) {
  return {
    ...o,
    subtotal: Number(o.subtotal),
    discount: Number(o.discount),
    deliveryCharge: Number(o.deliveryCharge),
    total: Number(o.total),
    items: o.items?.map((i) => ({
      ...i,
      unitPrice: Number(i.unitPrice),
      lineTotal: Number(i.lineTotal)
    }))
  };
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
      where: {
        id: Number(payload.id)
      },
      include: {
        department: true,
        role: true
      }
    });

    if (!user) {
      return res.status(401).json({
        error: "User not found"
      });
    }

    req.user = user;
    next();
  } catch {
    return res.status(401).json({
      error: "Invalid or expired login"
    });
  }
}

async function userHasPermission(userId, key) {
  const user = await prisma.user.findUnique({
    where: {
      id: userId
    },
    include: {
      role: {
        include: {
          permissions: {
            include: {
              permission: true
            }
          }
        }
      },
      customPermissions: {
        include: {
          permission: true
        }
      }
    }
  });

  if (!user) return false;

  if (user.accountType === "OWNER") {
    return true;
  }

  const custom = user.customPermissions.find(
    (x) => x.permission.key === key
  );

  if (custom) {
    return custom.allowed === true;
  }

  return !!user.role?.permissions.some(
    (x) => x.permission.key === key
  );
}

function requireAdmin(req, res, next) {
  if (
    !["OWNER", "PARTNER", "EMPLOYEE"].includes(
      req.user.accountType
    )
  ) {
    return res.status(403).json({
      error: "Admin access denied"
    });
  }

  next();
}

function requirePermission(key) {
  return async (req, res, next) => {
    try {
      if (!(await userHasPermission(req.user.id, key))) {
        return res.status(403).json({
          error: "You do not have permission for this action"
        });
      }

      next();
    } catch (e) {
      console.error(e);

      res.status(500).json({
        error: "Permission check failed"
      });
    }
  };
}

async function writeAuditLog({
  actorId,
  targetUserId = null,
  action,
  details = null
}) {
  try {
    await prisma.auditLog.create({
      data: {
        actorId,
        targetUserId,
        action,
        details
      }
    });
  } catch (e) {
    console.error("AUDIT LOG ERROR", e);
  }
}

function activeDateWhere(now = new Date()) {
  return {
    AND: [
      {
        OR: [
          {
            startAt: null
          },
          {
            startAt: {
              lte: now
            }
          }
        ]
      },
      {
        OR: [
          {
            endAt: null
          },
          {
            endAt: {
              gte: now
            }
          }
        ]
      }
    ]
  };
}

async function calculateOrder(items) {
  if (!Array.isArray(items) || !items.length) {
    throw new Error("Cart is empty");
  }

  const ids = [
    ...new Set(
      items.map((x) => Number(x.productId))
    )
  ];

  const products = await prisma.product.findMany({
    where: {
      id: {
        in: ids
      },
      active: true
    },
    include: {
      category: true
    }
  });

  if (products.length !== ids.length) {
    throw new Error(
      "One or more products are unavailable"
    );
  }

  const byId = new Map(
    products.map((p) => [p.id, p])
  );

  const normalized = [];

  for (const raw of items) {
    const p = byId.get(
      Number(raw.productId)
    );

    const qty = Math.floor(
      n(raw.quantity)
    );

    if (!p || qty < 1) {
      throw new Error(
        "Invalid product or quantity"
      );
    }

    if (p.stock < qty) {
      throw new Error(
        `${p.name} এর পর্যাপ্ত stock নেই`
      );
    }

    normalized.push({
      product: p,
      quantity: qty
    });
  }

  const subtotal = normalized.reduce(
    (s, x) =>
      s + Number(x.product.price) * x.quantity,
    0
  );

  const now = new Date();

  const offers = await prisma.offer.findMany({
    where: {
      active: true,
      ...activeDateWhere(now)
    },
    include: {
      products: true,
      categories: true
    },
    orderBy: [
      {
        priority: "desc"
      },
      {
        id: "asc"
      }
    ]
  });

  let discount = 0;

  for (const row of normalized) {
    let best = 0;

    for (const offer of offers) {
      const days = Array.isArray(
        offer.recurringDays
      )
        ? offer.recurringDays
        : [];

      if (
        days.length &&
        !days.includes(now.getDay())
      ) {
        continue;
      }

      if (
        offer.startTime &&
        now.toTimeString().slice(0, 5) <
          offer.startTime
      ) {
        continue;
      }

      if (
        offer.endTime &&
        now.toTimeString().slice(0, 5) >
          offer.endTime
      ) {
        continue;
      }

      const matchProduct =
        offer.products.some(
          (x) =>
            x.productId === row.product.id
        );

      const matchCategory =
        row.product.categoryId &&
        offer.categories.some(
          (x) =>
            x.categoryId ===
            row.product.categoryId
        );

      if (
        !matchProduct &&
        !matchCategory
      ) {
        continue;
      }

      let d = 0;

      const line =
        Number(row.product.price) *
        row.quantity;

      if (offer.type === "percentage") {
        d =
          line *
          (Number(
            offer.discountPercent || 0
          ) / 100);
      } else if (
        offer.type === "fixed"
      ) {
        d = Math.min(
          line,
          Number(
            offer.discountAmount || 0
          ) * row.quantity
        );
      }

      best = Math.max(best, d);

      if (!offer.stackable) {
        break;
      }
    }

    if (best > 0) {
      discount += best;
    }
  }

  return {
    normalized,
    subtotal,
    discount,
    total: Math.max(
      0,
      subtotal - discount
    )
  };
}

/* =========================
   BASIC
========================= */

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

/* =========================
   AUTH
========================= */

app.post(
  "/api/auth/register",
  async (req, res) => {
    try {
      const {
        mobile,
        email,
        password,
        name
      } = req.body;

      if (!mobile || !password) {
        return res.status(400).json({
          error:
            "Mobile number and password are required"
        });
      }

      if (String(password).length < 6) {
        return res.status(400).json({
          error:
            "Password must be at least 6 characters"
        });
      }

      const normalizedEmail =
        normalizeEmail(email);

      if (
        await prisma.user.findUnique({
          where: {
            mobile
          }
        })
      ) {
        return res.status(409).json({
          error:
            "This mobile number is already registered"
        });
      }

      if (
        normalizedEmail &&
        (await prisma.user.findUnique({
          where: {
            email: normalizedEmail
          }
        }))
      ) {
        return res.status(409).json({
          error:
            "This email address is already registered"
        });
      }

      const user =
        await prisma.user.create({
          data: {
            mobile,
            email: normalizedEmail,
            name: name || null,
            passwordHash:
              await bcrypt.hash(
                password,
                12
              ),
            accountType: "CUSTOMER",
            mobileVerified: false
          }
        });

      res.status(201).json({
        message:
          "Account created successfully",
        token: createToken(user),
        user: {
          id: user.id,
          name: user.name,
          mobile: user.mobile,
          email: user.email,
          accountType:
            user.accountType
        }
      });
    } catch (e) {
      console.error(
        "REGISTER ERROR",
        e
      );

      res.status(500).json({
        error:
          "Could not create account"
      });
    }
  }
);

app.post(
  "/api/auth/login",
  async (req, res) => {
    try {
      const {
        mobile,
        email,
        identifier,
        password
      } = req.body;

      const loginValue =
        normalizeIdentifier(
          identifier ||
            mobile ||
            email
        );

      if (!loginValue || !password) {
        return res.status(400).json({
          error:
            "Mobile/email and password are required"
        });
      }

      const user =
        await prisma.user.findUnique({
          where:
            loginValue.includes("@")
              ? {
                  email:
                    normalizeEmail(
                      loginValue
                    )
                }
              : {
                  mobile:
                    loginValue
                },
          include: {
            department: true,
            role: true
          }
        });

      if (
        !user ||
        !user.passwordHash ||
        !(await bcrypt.compare(
          password,
          user.passwordHash
        ))
      ) {
        return res.status(401).json({
          error:
            "Invalid mobile/email or password"
        });
      }

      res.json({
        message: "Login successful",
        token: createToken(user),
        user: safeUser(user)
      });
    } catch (e) {
      console.error(
        "LOGIN ERROR",
        e
      );

      res.status(500).json({
        error: "Login failed"
      });
    }
  }
);

app.get(
  "/api/me",
  authUser,
  (req, res) =>
    res.json({
      user: safeUser(req.user)
    })
);

app.post(
  "/api/auth/change-password",
  authUser,
  async (req, res) => {
    try {
      const {
        currentPassword,
        newPassword
      } = req.body;

      if (
        !currentPassword ||
        !newPassword
      ) {
        return res.status(400).json({
          error:
            "Current password and new password are required"
        });
      }

      if (
        String(newPassword).length < 6
      ) {
        return res.status(400).json({
          error:
            "New password must be at least 6 characters"
        });
      }

      if (
        !(await bcrypt.compare(
          currentPassword,
          req.user.passwordHash || ""
        ))
      ) {
        return res.status(401).json({
          error:
            "Current password is incorrect"
        });
      }

      await prisma.user.update({
        where: {
          id: req.user.id
        },
        data: {
          passwordHash:
            await bcrypt.hash(
              newPassword,
              12
            )
        }
      });

      await writeAuditLog({
        actorId: req.user.id,
        targetUserId: req.user.id,
        action: "PASSWORD_CHANGED"
      });

      res.json({
        message:
          "Password changed successfully"
      });
    } catch (e) {
      console.error(e);

      res.status(500).json({
        error:
          "Could not change password"
      });
    }
  }
);

/* =========================
   PUBLIC MARKETPLACE
========================= */

app.get(
  "/api/categories",
  async (req, res) => {
    try {
      const categories =
        await prisma.category.findMany({
          where: {
            active: true
          },
          orderBy: {
            sortOrder: "asc"
          },
          include: {
            children: {
              where: {
                active: true
              },
              orderBy: {
                sortOrder: "asc"
              }
            }
          }
        });

      res.json({
        categories
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load categories"
      });
    }
  }
);

app.get(
  "/api/products",
  async (req, res) => {
    try {
      const {
        categoryId,
        search,
        featured,
        limit
      } = req.query;

      const where = {
        active: true
      };

      if (categoryId) {
        where.categoryId =
          Number(categoryId);
      }

      if (featured === "true") {
        where.featured = true;
      }

      if (search) {
        where.OR = [
          {
            name: {
              contains: String(search),
              mode: "insensitive"
            }
          },
          {
            brand: {
              contains: String(search),
              mode: "insensitive"
            }
          }
        ];
      }

      const products =
        await prisma.product.findMany({
          where,
          include: {
            category: true,
            images: {
              orderBy: {
                sortOrder: "asc"
              }
            }
          },
          orderBy: {
            createdAt: "desc"
          },
          take: Math.min(
            100,
            Math.max(
              1,
              Number(limit) || 50
            )
          )
        });

      res.json({
        products:
          products.map(
            publicProduct
          )
      });
    } catch (e) {
      console.error(e);

      res.status(500).json({
        error:
          "Could not load products"
      });
    }
  }
);

app.get(
  "/api/products/:id",
  async (req, res) => {
    try {
      const p =
        await prisma.product.findFirst({
          where: {
            id: Number(
              req.params.id
            ),
            active: true
          },
          include: {
            category: true,
            images: {
              orderBy: {
                sortOrder: "asc"
              }
            }
          }
        });

      if (!p) {
        return res.status(404).json({
          error:
            "Product not found"
        });
      }

      res.json({
        product:
          publicProduct(p)
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load product"
      });
    }
  }
);

app.get(
  "/api/banners",
  async (req, res) => {
    try {
      const now = new Date();

      const banners =
        await prisma.banner.findMany({
          where: {
            active: true,
            ...activeDateWhere(now)
          },
          orderBy: {
            sortOrder: "asc"
          }
        });

      res.json({
        banners
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load banners"
      });
    }
  }
);

app.get(
  "/api/homepage/sections",
  async (req, res) => {
    try {
      const sections =
        await prisma.homepageSection.findMany({
          where: {
            visible: true
          },
          orderBy: {
            sortOrder: "asc"
          }
        });

      res.json({
        sections
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load homepage sections"
      });
    }
  }
);

app.get(
  "/api/offers",
  async (req, res) => {
    try {
      const offers =
        await prisma.offer.findMany({
          where: {
            active: true,
            ...activeDateWhere(
              new Date()
            )
          },
          include: {
            products: {
              include: {
                product: true
              }
            },
            categories: {
              include: {
                category: true
              }
            }
          },
          orderBy: [
            {
              priority: "desc"
            },
            {
              id: "asc"
            }
          ]
        });

      res.json({
        offers
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load offers"
      });
    }
  }
);

/* =========================
   ADMIN PROFILE
========================= */

app.get(
  "/api/admin/profile",
  authUser,
  requireAdmin,
  (req, res) =>
    res.json({
      user: safeUser(req.user)
    })
);

/* =========================
   DEPARTMENTS
========================= */

app.get(
  "/api/admin/departments",
  authUser,
  requireAdmin,
  async (req, res) => {
    try {
      res.json({
        departments:
          await prisma.department.findMany({
            orderBy: {
              id: "asc"
            }
          })
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load departments"
      });
    }
  }
);

app.post(
  "/api/admin/departments",
  authUser,
  requireAdmin,
  requirePermission(
    "departments.manage"
  ),
  async (req, res) => {
    try {
      const {
        name,
        description
      } = req.body;

      if (!name) {
        return res.status(400).json({
          error:
            "Department name is required"
        });
      }

      const department =
        await prisma.department.create({
          data: {
            name:
              String(name).trim(),
            description:
              description || null
          }
        });

      await writeAuditLog({
        actorId: req.user.id,
        action:
          "DEPARTMENT_CREATED",
        details: {
          departmentId:
            department.id,
          name:
            department.name
        }
      });

      res.status(201).json({
        department
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not create department"
      });
    }
  }
);

app.patch(
  "/api/admin/departments/:id",
  authUser,
  requireAdmin,
  requirePermission(
    "departments.manage"
  ),
  async (req, res) => {
    try {
      const {
        name,
        description,
        active
      } = req.body;

      const department =
        await prisma.department.update({
          where: {
            id: Number(
              req.params.id
            )
          },
          data: {
            ...(name !== undefined && {
              name:
                String(name).trim()
            }),
            ...(description !==
              undefined && {
              description:
                description || null
            }),
            ...(active !==
              undefined && {
              active:
                Boolean(active)
            })
          }
        });

      res.json({
        department
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not update department"
      });
    }
  }
);

/* =========================
   ROLES & PERMISSIONS
========================= */

app.get(
  "/api/admin/roles",
  authUser,
  requireAdmin,
  async (req, res) => {
    try {
      res.json({
        roles:
          await prisma.role.findMany({
            include: {
              department: true,
              permissions: {
                include: {
                  permission: true
                }
              }
            },
            orderBy: {
              id: "asc"
            }
          })
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load roles"
      });
    }
  }
);

app.post(
  "/api/admin/roles",
  authUser,
  requireAdmin,
  requirePermission(
    "roles.manage"
  ),
  async (req, res) => {
    try {
      const {
        name,
        description,
        level,
        departmentId
      } = req.body;

      const role =
        await prisma.role.create({
          data: {
            name:
              String(name).trim(),
            description:
              description || null,
            level:
              n(level, 3),
            departmentId:
              departmentId
                ? Number(
                    departmentId
                  )
                : null
          },
          include: {
            department: true
          }
        });

      res.status(201).json({
        role
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not create role"
      });
    }
  }
);

app.get(
  "/api/admin/permissions",
  authUser,
  requireAdmin,
  async (req, res) => {
    try {
      res.json({
        permissions:
          await prisma.permission.findMany({
            orderBy: [
              {
                module: "asc"
              },
              {
                key: "asc"
              }
            ]
          })
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load permissions"
      });
    }
  }
);

app.post(
  "/api/admin/permissions",
  authUser,
  requireAdmin,
  requirePermission(
    "permissions.manage"
  ),
  async (req, res) => {
    try {
      const {
        key,
        name,
        description,
        module
      } = req.body;

      if (!key || !name) {
        return res.status(400).json({
          error:
            "Permission key and name are required"
        });
      }

      const permission =
        await prisma.permission.create({
          data: {
            key:
              String(key).trim(),
            name:
              String(name).trim(),
            description:
              description || null,
            module:
              module || null
          }
        });

      res.status(201).json({
        permission
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not create permission"
      });
    }
  }
);

app.post(
  "/api/admin/roles/:roleId/permissions",
  authUser,
  requireAdmin,
  requirePermission(
    "permissions.manage"
  ),
  async (req, res) => {
    try {
      const rolePermission =
        await prisma.rolePermission.create({
          data: {
            roleId: Number(
              req.params.roleId
            ),
            permissionId:
              Number(
                req.body.permissionId
              )
          },
          include: {
            role: true,
            permission: true
          }
        });

      res.status(201).json({
        rolePermission
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not grant role permission"
      });
    }
  }
);

/* =========================
   STAFF
========================= */

app.get(
  "/api/admin/users",
  authUser,
  requireAdmin,
  requirePermission(
    "staff.view"
  ),
  async (req, res) => {
    try {
      const users =
        await prisma.user.findMany({
          where: {
            accountType: {
              in: [
                "OWNER",
                "PARTNER",
                "EMPLOYEE"
              ]
            }
          },
          include: {
            department: true,
            role: true
          },
          orderBy: {
            id: "asc"
          }
        });

      res.json({
        users:
          users.map(
            safeUser
          )
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load staff"
      });
    }
  }
);

app.post(
  "/api/admin/users",
  authUser,
  requireAdmin,
  requirePermission(
    "staff.manage"
  ),
  async (req, res) => {
    try {
      const {
        name,
        mobile,
        email,
        password,
        departmentId,
        roleId,
        managerId
      } = req.body;

      if (!mobile || !password) {
        return res.status(400).json({
          error:
            "Mobile and password are required"
        });
      }

      if (String(password).length < 6) {
        return res.status(400).json({
          error:
            "Password must be at least 6 characters"
        });
      }

      if (
        await prisma.user.findUnique({
          where: {
            mobile
          }
        })
      ) {
        return res.status(409).json({
          error:
            "Mobile number already exists"
        });
      }

      const ne =
        normalizeEmail(email);

      if (
        ne &&
        (await prisma.user.findUnique({
          where: {
            email: ne
          }
        }))
      ) {
        return res.status(409).json({
          error:
            "Email already exists"
        });
      }

      const user =
        await prisma.user.create({
          data: {
            name:
              name || null,
            mobile,
            email: ne,
            passwordHash:
              await bcrypt.hash(
                password,
                12
              ),
            accountType:
              "EMPLOYEE",
            departmentId:
              departmentId
                ? Number(
                    departmentId
                  )
                : null,
            roleId:
              roleId
                ? Number(roleId)
                : null,
            managerId:
              managerId
                ? Number(
                    managerId
                  )
                : null
          },
          include: {
            department: true,
            role: true
          }
        });

      await writeAuditLog({
        actorId: req.user.id,
        targetUserId: user.id,
        action:
          "EMPLOYEE_CREATED"
      });

      res.status(201).json({
        user: safeUser(user)
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not create employee"
      });
    }
  }
);

app.patch(
  "/api/admin/users/:id",
  authUser,
  requireAdmin,
  requirePermission(
    "staff.manage"
  ),
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      const target =
        await prisma.user.findUnique({
          where: {
            id
          }
        });

      if (!target) {
        return res.status(404).json({
          error:
            "User not found"
        });
      }

      if (
        target.accountType ===
          "OWNER" &&
        req.user.accountType !==
          "OWNER"
      ) {
        return res.status(403).json({
          error:
            "Only owner can modify owner account"
        });
      }

      const data = {};

      if (
        req.body.name !==
        undefined
      ) {
        data.name =
          req.body.name || null;
      }

      if (
        req.body.email !==
        undefined
      ) {
        data.email =
          normalizeEmail(
            req.body.email
          );
      }

      for (
        const k of [
          "departmentId",
          "roleId",
          "managerId"
        ]
      ) {
        if (
          req.body[k] !==
          undefined
        ) {
          data[k] =
            req.body[k]
              ? Number(
                  req.body[k]
                )
              : null;
        }
      }

      if (
        req.body.accountType !==
        undefined
      ) {
        if (
          req.user.accountType !==
          "OWNER"
        ) {
          return res.status(403).json({
            error:
              "Only owner can change account type"
          });
        }

        if (
          ![
            "CUSTOMER",
            "EMPLOYEE",
            "PARTNER"
          ].includes(
            req.body.accountType
          )
        ) {
          return res.status(400).json({
            error:
              "Invalid account type"
          });
        }

        data.accountType =
          req.body.accountType;
      }

      const updated =
        await prisma.user.update({
          where: {
            id
          },
          data,
          include: {
            department: true,
            role: true
          }
        });

      await writeAuditLog({
        actorId: req.user.id,
        targetUserId: id,
        action:
          "USER_UPDATED",
        details: data
      });

      res.json({
        user:
          safeUser(updated)
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not update user"
      });
    }
  }
);

app.post(
  "/api/admin/users/:id/permissions",
  authUser,
  requireAdmin,
  async (req, res) => {
    try {
      const targetId =
        Number(req.params.id);

      const permissionId =
        Number(
          req.body.permissionId
        );

      const allowed =
        req.body.allowed !==
        false;

      const target =
        await prisma.user.findUnique({
          where: {
            id: targetId
          }
        });

      const permission =
        await prisma.permission.findUnique({
          where: {
            id: permissionId
          }
        });

      if (!target) {
        return res.status(404).json({
          error:
            "Target user not found"
        });
      }

      if (!permission) {
        return res.status(404).json({
          error:
            "Permission not found"
        });
      }

      if (
        req.user.accountType !==
        "OWNER"
      ) {
        if (
          target.managerId !==
          req.user.id
        ) {
          return res.status(403).json({
            error:
              "You can only manage permissions of your direct subordinates"
          });
        }

        if (
          target.departmentId !==
          req.user.departmentId
        ) {
          return res.status(403).json({
            error:
              "Cross-department permission delegation is not allowed"
          });
        }

        if (
          !(await userHasPermission(
            req.user.id,
            permission.key
          ))
        ) {
          return res.status(403).json({
            error:
              "You cannot grant a permission you do not have"
          });
        }
      }

      const up =
        await prisma.userPermission.upsert({
          where: {
            userId_permissionId: {
              userId: targetId,
              permissionId
            }
          },
          update: {
            allowed,
            grantedById:
              req.user.id
          },
          create: {
            userId: targetId,
            permissionId,
            allowed,
            grantedById:
              req.user.id
          },
          include: {
            permission: true
          }
        });

      res.status(201).json({
        userPermission: up
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not update user permission"
      });
    }
  }
);

/* =========================
   CATEGORIES
========================= */

app.get(
  "/api/admin/categories",
  authUser,
  requireAdmin,
  async (req, res) => {
    try {
      const categories =
        await prisma.category.findMany({
          include: {
            parent: true,
            children: true,
            _count: {
              select: {
                products: true
              }
            }
          },
          orderBy: {
            sortOrder: "asc"
          }
        });

      res.json({
        categories
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load categories"
      });
    }
  }
);

app.post(
  "/api/admin/categories",
  authUser,
  requireAdmin,
  requirePermission(
    "categories.manage"
  ),
  async (req, res) => {
    try {
      const {
        name,
        slug,
        icon,
        image,
        description,
        parentId,
        sortOrder,
        active
      } = req.body;

      if (!name) {
        return res.status(400).json({
          error:
            "Category name is required"
        });
      }

      const category =
        await prisma.category.create({
          data: {
            name:
              String(name).trim(),
            slug: slugify(
              slug || name
            ),
            icon:
              icon || null,
            image:
              image || null,
            description:
              description || null,
            parentId:
              parentId
                ? Number(
                    parentId
                  )
                : null,
            sortOrder:
              n(sortOrder, 0),
            active:
              active !== false
          }
        });

      await writeAuditLog({
        actorId: req.user.id,
        action:
          "CATEGORY_CREATED",
        details: {
          categoryId:
            category.id
        }
      });

      res.status(201).json({
        category
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not create category"
      });
    }
  }
);

app.patch(
  "/api/admin/categories/:id",
  authUser,
  requireAdmin,
  requirePermission(
    "categories.manage"
  ),
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      const data = {};

      for (
        const k of [
          "name",
          "icon",
          "image",
          "description"
        ]
      ) {
        if (
          req.body[k] !==
          undefined
        ) {
          data[k] =
            req.body[k] || null;
        }
      }

      if (
        req.body.slug !==
        undefined
      ) {
        data.slug =
          slugify(
            req.body.slug
          );
      }

      if (
        req.body.parentId !==
        undefined
      ) {
        data.parentId =
          req.body.parentId
            ? Number(
                req.body.parentId
              )
            : null;
      }

      if (
        req.body.sortOrder !==
        undefined
      ) {
        data.sortOrder =
          n(req.body.sortOrder);
      }

      if (
        req.body.active !==
        undefined
      ) {
        data.active =
          Boolean(
            req.body.active
          );
      }

      const category =
        await prisma.category.update({
          where: {
            id
          },
          data
        });

      res.json({
        category
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not update category"
      });
    }
  }
);

app.delete(
  "/api/admin/categories/:id",
  authUser,
  requireAdmin,
  requirePermission(
    "categories.manage"
  ),
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      const count =
        await prisma.product.count({
          where: {
            categoryId: id
          }
        });

      if (count > 0) {
        return res.status(409).json({
          error:
            "Category has products. Move products or hide the category first."
        });
      }

      await prisma.category.delete({
        where: {
          id
        }
      });

      res.json({
        message:
          "Category deleted"
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not delete category"
      });
    }
  }
);

/* =========================
   PRODUCTS
========================= */

app.get(
  "/api/admin/products",
  authUser,
  requireAdmin,
  requirePermission(
    "products.view"
  ),
  async (req, res) => {
    try {
      const products =
        await prisma.product.findMany({
          include: {
            category: true,
            images: {
              orderBy: {
                sortOrder: "asc"
              }
            }
          },
          orderBy: {
            id: "desc"
          }
        });

      res.json({
        products:
          products.map(
            publicProduct
          )
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load products"
      });
    }
  }
);

app.post(
  "/api/admin/products",
  authUser,
  requireAdmin,
  requirePermission(
    "products.manage"
  ),
  async (req, res) => {
    try {
      const {
        name,
        slug,
        sku,
        brand,
        description,
        price,
        oldPrice,
        stock,
        lowStockAt,
        active,
        featured,
        badge,
        rating,
        categoryId,
        images = []
      } = req.body;

      if (
        !name ||
        !Number.isFinite(
          Number(price)
        )
      ) {
        return res.status(400).json({
          error:
            "Product name and valid price are required"
        });
      }

      const p =
        await prisma.product.create({
          data: {
            name,
            slug: slugify(
              slug || name
            ),
            sku:
              sku || null,
            brand:
              brand || null,
            description:
              description || null,
            price:
              Number(price),
            oldPrice:
              oldPrice == null
                ? null
                : Number(oldPrice),
            stock: Math.max(
              0,
              Math.floor(
                n(stock)
              )
            ),
            lowStockAt:
              Math.max(
                0,
                Math.floor(
                  n(
                    lowStockAt,
                    5
                  )
                )
              ),
            active:
              active !== false,
            featured:
              Boolean(
                featured
              ),
            badge:
              badge || null,
            rating:
              rating == null
                ? null
                : Number(rating),
            categoryId:
              categoryId
                ? Number(
                    categoryId
                  )
                : null,
            images: {
              create:
                (
                  Array.isArray(
                    images
                  )
                    ? images
                    : []
                )
                  .filter(Boolean)
                  .map(
                    (
                      url,
                      i
                    ) => ({
                      url:
                        String(
                          url
                        ),
                      sortOrder:
                        i
                    })
                  )
            }
          },
          include: {
            category: true,
            images: true
          }
        });

      res.status(201).json({
        product:
          publicProduct(p)
      });
    } catch (e) {
      console.error(e);

      res.status(500).json({
        error:
          "Could not create product"
      });
    }
  }
);

app.patch(
  "/api/admin/products/:id",
  authUser,
  requireAdmin,
  requirePermission(
    "products.manage"
  ),
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      const data = {};

      for (
        const k of [
          "name",
          "brand",
          "description",
          "badge"
        ]
      ) {
        if (
          req.body[k] !==
          undefined
        ) {
          data[k] =
            req.body[k] || null;
        }
      }

      if (
        req.body.slug !==
        undefined
      ) {
        data.slug =
          slugify(
            req.body.slug
          );
      }

      if (
        req.body.sku !==
        undefined
      ) {
        data.sku =
          req.body.sku || null;
      }

      for (
        const k of [
          "price",
          "oldPrice",
          "rating"
        ]
      ) {
        if (
          req.body[k] !==
          undefined
        ) {
          data[k] =
            req.body[k] == null
              ? null
              : Number(
                  req.body[k]
                );
        }
      }

      for (
        const k of [
          "stock",
          "lowStockAt"
        ]
      ) {
        if (
          req.body[k] !==
          undefined
        ) {
          data[k] =
            Math.max(
              0,
              Math.floor(
                n(
                  req.body[k]
                )
              )
            );
        }
      }

      for (
        const k of [
          "active",
          "featured"
        ]
      ) {
        if (
          req.body[k] !==
          undefined
        ) {
          data[k] =
            Boolean(
              req.body[k]
            );
        }
      }

      if (
        req.body.categoryId !==
        undefined
      ) {
        data.categoryId =
          req.body.categoryId
            ? Number(
                req.body.categoryId
              )
            : null;
      }

      if (
        Array.isArray(
          req.body.images
        )
      ) {
        await prisma.productImage.deleteMany(
          {
            where: {
              productId: id
            }
          }
        );

        data.images = {
          create:
            req.body.images
              .filter(Boolean)
              .map(
                (
                  url,
                  i
                ) => ({
                  url:
                    String(
                      url
                    ),
                  sortOrder:
                    i
                })
              )
        };
      }

      const p =
        await prisma.product.update({
          where: {
            id
          },
          data,
          include: {
            category: true,
            images: {
              orderBy: {
                sortOrder:
                  "asc"
              }
            }
          }
        });

      res.json({
        product:
          publicProduct(p)
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not update product"
      });
    }
  }
);

app.delete(
  "/api/admin/products/:id",
  authUser,
  requireAdmin,
  requirePermission(
    "products.manage"
  ),
  async (req, res) => {
    try {
      await prisma.product.update({
        where: {
          id: Number(
            req.params.id
          )
        },
        data: {
          active: false
        }
      });

      res.json({
        message:
          "Product hidden"
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not hide product"
      });
    }
  }
);

/* =========================
   BANNERS
========================= */

app.get(
  "/api/admin/banners",
  authUser,
  requireAdmin,
  requirePermission(
    "banners.manage"
  ),
  async (req, res) => {
    try {
      res.json({
        banners:
          await prisma.banner.findMany({
            orderBy: {
              sortOrder: "asc"
            }
          })
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load banners"
      });
    }
  }
);

app.post(
  "/api/admin/banners",
  authUser,
  requireAdmin,
  requirePermission(
    "banners.manage"
  ),
  async (req, res) => {
    try {
      const {
        title,
        desktopImage,
        mobileImage,
        link,
        active,
        sortOrder,
        startAt,
        endAt
      } = req.body;

      if (
        !title ||
        !desktopImage
      ) {
        return res.status(400).json({
          error:
            "Title and desktop image are required"
        });
      }

      const banner =
        await prisma.banner.create({
          data: {
            title,
            desktopImage,
            mobileImage:
              mobileImage ||
              null,
            link:
              link || null,
            active:
              active !== false,
            sortOrder:
              n(sortOrder),
            startAt:
              dateOrNull(startAt),
            endAt:
              dateOrNull(endAt)
          }
        });

      res.status(201).json({
        banner
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not create banner"
      });
    }
  }
);

app.patch(
  "/api/admin/banners/:id",
  authUser,
  requireAdmin,
  requirePermission(
    "banners.manage"
  ),
  async (req, res) => {
    try {
      const data = {};

      for (
        const k of [
          "title",
          "desktopImage",
          "mobileImage",
          "link"
        ]
      ) {
        if (
          req.body[k] !==
          undefined
        ) {
          data[k] =
            req.body[k] || null;
        }
      }

      if (
        req.body.active !==
        undefined
      ) {
        data.active =
          Boolean(
            req.body.active
          );
      }

      if (
        req.body.sortOrder !==
        undefined
      ) {
        data.sortOrder =
          n(req.body.sortOrder);
      }

      if (
        req.body.startAt !==
        undefined
      ) {
        data.startAt =
          dateOrNull(
            req.body.startAt
          );
      }

      if (
        req.body.endAt !==
        undefined
      ) {
        data.endAt =
          dateOrNull(
            req.body.endAt
          );
      }

      res.json({
        banner:
          await prisma.banner.update({
            where: {
              id: Number(
                req.params.id
              )
            },
            data
          })
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not update banner"
      });
    }
  }
);

app.delete(
  "/api/admin/banners/:id",
  authUser,
  requireAdmin,
  requirePermission(
    "banners.manage"
  ),
  async (req, res) => {
    try {
      await prisma.banner.delete({
        where: {
          id: Number(
            req.params.id
          )
        }
      });

      res.json({
        message:
          "Banner deleted"
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not delete banner"
      });
    }
  }
);

/* =========================
   HOMEPAGE
========================= */

app.get(
  "/api/admin/homepage/sections",
  authUser,
  requireAdmin,
  requirePermission(
    "homepage.manage"
  ),
  async (req, res) => {
    try {
      res.json({
        sections:
          await prisma.homepageSection.findMany({
            orderBy: {
              sortOrder: "asc"
            }
          })
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load homepage sections"
      });
    }
  }
);

app.patch(
  "/api/admin/homepage/sections/:id",
  authUser,
  requireAdmin,
  requirePermission(
    "homepage.manage"
  ),
  async (req, res) => {
    try {
      const data = {};

      if (
        req.body.visible !==
        undefined
      ) {
        data.visible =
          Boolean(
            req.body.visible
          );
      }

      if (
        req.body.sortOrder !==
        undefined
      ) {
        data.sortOrder =
          n(
            req.body.sortOrder
          );
      }

      if (
        req.body.title !==
        undefined
      ) {
        data.title =
          req.body.title ||
          null;
      }

      res.json({
        section:
          await prisma.homepageSection.update({
            where: {
              id: Number(
                req.params.id
              )
            },
            data
          })
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not update homepage section"
      });
    }
  }
);

app.post(
  "/api/admin/homepage/sections/reorder",
  authUser,
  requireAdmin,
  requirePermission(
    "homepage.manage"
  ),
  async (req, res) => {
    try {
      const ids =
        Array.isArray(
          req.body.ids
        )
          ? req.body.ids.map(
              Number
            )
          : [];

      await prisma.$transaction(
        ids.map(
          (id, i) =>
            prisma.homepageSection.update(
              {
                where: {
                  id
                },
                data: {
                  sortOrder:
                    i + 1
                }
              }
            )
        )
      );

      res.json({
        message:
          "Homepage order updated"
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not reorder homepage sections"
      });
    }
  }
);

/* =========================
   OFFERS
========================= */

app.get(
  "/api/admin/offers",
  authUser,
  requireAdmin,
  requirePermission(
    "offers.manage"
  ),
  async (req, res) => {
    try {
      res.json({
        offers:
          await prisma.offer.findMany({
            include: {
              products: {
                include: {
                  product: true
                }
              },
              categories: {
                include: {
                  category: true
                }
              }
            },
            orderBy: [
              {
                priority:
                  "desc"
              },
              {
                id: "asc"
              }
            ]
          })
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load offers"
      });
    }
  }
);

app.post(
  "/api/admin/offers",
  authUser,
  requireAdmin,
  requirePermission(
    "offers.manage"
  ),
  async (req, res) => {
    try {
      const {
        title,
        message,
        type = "percentage",
        discountPercent,
        discountAmount,
        recurringDays,
        startTime,
        endTime,
        startAt,
        endAt,
        priority,
        active,
        homepage,
        stackable,
        productIds = [],
        categoryIds = []
      } = req.body;

      if (!title) {
        return res.status(400).json({
          error:
            "Offer title is required"
        });
      }

      const offer =
        await prisma.offer.create({
          data: {
            title,
            message:
              message || null,
            type,
            discountPercent:
              discountPercent ==
              null
                ? null
                : Number(
                    discountPercent
                  ),
            discountAmount:
              discountAmount ==
              null
                ? null
                : Number(
                    discountAmount
                  ),
            recurringDays:
              Array.isArray(
                recurringDays
              )
                ? recurringDays
                : null,
            startTime:
              startTime || null,
            endTime:
              endTime || null,
            startAt:
              dateOrNull(startAt),
            endAt:
              dateOrNull(endAt),
            priority:
              n(priority),
            active:
              active !== false,
            homepage:
              Boolean(
                homepage
              ),
            stackable:
              Boolean(
                stackable
              ),
            products: {
              create:
                (
                  productIds ||
                  []
                ).map(
                  (id) => ({
                    productId:
                      Number(id)
                  })
                )
            },
            categories: {
              create:
                (
                  categoryIds ||
                  []
                ).map(
                  (id) => ({
                    categoryId:
                      Number(id)
                  })
                )
            }
          },
          include: {
            products: true,
            categories: true
          }
        });

      res.status(201).json({
        offer
      });
    } catch (e) {
      console.error(e);

      res.status(500).json({
        error:
          "Could not create offer"
      });
    }
  }
);

app.patch(
  "/api/admin/offers/:id",
  authUser,
  requireAdmin,
  requirePermission(
    "offers.manage"
  ),
  async (req, res) => {
    try {
      const id =
        Number(req.params.id);

      const data = {};

      for (
        const k of [
          "title",
          "message",
          "type",
          "startTime",
          "endTime"
        ]
      ) {
        if (
          req.body[k] !==
          undefined
        ) {
          data[k] =
            req.body[k] || null;
        }
      }

      for (
        const k of [
          "discountPercent",
          "discountAmount"
        ]
      ) {
        if (
          req.body[k] !==
          undefined
        ) {
          data[k] =
            req.body[k] == null
              ? null
              : Number(
                  req.body[k]
                );
        }
      }

      if (
        req.body.priority !==
        undefined
      ) {
        data.priority =
          n(
            req.body.priority
          );
      }

      for (
        const k of [
          "active",
          "homepage",
          "stackable"
        ]
      ) {
        if (
          req.body[k] !==
          undefined
        ) {
          data[k] =
            Boolean(
              req.body[k]
            );
        }
      }

      if (
        req.body.recurringDays !==
        undefined
      ) {
        data.recurringDays =
          Array.isArray(
            req.body.recurringDays
          )
            ? req.body.recurringDays
            : null;
      }

      if (
        req.body.startAt !==
        undefined
      ) {
        data.startAt =
          dateOrNull(
            req.body.startAt
          );
      }

      if (
        req.body.endAt !==
        undefined
      ) {
        data.endAt =
          dateOrNull(
            req.body.endAt
          );
      }

      if (
        Array.isArray(
          req.body.productIds
        ) ||
        Array.isArray(
          req.body.categoryIds
        )
      ) {
        await prisma.offerProduct.deleteMany(
          {
            where: {
              offerId: id
            }
          }
        );

        await prisma.offerCategory.deleteMany(
          {
            where: {
              offerId: id
            }
          }
        );

        data.products = {
          create:
            (
              req.body.productIds ||
              []
            ).map(
              (x) => ({
                productId:
                  Number(x)
              })
            )
        };

        data.categories = {
          create:
            (
              req.body.categoryIds ||
              []
            ).map(
              (x) => ({
                categoryId:
                  Number(x)
              })
            )
        };
      }

      res.json({
        offer:
          await prisma.offer.update({
            where: {
              id
            },
            data,
            include: {
              products: true,
              categories: true
            }
          })
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not update offer"
      });
    }
  }
);

app.delete(
  "/api/admin/offers/:id",
  authUser,
  requireAdmin,
  requirePermission(
    "offers.manage"
  ),
  async (req, res) => {
    try {
      await prisma.offer.delete({
        where: {
          id: Number(
            req.params.id
          )
        }
      });

      res.json({
        message:
          "Offer deleted"
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not delete offer"
      });
    }
  }
);

/* =========================
   ORDERS
========================= */

app.post(
  "/api/orders",
  authUser,
  async (req, res) => {
    try {
      const {
        customerName,
        mobile,
        address,
        paymentMethod = "COD",
        items
      } = req.body;

      if (
        !customerName ||
        !mobile ||
        !address
      ) {
        return res.status(400).json({
          error:
            "Name, mobile and address are required"
        });
      }

      if (
        !/^01\d{9}$/.test(
          String(mobile)
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid Bangladesh mobile number"
        });
      }

      const calc =
        await calculateOrder(
          items
        );

      const order =
        await prisma.$transaction(
          async (tx) => {
            for (
              const x of
                calc.normalized
            ) {
              const updated =
                await tx.product.updateMany(
                  {
                    where: {
                      id:
                        x.product.id,
                      active: true,
                      stock: {
                        gte:
                          x.quantity
                      }
                    },
                    data: {
                      stock: {
                        decrement:
                          x.quantity
                      }
                    }
                  }
                );

              if (
                updated.count !==
                1
              ) {
                throw new Error(
                  `${x.product.name} এর stock পরিবর্তিত হয়েছে, আবার চেষ্টা করুন`
                );
              }
            }

            const created =
              await tx.order.create({
                data: {
                  orderId:
                    `TEMP-${Date.now()}-${crypto.randomBytes(3).toString("hex")}`,
                  customerId:
                    req.user.id,
                  customerName,
                  mobile,
                  address,
                  paymentMethod,
                  paymentStatus:
                    "PENDING",
                  status:
                    "PENDING",
                  subtotal:
                    calc.subtotal,
                  discount:
                    calc.discount,
                  deliveryCharge:
                    0,
                  total:
                    calc.total,
                  items: {
                    create:
                      calc.normalized.map(
                        (x) => ({
                          productId:
                            x.product
                              .id,
                          productName:
                            x.product
                              .name,
                          unitPrice:
                            Number(
                              x.product
                                .price
                            ),
                          quantity:
                            x.quantity,
                          lineTotal:
                            Number(
                              x.product
                                .price
                            ) *
                            x.quantity
                        })
                      )
                  }
                }
              });

            const orderId =
              `KCP-${created.createdAt
                .toISOString()
                .slice(
                  0,
                  10
                )
                .replaceAll(
                  "-",
                  ""
                )}-${String(
                created.id
              ).padStart(
                4,
                "0"
              )}`;

            return tx.order.update({
              where: {
                id:
                  created.id
              },
              data: {
                orderId
              },
              include: {
                items: true
              }
            });
          }
        );

      await writeAuditLog({
        actorId: req.user.id,
        targetUserId:
          req.user.id,
        action:
          "ORDER_CREATED",
        details: {
          orderId:
            order.orderId
        }
      });

      res.status(201).json({
        message:
          "Order created successfully",
        orderId:
          order.orderId,
        order:
          publicOrder(order)
      });
    } catch (e) {
      console.error(
        "ORDER CREATE ERROR",
        e
      );

      res.status(400).json({
        error:
          e.message ||
          "Could not create order"
      });
    }
  }
);

app.get(
  "/api/orders",
  authUser,
  async (req, res) => {
    try {
      const orders =
        await prisma.order.findMany({
          where: {
            customerId:
              req.user.id
          },
          include: {
            items: true
          },
          orderBy: {
            createdAt:
              "desc"
          }
        });

      res.json({
        orders:
          orders.map(
            publicOrder
          )
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load orders"
      });
    }
  }
);

app.get(
  "/api/orders/:orderId",
  authUser,
  async (req, res) => {
    try {
      const order =
        await prisma.order.findFirst({
          where: {
            orderId:
              req.params.orderId,
            customerId:
              req.user.id
          },
          include: {
            items: true
          }
        });

      if (!order) {
        return res.status(404).json({
          error:
            "Order not found"
        });
      }

      res.json({
        order:
          publicOrder(order)
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load order"
      });
    }
  }
);

app.get(
  "/api/admin/orders",
  authUser,
  requireAdmin,
  requirePermission(
    "orders.view"
  ),
  async (req, res) => {
    try {
      const orders =
        await prisma.order.findMany({
          include: {
            items: true,
            customer: true
          },
          orderBy: {
            createdAt:
              "desc"
          }
        });

      res.json({
        orders:
          orders.map(
            publicOrder
          )
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not load orders"
      });
    }
  }
);

app.patch(
  "/api/admin/orders/:id/status",
  authUser,
  requireAdmin,
  requirePermission(
    "orders.edit"
  ),
  async (req, res) => {
    try {
      const status =
        String(
          req.body.status ||
            ""
        ).toUpperCase();

      const allowed = [
        "PENDING",
        "CONFIRMED",
        "PROCESSING",
        "SHIPPED",
        "DELIVERED",
        "CANCELLED",
        "RETURNED"
      ];

      if (
        !allowed.includes(
          status
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid order status"
        });
      }

      const order =
        await prisma.order.update({
          where: {
            id: Number(
              req.params.id
            )
          },
          data: {
            status
          },
          include: {
            items: true
          }
        });

      await writeAuditLog({
        actorId: req.user.id,
        action:
          "ORDER_STATUS_UPDATED",
        details: {
          orderId:
            order.orderId,
          status
        }
      });

      res.json({
        order:
          publicOrder(order)
      });
    } catch (e) {
      res.status(500).json({
        error:
          "Could not update order status"
      });
    }
  }
);

/* =========================
   ERROR HANDLER
========================= */

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      "UNHANDLED ERROR",
      err
    );

    if (res.headersSent) {
      return next(err);
    }

    res.status(500).json({
      error:
        "Internal server error"
    });
  }
);

/* =========================
   SHUTDOWN
========================= */

process.on(
  "SIGINT",
  async () => {
    await prisma.$disconnect();
    process.exit(0);
  }
);

process.on(
  "SIGTERM",
  async () => {
    await prisma.$disconnect();
    process.exit(0);
  }
);

app.listen(
  PORT,
  () =>
    console.log(
      `Kachepai Backend is running on port ${PORT}`
    )
);
