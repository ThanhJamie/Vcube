/** Shell của `/lab` — `activeId` đọc từ URL nên `/lab/:tab` deep-link được. (Phase 3c) */
import React from 'react';
import { useParams } from 'react-router-dom';
import { DashboardShell } from './DashboardShell';
import { LAB_NAV } from './navConfig';

export const LabDashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tab } = useParams();
  const known = LAB_NAV.some((group) => group.items.some((item) => item.id === tab));
  return (
    <DashboardShell
      basePath="/lab"
      activeId={known ? String(tab) : 'queue'}
      groups={LAB_NAV}
      brandTitle="Xưởng in VCUBE"
      brandHint="Xưởng in (MES)"
      navLabel="Điều hướng xưởng in"
    >
      {children}
    </DashboardShell>
  );
};
