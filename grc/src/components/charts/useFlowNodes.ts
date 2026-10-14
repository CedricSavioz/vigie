import { useNodesState, type Node, type NodeChange } from '@xyflow/react'
import { useCallback, useEffect, useRef } from 'react'

/**
 * Nœuds React Flow dérivés des données, mais déplaçables :
 * à chaque mise à jour des données, le placement automatique est recalculé,
 * sauf pour les nœuds que l'utilisateur a déplacés à la main.
 */
export function useFlowNodes<N extends Node>(computed: N[]) {
  const [nodes, setNodes, onNodesChangeBase] = useNodesState<N>([])
  const dragged = useRef(new Map<string, { x: number; y: number }>())

  useEffect(() => {
    setNodes(computed.map((n) => ({ ...n, position: dragged.current.get(n.id) ?? n.position })))
  }, [computed, setNodes])

  const onNodesChange = useCallback(
    (changes: NodeChange<N>[]) => {
      for (const c of changes) if (c.type === 'position' && c.position) dragged.current.set(c.id, c.position)
      onNodesChangeBase(changes)
    },
    [onNodesChangeBase],
  )

  const resetLayout = useCallback(() => {
    dragged.current.clear()
    setNodes(computed)
  }, [computed, setNodes])

  return { nodes, onNodesChange, resetLayout }
}
