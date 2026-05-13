import { BodyShape } from "@prisma/client";

import { AiService } from "./ai.service";

describe("AiService", () => {
  function createService() {
    const prisma = {
      aiSession: {
        create: jest.fn().mockResolvedValue({ id: "session-1" }),
        update: jest.fn().mockResolvedValue({})
      },
      aiMessage: {
        create: jest.fn().mockResolvedValue({})
      },
      userProfile: {
        findUnique: jest.fn().mockResolvedValue(null)
      },
      product: {
        findMany: jest.fn()
      }
    } as any;

    const config = {
      getOrThrow: jest.fn().mockReturnValue("test-api-key"),
      get: jest.fn((key: string, fallback?: string) =>
        key === "GEMINI_MODEL" ? "gemini-3-flash-preview" : fallback
      )
    } as any;

    const companyKnowledgeService = {
      searchKnowledge: jest.fn().mockResolvedValue([])
    } as any;

    const service = new AiService(prisma, config, companyKnowledgeService);
    const generateContent = jest.fn();

    (service as any).gemini = {
      models: {
        generateContent
      }
    };

    return {
      service,
      prisma,
      companyKnowledgeService,
      generateContent
    };
  }

  function highDemandError() {
    const error = new Error("This model is currently experiencing high demand.");
    (error as Error & { status?: number }).status = 503;
    return error;
  }

  it("retries transient model failures and falls back to grounded catalog results", async () => {
    const { service, prisma, generateContent } = createService();
    generateContent.mockRejectedValue(highDemandError());
    prisma.product.findMany.mockResolvedValue([
      {
        id: "product-1",
        title: "Heritage Evening Tuxedo",
        rentalPrice: 260,
        bodyShapes: [BodyShape.ATHLETIC],
        images: [{ url: "https://cdn.example.com/tuxedo.jpg" }],
        variants: [{ sizeLabel: "50", color: "Black", isActive: true }],
        designer: {
          storeName: "Mira Atelier",
          slug: "mira-atelier"
        }
      }
    ]);

    const result = await service.recommend(null, {
      prompt: "I need a black tie tuxedo for an evening event."
    });

    expect(generateContent).toHaveBeenCalledTimes(3);
    expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
    expect(result.products).toEqual([
      expect.objectContaining({
        id: "product-1",
        title: "Heritage Evening Tuxedo"
      })
    ]);
    expect(result.recommendationText).toContain("Our live stylist model is under heavy demand right now");
  });

  it("recovers on a retry without using fallback when the model becomes available", async () => {
    const { service, prisma, generateContent } = createService();
    generateContent
      .mockRejectedValueOnce(highDemandError())
      .mockResolvedValueOnce({
        candidates: [],
        functionCalls: []
      });
    prisma.product.findMany.mockResolvedValue([]);

    const result = await service.recommend(null, {
      prompt: "Find me a dress for a formal dinner."
    });

    expect(generateContent).toHaveBeenCalledTimes(2);
    expect(prisma.product.findMany).toHaveBeenCalledTimes(1);
    expect(result.recommendationText).not.toContain("under heavy demand");
    expect(result.products).toEqual([]);
  });

  it("grounds shopping prompts with inferred price and color filters when the model skips tool calls", async () => {
    const { service, prisma, generateContent } = createService();
    generateContent.mockResolvedValue({
      candidates: [],
      functionCalls: []
    });
    prisma.product.findMany.mockResolvedValue([
      {
        id: "product-2",
        title: "Slim Midnight Formal Suit",
        rentalPrice: 180,
        bodyShapes: [BodyShape.ATHLETIC],
        images: [{ url: "https://cdn.example.com/suit.jpg" }],
        variants: [{ sizeLabel: "50", color: "Black", isActive: true }],
        designer: {
          storeName: "Malik Atelier",
          slug: "malik-atelier"
        }
      }
    ]);

    const result = await service.recommend(null, {
      prompt: "Hello give me an black suit under 250$"
    });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: "SUIT",
          rentalPrice: expect.objectContaining({
            lte: expect.anything()
          }),
          variants: expect.objectContaining({
            some: expect.objectContaining({
              color: "Black"
            })
          })
        })
      })
    );
    expect(result.products).toEqual([
      expect.objectContaining({
        id: "product-2",
        title: "Slim Midnight Formal Suit"
      })
    ]);
  });

  it("treats named ateliers as a strict designer filter in grounded catalog search", async () => {
    const { service, prisma, generateContent } = createService();
    generateContent.mockResolvedValue({
      candidates: [],
      functionCalls: []
    });
    prisma.product.findMany.mockResolvedValue([
      {
        id: "product-3",
        title: "Double-Breasted Signature Suit 96",
        rentalPrice: 414,
        bodyShapes: [BodyShape.ATHLETIC],
        images: [{ url: "https://cdn.example.com/suit-96.jpg" }],
        variants: [{ sizeLabel: "50", color: "Black", isActive: true }],
        designer: {
          storeName: "Nour Nehme Atelier",
          slug: "nour-nehme-atelier"
        }
      }
    ]);

    const result = await service.recommend(null, {
      prompt: "give me suits that posted by nour Nehme Atelier"
    });

    expect(prisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          category: "SUIT",
          designer: {
            storeName: {
              contains: "nour Nehme Atelier",
              mode: "insensitive"
            }
          }
        })
      })
    );
    expect(result.products).toEqual([
      expect.objectContaining({
        id: "product-3",
        title: "Double-Breasted Signature Suit 96",
        designer: expect.objectContaining({
          storeName: "Nour Nehme Atelier"
        })
      })
    ]);
  });
});
