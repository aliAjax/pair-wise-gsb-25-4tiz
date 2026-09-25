# hxwl-11 眼科验光记录 · 设备放行台

开工校准、设备放行与顾客验光记录。

## 技术栈

React + Vite + TypeScript + CSS（无额外依赖）

## 本地运行

```bash
npm install
npm run dev
```

开发端口：5111

## 放行规则

- 开工时用标准片核对验光仪，录入设备编号、标准片球镜/柱镜、实测读数、校准人与校准时刻
- 球镜或柱镜任一偏差超过 0.12D，设备立即停用，不能接新顾客
- 停用设备修好并重新校准通过后自动恢复放行
- 校准两小时内有效；超时或设备停用时，顾客验光只能保留草稿并提示未通过
- 校准、放行状态与顾客数据本地留档（localStorage），重开页面仍在；已保存记录始终可查

## 目录结构

- `src/domain/types.ts` — 校准资料与验光记录的数据结构
- `src/domain/rules.ts` — 判定规则（0.12D 偏差、两小时有效期、放行状态）
- `src/domain/storage.ts` — 本地留档（localStorage 读写）
- `src/domain/format.ts` — 时间与屈光度显示辅助
- `src/components/` — 页面（校准录入、设备放行台、验光录入、记录列表）
