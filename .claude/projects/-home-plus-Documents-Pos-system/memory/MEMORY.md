# POS System Memory

## Key Architecture
- **Framework:** Next.js 16.1.6 + React 18 + TypeScript + TailwindCSS + Radix/shadcn
- **DB:** PostgreSQL 12+ with `pg` driver, connection pooling (global singleton)
- **Printing:** Dual-mode: Web Bluetooth (BLE ESC/POS) + OS print (window.print via iframe/popup)
- **Payments:** Stripe
- **Real-time:** Socket.io

## Printing System
- `lib/printing/bluetooth-escpos.ts` - Web Bluetooth BLE connection (Chrome only, NOT Safari/iPad)
- `lib/printing/escpos-raster.ts` - Canvas-to-raster ESC/POS generation
- `lib/printing/os-print.ts` - OS print fallback via iframe (iOS) or popup (desktop)
- `lib/printing/receipt-builders.ts` - Receipt payload builders
- `lib/printer-context.tsx` - React context managing printer state + PrintConfirmModal
- `components/admin/PrintConfirmModal.tsx` - Print confirmation modal with BLE and OS print fallback
- `components/admin/BluetoothPrinterButton.tsx` - Printer settings button (currently commented out)
- iPad uses Classic Bluetooth with TM-m30 - Web Bluetooth API cannot see Classic BT devices
- Safari/iPad does NOT support Web Bluetooth API at all
- `isIOS()` detection needs 3 checks: UA regex, platform+touchpoints, Macintosh UA+ontouchend

## Print Call Sites
- `components/admin/TableViewer.tsx` - Receipt printing (handlePrintReceipt)
- `app/admin/payroll/preview/page.tsx` - Salary/payroll printing (doPrint)
- Both have `isIOS()` early-return guards + pass `osFallback` to `requestPrint()`

## Roles
- Table (customer), Cast (staff/host), Admin (manager), Super Admin
