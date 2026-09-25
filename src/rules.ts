// 判定规则：所有放行阈值集中在此文件，页面不自行魔数判断
import type { Calibration, Device } from "./types";

/** 球镜/柱镜允许偏差阈值(D)：任一偏差超过 0.12D 即停用 */
export const MAX_ERROR_DIOPTER = 0.12;

/** 校准有效时长：超过两小时视为未通过，只能留草稿 */
export const CALIBRATION_TTL_MS = 2 * 60 * 60 * 1000;

export type GateState = "released" | "expired" | "stopped" | "uncalibrated";

export interface GateResult {
  state: GateState;
  /** 前台可直接展示的中文判定结论 */
  label: string;
  /** 不通过时的具体原因 */
  reasons: string[];
  /** 最新一次校准（有则附带） */
  calibration: Calibration | null;
  /** 校准是否已超过两小时 */
  expired: boolean;
  /** 距校准时刻经过的毫秒数 */
  ageMs: number | null;
}

function round3(value: number): number {
  return Math.round(value * 1000) / 1000;
}

/** 计算偏差绝对值，避免浮点尾数干扰 0.12D 比较 */
export function calcError(standard: number, measured: number): number {
  return round3(Math.abs(Number(measured) - Number(standard)));
}

/** 单次标准片检查判定：任一偏差超过 0.12D 即不通过 */
export function judgeCalibration(
  standardSphere: number,
  measuredSphere: number,
  standardCylinder: number,
  measuredCylinder: number
): { sphereError: number; cylinderError: number; passed: boolean } {
  const sphereError = calcError(standardSphere, measuredSphere);
  const cylinderError = calcError(standardCylinder, measuredCylinder);
  return {
    sphereError,
    cylinderError,
    passed: sphereError <= MAX_ERROR_DIOPTER && cylinderError <= MAX_ERROR_DIOPTER,
  };
}

function findLatest(device: Device, calibrations: Calibration[]): Calibration | null {
  if (!device.latestCalibrationId) return null;
  return calibrations.find((item) => item.id === device.latestCalibrationId) ?? null;
}

/**
 * 设备放行判定（以 now 为基准）：
 * - 从未校准 → 未校准
 * - 最近校准偏差超限 → 停用，修好后重新校准才能恢复
 * - 校准通过但超过两小时 → 放行过期
 * - 其余 → 放行可接新顾客
 */
export function evaluateDevice(
  device: Device,
  calibrations: Calibration[],
  now: number = Date.now()
): GateResult {
  const calibration = findLatest(device, calibrations);

  if (!calibration) {
    return {
      state: "uncalibrated",
      label: "未校准",
      reasons: ["今日尚未用标准片校准，开工先校准"],
      calibration: null,
      expired: false,
      ageMs: null,
    };
  }

  const ageMs = now - new Date(calibration.calibratedAt).getTime();
  const expired = ageMs > CALIBRATION_TTL_MS;
  const reasons: string[] = [];

  if (!calibration.passed) {
    reasons.push(
      `标准片检查偏差超限（球镜偏差 ${calibration.sphereError.toFixed(2)}D、柱镜偏差 ${calibration.cylinderError.toFixed(2)}D，限值 ±${MAX_ERROR_DIOPTER.toFixed(2)}D），设备已停用，维修后重新校准才能恢复`
    );
  }
  if (expired) {
    reasons.push("校准已超过两小时，请重新校准后再放行");
  }

  let state: GateState;
  let label: string;
  if (!calibration.passed) {
    state = "stopped";
    label = "已停用";
  } else if (expired) {
    state = "expired";
    label = "校准过期";
  } else {
    state = "released";
    label = "放行中";
  }

  return { state, label, reasons, calibration, expired, ageMs };
}

/** 保存顾客验光前的统一闸门：不放行时返回原因，调用方只能存草稿 */
export function gateForSave(
  device: Device | undefined,
  calibrations: Calibration[],
  now: number = Date.now()
): { allowed: boolean; reasons: string[] } {
  if (!device) return { allowed: false, reasons: ["请先选择验光设备"] };
  const gate = evaluateDevice(device, calibrations, now);
  return { allowed: gate.state === "released", reasons: gate.reasons };
}

/** 将毫秒差格式化为 “1小时23分 / 45分” 形式 */
export function formatAge(ageMs: number | null): string {
  if (ageMs === null) return "—";
  const minutes = Math.max(0, Math.floor(ageMs / 60000));
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (h <= 0) return `${m}分钟`;
  return `${h}小时${m > 0 ? `${m}分` : ""}`;
}

export function formatDateTime(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}
