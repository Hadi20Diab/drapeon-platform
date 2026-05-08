-- Expand designer workspace data for products, branding, messaging, and notifications.
ALTER TYPE "RentalOrderStatus" ADD VALUE IF NOT EXISTS 'DELIVERED';
ALTER TYPE "RentalOrderStatus" ADD VALUE IF NOT EXISTS 'RETURNED';

CREATE TYPE "ConversationStatus" AS ENUM ('OPEN', 'ARCHIVED');
CREATE TYPE "MessageSenderRole" AS ENUM ('USER', 'DESIGNER');
CREATE TYPE "DesignerNotificationType" AS ENUM (
  'ORDER_CREATED',
  'ORDER_CANCELLED',
  'PAYMENT_RECEIVED',
  'APPOINTMENT_REQUEST',
  'APPOINTMENT_CANCELLED',
  'MESSAGE_RECEIVED'
);

ALTER TABLE "Designer"
  ADD COLUMN "brandColor" TEXT,
  ADD COLUMN "websiteUrl" TEXT,
  ADD COLUMN "instagramUrl" TEXT,
  ADD COLUMN "tiktokUrl" TEXT;

ALTER TABLE "Product"
  ADD COLUMN "buyPrice" DECIMAL(10, 2),
  ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];

CREATE TABLE "DesignerConversation" (
  "id" TEXT NOT NULL,
  "designerId" TEXT NOT NULL,
  "customerId" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "status" "ConversationStatus" NOT NULL DEFAULT 'OPEN',
  "unreadForDesigner" INTEGER NOT NULL DEFAULT 0,
  "unreadForCustomer" INTEGER NOT NULL DEFAULT 0,
  "lastMessageAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "DesignerConversation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DesignerMessage" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "senderId" TEXT NOT NULL,
  "senderRole" "MessageSenderRole" NOT NULL,
  "body" TEXT NOT NULL,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignerMessage_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "DesignerNotification" (
  "id" TEXT NOT NULL,
  "designerId" TEXT NOT NULL,
  "type" "DesignerNotificationType" NOT NULL,
  "title" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "targetUrl" TEXT,
  "readAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "DesignerNotification_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DesignerConversation_designerId_customerId_subject_key"
  ON "DesignerConversation"("designerId", "customerId", "subject");
CREATE INDEX "DesignerConversation_designerId_lastMessageAt_idx"
  ON "DesignerConversation"("designerId", "lastMessageAt");
CREATE INDEX "DesignerConversation_customerId_lastMessageAt_idx"
  ON "DesignerConversation"("customerId", "lastMessageAt");
CREATE INDEX "DesignerMessage_conversationId_createdAt_idx"
  ON "DesignerMessage"("conversationId", "createdAt");
CREATE INDEX "DesignerNotification_designerId_readAt_createdAt_idx"
  ON "DesignerNotification"("designerId", "readAt", "createdAt");

ALTER TABLE "DesignerConversation"
  ADD CONSTRAINT "DesignerConversation_designerId_fkey"
  FOREIGN KEY ("designerId") REFERENCES "Designer"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesignerConversation"
  ADD CONSTRAINT "DesignerConversation_customerId_fkey"
  FOREIGN KEY ("customerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesignerMessage"
  ADD CONSTRAINT "DesignerMessage_conversationId_fkey"
  FOREIGN KEY ("conversationId") REFERENCES "DesignerConversation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesignerMessage"
  ADD CONSTRAINT "DesignerMessage_senderId_fkey"
  FOREIGN KEY ("senderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "DesignerNotification"
  ADD CONSTRAINT "DesignerNotification_designerId_fkey"
  FOREIGN KEY ("designerId") REFERENCES "Designer"("id") ON DELETE CASCADE ON UPDATE CASCADE;