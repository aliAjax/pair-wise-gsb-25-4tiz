import { useMemo, useState } from "react";
import type { Calibration, ExamRecord } from "../domain/types";
import { deviceStatus, latestCalibrationByDevice, releaseBlockReasons } from "../domain/rules";

interface Props {
  calibrations: Calibration[];
  now: number;
  onSave: (record: Omit<ExamRecord, "id">) => void;
}

interface Message {
  kind: "ok" | "error";
  text: string;
}

/** 顾客验光录入：保存前必须通过设备放行检查，否则只能留草稿 */
export function ExamDesk({ calibrations, now, onSave }: Props) {
  const [patientName, setPatientName] = useState("");
  const [deviceId, setDeviceId] = useState("");
  const [sphere, setSphere] = useState("");
  const [cylinder, setCylinder] = useState("");
  const [axis, setAxis] = useState("");
  const [message, setMessage] = useState<Message | null>(null);

  const devices = useMemo(
    () => [...latestCalibrationByDevice(calibrations).keys()].sort(),
    [calibrations]
  );

  // 当前所选设备的未通过原因，选中即提示
  const blockReasons = deviceId ? releaseBlockReasons(deviceId, calibrations, now) : [];

  const resetForm = () => {
    setPatientName("");
    setSphere("");
    setCylinder("");
    setAxis("");
  };

  const handleSave = (asDraft: boolean) => {
    if (!patientName.trim()) {
      setMessage({ kind: "error", text: "请填写顾客姓名或编号。" });
      return;
    }
    if (!deviceId) {
      setMessage({ kind: "error", text: "保存验光前请先选择设备。" });
      return;
    }
    const rawNumbers = [sphere, cylinder, axis];
    if (rawNumbers.some((v) => v.trim() === "" || !Number.isFinite(Number(v)))) {
      setMessage({ kind: "error", text: "请完整填写球镜、柱镜与轴位数值。" });
      return;
    }
    const axisValue = Number(axis);
    if (axisValue < 0 || axisValue > 180) {
      setMessage({ kind: "error", text: "轴位应在 0–180 之间。" });
      return;
    }

    const reasons = releaseBlockReasons(deviceId, calibrations, now);
    const base = {
      patientName: patientName.trim(),
      deviceId,
      sphere: Number(sphere),
      cylinder: Number(cylinder),
      axis: axisValue,
      savedAt: Date.now(),
    };

    if (asDraft) {
      onSave({ ...base, status: "draft", blockReason: reasons.join("；") || undefined });
      setMessage({
        kind: "ok",
        text: reasons.length
          ? `已存为草稿（未通过放行检查：${reasons.join("；")}）。`
          : "已存为草稿。",
      });
    } else if (reasons.length > 0) {
      // 未通过放行检查：只能留草稿并提示
      onSave({ ...base, status: "draft", blockReason: reasons.join("；") });
      setMessage({
        kind: "error",
        text: `未通过放行检查：${reasons.join("；")}。本次仅保留草稿。`,
      });
    } else {
      onSave({ ...base, status: "saved" });
      setMessage({ kind: "ok", text: "验光记录已保存。" });
    }
    resetForm();
  };

  return (
    <section className="panel">
      <div className="section-heading">
        <div>
          <p>顾客验光</p>
          <h2>验光录入</h2>
        </div>
      </div>
      {devices.length === 0 ? (
        <p className="empty-state">请先在上方完成开工校准，放行设备后才能录入顾客验光。</p>
      ) : (
        <div className="form-grid">
          <label>
            <span>顾客姓名 / 编号</span>
            <input
              value={patientName}
              onChange={(e) => setPatientName(e.target.value)}
              placeholder="如 Patient-032"
            />
          </label>
          <label>
            <span>验光设备（停用设备不可选）</span>
            <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)}>
              <option value="">请选择设备</option>
              {devices.map((id) => {
                const status = deviceStatus(id, calibrations);
                return (
                  <option key={id} value={id} disabled={status === "suspended"}>
                    {status === "suspended" ? `${id}（停用）` : `${id}（放行中）`}
                  </option>
                );
              })}
            </select>
          </label>
          {blockReasons.length > 0 && (
            <p className="notice error">
              未通过放行检查：{blockReasons.join("；")}，保存时将仅保留草稿。
            </p>
          )}
          <div className="field-triple">
            <label>
              <span>球镜 (D)</span>
              <input
                type="number"
                step="0.25"
                value={sphere}
                onChange={(e) => setSphere(e.target.value)}
                placeholder="如 -2.75"
              />
            </label>
            <label>
              <span>柱镜 (D)</span>
              <input
                type="number"
                step="0.25"
                value={cylinder}
                onChange={(e) => setCylinder(e.target.value)}
                placeholder="如 -0.50"
              />
            </label>
            <label>
              <span>轴位 (°)</span>
              <input
                type="number"
                step="1"
                min="0"
                max="180"
                value={axis}
                onChange={(e) => setAxis(e.target.value)}
                placeholder="0–180"
              />
            </label>
          </div>
          {message && <p className={`notice ${message.kind}`}>{message.text}</p>}
          <div className="button-row">
            <button className="primary-action" onClick={() => handleSave(false)}>
              保存验光记录
            </button>
            <button onClick={() => handleSave(true)}>存为草稿</button>
          </div>
        </div>
      )}
    </section>
  );
}
