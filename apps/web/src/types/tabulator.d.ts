declare module "tabulator-tables" {
  export type TabulatorConstructor = new (...args: unknown[]) => unknown;
  export const TabulatorFull: TabulatorConstructor;
}
