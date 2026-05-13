import { BodyShape, ProductCategory } from "@prisma/client";

export interface GroundedProductCard {
  id: string;
  title: string;
  rentalPrice: number;
  imageUrl: string | null;
  category: string;
  designer: {
    storeName: string;
    slug: string;
  };
  sizeOptions: string[];
  colorOptions: string[];
  bodyShapes: BodyShape[];
}

export interface GroundedKnowledgeEntryCard {
  id: string;
  question: string;
  answer: string;
  category: string | null;
  tags: string[];
}

export interface GroundedUserProfileContext {
  firstName: string | null;
  measurements: Record<string, unknown> | null;
  preferences: Record<string, unknown> | null;
}

export interface GroundedResponseContext {
  prompt: string;
  filters?: Record<string, unknown> | null;
  profile: GroundedUserProfileContext;
  usedStoredMeasurements: boolean;
}

type PromptSignals = {
  wantsSuit: boolean;
  wantsDress: boolean;
  wantsFormal: boolean;
  wantsBlackTie: boolean;
  wantsCocktail: boolean;
  wantsMinimal: boolean;
};

function asBodyShape(value: unknown): BodyShape | undefined {
  return value === "HOURGLASS" ||
    value === "PEAR" ||
    value === "APPLE" ||
    value === "RECTANGLE" ||
    value === "INVERTED_TRIANGLE" ||
    value === "ATHLETIC"
    ? value
    : undefined;
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function tokenizePrompt(prompt: string): string[] {
  return prompt
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length >= 3);
}

