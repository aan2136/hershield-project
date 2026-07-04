import { ShieldCheck } from "lucide-react";

export default function Logo() {
  return (
    <div className="mb-8 flex flex-col items-center">

      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-cyan-500 shadow-xl shadow-cyan-500/30">

        <ShieldCheck
          className="text-white"
          size={40}
        />

      </div>

      <h1 className="mt-6 text-5xl font-extrabold tracking-tight text-white">

        HerShield

      </h1>

      <p className="mt-2 text-lg text-slate-300">

        AI Powered Women's Safety

      </p>

    </div>
  );
}