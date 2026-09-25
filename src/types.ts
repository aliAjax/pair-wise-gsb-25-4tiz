// 领域数据类型：设备校准资料与顾客验光记录

/** 一次开工校准（标准片检查）记录 */
export interface Calibration {
  /** 校准记录编号 */
  id: string;
  /** 验光仪设备编号 */
  deviceId: string;
  /** 标准片标称球镜(D) */
  standardSphere: number;
  /** 标准片标称柱镜(D) */
  standardCylinder: number;
  /** 仪器实测球镜(D) */
  measuredSphere: number;
  /** 仪器实测柱镜(D) */
  measuredCylinder: number;
  /** 球镜偏差绝对值(D) */
  sphereError: number;
  /** 柱镜偏差绝对值(D) */
  cylinderError: number;
  /** 校准人 */
  calibrator: string;
  /** 校准时刻(ISO 字符串) */
  calibratedAt: string;
  /** 判定结果是否通过 */
  passed: boolean;
}

/** 设备及其最新放行状态 */
export interface Device {
  /** 设备编号 */
  id: string;
  /** 名称/型号，便于前台辨认 */
  name: string;
  /** 最近一次校准记录 id；停用后必须重新校准才会恢复 */
  latestCalibrationId: string | null;
}

/** 顾客验光记录 */
export interface ExamRecord {
  id: string;
  /** 顾客姓名 */
  customerName: string;
  /** 顾客编号，可空 */
  customerNo: string;
  /** 分类：儿童/成人/渐进片/角膜塑形镜等 */
  category: string;
  /** 球镜 */
  sphere: string;
  /** 柱镜 */
  cylinder: string;
  /** 轴位 */
  axis: string;
  /** 瞳距 */
  pd: string;
  /** 裸眼视力 */
  nakedVision: string;
  /** 矫正视力 */
  correctedVision: string;
  /** 备注 */
  note: string;
  /** 保存时选用的设备编号 */
  deviceId: string;
  /** 保存时刻(ISO 字符串) */
  savedAt: string;
  /** 草稿=设备未通过放行时暂存；已保存=放行通过后正式留档 */
  status: "draft" | "saved";
  /** 留档为草稿/保存当时的提示原因 */
  reason: string;
}

/** localStorage 中完整留档结构 */
export interface Archive {
  devices: Device[];
  calibrations: Calibration[];
  records: ExamRecord[];
}
