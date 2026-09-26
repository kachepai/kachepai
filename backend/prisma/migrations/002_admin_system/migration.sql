/* ======================================================
   KACHEPAI ADMIN / STAFF SYSTEM
   Migration: 002_admin_system
====================================================== */


/* ======================================================
   1. ADD NEW USER FIELDS
====================================================== */

ALTER TABLE "User"
ADD COLUMN "accountType" TEXT NOT NULL DEFAULT 'CUSTOMER';

ALTER TABLE "User"
ADD COLUMN "departmentId" INTEGER;

ALTER TABLE "User"
ADD COLUMN "roleId" INTEGER;

ALTER TABLE "User"
ADD COLUMN "managerId" INTEGER;

ALTER TABLE "User"
ADD COLUMN "passwordResetTokenHash" TEXT;

ALTER TABLE "User"
ADD COLUMN "passwordResetExpiresAt" TIMESTAMP(3);


/* ======================================================
   2. DEPARTMENT
====================================================== */

CREATE TABLE "Department" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Department_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Department_name_key"
ON "Department"("name");


/* ======================================================
   3. ROLE
====================================================== */

CREATE TABLE "Role" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "level" INTEGER NOT NULL DEFAULT 3,
    "departmentId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Role_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Role_name_departmentId_key"
ON "Role"("name", "departmentId");


/* ======================================================
   4. PERMISSION
====================================================== */

CREATE TABLE "Permission" (
    "id" SERIAL NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "module" TEXT,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Permission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Permission_key_key"
ON "Permission"("key");


/* ======================================================
   5. ROLE DEFAULT PERMISSION
====================================================== */

CREATE TABLE "RolePermission" (
    "id" SERIAL NOT NULL,
    "roleId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RolePermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RolePermission_roleId_permissionId_key"
ON "RolePermission"("roleId", "permissionId");


/* ======================================================
   6. USER CUSTOM PERMISSION
====================================================== */

CREATE TABLE "UserPermission" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "permissionId" INTEGER NOT NULL,
    "allowed" BOOLEAN NOT NULL DEFAULT true,
    "grantedById" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserPermission_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "UserPermission_userId_permissionId_key"
ON "UserPermission"("userId", "permissionId");


/* ======================================================
   7. AUDIT LOG
====================================================== */

CREATE TABLE "AuditLog" (
    "id" SERIAL NOT NULL,
    "actorId" INTEGER,
    "targetUserId" INTEGER,
    "action" TEXT NOT NULL,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);


/* ======================================================
   8. PASSWORD RESET UNIQUE INDEX
====================================================== */

CREATE UNIQUE INDEX "User_passwordResetTokenHash_key"
ON "User"("passwordResetTokenHash");


/* ======================================================
   9. FOREIGN KEYS
====================================================== */

ALTER TABLE "User"
ADD CONSTRAINT "User_departmentId_fkey"
FOREIGN KEY ("departmentId")
REFERENCES "Department"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "User"
ADD CONSTRAINT "User_roleId_fkey"
FOREIGN KEY ("roleId")
REFERENCES "Role"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "User"
ADD CONSTRAINT "User_managerId_fkey"
FOREIGN KEY ("managerId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;


/* ======================================================
   10. ROLE → DEPARTMENT
====================================================== */

ALTER TABLE "Role"
ADD CONSTRAINT "Role_departmentId_fkey"
FOREIGN KEY ("departmentId")
REFERENCES "Department"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;


/* ======================================================
   11. ROLE → PERMISSION
====================================================== */

ALTER TABLE "RolePermission"
ADD CONSTRAINT "RolePermission_roleId_fkey"
FOREIGN KEY ("roleId")
REFERENCES "Role"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "RolePermission"
ADD CONSTRAINT "RolePermission_permissionId_fkey"
FOREIGN KEY ("permissionId")
REFERENCES "Permission"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;


/* ======================================================
   12. USER → CUSTOM PERMISSION
====================================================== */

ALTER TABLE "UserPermission"
ADD CONSTRAINT "UserPermission_userId_fkey"
FOREIGN KEY ("userId")
REFERENCES "User"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "UserPermission"
ADD CONSTRAINT "UserPermission_permissionId_fkey"
FOREIGN KEY ("permissionId")
REFERENCES "Permission"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

ALTER TABLE "UserPermission"
ADD CONSTRAINT "UserPermission_grantedById_fkey"
FOREIGN KEY ("grantedById")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;


/* ======================================================
   13. AUDIT LOG → USERS
====================================================== */

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_actorId_fkey"
FOREIGN KEY ("actorId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

ALTER TABLE "AuditLog"
ADD CONSTRAINT "AuditLog_targetUserId_fkey"
FOREIGN KEY ("targetUserId")
REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;
