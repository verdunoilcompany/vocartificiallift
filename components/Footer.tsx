export function Footer() {
  return (
    <footer className="border-t bg-card">
      <div className="flex w-full flex-col gap-1 px-4 py-4 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between md:px-6">
        <span>© {new Date().getFullYear()} Verdun Oil Company · Data &amp; Technology</span>
        <span>
          Optimization dashboards show generated sample data. Volumes in bbl/d and Mcf/d; pressure in psi.
        </span>
      </div>
    </footer>
  );
}
