/** Shell của `/designer` — `activeId` đọc từ URL nên `/designer/:tab` deep-link được. (Phase 3c) */
import React from 'react';
import { useParams } from 'react-router-dom';
import { DashboardShell } from './DashboardShell';
import { DESIGNER_NAV } from './navConfig';

export const DesignerDashboardShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tab } = useParams();
  const known = DESIGNER_NAV.some((group) => group.items.some((item) => item.id === tab));
  return (
    <DashboardShell
      basePath="/designer"
      activeId={known ? String(tab) : 'overview'}
      groups={DESIGNER_NAV}
      brandTitle="Xưởng thiết kế"
      brandHint="Tác giả & bản quyền"
      navLabel="Điều hướng studio tác giả"
    >
      {children}
    </DashboardShell>
  );
};
