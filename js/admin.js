// ============ ESTADO ============
let currentProducts = [];
let editingId = null;
let unsubscribeProducts = null;
// pendingImage: undefined = não mexeu na foto (mantém a atual, se estiver editando);
// null = removeu a foto; string (data URL) = escolheu uma foto nova.
let pendingImage = undefined;

// ============ LOGIN / AUTENTICAÇÃO ============
function bindLogin() {
  const form = document.getElementById("loginForm");
  const errorEl = document.getElementById("loginError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.textContent = "";
    const email = document.getElementById("loginEmail").value.trim();
    const senha = document.getElementById("loginPassword").value;
    const auth = cloudAuth();

    if (!auth) {
      errorEl.textContent = "Supabase não configurado. Veja CONFIGURAR-SUPABASE.md.";
      return;
    }

    try {
      const { error } = await auth.signInWithPassword({ email, password: senha });
      if (error) {
        errorEl.textContent = mensagemErroLogin(error);
        console.warn("Erro de login:", error);
      }
    } catch (err) {
      errorEl.textContent = mensagemErroLogin(err);
      console.warn("Erro de login:", err);
    }
  });
}

function mensagemErroLogin(err) {
  const msg = String((err && err.message) || "").toLowerCase();
  if (msg.includes("invalid login credentials")) {
    return "E-mail ou senha inválidos.";
  }
  if (msg.includes("email not confirmed")) {
    return "Este e-mail ainda não foi confirmado. Confirme pelo link enviado, ou desligue a confirmação de e-mail no Supabase (Authentication > Providers > Email).";
  }
  if (msg.includes("logins are disabled") || msg.includes("not enabled") || msg.includes("provider is not enabled")) {
    return "O login por e-mail/senha não está ativado no Supabase (Authentication > Providers > Email).";
  }
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Muitas tentativas. Aguarde um pouco e tente de novo.";
  }
  if (msg.includes("failed to fetch") || msg.includes("network")) {
    return "Sem conexão com o Supabase. Verifique sua internet e a URL do projeto.";
  }
  return `Erro ao entrar: ${(err && err.message) || "desconhecido"}. Veja o console (F12) para detalhes.`;
}

function bindLogout() {
  document.getElementById("logoutBtn").addEventListener("click", () => {
    const auth = cloudAuth();
    if (auth) auth.signOut();
  });
}

function watchAuthState() {
  const auth = cloudAuth();
  if (!auth) {
    document.getElementById("cloudWarning").hidden = false;
    return;
  }

  // No supabase-js v2, onAuthStateChange dispara já no carregamento com a
  // sessão atual (evento INITIAL_SESSION), então não precisa de getSession manual.
  auth.onAuthStateChange((_event, session) => {
    const user = session && session.user;
    document.getElementById("loginScreen").hidden = !!user;
    document.getElementById("dashboard").hidden = !user;

    if (user && !unsubscribeProducts) {
      startProductsListener();
    } else if (!user && unsubscribeProducts) {
      unsubscribeProducts();
      unsubscribeProducts = null;
    }
  });
}

// ============ LISTA DE PRODUTOS ============
// Na primeira vez que o painel abre com o banco vazio, copiamos o catálogo
// padrão automaticamente — sem botão, sem mensagem pedindo ação. Assim os
// produtos que aparecem na tela são sempre registros de verdade, editáveis
// e excluíveis desde o primeiro segundo.
let seedEmAndamento = false;

// Sem internet (ou conexão instável), o Supabase aplica a mudança na tela de quem
// editou na hora, mas só entrega pros outros dispositivos quando a gravação realmente
// chegar ao servidor — o que só acontece quando a conexão voltar. Como isso não gera
// nenhum erro (só demora), avisamos a administradora se a gravação estiver demorando
// mais que o normal, pra ela saber que precisa manter a página aberta até sincronizar.
function aguardarComAvisoDeConexao(promise, avisar, ms = 4000) {
  let terminou = false;
  const timer = setTimeout(() => { if (!terminou) avisar(); }, ms);
  return promise.finally(() => { terminou = true; clearTimeout(timer); });
}

