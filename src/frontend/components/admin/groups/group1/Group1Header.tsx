import React from 'react';
import { Badge, InfoTip, Icon } from '@frontend/ui';
import type { Group1HeaderProps } from './types';

export const Group1Header: React.FC<Group1HeaderProps> = (props) => {
  const { setActiveTab, activeTab, stats, partners } = props;

  return (
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-surface p-6 rounded-lg border border-line">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="technical">{'Xưởng in & Thiết bị'}</Badge>
            <h2 className="text-xl font-bold text-fg tracking-tight">
              {'Quản Trị Mạng Lưới Xưởng In & Đội Máy'}
            </h2>
          </div>
          <div className="mt-1">
            <InfoTip label="Mục này quản trị những gì?">
              Điều phối xưởng in 3 miền Bắc - Trung - Nam, thanh tra hiệu suất máy in real-time và kiểm soát tồn kho nhựa.
            </InfoTip>
          </div>
        </div>

        {/* Tab Navigation Buttons */}
        <div className="inline-flex flex-wrap items-center gap-1 rounded-md border border-line bg-surface-muted p-1">
          <button
            onClick={() => setActiveTab('workshops')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'workshops'
                ? 'bg-surface text-fg font-semibold shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="home_work" size={18} />
            Danh Sách Xưởng
          </button>
          <button
            onClick={() => setActiveTab('fleet')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'fleet'
                ? 'bg-surface text-fg font-semibold shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="precision_manufacturing" size={18} />
            Đội Máy
          </button>
          <button
            onClick={() => setActiveTab('materials')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'materials'
                ? 'bg-surface text-fg font-semibold shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="inventory_2" size={18} />
            Tồn Kho Nhựa
            {stats.lowStockMaterialsCount > 0 && (
              <Badge variant="danger" size="sm">
                {stats.lowStockMaterialsCount}
              </Badge>
            )}
          </button>
          <button
            onClick={() => setActiveTab('partners')}
            className={`flex items-center gap-1.5 rounded-sm px-3 py-1.5 text-sm font-medium transition-colors cursor-pointer ${
              activeTab === 'partners'
                ? 'bg-surface text-fg font-semibold shadow-e1'
                : 'text-fg-muted hover:text-fg'
            }`}
          >
            <Icon name="handshake" size={18} />
            Đối Tác (DB)
            {partners.length > 0 && (
              <Badge variant="technical" size="sm">
                {partners.length}
              </Badge>
            )}
          </button>
        </div>
      </div>
  );
};
