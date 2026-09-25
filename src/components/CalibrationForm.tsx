import { useEffect, useState } from "react";
import { judgeCalibration, MAX_ERROR_DIOPTER } from "../rules";
import type { Device } from "../types";

export interface CalibrationInput {
  deviceId: string;
  standardSphere: number;
  standardCylinder: number;
  measuredSphere: number;
  measuredCylinder: number;
  calibrator: string;
  /** 校准时刻 ISO 字符串 */
  calibratedAt: string;
}

interface Props {
  devices: Device[];
  /** 从设备看板“重新校准”带入的设备编号 */
  presetDeviceId: string | null;
  onPresetConsumed: () => void;
  onSubmit: (input: CalibrationInput, passed: boolean) => void;
}

function toLocalInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

function parseNumber(raw: string): number | null {
  if (raw.trim() === "") return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

const initialForm = {
  deviceId: "",
  standardSphere: "",
  standardCylinder: "",
  measuredSphere: "",
  measuredCylinder: "",
  calibrator: "",
  calibratedAt: toLocalInputValue(new Date()),
};

export function CalibrationForm({ devices, presetDeviceId, onPresetConsumed, onSubmit }: Props) {
  const [form, setForm] = useState(initialForm);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (presetDeviceId) {
      setForm((prev) => ({ ...prev, deviceId: presetDeviceId }));
      onPresetConsumed();
    }
  }, [presetDeviceId, onPresetConsumed]);

  const set = (key: keyof typeof initialForm) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => setForm((prev) => ({ ...prev, [key]: e.target.value }));

  const standardSphere = parseNumber(form.standardSphere);
  const standardCylinder = parseNumber(form.standardCylinder);
  const measuredSphere = parseNumber(form.measuredSphere);
  const measuredCylinder = parseNumber(form.measuredCylinder);
  const canPreview =
    standardSphere !== null &&
    standardCylinder !== null &&
    measuredSphere !== null &&
    measuredCylinder !== null;
  const preview = canPreview
    ? judgeCalibration(standardSphere, measuredSphere, standardCylinder, measuredCylinder)
    : null;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const deviceId = form.deviceId.trim();
    const calibrator = form.calibrator.trim();
    if (!deviceId) return setError("请录入设备编号");
    if (!canPreview) return setError("请完整填写标准片与仪器实测的球镜、柱镜数值");
    if (!calibrator) return setError("请填写校准人");
    const picked = new Date(form.calibratedAt);
    if (Number.isNaN(picked.getTime())) return setError("校准时刻无效");
    // 不允许把校准时刻记到未来
    const calibratedAt = picked.getTime() > Date.now() ? new Date() : picked;

    onSubmit(
      {
        deviceId,
        standardSphere,
        standardCylinder,
        measuredSphere,
        measuredCylinder,
        calibrator,
        calibratedAt: calibratedAt.toISOString(),
      },
      preview!.passed
    );

    // 保留设备与校准人，方便两小时后再次校准；清空实测读数与时刻
    setForm((prev) => ({
      ...initialForm,
      deviceId: prev.deviceId,
      calibrator: prev.calibrator,
    }));
    setError(null);
  }

  return (
    <form className="panel calibrate-form" onSubmit={handleSubmit}>
      <div className="section-heading">
        <div>
          <p>开工第一步</p>
          <h2>标准片校准录入</h2>
        </div>
      </div>

      <label className="field">
        <span>设备编号 *</span>
        <input
          list="device-id-list"
          value={form.deviceId}
          onChange={set("deviceId")}
          placeholder="如 ARK-01"
        />
        <datalist id="device-id-list">
          {devices.map((device) => (
            <option key={device.id} value={device.id} />
          ))}
        </datalist>
      </label>

      <div className="field-pair">
        <label className="field">
          <span>标准片球镜(D) *</span>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={form.standardSphere}
            onChange={set("standardSphere")}
            placeholder="如 -2.00"
          />
        </label>
        <label className="field">
          <span>标准片柱镜(D) *</span>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={form.standardCylinder}
            onChange={set("standardCylinder")}
            placeholder="如 -1.00"
          />
        </label>
      </div>

      <div className="field-pair">
        <label className="field">
          <span>仪器实测球镜(D) *</span>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={form.measuredSphere}
            onChange={set("measuredSphere")}
            placeholder="验光仪读数"
          />
        </label>
        <label className="field">
          <span>仪器实测柱镜(D) *</span>
          <input
            type="number"
            step="0.01"
            inputMode="decimal"
            value={form.measuredCylinder}
            onChange={set("measuredCylinder")}
            placeholder="验光仪读数"
          />
        </label>
      </div>

      <div className="field-pair">
        <label className="field">
          <span>校准人 *</span>
          <input value={form.calibrator} onChange={set("calibrator")} placeholder="姓名" />
        </label>
        <label className="field">
          <span>校准时刻 *</span>
          <input
            type="datetime-local"
            value={form.calibratedAt}
            onChange={set("calibratedAt")}
          />
        </label>
      </div>

      {preview && (
        <div className={`verdict ${preview.passed ? "verdict-pass" : "verdict-fail"}`}>
          <div className="verdict-row">
            <span>球镜偏差</span>
            <strong>{preview.sphereError.toFixed(2)}D</strong>
          </div>
          <div className="verdict-row">
            <span>柱镜偏差</span>
            <strong>{preview.cylinderError.toFixed(2)}D</strong>
          </div>
          <div className="verdict-result">
            {preview.passed ? (
              <>
                <b className="gate gate-released">将放行</b>
                <span>偏差均不超过 {MAX_ERROR_DIOPTER.toFixed(2)}D</span>
              </>
            ) : (
              <>
                <b className="gate gate-stopped">将停用</b>
                <span>任一偏差超过 {MAX_ERROR_DIOPTER.toFixed(2)}D，提交后设备停用，维修并重新校准才能恢复</span>
              </>
            )}
          </div>
        </div>
      )}

      {error && <p className="form-error">{error}</p>}

      <button type="submit" className="primary-action wide-action">
        提交校准并判定
      </button>
    </form>
  );
}
