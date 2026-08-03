/**
 * Collaboration Workspace UI — routes, copy, and presentation helpers.
 * Arabic-first surface (RTL). Overlay only — no Learning/Commerce bindings.
 * Settings & Lifecycle UI V1 extends Foundation V1 routes/capabilities.
 */

import {
  COLLABORATION_WORKSPACE_INVITE_ROLES,
  COLLABORATION_WORKSPACE_KINDS,
  collaborationWorkspaceAllows,
  collaborationWorkspaceCanMutatePeer,
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
  settingsTitle: "الإعدادات",
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
  saveSettings: "حفظ الإعدادات",
  settingsSaved: "تم حفظ إعدادات المساحة.",
  allowMemberInvitesLabel: "السماح بدعوات الأعضاء",
  publicMemberDirectoryLabel: "دليل أعضاء عام",
  lifecycleTitle: "دورة حياة المساحة",
  leaveWorkspace: "مغادرة المساحة",
  leaveOwnerBlocked:
    "لا يمكن للمالك الوحيد المغادرة قبل نقل الملكية إلى عضو نشط آخر.",
  leaveConfirm: "مغادرة مساحة العمل؟",
  archiveWorkspace: "أرشفة المساحة",
  archiveConfirm: "أرشفة مساحة العمل؟ لا يمكن التراجع بسهولة.",
  transferOwnership: "نقل الملكية",
  transferConfirm: "نقل ملكية مساحة العمل إلى هذا العضو؟",
  suspendMember: "تعليق",
  removeMember: "إزالة",
  removeConfirm: "إزالة هذا العضو من المساحة؟",
  lastOwnerProtectionTitle: "حماية المالك الأخير",
  lastOwnerProtectionBody:
    "المالك النشط لا يُعلَّق ولا يُزال ولا يغادر قبل نقل الملكية.",
  unauthorizedAction: "ليست لديك صلاحية لهذا الإجراء.",
  transferTargetLabel: "المالك الجديد",
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

export function canManageCollaborationWorkspaceSettings(
  role: CollaborationWorkspaceRole | string
): boolean {
  return collaborationWorkspaceAllows(role, "manage_workspace");
}

export function canManageCollaborationMembers(
  role: CollaborationWorkspaceRole | string
): boolean {
  return collaborationWorkspaceAllows(role, "manage_members");
}

export function canTransferCollaborationOwnership(
  role: CollaborationWorkspaceRole | string
): boolean {
  return collaborationWorkspaceAllows(role, "transfer_ownership");
}

export function canArchiveCollaborationWorkspace(
  role: CollaborationWorkspaceRole | string
): boolean {
  return role === "owner";
}

/** Non-owners may leave; owners must transfer first (SQL-enforced). */
export function canLeaveCollaborationWorkspace(
  role: CollaborationWorkspaceRole | string
): boolean {
  return role !== "owner";
}

export function canMutateCollaborationMember(
  actorRole: CollaborationWorkspaceRole | string,
  targetRole: CollaborationWorkspaceRole | string,
  targetUserId: string,
  actorUserId: string
): boolean {
  if (targetUserId === actorUserId) return false;
  if (targetRole === "owner") return false;
  if (!canManageCollaborationMembers(actorRole)) return false;
  return collaborationWorkspaceCanMutatePeer(String(actorRole), String(targetRole));
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
