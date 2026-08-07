# Diagrammer — formato de armazenamento

Contexto para um agente que lê/escreve o diagrama **direto no `localStorage`**, sem passar pela UI.

---

## 1. Onde os dados ficam

| | |
|---|---|
| Chave do `localStorage` | `diagrammer-der-storage` |
| Envelope | `zustand/middleware` `persist` |
| Formato | `{ "state": { ... }, "version": 0 }` |

Nenhuma migração de `version` está configurada, então o valor é sempre `0`. Escreva `0`.

```json
{
  "state": {
    "nodes": [],
    "edges": [],
    "enums": [],
    "groups": [],
    "macModifierOverride": null,
    "showCardinality": true
  },
  "version": 0
}
```

Só essas 6 chaves são persistidas. Qualquer outra coisa dentro de `state` é ignorada na leitura e some na próxima escrita da app.

`macModifierOverride` e `showCardinality` são preferências de UI. **Podem ser omitidas** — os defaults (`null` e `true`) são aplicados. Não as invente; se você não quer mexer nelas, preserve o que já estava lá.

Existe um estado `locked` na app (congela a edição do board), mas ele **não é persistido** de propósito. Não escreva.

### ⚠️ Regra operacional mais importante

A app **regrava a chave inteira a cada alteração de estado**. Se você escrever no `localStorage` com a aba aberta, a próxima interação do usuário sobrescreve o que você escreveu.

Sequência correta: **escrever → recarregar a página**. Sem reload, assuma que sua escrita foi perdida.

---

## 2. Normalizações aplicadas na leitura

Ao carregar (`merge` do persist) **e** ao importar um arquivo, a app aplica duas passadas:

### `stripRuntimeState(nodes)`

Remove de todo nó os campos **`measured`**, **`selected`** e **`dragging`**, e garante `data.constraints = []` quando ausente.

São estado de runtime do React Flow, não conteúdo do diagrama. **Não os escreva** — serão descartados. Um `measured` desatualizado fazia as âncoras dos fios serem posicionadas a partir de dimensões que já não batiam com o card renderizado.

### `withResolvedHandles(edges, nodes)`

Para toda aresta **sem** `sourceHandle` ou `targetHandle`, deriva ambos da posição relativa das duas tabelas:

```js
dx = target.position.x - source.position.x
dy = target.position.y - source.position.y

if (Math.abs(dx) >= Math.abs(dy))
  dx >= 0 ? { sourceHandle: 'right',  targetHandle: 'left'  }
          : { sourceHandle: 'left',   targetHandle: 'right' }
else
  dy >= 0 ? { sourceHandle: 'bottom', targetHandle: 'top'   }
          : { sourceHandle: 'top',    targetHandle: 'bottom' }
```

Arestas que **já têm as duas âncoras são preservadas intactas** — ajustes manuais do usuário sobrevivem. Se a tabela de origem ou destino não existir na lista de nós, a aresta passa sem alteração (e vira uma aresta órfã: veja §6).

**Consequência prática:** você pode omitir `sourceHandle`/`targetHandle` ao criar uma aresta e a app escolhe um lado coerente. Mas se quiser controle sobre em que lado o fio encosta, escreva os dois.

---

## 3. Esquema

### Nó (tabela)

```jsonc
{
  "id": "tbl_usuarios",            // string única; a UI usa uuid v4, mas qualquer string serve
  "type": "table",                 // obrigatório e sempre "table"
  "position": { "x": 120, "y": 80 },
  "data": {
    "name": "usuarios",            // identificador snake_case
    "columns": [ /* ver abaixo */ ],
    "constraints": [ /* ver abaixo */ ]
  }
}
```

Largura do card: fixa em 288px. A altura depende do número de colunas — não tente prevê-la.

### Coluna

```jsonc
{
  "id": "col_usuarios_id",
  "name": "id",
  "type": "bigint",
  "pk": true,
  "fk": false,
  "nullable": false,
  "unique": true,
  "linkedEdgeId": "edge_x",  // opcional: id da aresta que gerou esta coluna FK
  "enumId": "enum_role"      // opcional: só quando type === "enum"
}
```

`type` ∈ `string` `integer` `bigint` `decimal` `boolean` `date` `datetime` `uuid` `text` `enum`

Os 4 booleanos são **obrigatórios** — não são opcionais. Defaults ao criar coluna nova: `type: "string"`, todos os 4 `false`, `name: ""`.

Comportamento da UI ao **marcar o checkbox PK**: força `unique: true` e `nullable: false` na mesma ação. Não é uma invariante validada na leitura — a coluna `id` que vem numa tabela nova é criada com `pk: true`, `unique: false`, `nullable: false`. Ou seja, não "conserte" colunas existentes por conta própria.

