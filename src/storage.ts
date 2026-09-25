// 本地留档：仅使用浏览器 localStorage，不增加任何依赖
// 校准资料、设备状态、顾客验光记录各自独立分键存放，结构互不混杂
import type { Archive, Calibration, Device, ExamRecord } from "./types";

const STORAGE_KEY = "hxwl-11.archive.v1";

export function loadArchive(): Archive {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { devices: [], calibrations: [], records: [] };
    const parsed = JSON.parse(raw) as Partial<Archive>;
    return {
      devices: Array.isArray(parsed.devices) ? (parsed.devices as Device[]) : [],
      calibrations: Array.isArray(parsed.calibrations)
        ? (parsed.calibrations as Calibration[])
        : [],
      records: Array.isArray(parsed.records) ? (parsed.records as ExamRecord[]) : [],
    };
  } catch {
    // 留档损坏时不应拖垮页面，按空档处理
    return { devices: [], calibrations: [], records: [] };
  }
}

export function saveArchive(archive: Archive): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(archive));
}

export function makeId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}
