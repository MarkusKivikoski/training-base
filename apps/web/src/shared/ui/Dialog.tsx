import { useEffect, useRef, type ReactNode } from 'react';

type DialogProps = {
  /** Id of the element that names the dialog, usually its heading. */
  labelledBy: string;
  /** Called on Escape. */
  onCancel: () => void;
  children: ReactNode;
};

/**
 * A modal dialog, open while it's rendered. It uses the browser's own `<dialog>`, which keeps
 * focus inside, makes the page behind it inert and dims it.
 */
export const Dialog = ({ labelledBy, onCancel, children }: DialogProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) dialog.showModal();
  }, []);

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={labelledBy}
      onCancel={(event) => {
        // The browser would close it itself; the parent decides instead.
        event.preventDefault();
        // React passes `cancel` up its own tree, so without this Escape in a modal opened from
        // inside another dialog would close that one too.
        event.stopPropagation();
        onCancel();
      }}
      className="m-auto w-[min(28rem,calc(100vw-2rem))] rounded-xl border border-line bg-surface-1 p-5 text-ink shadow-xl backdrop:bg-black/50 sm:p-6"
    >
      {children}
    </dialog>
  );
};
