import type { AppLocale } from "../../i18n";

export type StoreMessageKey =
  | "storeName"
  | "sandboxPill"
  | "sandboxHint"
  | "home"
  | "catalog"
  | "search"
  | "searchPlaceholder"
  | "cart"
  | "checkout"
  | "orders"
  | "favorites"
  | "returns"
  | "seller"
  | "admin"
  | "partners"
  | "providers"
  | "economics"
  | "backHub"
  | "heroEyebrow"
  | "heroTitle"
  | "heroBody"
  | "shopCatalog"
  | "featured"
  | "allProducts"
  | "addToCart"
  | "addedToCart"
  | "viewCart"
  | "favorite"
  | "favorited"
  | "emptyCart"
  | "emptyFavorites"
  | "emptySearch"
  | "continueShopping"
  | "filterCategory"
  | "allCategories"
  | "sort"
  | "sortFeatured"
  | "sortPriceAsc"
  | "sortPriceDesc"
  | "sortTitle"
  | "results"
  | "price"
  | "variant"
  | "quantity"
  | "digitalStock"
  | "physicalStock"
  | "listingFacts"
  | "howListingWorks"
  | "soldBy"
  | "fulfillmentMode"
  | "noReviews"
  | "noRatings"
  | "noDiscount"
  | "noDeliveryPromise"
  | "demoOnly"
  | "checkoutTitle"
  | "address"
  | "shipping"
  | "payment"
  | "addressName"
  | "addressLine"
  | "city"
  | "region"
  | "postal"
  | "country"
  | "shipStandard"
  | "shipExpress"
  | "shipDigital"
  | "notAPromise"
  | "paySuccess"
  | "payDeclined"
  | "payProcessing"
  | "payCancelled"
  | "payNote"
  | "noCard"
  | "paymentMode"
  | "orderPlaced"
  | "orderDeclined"
  | "orderPending"
  | "orderCancelled"
  | "viewOrder"
  | "orderDetail"
  | "requestReturn"
  | "requestRefund"
  | "completeRefundDemo"
  | "returnPending"
  | "refundPending"
  | "refundedDemo"
  | "multiSellerNote"
  | "sellerDashboard"
  | "sellerProducts"
  | "sellerAnalytics"
  | "sellerFinance"
  | "sellerProfile"
  | "noPayout"
  | "adminTitle"
  | "adminBody"
  | "cannotActivate"
  | "activateDenied"
  | "prospectiveTitle"
  | "planningOnly"
  | "notPartner"
  | "unknownDeny"
  | "economicsTitle"
  | "economicsDisclaimer"
  | "providerModelsTitle"
  | "providerModelsBody"
  | "ownedByUmtuba"
  | "syntheticPreview"
  | "remove"
  | "subtotal"
  | "total"
  | "emptyOrders"
  | "afterSale"
  | "sellerOrders"
  | "viewsDemo"
  | "clicksDemo"
  | "pendingPayout"
  | "listingsLabel"
  | "rightsLabel"
  | "statusProspective"
  | "noLogo"
  | "noCatalogImport";

type Catalog = Record<StoreMessageKey, string>;

