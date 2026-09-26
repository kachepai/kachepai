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

app.use(
  cors({
    origin: true,
    credentials: true
  })
);

app.use(helmet());
app.use(express.json());

const PORT = process.env.PORT || 5000;

const JWT_SECRET =
  process.env.JWT_SECRET || "change-this-secret";

/* ======================================================
   BASIC HELPERS
====================================================== */

function createToken(user) {
  return jwt.sign(
    {
      id: user.id
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

function normalizeEmail(email) {
  if (!email) return null;

  return String(email)
    .trim()
    .toLowerCase();
}

function normalizeIdentifier(value) {
  return String(value || "").trim();
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

/* ======================================================
   AUTH USER
====================================================== */

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

  } catch (error) {

    return res.status(401).json({
      error:
        "Invalid or expired login"
    });
  }
}

/* ======================================================
   PERMISSION CHECK
====================================================== */

async function userHasPermission(
  userId,
  permissionKey
) {
  const user =
    await prisma.user.findUnique({
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

  if (!user) {
    return false;
  }

  /* OWNER HAS FULL ACCESS */

  if (
    user.accountType === "OWNER"
  ) {
    return true;
  }

  /* CUSTOM USER PERMISSION
     OVERRIDES DEFAULT ROLE */

  const custom =
    user.customPermissions.find(
      item =>
        item.permission.key ===
        permissionKey
    );

  if (custom) {
    return custom.allowed === true;
  }

  /* ROLE PERMISSION */

  if (user.role) {
    const rolePermission =
      user.role.permissions.find(
        item =>
          item.permission.key ===
          permissionKey
      );

    if (rolePermission) {
      return true;
    }
  }

  return false;
}

function requireAdmin(req, res, next) {

  const allowedTypes = [
    "OWNER",
    "PARTNER",
    "EMPLOYEE"
  ];

  if (
    !allowedTypes.includes(
      req.user.accountType
    )
  ) {
    return res.status(403).json({
      error:
        "Admin access denied"
    });
  }

  next();
}

function requirePermission(
  permissionKey
) {
  return async (
    req,
    res,
    next
  ) => {

    try {

      const allowed =
        await userHasPermission(
          req.user.id,
          permissionKey
        );

      if (!allowed) {
        return res.status(403).json({
          error:
            "You do not have permission for this action"
        });
      }

      next();

    } catch (error) {

      console.error(
        "PERMISSION ERROR:",
        error
      );

      return res.status(500).json({
        error:
          "Permission check failed"
      });
    }
  };
}

/* ======================================================
   AUDIT LOG
====================================================== */

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

  } catch (error) {

    console.error(
      "AUDIT LOG ERROR:",
      error
    );
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

      if (password.length < 6) {
        return res.status(400).json({
          error:
            "Password must be at least 6 characters"
        });
      }

      const normalizedEmail =
        normalizeEmail(email);

      const existingMobile =
        await prisma.user.findUnique({
          where: {
            mobile
          }
        });

      if (existingMobile) {
        return res.status(409).json({
          error:
            "This mobile number is already registered"
        });
      }

      if (normalizedEmail) {

        const existingEmail =
          await prisma.user.findUnique({
            where: {
              email: normalizedEmail
            }
          });

        if (existingEmail) {
          return res.status(409).json({
            error:
              "This email address is already registered"
          });
        }
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
            email: normalizedEmail,
            name: name || null,
            passwordHash,
            accountType:
              "CUSTOMER",
            mobileVerified:
              false
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
          mobile: user.mobile,
          email: user.email,
          accountType:
            user.accountType
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
   MOBILE OR EMAIL
====================================================== */

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

      if (
        !loginValue ||
        !password
      ) {
        return res.status(400).json({
          error:
            "Mobile/email and password are required"
        });
      }

      let user = null;

      /* EMAIL LOGIN */

      if (
        loginValue.includes("@")
      ) {

        user =
          await prisma.user.findUnique({
            where: {
              email:
                normalizeEmail(
                  loginValue
                )
            },
            include: {
              department: true,
              role: true
            }
          });

      } else {

        /* MOBILE LOGIN */

        user =
          await prisma.user.findUnique({
            where: {
              mobile: loginValue
            },
            include: {
              department: true,
              role: true
            }
          });
      }

      if (
        !user ||
        !user.passwordHash
      ) {

        return res.status(401).json({
          error:
            "Invalid mobile/email or password"
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
            "Invalid mobile/email or password"
        });
      }

      const token =
        createToken(user);

      res.json({

        message:
          "Login successful",

        token,

        user:
          safeUser(user)

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
      user:
        safeUser(req.user)
    });

  }
);

/* ======================================================
   CHANGE PASSWORD
====================================================== */

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
        newPassword.length < 6
      ) {
        return res.status(400).json({
          error:
            "New password must be at least 6 characters"
        });
      }

      const valid =
        await bcrypt.compare(
          currentPassword,
          req.user.passwordHash || ""
        );

      if (!valid) {
        return res.status(401).json({
          error:
            "Current password is incorrect"
        });
      }

      const passwordHash =
        await bcrypt.hash(
          newPassword,
          12
        );

      await prisma.user.update({
        where: {
          id: req.user.id
        },
        data: {
          passwordHash
        }
      });

      await writeAuditLog({
        actorId:
          req.user.id,
        targetUserId:
          req.user.id,
        action:
          "PASSWORD_CHANGED"
      });

      res.json({
        message:
          "Password changed successfully"
      });

    } catch (error) {

      console.error(
        "CHANGE PASSWORD ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not change password"
      });
    }
  }
);