function startProductsListener() {
  unsubscribeProducts = subscribeProducts(async (products, erro) => {
    currentProducts = products;
    renderAdminList(products);
    updateCategoryList(products);

    const banner = document.getElementById("syncError");
    if (erro) {
      banner.hidden = false;
      banner.classList.remove("pending");
      banner.textContent = `Não foi possível sincronizar com o Supabase agora (mostrando catálogo local): ${erro.message || erro.code || erro}`;
      return;
    }
    banner.hidden = true;
    banner.classList.remove("pending");

    const isEmptyCloud = products === FALLBACK_PRODUCTS;
    if (isEmptyCloud && !seedEmAndamento) {
      seedEmAndamento = true;
      document.getElementById("emptyMsg").hidden = false;
      try {
        await seedInitialProducts();
        // A própria escuta em tempo real vai receber os produtos reais em seguida.
      } catch (err) {
        banner.hidden = false;
        banner.textContent = "Erro ao preparar o catálogo inicial: " + err.message;
      } finally {
        seedEmAndamento = false;
      }
    }
  });
}

function updateCategoryList(products) {
  const categories = [...new Set(products.map((p) => p.category).filter(Boolean))];
  document.getElementById("categoryList").innerHTML = categories.map((c) => `<option value="${c}"></option>`).join("");
}

function renderAdminList(products) {
  const list = document.getElementById("adminList");
  const isEmptyCloud = products === FALLBACK_PRODUCTS;

  document.getElementById("emptyMsg").hidden = !isEmptyCloud;

  list.innerHTML = products.map((p) => `
    <div class="admin-card">
      <div class="admin-card-thumb">
        ${p.image
          ? `<img src="${p.image}" alt="${p.name}">`
          : `<div class="product-placeholder">${categoryIllustration()}</div>`}
      </div>
      <div class="admin-card-info">
        <h4>${p.name}</h4>
        <p>${p.category} · ${p.originalPrice > p.price ? `<s>${formatPrice(p.originalPrice)}</s> ` : ""}${formatPrice(p.price)}</p>
      </div>
      <label class="switch" title="Disponível / Esgotado">
        <input type="checkbox" ${p.available ? "checked" : ""} ${isEmptyCloud ? "disabled" : ""} data-toggle-id="${p.id}">
        <span class="slider"></span>
      </label>
      <div class="admin-card-actions">
        <button type="button" data-edit-id="${p.id}" ${isEmptyCloud ? "disabled" : ""}>Editar</button>
        <button type="button" class="danger" data-delete-id="${p.id}" ${isEmptyCloud ? "disabled" : ""}>Excluir</button>
      </div>
    </div>
  `).join("");

  list.querySelectorAll("[data-toggle-id]").forEach((el) => {
    el.addEventListener("change", async () => {
      const id = el.dataset.toggleId;
      const banner = document.getElementById("syncError");
      el.disabled = true;
      try {
        await aguardarComAvisoDeConexao(
          updateProduct(id, { available: el.checked }),
          () => {
            banner.hidden = false;
            banner.classList.add("pending");
            banner.textContent = "Sem conexão com a internet no momento. Não feche esta página — a alteração será enviada assim que a conexão voltar.";
          }
        );
        banner.hidden = true;
        banner.classList.remove("pending");
      } catch (err) {
        alert("Erro ao atualizar: " + err.message);
        el.checked = !el.checked;
      } finally {
        el.disabled = false;
      }
    });
  });

  list.querySelectorAll("[data-edit-id]").forEach((el) => {
    el.addEventListener("click", () => startEdit(el.dataset.editId));
  });

  list.querySelectorAll("[data-delete-id]").forEach((el) => {
    el.addEventListener("click", async () => {
      const id = el.dataset.deleteId;
      const product = currentProducts.find((p) => p.id === id);
      if (!confirm(`Excluir "${product ? product.name : "este item"}" definitivamente?`)) return;
      try {
        await deleteProduct(id);
        if (editingId === id) resetForm();
      } catch (err) {
        alert("Erro ao excluir: " + err.message);
      }
    });
  });
}