const en: Catalog = {
  storeName: "UMTUBA Store",
  sandboxPill: "SANDBOX",
  sandboxHint: "Preview · synthetic catalog · no real payment",
  home: "Home",
  catalog: "Catalog",
  search: "Search",
  searchPlaceholder: "Search the sandbox catalog",
  cart: "Cart",
  checkout: "Checkout",
  orders: "Orders",
  favorites: "Favorites",
  returns: "Returns",
  seller: "Seller",
  admin: "Store admin",
  partners: "Prospective partners",
  providers: "Provider models",
  economics: "Economics",
  backHub: "Sandbox hub",
  heroEyebrow: "Future marketplace preview",
  heroTitle: "A calm store you can click through",
  heroBody:
    "Twenty-six UMTUBA-owned demo concepts. No live partners, no real inventory, no real charge.",
  shopCatalog: "Browse catalog",
  featured: "Featured concepts",
  allProducts: "All demo products",
  addToCart: "Add to cart",
  addedToCart: "Added to sandbox cart",
  viewCart: "View cart",
  favorite: "Save",
  favorited: "Saved",
  emptyCart: "Your sandbox cart is empty.",
  emptyFavorites: "No saved items yet.",
  emptySearch: "No demo products match this search.",
  continueShopping: "Continue shopping",
  filterCategory: "Category",
  allCategories: "All categories",
  sort: "Sort",
  sortFeatured: "Featured",
  sortPriceAsc: "Price · low to high",
  sortPriceDesc: "Price · high to low",
  sortTitle: "Title",
  results: "results",
  price: "Price",
  variant: "Option",
  quantity: "Quantity",
  digitalStock: "Digital delivery · no stock count",
  physicalStock: "Sandbox stock preview",
  listingFacts: "Listing facts",
  howListingWorks: "How this listing works",
  soldBy: "Sold by",
  fulfillmentMode: "Fulfillment model",
  noReviews: "No reviews in this preview. We do not invent ratings.",
  noRatings: "No star ratings.",
  noDiscount: "No promotional discount.",
  noDeliveryPromise: "No delivery date is promised.",
  demoOnly: "DEMO",
  checkoutTitle: "Sandbox checkout",
  address: "Address",
  shipping: "Shipping",
  payment: "Payment",
  addressName: "Name",
  addressLine: "Street",
  city: "City",
  region: "Region",
  postal: "Postal code",
  country: "Country",
  shipStandard: "Sandbox standard",
  shipExpress: "Sandbox express",
  shipDigital: "Digital delivery",
  notAPromise: "Not a delivery promise",
  paySuccess: "Simulate success",
  payDeclined: "Simulate declined",
  payProcessing: "Simulate processing",
  payCancelled: "Cancel payment",
  payNote: "Mock adapter only. PAYMENT_MODE=SANDBOX. No card number is collected.",
  noCard: "Do not enter a real card. This field is not shown on purpose.",
  paymentMode: "PAYMENT_MODE=SANDBOX",
  orderPlaced: "Sandbox order placed. No money moved.",
  orderDeclined: "Mock payment declined. Cart is unchanged.",
  orderPending: "Mock payment is processing. No charge occurred.",
  orderCancelled: "Mock payment cancelled. Cart is unchanged.",
  viewOrder: "View order",
  orderDetail: "Order",
  requestReturn: "Request return (demo)",
  requestRefund: "Request refund (demo)",
  completeRefundDemo: "Mark refunded (demo)",
  returnPending: "Return pending (demo)",
  refundPending: "Refund pending (demo)",
  refundedDemo: "Refunded (demo)",
  multiSellerNote: "This preview order includes more than one seller. Split is UX only.",
  sellerDashboard: "Seller dashboard",
  sellerProducts: "Product management",
  sellerAnalytics: "Analytics (demo)",
  sellerFinance: "Financial preview",
  sellerProfile: "Seller profile",
  noPayout: "Payout is off. No settlement.",
  adminTitle: "Store admin",
  adminBody: "Prospective partners cannot become ACTIVE in this sandbox.",
  cannotActivate: "Cannot activate",
  activateDenied: "Denied. Prospective records stay PROSPECTIVE.",
  prospectiveTitle: "Prospective commerce names",
  planningOnly: "Planning labels only. Not a contract. No imported catalog.",
  notPartner: "NOT AN UMTUBA PARTNER",
  unknownDeny: "UNKNOWN rights = DENY",
  economicsTitle: "Synthetic economics",
  economicsDisclaimer: "Sandbox shares only. Not a forecast, not accounting, not a legal commitment.",
  providerModelsTitle: "Provider models",
  providerModelsBody: "Ownership and rights for each commerce mode. Prospective names stay unlabeled as partners.",
  ownedByUmtuba: "UMTUBA owned",
  syntheticPreview: "Synthetic preview",
  remove: "Remove",
  subtotal: "Subtotal",
  total: "Total",
  emptyOrders: "No shopper orders yet. Complete a sandbox checkout to create one.",
  afterSale: "After-sale",
  sellerOrders: "Seller orders (demo)",
  viewsDemo: "Views (demo)",
  clicksDemo: "Clicks (demo)",
  pendingPayout: "Pending payout",
  listingsLabel: "Listings",
  rightsLabel: "Rights",
  statusProspective: "PROSPECTIVE",
  noLogo: "No logo",
  noCatalogImport: "Catalog imported = NO",
};

