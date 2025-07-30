import type { ChangeEvent } from "react";
import type { ProductOptionGroup } from "../types/db";
// <- Adjust this as needed

type ProductOptionSelectorProps = {
  optionGroups: ProductOptionGroup[];
  selectedOptions: number[];
  setSelectedOptions: (options: number[]) => void;
};

export default function ProductOptionSelector({
  optionGroups,
  selectedOptions,
  setSelectedOptions,
}: ProductOptionSelectorProps) {
  const handleChange = (groupIndex: number, value: number) => {
    const updated = [...selectedOptions];
    updated[groupIndex] = value;
    setSelectedOptions(updated);
  };

  return (
    <div className="space-y-6">
      {optionGroups.map((group, index) => (
        <div key={group.groupId}>
          <label htmlFor={`option-group-${group.groupId}`} className="block text-sm font-medium text-gray-700 mb-1">
            {group.name}
          </label>

          <select
            id={`option-group-${group.groupId}`}
            className="block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            value={selectedOptions[index] ?? ""}
            onChange={(e: ChangeEvent<HTMLSelectElement>) =>
              handleChange(index, parseInt(e.target.value, 10))
            }
          >
            <option value="">Select {group.name}</option>
            {group.options.map((option: { id: number; name: string }) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
        </div>
      ))}
    </div>
  );
}