/* ======================================================
   ADMIN PROFILE
====================================================== */

app.get(
  "/api/admin/profile",
  authUser,
  requireAdmin,
  async (req, res) => {

    res.json({
      user:
        safeUser(req.user)
    });

  }
);

/* ======================================================
   DEPARTMENTS
====================================================== */

app.get(
  "/api/admin/departments",
  authUser,
  requireAdmin,
  async (req, res) => {

    try {

      const departments =
        await prisma.department.findMany({
          orderBy: {
            id: "asc"
          }
        });

      res.json({
        departments
      });

    } catch (error) {

      console.error(
        "DEPARTMENT LIST ERROR:",
        error
      );

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
        actorId:
          req.user.id,
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

    } catch (error) {

      console.error(
        "DEPARTMENT CREATE ERROR:",
        error
      );

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

      const id =
        Number(req.params.id);

      const {
        name,
        description,
        active
      } = req.body;

      const department =
        await prisma.department.update({
          where: {
            id
          },
          data: {
            ...(name !== undefined
              ? {
                  name:
                    String(name).trim()
                }
              : {}),
            ...(description !== undefined
              ? {
                  description:
                    description || null
                }
              : {}),
            ...(active !== undefined
              ? {
                  active:
                    Boolean(active)
                }
              : {})
          }
        });

      await writeAuditLog({
        actorId:
          req.user.id,
        action:
          "DEPARTMENT_UPDATED",
        details: {
          departmentId:
            id
        }
      });

      res.json({
        department
      });

    } catch (error) {

      console.error(
        "DEPARTMENT UPDATE ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not update department"
      });
    }
  }
);

/* ======================================================
   ROLES
====================================================== */

app.get(
  "/api/admin/roles",
  authUser,
  requireAdmin,
  async (req, res) => {

    try {

      const roles =
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
        });

      res.json({
        roles
      });

    } catch (error) {

      console.error(
        "ROLE LIST ERROR:",
        error
      );

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

      if (!name) {
        return res.status(400).json({
          error:
            "Role name is required"
        });
      }

      const role =
        await prisma.role.create({
          data: {
            name:
              String(name).trim(),
            description:
              description || null,
            level:
              Number(level || 3),
            departmentId:
              departmentId
                ? Number(departmentId)
                : null
          },
          include: {
            department: true
          }
        });

      await writeAuditLog({
        actorId:
          req.user.id,
        action:
          "ROLE_CREATED",
        details: {
          roleId:
            role.id,
          name:
            role.name
        }
      });

      res.status(201).json({
        role
      });

    } catch (error) {

      console.error(
        "ROLE CREATE ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not create role"
      });
    }
  }
);

