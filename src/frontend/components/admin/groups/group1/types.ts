import type { Dispatch, FormEvent, SetStateAction } from 'react';
import type { PrinterProfile, WorkshopMachine, WorkshopMaterial, WorkshopPartner, WorkshopProfile } from '@/types';
import type { DataTableColumn } from '@frontend/ui';
import type { WorkshopFilterState } from '@frontend/stores/useWorkshopAdminStore';

export interface Group1Stats {
  totalWorkshops: number;
  verifiedCount: number;
  pendingCount: number;
  suspendedCount: number;
  lowStockMaterialsCount: number;
}

export interface Group1HeaderProps {
  setActiveTab: Dispatch<SetStateAction<"workshops" | "fleet" | "materials" | "partners">>;
  activeTab: "workshops" | "fleet" | "materials" | "partners";
  stats: Group1Stats;
  partners: WorkshopPartner[];
}

export interface Group1KpiProps {
  workshopsError: string | null;
  workshopsLoading: boolean;
  stats: Group1Stats;
  fleetError: string | null;
  fleetPrinters: PrinterProfile[] | null;
  fleetCounts: { total: number; free: number; busy: number; maintenance: number; };
}

export interface WorkshopsTabProps {
  setFilterRegion: (region: WorkshopFilterState["region"]) => void;
  filters: WorkshopFilterState;
  setFilterStatus: (status: WorkshopFilterState["status"]) => void;
  setSearchQuery: (query: string) => void;
  setIsAddWorkshopModalOpen: Dispatch<SetStateAction<boolean>>;
  workshopsLoading: boolean;
  workshops: WorkshopProfile[];
  workshopsError: string | null;
  loadWorkshops: () => Promise<void>;
  filteredWorkshops: WorkshopProfile[];
  numOrEmpty: (val: number | null | undefined, unit?: string) => string;
  vndOrEmpty: (val: number | null | undefined) => string;
  handleApprove: (id: string, name: string) => void;
  setActiveTab: Dispatch<SetStateAction<"workshops" | "fleet" | "materials" | "partners">>;
  handleSuspend: (id: string, name: string) => void;
  handleSetWorkshopStatus: (id: string, status: WorkshopProfile["verifiedStatus"], name: string) => Promise<void>;
}

export interface FleetTabProps {
  setFleetStatusFilter: Dispatch<SetStateAction<"all" | "Maintenance" | "Free" | "Busy">>;
  fleetStatusFilter: "all" | "Maintenance" | "Free" | "Busy";
  isFleetLoading: boolean;
  loadFleet: () => Promise<void>;
  setIsAddMachineModalOpen: Dispatch<SetStateAction<boolean>>;
  fleetPrinters: PrinterProfile[] | null;
  fleetError: string | null;
  filteredPrinters: PrinterProfile[];
  getDepreciationPerHour: (machine: WorkshopMachine) => number;
  electricityRateVnd: number | null;
  getElectricityPerHour: (machine: WorkshopMachine, electricityRateOverride?: number) => number;
  formatVnd: (val: number) => string;
  handleSetPrinterStatus: (printer: PrinterProfile, status: PrinterProfile["status"]) => Promise<void>;
}

export interface MaterialsTabProps {
  lowStockList: WorkshopMaterial[];
  setIsAddMaterialModalOpen: Dispatch<SetStateAction<boolean>>;
  materials: WorkshopMaterial[];
  materialColumns: DataTableColumn<WorkshopMaterial>[];
}

export interface PartnersTabProps {
  partners: WorkshopPartner[];
  isPartnersLoading: boolean;
  loadPartners: () => Promise<void>;
  setPartnerDraft: Dispatch<SetStateAction<WorkshopPartner | null>>;
  emptyPartnerDraft: () => WorkshopPartner;
  partnerColumns: DataTableColumn<WorkshopPartner>[];
  partnerDraft: WorkshopPartner | null;
  handleSubmitPartner: (e: FormEvent) => void;
}

export interface AddWorkshopModalProps {
  setIsAddWorkshopModalOpen: Dispatch<SetStateAction<boolean>>;
  handleCreateWorkshop: (e: FormEvent) => Promise<void>;
  newWorkshopForm: { workshopName: string; address: string; region: "B\u1EAFc" | "Trung" | "Nam"; electricityRateOverride: number | null; laborRateOverride: number | null; contactPhone: string; contactEmail: string; verifiedStatus: "Pending" | "Verified" | "Suspended"; };
  setNewWorkshopForm: Dispatch<SetStateAction<{ workshopName: string; address: string; region: "B\u1EAFc" | "Trung" | "Nam"; electricityRateOverride: number | null; laborRateOverride: number | null; contactPhone: string; contactEmail: string; verifiedStatus: "Pending" | "Verified" | "Suspended"; }>>;
}

export interface AddMachineModalProps {
  setIsAddMachineModalOpen: Dispatch<SetStateAction<boolean>>;
  handleCreateMachine: (e: FormEvent) => Promise<void>;
  newMachineForm: { machineName: string; brand: string; machineType: WorkshopMachine["machineType"]; avgPowerKW: number | null; purchasePrice: number | null; lifetimeHours: number | null; };
  setNewMachineForm: Dispatch<SetStateAction<{ machineName: string; brand: string; machineType: WorkshopMachine["machineType"]; avgPowerKW: number | null; purchasePrice: number | null; lifetimeHours: number | null; }>>;
}

export interface AddMaterialModalProps {
  setIsAddMaterialModalOpen: Dispatch<SetStateAction<boolean>>;
  handleCreateMaterial: (e: FormEvent) => void;
  newMaterialForm: { workshopId: string; materialName: string; materialType: WorkshopMaterial["materialType"]; pricePerKg: number; colorHex: string; colorName: string; density: number; currentStockGrams: number; lowStockThresholdGrams: number; };
  setNewMaterialForm: Dispatch<SetStateAction<{ workshopId: string; materialName: string; materialType: WorkshopMaterial["materialType"]; pricePerKg: number; colorHex: string; colorName: string; density: number; currentStockGrams: number; lowStockThresholdGrams: number; }>>;
  workshops: WorkshopProfile[];
}
