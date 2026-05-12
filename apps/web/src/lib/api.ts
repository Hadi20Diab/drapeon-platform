export interface CatalogProduct {
  id: string;
  title: string;
  description?: string;
  rentalPrice: number;
  imageUrl: string | null;
  images?: string[];
  category: "SUIT" | "DRESS" | string;
  designer: {
    id?: string;
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
  isEmailVerified: boolean;
}

export interface AuthSession {
  user: AuthUser;
  tokens: {
    accessToken: string;
    refreshToken: string;
  };
  verificationEmailSent?: boolean;
}

export interface BecomeDesignerPayload {
  storeName: string;
  description: string;
  location?: string;
  brandColor?: string;
  websiteUrl?: string;
  instagramUrl?: string;
}

export interface UserProfile {
  id: string;
  userId: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string | null;
  avatarUrl?: string | null;
  preferences?: Record<string, unknown> | null;
  measurements?: {
    bodyShape?: string | null;
    heightCm?: number | string | null;
    weightKg?: number | string | null;
    chestCm?: number | string | null;
    waistCm?: number | string | null;
    hipCm?: number | string | null;
    shoulderCm?: number | string | null;
    inseamCm?: number | string | null;
    notes?: string | null;
  } | null;
}

export interface UserBooking {
  id: string;
  status: string;
  type: string;
  startsAt: string;
  endsAt: string;
  product: {
    id: string;
    title: string;
    images?: Array<{ url: string }>;
  };
  designer: {
    id: string;
    storeName: string;
  };
}

export interface DesignerSubscriptionPlan {
  id: string;
  slug: string;
  name: string;
  description: string;
  stripePriceId: string;
  stripeProductId?: string | null;
  currency: string;
  interval: "MONTH" | "YEAR" | string;
  amount: number;
  productLimit: number;
  featured: boolean;
  isActive: boolean;
  sortOrder: number;
  notes?: string | null;
  features: string[];
}

export interface DesignerSubscriptionActionResponse {
  mode: "configuration_required" | "subscription_checkout" | "billing_portal";
  provider: "stripe";
  sessionId?: string | null;
  url: string | null;
  plan?: DesignerSubscriptionPlan;
  message?: string;
}

export interface DesignerSubscriptionSummary {
  status: string;
  plan: DesignerSubscriptionPlan | null;
  canCreateProducts: boolean;
  needsSubscription: boolean;
  productLimit: number;
  productsPublishedThisPeriod: number;
  productsRemainingThisPeriod: number;
  usagePeriodStart?: string | null;
  usagePeriodEnd?: string | null;
  currentPeriodStart?: string | null;
  currentPeriodEnd?: string | null;
  cancelAtPeriodEnd: boolean;
  subscribedAt?: string | null;
  lastSyncedAt?: string | null;
}

export interface DesignerDashboard {
  designerId: string;
  storeName: string;
  approvalStatus: string;
  location: string | null;
  brandColor?: string | null;
  productsCount: number;
  activeProductsCount: number;
  draftProductsCount: number;
  pendingAppointments: number;
  confirmedAppointments: number;
  unreadNotifications: number;
  unreadConversations: number;
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
  notifications: DesignerNotification[];
  conversations: DesignerConversation[];
  subscription: DesignerSubscriptionSummary;
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
  bodyShapes?: string[];
  images: Array<{ id?: string; url: string; altText?: string | null }>;
  variants: Array<{
    id?: string;
    sizeLabel: string;
    color: string;
    stockTotal: number;
    stockReserved: number;
  }>;
  fittingCount?: number;
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
  bodyShapes: string[];
  status?: "DRAFT" | "ACTIVE" | "ARCHIVED";
}

export interface DesignerProductList {
  items: DesignerProduct[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
  subscription: DesignerSubscriptionSummary;
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

export interface AdminSeriesPoint {
  month: string;
  value: number;
}

export interface AdminAlert {
  id: string;
  type: string;
  title: string;
  body: string;
  href: string;
  createdAt: string;
}

export interface AdminAuditActivity {
  id: string;
  action: string;
  targetType: string;
  targetId: string | null;
  createdAt: string;
  actorEmail?: string;
}

export interface AdminUserRow {
  id: string;
  email: string;
  role: string;
  status: string;
  isEmailVerified: boolean;
  createdAt: string;
  profile?: {
    firstName?: string;
    lastName?: string;
    phoneNumber?: string | null;
    avatarUrl?: string | null;
  } | null;
  _count?: {
    bookings: number;
    aiSessions: number;
  };
  designerProfile?: {
    id: string;
    storeName: string;
    approvalStatus: string;
  } | null;
}

export interface AdminDesignerRow {
  id: string;
  storeName: string;
  slug: string;
  bio: string;
  location: string | null;
  approvalStatus: string;
  createdAt: string;
  user: {
    id: string;
    email: string;
    status: string;
  };
  subscription: {
    status: string;
    plan: {
      id: string;
      name: string;
      amount: number;
      interval: string;
      productLimit: number;
    } | null;
    productLimit: number;
    productsPublishedThisPeriod: number;
    productsRemainingThisPeriod: number;
    currentPeriodEnd: string | null;
    cancelAtPeriodEnd: boolean;
  };
  _count?: {
    products: number;
    bookings: number;
  };
  monthlyRevenue?: number;
  annualizedRevenue?: number;
}

export interface AdminProductRow {
  id: string;
  title: string;
  category: string;
  status: string;
  rentalPrice: number;
  buyPrice: number | null;
  createdAt: string;
  tags: string[];
  images: Array<{ url: string; altText?: string | null }>;
  designer: {
    id: string;
    storeName: string;
    approvalStatus: string;
  };
  _count: {
    bookings: number;
  };
}

export interface AdminKnowledgeEntry {
  id: string;
  slug: string;
  question: string;
  answer: string;
  category?: string | null;
  tags: string[];
  isPublished: boolean;
  pineconeSyncedAt?: string | null;
  pineconeSyncError?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PaginatedAdmin<T> {
  items: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
  };
}

export interface AdminDashboard {
  metrics: {
    totalUsers: number;
    activeDesigners: number;
    revenue: number;
    platformRevenue: number;
    fittingsToday: number;
    pendingApprovals: number;
    platformActivity: number;
  };
  growth: {
    usersThisMonth: number;
    usersLastMonth: number;
    userGrowthRate: number;
    revenueThisMonth: number;
    revenueLastMonth: number;
    revenueGrowthRate: number;
  };
  revenueSeries: AdminSeriesPoint[];
  userGrowthSeries: AdminSeriesPoint[];
  fittingPerformance: Array<{ status: string; count: number }>;
  pendingDesigners: AdminDesignerRow[];
  recentUsers: AdminUserRow[];
  recentActivities: AdminAuditActivity[];
  topDesigners: Array<{
    designerId: string;
    storeName: string;
    location: string | null;
    monthlyRevenue: number;
    annualizedRevenue: number;
    publishedLooks: number;
    fittings: number;
    planName: string | null;
    subscriptionStatus: string;
  }>;
  alerts: AdminAlert[];
}

export interface AiKnowledgeEntry {
  id: string;
  question: string;
  answer: string;
  category?: string | null;
  tags: string[];
}

export interface AiHistoryMessage {
  role: "user" | "agent";
  text: string;
}

export interface AiChatResponse {
  recommendationText: string;
  products: CatalogProduct[];
  knowledgeEntries: AiKnowledgeEntry[];
  context: {
    usedStoredMeasurements: boolean;
  };
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
    id?: string;
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
  "https://images.pexels.com/photos/1043474/pexels-photo-1043474.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1600&fit=crop",
  "https://images.unsplash.com/photo-1555069519-127aadedf1ee?auto=format&fit=crop&w=1200&q=85"
];

const dressImages = [
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
const authStorageKey = "drapeon.auth";
const authEventKey = "drapeon.auth:event";
const authCustomEvent = "drapeon:auth";
const authBroadcastChannelKey = "drapeon.auth.channel";

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
      id: product.designer?.id,
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

function extractErrorMessage(payload: unknown): string | null {
  if (typeof payload === "string") {
    const message = payload.trim();
    return message.length > 0 ? message : null;
  }

  if (Array.isArray(payload)) {
    const messages = payload
      .map((entry) => extractErrorMessage(entry))
      .filter((entry): entry is string => Boolean(entry));
    return messages.length > 0 ? messages.join(", ") : null;
  }

  if (!payload || typeof payload !== "object") {
    return null;
  }
  const errorRecord = payload as {
    message?: unknown;
    error?: unknown;
    errors?: unknown;
  };

  return (
    extractErrorMessage(errorRecord.message) ??
    extractErrorMessage(errorRecord.error) ??
    extractErrorMessage(errorRecord.errors) ??
    null
  );
}

function apiBaseUrl(): string {
  return import.meta.env.PUBLIC_API_URL ?? "http://localhost:4000";
}

function readBrowserStorage(key: string): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return window.localStorage.getItem(key);
}

function writeBrowserStorage(key: string, value: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(key, value);
}

function removeBrowserStorage(key: string): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(key);
}

function getAuthBroadcastChannel(): BroadcastChannel | null {
  if (typeof window === "undefined" || typeof BroadcastChannel === "undefined") {
    return null;
  }

  return new BroadcastChannel(authBroadcastChannelKey);
}

function emitAuthSessionChange(type: "updated" | "cleared"): void {
  if (typeof window === "undefined") {
    return;
  }

  const detail = {
    type,
    at: Date.now()
  };

  writeBrowserStorage(authEventKey, JSON.stringify(detail));
  window.dispatchEvent(new CustomEvent(authCustomEvent, { detail }));
  getAuthBroadcastChannel()?.postMessage(detail);
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
    const hasRetried =
      init?.headers instanceof Headers
        ? init.headers.has("X-Drapeon-Auth-Retry")
        : Array.isArray(init?.headers)
          ? init.headers.some(([key]) => key.toLowerCase() === "x-drapeon-auth-retry")
          : Boolean(init?.headers?.["X-Drapeon-Auth-Retry"]);

    if (response.status === 401 && path !== "/auth/refresh" && !hasRetried) {
      const refreshed = await refreshAuthSession();

      if (refreshed) {
        const retryHeaders = {
          ...(init?.headers ?? {}),
          Authorization: `Bearer ${refreshed.tokens.accessToken}`,
          "X-Drapeon-Auth-Retry": "1"
        };

        return requestApi<T>(path, {
          ...init,
          headers: retryHeaders
        });
      }
    }

    const message = extractErrorMessage(payload) ?? "Request failed";
    throw new Error(message);
  }

  return extractData<T>(payload);
}

async function refreshAuthSession(): Promise<AuthSession | null> {
  const session = readAuthSession();

  if (!session?.tokens.refreshToken) {
    return null;
  }

  try {
    const tokens = await requestApi<AuthSession["tokens"]>("/auth/refresh", {
      method: "POST",
      body: JSON.stringify({ refreshToken: session.tokens.refreshToken })
    });
    const refreshedSession: AuthSession = {
      ...session,
      tokens
    };

    persistAuthSession(refreshedSession);

    return refreshedSession;
  } catch {
    clearAuthSession();
    return null;
  }
}

export async function fetchCatalogProducts(
  filters: Record<string, string | number> = { limit: 24 }
): Promise<{ items: CatalogProduct[]; total: number }> {
  const apiBase = apiBaseUrl();
  const searchParams = new URLSearchParams();
  
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== "") {
      searchParams.set(key, String(value));
    }
  }

  const endpoint = `${apiBase}/api/products?${searchParams.toString()}`;

  try {
    const response = await fetch(endpoint);

    if (!response.ok) {
      return { items: FALLBACK_PRODUCTS, total: FALLBACK_PRODUCTS.length };
    }

    const payload = extractData<ProductListPayload & { pagination?: { total: number } }>(
      await response.json()
    );

    if (!payload?.items) {
      return { items: FALLBACK_PRODUCTS, total: FALLBACK_PRODUCTS.length };
    }

    return { 
      items: payload.items.map(normalizeProduct),
      total: payload.pagination?.total ?? payload.items.length
    };
  } catch {
    return { items: FALLBACK_PRODUCTS, total: FALLBACK_PRODUCTS.length };
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
  measurements: {
    bodyShape: string;
    heightCm: number;
    weightKg: number;
    chestCm: number;
    waistCm: number;
    hipCm: number;
    shoulderCm: number;
    inseamCm: number;
    notes?: string;
  };
}): Promise<AuthSession> {
  return requestApi<AuthSession>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function requestPasswordReset(payload: {
  email: string;
}): Promise<{ delivered: boolean; message: string }> {
  return requestApi<{ delivered: boolean; message: string }>("/auth/forgot-password", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function resetPasswordWithToken(payload: {
  token: string;
  password: string;
}): Promise<{ reset: boolean; message: string }> {
  return requestApi<{ reset: boolean; message: string }>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function verifyEmailToken(payload: {
  token: string;
}): Promise<{ verified: boolean; message: string }> {
  return requestApi<{ verified: boolean; message: string }>("/auth/verify-email", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function applyToBecomeDesigner(
  payload: BecomeDesignerPayload
): Promise<AuthSession> {
  return requestApi<AuthSession>("/auth/become-designer", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
}

export function persistAuthSession(session: AuthSession): void {
  const serialized = JSON.stringify(session);

  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(authStorageKey, serialized);
  window.sessionStorage.setItem(authStorageKey, serialized);
  emitAuthSessionChange("updated");
}

export function readAuthSession(): AuthSession | null {
  try {
    const primaryValue = readBrowserStorage(authStorageKey);

    if (primaryValue) {
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(authStorageKey, primaryValue);
      }
      return JSON.parse(primaryValue) as AuthSession;
    }

    const sessionValue =
      typeof window === "undefined" ? null : window.sessionStorage.getItem(authStorageKey);

    if (sessionValue) {
      writeBrowserStorage(authStorageKey, sessionValue);
      return JSON.parse(sessionValue) as AuthSession;
    }
  } catch {
    return null;
  }

  return null;
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") {
    return;
  }

  window.sessionStorage.removeItem(authStorageKey);
  removeBrowserStorage(authStorageKey);
  emitAuthSessionChange("cleared");
}

export function subscribeToAuthSession(listener: (session: AuthSession | null) => void): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const channel = getAuthBroadcastChannel();
  const notify = () => {
    listener(readAuthSession());
  };
  const handleStorage = (event: StorageEvent) => {
    if (event.key === authStorageKey || event.key === authEventKey) {
      notify();
    }
  };
  const handleCustomEvent = () => {
    notify();
  };
  const handleVisibility = () => {
    if (document.visibilityState === "visible") {
      notify();
    }
  };
  const handleFocus = () => {
    notify();
  };
  const handleChannelMessage = () => {
    notify();
  };

  window.addEventListener("storage", handleStorage);
  window.addEventListener(authCustomEvent, handleCustomEvent as EventListener);
  channel?.addEventListener("message", handleChannelMessage);

  return () => {
    window.removeEventListener("storage", handleStorage);
    window.removeEventListener(authCustomEvent, handleCustomEvent as EventListener);
    channel?.removeEventListener("message", handleChannelMessage);
    channel?.close();
  };
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

export async function sendContactMessage(payload: {
  name: string;
  email: string;
  topic: string;
  message: string;
}): Promise<{ delivered: boolean; provider: string; message: string }> {
  return requestApi<{ delivered: boolean; provider: string; message: string }>("/contact", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export async function updateDesignerProduct(
  productId: string,
  payload: DesignerProductPayload
): Promise<DesignerProduct> {
  return requestApi<DesignerProduct>(`/designers/products/${productId}`, {
    method: "PUT",
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

export async function fetchDesignerAppointments(): Promise<DesignerDashboard["appointments"]> {
  const payload = await requestApi<
    | DesignerDashboard["appointments"]
    | { appointments?: DesignerDashboard["appointments"]; items?: DesignerDashboard["appointments"] }
  >("/designers/appointments", {
    headers: authHeaders()
  });

  if (Array.isArray(payload)) {
    return payload;
  }

  if (payload && Array.isArray(payload.appointments)) {
    return payload.appointments;
  }

  if (payload && Array.isArray(payload.items)) {
    return payload.items;
  }

  return [];
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

export async function fetchSubscriptionPlans(): Promise<{
  items: DesignerSubscriptionPlan[];
}> {
  return requestApi<{ items: DesignerSubscriptionPlan[] }>("/payments/subscriptions/plans");
}

export async function createDesignerSubscriptionCheckout(
  planId: string
): Promise<DesignerSubscriptionActionResponse> {
  return requestApi<DesignerSubscriptionActionResponse>("/payments/subscriptions/checkout", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({ planId })
  });
}

export async function createDesignerBillingPortal(): Promise<DesignerSubscriptionActionResponse> {
  return requestApi<DesignerSubscriptionActionResponse>("/payments/subscriptions/portal", {
    method: "POST",
    headers: authHeaders()
  });
}

export async function fetchCurrentUserProfile(): Promise<UserProfile> {
  return requestApi<UserProfile>("/users/me", {
    headers: authHeaders()
  });
}

export async function updateCurrentUserProfile(payload: {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  avatarUrl?: string;
  preferences?: Record<string, unknown>;
}): Promise<UserProfile> {
  return requestApi<UserProfile>("/users/me", {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
}

export async function updateCurrentUserMeasurements(payload: {
  bodyShape?: string;
  heightCm?: number;
  weightKg?: number;
  chestCm?: number;
  waistCm?: number;
  hipCm?: number;
  shoulderCm?: number;
  inseamCm?: number;
  notes?: string;
}): Promise<UserProfile["measurements"]> {
  return requestApi<UserProfile["measurements"]>("/users/me/measurements", {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
}

export async function fetchMyBookings(): Promise<UserBooking[]> {
  return requestApi<UserBooking[]>("/bookings/me", {
    headers: authHeaders()
  });
}

export async function createFittingBooking(payload: {
  productId: string;
  designerId: string;
  variantId?: string;
  startsAt: string;
  endsAt: string;
}): Promise<UserBooking> {
  return requestApi<UserBooking>("/bookings", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify({
      ...payload,
      type: "FITTING"
    })
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

export async function fetchAdminUsers(query = ""): Promise<PaginatedAdmin<AdminUserRow>> {
  return requestApi<PaginatedAdmin<AdminUserRow>>(`/admin/users${query}`, {
    headers: authHeaders()
  });
}

export async function updateAdminUserStatus(userId: string, status: string): Promise<AdminUserRow> {
  return requestApi<AdminUserRow>(`/admin/users/${userId}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });
}

export async function resetAdminUserAccount(userId: string): Promise<void> {
  await requestApi(`/admin/users/${userId}/reset`, {
    method: "POST",
    headers: authHeaders()
  });
}

export async function fetchAdminDesigners(query = ""): Promise<PaginatedAdmin<AdminDesignerRow>> {
  return requestApi<PaginatedAdmin<AdminDesignerRow>>(`/admin/designers${query}`, {
    headers: authHeaders()
  });
}

export async function updateAdminDesignerApproval(
  designerId: string,
  status: string
): Promise<AdminDesignerRow> {
  return requestApi<AdminDesignerRow>(`/admin/designers/${designerId}/approval`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });
}

export async function fetchAdminProducts(query = ""): Promise<PaginatedAdmin<AdminProductRow>> {
  return requestApi<PaginatedAdmin<AdminProductRow>>(`/admin/products${query}`, {
    headers: authHeaders()
  });
}

export async function updateAdminProductStatus(
  productId: string,
  status: string
): Promise<AdminProductRow> {
  return requestApi<AdminProductRow>(`/admin/products/${productId}/status`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify({ status })
  });
}

export async function fetchAdminOperations<T = unknown>(): Promise<T> {
  return requestApi<T>("/admin/operations", {
    headers: authHeaders()
  });
}

export async function fetchAdminPayments<T = unknown>(query = ""): Promise<T> {
  return requestApi<T>(`/admin/payments${query}`, {
    headers: authHeaders()
  });
}

export async function fetchAdminAnalytics<T = unknown>(query = ""): Promise<T> {
  return requestApi<T>(`/admin/analytics${query}`, {
    headers: authHeaders()
  });
}

export async function fetchAdminAiMonitoring<T = unknown>(query = ""): Promise<T> {
  return requestApi<T>(`/admin/ai${query}`, {
    headers: authHeaders()
  });
}

export async function fetchAdminNotifications<T = unknown>(): Promise<T> {
  return requestApi<T>("/admin/notifications", {
    headers: authHeaders()
  });
}

export async function fetchAdminSettings<T = unknown>(): Promise<T> {
  return requestApi<T>("/admin/settings", {
    headers: authHeaders()
  });
}

export async function chatWithAi(payload: {
  prompt: string;
  filters?: Record<string, unknown>;
  measurements?: Record<string, unknown>;
  history?: AiHistoryMessage[];
}): Promise<AiChatResponse> {
  return requestApi<AiChatResponse>("/ai/recommendations", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
}

export async function fetchAdminKnowledge(query = ""): Promise<
  PaginatedAdmin<AdminKnowledgeEntry> & { pinecone: { configured: boolean } }
> {
  return requestApi<PaginatedAdmin<AdminKnowledgeEntry> & { pinecone: { configured: boolean } }>(
    `/admin/knowledge${query}`,
    {
      headers: authHeaders()
    }
  );
}

export async function createAdminKnowledge(payload: {
  question: string;
  answer: string;
  category?: string;
  tags?: string[];
  isPublished?: boolean;
}): Promise<AdminKnowledgeEntry> {
  return requestApi<AdminKnowledgeEntry>("/admin/knowledge", {
    method: "POST",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
}

export async function updateAdminKnowledge(
  id: string,
  payload: {
    question: string;
    answer: string;
    category?: string;
    tags?: string[];
    isPublished?: boolean;
  }
): Promise<AdminKnowledgeEntry> {
  return requestApi<AdminKnowledgeEntry>(`/admin/knowledge/${id}`, {
    method: "PATCH",
    headers: authHeaders(),
    body: JSON.stringify(payload)
  });
}

export async function deleteAdminKnowledge(id: string): Promise<{ deleted: boolean }> {
  return requestApi<{ deleted: boolean }>(`/admin/knowledge/${id}`, {
    method: "DELETE",
    headers: authHeaders()
  });
}

export async function syncAdminKnowledge(): Promise<{ synced: number; configured: boolean }> {
  return requestApi<{ synced: number; configured: boolean }>("/admin/knowledge/sync", {
    method: "POST",
    headers: authHeaders()
  });
}
