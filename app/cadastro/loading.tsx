export default function Loading() {
  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div
          className="h-8 w-8 animate-spin rounded-full border-2 border-t-transparent"
          style={{ borderColor: "rgba(255,255,255,0.1)", borderTopColor: "#8B5CF6" }}
        />
        <span className="text-xs" style={{ color: "#888888" }}>Carregando...</span>
      </div>
    </div>
  );
}
