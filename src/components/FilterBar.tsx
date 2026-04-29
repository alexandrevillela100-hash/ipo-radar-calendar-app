import type { FilingType } from "../lib/filingsClient";
import "./FilterBar.css";

interface Props {
  enabledTypes: Set<FilingType>;
  onToggleTypes: (types: FilingType[]) => void;
  search: string;
  onSearchChange: (s: string) => void;
  countsByType: Record<FilingType, number>;
  onReset: () => void;
  isDefault: boolean;
}

interface ChipDef {
  types: FilingType[];
  label: string;
  key: string;
}

const CHIPS: ChipDef[] = [
  { types: ["S-1", "F-1"],     label: "Initial",    key: "initial" },
  { types: ["S-1/A", "F-1/A"], label: "Amendment",  key: "amend" },
  { types: ["424B"],           label: "Pricing",    key: "pricing" },
  { types: ["RW"],             label: "Withdrawn",  key: "withdrawn" },
];

export default function FilterBar(props: Props) {
  const enabledTypes = props.enabledTypes;
  const onToggleTypes = props.onToggleTypes;
  const search = props.search;
  const onSearchChange = props.onSearchChange;
  const countsByType = props.countsByType;
  const onReset = props.onReset;
  const isDefault = props.isDefault;

  return (
    <div className="filter-bar">
      <div className="filter-chips">
        <span className="filter-label">Filters</span>
        {CHIPS.map(function (chip) {
          const isActive = chip.types.some(function (t) { return enabledTypes.has(t); });
          let count = 0;
          for (let i = 0; i < chip.types.length; i++) {
            count += countsByType[chip.types[i]] || 0;
          }
          const className = "chip chip-" + chip.key + " " + (isActive ? "active" : "inactive");
          return (
            <button
              key={chip.key}
              type="button"
              className={className}
              onClick={function () { onToggleTypes(chip.types); }}
              aria-pressed={isActive}
            >
              <span className="chip-dot" />
              <span className="chip-label">{chip.label}</span>
              <span className="chip-count">{count}</span>
            </button>
          );
        })}
      </div>

      <div className="filter-search">
        {!isDefault ? (
          <button type="button" className="filter-reset" onClick={onReset}>Reset</button>
        ) : null}
        <input
          type="search"
          className="search-input"
          placeholder="Search company or ticker"
          value={search}
          onChange={function (e) { onSearchChange(e.target.value); }}
        />
      </div>
    </div>
  );
}
