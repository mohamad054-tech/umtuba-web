import Link from "next/link";
import type { ReactNode } from "react";
import AppTopNav from "../AppTopNav";
import { MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS } from "../../lib/nav";
import {
  COLLABORATION_UI_COPY,
  COLLABORATION_UI_ROUTES,
} from "../../../lib/collaboration/workspaceUi";

type CollaborationShellProps = {
  title: string;
  subtitle?: string;
  children: ReactNode;
  workspaceId?: string;
  showWorkspaceNav?: boolean;
};

export default function CollaborationShell({
  title,
  subtitle = COLLABORATION_UI_COPY.workspacesSubtitle,
  children,
  workspaceId,
  showWorkspaceNav = false,
}: CollaborationShellProps) {
  const links = workspaceId
    ? [
        {
          href: COLLABORATION_UI_ROUTES.workspace(workspaceId),
          label: COLLABORATION_UI_COPY.detailsTitle,
        },
        {
          href: COLLABORATION_UI_ROUTES.members(workspaceId),
          label: COLLABORATION_UI_COPY.membersTitle,
        },
        {
          href: COLLABORATION_UI_ROUTES.invites(workspaceId),
          label: COLLABORATION_UI_COPY.invitesTitle,
        },
        {
          href: COLLABORATION_UI_ROUTES.settings(workspaceId),
          label: COLLABORATION_UI_COPY.settingsTitle,
        },
        {
          href: COLLABORATION_UI_ROUTES.root,
          label: COLLABORATION_UI_COPY.backToList,
        },
      ]
    : [
        {
          href: COLLABORATION_UI_ROUTES.root,
          label: COLLABORATION_UI_COPY.workspacesTitle,
        },
        {
          href: COLLABORATION_UI_ROUTES.inviteRedeem,
          label: COLLABORATION_UI_COPY.inviteRedeemTitle,
        },
      ];

  return (
    <main
      dir="rtl"
      lang="ar"
      className={`min-h-screen bg-[#050510] text-white ${MOBILE_BOTTOM_NAV_CONTENT_PAD_CLASS}`}
      data-testid="collaboration-shell"
      aria-label={COLLABORATION_UI_COPY.brand}
    >
      <a
        href="#collaboration-main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:start-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2 focus:text-sm focus:font-bold focus:text-black"
        data-testid="collaboration-skip-link"
      >
        تخطي إلى المحتوى
      </a>
      <div className="mx-auto max-w-3xl px-4 py-6 md:px-6">
        <AppTopNav title={title} subtitle={subtitle} />
        {showWorkspaceNav || !workspaceId ? (
          <nav
            aria-label={COLLABORATION_UI_COPY.brand}
            className="mt-4 flex flex-wrap gap-2 border-b border-white/10 pb-4"
            data-testid="collaboration-nav"
          >
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="watch-focus-ring rounded-full border border-white/10 bg-white/[0.03] px-3.5 py-1.5 text-xs font-bold text-white/70 transition hover:bg-white/5 hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        ) : null}
        <div
          id="collaboration-main-content"
          tabIndex={-1}
          className="mt-6 outline-none"
        >
          {children}
        </div>
      </div>
    </main>
  );
}
