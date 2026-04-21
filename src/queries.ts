export interface PresetQuery {
  title: string;
  description: string;
  query: string;
}

export const PRESETS: PresetQuery[] = [
  {
    title: "Scatter + smooth (bill depth vs length)",
    description: "Continuous × continuous, colored by species, with a smoothed trendline.",
    query: `VISUALIZE bill_len AS x, bill_dep AS y, species AS color FROM ggsql:penguins
DRAW point
DRAW smooth`,
  },
  {
    title: "Bar chart (species by island)",
    description: "Categorical × count, stacked by species across the three islands.",
    query: `VISUALIZE island AS x, species AS color FROM ggsql:penguins
DRAW bar`,
  },
  {
    title: "Boxplot (body mass by species)",
    description: "Distribution of body mass within each species.",
    query: `VISUALIZE species AS x, body_mass AS y FROM ggsql:penguins
DRAW boxplot`,
  },
  {
    title: "Histogram (flipper length)",
    description: "Distribution of flipper length across all penguins.",
    query: `VISUALIZE flipper_len AS x FROM ggsql:penguins
DRAW histogram`,
  },
];

export const EDITOR_DEFAULT = PRESETS[0].query;
