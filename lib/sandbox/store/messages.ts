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
  sandboxPill: "SANDBOX",
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
  backHub: "Hub sandbox",
  heroEyebrow: "Aperçu du futur marketplace",
  heroTitle: "Une boutique calme à parcourir",
  heroBody:
    "Vingt-six concepts démo détenus par UMTUBA. Aucun partenaire en ligne, aucun stock réel, aucun débit réel.",
  shopCatalog: "Parcourir le catalogue",
  featured: "Concepts en avant",
  allProducts: "Tous les produits démo",
  addToCart: "Ajouter au panier",
  addedToCart: "Ajouté au panier sandbox",
  viewCart: "Voir le panier",
  favorite: "Enregistrer",
  favorited: "Enregistré",
  emptyCart: "Le panier bac à sable est vide.",
  emptyFavorites: "Aucun article enregistré pour le moment.",
  emptySearch: "Aucun produit démo ne correspond à cette recherche.",
  continueShopping: "Continuer les achats",
  filterCategory: "Catégorie",
  allCategories: "Toutes les catégories",
  sort: "Trier",
  sortFeatured: "En avant",
  sortPriceAsc: "Prix · croissant",
  sortPriceDesc: "Prix · décroissant",
  sortTitle: "Titre",
  results: "résultats",
  price: "Prix",
  variant: "Option",
  quantity: "Quantité",
  digitalStock: "Livraison numérique · pas de stock",
  physicalStock: "Aperçu de stock sandbox",
  listingFacts: "Faits de l’annonce",
  howListingWorks: "Comment fonctionne cette annonce",
  soldBy: "Vendu par",
  fulfillmentMode: "Modèle d’exécution",
  noReviews: "Aucun avis dans cet aperçu. Nous n’inventons pas de notes.",
  noRatings: "Aucune note par étoiles.",
  noDiscount: "Aucune remise promotionnelle.",
  noDeliveryPromise: "Aucune date de livraison n’est promise.",
  demoOnly: "DÉMO",
  checkoutTitle: "Paiement sandbox",
  address: "Adresse",
  shipping: "Livraison",
  payment: "Paiement",
  addressName: "Nom",
  addressLine: "Rue",
  city: "Ville",
  region: "Région",
  postal: "Code postal",
  country: "Pays",
  shipStandard: "Standard sandbox",
  shipExpress: "Express sandbox",
  shipDigital: "Livraison numérique",
  notAPromise: "Pas une promesse de livraison",
  paySuccess: "Simuler le succès",
  payDeclined: "Simuler le refus",
  payProcessing: "Simuler le traitement",
  payCancelled: "Annuler le paiement",
  payNote: "Adaptateur fictif seulement. PAYMENT_MODE=SANDBOX. Aucun numéro de carte n’est collecté.",
  noCard: "N’entrez pas de vraie carte. Ce champ n’est pas affiché volontairement.",
  paymentMode: "PAYMENT_MODE=SANDBOX",
  orderPlaced: "Commande sandbox passée. Aucun argent n’a bougé.",
  orderDeclined: "Paiement fictif refusé. Le panier est inchangé.",
  orderPending: "Le paiement fictif est en cours. Aucun débit.",
  orderCancelled: "Paiement fictif annulé. Le panier est inchangé.",
  viewOrder: "Voir la commande",
  orderDetail: "Commande",
  requestReturn: "Demander un retour (démo)",
  requestRefund: "Demander un remboursement (démo)",
  completeRefundDemo: "Marquer remboursé (démo)",
  returnPending: "Retour en attente (démo)",
  refundPending: "Remboursement en attente (démo)",
  refundedDemo: "Remboursé (démo)",
  multiSellerNote: "Cette commande d’aperçu inclut plus d’un vendeur. La séparation est UX seulement.",
  sellerDashboard: "Tableau vendeur",
  sellerProducts: "Gestion des produits",
  sellerAnalytics: "Analytique (démo)",
  sellerFinance: "Aperçu financier",
  sellerProfile: "Profil vendeur",
  noPayout: "Le versement est désactivé. Aucun règlement.",
  adminTitle: "Admin boutique",
  adminBody: "Les partenaires prospectifs ne peuvent pas devenir ACTIFS dans ce sandbox.",
  cannotActivate: "Impossible d’activer",
  activateDenied: "Refusé. Les dossiers prospectifs restent PROSPECTIFS.",
  prospectiveTitle: "Noms commerciaux prospectifs",
  planningOnly: "Libellés de planification seulement. Pas un contrat. Pas de catalogue importé.",
  notPartner: "PAS UN PARTENAIRE UMTUBA",
  unknownDeny: "Droits INCONNUS = REFUS",
  economicsTitle: "Économie synthétique",
  economicsDisclaimer: "Parts sandbox seulement. Pas une prévision, pas une comptabilité, pas un engagement juridique.",
  providerModelsTitle: "Modèles prestataires",
  providerModelsBody: "Propriété et droits pour chaque mode commerce. Les noms prospectifs restent non étiquetés comme partenaires.",
  ownedByUmtuba: "Détenu par UMTUBA",
  syntheticPreview: "Aperçu synthétique",
  remove: "Retirer",
  subtotal: "Sous-total",
  total: "Total",
  emptyOrders: "Aucune commande acheteur pour le moment. Terminez un paiement sandbox pour en créer une.",
  afterSale: "Après-vente",
  sellerOrders: "Commandes vendeur (démo)",
  viewsDemo: "Vues (démo)",
  clicksDemo: "Clics (démo)",
  pendingPayout: "Versement en attente",
  listingsLabel: "Annonces",
  rightsLabel: "Droits",
  statusProspective: "PROSPECTIF",
  noLogo: "Pas de logo",
  noCatalogImport: "Catalogue importé = NON",
};

