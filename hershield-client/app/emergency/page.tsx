"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { User, Phone, Mail, Users, ArrowRight } from "lucide-react";
import Background from "@/components/Background";
import AuthCard from "@/components/AuthCard";
import Logo from "@/components/Logo";

interface EmergencyContact {
  name: string;
  relation: string;
  phone: string;
  email: string;
}

const emptyContact = (): EmergencyContact => ({
  name: "",
  relation: "",
  phone: "",
  email: "",
});

export default function EmergencyPage() {
  const router = useRouter();

  const [contacts, setContacts] = useState<EmergencyContact[]>([
    emptyContact(),
    emptyContact(),
    emptyContact(),
  ]);

  const [loading, setLoading] = useState(false);

  const handleChange = (
    index: number,
    field: keyof EmergencyContact,
    value: string
  ) => {
    setContacts((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSubmit = async () => {
    try {
      setLoading(true);

      const res = await fetch(
        "http://localhost:5000/api/emergency-contacts",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(contacts),
        }
      );

      const data = await res.json();

      if (data.success) {
        alert("Emergency contacts saved");
        router.push("/login");
      } else {
        alert(data.message || "Failed to save emergency contacts");
      }
    } catch (err) {
      alert("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Background>
      <AuthCard>

        <Logo />

        <h2 className="text-center text-2xl font-bold">
          Emergency Contacts
        </h2>

        <p className="mt-2 mb-8 text-center text-slate-400">
          Add three trusted contacts who will receive
          emergency alerts and your live location.
        </p>

        {contacts.map((contact, index) => (
          <div
            key={index}
            className="mb-6 rounded-2xl border border-slate-700 bg-slate-900/40 p-5"
          >
            <h3 className="mb-5 text-lg font-semibold text-cyan-400">
              Contact {index + 1}
            </h3>

            {/* Name */}

            <div className="relative mb-4">

              <User
                className="absolute left-4 top-4 text-cyan-400"
                size={20}
              />

              <input
                type="text"
                placeholder="Full Name"
                value={contact.name}
                onChange={(e) =>
                  handleChange(index, "name", e.target.value)
                }
                className="h-14 w-full rounded-xl border border-slate-700 bg-slate-900 pl-12 text-white outline-none focus:border-cyan-500"
              />

            </div>

            {/* Relation */}

            <div className="relative mb-4">

              <Users
                className="absolute left-4 top-4 text-cyan-400"
                size={20}
              />

              <input
                type="text"
                placeholder="Relation (Father, Friend...)"
                value={contact.relation}
                onChange={(e) =>
                  handleChange(index, "relation", e.target.value)
                }
                className="h-14 w-full rounded-xl border border-slate-700 bg-slate-900 pl-12 text-white outline-none focus:border-cyan-500"
              />

            </div>

            {/* Phone */}

            <div className="relative mb-4">

              <Phone
                className="absolute left-4 top-4 text-cyan-400"
                size={20}
              />

              <input
                type="tel"
                placeholder="Phone Number"
                value={contact.phone}
                onChange={(e) =>
                  handleChange(index, "phone", e.target.value)
                }
                className="h-14 w-full rounded-xl border border-slate-700 bg-slate-900 pl-12 text-white outline-none focus:border-cyan-500"
              />

            </div>

            {/* Email */}

            <div className="relative">

              <Mail
                className="absolute left-4 top-4 text-cyan-400"
                size={20}
              />

              <input
                type="email"
                placeholder="Email Address"
                value={contact.email}
                onChange={(e) =>
                  handleChange(index, "email", e.target.value)
                }
                className="h-14 w-full rounded-xl border border-slate-700 bg-slate-900 pl-12 text-white outline-none focus:border-cyan-500"
              />

            </div>

          </div>
        ))}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-xl bg-cyan-500 text-lg font-semibold transition hover:bg-cyan-600 disabled:cursor-not-allowed disabled:bg-slate-700"
        >
          {loading ? "Saving..." : "Continue"}

          <ArrowRight size={20} />
        </button>

      </AuthCard>
    </Background>
  );
}
