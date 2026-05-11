import { randomBytes, randomUUID, scryptSync } from "node:crypto";

import {
  AiMessageRole,
  AiSessionChannel,
  AvailabilityStatus,
  BodyShape,
  BookingStatus,
  BookingType,
  DesignerApprovalStatus,
  DesignerSubscriptionStatus,
  PrismaClient,
  ProductCategory,
  ProductStatus,
  SubscriptionInterval,
  UserRole
} from "@prisma/client";

const prisma = new PrismaClient();
const SEEDED_STRIPE_ACCOUNT_ID = "acct_1TUj5ZLhJyHSphBA";

const firstNames = [
  "Lina",
  "Nour",
  "Adam",
  "Maya",
  "Omar",
  "Salma",
  "Karim",
  "Aya",
  "Rami",
  "Lea",
  "Jad",
  "Mira",
  "Sam",
  "Yara",
  "Tala",
  "Fadi",
  "Dana",
  "Malik",
  "Sara",
  "Ziad"
];

const lastNames = [
  "Haddad",
  "Saad",
  "Karam",
  "Nassar",
  "Farah",
  "Khoury",
  "Mansour",
  "Azar",
  "Saba",
  "Rizk",
  "Daou",
  "Mikhael",
  "Bazzi",
  "Tannous",
  "Nehme"
];

const cities = [
  "Beirut",
  "Dubai",
  "Paris",
  "Milan",
  "London",
  "New York",
  "Doha",
  "Riyadh",
  "Amman",
  "Istanbul"
];

const palette = [
  "Black",
  "Midnight Blue",
  "Ivory",
  "Emerald",
  "Burgundy",
  "Champagne",
  "Sand",
  "Slate Grey"
];

const styleTags = [
  "classic",
  "minimal",
  "bold",
  "modern",
  "vintage",
  "dramatic",
  "tailored"
];

const bodyShapes = [
  BodyShape.HOURGLASS,
  BodyShape.PEAR,
  BodyShape.APPLE,
  BodyShape.RECTANGLE,
  BodyShape.INVERTED_TRIANGLE,
  BodyShape.ATHLETIC
] as const;

const suitTitles = [
  "Double-Breasted Signature Suit",
  "Peak Lapel Evening Tuxedo",
  "Textured Ceremony Suit",
  "Slim Midnight Formal Suit",
  "Heritage Wool Tuxedo"
];

const dressTitles = [
  "Satin Column Evening Dress",
  "Embellished Couture Gown",
  "Structured Cocktail Dress",
  "Off-Shoulder Silk Gown",
  "Pleated Statement Dress"
];

