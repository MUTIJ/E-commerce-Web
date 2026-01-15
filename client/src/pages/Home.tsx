import { Navbar } from "@/components/Navbar";
import { useProducts } from "@/hooks/use-products";
import { ProductCard } from "@/components/ProductCard";
import { CartDrawer } from "@/components/CartDrawer";
import { motion } from "framer-motion";
import { ArrowRight, Truck, ShieldCheck, Leaf } from "lucide-react";
import { Link } from "wouter";

export default function Home() {
  const { data: products, isLoading } = useProducts();

  // Filter featured products (e.g., limit to first 3 or specific category)
  const featuredProducts = products?.slice(0, 3);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <CartDrawer />

      {/* Hero Section */}
      <section className="relative h-[80vh] flex items-center overflow-hidden">
        {/* Abstract shapes/blobs background */}
        <div className="absolute inset-0 bg-secondary/30">
          <div className="absolute -top-40 -right-40 w-[600px] h-[600px] bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute top-40 -left-20 w-[400px] h-[400px] bg-accent/10 rounded-full blur-3xl" />
        </div>

        {/* Hero Content */}
        <div className="container-custom relative z-10 grid lg:grid-cols-2 gap-12 items-center">
          <motion.div
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8 }}
          >
            <span className="inline-block px-4 py-1.5 rounded-full bg-white border border-border shadow-sm text-sm font-semibold text-primary mb-6">
              🌾 Premium Quality from Mwea
            </span>
            <h1 className="text-5xl lg:text-7xl font-display font-bold text-foreground leading-[1.1] mb-6">
              Authentic <span className="text-primary italic">Pishori</span> Rice Delivered.
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg leading-relaxed">
              Experience the distinct aroma and fluffy texture of genuine Karen Pishori Mwea Rice. Sourced directly from farmers, delivered to your doorstep.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link href="/products">
                <button className="btn-primary px-8 py-4 rounded-full text-lg font-semibold flex items-center gap-2 group">
                  Shop Now
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </Link>
              <a href="#features" className="px-8 py-4 rounded-full bg-white border border-border font-semibold text-foreground hover:bg-muted transition-colors">
                Learn More
              </a>
            </div>
          </motion.div>

          {/* Hero Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative hidden lg:block"
          >
            {/* rice bowl hero image */}
            <div className="relative z-10 rounded-3xl overflow-hidden shadow-2xl shadow-primary/20 rotate-3 hover:rotate-0 transition-transform duration-700">
              <img 
                src="https://images.unsplash.com/photo-1516684732162-798a0062be99?auto=format&fit=crop&q=80&w=1000" 
                alt="Bowl of premium rice"
                className="w-full h-auto object-cover"
              />
            </div>
            {/* Decorative elements */}
            <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-accent rounded-full opacity-20 blur-2xl z-0" />
          </motion.div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 bg-white border-y border-border/40">
        <div className="container-custom">
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                icon: <Truck className="w-8 h-8 text-primary" />,
                title: "Fast Delivery",
                desc: "Same-day delivery within Nairobi and its environs."
              },
              {
                icon: <Leaf className="w-8 h-8 text-primary" />,
                title: "100% Natural",
                desc: "Pure, unadulterated rice straight from the paddy fields."
              },
              {
                icon: <ShieldCheck className="w-8 h-8 text-primary" />,
                title: "Quality Guaranteed",
                desc: "We ensure every grain meets our premium standards."
              }
            ].map((feature, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                viewport={{ once: true }}
                className="p-8 rounded-2xl bg-secondary/20 border border-secondary hover:bg-secondary/40 transition-colors"
              >
                <div className="w-14 h-14 bg-white rounded-xl shadow-sm flex items-center justify-center mb-4">
                  {feature.icon}
                </div>
                <h3 className="text-xl font-display font-bold mb-2">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-24 bg-background">
        <div className="container-custom">
          <div className="flex justify-between items-end mb-12">
            <div>
              <span className="text-primary font-semibold tracking-wider uppercase text-sm">Our Selection</span>
              <h2 className="text-4xl font-display font-bold mt-2">Featured Products</h2>
            </div>
            <Link href="/products" className="hidden md:flex items-center gap-2 text-foreground font-medium hover:text-primary transition-colors">
              View All Products <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {isLoading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-[400px] bg-muted/50 rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
              {featuredProducts?.map((product) => (
                <ProductCard key={product.id} product={product} />
              ))}
            </div>
          )}
          
          <div className="mt-10 text-center md:hidden">
            <Link href="/products">
              <button className="px-6 py-3 border border-border rounded-full font-medium">View All Products</button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-foreground text-background py-16">
        <div className="container-custom grid md:grid-cols-4 gap-12">
          <div className="col-span-2">
            <div className="flex items-center gap-2 mb-6">
              <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground font-bold">K</div>
              <span className="font-display font-bold text-xl">Karen Pishori Mwea Rice</span>
            </div>
            <p className="text-background/60 max-w-sm mb-6">
              Delivering the finest quality Pishori rice from the heart of Mwea to your kitchen table. Authentic, aromatic, and premium.
            </p>
          </div>
          <div>
            <h4 className="font-display font-bold text-lg mb-6">Quick Links</h4>
            <ul className="space-y-3 text-background/60">
              <li><Link href="/" className="hover:text-primary transition-colors">Home</Link></li>
              <li><Link href="/products" className="hover:text-primary transition-colors">Shop</Link></li>
              <li><Link href="/orders" className="hover:text-primary transition-colors">My Orders</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="font-display font-bold text-lg mb-6">Contact</h4>
            <ul className="space-y-3 text-background/60">
              <li>Nairobi, Kenya</li>
              <li>+254 700 000 000</li>
              <li>sales@karenpishori.co.ke</li>
            </ul>
          </div>
        </div>
        <div className="container-custom mt-12 pt-8 border-t border-white/10 text-center text-background/40 text-sm">
          © {new Date().getFullYear()} Karen Pishori Mwea Rice. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
