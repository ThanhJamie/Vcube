import type { Dispatch, FormEvent, SetStateAction, SyntheticEvent } from 'react';
import type { AccessoryItem, InkiriCostFormulaConfig, MaterialProfile, PrinterProfile, VolumeDiscountTier } from '../../../types';
import type { GlobalFormField } from './pricingShared';

export interface PricingHeaderProps {
  refillFromInkiriReference: () => void;
  handleSaveFormula: (e?: SyntheticEvent) => Promise<void>;
  formulaIsReference: boolean;
  globalIsReference: boolean;
  referenceHeldCount: number;
  referenceTotal: number;
  dbFormulaState: "loading" | "missing" | "loaded" | "error";
  subTab: "formula" | "materials" | "printers" | "accessories" | "inventory" | "estimator";
  setSubTab: Dispatch<SetStateAction<"formula" | "materials" | "printers" | "accessories" | "inventory" | "estimator">>;
  materials: MaterialProfile[];
  printers: PrinterProfile[];
  accessories: AccessoryItem[];
}

export interface FormulaTabProps {
  handleSaveFormula: (e?: SyntheticEvent) => Promise<void>;
  handleSaveGlobalSettings: () => Promise<void>;
  globalSaving: boolean;
  globalIsReference: boolean;
  globalForm: Record<GlobalFormField, string>;
  setGlobalForm: Dispatch<SetStateAction<Record<GlobalFormField, string>>>;
  setGlobalIssues: Dispatch<SetStateAction<Record<string, string>>>;
  globalIssues: Record<string, string>;
  previewRows: { key: string; label: string; saved: number | null; typed: number | null; }[];
  formulaIsReference: boolean;
  formulaForm: Partial<InkiriCostFormulaConfig>;
  updateFormulaField: (key: keyof InkiriCostFormulaConfig, text: string) => void;
  formulaIssues: Record<string, string>;
  totalLaborMins: number;
  laborCostPerUnit: number;
  setFormulaForm: Dispatch<SetStateAction<Partial<InkiriCostFormulaConfig>>>;
  updateFormulaSelect: (value: string) => void;
  handleAddDiscountTier: () => void;
  handleUpdateDiscountTier: (idx: number, updated: Partial<VolumeDiscountTier>) => void;
  numberOrUndefined: (text: string) => number | undefined;
  handleRemoveDiscountTier: (idx: number) => void;
}

export interface MaterialsTabProps {
  materials: MaterialProfile[];
  setIsNewMaterialOpen: Dispatch<SetStateAction<boolean>>;
  setEditingMaterial: Dispatch<SetStateAction<MaterialProfile | null>>;
  handleDeleteMaterial: (id: string, name: string) => void;
}

export interface MaterialEditorModalProps {
  setIsNewMaterialOpen: Dispatch<SetStateAction<boolean>>;
  setEditingMaterial: Dispatch<SetStateAction<MaterialProfile | null>>;
  setMaterialIssues: Dispatch<SetStateAction<Record<string, string>>>;
  editingMaterial: MaterialProfile | null;
  handleSaveEditMaterial: (e: FormEvent) => void;
  handleSaveNewMaterial: (e: FormEvent) => void;
  materialIssues: Record<string, string>;
  materialForm: Partial<MaterialProfile>;
  setMaterialField: (key: keyof MaterialProfile, value: unknown) => void;
  numberOrUndefined: (text: string) => number | undefined;
}

export interface PrintersTabProps {
  printers: PrinterProfile[];
  setIsNewPrinterOpen: Dispatch<SetStateAction<boolean>>;
  formulaForm: Partial<InkiriCostFormulaConfig>;
  setEditingPrinter: Dispatch<SetStateAction<PrinterProfile | null>>;
  handleDeletePrinter: (id: string, name: string) => void;
}

export interface PrinterEditorModalProps {
  setIsNewPrinterOpen: Dispatch<SetStateAction<boolean>>;
  setEditingPrinter: Dispatch<SetStateAction<PrinterProfile | null>>;
  setPrinterIssues: Dispatch<SetStateAction<Record<string, string>>>;
  editingPrinter: PrinterProfile | null;
  handleSaveEditPrinter: (e: FormEvent) => void;
  handleSaveNewPrinter: (e: FormEvent) => void;
  printerIssues: Record<string, string>;
  printerForm: Partial<PrinterProfile>;
  setPrinterField: (key: keyof PrinterProfile, value: unknown) => void;
  setPrinterBedDimension: (axis: "x" | "y" | "z", text: string) => void;
  numberOrUndefined: (text: string) => number | undefined;
  setPrinterThroughput: (text: string) => void;
}

export interface FormulaGlobalCardProps {
  handleSaveGlobalSettings: () => Promise<void>;
  globalSaving: boolean;
  globalIsReference: boolean;
  globalForm: Record<GlobalFormField, string>;
  setGlobalForm: Dispatch<SetStateAction<Record<GlobalFormField, string>>>;
  setGlobalIssues: Dispatch<SetStateAction<Record<string, string>>>;
  globalIssues: Record<string, string>;
  previewRows: { key: string; label: string; saved: number | null; typed: number | null; }[];
}

export interface FormulaCoreSectionsProps {
  formulaIsReference: boolean;
  formulaForm: Partial<InkiriCostFormulaConfig>;
  updateFormulaField: (key: keyof InkiriCostFormulaConfig, text: string) => void;
  formulaIssues: Record<string, string>;
  totalLaborMins: number;
  laborCostPerUnit: number;
  setFormulaForm: Dispatch<SetStateAction<Partial<InkiriCostFormulaConfig>>>;
  updateFormulaSelect: (value: string) => void;
}

export interface FormulaVolumeDiscountProps {
  handleAddDiscountTier: () => void;
  formulaForm: Partial<InkiriCostFormulaConfig>;
  handleUpdateDiscountTier: (idx: number, updated: Partial<VolumeDiscountTier>) => void;
  numberOrUndefined: (text: string) => number | undefined;
  formulaIssues: Record<string, string>;
  handleRemoveDiscountTier: (idx: number) => void;
}

export interface FormulaAddonSectionsProps {
  formulaForm: Partial<InkiriCostFormulaConfig>;
  updateFormulaField: (key: keyof InkiriCostFormulaConfig, text: string) => void;
  formulaIssues: Record<string, string>;
}
