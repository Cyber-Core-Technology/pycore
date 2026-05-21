// frontend/src/features/configuracion/UsuariosPage/OrgTree.tsx
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ChevronDown, ChevronRight, Pencil, UserX, GripVertical } from 'lucide-react'
import type { UsuarioEmpresa } from '@/api/usuarios-api'

// ─── Role colours ─────────────────────────────────────────────────────────────
const ROLE_COLORS: Record<string, { bg: string; text: string }> = {
  Administrador: { bg: 'rgba(16,185,129,0.15)',  text: '#059669' },
  Vendedor:      { bg: 'rgba(59,130,246,0.15)',  text: '#2563EB' },
  Contador:      { bg: 'rgba(139,92,246,0.15)',  text: '#7C3AED' },
  Almacenista:   { bg: 'rgba(245,158,11,0.15)',  text: '#D97706' },
  Consultor:     { bg: 'rgba(107,114,128,0.15)', text: '#4B5563' },
  admin:         { bg: 'rgba(16,185,129,0.15)',  text: '#059669' },
  vendedor:      { bg: 'rgba(59,130,246,0.15)',  text: '#2563EB' },
  contador:      { bg: 'rgba(139,92,246,0.15)',  text: '#7C3AED' },
  almacenista:   { bg: 'rgba(245,158,11,0.15)',  text: '#D97706' },
  gerente:       { bg: 'rgba(239,68,68,0.15)',   text: '#DC2626' },
  rrhh:          { bg: 'rgba(236,72,153,0.15)',  text: '#DB2777' },
}
const rc = (role: string) => ROLE_COLORS[role] ?? { bg: 'rgba(107,114,128,0.15)', text: '#4B5563' }

function initials(name: string) {
  return name.split(' ').slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase()
}

// ─── Build recursive tree ─────────────────────────────────────────────────────
interface TreeNode extends UsuarioEmpresa { children: TreeNode[] }

function buildTree(usuarios: UsuarioEmpresa[]): TreeNode[] {
  const map = new Map<string, TreeNode>()
  usuarios.forEach((u) => map.set(u.id, { ...u, children: [] }))
  const roots: TreeNode[] = []
  map.forEach((node) => {
    const parent = node.jefe_id ? map.get(node.jefe_id) : null
    if (parent) parent.children.push(node)
    else roots.push(node)
  })
  return roots
}

function isDescendant(usuarios: UsuarioEmpresa[], nodeId: string, potentialAncestorId: string): boolean {
  // Returns true if potentialAncestorId is a descendant of nodeId
  // i.e., we can't drop nodeId INTO potentialAncestorId
  const check = (id: string): boolean => {
    const children = usuarios.filter((u) => u.jefe_id === id)
    return children.some((c) => c.id === potentialAncestorId || check(c.id))
  }
  return check(nodeId)
}

// ─── OrgNode ──────────────────────────────────────────────────────────────────
const DRAG_KEY = 'application/x-orgnode-id'

