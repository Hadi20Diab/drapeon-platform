export interface CatalogProduct {
  id: string;
  title: string;
  description?: string;
  rentalPrice: number;
  imageUrl: string | null;
  images?: string[];
  category: "SUIT" | "DRESS" | string;
  designer: {
    storeName: string;
    slug: string;
    location?: string | null;
  };
  sizeOptions: string[];
  colorOptions: string[];
}

export interface AuthUser {
  id: string;
  email: string;
  role: "USER" | "DESIGNER" | "ADMIN";
}

export interface AuthSession {
  user: AuthUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
}

export interface StripeCheckoutResponse {
  mode: "configuration_required" | "stripe_onboarding_required" | "stripe_connect_checkout";
  provider: "stripe";
  sessionId?: string;
  checkoutUrl: string | null;
  totals: {
    subtotal: number;
    commissionRate: number;
    commissionAmount: number;
    designerAmount: number;
    currency: string;
  };
  message?: string;
}

export interface StripeOnboardingResponse {
  mode: "configuration_required" | "stripe_connect_onboarding";
  url: string | null;
  stripeAccountId?: string;
  message?: string;
}

export interface DesignerDashboard {
  designerId: string;
  storeName: string;
  approvalStatus: string;
  location: string | null;
  brandColor?: string | null;
  productsCount: number;
  pendingAppointments: number;
  openDeliveries: number;
  rentalOrdersCount: number;
  activeRentalsCount: number;
  revenue: number;
  monthRevenue: number;
  estimatedCommissionRate: number;
  stripeAccountId: string | null;
  stripeOnboardingComplete: boolean;
  stripeChargesEnabled: boolean;
  stripePayoutsEnabled: boolean;
  stripeDetailsSubmitted: boolean;
  products: Array<{
    id: string;
    title: string;
    status: string;
    rentalPrice: number | string;
    buyPrice?: number | string | null;
    tags?: string[];
    images?: Array<{ url: string; altText?: string | null }>;
    variants: Array<{
      sizeLabel: string;
      color: string;
      stockTotal: number;
      stockReserved: number;
    }>;
  }>;
  orders: Array<{
    id: string;
    status: string;
    totalAmount: number | string;
    rentalStartDate: string;
    rentalEndDate: string;
    user: {
      id?: string;
      email: string;
      profile?: {
        firstName?: string;
        lastName?: string;
        phoneNumber?: string | null;
      } | null;
    };
    items?: DesignerOrderItem[];
    deliveryRequest?: DesignerDeliveryRequest | null;
  }>;
  appointments: Array<{
    id: string;
    status: string;
    startsAt: string;
    endsAt: string;
    product: {
      id?: string;
      title: string;
    };
    variant?: {
      sizeLabel: string;
      color: string;
    } | null;
    user: {
      id?: string;
      email: string;
      profile?: {
        firstName?: string;
        lastName?: string;
      } | null;
    };
  }>;
  deliveries: Array<{
    id: string;
    status: string;
    deliveryAddress: string;
    scheduledFor: string | null;
    user: {
      email: string;
    };
  }>;
  revenueSeries: Array<{ month: string; revenue: number }>;
  mostRentedProducts: Array<{
    productId: string;
    title: string;
    imageUrl: string | null;
    rentals: number;
    revenue: number;
  }>;
  notifications: DesignerNotification[];
  conversations: DesignerConversation[];
}

export interface DesignerOrderItem {
  id: string;
  quantity: number;
  rentalDays: number;
  unitPrice: number | string;
  lineTotal: number | string;
  product: {
    id: string;
    title: string;
    images?: Array<{ url: string }>;
  };
  variant?: {
    sizeLabel: string;
    color: string;
  } | null;
}

export interface DesignerDeliveryRequest {
  id: string;
  status: string;
  deliveryAddress: string;
  contactPhone?: string | null;
  instructions?: string | null;
  trackingEvents?: Array<{
    id: string;
    status: string;
    note?: string | null;
    createdAt: string;
  }>;
}

export interface DesignerProduct {
  id: string;
  title: string;
  description: string;
  category: "SUIT" | "DRESS" | string;
  status: "DRAFT" | "ACTIVE" | "ARCHIVED" | string;
  rentalPrice: number | string;
  buyPrice?: number | string | null;
  tags: string[];
  images: Array<{ id?: string; url: string; altText?: string | null }>;
  variants: Array<{
    id?: string;
    sizeLabel: string;
    color: string;
    stockTotal: number;
    stockReserved: number;
  }>;
  rentalCount?: number;
  rentalRevenue?: number;
}

