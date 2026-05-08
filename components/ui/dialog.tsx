'use client';

import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { X } from 'lucide-react';

import { cn } from '@/lib/utils';
import { useKeyboardAware } from '@/lib/use-keyboard-aware';

const Dialog = DialogPrimitive.Root;

const DialogTrigger = DialogPrimitive.Trigger;

const DialogPortal = DialogPrimitive.Portal;

const DialogClose = DialogPrimitive.Close;

const DialogOverlay = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      'fixed inset-0 z-50 bg-black/80  data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0',
      className
    )}
    {...props}
  />
));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;

const DialogContent = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content> & { style?: React.CSSProperties }
>(({ className, children, style, ...props }, ref) => {
  const contentRef = React.useRef<HTMLDivElement | null>(null);
  const combinedRef = React.useCallback(
    (node: HTMLDivElement | null) => {
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLDivElement | null>).current = node;
      }
      contentRef.current = node;
    },
    [ref]
  );

  const keyboard = useKeyboardAware();

  // キーボードに合わせた位置調整。`isOpen` のときは表示領域の中央に配置し、
  // 高さも表示領域に収まるように制限する。
  const dynamicStyle: React.CSSProperties = React.useMemo(() => {
    if (!keyboard.isOpen) return {};
    const padding = 16;
    const centerY =
      keyboard.visibleOffsetTop + Math.max(padding, keyboard.visibleHeight / 2);
    return {
      top: `${centerY}px`,
      maxHeight: `${Math.max(120, keyboard.visibleHeight - padding * 2)}px`,
    };
  }, [keyboard.isOpen, keyboard.visibleHeight, keyboard.visibleOffsetTop]);

  // フォーカスされた入力をキーボードに隠れない位置までスクロールする補助動作。
  React.useEffect(() => {
    if (typeof window === 'undefined') return;

    const isFormElement = (el: Element | null) =>
      !!el &&
      (el.tagName === 'INPUT' ||
        el.tagName === 'TEXTAREA' ||
        el.tagName === 'SELECT' ||
        (el as HTMLElement).isContentEditable);

    const scrollFocusedIntoView = (target: HTMLElement) => {
      const container = contentRef.current;
      if (!container) return;

      const vv = window.visualViewport;
      const visibleTop = vv ? vv.offsetTop : 0;
      const visibleBottom = vv ? vv.offsetTop + vv.height : window.innerHeight;
      const padding = 24;

      const rect = target.getBoundingClientRect();
      if (rect.bottom > visibleBottom - padding) {
        const overflow = rect.bottom - (visibleBottom - padding);
        container.scrollBy({ top: overflow, behavior: 'smooth' });
      } else if (rect.top < visibleTop + padding) {
        const overflow = visibleTop + padding - rect.top;
        container.scrollBy({ top: -overflow, behavior: 'smooth' });
      }
    };

    const handleFocusIn = (e: FocusEvent) => {
      const target = e.target as HTMLElement | null;
      if (!isFormElement(target)) return;
      // キーボードが立ち上がるのを待つ
      setTimeout(() => target && scrollFocusedIntoView(target), 120);
      setTimeout(() => target && scrollFocusedIntoView(target), 380);
    };

    const handleVvResize = () => {
      const active = document.activeElement as HTMLElement | null;
      if (isFormElement(active)) {
        setTimeout(() => active && scrollFocusedIntoView(active), 60);
      }
    };

    const contentElement = contentRef.current;
    contentElement?.addEventListener('focusin', handleFocusIn);
    window.visualViewport?.addEventListener('resize', handleVvResize);

    return () => {
      contentElement?.removeEventListener('focusin', handleFocusIn);
      window.visualViewport?.removeEventListener('resize', handleVvResize);
    };
  }, []);

  return (
  <DialogPortal>
    <DialogOverlay />
    <DialogPrimitive.Content
        ref={combinedRef}
        style={{ ...dynamicStyle, ...style }}
      className={cn(
          'fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg max-h-[90vh] translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 overflow-y-auto overscroll-contain data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[state=closed]:slide-out-to-left-1/2 data-[state=closed]:slide-out-to-top-[48%] data-[state=open]:slide-in-from-left-1/2 data-[state=open]:slide-in-from-top-[48%] sm:rounded-lg',
        className
      )}
      {...props}
    >
      {children}
      <DialogPrimitive.Close className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
        <X className="h-4 w-4" />
        <span className="sr-only">Close</span>
      </DialogPrimitive.Close>
    </DialogPrimitive.Content>
  </DialogPortal>
  );
});
DialogContent.displayName = DialogPrimitive.Content.displayName;

const DialogHeader = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col space-y-1.5 text-center sm:text-left',
      className
    )}
    {...props}
  />
);
DialogHeader.displayName = 'DialogHeader';

const DialogFooter = ({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) => (
  <div
    className={cn(
      'flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2',
      className
    )}
    {...props}
  />
);
DialogFooter.displayName = 'DialogFooter';

const DialogTitle = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Title>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Title>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Title
    ref={ref}
    className={cn(
      'text-lg font-semibold leading-none tracking-tight',
      className
    )}
    {...props}
  />
));
DialogTitle.displayName = DialogPrimitive.Title.displayName;

const DialogDescription = React.forwardRef<
  React.ElementRef<typeof DialogPrimitive.Description>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Description>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Description
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
DialogDescription.displayName = DialogPrimitive.Description.displayName;

export {
  Dialog,
  DialogPortal,
  DialogOverlay,
  DialogClose,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
};
