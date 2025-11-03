import React, { useState, useCallback, useEffect, useRef } from "react";
import { X, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDebouncedValue } from "@/hooks/useDebouncedValue";
import type { ErrorLogsQuery } from "@/types/view/admin.types";

type ErrorLogsFiltersProps = {
  value: ErrorLogsQuery;
  onChange: (query: ErrorLogsQuery) => void;
  onReset: () => void;
};

const API_TYPES: Array<{ value: ErrorLogsQuery["api_type"][number]; label: string }> = [
  { value: "watchmode", label: "Watchmode" },
  { value: "tmdb", label: "TMDB" },
  { value: "gemini", label: "Gemini" },
];

/**
 * ErrorLogsFilters component.
 * Provides filters for API type, date range, and user ID with reset functionality.
 */
export function ErrorLogsFilters({ value, onChange, onReset }: ErrorLogsFiltersProps) {
  const [userIdInput, setUserIdInput] = useState(value.user_id || "");
  const debouncedUserId = useDebouncedValue(userIdInput, 300);
  
  // Track previous debounced value to avoid infinite loops
  const prevDebouncedUserIdRef = useRef<string>(debouncedUserId);
  // Track current value.user_id to compare without causing re-renders
  const currentUserIdRef = useRef<string | undefined>(value.user_id);

  // Sync local input with prop value when it changes externally (e.g., reset)
  useEffect(() => {
    if (value.user_id !== userIdInput) {
      setUserIdInput(value.user_id || "");
    }
    currentUserIdRef.current = value.user_id;
  }, [value.user_id, userIdInput]);

  // Update query when debounced user ID changes
  useEffect(() => {
    // Only update if debounced value actually changed
    if (prevDebouncedUserIdRef.current === debouncedUserId) {
      return;
    }
    
    prevDebouncedUserIdRef.current = debouncedUserId;
    
    // Only update if the debounced value is different from current value
    const newUserId = debouncedUserId.trim() || undefined;
    
    // Compare with current value using ref to avoid dependency on value
    if (currentUserIdRef.current !== newUserId) {
      // Use functional update form to avoid dependency on value
      onChange((prevValue) => ({
        ...prevValue,
        user_id: newUserId,
      }));
    }
  }, [debouncedUserId, onChange]); // onChange is stable (setQuery from useState)

  const handleApiTypeToggle = useCallback(
    (apiType: ErrorLogsQuery["api_type"][number]) => {
      const currentTypes = value.api_type || [];
      const newTypes = currentTypes.includes(apiType)
        ? currentTypes.filter((t) => t !== apiType)
        : [...currentTypes, apiType];

      onChange({
        ...value,
        api_type: newTypes.length > 0 ? newTypes : undefined,
      });
    },
    [value, onChange]
  );

  const handleDateFromChange = useCallback(
    (date: string) => {
      onChange({
        ...value,
        date_from: date || undefined,
      });
    },
    [value, onChange]
  );

  const handleDateToChange = useCallback(
    (date: string) => {
      onChange({
        ...value,
        date_to: date || undefined,
      });
    },
    [value, onChange]
  );

  const selectedApiTypes = value.api_type || [];
  const hasActiveFilters =
    selectedApiTypes.length > 0 || value.date_from || value.date_to || value.user_id;

  return (
    <div className="flex flex-wrap gap-4 items-end">
      {/* API Type Multi-select */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="api-type-filter">Typ API</Label>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="justify-between min-w-[150px]">
              Typ API ({selectedApiTypes.length > 0 ? selectedApiTypes.length : "Wszystkie"})
              <ChevronDown className="h-4 w-4 ml-2" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Wybierz typy API</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {API_TYPES.map((apiType) => (
              <DropdownMenuCheckboxItem
                key={apiType.value}
                checked={selectedApiTypes.includes(apiType.value)}
                onCheckedChange={() => handleApiTypeToggle(apiType.value)}
              >
                {apiType.label}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Date From */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="date-from">Data od</Label>
        <Input
          id="date-from"
          type="date"
          value={value.date_from || ""}
          onChange={(e) => handleDateFromChange(e.target.value)}
          className="w-[150px]"
        />
      </div>

      {/* Date To */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="date-to">Data do</Label>
        <Input
          id="date-to"
          type="date"
          value={value.date_to || ""}
          onChange={(e) => handleDateToChange(e.target.value)}
          className="w-[150px]"
        />
      </div>

      {/* User ID */}
      <div className="flex flex-col gap-2">
        <Label htmlFor="user-id">ID użytkownika</Label>
        <Input
          id="user-id"
          type="text"
          placeholder="Wpisz ID..."
          value={userIdInput}
          onChange={(e) => setUserIdInput(e.target.value)}
          className="w-[150px]"
        />
      </div>

      {/* Reset Button */}
      {hasActiveFilters && (
        <Button variant="outline" onClick={onReset} className="gap-2">
          <X className="h-4 w-4" />
          Resetuj
        </Button>
      )}
    </div>
  );
}


