"use client";

import * as React from "react";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

interface CategoryComboboxProps {
  value: string;
  onChange: (value: string) => void;
  categories: string[];
  placeholder?: string;
  searchPlaceholder?: string;
}

export function CategoryCombobox({
  value,
  onChange,
  categories,
  placeholder = "Selecione ou digite uma categoria...",
  searchPlaceholder = "Buscar categoria...",
}: CategoryComboboxProps) {
  const [open, setOpen] = React.useState(false);
  const [search, setSearch] = React.useState("");

  const filteredCategories = React.useMemo(() => {
    if (!search.trim()) return categories;
    const lower = search.toLowerCase();
    return categories.filter((cat) => cat.toLowerCase().includes(lower));
  }, [search, categories]);

  const canCreateCustom =
    search.trim() &&
    !categories.some(
      (cat) => cat.toLowerCase() === search.trim().toLowerCase(),
    );

  const handleSelect = (selectedValue: string) => {
    onChange(selectedValue);
    setSearch("");
    setOpen(false);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between rounded-xl border-white/10 bg-white/[0.02] text-white"
        >
          <span
            className={cn(
              "block w-full truncate",
              !value && "text-white/50",
            )}
          >
            {value || placeholder}
          </span>
          <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="min-w-[260px] max-w-[280px] border-white/10 bg-[#0f0f0f] p-0 text-white">
        <Command className="bg-[#0f0f0f]" filter={() => 1}>
          <CommandInput
            placeholder={searchPlaceholder}
            className="border-b border-white/10 text-white placeholder:text-white/50"
            value={search}
            onValueChange={setSearch}
          />
          <CommandList className="text-white">
            <CommandEmpty className="py-2 text-sm text-white/60">
              Nenhuma categoria encontrada.
            </CommandEmpty>
            <CommandGroup>
              {filteredCategories.map((cat) => (
                <CommandItem
                  key={cat}
                  value={cat}
                  onSelect={() => handleSelect(cat)}
                  className="cursor-pointer text-white data-[selected=true]:bg-white/[0.05] data-[highlighted]:bg-white/[0.05]"
                >
                  <span className="flex-1">{cat}</span>
                  <Check
                    className={cn(
                      "ml-auto h-4 w-4",
                      value === cat ? "opacity-100" : "opacity-0",
                    )}
                  />
                </CommandItem>
              ))}
              {canCreateCustom && (
                <CommandItem
                  value={`create-${search}`}
                  onSelect={() => handleSelect(search.trim())}
                  className="cursor-pointer text-white data-[selected=true]:bg-white/[0.05] data-[highlighted]:bg-white/[0.05]"
                >
                  <span className="text-sm opacity-70">
                    Criar categoria &ldquo;{search.trim()}&rdquo;
                  </span>
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
