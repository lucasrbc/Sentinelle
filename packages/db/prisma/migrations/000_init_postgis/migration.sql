-- Sentinelle — migration initiale (baseline).
-- Crée l'extension PostGIS, les types enum, les tables, les clés étrangères,
-- la colonne géométrie geometry(Point, 4326) et l'index spatial GIST.

-- Extension PostGIS (requise avant toute colonne `geometry`).
CREATE EXTENSION IF NOT EXISTS "postgis";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('DONOR', 'PROJECT_OWNER', 'ADMIN');
CREATE TYPE "OrganizationType" AS ENUM ('COMMUNE', 'ASSOCIATION');
CREATE TYPE "HeritageType" AS ENUM ('CHURCH', 'CHAPEL', 'CALVARY', 'PARISH_CLOSE', 'OSSUARY', 'ABBEY', 'MANOR', 'WASHHOUSE', 'OTHER');
CREATE TYPE "ProtectionStatus" AS ENUM ('NONE', 'INSCRIT', 'CLASSE');
CREATE TYPE "ConservationState" AS ENUM ('GOOD', 'FAIR', 'POOR', 'CRITICAL');
CREATE TYPE "UrgencyLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');
CREATE TYPE "ProjectStatus" AS ENUM ('DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'ARCHIVED');
CREATE TYPE "DonationType" AS ENUM ('ONE_TIME', 'MONTHLY');
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'SUCCEEDED', 'FAILED', 'REFUNDED');

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "OrganizationType" NOT NULL,
    "siret" TEXT,
    "contactEmail" TEXT,
    "description" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "role" "UserRole" NOT NULL DEFAULT 'DONOR',
    "authProviderId" TEXT,
    "organizationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HeritageSite" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "HeritageType" NOT NULL,
    "description" TEXT,
    "commune" TEXT,
    "department" TEXT,
    "protectionStatus" "ProtectionStatus" NOT NULL DEFAULT 'NONE',
    "conservationState" "ConservationState",
    "photos" TEXT[],
    "osmId" TEXT,
    "location" geometry(Point, 4326),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "HeritageSite_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'DRAFT',
    "urgencyLevel" "UrgencyLevel",
    "targetAmount" INTEGER NOT NULL,
    "collectedAmount" INTEGER NOT NULL DEFAULT 0,
    "quoteUrl" TEXT,
    "heritageSiteId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "publishedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ProjectUpdate" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "imageUrls" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ProjectUpdate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Donation" (
    "id" TEXT NOT NULL,
    "amount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'eur',
    "type" "DonationType" NOT NULL,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "stripePaymentIntentId" TEXT,
    "stripeSubscriptionId" TEXT,
    "projectId" TEXT NOT NULL,
    "donorId" TEXT,
    "donorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Donation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FiscalReceipt" (
    "id" TEXT NOT NULL,
    "donationId" TEXT NOT NULL,
    "receiptNumber" TEXT NOT NULL,
    "pdfUrl" TEXT,
    "amount" INTEGER NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FiscalReceipt_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "User_authProviderId_key" ON "User"("authProviderId");
CREATE INDEX "User_organizationId_idx" ON "User"("organizationId");

CREATE UNIQUE INDEX "Organization_siret_key" ON "Organization"("siret");

CREATE UNIQUE INDEX "HeritageSite_slug_key" ON "HeritageSite"("slug");
CREATE UNIQUE INDEX "HeritageSite_osmId_key" ON "HeritageSite"("osmId");
-- Index spatial GIST (requêtes « autour de moi » / bbox via PostGIS).
CREATE INDEX "HeritageSite_location_idx" ON "HeritageSite" USING GIST ("location");

CREATE UNIQUE INDEX "Project_slug_key" ON "Project"("slug");
CREATE INDEX "Project_status_idx" ON "Project"("status");
CREATE INDEX "Project_heritageSiteId_idx" ON "Project"("heritageSiteId");
CREATE INDEX "Project_organizationId_idx" ON "Project"("organizationId");

CREATE INDEX "ProjectUpdate_projectId_idx" ON "ProjectUpdate"("projectId");

CREATE UNIQUE INDEX "Donation_stripePaymentIntentId_key" ON "Donation"("stripePaymentIntentId");
CREATE INDEX "Donation_projectId_status_idx" ON "Donation"("projectId", "status");
CREATE INDEX "Donation_donorId_idx" ON "Donation"("donorId");

CREATE UNIQUE INDEX "FiscalReceipt_donationId_key" ON "FiscalReceipt"("donationId");
CREATE UNIQUE INDEX "FiscalReceipt_receiptNumber_key" ON "FiscalReceipt"("receiptNumber");

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Project" ADD CONSTRAINT "Project_heritageSiteId_fkey" FOREIGN KEY ("heritageSiteId") REFERENCES "HeritageSite"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "ProjectUpdate" ADD CONSTRAINT "ProjectUpdate_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "Donation" ADD CONSTRAINT "Donation_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Donation" ADD CONSTRAINT "Donation_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "FiscalReceipt" ADD CONSTRAINT "FiscalReceipt_donationId_fkey" FOREIGN KEY ("donationId") REFERENCES "Donation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
