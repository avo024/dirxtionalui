"use client"

import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectValue,
  SelectItem,
} from "@/components/ui/select"
import { format } from "date-fns"

/**
 * Brand date picker: month + year switch SEPARATELY via dropdowns up top,
 * day click commits and closes.
 *
 * Fixes vs the original:
 * - Month/year changes with a date already selected COMMIT immediately
 *   (the old one only moved the view — changing the year and clicking out
 *   silently discarded the change).
 * - Year is a dropdown, not a number input that rejected digits while you
 *   typed them.
 */
interface ChronoSelectProps {
  value?: Date
  onChange?: (date: Date | undefined) => void
  placeholder?: string
  className?: string
  yearRange?: [number, number]
}

export function ChronoSelect({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  yearRange,
}: ChronoSelectProps) {
  const now = new Date().getFullYear()
  const [startYear, endYear] = yearRange ?? [now - 2, now + 7]
  const [open, setOpen] = React.useState(false)
  const [viewMonth, setViewMonth] = React.useState<Date>(value ?? new Date())

  React.useEffect(() => {
    if (value) setViewMonth(value)
  }, [value?.getTime()])

  const years = React.useMemo(
    () => Array.from({ length: endYear - startYear + 1 }, (_, i) => startYear + i),
    [startYear, endYear],
  )
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ]

  // The core fix: switching month/year moves the view AND, when a date is
  // already selected, re-commits it in the new month/year (day clamped to
  // the month's length) — closing the popover can no longer discard edits.
  const shiftTo = (year: number, monthIdx: number) => {
    const view = new Date(year, monthIdx, 1)
    setViewMonth(view)
    if (value) {
      const daysInMonth = new Date(year, monthIdx + 1, 0).getDate()
      const committed = new Date(year, monthIdx, Math.min(value.getDate(), daysInMonth))
      onChange?.(committed)
    }
  }

  const handleSelect = (date: Date | undefined) => {
    onChange?.(date)
    if (date) setViewMonth(date)
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !value && "text-muted-foreground",
            className,
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4 text-primary" />
          {value ? format(value, "MMM d, yyyy") : placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0 border-border" align="start">
        <div className="flex items-center gap-2 p-3 pb-1">
          <Select
            value={viewMonth.getMonth().toString()}
            onValueChange={(m) => shiftTo(viewMonth.getFullYear(), parseInt(m))}
          >
            <SelectTrigger className="h-8 flex-1 text-sm font-medium">
              <SelectValue>{format(viewMonth, "MMMM")}</SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {months.map((m, i) => (
                <SelectItem key={i} value={i.toString()}>{m}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={viewMonth.getFullYear().toString()}
            onValueChange={(y) => shiftTo(parseInt(y), viewMonth.getMonth())}
          >
            <SelectTrigger className="h-8 w-[92px] text-sm font-medium">
              <SelectValue>{viewMonth.getFullYear()}</SelectValue>
            </SelectTrigger>
            <SelectContent className="max-h-64">
              {years.map((y) => (
                <SelectItem key={y} value={y.toString()}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Calendar
          mode="single"
          selected={value}
          onSelect={handleSelect}
          month={viewMonth}
          onMonthChange={setViewMonth}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  )
}