// ============ FOTO (upload da galeria/câmera, com compressão no navegador) ============
// Mantém a imagem leve pra salvar rápido: redesenha a imagem
// num <canvas> menor e exporta como JPEG comprimido antes de salvar.
function comprimirImagem(file, larguraMax = 900, qualidade = 0.72) {
  return new Promise((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error("Escolha um arquivo de imagem (JPG, PNG, etc)."));
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("Não foi possível ler o arquivo."));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Esse arquivo não parece ser uma imagem válida."));
      img.onload = () => {
        const escala = Math.min(1, larguraMax / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * escala);
        canvas.height = Math.round(img.height * escala);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", qualidade));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function mostrarPreviewImagem(src) {
  const preview = document.getElementById("imagePreview");
  const removeBtn = document.getElementById("removeImageBtn");
  if (src) {
    preview.src = src;
    preview.hidden = false;
    removeBtn.hidden = false;
  } else {
    preview.src = "";
    preview.hidden = true;
    removeBtn.hidden = true;
  }
}

function bindImageField() {
  const fileInput = document.getElementById("fieldImageFile");

  fileInput.addEventListener("change", async () => {
    const file = fileInput.files[0];
    fileInput.value = "";
    if (!file) return;
    try {
      pendingImage = await comprimirImagem(file);
      mostrarPreviewImagem(pendingImage);
    } catch (err) {
      alert(err.message);
    }
  });

  document.getElementById("removeImageBtn").addEventListener("click", () => {
    pendingImage = null;
    mostrarPreviewImagem(null);
  });
}

// ============ FORMULÁRIO (ADICIONAR / EDITAR) ============
function bindForm() {
  const form = document.getElementById("productForm");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("fieldName").value.trim();
    const category = document.getElementById("fieldCategory").value.trim();
    const price = parseFloat(document.getElementById("fieldPrice").value);
    const originalPriceRaw = document.getElementById("fieldOriginalPrice").value;
    const originalPrice = originalPriceRaw === "" ? 0 : parseFloat(originalPriceRaw);
    const available = document.getElementById("fieldAvailable").checked;
    const description = document.getElementById("fieldDescription").value.trim();

    if (!name || !category || Number.isNaN(price)) {
      alert("Preencha ao menos o nome, a categoria e o preço.");
      return;
    }

    if (originalPriceRaw !== "" && (Number.isNaN(originalPrice) || originalPrice <= price)) {
      alert("O preço original deve ser maior que o preço atual (ou deixe em branco se não houver desconto).");
      return;
    }

    // Se a pessoa não mexeu no campo de foto: mantém a foto atual (edição) ou fica sem foto (produto novo).
    const fotoAtual = editingId ? (currentProducts.find((p) => p.id === editingId) || {}).image || "" : "";
    const image = pendingImage !== undefined ? (pendingImage || "") : fotoAtual;

    const data = { name, category, price, originalPrice, available, description, image };
    const banner = document.getElementById("syncError");
    const submitBtn = form.querySelector('button[type="submit"]');
    const textoOriginalBtn = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = "Salvando...";

    try {
      const operacao = editingId
        ? updateProduct(editingId, data)
        : addProduct({ ...data, ordem: currentProducts.reduce((max, p) => Math.max(max, p.ordem || 0), 0) + 1 });

      await aguardarComAvisoDeConexao(operacao, () => {
        banner.hidden = false;
        banner.classList.add("pending");
        banner.textContent = "Sem conexão com a internet no momento. Não feche esta página — o produto será salvo assim que a conexão voltar.";
      });
      banner.hidden = true;
      banner.classList.remove("pending");
      resetForm();
    } catch (err) {
      alert("Erro ao salvar: " + err.message);
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = textoOriginalBtn;
    }
  });

  document.getElementById("cancelEditBtn").addEventListener("click", resetForm);
}

function startEdit(id) {
  const p = currentProducts.find((x) => x.id === id);
  if (!p) return;

  editingId = id;
  pendingImage = undefined;
  document.getElementById("fieldName").value = p.name || "";
  document.getElementById("fieldCategory").value = p.category || "";
  document.getElementById("fieldPrice").value = p.price || "";
  document.getElementById("fieldOriginalPrice").value = p.originalPrice || "";
  document.getElementById("fieldAvailable").checked = !!p.available;
  document.getElementById("fieldDescription").value = p.description || "";
  mostrarPreviewImagem(p.image || null);

  document.getElementById("formTitle").textContent = `Editando: ${p.name}`;
  document.getElementById("cancelEditBtn").hidden = false;
  document.getElementById("productForm").scrollIntoView({ behavior: "smooth", block: "start" });
}

function resetForm() {
  editingId = null;
  pendingImage = undefined;
  document.getElementById("productForm").reset();
  document.getElementById("fieldAvailable").checked = true;
  mostrarPreviewImagem(null);
  document.getElementById("formTitle").textContent = "Adicionar novo item";
  document.getElementById("cancelEditBtn").hidden = true;
}

// ============ INIT ============
// A ordem importa: primeiro ligamos os botões/formulários (não dependem do
// Supabase), só depois checamos o estado de login. Assim, mesmo se o Supabase
// falhar ao carregar, a página nunca fica com botões "mortos".
document.addEventListener("DOMContentLoaded", () => {
  bindLogin();
  bindLogout();
  bindImageField();
  bindForm();
  try {
    watchAuthState();
  } catch (err) {
    console.warn("Erro ao checar estado de login:", err);
    document.getElementById("cloudWarning").hidden = false;
  }
});
