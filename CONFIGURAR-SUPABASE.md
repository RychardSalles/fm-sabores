# Como ativar o painel administrativo (passo a passo) — Supabase

O site funciona sozinho sem nenhuma configuração — ele mostra um cardápio padrão. Para conseguir **editar os itens pelo painel** (`admin.html`) e essas mudanças aparecerem pra todo mundo que visita o site, é preciso ligar o site a um banco de dados gratuito chamado **Supabase**. Leva uns 10-15 minutos, e não custa nada no plano gratuito.

## 1. Criar o projeto no Supabase

1. Acesse **app.supabase.com** e entre (pode usar conta do GitHub ou e-mail).
2. Clique em **"New project"**.
3. Dê um nome, por exemplo `fm-sabor-caseiro`. Escolha uma senha para o banco (guarde num lugar seguro — não é usada no site) e a região mais próxima (**South America (São Paulo)**).
4. Clique em **"Create new project"** e aguarde uns 2 minutos.

## 2. Pegar a URL e a chave pública

1. No projeto, menu lateral → **Project Settings** (ícone de engrenagem) → **API**.
2. Copie:
   - **Project URL** → vai no campo `url`
   - Em **Project API keys**, a chave **`anon` / `public`** → vai no campo `anonKey`
3. Abra o arquivo **`js/supabase-config.js`** deste site e cole os dois valores, substituindo os `"COLE_AQUI"`. Salve.

> A chave `anon` pode ficar no código do site sem problema — ela não é secreta. Quem protege os dados são as **políticas (RLS)** do passo 3. **Nunca** use a chave `service_role` aqui.

## 3. Criar a tabela e as permissões

1. No menu lateral → **SQL Editor** → **New query**.
2. Cole o script abaixo e clique em **"Run"**:

```sql
-- Tabela do cardápio
create table public.produtos (
  id             bigint generated always as identity primary key,
  name           text not null,
  category       text not null,
  price          numeric not null default 0,
  original_price numeric,
  image          text,
  available      boolean not null default true,
  description    text,
  ordem          integer not null default 0,
  created_at     timestamptz not null default now()
);

-- Liga a segurança por linha
alter table public.produtos enable row level security;

-- Qualquer pessoa pode LER o cardápio (necessário para o site funcionar)
create policy "Leitura publica dos produtos"
  on public.produtos for select
  using (true);

-- Só quem estiver logada pode CRIAR / EDITAR / EXCLUIR
create policy "Escrita apenas para autenticados"
  on public.produtos for all
  to authenticated
  using (true)
  with check (true);

-- Atualização em tempo real (o site de outros dispositivos recebe as mudanças na hora)
alter publication supabase_realtime add table public.produtos;
```

Se aparecer um erro na última linha dizendo que a tabela **já está** na publicação, pode ignorar — está tudo certo.

## 4. Ativar o login e criar o usuário do painel

1. Menu lateral → **Authentication** → **Providers** → confirme que **Email** está **Enabled**.
2. (Recomendado) Nesse mesmo provedor **Email**, desligue **"Confirm email"** — assim o usuário criado já entra direto, sem precisar confirmar link.
3. Vá em **Authentication** → **Users** → **"Add user"** → **"Create new user"**.
4. Preencha o **e-mail** e a **senha** que serão usados para entrar no painel (`admin.html`). Marque **"Auto Confirm User"** se a opção aparecer.

## 5. Primeiro acesso

1. Abra `admin.html` no navegador e faça login com o e-mail/senha do passo 4.
2. Na primeira vez que o painel abrir com a tabela vazia, ele mesmo copia o cardápio padrão para a nuvem automaticamente — não precisa clicar em nada.
3. A partir daí, qualquer edição feita no painel aparece automaticamente no site, para todo mundo.

## O que dá pra fazer no painel

- Adicionar item novo (nome, categoria, foto, preço, descrição)
- Editar qualquer item existente
- Ligar/desligar "Disponível" com um toque (útil quando um prato do dia acaba)
- Excluir itens que saíram do cardápio

## Sobre a foto de cada item

O painel usa um **seletor de arquivo de verdade** (`admin.html` → "Foto do item"): você escolhe uma foto da galeria ou tira uma na hora, pelo celular ou computador. A imagem é redimensionada e comprimida no próprio navegador antes de ser salva na coluna `image` da tabela — não é preciso configurar o Supabase Storage.

## Se as mudanças não aparecerem em outro aparelho na hora

O aparelho que fez a edição sempre atualiza na hora. Para os **outros** aparelhos receberem em tempo real, a tabela precisa estar na publicação `supabase_realtime` (última linha do script do passo 3). Sem isso, os outros só veem a mudança ao recarregar a página.