function toTitleCase(value: string): string {
  return value
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function listFormatter(values: string[]): string {
  if (values.length === 0) {
    return "available on request";
  }

  if (values.length === 1) {
    return values[0]!;
  }

  if (values.length === 2) {
    return `${values[0]} and ${values[1]}`;
  }

  return `${values.slice(0, -1).join(", ")}, and ${values.at(-1)}`;
}

function detectPromptSignals(prompt: string): PromptSignals {
  const normalized = prompt.toLowerCase();

  return {
    wantsSuit: /\b(suit|tuxedo|jacket|tailoring|tailored)\b/.test(normalized),
    wantsDress: /\b(dress|gown|eveningwear|cocktail)\b/.test(normalized),
    wantsFormal: /\b(formal|gala|wedding|event|ceremony|evening)\b/.test(normalized),
    wantsBlackTie: /\bblack[- ]?tie\b/.test(normalized),
    wantsCocktail: /\bcocktail\b/.test(normalized),
    wantsMinimal: /\b(clean|minimal|sleek|sharp|classic|refined|sophisticated)\b/.test(normalized)
  };
}

function detectRequestedCategory(
  prompt: string,
  filters?: Record<string, unknown> | null
): ProductCategory | undefined {
  if (filters?.category === ProductCategory.SUIT || filters?.category === ProductCategory.DRESS) {
    return filters.category;
  }

  const signals = detectPromptSignals(prompt);

  if (signals.wantsSuit && !signals.wantsDress) {
    return ProductCategory.SUIT;
  }

  if (signals.wantsDress && !signals.wantsSuit) {
    return ProductCategory.DRESS;
  }

  return undefined;
}

function detectRequestedBodyShape(
  context: GroundedResponseContext
): BodyShape | undefined {
  return (
    asBodyShape(context.filters?.bodyShape) ??
    asBodyShape(context.profile.measurements?.bodyShape)
  );
}

function scoreProductForPrompt(
  product: GroundedProductCard,
  context: GroundedResponseContext
): number {
  const requestedBodyShape = detectRequestedBodyShape(context);
  const requestedCategory = detectRequestedCategory(context.prompt, context.filters);
  const requestedColor = asString(context.filters?.color)?.toLowerCase();
  const requestedSize = asString(context.filters?.size)?.toLowerCase();
  const promptSignals = detectPromptSignals(context.prompt);
  const promptTokens = tokenizePrompt(context.prompt);
  const title = product.title.toLowerCase();

  let score = 0;

  if (requestedCategory && product.category === requestedCategory) {
    score += 30;
  }

  if (requestedBodyShape && product.bodyShapes.includes(requestedBodyShape)) {
    score += 42;
  }

  if (requestedColor && product.colorOptions.some((color) => color.toLowerCase() === requestedColor)) {
    score += 16;
  }

  if (requestedSize && product.sizeOptions.some((size) => size.toLowerCase() === requestedSize)) {
    score += 14;
  }

  if (promptSignals.wantsBlackTie) {
    if (/\b(tuxedo|evening|ceremony)\b/.test(title)) {
      score += 18;
    }
    if (/\b(column)\b/.test(title)) {
      score -= 4;
    }
  }

  if (promptSignals.wantsCocktail && /\bcocktail\b/.test(title)) {
    score += 14;
  }

  if (promptSignals.wantsMinimal && /\b(slim|signature|column|heritage)\b/.test(title)) {
    score += 8;
  }

  if (promptSignals.wantsFormal && /\b(tuxedo|gown|evening|formal|ceremony)\b/.test(title)) {
    score += 10;
  }

  score += promptTokens.reduce((total, token) => total + (title.includes(token) ? 2 : 0), 0);

  return score;
}

export function selectDiverseProductCards<T extends GroundedProductCard>(
  products: T[],
  limit: number
): T[] {
  const selected: T[] = [];
  const deferred: T[] = [];
  const seenImages = new Set<string>();
  const seenDesigners = new Set<string>();

  for (const product of products) {
    const imageKey = product.imageUrl ?? `no-image:${product.id}`;
    const designerKey = product.designer.slug;

    if (!seenImages.has(imageKey) && !seenDesigners.has(designerKey)) {
      selected.push(product);
      seenImages.add(imageKey);
      seenDesigners.add(designerKey);
    } else {
      deferred.push(product);
    }

    if (selected.length >= limit) {
      return selected;
    }
  }

  for (const product of deferred) {
    if (selected.length >= limit) {
      break;
    }

    const designerKey = product.designer.slug;
    if (!seenDesigners.has(designerKey)) {
      selected.push(product);
      seenDesigners.add(designerKey);
    }
  }

  for (const product of deferred) {
    if (selected.length >= limit) {
      break;
    }

    if (!selected.some((item) => item.id === product.id)) {
      selected.push(product);
    }
  }

  return selected.slice(0, limit);
}

export function selectGroundedProducts<T extends GroundedProductCard>(
  products: T[],
  context: GroundedResponseContext,
  limit = 3
): T[] {
  const ranked = [...products].sort((left, right) => {
    const scoreDifference = scoreProductForPrompt(right, context) - scoreProductForPrompt(left, context);

    if (scoreDifference !== 0) {
      return scoreDifference;
    }

    return left.title.localeCompare(right.title);
  });

  return selectDiverseProductCards(ranked, limit);
}

function buildFitRationale(
  product: GroundedProductCard,
  context: GroundedResponseContext
): string {
  const requestedBodyShape = detectRequestedBodyShape(context);
  const promptSignals = detectPromptSignals(context.prompt);
  const reasons: string[] = [];

  if (requestedBodyShape && product.bodyShapes.includes(requestedBodyShape)) {
    reasons.push(
      `The designer tagged this piece for ${toTitleCase(requestedBodyShape)} proportions, so it stays aligned with your fit profile.`
    );
  }

  if (promptSignals.wantsBlackTie) {
    reasons.push(
      product.category === ProductCategory.SUIT
        ? "Its formal tailoring makes it a strong verified option for a black-tie dress code."
        : "Its eveningwear profile makes it a strong verified option for a black-tie dress code."
    );
  } else if (promptSignals.wantsCocktail) {
    reasons.push("Its event-ready silhouette keeps the look appropriate for a cocktail setting.");
  } else if (promptSignals.wantsFormal) {
    reasons.push("Its polished occasionwear styling makes it a dependable match for a formal event.");
  }

  if (reasons.length === 0) {
    reasons.push("It is one of the closest verified matches currently available in live inventory.");
  }

  return reasons.slice(0, 2).join(" ");
}

export function composeGroundedRecommendationText(
  context: GroundedResponseContext,
  products: GroundedProductCard[],
  knowledgeEntries: GroundedKnowledgeEntryCard[]
): string {
  const greeting = context.profile.firstName ? `Hi ${context.profile.firstName}, ` : "";
  const requestedBodyShape = detectRequestedBodyShape(context);
  const sections: string[] = [];

  if (products.length > 0) {
    const introParts = [
      `${greeting}I found ${products.length} verified option${products.length === 1 ? "" : "s"} from live inventory`
    ];

    if (context.usedStoredMeasurements) {
      introParts.push("using your saved fit profile");
    }

    sections.push(`${introParts.join(" ")}.`);

    if (requestedBodyShape) {
      sections.push(
        `I prioritized listings that are tagged for a ${toTitleCase(requestedBodyShape)} frame whenever that match was available.`
      );
    }

    for (const product of products) {
      sections.push(
        [
          `**[${product.title}](https://drapeon.com/products/${product.id})**`,
          `- **Designer:** ${product.designer.storeName}`,
          `- **Why it fits:** ${buildFitRationale(product, context)}`,
          `- **Available colors:** ${listFormatter(product.colorOptions)}`,
          `- **Sizes:** ${listFormatter(product.sizeOptions)}`
        ].join("\n")
      );
    }

    if (!context.profile.measurements) {
      sections.push(
        "If you want a tighter fit recommendation, share your measurements or complete your fit profile and I will refine the shortlist."
      );
    }
  } else if (knowledgeEntries.length > 0) {
    const primaryEntry = knowledgeEntries[0]!;
    sections.push(`${greeting}Here is the verified answer from Drapeon's approved knowledge base:`);
    sections.push(
      `I found the most relevant verified guidance for **${primaryEntry.question}** in the knowledge cards below.`
    );
  } else {
    sections.push(
      `${greeting}I could not verify a strong match from the current tool results yet. Try adding the event type, preferred color, or size and I will narrow the search.`
    );
  }

  if (knowledgeEntries.length > 0 && products.length > 0) {
    const entry = knowledgeEntries[0]!;
    sections.push(`**Related Drapeon detail:** ${entry.answer}`);
  }

  return sections.join("\n\n");
}
