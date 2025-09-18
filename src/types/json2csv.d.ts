declare module "json2csv" {
  // Minimal typing for what we use
  export function parse<T = any>(input: T | T[], opts?: any): string;
}
