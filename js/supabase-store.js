// ============ CAMADA DE DADOS DO CATÁLOGO (Supabase) ============
// Lê e escreve produtos no Supabase quando ele está configurado.
// Se não estiver configurado (ou der erro), tudo cai de volta no catálogo local
// (FALLBACK_PRODUCTS), então o site nunca fica quebrado — só sem edição em tempo real.

const PRODUCTS_TABLE = "produtos";

function supabaseIsConfigured() {
  return typeof SUPABASE_CONFIG !== "undefined"
    && !!SUPABASE_CONFIG.url
    && !!SUPABASE_CONFIG.anonKey
    && !String(SUPABASE_CONFIG.url).includes("COLE_AQUI")
    && !String(SUPABASE_CONFIG.anonKey).includes("COLE_AQUI");
}

let _sb = null;
if (typeof supabase !== "undefined" && supabaseIsConfigured()) {
  try {
    _sb = supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey);
  } catch (e) {
    console.warn("Não foi possível iniciar o Supabase, usando catálogo local:", e);
  }
}

function isCloudActive() { return !!_sb; }

// nunca lança erro: se o SDK não carregou (script bloqueado, CDN fora do ar),
// retorna null em vez de travar quem chamou.
function sb() { return _sb; }
function cloudAuth() {
  try { return _sb ? _sb.auth : null; }
  catch (e) { console.warn("Supabase Auth indisponível:", e); return null; }
}

function formatPrice(value) {
  return Number(value || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

// ---- conversão entre a linha do banco (snake_case) e o objeto usado no site ----
function rowToProduct(row) {
  return {
    id: row.id,
    name: row.name || "",
    category: row.category || "",
    price: Number(row.price) || 0,
    originalPrice: Number(row.original_price) || 0,
    image: row.image || "",
    description: row.description || "",
    available: row.available !== false,
    ordem: row.ordem || 0,
  };
}

function productToRow(data) {
  const row = {};
  if ("name" in data) row.name = data.name;
  if ("category" in data) row.category = data.category;
  if ("price" in data) row.price = data.price;
  if ("originalPrice" in data) row.original_price = data.originalPrice || null;
  if ("image" in data) row.image = data.image || null;
  if ("description" in data) row.description = data.description || null;
  if ("available" in data) row.available = data.available;
  if ("ordem" in data) row.ordem = data.ordem;
  return row;
}

// Loaders ativos — permitem atualizar a tela de quem editou na hora, mesmo que
// o Realtime do Supabase esteja desligado (o Realtime cuida dos OUTROS dispositivos).
const _activeLoaders = new Set();
async function _refreshActiveLoaders() {
  for (const load of _activeLoaders) {
    try { await load(); } catch (e) { /* já tratado dentro do load */ }
  }
}

// Escuta o catálogo. Chama callback(produtos, erro) agora e sempre que houver mudança.
// erro vem preenchido só quando a leitura falhou e caímos no catálogo local.
// Retorna uma função para cancelar a escuta.
//
// A ordenação é feita no JS (não no .order() do banco) para um item novo sem
// "ordem" definida nunca sumir da lista sem aviso.
function subscribeProducts(callback) {
  const client = sb();
  if (!client) {
    callback(FALLBACK_PRODUCTS);
    return () => {};
  }

  const load = async () => {
    try {
      const { data, error } = await client.from(PRODUCTS_TABLE).select("*");
      if (error) throw error;
      if (!data || data.length === 0) { callback(FALLBACK_PRODUCTS); return; }
      const produtos = data.map(rowToProduct).sort((a, b) => (a.ordem || 0) - (b.ordem || 0));
      callback(produtos);
    } catch (err) {
      console.warn("Erro ao carregar produtos do Supabase, usando catálogo local:", err);
      callback(FALLBACK_PRODUCTS, err);
    }
  };

  _activeLoaders.add(load);
  load();

  const channel = client
    .channel("produtos-realtime-" + Math.random().toString(36).slice(2))
    .on("postgres_changes", { event: "*", schema: "public", table: PRODUCTS_TABLE }, () => load())
    .subscribe();

  return () => {
    _activeLoaders.delete(load);
    try { client.removeChannel(channel); } catch (e) {}
  };
}

async function fetchProductsOnce() {
  const client = sb();
  if (!client) return FALLBACK_PRODUCTS;
  const { data, error } = await client.from(PRODUCTS_TABLE).select("*").order("ordem", { ascending: true });
  if (error) throw error;
  return (data || []).map(rowToProduct);
}

async function addProduct(data) {
  const client = sb();
  if (!client) throw new Error("Supabase não configurado. Veja CONFIGURAR-SUPABASE.md.");
  const { error } = await client.from(PRODUCTS_TABLE).insert(productToRow(data));
  if (error) throw new Error(traduzErro(error));
  await _refreshActiveLoaders();
}

async function updateProduct(id, data) {
  const client = sb();
  if (!client) throw new Error("Supabase não configurado. Veja CONFIGURAR-SUPABASE.md.");
  const { error } = await client.from(PRODUCTS_TABLE).update(productToRow(data)).eq("id", id);
  if (error) throw new Error(traduzErro(error));
  await _refreshActiveLoaders();
}

async function deleteProduct(id) {
  const client = sb();
  if (!client) throw new Error("Supabase não configurado. Veja CONFIGURAR-SUPABASE.md.");
  const { error } = await client.from(PRODUCTS_TABLE).delete().eq("id", id);
  if (error) throw new Error(traduzErro(error));
  await _refreshActiveLoaders();
}

// Copia o catálogo padrão para o Supabase. Só roda se a tabela estiver vazia,
// para nunca duplicar itens sem querer.
async function seedInitialProducts() {
  const client = sb();
  if (!client) throw new Error("Supabase não configurado. Veja CONFIGURAR-SUPABASE.md.");
  const existing = await fetchProductsOnce();
  if (existing.length > 0) throw new Error("Já existem itens salvos na nuvem. Importação cancelada para não duplicar.");
  const rows = FALLBACK_PRODUCTS.map((p, i) => {
    const { id, ...rest } = p;
    return { ...productToRow(rest), ordem: i + 1 };
  });
  const { error } = await client.from(PRODUCTS_TABLE).insert(rows);
  if (error) throw new Error(traduzErro(error));
  await _refreshActiveLoaders();
}

function traduzErro(error) {
  const msg = (error && (error.message || error.hint || "")).toLowerCase();
  if (msg.includes("row-level security") || msg.includes("violates row-level security")) {
    return "Sem permissão para salvar. Confira se você está logada e se as políticas (RLS) da tabela foram criadas — veja CONFIGURAR-SUPABASE.md.";
  }
  if (msg.includes("could not find the table") || msg.includes("does not exist") || msg.includes("schema cache")) {
    return "A tabela \"produtos\" não foi encontrada no Supabase. Rode o script de criação do CONFIGURAR-SUPABASE.md.";
  }
  if (msg.includes("failed to fetch") || msg.includes("networkerror")) {
    return "Sem conexão com o Supabase. Verifique a internet e a URL do projeto.";
  }
  return error && error.message ? error.message : "Erro desconhecido ao falar com o Supabase.";
}