/* ======================================================
   PERMISSIONS
====================================================== */

app.get(
  "/api/admin/permissions",
  authUser,
  requireAdmin,
  async (req, res) => {

    try {

      const permissions =
        await prisma.permission.findMany({
          orderBy: [
            {
              module: "asc"
            },
            {
              key: "asc"
            }
          ]
        });

      res.json({
        permissions
      });

    } catch (error) {

      console.error(
        "PERMISSION LIST ERROR:",
        error
      );

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

      await writeAuditLog({
        actorId:
          req.user.id,
        action:
          "PERMISSION_CREATED",
        details: {
          permissionId:
            permission.id,
          key:
            permission.key
        }
      });

      res.status(201).json({
        permission
      });

    } catch (error) {

      console.error(
        "PERMISSION CREATE ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not create permission"
      });
    }
  }
);

/* ======================================================
   ROLE PERMISSIONS
====================================================== */

app.post(
  "/api/admin/roles/:roleId/permissions",
  authUser,
  requireAdmin,
  requirePermission(
    "permissions.manage"
  ),
  async (req, res) => {

    try {

      const roleId =
        Number(req.params.roleId);

      const {
        permissionId
      } = req.body;

      if (
        !Number.isInteger(
          roleId
        ) ||
        !Number.isInteger(
          Number(permissionId)
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid role or permission"
        });
      }

      const rolePermission =
        await prisma.rolePermission.create({
          data: {
            roleId,
            permissionId:
              Number(permissionId)
          },
          include: {
            role: true,
            permission: true
          }
        });

      await writeAuditLog({
        actorId:
          req.user.id,
        action:
          "ROLE_PERMISSION_GRANTED",
        details: {
          roleId,
          permissionId:
            Number(permissionId)
        }
      });

      res.status(201).json({
        rolePermission
      });

    } catch (error) {

      console.error(
        "ROLE PERMISSION ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not grant role permission"
      });
    }
  }
);

/* ======================================================
   STAFF / EMPLOYEE LIST
====================================================== */

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
          users.map(safeUser)
      });

    } catch (error) {

      console.error(
        "STAFF LIST ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not load staff"
      });
    }
  }
);

/* ======================================================
   CREATE EMPLOYEE
====================================================== */

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

      if (
        !mobile ||
        !password
      ) {
        return res.status(400).json({
          error:
            "Mobile and password are required"
        });
      }

      if (
        password.length < 6
      ) {
        return res.status(400).json({
          error:
            "Password must be at least 6 characters"
        });
      }

      const normalizedEmail =
        normalizeEmail(email);

      const existingMobile =
        await prisma.user.findUnique({
          where: {
            mobile
          }
        });

      if (existingMobile) {
        return res.status(409).json({
          error:
            "Mobile number already exists"
        });
      }

      if (normalizedEmail) {

        const existingEmail =
          await prisma.user.findUnique({
            where: {
              email:
                normalizedEmail
            }
          });

        if (existingEmail) {
          return res.status(409).json({
            error:
              "Email already exists"
          });
        }
      }

      const passwordHash =
        await bcrypt.hash(
          password,
          12
        );

      const user =
        await prisma.user.create({
          data: {
            name:
              name || null,
            mobile,
            email:
              normalizedEmail,
            passwordHash,
            accountType:
              "EMPLOYEE",
            departmentId:
              departmentId
                ? Number(departmentId)
                : null,
            roleId:
              roleId
                ? Number(roleId)
                : null,
            managerId:
              managerId
                ? Number(managerId)
                : null
          },
          include: {
            department: true,
            role: true
          }
        });

      await writeAuditLog({
        actorId:
          req.user.id,
        targetUserId:
          user.id,
        action:
          "EMPLOYEE_CREATED",
        details: {
          departmentId:
            user.departmentId,
          roleId:
            user.roleId,
          managerId:
            user.managerId
        }
      });

      res.status(201).json({
        user:
          safeUser(user)
      });

    } catch (error) {

      console.error(
        "EMPLOYEE CREATE ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not create employee"
      });
    }
  }
);

