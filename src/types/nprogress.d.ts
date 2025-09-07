// src/types/nprogress.d.ts
declare module "nprogress" {
  interface NProgress {
    start(): NProgress;
    done(force?: boolean): NProgress;
    set(n: number): NProgress;
    inc(amount?: number): NProgress;
    configure(options: Record<string, any>): void;
    remove(): void;
    status: number | null;
  }
  const nprogress: NProgress;
  export default nprogress;
}
