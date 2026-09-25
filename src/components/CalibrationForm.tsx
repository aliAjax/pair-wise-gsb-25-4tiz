import { useState, type ChangeEvent, type FormEvent } from "react";
import type { Calibration } from "../domain/types";
import { toDatetimeLocal } from "../domain/format";

interface Props {
  onAdd: (calibration: Omit<Calibration, "id">) => void;
}

const blankForm = () => ({
  deviceId: "",
  standardSphere: "",
  standardCylinder: "",
  measuredSphere: "",
  measuredCylinder: "",
  operator: "",
  calibratedAt: toDatetimeLocal(Date.now()),
});

type FormKey = keyof ReturnType<typeof blankForm>;

/** 开工校准录入：设备编号、标准片球镜/柱镜、实测读数、校准人与校准时刻 */
export function CalibrationForm({ onAdd }: Props) {
  const [form, setForm] = useState(blankForm);
  const [error, setError] = useState("");

  const update =
    (key: FormKey) =>
    (event: ChangeEvent<HTMLInputElement>) =>
      setForm((prev) => ({ ...prev, [key]: event.target.value }));

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const rawNumbers = [
      form.standardSphere,
      form.standardCylinder,
      form.measuredSphere,
      form.measuredCylinder,
    ];
    const calibratedAt = new Date(form.calibratedAt).getTime();

    if (!form.deviceId.trim()) {
      setError("请填写设备编号。");
      return;
    }
    if (rawNumbers.some((v) => v.trim() === "" || !Number.isFinite(Number(v)))) {
      setError("请完整填写标准片与实测的球镜、柱镜数值。");
      return;
    }
    if (!form.operator.trim()) {
      setError("请填写校准人。");
      return;
    }
    if (!Number.isFinite(calibratedAt)) {
      setError("请选择校准时刻。");
      return;
    }

    onAdd({
      deviceId: form.deviceId.trim(),
      standardSphere: Number(rawNumbers[0]),
      standardCylinder: Number(rawNumbers[1]),
      measuredSphere: Number(rawNumbers[2]),
      measuredCylinder: Number(rawNumbers[3]),
      operator: form.operator.trim(),
      calibratedAt,
    });
    setError("");
    // 保留设备编号与校准人，方便连续校准多台设备
    setForm({ ...blankForm(), deviceId: form.deviceId, operator: form.operator });
  };

  return (
    <form className="panel" onSubmit={handleSubmit}>
      <div className="section-heading">
        <div>
          <p>开工校准</p>
          <h2>标准片核对录入</h2>
        </div>
      </div>
      <div className="form-grid">
        <label>
          <span>设备编号</span>
          <input value={form.deviceId} onChange={update("deviceId")} placeholder="如 AR-01" />
        </label>
        <div className="field-pair">
          <label>
            <span>标准片球镜 (D)</span>
            <input
              type="number"
              step="0.01"
              value={form.standardSphere}
              onChange={update("standardSphere")}
              placeholder="如 -2.00"
            />
          </label>
          <label>
            <span>标准片柱镜 (D)</span>
            <input
              type="number"
              step="0.01"
              value={form.standardCylinder}
              onChange={update("standardCylinder")}
              placeholder="如 -1.00"
            />
          </label>
        </div>
        <div className="field-pair">
          <label>
            <span>实测球镜 (D)</span>
            <input
              type="number"
              step="0.01"
              value={form.measuredSphere}
              onChange={update("measuredSphere")}
              placeholder="验光仪读数"
            />
          </label>
          <label>
            <span>实测柱镜 (D)</span>
            <input
              type="number"
              step="0.01"
              value={form.measuredCylinder}
              onChange={update("measuredCylinder")}
              placeholder="验光仪读数"
            />
          </label>
        </div>
        <label>
          <span>校准人</span>
          <input value={form.operator} onChange={update("operator")} placeholder="姓名或工号" />
        </label>
        <label>
          <span>校准时刻</span>
          <input
            type="datetime-local"
            value={form.calibratedAt}
            onChange={update("calibratedAt")}
          />
        </label>
        {error && <p className="notice error">{error}</p>}
        <button type="submit" className="primary-action">
          提交校准并判定
        </button>
        <p className="field-hint">
          任一偏差超过 0.12D 设备立即停用；修好并重新校准通过后恢复放行。
        </p>
      </div>
    </form>
  );
}
