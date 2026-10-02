/// <reference types="astro/client" />
declare module '@swal/ui' {
  export const Button: any
  export const Card: any
  export const Badge: any
  export const Input: any
  export const Table: any
  export const Tabs: any
  export const Skeleton: any
  export const Modal: any
  export const StatusBadge: any
  export const LoadingState: any
  export const Terminal: any
  export const CommandPalette: any
  export const Toaster: any
  export const LogViewer: any
  export const ConfigEditor: any
  export const DashboardLayout: any
  export const GlobalTicker: any
  export const Landing: any
  export const Icon: any
  export const MobileNav: any
  export const AppShell: any
  export const ICONS: Record<string, readonly string[]>
  export function registerIcons(map: Record<string, readonly string[]>): void
  export function getIcon(name: string): readonly string[] | undefined
}
declare module '@swal/ui/icons' {
  export const ICONS: Record<string, readonly string[]>
  export function registerIcons(map: Record<string, readonly string[]>): void
  export function getIcon(name: string): readonly string[] | undefined
}
declare module '@swal/ui/nav' {
  export function isNavActive(item: { href: string; exact?: boolean }, currentPath?: string): boolean
  export function findCurrentNav<T extends { href: string; exact?: boolean }>(items: T[], currentPath?: string): T | undefined
}
declare module '@swal/ui/theme-boot' {
  export const THEME_BOOT_SCRIPT: string
  export function themeBootScript(opts?: { themeKey?: string; fontKey?: string; themes?: string[] }): string
  export function setTheme(theme: 'light' | 'dark' | 'system', opts?: { themeKey?: string }): void
}
declare module '@swal/ui/tokens' {}
declare module '@swal/ui/toast' {
  export const toast: any
}
