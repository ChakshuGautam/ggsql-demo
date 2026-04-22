export interface PresetQuery {
  title: string;
  description: string;
  query: string;
  /** Tables this preset reads from. Used to wait for async-loaded datasets. */
  requires?: string[];
}

export const PRESETS: PresetQuery[] = [
  {
    title: "Penguins — bill depth vs length",
    description: "Classic palmer-penguins scatter, coloured by species with a smoothed trendline.",
    requires: ["ggsql:penguins"],
    query: `VISUALIZE bill_len AS x, bill_dep AS y, species AS color FROM ggsql:penguins
DRAW point
DRAW smooth`,
  },
  {
    title: "Cars — MPG vs horsepower",
    description: "1970s–'80s cars — more horsepower, worse fuel economy. Colour by origin.",
    requires: ["cars"],
    query: `VISUALIZE Horsepower AS x, Miles_per_Gallon AS y, Origin AS color FROM cars
DRAW point
DRAW smooth`,
  },
  {
    title: "Seattle weather — daily max temp",
    description: "Daily maximum temperature in Seattle 2012–2015, coloured by weather category.",
    requires: ["seattle_weather"],
    query: `VISUALIZE date AS x, temp_max AS y, weather AS color FROM seattle_weather
DRAW point`,
  },
  {
    title: "S&P 500 — monthly closes",
    description: "S&P 500 monthly closing price, 2000–2010.",
    requires: ["sp500"],
    query: `VISUALIZE date AS x, price AS y FROM sp500
DRAW line`,
  },
  {
    title: "Gapminder — life expectancy over time",
    description: "Life expectancy by country, 1952–2007. One line per country, coloured by cluster.",
    requires: ["gapminder"],
    query: `VISUALIZE year AS x, life_expect AS y, cluster AS color FROM gapminder
DRAW line
  PARTITION BY country`,
  },
  {
    title: "Flights — delay distribution",
    description: "Departure delay across 5 000 US flights.",
    requires: ["flights_airport"],
    query: `VISUALIZE delay AS x FROM flights_airport
DRAW histogram`,
  },
];

export const EDITOR_DEFAULT = PRESETS[0].query;