/* ======================================================
   UPDATE STAFF
====================================================== */

app.patch(
  "/api/admin/users/:id",
  authUser,
  requireAdmin,
  requirePermission(
    "staff.manage"
  ),
  async (req, res) => {

    try {

      const targetId =
        Number(req.params.id);

      const {
        name,
        email,
        departmentId,
        roleId,
        managerId,
        accountType
      } = req.body;

      const target =
        await prisma.user.findUnique({
          where: {
            id: targetId
          }
        });

      if (!target) {
        return res.status(404).json({
          error:
            "User not found"
        });
      }

      /* OWNER CANNOT BE CHANGED
         THROUGH NORMAL STAFF EDIT */

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
        name !== undefined
      ) {
        data.name =
          name || null;
      }

      if (
        email !== undefined
      ) {
        data.email =
          normalizeEmail(email);
      }

      if (
        departmentId !== undefined
      ) {
        data.departmentId =
          departmentId
            ? Number(departmentId)
            : null;
      }

      if (
        roleId !== undefined
      ) {
        data.roleId =
          roleId
            ? Number(roleId)
            : null;
      }

      if (
        managerId !== undefined
      ) {
        data.managerId =
          managerId
            ? Number(managerId)
            : null;
      }

      if (
        accountType !== undefined
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

        const allowedTypes = [
          "CUSTOMER",
          "EMPLOYEE",
          "PARTNER"
        ];

        if (
          !allowedTypes.includes(
            accountType
          )
        ) {
          return res.status(400).json({
            error:
              "Invalid account type"
          });
        }

        data.accountType =
          accountType;
      }

      const updated =
        await prisma.user.update({
          where: {
            id: targetId
          },
          data,
          include: {
            department: true,
            role: true
          }
        });

      await writeAuditLog({
        actorId:
          req.user.id,
        targetUserId:
          targetId,
        action:
          "USER_UPDATED",
        details: data
      });

      res.json({
        user:
          safeUser(updated)
      });

    } catch (error) {

      console.error(
        "USER UPDATE ERROR:",
        error
      );

      res.status(500).json({
        error:
          "Could not update user"
      });
    }
  }
);

/* ======================================================
   CUSTOM USER PERMISSION
====================================================== */

app.post(
  "/api/admin/users/:id/permissions",
  authUser,
  requireAdmin,
  async (req, res) => {

    try {

      const targetId =
        Number(req.params.id);

      const {
        permissionId,
        allowed = true
      } = req.body;

      if (
        !Number.isInteger(
          targetId
        ) ||
        !Number.isInteger(
          Number(permissionId)
        )
      ) {
        return res.status(400).json({
          error:
            "Invalid user or permission"
        });
      }

      const target =
        await prisma.user.findUnique({
          where: {
            id: targetId
          },
          include: {
            department: true,
            role: true
          }
        });

      if (!target) {
        return res.status(404).json({
          error:
            "Target user not found"
        });
      }

      const permission =
        await prisma.permission.findUnique({
          where: {
            id:
              Number(permissionId)
          }
        });

      if (!permission) {
        return res.status(404).json({
          error:
            "Permission not found"
        });
      }

      /* OWNER CAN DO EVERYTHING */

      if (
        req.user.accountType !==
        "OWNER"
      ) {

        /* MANAGER/SUPERVISOR
           CAN ONLY DELEGATE TO
           THEIR OWN SUBORDINATES */

        const isSubordinate =
          target.managerId ===
          req.user.id;

        if (!isSubordinate) {
          return res.status(403).json({
            error:
              "You can only manage permissions of your direct subordinates"
          });
        }

        /* ACTOR MUST ALREADY HAVE
           THE SAME PERMISSION */

        const actorHas =
          await userHasPermission(
            req.user.id,
            permission.key
          );

        if (!actorHas) {
          return res.status(403).json({
            error:
              "You cannot grant a permission you do not have"
          });
        }

        /* SAME DEPARTMENT */

        if (
          target.departmentId !==
          req.user.departmentId
        ) {
          return res.status(403).json({
            error:
              "Cross-department permission delegation is not allowed"
          });
