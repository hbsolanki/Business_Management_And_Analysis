export default function EmptyState({ text }) {
  return (
    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-10 text-center">
      <p className="text-slate-500 text-sm font-medium">{text}</p>
    </div>
  );
}
