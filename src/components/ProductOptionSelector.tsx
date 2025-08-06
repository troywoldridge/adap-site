// src/components/ProductOptionSelector.tsx
"use client";

import { ChangeEvent } from "react";

export interface Option {
  id: number;
  name: string;
}

type Props = {
  /** A map of option-group name to its list of options */
  optionGroups: Record<string, Option[]>;
  /** Currently selected option ID per group (in the same order as Object.keys(optionGroups)) */
  selectedOptions: number[];
  /** Setter to update the selectedOptions array */
  setSelectedOptions: (options: number[]) => void;
};

export default function ProductOptionSelector({
  optionGroups,
  selectedOptions,
  setSelectedOptions,
}: Props) {
  const groupNames = Object.keys(optionGroups);

  const handleChange = (groupIndex: number, value: number) => {
    const updated = [...selectedOptions];
    updated[groupIndex] = value;
    setSelectedOptions(updated);
  };

  return (
    <div className="space-y-6">
      {groupNames.map((groupName, index) => {
        const options = optionGroups[groupName];
        return (
          <div key={groupName}>
            <label
              htmlFor={`opt-${groupName}`}
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              {groupName}
            </label>
            <select
              id={`opt-${groupName}`}
              className="block w-full border border-gray-300 rounded-md shadow-sm px-3 py-2 focus:outline-none focus:ring-accent focus:border-accent"
              value={selectedOptions[index] ?? ""}
              onChange={(e: ChangeEvent<HTMLSelectElement>) =>
                handleChange(index, parseInt(e.target.value, 10))
              }
            >
              <option value="">Select {groupName}</option>
              {options.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.name}
                </option>
              ))}
            </select>
          </div>
        );
      })}
    </div>
  );
}
