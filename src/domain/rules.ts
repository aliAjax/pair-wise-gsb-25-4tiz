/**
 * 判定规则：标准片偏差、校准有效期与设备放行状态。
 * 纯函数，不依赖页面与存储。
 */
import type { Calibration, DeviceStatus } from "./types";

/** 球镜/柱镜允许的最大偏差：任一超过 0.12D 即停用 */
export const MAX_DEVIATION_D = 0.12;

/** 浮点误差容忍：恰为 0.12D 时不因二进制表示误差误判超限 */
const EPSILON = 1e-9;

/** 校准有效时长：两小时，超时需重新校准 */
export const CALIBRATION_VALID_MS = 2 * 60 * 60 * 1000;

/** 球镜偏差绝对值 (D) */
export function sphereDeviation(c: Calibration): number {
  return Math.abs(c.measuredSphere - c.standardSphere);
}

/** 柱镜偏差绝对值 (D) */
export function cylinderDeviation(c: Calibration): number {
  return Math.abs(c.measuredCylinder - c.standardCylinder);
}

/** 偏差是否超限：超过 0.12D 才算超限，恰好 0.12D 仍算通过 */
export function isDeviationOver(deviation: number): boolean {
  return Math.abs(deviation) > MAX_DEVIATION_D + EPSILON;
}

/** 单次校准是否通过：任一偏差超过 0.12D 即不通过 */
export function isCalibrationPassing(c: Calibration): boolean {
  return (
    !isDeviationOver(c.measuredSphere - c.standardSphere) &&
    !isDeviationOver(c.measuredCylinder - c.standardCylinder)
  );
}

/** 校准是否仍在两小时有效期内 */
export function isCalibrationFresh(c: Calibration, now: number): boolean {
  return now - c.calibratedAt <= CALIBRATION_VALID_MS;
}

/** 每台设备的最近一次校准 */
export function latestCalibrationByDevice(calibrations: Calibration[]): Map<string, Calibration> {
  const latest = new Map<string, Calibration>();
  for (const c of calibrations) {
    const prev = latest.get(c.deviceId);
    if (!prev || c.calibratedAt > prev.calibratedAt) {
      latest.set(c.deviceId, c);
    }
  }
  return latest;
}

/**
 * 设备放行状态：
 * - released：最近一次校准通过（停用设备修好重新校准通过后恢复）
 * - suspended：最近一次校准未通过，停用
 * - unchecked：尚无校准记录
 */
export function deviceStatus(deviceId: string, calibrations: Calibration[]): DeviceStatus {
  const latest = latestCalibrationByDevice(calibrations).get(deviceId);
  if (!latest) return "unchecked";
  return isCalibrationPassing(latest) ? "released" : "suspended";
}

/**
 * 保存顾客验光前的放行检查。
 * 返回未通过原因列表；空数组表示可以保存正式记录，否则只能留草稿。
 */
export function releaseBlockReasons(
  deviceId: string,
  calibrations: Calibration[],
  now: number
): string[] {
  if (!deviceId) return ["未选择设备"];
  const latest = latestCalibrationByDevice(calibrations).get(deviceId);
  if (!latest) return ["设备尚未校准"];
  const reasons: string[] = [];
  if (!isCalibrationPassing(latest)) {
    reasons.push("设备已停用（标准片偏差超过 0.12D），修好并重新校准后才能恢复");
  } else if (!isCalibrationFresh(latest, now)) {
    reasons.push("校准已超过两小时，需重新校准");
  }
  return reasons;
}
