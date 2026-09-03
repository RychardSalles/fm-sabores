// ============ CAMADA DE DADOS DO CATÁLOGO ============
// Lê e escreve produtos no Firestore quando o Firebase está configurado.
// Se não estiver configurado (ou der erro), tudo cai de volta no catálogo local (FALLBACK_PRODUCTS),
// então o site nunca fica quebrado — só sem edição em tempo real.

const PRODUCTS_COLLECTION = "produtos";

function firebaseIsConfigured() {
  return typeof firebaseConfig !== "undefined"
    && !!firebaseConfig.apiKey
    && !String(firebaseConfig.apiKey).includes("COLE_AQUI");
}

let _firebaseReady = false;
if (typeof firebase !== "undefined" && firebaseIsConfigured()) {
  try {
    firebase.initializeApp(firebaseConfig);
    _firebaseReady = true;
  } catch (e) {
    console.warn("Não foi possível iniciar o Firebase, usando catálogo local:", e);
  }
}

function isCloudActive() { return _firebaseReady; }

function formatPrice(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// db() e fbAuth() nunca lançam erro: se o SDK do Firebase não carregou
// (ex: script bloqueado, CDN fora do ar), retornam null em vez de travar
// quem os chamou — assim o resto da página continua funcionando normalmente.
function db() {
  if (!_firebaseReady) return null;
  try { return firebase.firestore(); }
  catch (e) { console.warn("Firestore indisponível:", e); return null; }
}
function fbAuth() {
  if (!_firebaseReady) return null;
  try { return firebase.auth(); }
  catch (e) { console.warn("Firebase Auth indisponível:", e); return null; }
}

// Escuta o catálogo em tempo real. Chama callback(produtos, erro) agora e sempre que houver mudança.
// erro vem preenchido só quando a leitura falhou e caímos no catálogo local.
// Retorna uma função para cancelar a escuta.
//
// Importante: a ordenação é feita aqui no JS (não com .orderBy() do Firestore).
// O Firestore descarta silenciosamente da consulta qualquer documento que não
// tenha o campo usado no orderBy — então um produto novo sem "ordem" definida
// simplesmente sumiria da lista sem erro nenhum. Ordenar no cliente evita essa armadilha.
function subscribeProducts(callback) {
  const database = db();
  if (!database) {
    callback(FALLBACK_PRODUCTS);
    return () => {};
  }
  return database.collection(PRODUCTS_COLLECTION).onSnapshot(
    snap => {
      if (snap.empty) { callback(FALLBACK_PRODUCTS); return; }
      const produtos = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      produtos.sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      callback(produtos);
    },
    err => {
      console.warn("Erro ao carregar produtos do Firestore, usando catálogo local:", err);
      callback(FALLBACK_PRODUCTS, err);
    }
  );
}

async function fetchProductsOnce() {
  const database = db();
  if (!database) return FALLBACK_PRODUCTS;
  const snap = await database.collection(PRODUCTS_COLLECTION).get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addProduct(data) {
  const database = db();
  if (!database) throw new Error("Firebase não configurado. Veja CONFIGURAR-FIREBASE.md.");
  return database.collection(PRODUCTS_COLLECTION).add(data);
}

async function updateProduct(id, data) {
  const database = db();
  if (!database) throw new Error("Firebase não configurado. Veja CONFIGURAR-FIREBASE.md.");
  return database.collection(PRODUCTS_COLLECTION).doc(id).update(data);
}

async function deleteProduct(id) {
  const database = db();
  if (!database) throw new Error("Firebase não configurado. Veja CONFIGURAR-FIREBASE.md.");
  return database.collection(PRODUCTS_COLLECTION).doc(id).delete();
}

// Copia o catálogo padrão para o Firestore. Só roda se a coleção estiver vazia,
// para nunca duplicar produtos sem querer.
async function seedInitialProducts() {
  const database = db();
  if (!database) throw new Error("Firebase não configurado. Veja CONFIGURAR-FIREBASE.md.");
  const existing = await fetchProductsOnce();
  if (existing.length > 0) throw new Error("Já existem produtos salvos na nuvem. Importação cancelada para não duplicar.");
  const batch = database.batch();
  FALLBACK_PRODUCTS.forEach((p, i) => {
    const { id, ...rest } = p;
    const ref = database.collection(PRODUCTS_COLLECTION).doc();
    batch.set(ref, { ...rest, ordem: i + 1 });
  });
  await batch.commit();
}
