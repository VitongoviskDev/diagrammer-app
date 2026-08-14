# Diagrammer — como montar o JSON de importação

Contexto para um agente que lê o schema do banco de um projeto e gera um arquivo `.json`
para importar no Diagrammer (botão **Importar** — substitui o diagrama inteiro).

## Entregável

Um arquivo JSON com **exatamente estas 4 chaves**, nesta forma (sem `state`, sem `version`):

```json
{ "nodes": [], "edges": [], "enums": [], "groups": [] }
```

- `nodes` — as tabelas
- `edges` — os relacionamentos
- `enums` — os enums referenciados por colunas `type: "enum"`
- `groups` — caixas visuais opcionais (módulos). Pode ser `[]`.

---

## Exemplo completo

Schema de origem: `usuarios 1:N pedidos`, `pedidos N:N produtos` (via pivô `pedido_produto`),
`pedidos.status` é um enum.

```json
{
  "nodes": [
    {
      "id": "tbl_usuarios",
      "type": "table",
      "position": { "x": 80, "y": 80 },
      "data": {
        "name": "usuarios",
        "columns": [
          { "id": "col_usuarios_id",    "name": "id",         "type": "bigint",   "pk": true,  "fk": false, "nullable": false, "unique": true },
          { "id": "col_usuarios_nome",  "name": "nome",       "type": "string",   "pk": false, "fk": false, "nullable": false, "unique": false },
          { "id": "col_usuarios_email", "name": "email",      "type": "string",   "pk": false, "fk": false, "nullable": false, "unique": true },
          { "id": "col_usuarios_criado","name": "criado_em",  "type": "datetime", "pk": false, "fk": false, "nullable": false, "unique": false }
        ],
        "constraints": []
      }
    },
    {
      "id": "tbl_pedidos",
      "type": "table",
      "position": { "x": 480, "y": 80 },
      "data": {
        "name": "pedidos",
        "columns": [
          { "id": "col_pedidos_id",      "name": "id",         "type": "bigint",  "pk": true,  "fk": false, "nullable": false, "unique": true },
          { "id": "col_pedidos_status",  "name": "status",     "type": "enum",    "pk": false, "fk": false, "nullable": false, "unique": false, "enumId": "enum_status_pedido" },
          { "id": "col_pedidos_total",   "name": "total",      "type": "decimal", "pk": false, "fk": false, "nullable": false, "unique": false },
          { "id": "col_pedidos_usuario", "name": "usuario_id", "type": "bigint",  "pk": false, "fk": true,  "nullable": false, "unique": false, "linkedEdgeId": "edge_usuarios_pedidos" }
        ],
        "constraints": []
      }
    },
    {
      "id": "tbl_produtos",
      "type": "table",
      "position": { "x": 880, "y": 80 },
      "data": {
        "name": "produtos",
        "columns": [
          { "id": "col_produtos_id",    "name": "id",    "type": "bigint",  "pk": true,  "fk": false, "nullable": false, "unique": true },
          { "id": "col_produtos_nome",  "name": "nome",  "type": "string",  "pk": false, "fk": false, "nullable": false, "unique": false },
          { "id": "col_produtos_preco", "name": "preco", "type": "decimal", "pk": false, "fk": false, "nullable": false, "unique": false }
        ],
        "constraints": []
      }
    },
    {
      "id": "tbl_pedido_produto",
      "type": "table",
      "position": { "x": 480, "y": 400 },
      "data": {
        "name": "pedido_produto",
        "columns": [
          { "id": "col_pp_id",       "name": "id",          "type": "bigint",  "pk": true,  "fk": false, "nullable": false, "unique": true },
          { "id": "col_pp_pedido",   "name": "pedido_id",   "type": "bigint",  "pk": false, "fk": true,  "nullable": false, "unique": false, "linkedEdgeId": "edge_pedidos_pp" },
          { "id": "col_pp_produto",  "name": "produto_id",  "type": "bigint",  "pk": false, "fk": true,  "nullable": false, "unique": false, "linkedEdgeId": "edge_produtos_pp" },
          { "id": "col_pp_qtd",      "name": "quantidade",  "type": "integer", "pk": false, "fk": false, "nullable": false, "unique": false }
        ],
        "constraints": [
          {
            "id": "cst_pp_unico",
            "name": "uq_pedido_produto",
            "columnIds": ["col_pp_pedido", "col_pp_produto"],
            "color": "bg-amber-500"
          }
        ]
      }
    }
  ],

  "edges": [
    {
      "id": "edge_usuarios_pedidos",
      "type": "relationship",
      "source": "tbl_usuarios",
      "target": "tbl_pedidos",
      "data": { "cardinality": "1:N", "fkName": "usuario_id" }
    },
    {
      "id": "edge_pedidos_pp",
      "type": "relationship",
      "source": "tbl_pedidos",
      "target": "tbl_pedido_produto",
      "data": { "cardinality": "1:N", "fkName": "pedido_id" }
    },
    {
      "id": "edge_produtos_pp",
      "type": "relationship",
      "source": "tbl_produtos",
      "target": "tbl_pedido_produto",
      "data": { "cardinality": "1:N", "fkName": "produto_id" }
    }
  ],

  "enums": [
    {
      "id": "enum_status_pedido",
      "name": "status_pedido",
      "options": [
        { "id": "opt_status_pendente", "label": "Pendente", "value": "pendente" },
        { "id": "opt_status_pago",     "label": "Pago",     "value": "pago" },
        { "id": "opt_status_enviado",  "label": "Enviado",  "value": "enviado" }
      ]
    }
  ],

  "groups": [
    {
      "id": "grp_vendas",
      "name": "modulo_vendas",
      "position": { "x": 432, "y": -8 },
      "width": 784,
      "height": 676,
      "color": "sky"
    }
  ]
}
```

