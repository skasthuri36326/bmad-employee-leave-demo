export type LeaveValues = { startDate: string; endDate: string; reason: string };
export type LeaveErrors = Partial<Record<keyof LeaveValues, string>>;

function londonToday(): string {
  const parts = new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/London", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const value = Object.fromEntries(parts.map(part => [part.type, part.value]));
  return `${value.year}-${value.month}-${value.day}`;
}

export function validateLeave(values: LeaveValues, today = londonToday()): LeaveErrors {
  const errors: LeaveErrors = {};
  if (!values.startDate) errors.startDate = "Enter a start date.";
  else if (values.startDate < today) errors.startDate = "Start date must be today or later.";
  if (!values.endDate) errors.endDate = "Enter an end date.";
  else if (values.startDate && values.endDate < values.startDate) errors.endDate = "End date must be the same as or later than the start date.";
  const reason = values.reason.trim();
  if (!reason) errors.reason = "Enter a reason for requesting leave.";
  else if (reason.length > 500) errors.reason = "Reason must be 500 characters or fewer.";
  return errors;
}
