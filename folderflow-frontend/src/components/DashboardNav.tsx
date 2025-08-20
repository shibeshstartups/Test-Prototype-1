import React from "react";

const navItems = [
  { label: "Transfers", href: "#transfers" },
  { label: "Files", href: "#files" },
  { label: "Plans", href: "#plans" },
  { label: "Settings", href: "#settings" },
];

const DashboardNav: React.FC = () => (
  <nav className="flex gap-6 py-4 px-2 bg-white shadow rounded-lg mb-8">
    {navItems.map(item => (
      <a
        key={item.label}
        href={item.href}
        className="text-blue-700 font-medium hover:underline"
      >
        {item.label}
      </a>
    ))}
  </nav>
);

export default DashboardNav;
