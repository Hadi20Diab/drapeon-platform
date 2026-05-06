export interface CatalogProduct {
  id: string;
  title: string;
  rentalPrice: number;
  imageUrl: string | null;
  category: "SUIT" | "DRESS" | string;
  designer: {
    storeName: string;
    slug: string;
  };
  sizeOptions: string[];
  colorOptions: string[];
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface ProductListPayload {
  items: CatalogProduct[];
}

function normalizeProduct(product: CatalogProduct): CatalogProduct {
  return {
    ...product,
    sizeOptions: Array.isArray(product.sizeOptions) ? product.sizeOptions : [],
    colorOptions: Array.isArray(product.colorOptions) ? product.colorOptions : []
  };
}

export const FALLBACK_PRODUCTS: CatalogProduct[] = [
  {
    id: "fallback-1",
    title: "Noir Tuxedo Set",
    rentalPrice: 240,
    imageUrl:
      "https://images.unsplash.com/photo-1592878940526-0214b0f374f6?auto=format&fit=crop&w=1200&q=80",
    category: "SUIT",
    designer: { storeName: "Maison K", slug: "maison-k" },
    sizeOptions: ["S", "M", "L"],
    colorOptions: ["Black"]
  },
  {
    id: "fallback-2",
    title: "Pearl Satin Gown",
    rentalPrice: 315,
    imageUrl:
      "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1200&q=80",
    category: "DRESS",
    designer: { storeName: "Atelier Luna", slug: "atelier-luna" },
    sizeOptions: ["XS", "S", "M"],
    colorOptions: ["Ivory"]
  },
  {
    id: "fallback-3",
    title: "Sand Double-Breasted Suit",
    rentalPrice: 205,
    imageUrl:
      "https://images.unsplash.com/photo-1593032465171-8bd6611b6f4a?auto=format&fit=crop&w=1200&q=80",
    category: "SUIT",
    designer: { storeName: "Sarto One", slug: "sarto-one" },
    sizeOptions: ["M", "L", "XL"],
    colorOptions: ["Sand", "Stone"]
  }
];

export async function fetchCatalogProducts(limit = 8): Promise<CatalogProduct[]> {
  const apiBase = import.meta.env.PUBLIC_API_URL ?? "http://localhost:4000";
  const endpoint = `${apiBase}/api/products?limit=${limit}`;

  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      return FALLBACK_PRODUCTS;
    }

    const payload = (await response.json()) as ApiEnvelope<ProductListPayload>;

    if (!payload.success || !payload.data?.items) {
      return FALLBACK_PRODUCTS;
    }

    return payload.data.items.map(normalizeProduct);
  } catch {
    return FALLBACK_PRODUCTS;
  }
}
