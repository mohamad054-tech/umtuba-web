import type { LiveCollabSharedItem } from "../types";

/** Demo shared items for collaboration panel until upload RPC ships. */
export const MOCK_COLLAB_ITEMS: LiveCollabSharedItem[] = [
  {
    id: "collab-1",
    kind: "image",
    fileName: "lagos-waterfront-ref.jpg",
    typeLabel: "Image · JPG",
    sizeLabel: "1.4 MB",
    senderId: "creator-amara",
    senderName: "Amara Okonkwo",
    senderInitials: "AO",
    sentAtLabel: "8m ago",
    previewLabel: "Soft preview · signed access later",
    canPreview: true,
  },
  {
    id: "collab-2",
    kind: "pdf",
    fileName: "shot-list-v3.pdf",
    typeLabel: "PDF",
    sizeLabel: "420 KB",
    senderId: "u2",
    senderName: "Sofia Reyes",
    senderInitials: "SR",
    sentAtLabel: "3m ago",
    previewLabel: "First page placeholder",
    canPreview: true,
  },
  {
    id: "collab-3",
    kind: "link",
    fileName: "umtuba.com/brief/lagos-sunrise",
    typeLabel: "Link",
    sizeLabel: "—",
    senderId: "creator-amara",
    senderName: "Amara Okonkwo",
    senderInitials: "AO",
    sentAtLabel: "1m ago",
    canPreview: false,
  },
];