const suitProductImages = [
  "https://images.unsplash.com/photo-1593032465175-481ac7f401a0?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1200&q=85",
  "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
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

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickOne<T>(values: readonly T[]): T {
  return values[randomInt(0, values.length - 1)] as T;
}

function pickMany<T>(values: readonly T[], count: number): T[] {
  const result = new Set<T>();

  while (result.size < count) {
    result.add(pickOne(values));
  }

  return [...result];
}

function chance(probability: number): boolean {
  return Math.random() < probability;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function randomPhone(): string {
  return `+9617${randomInt(1000000, 9999999)}`;
}

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const digest = scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${digest}`;
}

function buildProductImage(input: {
  productCounter: number;
  category: ProductCategory;
  variant: "hero" | "detail";
}): string {
  const pool = input.category === ProductCategory.SUIT ? suitProductImages : dressProductImages;
  const baseIndex = input.productCounter % pool.length;
  const variantOffset = input.variant === "hero" ? 0 : 3;

  return pool[(baseIndex + variantOffset) % pool.length]!;
}

async function main(): Promise<void> {
  console.log("Clearing existing data...");

  await prisma.deliveryTrackingEvent.deleteMany();
  await prisma.deliveryRequest.deleteMany();
  await prisma.rentalOrderItem.deleteMany();
  await prisma.rentalOrder.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.productAvailability.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.productImage.deleteMany();
  await prisma.product.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.emailVerificationToken.deleteMany();
  await prisma.passwordResetToken.deleteMany();
  await prisma.aiMessage.deleteMany();
  await prisma.aiSession.deleteMany();
  await prisma.companyKnowledgeEntry.deleteMany();
  await prisma.designerSubscription.deleteMany();
  await prisma.subscriptionPlan.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.designerMessage.deleteMany();
  await prisma.designerConversation.deleteMany();
  await prisma.designerNotification.deleteMany();
  await prisma.bodyMeasurement.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.designer.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = hashPassword("pass1234");

  console.log("Creating admins...");

  const adminUsers: { id: string; email: string }[] = [];

  for (let i = 1; i <= 3; i += 1) {
    const firstName = pickOne(firstNames);
    const lastName = pickOne(lastNames);
    const email = `admin${i}@drapeon.local`;

    const admin = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.ADMIN,
        isEmailVerified: true,
        profile: {
          create: {
            firstName,
            lastName,
            phoneNumber: randomPhone(),
            preferences: {
              receivesReports: true
            }
          }
        }
      }
    });

    adminUsers.push({
      id: admin.id,
      email
    });
  }

  console.log("Creating company knowledge...");

  await prisma.companyKnowledgeEntry.createMany({
    data: [
      {
        slug: "what-is-drapeon",
        question: "What is Drapeon?",
        answer:
          "Drapeon is a multi-vendor formalwear platform for premium suits and dresses, combining designer storefronts, fitting appointments, plan-based designer subscriptions, and AI-guided styling.",
        category: "company",
        tags: ["about", "platform", "overview"],
        isPublished: true
      },
      {
        slug: "how-fittings-work",
        question: "How does the client journey work on Drapeon?",
        answer:
          "Customers browse verified designer inventory, save favorite looks, and request fittings directly from product pages. Designers review those requests, confirm appointments, and manage their publishing workflow from the dashboard.",
        category: "rentals",
        tags: ["fittings", "catalog", "process"],
        isPublished: true
      },
      {
        slug: "designer-approval",
        question: "How does designer approval work?",
        answer:
          "Designers can apply through the platform, choose a subscription plan, and then wait for admin review. Admins verify store quality, product standards, and platform compliance before approving public marketplace access.",
        category: "designers",
        tags: ["designer", "approval", "onboarding"],
        isPublished: true
      },
      {
        slug: "designer-subscriptions",
        question: "How do designer subscriptions work?",
        answer:
          "Designers subscribe through Stripe Billing. Each plan unlocks a monthly product publishing allowance, and designers can manage billing or upgrade plans from their dashboard billing center.",
        category: "payments",
        tags: ["stripe", "subscriptions", "plans"],
        isPublished: true
      },
      {
        slug: "fitting-appointments",
        question: "Can customers book fitting appointments before renting?",
        answer:
          "Yes. Customers can request fitting appointments from product detail pages. Designers can confirm, reject, and manage time slots in their appointments calendar to prevent double booking.",
        category: "appointments",
        tags: ["fitting", "appointments", "calendar"],
        isPublished: true
      },
      {
        slug: "designer-plan-limits",
        question: "Do designer plans limit how many products can be published?",
        answer:
          "Yes. Every designer subscription plan includes a product posting allowance for each billing cycle. When the limit is reached, the designer can upgrade or wait for the next cycle to publish more pieces.",
        category: "subscriptions",
        tags: ["subscriptions", "plans", "limits"],
        isPublished: true
      },
      {
        slug: "ai-stylist-data",
        question: "How does the AI stylist choose recommendations?",
        answer:
          "The AI stylist uses the customer profile, body measurements, saved body shape, style preferences, and live product inventory from the database to recommend real catalog pieces instead of invented products.",
        category: "ai",
        tags: ["ai", "stylist", "measurements"],
        isPublished: true
      },
      {
        slug: "returns-and-care",
        question: "What happens after the rental period ends?",
        answer:
          "After the rental period, the item is returned to the designer through the agreed fulfillment flow. Designers track the order state, confirm returns, and restore inventory availability for future bookings.",
        category: "returns",
        tags: ["returns", "inventory", "post-rental"],
        isPublished: true
      }
    ]
  });

  console.log("Creating subscription plans...");

  await prisma.subscriptionPlan.createMany({
    data: [
      {
        slug: "atelier-starter",
        name: "Atelier Starter",
        description: "Launch a focused studio presence with a curated monthly product cap.",
        stripePriceId: "price_seed_atelier_starter_monthly",
        stripeProductId: "prod_seed_atelier_starter",
        currency: "USD",
        interval: SubscriptionInterval.MONTH,
        amount: 79,
        productLimit: 10,
        featured: false,
        isActive: true,
        sortOrder: 1,
        features: [
          "10 product posts each month",
          "Fitting appointment management",
          "Designer messaging inbox"
        ]
      },
      {
        slug: "atelier-growth",
        name: "Atelier Growth",
        description: "Expand catalog reach and manage a larger fitting calendar.",
        stripePriceId: "price_seed_atelier_growth_monthly",
        stripeProductId: "prod_seed_atelier_growth",
        currency: "USD",
        interval: SubscriptionInterval.MONTH,
        amount: 149,
        productLimit: 30,
        featured: true,
        isActive: true,
        sortOrder: 2,
        features: [
          "30 product posts each month",
          "Priority AI catalog visibility",
          "Advanced storefront analytics"
        ]
      },
      {
        slug: "atelier-house",
        name: "Atelier House",
        description: "High-capacity publishing for established designer houses.",
        stripePriceId: "price_seed_atelier_house_monthly",
        stripeProductId: "prod_seed_atelier_house",
        currency: "USD",
        interval: SubscriptionInterval.MONTH,
        amount: 299,
        productLimit: 80,
        featured: false,
        isActive: true,
        sortOrder: 3,
        features: [
          "80 product posts each month",
          "High-volume fitting operations",
          "Priority support"
        ]
      }
    ]
  });

  const subscriptionPlans = await prisma.subscriptionPlan.findMany({
    where: { isActive: true },
    orderBy: { sortOrder: "asc" }
  });

  console.log("Creating designers...");

  const designers: {
    userId: string;
    designerId: string;
    storeName: string;
    slug: string;
  }[] = [];

  for (let i = 1; i <= 14; i += 1) {
    const firstName = pickOne(firstNames);
    const lastName = pickOne(lastNames);
    const baseSlug = slugify(`${firstName}-${lastName}-atelier-${i}`);
    const storeName = `${firstName} ${lastName} Atelier`;
    const email = `designer${i}@drapeon.local`;
    const approvedBy = pickOne(adminUsers);
    const approved = i === 1 ? true : chance(0.85);

    const designerUser = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.DESIGNER,
        isEmailVerified: true,
        profile: {
          create: {
            firstName,
            lastName,
            phoneNumber: randomPhone(),
            preferences: {
              style: pickMany(styleTags, 2)
            }
          }
        },
        designerProfile: {
          create: {
            storeName,
            slug: baseSlug,
            bio: `${storeName} creates premium rental-ready formalwear with made-to-measure finishing.`,
            location: pickOne(cities),
            approvalStatus: approved
              ? DesignerApprovalStatus.APPROVED
              : DesignerApprovalStatus.PENDING,
            approvedById: approved ? approvedBy.id : null,
            approvedAt: approved ? new Date() : null,
            stripeAccountId: i === 1 ? SEEDED_STRIPE_ACCOUNT_ID : null,
            stripeAccountCreatedAt: i === 1 ? new Date() : null,
            stripeOnboardingComplete: i === 1,
            stripeChargesEnabled: i === 1,
            stripePayoutsEnabled: i === 1,
            stripeDetailsSubmitted: i === 1
          }
        }
      },
      include: {
        designerProfile: true
      }
    });

    designers.push({
      userId: designerUser.id,
      designerId: designerUser.designerProfile!.id,
      storeName,
      slug: baseSlug
    });

    const seededPlan = approved ? pickOne(subscriptionPlans) : null;
    const subscriptionStatus = !approved
      ? DesignerSubscriptionStatus.INACTIVE
      : i % 7 === 0
        ? DesignerSubscriptionStatus.PAST_DUE
        : i % 5 === 0
          ? DesignerSubscriptionStatus.TRIALING
          : DesignerSubscriptionStatus.ACTIVE;
    const usagePeriodStart = new Date();
    usagePeriodStart.setUTCDate(Math.max(1, randomInt(1, 8)));
    usagePeriodStart.setUTCHours(0, 0, 0, 0);
    const usagePeriodEnd = new Date(usagePeriodStart);
    usagePeriodEnd.setUTCMonth(usagePeriodEnd.getUTCMonth() + 1);
    const subscribedAt = approved
      ? new Date(Date.now() - randomInt(5, 150) * 24 * 60 * 60 * 1000)
      : null;
    const productLimit = seededPlan?.productLimit ?? 0;
    const productsPublishedThisPeriod =
      seededPlan && subscriptionStatus !== DesignerSubscriptionStatus.INACTIVE
        ? Math.min(productLimit, randomInt(1, Math.max(1, Math.min(productLimit, 7))))
        : 0;

    await prisma.designerSubscription.create({
      data: {
        designerId: designerUser.designerProfile!.id,
        planId: seededPlan?.id,
        status: subscriptionStatus,
        stripeCustomerId: approved ? `cus_seed_designer_${i}` : null,
        stripeSubscriptionId:
          subscriptionStatus === DesignerSubscriptionStatus.ACTIVE ||
          subscriptionStatus === DesignerSubscriptionStatus.TRIALING ||
          subscriptionStatus === DesignerSubscriptionStatus.PAST_DUE
            ? `sub_seed_designer_${i}`
            : null,
        productLimitSnapshot: productLimit || null,
        productsPublishedThisPeriod,
        usagePeriodStart: seededPlan ? usagePeriodStart : null,
        usagePeriodEnd: seededPlan ? usagePeriodEnd : null,
        currentPeriodStart: seededPlan ? usagePeriodStart : null,
        currentPeriodEnd: seededPlan ? usagePeriodEnd : null,
        cancelAtPeriodEnd: approved ? chance(0.12) : false,
        subscribedAt,
        lastCheckoutAt: approved ? new Date(subscribedAt ?? new Date()) : null,
        lastSyncedAt: approved ? new Date() : null
      }
    });
  }

  console.log("Creating customer users...");

  const customers: { userId: string; profileId: string }[] = [];

  for (let i = 1; i <= 120; i += 1) {
    const firstName = pickOne(firstNames);
    const lastName = pickOne(lastNames);
    const email = `user${i}@drapeon.local`;
    const withMeasurements = chance(0.78);

    const user = await prisma.user.create({
      data: {
        email,
        passwordHash,
        role: UserRole.USER,
        isEmailVerified: chance(0.92),
        profile: {
          create: {
            firstName,
            lastName,
            phoneNumber: randomPhone(),
            avatarUrl: chance(0.45)
              ? `https://api.dicebear.com/9.x/personas/svg?seed=${email}`
              : null,
            preferences: {
              preferredColors: pickMany(palette, 2),
              style: pickMany(styleTags, 2),
              budgetRange: {
                min: randomInt(80, 150),
                max: randomInt(220, 450)
              }
            },
            measurements: withMeasurements
              ? {
                  create: {
                    bodyShape: pickOne(bodyShapes),
                    heightCm: randomInt(155, 195),
                    weightKg: randomInt(52, 92),
                    chestCm: randomInt(80, 120),
                    waistCm: randomInt(60, 105),
                    hipCm: randomInt(82, 122),
                    shoulderCm: randomInt(38, 54),
                    inseamCm: randomInt(68, 94),
                    notes: chance(0.2) ? "Prefers tailored fit near waist." : null
                  }
                }
              : undefined
          }
        }
      },
      include: {
        profile: true
      }
    });

    customers.push({
      userId: user.id,
      profileId: user.profile!.id
    });
  }

  console.log("Creating products, variants, and images...");

  const seededProducts: {
    id: string;
    designerId: string;
    category: ProductCategory;
    variantIds: string[];
  }[] = [];

  const sizeOptionsByCategory: Record<ProductCategory, string[]> = {
    SUIT: ["46", "48", "50", "52", "54"],
    DRESS: ["XS", "S", "M", "L", "XL"]
  };

  let productCounter = 0;

  for (const designer of designers) {
    for (let i = 0; i < 12; i += 1) {
      productCounter += 1;
      const category = chance(0.52) ? ProductCategory.SUIT : ProductCategory.DRESS;
      const titleBase = pickOne(category === ProductCategory.SUIT ? suitTitles : dressTitles);
      const title = `${titleBase} ${productCounter}`;
      const slug = `${designer.slug}-${slugify(title)}-${productCounter}`;
      const colors = pickMany(palette, 2);
      const sizes = pickMany(sizeOptionsByCategory[category], 3);
      const variants = sizes.flatMap((sizeLabel) =>
        colors.map((color) => ({
          sizeLabel,
          color,
          stockTotal: randomInt(2, 8),
          stockReserved: randomInt(0, 2),
          sku: `DRP-${productCounter}-${slugify(sizeLabel)}-${slugify(color)}-${randomUUID().slice(0, 6).toUpperCase()}`,
          isActive: true
        }))
      );

      const product = await prisma.product.create({
        data: {
          designerId: designer.designerId,
          category,
          title,
          slug,
          description: `${title} is crafted for high-end events and built for rental durability with premium finishing details.`,
          rentalPrice: randomInt(95, 420),
          securityDeposit: randomInt(80, 300),
          currency: "USD",
          bodyShapes: pickMany(bodyShapes, randomInt(2, 3)),
          status: ProductStatus.ACTIVE,
          isDeliveryAvailable: chance(0.84),
          images: {
            create: [
              {
                url: buildProductImage({
                  productCounter,
                  category,
                  variant: "hero"
                }),
                altText: `${title} front`,
                sortOrder: 0
              },
              {
                url: buildProductImage({
                  productCounter,
                  category,
                  variant: "detail"
                }),
                altText: `${title} detail`,
                sortOrder: 1
              }
            ]
          },
          variants: {
            create: variants
          }
        },
        include: {
          variants: true
        }
      });

      seededProducts.push({
        id: product.id,
        designerId: designer.designerId,
        category,
        variantIds: product.variants.map((variant) => variant.id)
      });
    }
  }

  console.log("Creating product availability calendar...");

  const availabilityRows: {
    variantId: string;
    date: Date;
    status: AvailabilityStatus;
    availableUnits: number;
    reservedUnits: number;
  }[] = [];

  for (const product of seededProducts) {
    for (const variantId of product.variantIds) {
      for (let dayOffset = 0; dayOffset < 14; dayOffset += 1) {
        const date = new Date();
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + dayOffset);

        const reservedUnits = randomInt(0, 2);
        const availableUnits = randomInt(1, 6);
        const status =
          availableUnits - reservedUnits <= 0
            ? AvailabilityStatus.RESERVED
            : chance(0.08)
              ? AvailabilityStatus.UNAVAILABLE
              : AvailabilityStatus.AVAILABLE;

        availabilityRows.push({
          variantId,
          date,
          status,
          availableUnits,
          reservedUnits
        });
      }
    }
  }

  const chunkSize = 800;
  for (let i = 0; i < availabilityRows.length; i += chunkSize) {
    await prisma.productAvailability.createMany({
      data: availabilityRows.slice(i, i + chunkSize)
    });
  }

  console.log("Creating bookings...");

  const bookings: {
    id: string;
    userId: string;
    designerId: string;
    productId: string;
  }[] = [];

  for (let i = 0; i < 220; i += 1) {
    const customer = pickOne(customers);
    const product = pickOne(seededProducts);
    const startsAt = new Date();
    startsAt.setDate(startsAt.getDate() + randomInt(1, 35));
    startsAt.setHours(randomInt(10, 19), 0, 0, 0);

    const endsAt = new Date(startsAt);
    endsAt.setHours(startsAt.getHours() + 1);

    const statusPool = [
      BookingStatus.PENDING,
      BookingStatus.CONFIRMED,
      BookingStatus.COMPLETED,
      BookingStatus.CANCELLED
    ];
    const status = pickOne(statusPool);

    const booking = await prisma.booking.create({
      data: {
        userId: customer.userId,
        designerId: product.designerId,
        productId: product.id,
        variantId: pickOne(product.variantIds),
        type: chance(0.3) ? BookingType.RENTAL : BookingType.FITTING,
        status,
        startsAt,
        endsAt,
        notes: chance(0.25) ? "Needs minor shoulder adjustment." : null,
        approvedAt: status === BookingStatus.CONFIRMED ? new Date() : null
      }
    });

    bookings.push({
      id: booking.id,
      userId: booking.userId,
      designerId: booking.designerId,
      productId: booking.productId
    });
  }

  console.log("Creating AI sessions and messages...");

  for (let i = 0; i < 85; i += 1) {
    const user = chance(0.9) ? pickOne(customers) : null;
    const session = await prisma.aiSession.create({
      data: {
        userId: user?.userId ?? null,
        channel: chance(0.55) ? AiSessionChannel.REST : AiSessionChannel.WS,
        contextSnapshot: user
          ? {
              userProfileLinked: true,
              source: "seed"
            }
          : {
              userProfileLinked: false
            }
      }
    });

    await prisma.aiMessage.createMany({
      data: [
        {
          sessionId: session.id,
          role: AiMessageRole.USER,
          content: "Need a formal look for a gala this weekend."
        },
        {
          sessionId: session.id,
          role: AiMessageRole.TOOL,
          content: "Tool execution: searchProducts",
          toolName: "searchProducts",
          toolInput: {
            category: chance(0.5) ? "SUIT" : "DRESS",
            limit: 6
          },
          toolOutput: {
            count: randomInt(3, 6)
          }
        },
        {
          sessionId: session.id,
          role: AiMessageRole.AGENT,
          content:
            "I found several options that align with your body profile and event style."
        }
      ]
    });
  }

  console.log("Creating refresh tokens and audit logs...");

  for (let i = 0; i < 40; i += 1) {
    const user = pickOne(customers);
    await prisma.refreshToken.create({
      data: {
        userId: user.userId,
        tokenHash: `seed-refresh-${randomUUID()}`,
        expiresAt: new Date(Date.now() + randomInt(7, 45) * 24 * 60 * 60 * 1000),
        revokedAt: chance(0.15) ? new Date() : null
      }
    });
  }

  for (let i = 0; i < 65; i += 1) {
    const actor = pickOne(adminUsers);
    await prisma.adminAuditLog.create({
      data: {
        actorAdminId: actor.id,
        action: pickOne([
          "APPROVE_DESIGNER",
          "REVIEW_DELIVERY",
          "SUSPEND_USER",
          "VIEW_METRICS",
          "UPDATE_POLICY"
        ]),
        targetType: pickOne(["DESIGNER", "USER", "ORDER", "BOOKING"]),
        targetId: randomUUID(),
        metadata: {
          source: "seed",
          note: "Generated for development testing"
        }
      }
    });
  }

  console.log("Seed completed successfully.");
  console.log(
    JSON.stringify(
      {
        admins: adminUsers.length,
        designers: designers.length,
        users: customers.length,
        products: seededProducts.length,
        bookings: bookings.length
      },
      null,
      2
    )
  );
}

main()
  .catch((error) => {
    console.error("Seed failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
