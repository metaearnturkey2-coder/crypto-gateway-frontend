export function NoticeBanner({ notice }) {
  if (!notice) {
    return null;
  }

  return (
    <div
      className={`mb-5 rounded-lg border px-4 py-3 text-sm ${
        notice.type === "success"
          ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
          : "border-red-500/40 bg-red-500/10 text-red-200"
      }`}
    >
      {notice.message}
    </div>
  );
}
