/**
 * Collaboration Workspace UI Foundation V1 — routes, copy, and presentation helpers.
 * Arabic-first surface (RTL). Overlay only — no Learning/Commerce bindings.
 */

import {
  COLLABORATION_WORKSPACE_INVITE_ROLES,
  COLLABORATION_WORKSPACE_KINDS,
  collaborationWorkspaceAllows,
  type CollaborationWorkspaceInviteRole,
  type CollaborationWorkspaceKind,
  type CollaborationWorkspaceRole,
  type CollaborationWorkspaceStatus,
} from "./workspaceSpineFoundation";

export const COLLABORATION_UI_ROUTES = {
  root: "/workspaces",
  inviteRedeem: "/workspaces/invite",
  workspace: (workspaceId: string) => `/workspaces/${workspaceId}`,
  members: (workspaceId: string) => `/workspaces/${workspaceId}/members`,
  invites: (workspaceId: string) => `/workspaces/${workspaceId}/invites`,
  settings: (workspaceId: string) => `/workspaces/${workspaceId}/settings`,
} as const;

export const COLLABORATION_UI_COPY = {
  brand: "UMTUBA Collaboration",
  workspacesTitle: "مساحات العمل",
  workspacesSubtitle: "إدارة الفرق والدعوات داخل منصة التعاون",
  emptyTitle: "لا توجد مساحات عمل بعد",
  emptyDescription:
    "أنشئ مساحة عمل للفريق أو الشركة أو المدرسة، ثم ادعُ الأعضاء.",
  createCta: "إنشاء مساحة عمل",
  createTitle: "إنشاء مساحة عمل",
  createSubmit: "إنشاء وتفعيل",
  switcherLabel: "التبديل بين المساحات",
  detailsTitle: "تفاصيل المساحة",
  membersTitle: "الأعضاء",
  invitesTitle: "الدعوات",
  loading: "جارٍ التحميل…",
  loadErrorTitle: "تعذّر تحميل مساحات العمل",
  membersEmpty: "لا يوجد أعضاء ظاهرون وفق صلاحياتك.",
  invitesEmpty: "لا توجد دعوات معلّقة.",
  inviteCreate: "إرسال دعوة",
  inviteRedeemTitle: "قبول أو رفض دعوة",
  inviteTokenLabel: "رمز الدعوة",
  acceptInvite: "قبول الدعوة",
  declineInvite: "رفض الدعوة",
  revokeInvite: "إلغاء الدعوة",
  slugLabel: "المعرّف (slug)",
  nameLabel: "الاسم الظاهر",
  kindLabel: "النوع",
  descriptionLabel: "الوصف (اختياري)",
  roleLabel: "الدور",
  emailLabel: "البريد الإلكتروني",
  statusLabel: "الحالة",
  myRoleLabel: "دورك",
  openWorkspace: "فتح المساحة",
  backToList: "كل المساحات",
  settingsTitle: "الإعدادات ودورة الحياة",
  settingsSubtitle: "عرض الحالة والإجراءات الآمنة لمساحة العمل",
  settingsDenied: "ليست لديك صلاحية إدارة إعدادات هذه المساحة.",
  profileReadOnlyNote:
    "الاسم والوصف للقراءة فقط — لا يوجد عقد تعديل آمن في وقت التشغيل بعد الإنشاء.",
  profileEditUnsupported: "تعديل الاسم أو الوصف غير مدعوم بعد.",
  lifecycleTitle: "دورة حياة المساحة",
  archiveTitle: "أرشفة المساحة",
  archiveHelp: "الأرشفة متاحة للمالك فقط. لا تحذف الأعضاء أو الرسائل عبر هذه الواجهة.",
  archiveConfirm: "أؤكّد أرشفة مساحة العمل",
  archiveSubmit: "أرشفة المساحة",
  archiveDisabled: "الأرشفة متاحة للمالك عندما لا تكون المساحة مؤرشفة.",
  activateTitle: "تفعيل المسودة",
  activateHelp: "يمكن للمالك تفعيل مساحة بحالة مسودة فقط.",
  activateSubmit: "تفعيل المساحة",
  leaveTitle: "مغادرة المساحة",
  leaveHelp: "المالك لا يمكنه المغادرة قبل نقل الملكية.",
  leaveSubmit: "مغادرة المساحة",
  leaveDisabled: "المغادرة غير متاحة لدورك أو لحالة المساحة الحالية.",
} as const;

export const COLLABORATION_KIND_LABELS: Record<
  CollaborationWorkspaceKind,
  string
> = {
  team: "فريق",
  company: "شركة",
  school: "مدرسة",
  academy: "أكاديمية",
};

export const COLLABORATION_STATUS_LABELS: Record<
  CollaborationWorkspaceStatus,
  string
> = {
  draft: "مسودة",
  active: "نشطة",
  suspended: "معلّقة",
  archived: "مؤرشفة",
};

export const COLLABORATION_ROLE_LABELS: Record<
  CollaborationWorkspaceRole,
  string
> = {
  owner: "مالك",
  admin: "مشرف",
  manager: "مدير",
  billing_manager: "مدير فوترة",
  member: "عضو",
  auditor: "مدقق",
};

export function collaborationKindLabel(kind: string): string {
  if ((COLLABORATION_WORKSPACE_KINDS as readonly string[]).includes(kind)) {
    return COLLABORATION_KIND_LABELS[kind as CollaborationWorkspaceKind];
  }
  return kind;
}

export function collaborationStatusLabel(status: string): string {
  return (
    COLLABORATION_STATUS_LABELS[status as CollaborationWorkspaceStatus] ??
    status
  );
}

export function collaborationRoleLabel(role: string): string {
  return (
    COLLABORATION_ROLE_LABELS[role as CollaborationWorkspaceRole] ?? role
  );
}

export function canManageCollaborationInvites(
  role: CollaborationWorkspaceRole | string
): boolean {
  return (
    collaborationWorkspaceAllows(role, "invite_members") ||
    collaborationWorkspaceAllows(role, "manage_members")
  );
}

export function canViewCollaborationInvites(
  role: CollaborationWorkspaceRole | string
): boolean {
  return (
    collaborationWorkspaceAllows(role, "manage_members") ||
    collaborationWorkspaceAllows(role, "invite_members")
  );
}

/** Owner/admin settings chrome (manage_workspace). */
export function canManageCollaborationWorkspace(
  role: CollaborationWorkspaceRole | string
): boolean {
  return collaborationWorkspaceAllows(role, "manage_workspace");
}

/** SQL archive RPC is owner-only (not admin). */
export function canArchiveCollaborationWorkspace(
  role: CollaborationWorkspaceRole | string
): boolean {
  return role === "owner";
}

/** SQL activate RPC is owner-only and draft-only (status checked separately). */
export function canActivateCollaborationWorkspace(
  role: CollaborationWorkspaceRole | string
): boolean {
  return role === "owner";
}

/** Non-owners may leave; owner must transfer first (enforced by RPC). */
export function canLeaveCollaborationWorkspace(
  role: CollaborationWorkspaceRole | string
): boolean {
  return role !== "owner";
}

export function isCollaborationInviteRole(
  role: string
): role is CollaborationWorkspaceInviteRole {
  return (COLLABORATION_WORKSPACE_INVITE_ROLES as readonly string[]).includes(
    role
  );
}

export function shortenCollaborationId(id: string): string {
  if (id.length <= 12) return id;
  return `${id.slice(0, 8)}…`;
}
