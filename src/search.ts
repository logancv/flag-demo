import { getFlag } from "./flags";

export function search(query: string) {
  if (getFlag("experimental_search")) {
    return experimentalSearch(query);
  }
  return standardSearch(query);
}

function experimentalSearch(query: string) {
  // Vector-based search - never shipped
  return [];
}

function standardSearch(query: string) {
  return db.query(`SELECT * FROM items WHERE name LIKE ?`, [`%${query}%`]);
}