export interface DesignerProductPayload {
  title: string;
  description: string;
  category: "SUIT" | "DRESS";
  rentalPrice: number;
  buyPrice?: number;
  sizes: string[];
  colors: string[];
  stockQuantity: number;
  availabilityDates?: string[];
  images: string[];
  tags?: string[];
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
}

export interface DesignerProductList {
  items: DesignerProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface DesignerConversation {
  id: string;
  subject: string;
  status: string;
  unreadForDesigner: number;
  lastMessageAt?: string | null;
  customer: {
    id: string;
    email: string;
    profile?: {
      firstName?: string;
      lastName?: string;
    } | null;
  };
  messages: Array<{
    id: string;
    body: string;
    senderRole: string;
    createdAt: string;
  }>;
}

export interface DesignerConversationDetails extends DesignerConversation {
  messages: Array<{
    id: string;
    body: string;
    senderRole: string;
    createdAt: string;
    readAt?: string | null;
    sender: {
      email: string;
      profile?: {
        firstName?: string;
        lastName?: string;
      } | null;
    };
  }>;
}

export interface DesignerNotification {
  id: string;
  type: string;
  title: string;
  body: string;
  targetUrl?: string | null;
  readAt?: string | null;
  createdAt: string;
}

export interface AdminDashboard {
  metrics: {
    usersCount: number;
    pendingDesignersCount: number;
    ordersCount: number;
    deliveriesCount: number;
  };
  pendingDesigners: Array<{
    id: string;
    storeName: string;
    location: string | null;
    user: {
      email: string;
    };
  }>;
  recentUsers: Array<{
    id: string;
    email: string;
    role: string;
    status: string;
  }>;
  auditLogs: Array<{
    id: string;
    action: string;
    targetType: string;
    targetId: string | null;
  }>;
}

interface ApiEnvelope<T> {
  success: boolean;
  data: T;
}

interface RawImage {
  url?: string | null;
}

interface RawVariant {
  sizeLabel?: string | null;
  size?: string | null;
  color?: string | null;
}

interface RawProduct {
  id: string;
  title: string;
  description?: string;
  rentalPrice: number | string;
  imageUrl?: string | null;
  images?: RawImage[] | string[];
  category: "SUIT" | "DRESS" | string;
  designer?: {
    storeName?: string;
    slug?: string;
    location?: string | null;
  };
  variants?: RawVariant[];
  sizeOptions?: string[];
  colorOptions?: string[];
}

interface ProductListPayload {
  items: RawProduct[];
}

const suitImages = [
  "https://images.unsplash.com/photo-1593032465175-481ac7f401a0?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1594938298603-c8148c4dae35?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1507679799987-c73779587ccf?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1617137968427-85924c800a22?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1520975682031-ae78c7f4ed1d?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1555069519-127aadedf1ee?auto=format&fit=crop&w=1200&q=85"
];

const dressImages = [
  "https://images.unsplash.com/photo-1515372039744-b8f02a3ae446?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1502716119720-b23a93e5fe1b?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1509631179647-0177331693ae?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1483985988355-763728e1935b?auto=format&fit=crop&w=1200&q=85",
  "https://images.unsplash.com/photo-1496747611176-843222e1e57c?auto=format&fit=crop&w=1200&q=85"
];

function uniqueValues(values: Array<string | null | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function hashId(value: string): number {
  return [...value].reduce((total, char) => total + char.charCodeAt(0), 0);
}

function firstImageUrl(images: RawProduct["images"]): string | null {
  if (!Array.isArray(images) || images.length === 0) {
    return null;
  }

  const first = images[0];
  return typeof first === "string" ? first : first.url ?? null;
}

function isSeedPlaceholder(url: string | null): boolean {
  return Boolean(
    url &&
      (url.includes("photo-1524504388940-b1c1722653e1") ||
        url.includes("photo-1515372039744-b8f02a3ae446"))
  );
}

function curatedImage(product: RawProduct): string {
  const pool = product.category === "SUIT" ? suitImages : dressImages;
  return pool[hashId(product.id) % pool.length]!;
}

function normalizeProduct(product: RawProduct): CatalogProduct {
  const rawImageUrl = product.imageUrl ?? firstImageUrl(product.images);
  const sizeOptions =
    Array.isArray(product.sizeOptions) && product.sizeOptions.length > 0
      ? product.sizeOptions
      : uniqueValues(product.variants?.map((variant) => variant.sizeLabel ?? variant.size) ?? []);
  const colorOptions =
    Array.isArray(product.colorOptions) && product.colorOptions.length > 0
      ? product.colorOptions
      : uniqueValues(product.variants?.map((variant) => variant.color) ?? []);

  return {
    id: product.id,
    title: product.title,
    description: product.description,
    rentalPrice: Number(product.rentalPrice),
    imageUrl: isSeedPlaceholder(rawImageUrl) ? curatedImage(product) : rawImageUrl ?? curatedImage(product),
    images: [isSeedPlaceholder(rawImageUrl) ? curatedImage(product) : rawImageUrl ?? curatedImage(product)],
    category: product.category,
    designer: {
      storeName: product.designer?.storeName ?? "Drapeon Studio",
      slug: product.designer?.slug ?? "drapeon-studio",
      location: product.designer?.location
    },
    sizeOptions,
    colorOptions
  };
}

export const FALLBACK_PRODUCTS: CatalogProduct[] = [
  {
    id: "fallback-1",
    title: "Noir Tuxedo Set",
    rentalPrice: 240,
    imageUrl: suitImages[0],
    category: "SUIT",
    designer: { storeName: "Maison K", slug: "maison-k" },
    sizeOptions: ["S", "M", "L"],
    colorOptions: ["Black"]
  },
  {
    id: "fallback-2",
    title: "Pearl Satin Gown",
    rentalPrice: 315,
    imageUrl: dressImages[0],
    category: "DRESS",
    designer: { storeName: "Atelier Luna", slug: "atelier-luna" },
    sizeOptions: ["XS", "S", "M"],
    colorOptions: ["Ivory"]
  },
  {
    id: "fallback-3",
    title: "Sand Double-Breasted Suit",
    rentalPrice: 205,
    imageUrl: suitImages[2],
    category: "SUIT",
    designer: { storeName: "Sarto One", slug: "sarto-one" },
    sizeOptions: ["M", "L", "XL"],
    colorOptions: ["Sand", "Stone"]
  }
];

function extractData<T>(payload: ApiEnvelope<T> | T): T {
  return typeof payload === "object" &&
    payload !== null &&
    "success" in payload &&
    "data" in payload
    ? (payload as ApiEnvelope<T>).data
    : (payload as T);
}

function apiBaseUrl(): string {
  return import.meta.env.PUBLIC_API_URL ?? "http://localhost:4000";
}

async function requestApi<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl()}/api${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {})
    }
  });
  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      payload?.message ??
      payload?.error ??
      (Array.isArray(payload?.errors) ? payload.errors.join(", ") : null) ??
      "Request failed";
    throw new Error(message);
  }

  return extractData<T>(payload);
}

