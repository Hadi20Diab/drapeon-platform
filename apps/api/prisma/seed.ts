import { randomUUID } from "node:crypto";

import {
  AiMessageRole,
  AiSessionChannel,
  AvailabilityStatus,
  BookingStatus,
  BookingType,
  DeliveryStatus,
  DesignerApprovalStatus,
  PrismaClient,
  ProductCategory,
  ProductStatus,
  RentalOrderStatus,
  UserRole
} from "@prisma/client";

const prisma = new PrismaClient();

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
  await prisma.aiMessage.deleteMany();
  await prisma.aiSession.deleteMany();
  await prisma.adminAuditLog.deleteMany();
  await prisma.bodyMeasurement.deleteMany();
  await prisma.userProfile.deleteMany();
  await prisma.designer.deleteMany();
  await prisma.user.deleteMany();

  const passwordHash = "seeded_password_hash_not_for_production";

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
    const approved = chance(0.85);

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
            approvedAt: approved ? new Date() : null
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
      const imageSeed = encodeURIComponent(`${designer.slug}-${productCounter}`);
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
          status: ProductStatus.ACTIVE,
          isDeliveryAvailable: chance(0.84),
          images: {
            create: [
              {
                url: `https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=80&seed=${imageSeed}-1`,
                altText: `${title} front`,
                sortOrder: 0
              },
              {
                url: `https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1200&q=80&seed=${imageSeed}-2`,
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

  console.log("Creating rental orders...");

  const orders: {
    id: string;
    userId: string;
    designerId: string;
  }[] = [];

  for (let i = 0; i < 95; i += 1) {
    const customer = pickOne(customers);
    const product = pickOne(seededProducts);
    const sameDesignerProducts = seededProducts.filter(
      (candidate) => candidate.designerId === product.designerId
    );
    const secondaryProduct = chance(0.4) ? pickOne(sameDesignerProducts) : null;

    const rentalDays = randomInt(2, 6);
    const unitPrice1 = randomInt(95, 380);
    const unitPrice2 = secondaryProduct ? randomInt(90, 340) : 0;
    const subtotal = secondaryProduct ? unitPrice1 + unitPrice2 : unitPrice1;
    const serviceFee = Math.round(subtotal * 0.12);
    const total = subtotal + serviceFee;
    const status = pickOne([
      RentalOrderStatus.PENDING,
      RentalOrderStatus.CONFIRMED,
      RentalOrderStatus.IN_PROGRESS,
      RentalOrderStatus.COMPLETED
    ]);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() + randomInt(2, 25));
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + rentalDays);

    const order = await prisma.rentalOrder.create({
      data: {
        userId: customer.userId,
        designerId: product.designerId,
        status,
        rentalStartDate: startDate,
        rentalEndDate: endDate,
        subtotalAmount: subtotal,
        serviceFee,
        totalAmount: total,
        deliveryAddress: `${randomInt(12, 350)} ${pickOne([
          "Cedars Street",
          "Marina Road",
          "Downtown Ave",
          "Palm Boulevard",
          "Harbor Lane"
        ])}, ${pickOne(cities)}`,
        notes: chance(0.2) ? "Deliver after 5 PM." : null,
        items: {
          create: [
            {
              productId: product.id,
              variantId: pickOne(product.variantIds),
              quantity: 1,
              rentalDays,
              unitPrice: unitPrice1,
              lineTotal: unitPrice1
            },
            ...(secondaryProduct
              ? [
                  {
                    productId: secondaryProduct.id,
                    variantId: pickOne(secondaryProduct.variantIds),
                    quantity: 1,
                    rentalDays,
                    unitPrice: unitPrice2,
                    lineTotal: unitPrice2
                  }
                ]
              : [])
          ]
        }
      }
    });

    orders.push({
      id: order.id,
      userId: order.userId,
      designerId: order.designerId
    });
  }

  console.log("Creating delivery requests and tracking events...");

  const usedBookingIds = new Set<string>();
  const usedOrderIds = new Set<string>();

  for (let i = 0; i < 140; i += 1) {
    const fromOrder = chance(0.6);
    let orderRef: (typeof orders)[number] | null = null;
    let bookingRef: (typeof bookings)[number] | null = null;

    if (fromOrder) {
      const availableOrders = orders.filter((order) => !usedOrderIds.has(order.id));
      if (availableOrders.length > 0) {
        orderRef = pickOne(availableOrders);
        usedOrderIds.add(orderRef.id);
      }
    } else {
      const availableBookings = bookings.filter((booking) => !usedBookingIds.has(booking.id));
      if (availableBookings.length > 0) {
        bookingRef = pickOne(availableBookings);
        usedBookingIds.add(bookingRef.id);
      }
    }

    if (!orderRef && !bookingRef) {
      continue;
    }

    const userId = orderRef?.userId ?? bookingRef!.userId;
    const designerId = orderRef?.designerId ?? bookingRef!.designerId;
    const productId = bookingRef?.productId ?? null;
    const status = pickOne([
      DeliveryStatus.PENDING,
      DeliveryStatus.APPROVED,
      DeliveryStatus.PACKING,
      DeliveryStatus.IN_TRANSIT,
      DeliveryStatus.DELIVERED
    ]);

    const delivery = await prisma.deliveryRequest.create({
      data: {
        userId,
        designerId,
        orderId: orderRef?.id ?? null,
        bookingId: bookingRef?.id ?? null,
        productId,
        deliveryAddress: `${randomInt(10, 450)} ${pickOne([
          "Oak Residence",
          "Central District",
          "Bay Area",
          "Olive Quarter",
          "City Gate"
        ])}, ${pickOne(cities)}`,
        contactPhone: randomPhone(),
        instructions: chance(0.25) ? "Call on arrival." : null,
        status
      }
    });

    await prisma.deliveryTrackingEvent.createMany({
      data: [
        {
          deliveryRequestId: delivery.id,
          status: DeliveryStatus.PENDING,
          note: "Request submitted"
        },
        ...(status !== DeliveryStatus.PENDING
          ? [
              {
                deliveryRequestId: delivery.id,
                status,
                note: `Moved to ${status.toLowerCase().replace(/_/g, " ")}`
              }
            ]
          : [])
      ]
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
        bookings: bookings.length,
        orders: orders.length
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