### Constraint (UNIQUE composto)

```jsonc
{
  "id": "cst_1",
  "name": "uq_usuarios_email",   // pode ser "" — a UI mostra "unique"
  "columnIds": ["col_a", "col_b"],
  "color": "bg-amber-500"        // classe Tailwind, usada no badge da coluna
}
```

`color` sai desta paleta, escolhida por `constraints.length % 6` no momento da criação (ou seja, a n-ésima constraint **daquela tabela**):

`bg-amber-500` `bg-sky-500` `bg-violet-500` `bg-rose-500` `bg-emerald-500` `bg-fuchsia-500`

### Enum

```jsonc
{
  "id": "enum_role",
  "name": "role",
  "options": [
    { "id": "opt_role_gerente", "label": "Gerente", "value": "gerente" }
  ]
}
```

`label` é o texto exibido; `value` é o valor gravado no banco. Os `id` das opções são estáveis: editar um enum pela UI preserva o `id` das opções que já existiam.

### Aresta (relacionamento)

```jsonc
{
  "id": "edge_enderecos_usuarios",
  "type": "relationship",          // obrigatório e sempre "relationship"
  "source": "tbl_enderecos",       // id de nó
  "target": "tbl_usuarios",
  "sourceHandle": "left",          // "top" | "right" | "bottom" | "left"
  "targetHandle": "right",
  "data": {
    "cardinality": "1:1",          // "1:1" | "1:N" | "N:N"
    "fkName": "endereco_id"
  }
}
```

### Grupo (módulo visual)

```jsonc
{
  "id": "grp_contas",
  "name": "modulo_contas",
  "position": { "x": 50, "y": 50 },
  "width": 740,
  "height": 340,
  "color": "sky"      // slate | amber | sky | violet | rose | emerald
}
```

Sem campo `type` — a app injeta o tipo do nó só na hora de renderizar.

---

## 4. Grupos não têm lista de membros

Esta é a parte que mais foge do esperado, então leia antes de mexer em grupos.

Um grupo é **só uma caixa desenhada atrás das tabelas**, para separar entidades por módulo. Não tem semântica de banco nenhuma. Ele não tem nenhum campo apontando para as tabelas que contém, e as tabelas não têm nenhum campo apontando para o grupo. Não existe `parentId`, `groupId` nem lista de ids em lugar nenhum.

**Pertencer ao grupo é geometria pura, avaliada em tempo real:** uma tabela pertence ao grupo quando o retângulo dela cabe **inteiro** dentro do retângulo do grupo.

```js
dentro =
  tabela.x                 >= grupo.x &&
  tabela.y                 >= grupo.y &&
  tabela.x + larguraTabela <= grupo.x + grupo.width &&
  tabela.y + alturaTabela  <= grupo.y + grupo.height
```

Encostar ou entrar parcialmente **não conta**. A largura do card é fixa em 288; a altura varia com o número de colunas (a app usa 240 como palpite quando ainda não mediu).

Consequências para quem escreve direto no storage:

- **Para colocar uma tabela num módulo**, basta posicioná-la inteiramente dentro dos limites da caixa. Não há campo para setar.
- **Para tirar**, mova a tabela para fora (ou redimensione a caixa).
- **Coordenadas continuam absolutas.** Grupos não reparentam nada — a `position` de uma tabela dentro de um grupo é do mesmo espaço que a de qualquer outra.
- **Excluir um grupo não afeta tabela nenhuma.** Some só a caixa.
- **Grupos podem se sobrepor**, e uma tabela pode estar dentro de dois. Nada quebra.
- **Relações ignoram grupos por completo.** Uma aresta cruzando a borda da caixa é normal.
- Na UI, arrastar a caixa leva junto as tabelas que estavam inteiramente dentro dela **no instante em que o arraste começou**. Isso é comportamento de runtime, não dado salvo.

---

## 5. Convenção de relacionamentos

A UI não cria só a aresta — ela mexe nas colunas. Para o diagrama ficar coerente, reproduza:

### `1:1` e `1:N`

Uma aresta `source → target`, **mais** uma coluna FK acrescentada na tabela **destino** (`target`):

- `name` = `data.fkName`
- `type` = tipo da PK da origem (fallback `bigint`)
- `fk: true`
- `unique: true` **somente quando `1:1`**
- `linkedEdgeId` = id da aresta

### `N:N`

Não existe aresta `N:N` no arquivo salvo. A UI cria uma **tabela pivô** e **duas arestas `1:N`**:

- Pivô posicionada em `x = (origem.x + destino.x) / 2`, `y = max(origem.y, destino.y) + 300`
- Pivô ganha sua PK `id` normal, mais duas colunas FK: `<origem>_id` e `<destino>_id`, cada uma com `fk: true` e o `linkedEdgeId` da sua aresta
- Aresta A: `origem → pivô`, `cardinality: "1:N"`, `fkName: "<origem>_id"`
- Aresta B: `destino → pivô`, `cardinality: "1:N"`, `fkName: "<destino>_id"`

O `cardinality: "N:N"` só existe como opção no modal; nunca é gravado.

---

## 6. Coisas que quebram o diagrama

- **Aresta órfã** — `source`/`target` apontando para um `id` de nó inexistente. O React Flow não renderiza a aresta e o reparo de âncoras a ignora. Nunca deixe.
- **`enumId` pendurado** — coluna `type: "enum"` apontando para um `enums[].id` que não existe. O seletor fica vazio. Ao remover um enum, limpe o `enumId` de todas as colunas que o usavam.
- **`linkedEdgeId` pendurado** — coluna FK apontando para aresta removida. Ao remover uma aresta, remova também a coluna FK correspondente.
- **Grupo com `width`/`height` ausente ou zero** — a caixa some ou vira um risco, e nenhuma tabela cabe dentro dela. A UI não deixa passar de 220×160 ao redimensionar; escritas diretas não são checadas.
- **Nome de tabela duplicado** — a UI deduplica no blur; escritas diretas não são checadas.
- **Nome começando com dígito** — a UI marca visualmente como inválido, mas não impede.
- **Formatação de identificador** — a UI aplica `trim → espaços viram "_" → lowercase` ao sair do campo. Escreva já normalizado.

---

## 7. Arquivo de export/import

O botão **Salvar** gera `diagrama-<AAAA-MM-DD_HHhMM>.json` com **quatro chaves apenas**:

```json
{ "nodes": [...], "edges": [...], "enums": [...], "groups": [...] }
```

Diferenças em relação ao `localStorage`:

- **Sem envelope** — não tem `state` nem `version`
- **Sem preferências** — `macModifierOverride` e `showCardinality` não vão para o arquivo
- Passa pelas mesmas normalizações da §2 na **saída** (runtime state removido, âncoras resolvidas), então o arquivo já sai completo

Importar **substitui** o diagrama inteiro e a UI pede confirmação quando já existem tabelas.

Para converter arquivo → `localStorage`: envelope `{ "state": {...as 4 chaves...}, "version": 0 }`.

---

## Changelog

### Rodada 2 — grupos

1. **Chave nova: `groups`**, persistida e incluída no arquivo de export (que passou de 3 para 4 chaves). Um arquivo ou storage sem ela carrega normalmente — vira `[]`.

2. **Agrupamento é geométrico, sem lista de membros.** Releia a §4 inteira antes de posicionar tabelas: não há campo vinculando tabela a grupo, e a contenção exige que o card caiba **inteiro** dentro da caixa.

3. **Coordenadas seguem absolutas.** Grupos não usam `parentId` do React Flow e não reparentam nada, então nada do que já estava documentado sobre `position` de tabela mudou.

4. **`locked`** existe no estado da app mas não é persistido.

O esquema de nó, coluna, constraint, enum e aresta **continua sem mudanças**.

### Rodada 1 — âncoras e normalização

1. **`partialize` cresceu.** Antes persistia `nodes`, `edges`, `enums`. Passou a incluir também `macModifierOverride` e `showCardinality`. Ambas opcionais na escrita.

2. **Leitura passou a normalizar (`stripRuntimeState`).** `measured`, `selected` e `dragging` são descartados ao carregar. Antes eram mantidos. **Pare de escrevê-los.**

3. **Leitura passou a reparar âncoras (`withResolvedHandles`).** Arestas sem `sourceHandle`/`targetHandle` recebem âncoras derivadas da geometria, em vez de ficar a cargo do React Flow — que escolhia lados arbitrários e embaralhava os fios. Arestas com âncoras salvas não são tocadas.

4. **Mesmo tratamento nas três pontas** — carregar do `localStorage`, importar arquivo e exportar arquivo.

5. **Enums ganharam edição e exclusão.** O esquema não mudou, mas: os `id` das opções são preservados ao editar, e excluir um enum limpa o `enumId` das colunas que o usavam.

6. **`showCardinality: false`** esconde o card inteiro sobre os fios (cardinalidade + nome da FK + botão de remover), não só o badge. O card reaparece na aresta selecionada. É puramente visual — não altera nenhum dado do diagrama.