export async function fetchCatalogProducts(limit = 24): Promise<CatalogProduct[]> {
  const apiBase = apiBaseUrl();
  const endpoint = `${apiBase}/api/products?limit=${limit}`;

  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      return FALLBACK_PRODUCTS;
    }

    const payload = extractData<ProductListPayload>(await response.json());

    if (!payload?.items) {
      return FALLBACK_PRODUCTS;
    }

    return payload.items.map(normalizeProduct);
  } catch {
    return FALLBACK_PRODUCTS;
  }
}

export async function fetchProductDetails(id: string): Promise<CatalogProduct | null> {
  const apiBase = apiBaseUrl();

  try {
    const response = await fetch(`${apiBase}/api/products/${id}`);

    if (!response.ok) {
      return null;
    }

    return normalizeProduct(extractData<RawProduct>(await response.json()));
  } catch {
    return null;
  }
}

export async function loginUser(payload: {
  email: string;
  password: string;
}): Promise<AuthSession> {
  return requestApi<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function registerUser(payload: {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role: "USER" | "DESIGNER";
}): Promise<AuthSession> {
  return requestApi<AuthSession>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function persistAuthSession(session: AuthSession): void {
  sessionStorage.setItem("drapeon.auth", JSON.stringify(session));
  localStorage.removeItem("drapeon.auth");
}

export function readAuthSession(): AuthSession | null {
  try {
    const sessionValue = sessionStorage.getItem("drapeon.auth");

    if (sessionValue) {
      return JSON.parse(sessionValue) as AuthSession;
    }

    const legacyLocalValue = localStorage.getItem("drapeon.auth");

    if (!legacyLocalValue) {
      return null;
    }

    sessionStorage.setItem("drapeon.auth", legacyLocalValue);
    localStorage.removeItem("drapeon.auth");

    return JSON.parse(legacyLocalValue) as AuthSession;
  } catch {
    return null;
  }
}

export function clearAuthSession(): void {
  sessionStorage.removeItem("drapeon.auth");
  localStorage.removeItem("drapeon.auth");
}

export async function createStripeCheckout(payload: {
  items: Array<{
    productId: string;
    quantity: number;
  }>;
  customer?: {
    email: string;
  };
}): Promise<StripeCheckoutResponse> {
  const session = readAuthSession();

  if (!session) {
    throw new Error("Please sign in before checkout.");
  }

  return requestApi<StripeCheckoutResponse>("/payments/stripe/checkout", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${session.tokens.accessToken}`
    },
    body: JSON.stringify(payload)
  });
}

function authHeaders(): Record<string, string> {
  const session = readAuthSession();
  return session ? { Authorization: `Bearer ${session.tokens.accessToken}` } : {};
}

export async function fetchDesignerDashboard(): Promise<DesignerDashboard> {
  return requestApi<DesignerDashboard>("/designers/dashboard", {
    headers: authHeaders()
  });
}

export async function fetchDesignerProducts(query = ""): Promise<DesignerProductList> {
  return requestApi<DesignerProductList>(`/designers/products${query}`, {
    headers: authHeaders()
  });
}

export async function createDesignerProduct(
  payload: DesignerProductPayload
): Promise<DesignerProduct> {
  return requestApi<DesignerProduct>("/designers/products", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
}

export async function updateDesignerProductStatus(
  productId: string,
  status: "DRAFT" | "ACTIVE" | "ARCHIVED"
): Promise<DesignerProduct> {
  return requestApi<DesignerProduct>(`/designers/products/${productId}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });
}

export async function fetchDesignerOrders(): Promise<DesignerDashboard["orders"]> {
  return requestApi<DesignerDashboard["orders"]>("/designers/orders", {
    headers: authHeaders()
  });
}

export async function updateDesignerOrderStatus(orderId: string, status: string): Promise<void> {
  await requestApi(`/designers/orders/${orderId}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });
}

export async function fetchDesignerAppointments(): Promise<DesignerDashboard["appointments"]> {
  return requestApi<DesignerDashboard["appointments"]>("/designers/appointments", {
    headers: authHeaders()
  });
}

export async function updateDesignerAppointmentStatus(
  appointmentId: string,
  status: string
): Promise<void> {
  await requestApi(`/designers/appointments/${appointmentId}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });
}

