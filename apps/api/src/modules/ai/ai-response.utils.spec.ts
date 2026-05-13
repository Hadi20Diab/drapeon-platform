import { BodyShape, ProductCategory } from "@prisma/client";

import {
  composeGroundedRecommendationText,
  selectDiverseProductCards,
  selectGroundedProducts,
  type GroundedKnowledgeEntryCard,
  type GroundedProductCard
} from "./ai-response.utils";

function buildProduct(input: Partial<GroundedProductCard> & Pick<GroundedProductCard, "id" | "title">): GroundedProductCard {
  return {
    id: input.id,
    title: input.title,
    rentalPrice: input.rentalPrice ?? 220,
    imageUrl: input.imageUrl ?? `https://example.com/${input.id}.jpg`,
    category: input.category ?? ProductCategory.DRESS,
    designer: input.designer ?? {
      storeName: `${input.id} Atelier`,
      slug: `${input.id}-atelier`
    },
    sizeOptions: input.sizeOptions ?? ["S", "M"],
    colorOptions: input.colorOptions ?? ["Black"],
    bodyShapes: input.bodyShapes ?? [BodyShape.RECTANGLE]
  };
}

describe("ai-response utils", () => {
  it("prioritizes products that match body shape and prompt signals", () => {
    const result = selectGroundedProducts(
      [
        buildProduct({
          id: "column-dress",
          title: "Satin Column Evening Dress",
          bodyShapes: [BodyShape.RECTANGLE],
          category: ProductCategory.DRESS
        }),
        buildProduct({
          id: "structured-dress",
          title: "Structured Cocktail Dress",
          bodyShapes: [BodyShape.HOURGLASS],
          category: ProductCategory.DRESS
        })
      ],
      {
        prompt: "I need a refined black-tie dress for an hourglass body shape.",
        filters: { category: ProductCategory.DRESS, bodyShape: BodyShape.HOURGLASS },
        profile: {
          firstName: "Hadi",
          measurements: { bodyShape: BodyShape.HOURGLASS },
          preferences: null
        },
        usedStoredMeasurements: true
      },
      2
    );

    expect(result[0]?.id).toBe("structured-dress");
  });

  it("prefers diverse images and designers when ranking cards", () => {
    const result = selectDiverseProductCards(
      [
        buildProduct({
          id: "first",
          imageUrl: "https://example.com/shared.jpg",
          designer: { storeName: "Atelier One", slug: "atelier-one" }
        }),
        buildProduct({
          id: "second",
          imageUrl: "https://example.com/shared.jpg",
          designer: { storeName: "Atelier Two", slug: "atelier-two" }
        }),
        buildProduct({
          id: "third",
          imageUrl: "https://example.com/unique.jpg",
          designer: { storeName: "Atelier Three", slug: "atelier-three" }
        })
      ],
      2
    );

    expect(result).toHaveLength(2);
    expect(new Set(result.map((product) => product.imageUrl)).size).toBe(2);
  });

  it("composes recommendation text from the exact selected cards", () => {
    const products = [
      buildProduct({
        id: "structured-dress",
        title: "Structured Cocktail Dress",
        bodyShapes: [BodyShape.HOURGLASS],
        category: ProductCategory.DRESS,
        designer: { storeName: "Mira Atelier", slug: "mira-atelier" }
      })
    ];

    const text = composeGroundedRecommendationText(
      {
        prompt: "Find me a black-tie dress.",
        filters: { category: ProductCategory.DRESS, bodyShape: BodyShape.HOURGLASS },
        profile: {
          firstName: "Hadi",
          measurements: { bodyShape: BodyShape.HOURGLASS },
          preferences: null
        },
        usedStoredMeasurements: true
      },
      products,
      []
    );

    expect(text).toContain("Structured Cocktail Dress");
    expect(text).toContain("Mira Atelier");
    expect(text).toContain("Hourglass");
    expect(text).not.toContain("Satin Column Evening Dress");
  });

  it("keeps knowledge-only answers concise so cards do not duplicate the same text", () => {
    const knowledgeEntries: GroundedKnowledgeEntryCard[] = [
      {
        id: "knowledge-1",
        question: "How does the AI stylist choose recommendations?",
        answer:
          "The AI stylist uses the customer profile, body measurements, saved body shape, style preferences, and live product inventory from the database to recommend real catalog pieces instead of invented products.",
        category: "ai",
        tags: ["ai", "recommendations"]
      },
      {
        id: "knowledge-2",
        question: "How does the client journey work on Drapeon?",
        answer:
          "Customers browse verified designer inventory, save favorite looks, and request fittings directly from product pages. Designers review those requests, confirm appointments, and manage their publishing workflow from the dashboard.",
        category: "rentals",
        tags: ["journey"]
      }
    ];

    const text = composeGroundedRecommendationText(
      {
        prompt: "How does the AI stylist choose recommendations?",
        filters: null,
        profile: {
          firstName: "Hadi",
          measurements: null,
          preferences: null
        },
        usedStoredMeasurements: false
      },
      [],
      knowledgeEntries
    );

    expect(text).toContain("approved knowledge base");
    expect(text).toContain("knowledge cards below");
    expect(text).toContain("How does the AI stylist choose recommendations?");
    expect(text).not.toContain(knowledgeEntries[0]!.answer);
    expect(text).not.toContain(knowledgeEntries[1]!.answer);
  });

  it("enforces explicit designer, color, size, and budget filters before ranking", () => {
    const result = selectGroundedProducts(
      [
        buildProduct({
          id: "rami-match",
          title: "Pleated Statement Dress 126",
          category: ProductCategory.DRESS,
          rentalPrice: 228,
          designer: { storeName: "Rami Tannous Atelier", slug: "rami-tannous-atelier" },
          colorOptions: ["Black", "Sand"],
          sizeOptions: ["L", "S", "XS"]
        }),
        buildProduct({
          id: "wrong-designer",
          title: "Pleated Statement Dress 168",
          category: ProductCategory.DRESS,
          rentalPrice: 214,
          designer: { storeName: "Adam Nassar Atelier", slug: "adam-nassar-atelier" },
          colorOptions: ["Champagne", "Sand"],
          sizeOptions: ["L", "M", "XS"]
        }),
        buildProduct({
          id: "too-expensive",
          title: "Pleated Statement Dress 190",
          category: ProductCategory.DRESS,
          rentalPrice: 410,
          designer: { storeName: "Rami Tannous Atelier", slug: "rami-tannous-atelier" },
          colorOptions: ["Sand"],
          sizeOptions: ["XS"]
        })
      ],
      {
        prompt: "Find me a sand-colored Rami Tannous dress, size XS, for under $300.",
        filters: {
          category: ProductCategory.DRESS,
          color: "Sand",
          size: "XS",
          designerQuery: "Rami Tannous Atelier",
          maxPrice: 300
        },
        profile: {
          firstName: "Malik",
          measurements: null,
          preferences: null
        },
        usedStoredMeasurements: false
      },
      3
    );

    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("rami-match");
  });
});
