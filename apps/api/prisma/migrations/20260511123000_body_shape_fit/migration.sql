CREATE TYPE "BodyShape" AS ENUM (
  'HOURGLASS',
  'PEAR',
  'APPLE',
  'RECTANGLE',
  'INVERTED_TRIANGLE',
  'ATHLETIC'
);

ALTER TABLE "BodyMeasurement"
ADD COLUMN "bodyShape" "BodyShape";

ALTER TABLE "Product"
ADD COLUMN "bodyShapes" "BodyShape"[] NOT NULL DEFAULT ARRAY[]::"BodyShape"[];
