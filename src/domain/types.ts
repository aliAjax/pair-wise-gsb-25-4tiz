/**
 * 校准资料与验光记录的数据结构。
 * 判定逻辑见 rules.ts，本地留档见 storage.ts。
 */

/** 一次开工校准：用标准片核对验光仪 */
export interface Calibration {
  id: string;
  /** 设备编号 */
  deviceId: string;
  /** 标准片球镜标称值 (D) */
  standardSphere: number;
  /** 标准片柱镜标称值 (D) */
  standardCylinder: number;
  /** 验光仪实测球镜 (D) */
  measuredSphere: number;
  /** 验光仪实测柱镜 (D) */
  measuredCylinder: number;
  /** 校准人 */
  operator: string;
  /** 校准时刻（毫秒时间戳） */
  calibratedAt: number;
}

/** 设备放行状态：放行 / 停用 / 未校准 */
export type DeviceStatus = "released" | "suspended" | "unchecked";

/** 顾客验光记录 */
export interface ExamRecord {
  id: string;
  /** 顾客姓名或编号 */
  patientName: string;
  /** 使用的设备编号 */
  deviceId: string;
  /** 球镜 (D) */
  sphere: number;
  /** 柱镜 (D) */
  cylinder: number;
  /** 轴位 (°) */
  axis: number;
  /** saved = 正式记录；draft = 未通过放行检查仅留草稿 */
  status: "saved" | "draft";
  /** 保存时刻（毫秒时间戳） */
  savedAt: number;
  /** 草稿原因：未通过放行检查时的提示 */
  blockReason?: string;
}
