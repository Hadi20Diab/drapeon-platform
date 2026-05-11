import { BodyShape, ProductCategory } from "@prisma/client";

import {
  composeGroundedRecommendationText,
  selectDiverseProductCards,
  selectGroundedProducts,
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
});
