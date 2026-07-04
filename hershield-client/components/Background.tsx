export default function Background({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="relative min-h-screen w-full overflow-y-auto bg-[#07111F]">

      {/* Top Left Glow */}
      <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-cyan-500/20 blur-[140px]" />

      {/* Bottom Right Glow */}
      <div className="absolute -right-40 bottom-0 h-[450px] w-[450px] rounded-full bg-blue-500/20 blur-[170px]" />

      {/* Background Gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,#06b6d433,transparent_35%),radial-gradient(circle_at_bottom_right,#2563eb33,transparent_35%)]" />

      {/* Content */}
      <div className="relative z-10 flex min-h-screen w-full items-center justify-center px-4 py-10 sm:px-6 lg:px-8">
        {children}
      </div>

    </main>
  );
}