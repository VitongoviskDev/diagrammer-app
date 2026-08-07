import { useDiagrammerStore } from '@/store'
import { modLabel, useIsMacModifier } from '@/lib/platform'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Shortcut {
  /** Rendered as key caps, joined by "+". */
  keys?: string[]
  /** Mouse half of the gesture, appended after the keys as plain text. */
  mouse?: string
  label: string
}

const buildSections = (mod: string): { title: string; items: Shortcut[] }[] => [
  {
    title: 'Canvas',
    items: [
      { keys: ['Espaço'], mouse: 'arrastar', label: 'Mover a visualização (pan)' },
      { mouse: 'Roda do mouse / pinça', label: 'Zoom' },
      {
        mouse: 'Botão direito no vazio',
        label: 'Menu: criar tabela, criar relação, centralizar',
      },
    ],
  },
  {
    title: 'Seleção',
    items: [
      { mouse: 'Arrastar no vazio', label: 'Selecionar tabelas por área' },
      { keys: ['Shift'], mouse: 'clique', label: 'Adicionar/remover da seleção' },
      { mouse: 'Clique no vazio', label: 'Limpar a seleção' },
    ],
  },
  {
    title: 'Tabelas',
    items: [
      { mouse: 'Arrastar a tabela', label: 'Mover uma tabela' },
      {
        keys: [mod],
        mouse: 'arrastar',
        label: 'Mover todas as tabelas selecionadas, a partir de qualquer ponto',
      },
      {
        mouse: 'Botão direito na tabela',
        label: 'Menu: ver em detalhe, criar relação, excluir',
      },
    ],
  },
  {
    title: 'Relações',
    items: [
      {
        mouse: 'Arrastar de uma bolinha até outra tabela',
        label: 'Criar relação entre as duas',
      },
      {
        mouse: 'Arrastar de uma bolinha e soltar no vazio',
        label: 'Criar uma nova tabela já relacionada',
      },
      {
        keys: [mod],
        mouse: 'arrastar a ponta de uma relação selecionada',
        label: 'Reconectar a relação em outra bolinha da mesma tabela',
      },
      { keys: ['Esc'], label: 'Cancelar o modo "criar relação..."' },
    ],
  },
  {
    title: 'Ajuda',
    items: [
      { keys: ['?'], label: 'Abrir esta janela' },
      { keys: ['Esc'], label: 'Fechar esta janela' },
    ],
  },
]

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-border bg-muted px-1.5 font-sans text-[0.7rem] font-medium text-foreground">
      {children}
    </kbd>
  )
}

function Combo({ keys, mouse }: Pick<Shortcut, 'keys' | 'mouse'>) {
  return (
    <span className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
      {keys?.map((key, i) => (
        <span key={key} className="flex items-center gap-1">
          {i > 0 && <span>+</span>}
          <Kbd>{key}</Kbd>
        </span>
      ))}
      {mouse && (
        <span>
          {keys?.length ? '+ ' : ''}
          {mouse}
        </span>
      )}
    </span>
  )
}

export function ShortcutsModal({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const macStyle = useIsMacModifier()
  const setMacModifierOverride = useDiagrammerStore((s) => s.setMacModifierOverride)
  const mod = modLabel(macStyle)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Atalhos e gestos</DialogTitle>
          <DialogDescription>
            As duas teclas funcionam — <Kbd>⌘</Kbd> e <Kbd>Ctrl</Kbd>. Escolha como prefere
            vê-las aqui:
          </DialogDescription>
          <div className="flex items-center gap-1">
            {[
              { label: '⌘ macOS', value: true },
              { label: 'Ctrl Windows/Linux', value: false },
            ].map((option) => (
              <Button
                key={option.label}
                size="xs"
                variant={macStyle === option.value ? 'secondary' : 'ghost'}
                onClick={() => setMacModifierOverride(option.value)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {buildSections(mod).map((section) => (
            <div key={section.title} className="flex flex-col gap-1.5">
              <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                {section.title}
              </h3>
              <div className="flex flex-col gap-1 rounded-md border border-border p-2">
                {section.items.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-start justify-between gap-4 rounded px-1.5 py-1"
                  >
                    <span className="text-sm">{item.label}</span>
                    <Combo keys={item.keys} mouse={item.mouse} />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