const es: Catalog = {
  ...en,
  storeName: "Tienda UMTUBA",
  sandboxHint: "Vista previa · catálogo sintético · sin pago real",
  home: "Inicio",
  catalog: "Catálogo",
  search: "Buscar",
  searchPlaceholder: "Buscar el catálogo del sandbox",
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
  backHub: "Hub del sandbox",
  heroEyebrow: "Vista previa del futuro marketplace",
  heroTitle: "Una tienda calmada para recorrer",
  heroBody:
    "Veintiséis conceptos demo de UMTUBA. Sin socios en vivo, sin inventario real, sin cargo real.",
  shopCatalog: "Explorar catálogo",
  featured: "Conceptos destacados",
  allProducts: "Todos los productos demo",
  addToCart: "Añadir al carrito",
  addedToCart: "Añadido al carrito del sandbox",
  viewCart: "Ver carrito",
  favorite: "Guardar",
  favorited: "Guardado",
  emptyCart: "El carrito del sandbox está vacío.",
  emptyFavorites: "Aún no hay artículos guardados.",
  emptySearch: "Ningún producto demo coincide con esta búsqueda.",
  continueShopping: "Seguir comprando",
  filterCategory: "Categoría",
  allCategories: "Todas las categorías",
  sort: "Ordenar",
  sortFeatured: "Destacados",
  sortPriceAsc: "Precio · menor a mayor",
  sortPriceDesc: "Precio · mayor a menor",
  sortTitle: "Título",
  results: "resultados",
  price: "Precio",
  variant: "Opción",
  quantity: "Cantidad",
  checkoutTitle: "Pago sandbox",
  address: "Dirección",
  shipping: "Envío",
  payment: "Pago",
  city: "Ciudad",
  country: "País",
  paySuccess: "Simular éxito",
  payDeclined: "Simular rechazo",
  viewOrder: "Ver pedido",
  rightsLabel: "Derechos",
  notPartner: "NO ES UN SOCIO DE UMTUBA",
  unknownDeny: "Derechos UNKNOWN = DENEGAR",
  providerModelsTitle: "Modelos de proveedor",
  providerModelsBody: "Propiedad y derechos de cada modo comercial. Los nombres prospectivos no se etiquetan como socios.",
  remove: "Quitar",
  subtotal: "Subtotal",
  total: "Total",
  emptyOrders: "Aún no hay pedidos. Completa un pago sandbox para crear uno.",
  noPayout: "El pago al vendedor está desactivado. Sin liquidación.",
};