const ar: Catalog = {
  storeName: "متجر أمتوبا",
  sandboxPill: "صندوق تجريبي",
  sandboxHint: "معاينة · كتالوج اصطناعي · لا دفعة حقيقية",
  home: "الرئيسية",
  catalog: "الكتالوج",
  search: "بحث",
  searchPlaceholder: "ابحث في كتالوج الصندوق التجريبي",
  cart: "السلة",
  checkout: "إتمام الشراء",
  orders: "الطلبات",
  favorites: "المفضلة",
  returns: "الإرجاع",
  seller: "البائع",
  admin: "إدارة المتجر",
  partners: "شركاء محتملون",
  providers: "نماذج المزوّدين",
  economics: "الاقتصاد",
  backHub: "مركز الصندوق",
  heroEyebrow: "معاينة سوق المستقبل",
  heroTitle: "متجر هادئ يمكنك تصفّحه بالنقر",
  heroBody: "ستة وعشرون مفهوماً تجريبياً تملكه أمتوبا. لا شركاء أحياء، ولا مخزون حقيقي، ولا رسوم حقيقية.",
  shopCatalog: "تصفّح الكتالوج",
  featured: "مفاهيم مميّزة",
  allProducts: "كل المنتجات التجريبية",
  addToCart: "أضف إلى السلة",
  addedToCart: "أُضيف إلى سلة الصندوق",
  viewCart: "عرض السلة",
  favorite: "حفظ",
  favorited: "محفوظ",
  emptyCart: "سلة الصندوق فارغة.",
  emptyFavorites: "لا عناصر محفوظة بعد.",
  emptySearch: "لا منتجات تجريبية تطابق هذا البحث.",
  continueShopping: "متابعة التسوّق",
  filterCategory: "التصنيف",
  allCategories: "كل التصنيفات",
  sort: "ترتيب",
  sortFeatured: "مميّز",
  sortPriceAsc: "السعر · من الأقل للأعلى",
  sortPriceDesc: "السعر · من الأعلى للأقل",
  sortTitle: "العنوان",
  results: "نتائج",
  price: "السعر",
  variant: "الخيار",
  quantity: "الكمية",
  digitalStock: "تسليم رقمي · لا عدد مخزون",
  physicalStock: "معاينة مخزون الصندوق",
  listingFacts: "حقائق العرض",
  howListingWorks: "كيف يعمل هذا العرض",
  soldBy: "يُباع بواسطة",
  fulfillmentMode: "نموذج التنفيذ",
  noReviews: "لا مراجعات في هذه المعاينة. لا نخترع تقييمات.",
  noRatings: "لا تقييمات بالنجوم.",
  noDiscount: "لا خصم ترويجي.",
  noDeliveryPromise: "لا يُوعد بتاريخ تسليم.",
  demoOnly: "تجريبي",
  checkoutTitle: "دفع الصندوق التجريبي",
  address: "العنوان",
  shipping: "الشحن",
  payment: "الدفع",
  addressName: "الاسم",
  addressLine: "الشارع",
  city: "المدينة",
  region: "المنطقة",
  postal: "الرمز البريدي",
  country: "البلد",
  shipStandard: "شحن قياسي للصندوق",
  shipExpress: "شحن سريع للصندوق",
  shipDigital: "تسليم رقمي",
  notAPromise: "ليس وعداً بالتسليم",
  paySuccess: "محاكاة نجاح",
  payDeclined: "محاكاة رفض",
  payProcessing: "محاكاة معالجة",
  payCancelled: "إلغاء الدفع",
  payNote: "محوّل وهمي فقط. وضع الدفع = صندوق تجريبي. لا يُجمع رقم بطاقة.",
  noCard: "لا تُدخل بطاقة حقيقية. حقل البطاقة غير معروض عمداً.",
  paymentMode: "وضع الدفع = صندوق تجريبي",
  orderPlaced: "تم إنشاء طلب الصندوق. لم تُنقل أموال.",
  orderDeclined: "رُفض الدفع الوهمي. السلة كما هي.",
  orderPending: "الدفع الوهمي قيد المعالجة. لم يحدث خصم.",
  orderCancelled: "أُلغي الدفع الوهمي. السلة كما هي.",
  viewOrder: "عرض الطلب",
  orderDetail: "الطلب",
  requestReturn: "طلب إرجاع (تجريبي)",
  requestRefund: "طلب استرداد (تجريبي)",
  completeRefundDemo: "تعليم كمسترد (تجريبي)",
  returnPending: "إرجاع معلّق (تجريبي)",
  refundPending: "استرداد معلّق (تجريبي)",
  refundedDemo: "تم الاسترداد (تجريبي)",
  multiSellerNote: "يشمل هذا الطلب أكثر من بائع. التقسيم للعرض فقط.",
  sellerDashboard: "لوحة البائع",
  sellerProducts: "إدارة المنتجات",
  sellerAnalytics: "تحليلات (تجريبية)",
  sellerFinance: "معاينة مالية",
  sellerProfile: "ملف البائع",
  noPayout: "التحويلات متوقفة. لا تسوية.",
  adminTitle: "إدارة المتجر",
  adminBody: "لا يمكن للشركاء المحتملين أن يصبحوا نشطين في هذا الصندوق.",
  cannotActivate: "تعذّر التفعيل",
  activateDenied: "مرفوض. السجلات المحتملة تبقى محتملة.",
  prospectiveTitle: "أسماء تجارية محتملة",
  planningOnly: "تسميات تخطيط فقط. ليست عقداً. لا كتالوج مستورد.",
  notPartner: "ليس شريكاً في أمتوبا",
  unknownDeny: "الحقوق غير المعروفة = رفض",
  economicsTitle: "اقتصاد اصطناعي",
  economicsDisclaimer: "حصص الصندوق فقط. ليست توقعاً ولا محاسبة ولا التزاماً قانونياً.",
  providerModelsTitle: "نماذج المزوّدين",
  providerModelsBody: "الملكية والحقوق لكل نمط تجاري. الأسماء المحتملة لا تُعامل كشركاء.",
  ownedByUmtuba: "مملوك لأمتوبا",
  syntheticPreview: "معاينة اصطناعية",
  remove: "إزالة",
  subtotal: "المجموع الفرعي",
  total: "الإجمالي",
  emptyOrders: "لا طلبات بعد. أتمم دفع الصندوق لإنشاء طلب.",
  afterSale: "ما بعد البيع",
  sellerOrders: "طلبات البائع (تجريبية)",
  viewsDemo: "مشاهدات (تجريبية)",
  clicksDemo: "نقرات (تجريبية)",
  pendingPayout: "تحويل معلّق",
  listingsLabel: "العروض",
  rightsLabel: "الحقوق",
  statusProspective: "محتمل",
  noLogo: "لا شعار",
  noCatalogImport: "استيراد الكتالوج = لا",
};