function OrgNode({
  node, depth, isLast, jefeName,
  dropTargetId, setDropTargetId,
  draggedId, setDraggedId,
  onDrop, onEdit, onBaja,
  todos,
}: {
  node:           TreeNode
  depth:          number
  isLast:         boolean
  jefeName:       string | null
  draggedId:      string | null
  setDraggedId:   (id: string | null) => void
  dropTargetId:   string | null
  setDropTargetId:(id: string | null) => void
  onDrop:  (draggedId: string, newJefeId: string | null) => void
  onEdit:  (u: UsuarioEmpresa) => void
  onBaja:  (u: UsuarioEmpresa) => void
  todos:   UsuarioEmpresa[]
}) {
  const { t } = useTranslation()
  const [expanded, setExpanded] = useState(true)
  const hasChildren = node.children.length > 0
  const isTarget    = dropTargetId === node.id

  // ── Drag handlers ──────────────────────────────────────────────────────────

  const onDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData(DRAG_KEY, node.id)
    e.dataTransfer.effectAllowed = 'move'
    // Delay opacity so the ghost snapshot is taken before the style changes
    setTimeout(() => setDraggedId(node.id), 0)
  }

  const onDragEnd = () => {
    setDraggedId(null)
    setDropTargetId(null)
  }

  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation() // prevent parent nodes from stealing highlight

    const dragged = e.dataTransfer.types.includes(DRAG_KEY)
    if (!dragged || draggedId === node.id) return
    // Block if target is inside the dragged subtree
    if (draggedId && isDescendant(todos, draggedId, node.id)) return

    e.dataTransfer.dropEffect = 'move'
    setDropTargetId(node.id)
  }

  const onDragEnter = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    if (draggedId === node.id) return
    if (draggedId && isDescendant(todos, draggedId, node.id)) return
    setDropTargetId(node.id)
  }

  const onDragLeave = (e: React.DragEvent) => {
    e.stopPropagation()
    // relatedTarget = element the cursor is moving INTO
    // If it's still inside this card, ignore
    const related = e.relatedTarget as Node | null
    if (e.currentTarget.contains(related)) return
    setDropTargetId(dropTargetId === node.id ? null : dropTargetId)
  }

  const onDropCard = (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const dragged = e.dataTransfer.getData(DRAG_KEY)
    if (dragged && dragged !== node.id && !(draggedId && isDescendant(todos, dragged, node.id))) {
      onDrop(dragged, node.id)
    }
    setDraggedId(null)
    setDropTargetId(null)
  }

  const isDragging = draggedId === node.id

  return (
    <div style={{ position: 'relative', opacity: isDragging ? 0.35 : 1, transition: 'opacity 0.1s' }}>
      {/* Row */}
      <div style={{ display: 'flex', alignItems: 'center', paddingLeft: depth * 28, marginBottom: 4, position: 'relative' }}>

        {/* Tree connector lines */}
        {depth > 0 && (
          <>
            <span style={{ position: 'absolute', left: depth * 28 - 14, top: -6, bottom: isLast ? '50%' : 0, width: 1, background: 'var(--border)', pointerEvents: 'none' }} />
            <span style={{ position: 'absolute', left: depth * 28 - 14, top: '50%', width: 14, height: 1, background: 'var(--border)', pointerEvents: 'none' }} />
          </>
        )}

        {/* Expand toggle */}
        <button
          onClick={() => hasChildren && setExpanded((v) => !v)}
          style={{ width: 20, height: 20, flexShrink: 0, border: 'none', background: 'none', cursor: hasChildren ? 'pointer' : 'default', color: hasChildren ? 'var(--text-secondary)' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 0, borderRadius: 4 }}
        >
          {hasChildren
            ? expanded ? <ChevronDown size={13} /> : <ChevronRight size={13} />
            : <span style={{ width: 7, height: 7, borderRadius: '50%', background: 'var(--border)', display: 'inline-block' }} />
          }
        </button>

        {/* ── Draggable card ── */}
        <div
          draggable
          onDragStart={onDragStart}
          onDragEnd={onDragEnd}
          onDragOver={onDragOver}
          onDragEnter={onDragEnter}
          onDragLeave={onDragLeave}
          onDrop={onDropCard}
          style={{
            flex: 1, marginLeft: 4,
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '8px 12px',
            borderRadius: 10,
            background: isTarget ? 'rgba(16,185,129,0.07)' : 'var(--surface)',
            border: isTarget ? '2px dashed var(--color-primary)' : '1px solid var(--border)',
            transition: 'border-color 0.12s, background 0.12s',
            cursor: isDragging ? 'grabbing' : 'grab',
            userSelect: 'none',
          }}
        >
          {/* Drag handle */}
          <GripVertical size={14} style={{ color: 'var(--text-secondary)', flexShrink: 0, opacity: 0.4 }} />

          {/* Avatar */}
          <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: node.foto_url ? 'transparent' : 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 700, color: 'var(--color-primary-text)', overflow: 'hidden' }}>
            {node.foto_url
              ? <img src={node.foto_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              : initials(node.nombre_completo)
            }
          </div>

          {/* Info */}
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                {node.nombre_completo}
              </span>
              {node.roles.map((r) => {
                const c = rc(r)
                return (
                  <span key={r} style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 4, background: c.bg, color: c.text, textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap' }}>
                    {r}
                  </span>
                )
              })}
              {node.children.length > 0 && (
                <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: 'rgba(16,185,129,0.12)', color: 'var(--color-primary)', whiteSpace: 'nowrap' }}>
                  {t('orgTree.subs', { count: node.children.length })}
                </span>
              )}
            </div>
            {/* Parent label + email */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 2, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 11, color: 'var(--text-secondary)' }}>{node.email}</span>
              {jefeName && (
                <span style={{ fontSize: 10, padding: '1px 6px', borderRadius: 4, background: 'var(--surface-hover)', color: 'var(--text-secondary)', border: '1px solid var(--border)', whiteSpace: 'nowrap' }}>
                  ↳ {jefeName}
                </span>
              )}
            </div>
          </div>

          {/* Status dot */}
          <div title={node.is_active ? t('orgTree.active') : t('orgTree.inactive')} style={{ width: 8, height: 8, borderRadius: '50%', flexShrink: 0, background: node.is_active ? '#10B981' : 'var(--color-error)' }} />

          {/* Actions */}
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button
              onClick={(e) => { e.stopPropagation(); onEdit(node) }}
              title={t('orgTree.editTitle')}
              style={{ padding: 5, borderRadius: 6, border: 'none', background: 'var(--surface-hover)', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex' }}
            >
              <Pencil size={13} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); onBaja(node) }}
              title={t('orgTree.bajaTitle')}
              style={{ padding: 5, borderRadius: 6, border: 'none', background: 'var(--color-error-bg)', color: 'var(--color-error)', cursor: 'pointer', display: 'flex' }}
            >
              <UserX size={13} />
            </button>
          </div>
        </div>
      </div>

      {/* Children */}
      {hasChildren && expanded && (
        <div>
          {node.children.map((child, i) => (
            <OrgNode
              key={child.id}
              node={child}
              depth={depth + 1}
              isLast={i === node.children.length - 1}
              jefeName={node.nombre_completo}
              draggedId={draggedId}
              setDraggedId={setDraggedId}
              dropTargetId={dropTargetId}
              setDropTargetId={setDropTargetId}
              onDrop={onDrop}
              onEdit={onEdit}
              onBaja={onBaja}
              todos={todos}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Public component ──────────────────────────────────────────────────────────
export function OrgTree({
  usuarios,
  onEdit,
  onBaja,
  onReorder,
}: {
  usuarios:  UsuarioEmpresa[]
  onEdit:    (u: UsuarioEmpresa) => void
  onBaja:    (u: UsuarioEmpresa) => void
  onReorder: (userId: string, newJefeId: string | null) => void
}) {
  const { t } = useTranslation()
  const [draggedId,    setDraggedId]    = useState<string | null>(null)
  const [dropTargetId, setDropTargetId] = useState<string | null>(null)
  const [rootHover,    setRootHover]    = useState(false)

  const roots       = buildTree(usuarios)
  const draggedUser = usuarios.find((u) => u.id === draggedId)

  if (roots.length === 0) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 13 }}>
        {t('orgTree.noUsers')}
      </div>
    )
  }

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '16px 16px 12px', overflowX: 'auto' }}>
      {/* Hint */}
      <p style={{ fontSize: 11, color: 'var(--text-secondary)', marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6 }}>
        <GripVertical size={12} /> {t('orgTree.hint')}
      </p>

      {/* Root drop zone — visible only while dragging */}
      <div
        style={{
          marginBottom: 10,
          padding: draggedId ? '8px 16px' : '0',
          maxHeight: draggedId ? 40 : 0,
          overflow: 'hidden',
          borderRadius: 8,
          border: rootHover ? '2px dashed var(--color-primary)' : '2px dashed transparent',
          background: rootHover ? 'rgba(16,185,129,0.06)' : 'transparent',
          fontSize: 12,
          color: rootHover ? 'var(--color-primary)' : 'var(--text-secondary)',
          textAlign: 'center',
          transition: 'all 0.15s',
        }}
        onDragOver={(e) => { e.preventDefault(); setRootHover(true) }}
        onDragLeave={() => setRootHover(false)}
        onDrop={(e) => {
          e.preventDefault()
          const dragged = e.dataTransfer.getData(DRAG_KEY)
          if (dragged) onReorder(dragged, null)
          setDraggedId(null)
          setDropTargetId(null)
          setRootHover(false)
        }}
      >
        {t('orgTree.dropToRoot', { nombre: draggedUser?.nombre_completo ?? 'Usuario' })}
      </div>

      {/* Tree */}
      {roots.map((root, i) => (
        <OrgNode
          key={root.id}
          node={root}
          depth={0}
          isLast={i === roots.length - 1}
          jefeName={null}
          draggedId={draggedId}
          setDraggedId={setDraggedId}
          dropTargetId={dropTargetId}
          setDropTargetId={setDropTargetId}
          onDrop={onReorder}
          onEdit={onEdit}
          onBaja={onBaja}
          todos={usuarios}
        />
      ))}
    </div>
  )
}
