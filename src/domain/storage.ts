/**
 * 本地留档：校准与验光记录写入 localStorage，
 * 重开页面后当天校准、放行状态与顾客数据仍在。
 */
import type { Calibration, ExamRecord } from "./types";

const CALIBRATION_KEY = "hxwl11.calibrations.v1";
const EXAM_KEY = "hxwl11.exams.v1";

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeList(key: string, list: unknown[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(list));
  } catch {
    // 存储不可用（隐私模式/超限）时仅保留页面内数据
  }
}

export function loadCalibrations(): Calibration[] {
  return readList<Calibration>(CALIBRATION_KEY);
}

export function saveCalibrations(list: Calibration[]): void {
  writeList(CALIBRATION_KEY, list);
}

export function loadExams(): ExamRecord[] {
  return readList<ExamRecord>(EXAM_KEY);
}

export function saveExams(list: ExamRecord[]): void {
  writeList(EXAM_KEY, list);
}