const de: Catalog = {
  ...en,
  storeName: "UMTUBA-Shop",
  sandboxHint: "Vorschau · synthetischer Katalog · keine echte Zahlung",
  home: "Start",
  catalog: "Katalog",
  search: "Suche",
  searchPlaceholder: "Sandbox-Katalog durchsuchen",
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
  backHub: "Sandbox-Hub",
  heroEyebrow: "Vorschau des künftigen Marktplatzes",
  heroTitle: "Ein ruhiger Shop zum Durchklicken",
  heroBody:
    "Sechsundzwanzig UMTUBA-eigene Demo-Konzepte. Keine Live-Partner, kein echter Bestand, keine echte Belastung.",
  shopCatalog: "Katalog durchsuchen",
  featured: "Hervorgehobene Konzepte",
  allProducts: "Alle Demo-Produkte",
  addToCart: "In den Warenkorb",
  addedToCart: "Zum Sandbox-Warenkorb hinzugefügt",
  viewCart: "Warenkorb ansehen",
  favorite: "Speichern",
  favorited: "Gespeichert",
  emptyCart: "Der Sandbox-Warenkorb ist leer.",
  emptyFavorites: "Noch keine gespeicherten Artikel.",
  emptySearch: "Keine Demo-Produkte passen zu dieser Suche.",
  continueShopping: "Weiter einkaufen",
  filterCategory: "Kategorie",
  allCategories: "Alle Kategorien",
  sort: "Sortieren",
  checkoutTitle: "Sandbox-Kasse",
  address: "Adresse",
  shipping: "Versand",
  payment: "Zahlung",
  city: "Stadt",
  country: "Land",
  paySuccess: "Erfolg simulieren",
  payDeclined: "Ablehnung simulieren",
  viewOrder: "Bestellung ansehen",
  rightsLabel: "Rechte",
  notPartner: "KEIN UMTUBA-PARTNER",
  unknownDeny: "UNBEKANNTE Rechte = VERWEIGERN",
  providerModelsTitle: "Anbietermodelle",
  providerModelsBody: "Eigentum und Rechte für jeden Handelsmodus. Prospektive Namen bleiben nicht als Partner gekennzeichnet.",
  remove: "Entfernen",
  subtotal: "Zwischensumme",
  total: "Gesamt",
  emptyOrders: "Noch keine Käuferbestellungen. Schließe eine Sandbox-Kasse ab, um eine zu erzeugen.",
  noPayout: "Auszahlung ist aus. Keine Abrechnung.",
};

const pt: Catalog = {
  ...en,
  storeName: "Loja UMTUBA",
  sandboxHint: "Pré-visualização · catálogo sintético · sem pagamento real",
  home: "Início",
  catalog: "Catálogo",
  search: "Pesquisar",
  searchPlaceholder: "Pesquisar o catálogo da sandbox",
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
  backHub: "Hub da sandbox",
  heroEyebrow: "Pré-visualização do futuro marketplace",
  heroTitle: "Uma loja calma para percorrer",
  heroBody:
    "Vinte e seis conceitos demo da UMTUBA. Sem parceiros em direto, sem inventário real, sem cobrança real.",
  shopCatalog: "Explorar catálogo",
  featured: "Conceitos em destaque",
  allProducts: "Todos os produtos demo",
  addToCart: "Adicionar ao carrinho",
  addedToCart: "Adicionado ao carrinho da sandbox",
  viewCart: "Ver carrinho",
  favorite: "Guardar",
  favorited: "Guardado",
  emptyCart: "O carrinho da sandbox está vazio.",
  emptyFavorites: "Ainda sem artigos guardados.",
  emptySearch: "Nenhum produto demo corresponde a esta pesquisa.",
  continueShopping: "Continuar a comprar",
  filterCategory: "Categoria",
  allCategories: "Todas as categorias",
  sort: "Ordenar",
  checkoutTitle: "Checkout da sandbox",
  address: "Morada",
  shipping: "Envio",
  payment: "Pagamento",
  city: "Cidade",
  country: "País",
  paySuccess: "Simular sucesso",
  payDeclined: "Simular recusa",
  viewOrder: "Ver encomenda",
  rightsLabel: "Direitos",
  notPartner: "NÃO É UM PARCEIRO UMTUBA",
  unknownDeny: "Direitos UNKNOWN = NEGAR",
  providerModelsTitle: "Modelos de fornecedor",
  providerModelsBody: "Propriedade e direitos de cada modo comercial. Nomes prospetivos não são etiquetados como parceiros.",
  remove: "Remover",
  subtotal: "Subtotal",
  total: "Total",
  emptyOrders: "Ainda sem encomendas. Conclua um checkout da sandbox para criar uma.",
  noPayout: "O pagamento ao vendedor está desligado. Sem liquidação.",
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