export async function fetchDesignerConversations(): Promise<DesignerConversation[]> {
  return requestApi<DesignerConversation[]>("/designers/conversations", {
    headers: authHeaders()
  });
}

export async function fetchDesignerConversation(
  conversationId: string
): Promise<DesignerConversationDetails> {
  return requestApi<DesignerConversationDetails>(`/designers/conversations/${conversationId}`, {
    headers: authHeaders()
  });
}

export async function sendDesignerMessage(conversationId: string, body: string): Promise<void> {
  await requestApi(`/designers/conversations/${conversationId}/messages`, {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ body })
  });
}

export async function fetchDesignerNotifications(): Promise<DesignerNotification[]> {
  return requestApi<DesignerNotification[]>("/designers/notifications", {
    headers: authHeaders()
  });
}

export async function markDesignerNotificationRead(notificationId: string): Promise<void> {
  await requestApi(`/designers/notifications/${notificationId}/read`, {
    method: "PATCH",
    headers: authHeaders()
  });
}

export async function updateDesignerSettings(payload: {
  storeName?: string;
  description?: string;
  location?: string;
  brandColor?: string;
  websiteUrl?: string;
  instagramUrl?: string;
  tiktokUrl?: string;
}): Promise<void> {
  await requestApi("/designers/settings", {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
}

export async function createStripeOnboardingLink(): Promise<StripeOnboardingResponse> {
  return requestApi<StripeOnboardingResponse>("/designers/stripe/onboarding-link", {
    method: "POST",
    headers: authHeaders()
  });
}

export async function fetchAdminDashboard(): Promise<AdminDashboard> {
  return requestApi<AdminDashboard>("/admin/dashboard", {
    headers: authHeaders()
  });
}

export async function approveDesigner(designerId: string): Promise<void> {
  await requestApi(`/admin/designers/${designerId}/approve`, {
    method: "PATCH",
    headers: authHeaders()
  });
}
