import { Navbar } from "@/components/Navbar";
import { Link } from "wouter";
import { Package, Users, ShoppingBag, MapPin, TrendingUp, ArrowRight } from "lucide-react";
import { useStats } from "@/hooks/use-orders";
import { motion } from "framer-motion";

export default function AdminDashboard() {
  const { data: stats } = useStats();

  const cards = [
    {
      title: "Total Sales",
      value: `KES ${stats?.totalSales?.toLocaleString() || '0'}`,
      icon: TrendingUp,
      color: "bg-green-100 text-green-700",
      link: "/admin/orders"
    },
    {
      title: "Total Orders",
      value: stats?.totalOrders || 0,
      icon: ShoppingBag,
      color: "bg-blue-100 text-blue-700",
      link: "/admin/orders"
    },
    {
      title: "Pending Orders",
      value: stats?.pendingOrders || 0,
      icon: Package,
      color: "bg-amber-100 text-amber-700",
      link: "/admin/orders"
    },
  ];

  const menuItems = [
    { name: "Manage Products", icon: Package, href: "/admin/products", desc: "Add, edit, or remove rice products" },
    { name: "Manage Orders", icon: ShoppingBag, href: "/admin/orders", desc: "Process orders and update status" },
    { name: "Manage Regions", icon: MapPin, href: "/admin/regions", desc: "Update delivery locations and prices" },
    { name: "Manage Categories", icon: Package, href: "/admin/categories", desc: "Update product categories" },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      <main className="container-custom py-12">
        <h1 className="text-3xl font-display font-bold mb-2">Admin Dashboard</h1>
        <p className="text-muted-foreground mb-8">Overview of your store performance.</p>

        {/* Stats Grid */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          {cards.map((card, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="bg-white p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow"
            >
              <div className="flex justify-between items-start mb-4">
                <div className={`p-3 rounded-xl ${card.color}`}>
                  <card.icon className="w-6 h-6" />
                </div>
                <Link href={card.link} className="text-muted-foreground hover:text-primary">
                  <ArrowRight className="w-5 h-5" />
                </Link>
              </div>
              <p className="text-sm text-muted-foreground font-medium">{card.title}</p>
              <h3 className="text-2xl font-bold mt-1">{card.value}</h3>
            </motion.div>
          ))}
        </div>

        {/* Quick Links */}
        <h2 className="text-xl font-bold mb-6">Quick Actions</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {menuItems.map((item, idx) => (
            <Link key={idx} href={item.href}>
              <motion.div
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-white p-6 rounded-2xl border border-border shadow-sm cursor-pointer group h-full"
              >
                <div className="w-12 h-12 bg-muted rounded-xl flex items-center justify-center mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <item.icon className="w-6 h-6" />
                </div>
                <h3 className="text-lg font-bold mb-2">{item.name}</h3>
                <p className="text-muted-foreground text-sm">{item.desc}</p>
              </motion.div>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
