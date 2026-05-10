import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { PrismaClient, ProductCategory } from "@prisma/client";

const suitProductImages = [
  "https://images.unsplash.com/photo-1593032465175-481ac7f401a0?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1520975682031-ae78c7f4ed1d?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1555069519-127aadedf1ee?auto=format&fit=crop&w=1200&q=85"
];

const dressProductImages = [
  "https://images.pexels.com/photos/19895958/pexels-photo-19895958.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
  "https://images.pexels.com/photos/19895956/pexels-photo-19895956.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
  "https://images.pexels.com/photos/19895964/pexels-photo-19895964.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
  "https://images.pexels.com/photos/11813835/pexels-photo-11813835.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
  "https://images.pexels.com/photos/5386592/pexels-photo-5386592.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
  "https://images.pexels.com/photos/18367998/pexels-photo-18367998.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
  "https://images.pexels.com/photos/10330191/pexels-photo-10330191.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
  "https://images.pexels.com/photos/11203484/pexels-photo-11203484.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
  "https://images.pexels.com/photos/20428094/pexels-photo-20428094.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
  "https://images.pexels.com/photos/6609940/pexels-photo-6609940.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
  "https://images.pexels.com/photos/19733576/pexels-photo-19733576.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
  "https://images.pexels.com/photos/17734329/pexels-photo-17734329.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop"
];

function loadEnvFile(): void {
  const envPath = resolve(__dirname, "../.env");
  const raw = readFileSync(envPath, "utf8");

  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("#")) {
      continue;
    }

    const separatorIndex = trimmed.indexOf("=");

    if (separatorIndex < 0) {
      continue;
    }

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();

    if (!process.env[key]) {
      process.env[key] = value;
    }
  }

  if (process.env.DATABASE_URL) {
    const pooledUrl = new URL(process.env.DATABASE_URL);
    pooledUrl.searchParams.set("connection_limit", "1");
    pooledUrl.searchParams.set("pool_timeout", "60");
    process.env.DATABASE_URL = pooledUrl.toString();
  }
}

function buildProductImage(
  productCounter: number,
  category: ProductCategory,
  variant: "hero" | "detail"
): string {
  const pool = category === ProductCategory.SUIT ? suitProductImages : dressProductImages;
  const baseIndex = productCounter % pool.length;
  const variantOffset = variant === "hero" ? 0 : 3;

  return pool[(baseIndex + variantOffset) % pool.length]!;
}

async function main(): Promise<void> {
  loadEnvFile();
  const prisma = new PrismaClient();

  const products = await prisma.product.findMany({
    orderBy: { createdAt: "asc" },
    include: {
      images: {
        orderBy: { sortOrder: "asc" }
      }
    }
  });

  let updated = 0;

  for (const [index, product] of products.entries()) {
    const targetUrls = [
      buildProductImage(index, product.category, "hero"),
      buildProductImage(index, product.category, "detail")
    ];

    for (const [imageIndex, image] of product.images.entries()) {
      const targetUrl = targetUrls[imageIndex] ?? targetUrls[targetUrls.length - 1]!;

      await prisma.productImage.update({
        where: { id: image.id },
        data: {
          url: targetUrl
        }
      });
      updated += 1;
    }
  }

  console.log(`Updated ${updated} product images across ${products.length} products.`);

  await prisma.$disconnect();
}

void main()
  .catch((error) => {
    console.error("Failed to sync product photos:", error);
    process.exitCode = 1;
  });
