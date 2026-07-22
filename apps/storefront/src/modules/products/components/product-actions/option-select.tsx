import { HttpTypes } from "@medusajs/types"
import NativeSelect from "@modules/common/components/native-select"
import React from "react"

type OptionSelectProps = {
  option: HttpTypes.StoreProductOption
  current: string | undefined
  updateOption: (title: string, value: string) => void
  title: string
  disabled: boolean
  "data-testid"?: string
}

const OptionSelect: React.FC<OptionSelectProps> = ({
  option,
  current,
  updateOption,
  title,
  "data-testid": dataTestId,
  disabled,
}) => {
  const filteredOptions = (option.values ?? []).map((v) => v.value)

  return (
    <div className="flex flex-col gap-y-2">
      <span className="text-xs font-medium tracking-[0.15em] uppercase text-stone-500">
        {title}
      </span>
      <div data-testid={dataTestId}>
        <NativeSelect
          value={current ?? ""}
          onChange={(e) => updateOption(option.id, e.target.value)}
          disabled={disabled}
          placeholder="Sélection"
          className="bg-white h-11"
        >
          {filteredOptions.map((v) => (
            <option key={v} value={v}>
              {v}
            </option>
          ))}
        </NativeSelect>
      </div>
    </div>
  )
}

export default OptionSelect
