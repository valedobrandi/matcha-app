import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface FilterOption {
  label: string
  value: string | null
}

interface SelectFilterProps {
  label: string
  items: FilterOption[]
  value: string | undefined
  onChange: (value: string | undefined)=>void
}

export function SelectFilter({ label, items, value, onChange }: SelectFilterProps) {
  return (
    <Select
      value={value ?? null}
      onValueChange={(v)=>onChange(v ?? undefined)}>
      <SelectTrigger className="w-full max-w-48">
        <SelectValue placeholder={label}/>
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>{label}</SelectLabel>
          {items.map((item) => (
            <SelectItem key={item.value} value={item.value as string}>
              {item.label}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}