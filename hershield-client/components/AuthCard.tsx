export default function AuthCard({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div
      className="
        w-full
        max-w-md
        rounded-3xl
        border
        border-white/10
        bg-white/10
        backdrop-blur-xl
        shadow-2xl

        p-8
        md:p-10

        max-h-[90vh]
        overflow-y-auto

        scrollbar-thin
      "
    >
      {children}
    </div>
  );
}