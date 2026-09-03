// Ícone neutro (sem foto de banco de imagens) usado só enquanto um item ainda
// não tem foto real cadastrada pelo painel administrativo.
const PRODUCT_PLACEHOLDER_ICON = `
  <svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round" stroke-linecap="round">
    <circle cx="24" cy="24" r="15"/>
    <circle cx="24" cy="24" r="8"/>
    <path d="M24 4v6M24 38v6M4 24h6M38 24h6"/>
  </svg>`;

function categoryIllustration() {
  return PRODUCT_PLACEHOLDER_ICON;
}
