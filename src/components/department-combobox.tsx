import React, { useState } from 'react';
import { Check, ChevronsUpDown, PlusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { cn } from '@/lib/utils';
import { useListDepartments, useCreateDepartment, getListDepartmentsQueryKey } from '@workspace/api-client-react';
import { useQueryClient } from '@tanstack/react-query';

export function DepartmentCombobox({ value, onChange }: { value?: string; onChange: (v: string) => void }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const { data: departments } = useListDepartments({ query: { queryKey: getListDepartmentsQueryKey() } });
  const createDepartment = useCreateDepartment();
  const queryClient = useQueryClient();

  const options: string[] = (departments || []).map((d: any) => d.name);
  const query = search.trim().toLowerCase();
  const filtered = query ? options.filter((o) => o.toLowerCase().includes(query)) : options;
  const exactMatch = options.some((o) => o.toLowerCase() === query);

  const handleSelect = (name: string) => {
    onChange(name);
    setOpen(false);
    setSearch('');
  };

  const handleCreate = () => {
    const name = search.trim();
    if (!name) return;
    createDepartment.mutate({ name }, {
      onSuccess: (created) => {
        queryClient.invalidateQueries({ queryKey: getListDepartmentsQueryKey() });
        handleSelect(created.name);
      },
    });
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between font-normal"
        >
          {value || 'Select department...'}
          <ChevronsUpDown className="ml-2 size-4 shrink-0 opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[260px] p-0">
        <Command shouldFilter={false}>
          <CommandInput placeholder="Search department..." value={search} onValueChange={setSearch} />
          <CommandList>
            <CommandEmpty>
              {search.trim() ? (
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-2 py-1.5 text-sm hover:bg-muted rounded-sm"
                  onClick={handleCreate}
                >
                  <PlusCircle className="size-4" /> Create "{search.trim()}"
                </button>
              ) : (
                'No departments found'
              )}
            </CommandEmpty>
            <CommandGroup>
              {filtered.map((name) => (
                <CommandItem key={name} value={name} onSelect={() => handleSelect(name)}>
                  <Check className={cn('mr-2 size-4', value === name ? 'opacity-100' : 'opacity-0')} />
                  {name}
                </CommandItem>
              ))}
              {search.trim() && !exactMatch && filtered.length > 0 && (
                <CommandItem value={`__create__${search}`} onSelect={handleCreate}>
                  <PlusCircle className="mr-2 size-4" /> Create "{search.trim()}"
                </CommandItem>
              )}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