---

## Regras

### Ids

Qualquer string, desde que **única**. Use ids legíveis (`tbl_x`, `col_x_y`, `edge_a_b`,
`enum_x`, `cst_x`, `grp_x`) — facilita conferir as referências cruzadas.

### Colunas

Os 4 booleanos (`pk`, `fk`, `nullable`, `unique`) são **obrigatórios**, sempre.
`linkedEdgeId` e `enumId` são opcionais.

`type` só aceita um destes 10 valores:

`string` `integer` `bigint` `decimal` `boolean` `date` `datetime` `uuid` `text` `enum`

Mapeamento a partir do banco:

| Tipo no banco | Use |
|---|---|
| `varchar`, `char` | `string` |
| `text`, `longtext`, `json`, `jsonb`, arrays, `blob` | `text` |
| `int`, `smallint`, `tinyint`, `serial` | `integer` |
| `bigint`, `bigserial` | `bigint` |
| `decimal`, `numeric`, `float`, `double`, `money` | `decimal` |
| `boolean`, `tinyint(1)` | `boolean` |
| `date` | `date` |
| `timestamp`, `timestamptz`, `datetime`, `time` | `datetime` |
| `uuid` | `uuid` |
| enum nativo, `ENUM(...)`, `CHECK (x IN (...))` | `enum` + entrada em `enums` |

Outros mapeamentos: `NOT NULL` → `nullable: false`; índice UNIQUE de coluna única →
`unique: true`; UNIQUE composto → não marque as colunas, crie uma **constraint** (abaixo).

Nomes: minúsculos, espaços viram `_`. Mantenha os nomes reais do banco — não traduza,
não renomeie, não invente tabelas nem colunas que não existem.

### Relacionamentos

Para **cada FK do banco**, gere as duas coisas juntas:

1. A **aresta**: `source` = tabela **referenciada** (lado 1), `target` = tabela que
   **tem a coluna FK** (lado N).
2. A **coluna FK na tabela `target`**, com `fk: true` e `linkedEdgeId` apontando para o
   id da aresta. `data.fkName` da aresta = o nome dessa coluna.

Cardinalidade:

- `"1:N"` — o caso normal.
- `"1:1"` — quando a coluna FK também é UNIQUE (marque `unique: true` nela).
- `"N:N"` — **nunca grave**. No banco a relação N:N já existe como tabela pivô: trate a
  pivô como uma tabela normal e ligue duas arestas `1:N` (uma de cada lado), como no
  exemplo acima.

Detalhes que aparecem em bancos reais:

- **Auto-relacionamento** (ex.: `categorias.parent_id → categorias.id`): `source` e
  `target` são a mesma tabela. Funciona normalmente.
- **FK opcional**: `nullable: true` na coluna FK; a cardinalidade continua `1:N`.
- **FK composta**: gere **uma** aresta e ligue o `linkedEdgeId` a apenas uma das colunas
  (as outras ficam `fk: true` sem `linkedEdgeId`).
- O `type` da coluna FK deve ser igual ao da PK que ela referencia.

**Não escreva `sourceHandle`/`targetHandle`.** Quando ausentes, a app escolhe os lados
em que o fio encosta a partir da posição das tabelas — é o resultado que você quer.

### Enums

Um objeto em `enums` por enum do banco. `value` = o valor gravado no banco;
`label` = versão legível para exibição. Toda coluna `type: "enum"` precisa de um
`enumId` que exista na lista.

### Constraints (UNIQUE composto)

Ficam **dentro** da tabela, em `data.constraints`, e referenciam `columnIds` daquela
mesma tabela. `color` é uma classe Tailwind — cicle nesta ordem por tabela:

`bg-amber-500` `bg-sky-500` `bg-violet-500` `bg-rose-500` `bg-emerald-500` `bg-fuchsia-500`

Tabelas sem constraints levam `"constraints": []` (o campo não pode sumir).

### Posições e layout

Coordenadas são absolutas, canto superior esquerdo do card, e você é responsável por
elas — a app não faz auto-layout.

- **Largura do card: 288px, sempre.**
- **Altura** (medida, exata):

  ```
  altura = 85 + 26 × (nº de colunas)
              + 30 × (nº de colunas type "enum")
              + (nº de constraints > 0 ? 10 + 21 × nº de constraints : 0)
  ```

  Ex.: 4 colunas, 1 delas enum, sem constraints → `85 + 104 + 30 = 219`.

Como distribuir:

- Grade com passo horizontal de **400px** (288 + 112 de folga).
- Verticalmente, próximo `y` = `y atual + altura da tabela + 80`.
- Ponha a tabela referenciada (lado 1) à esquerda ou acima das que dependem dela, e
  tabelas relacionadas por perto — os fios saem muito mais limpos.
- Agrupe por módulo/domínio em blocos separados por ~200px.
- **Nunca deixe dois cards se sobrepondo** — confira com a fórmula de altura.

### Grupos (opcional)

Caixa desenhada atrás das tabelas, só para separar módulos visualmente. **Não existe
lista de membros:** uma tabela pertence ao grupo quando o card cabe **inteiro** dentro
da caixa. Para incluir/excluir, é só a geometria.

Para envolver um conjunto de tabelas (48px de folga + 40px de cabeçalho no topo):

```
position.x = min(x)  - 48
position.y = min(y)  - 88
width      = max(x + 288)    - min(x) + 96
height     = max(y + altura) - min(y) + 136
```

Mínimo 220×160. `color` ∈ `slate` `amber` `sky` `violet` `rose` `emerald`.

---

## O que quebra o diagrama

- Aresta apontando para um `id` de tabela que não existe → o fio some.
- `enumId` ou `linkedEdgeId` apontando para algo que não existe na lista.
- `type` diferente de `"table"` no nó ou de `"relationship"` na aresta.
- Faltar qualquer um dos 4 booleanos da coluna, ou faltar `data.constraints`.
- Ids repetidos.
- Cards sobrepostos ou grupo pequeno demais para conter as tabelas.
- Gravar `"cardinality": "N:N"`.
- Escrever `measured`, `selected` ou `dragging` no nó — são descartados na importação.

## Antes de entregar

1. Todo `source`/`target` de aresta existe em `nodes`.
2. Toda aresta tem, na tabela `target`, uma coluna com `fk: true` e
   `linkedEdgeId` igual ao id dela — e o `fkName` bate com o nome dessa coluna.
3. Todo `enumId` usado existe em `enums`.
4. Todo `columnIds` de constraint existe na mesma tabela.
5. Nenhum retângulo de tabela se sobrepõe a outro.
6. O JSON é válido e tem só as 4 chaves de topo.
