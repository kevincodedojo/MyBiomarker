export default function OfflinePage() {
  return (
    <div className="flex flex-col items-center gap-3 pt-24 text-center">
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="max-w-xs text-sm text-fg-secondary">
        MyBiomarker needs a connection to load new data. Pages you&apos;ve
        visited recently may still work — or reconnect and try again.
      </p>
    </div>
  );
}
