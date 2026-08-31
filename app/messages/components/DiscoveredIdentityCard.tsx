"use client";

import StartDirectMessageButton from "../../components/messaging/StartDirectMessageButton";
import { initialsFromName, peerGradientFromId } from "../types";
import type { DiscoveredIdentity } from "../../../lib/comms/privacyContract";

type DiscoveredIdentityCardProps = {
  identity: DiscoveredIdentity;
  currentUserId: string;
  messageLabel: string;
  foundLabel: string;
};

export default function DiscoveredIdentityCard({
  identity,
  currentUserId,
  messageLabel,
  foundLabel,
}: DiscoveredIdentityCardProps) {
  const isSelf = identity.userId === currentUserId;

  return (
    <div className="mt-4 rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-12 w-12 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br ${peerGradientFromId(identity.userId)} text-sm font-black text-white`}
        >
          {identity.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={identity.avatarUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            initialsFromName(identity.displayName)
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-black text-white" dir="auto">
            {identity.displayName}
          </p>
          <p className="truncate text-xs text-white/50" dir="ltr">
            @{identity.username}
          </p>
        </div>
        {isSelf ? null : (
          <StartDirectMessageButton
            peerUserId={identity.userId}
            peerName={identity.displayName}
            label={messageLabel}
          />
        )}
      </div>
      <p className="mt-3 text-xs leading-5 text-white/45">{foundLabel}</p>
    </div>
  );
}
