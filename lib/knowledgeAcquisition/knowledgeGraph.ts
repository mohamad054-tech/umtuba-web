import type {
  KnowledgeGraphEdge,
  KnowledgeGraphNode,
  KnowledgeGraphNodeKind,
  KnowledgeRelationType,
} from "./types";

export function createGraphNode(input: {
  kind: KnowledgeGraphNodeKind;
  label: string;
  refId: string;
}): KnowledgeGraphNode {
  return {
    id: `node_${input.kind}_${input.refId}`,
    kind: input.kind,
    label: input.label,
    refId: input.refId,
  };
}

export function createGraphEdge(input: {
  type: KnowledgeRelationType;
  fromNodeId: string;
  toNodeId: string;
  detail?: string | null;
}): KnowledgeGraphEdge {
  return {
    id: `edge_${input.type}_${input.fromNodeId}_${input.toNodeId}`,
    type: input.type,
    fromNodeId: input.fromNodeId,
    toNodeId: input.toNodeId,
    detail: input.detail ?? null,
  };
}