const fr: Catalog = {
  ...en,
  storeName: "Boutique UMTUBA",
  sandboxHint: "Aperçu · catalogue synthétique · aucun paiement réel",
  home: "Accueil",
  catalog: "Catalogue",
  search: "Recherche",
  searchPlaceholder: "Rechercher le catalogue bac à sable",
  cart: "Panier",
  checkout: "Paiement",
  orders: "Commandes",
  favorites: "Favoris",
  returns: "Retours",
  seller: "Vendeur",
  admin: "Admin boutique",
  partners: "Partenaires prospectifs",
  providers: "Modèles prestataires",
  economics: "Économie",
  heroTitle: "Une boutique calme à parcourir",
  addToCart: "Ajouter au panier",
  emptyCart: "Le panier bac à sable est vide.",
};

const es: Catalog = {
  ...en,
  storeName: "Tienda UMTUBA",
  sandboxHint: "Vista previa · catálogo sintético · sin pago real",
  home: "Inicio",
  catalog: "Catálogo",
  search: "Buscar",
  cart: "Carrito",
  checkout: "Pago",
  orders: "Pedidos",
  favorites: "Favoritos",
  returns: "Devoluciones",
  seller: "Vendedor",
  admin: "Admin de tienda",
  partners: "Socios prospectivos",
  providers: "Modelos de proveedor",
  economics: "Economía",
  heroTitle: "Una tienda calmada para recorrer",
  addToCart: "Añadir al carrito",
  emptyCart: "El carrito del sandbox está vacío.",
};

const de: Catalog = {
  ...en,
  storeName: "UMTUBA-Shop",
  sandboxHint: "Vorschau · synthetischer Katalog · keine echte Zahlung",
  home: "Start",
  catalog: "Katalog",
  search: "Suche",
  cart: "Warenkorb",
  checkout: "Kasse",
  orders: "Bestellungen",
  favorites: "Favoriten",
  returns: "Rücksendungen",
  seller: "Verkäufer",
  admin: "Shop-Admin",
  partners: "Mögliche Partner",
  providers: "Anbietermodelle",
  economics: "Ökonomie",
  heroTitle: "Ein ruhiger Shop zum Durchklicken",
  addToCart: "In den Warenkorb",
  emptyCart: "Der Sandbox-Warenkorb ist leer.",
};

const pt: Catalog = {
  ...en,
  storeName: "Loja UMTUBA",
  sandboxHint: "Pré-visualização · catálogo sintético · sem pagamento real",
  home: "Início",
  catalog: "Catálogo",
  search: "Pesquisar",
  cart: "Carrinho",
  checkout: "Checkout",
  orders: "Encomendas",
  favorites: "Favoritos",
  returns: "Devoluções",
  seller: "Vendedor",
  admin: "Admin da loja",
  partners: "Parceiros prospetivos",
  providers: "Modelos de fornecedor",
  economics: "Economia",
  heroTitle: "Uma loja calma para percorrer",
  addToCart: "Adicionar ao carrinho",
  emptyCart: "O carrinho da sandbox está vazio.",
};

const CATALOGS: Record<AppLocale, Catalog> = { ar, en, fr, es, de, pt };

export function storeMessages(locale: AppLocale): Catalog {
  return CATALOGS[locale] ?? en;
}

export function storeT(locale: AppLocale, key: StoreMessageKey): string {
  return storeMessages(locale)[key] ?? en[key];
}

export const STORE_MESSAGE_KEYS = Object.keys(en) as StoreMessageKey[];

export function catalogHasArabicScript(locale: AppLocale): boolean {
  if (locale !== "ar") return true;
  return /[\u0600-\u06FF]/.test(storeT("ar", "heroTitle") + storeT("ar", "addToCart") + storeT("ar", "checkoutTitle"));
}
