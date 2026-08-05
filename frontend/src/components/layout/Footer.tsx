export function Footer() {
  return (
    <footer className="mt-auto border-t border-border bg-bg-secondary">
      <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 sm:flex-row sm:px-6 lg:px-8">
        <p className="text-sm text-text-primary/60">
          &copy; {new Date().getFullYear()} EPIX Esports. All rights
          reserved.
        </p>
        
      </div>
    </footer>
  );
}
