// Full state/territory names as Congress.gov returns them in member records.
export const US_STATES: string[] = [
  "Alabama",
  "Alaska",
  "Arizona",
  "Arkansas",
  "California",
  "Colorado",
  "Connecticut",
  "Delaware",
  "Florida",
  "Georgia",
  "Hawaii",
  "Idaho",
  "Illinois",
  "Indiana",
  "Iowa",
  "Kansas",
  "Kentucky",
  "Louisiana",
  "Maine",
  "Maryland",
  "Massachusetts",
  "Michigan",
  "Minnesota",
  "Mississippi",
  "Missouri",
  "Montana",
  "Nebraska",
  "Nevada",
  "New Hampshire",
  "New Jersey",
  "New Mexico",
  "New York",
  "North Carolina",
  "North Dakota",
  "Ohio",
  "Oklahoma",
  "Oregon",
  "Pennsylvania",
  "Rhode Island",
  "South Carolina",
  "South Dakota",
  "Tennessee",
  "Texas",
  "Utah",
  "Vermont",
  "Virginia",
  "Washington",
  "West Virginia",
  "Wisconsin",
  "Wyoming",
  // Territories / federal district with House delegates
  "American Samoa",
  "District of Columbia",
  "Guam",
  "Northern Mariana Islands",
  "Puerto Rico",
  "Virgin Islands",
];

/** States whose name contains the query (case-insensitive), prefix matches first. */
export function matchStates(query: string, limit = 6): string[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  const starts = US_STATES.filter((s) => s.toLowerCase().startsWith(q));
  const contains = US_STATES.filter(
    (s) => !s.toLowerCase().startsWith(q) && s.toLowerCase().includes(q),
  );
  return [...starts, ...contains].slice(0, limit);
}
