# Como ativar o painel administrativo (passo a passo)

O site funciona sozinho sem nenhuma configuração — ele mostra um cardápio padrão. Para conseguir **editar os itens pelo painel** (`admin.html`) e essas mudanças aparecerem pra todo mundo que visita o site, é preciso ligar o site a um banco de dados gratuito do Google chamado **Firebase**. Leva uns 10-15 minutos, e não custa nada no plano usado aqui.

## 1. Criar o projeto no Firebase

1. Acesse **console.firebase.google.com** e entre com uma conta Google (pode ser a do e-mail da loja).
2. Clique em **"Criar projeto"**.
3. Dê um nome, por exemplo `fm-sabor-caseiro`. Pode desativar o Google Analytics (não é necessário).
4. Clique em **"Criar projeto"** e aguarde.

## 2. Criar o "app da Web" e pegar a configuração

1. Na tela inicial do projeto, clique no ícone **`</>`** ("Adicionar app" → Web).
2. Dê um apelido, ex: `fm-sabor-caseiro-site`. Não precisa marcar "Firebase Hosting".
3. Clique em **"Registrar app"**.
4. Vai aparecer um bloco de código parecido com isto:

```js
const firebaseConfig = {
  apiKey: "AIzaSy...",
  authDomain: "fm-sabor-caseiro.firebaseapp.com",
  projectId: "fm-sabor-caseiro",
  storageBucket: "fm-sabor-caseiro.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef"
};
```

5. Copie esses valores e cole no arquivo **`js/firebase-config.js`** deste site, substituindo os `"COLE_AQUI"`.
6. Salve o arquivo.

## 3. Ativar o banco de dados (Firestore)

⚠️ Atenção: escolha **"Firestore Database"**, não "Realtime Database" — são produtos diferentes do Firebase, com nomes parecidos, e o site só funciona com o Firestore.

1. No menu lateral do Firebase, procure **"Bancos de dados e armazenamento" → "Firestore Database"**.
2. Clique em **"Criar banco de dados"**.
3. Escolha a localização mais próxima (ex: `southamerica-east1` - São Paulo) e clique em avançar.
4. Escolha **"Iniciar no modo de produção"**.
5. Depois de criado, vá na aba **"Regras"** e substitua o conteúdo por:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /produtos/{produtoId} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

6. Clique em **"Publicar"**.

Isso garante que **qualquer pessoa pode ver** o cardápio (necessário para o site funcionar), mas **só quem estiver logada** pode editar.

## 4. Ativar o login (Authentication)

1. No menu lateral, clique em **"Compilação" → "Authentication"**.
2. Clique em **"Vamos começar"**.
3. Escolha o provedor **"E-mail/senha"** e ative-o. Clique em **"Salvar"**.
4. Vá na aba **"Users"** (Usuários) e clique em **"Adicionar usuário"**.
5. Cadastre o e-mail e a senha que serão usados para entrar no painel (`admin.html`). Não precisa ser um e-mail real — o Firebase Auth por e-mail/senha aceita qualquer endereço, mesmo fictício, desde que só seja usado para login.

## 5. Primeiro acesso

1. Abra `admin.html` no navegador e faça login com o e-mail/senha criados no passo 4.
2. Na primeira vez que o painel abrir com o Firestore vazio, ele mesmo copia o cardápio padrão para a nuvem automaticamente — não precisa clicar em nada.
3. A partir daí, qualquer edição feita no painel aparece automaticamente no site, para todo mundo.

## O que dá pra fazer no painel

- Adicionar item novo (nome, categoria, foto, preço, descrição)
- Editar qualquer item existente
- Ligar/desligar "Disponível" com um toque, sem precisar abrir o formulário (útil quando um prato do dia acaba)
- Excluir itens que saíram do cardápio

## Sobre a foto de cada item

O painel usa um **seletor de arquivo de verdade** (`admin.html` → "Foto do item"): você escolhe uma foto da galeria ou tira uma na hora, pelo celular ou computador. A imagem é redimensionada e comprimida no próprio navegador antes de ser salva — não é preciso configurar Firebase Storage (que pode ter custo) nem colar link de imagem.

## É seguro expor o `firebaseConfig` no código do site?

Sim. Essas chaves não são secretas — servem só para o navegador saber a qual projeto conversar. Quem protege os dados de verdade são as **Regras do Firestore** do passo 3 (só usuários logados podem escrever). Por isso é essencial não pular esse passo.
