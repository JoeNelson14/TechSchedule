import { Link } from "react-router-dom";
import { useAuth } from "../auth/useAuth";

// service icons
import { FaOilCan, FaCarBattery, FaCarSide, FaFacebookF, FaTwitter, FaInstagram, FaLinkedinIn } from "react-icons/fa";
import { GiCarWheel, GiMechanicGarage } from "react-icons/gi";
import { MdBuild } from "react-icons/md";

const NavLink = ({ href, children }) => (
  <a href={href} className="text-sm text-gray-700 hover:text-gray-900 transition">
    {children}
  </a>
);

const ServiceCard = ({ icon, title, children }) => (
  <div className="text-center p-6 rounded-xl bg-white shadow-sm border border-gray-100 hover:shadow-md transition">
    <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
      {icon}
    </div>
    <h3 className="font-semibold text-gray-900">{title}</h3>
    <p className="mt-2 text-sm text-gray-600 leading-relaxed">{children}</p>
  </div>
);

export default function Landing() {
  const { user } = useAuth();

  const dashboardPath =
    user?.role === "admin" ? "/admin" : user?.role === "technician" ? "/technician" : "/";

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Top Nav */}
      <header className="bg-white/90 backdrop-blur border-b">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gray-900 text-white flex items-center justify-center font-bold">
              A
            </div>
            <span className="font-bold tracking-wide text-gray-900">AUTO</span>
          </div>

          <nav className="hidden md:flex items-center gap-6">
            <NavLink href="#home">Home</NavLink>
            <NavLink href="#services">Services</NavLink>
            <NavLink href="#about">About</NavLink>
            <NavLink href="#contact">Contact</NavLink>
          </nav>

          <div className="flex items-center gap-3">
            {user ? (
              <Link
                to={dashboardPath}
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 transition"
              >
                Go to Dashboard
              </Link>
            ) : (
              <Link
                to="/login"
                className="px-4 py-2 rounded-lg bg-gray-900 text-white text-sm hover:bg-gray-800 transition"
              >
                Login
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section id="home" className="bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-10 text-center">
          <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-gray-900">
            Tech Schedule
          </h1>
          <p className="mt-4 text-lg md:text-xl text-gray-600">
            Your automotive service scheduling solution.
          </p>
        </div>

        <div className="max-w-6xl mx-auto px-4 pb-16">
          <div className="relative overflow-hidden rounded-2xl shadow-lg border bg-gray-900">
            <img
              src={new URL("../assets/hero.webp", import.meta.url).toString()}
              alt="Hero"
              className="h-72 md:h-96 w-full object-cover"
            />

            <div className="absolute inset-0 bg-black/45" />

            <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6">
              <h2 className="text-3xl md:text-5xl font-bold text-white leading-tight">
                Schedule Your Automotive
                <br className="hidden md:block" /> Services Online
              </h2>

              <div className="mt-6">
                {user ? (
                  <Link
                    to={dashboardPath}
                    className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                  >
                    View Repair Orders
                  </Link>
                ) : (
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center px-6 py-3 rounded-lg bg-emerald-600 text-white font-semibold hover:bg-emerald-700 transition"
                  >
                    Book Now
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section id="services" className="bg-white border-t">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h3 className="text-2xl md:text-3xl font-bold text-gray-900 text-center">
            Easily schedule your car maintenance
            <br className="hidden md:block" /> and repair appointments online.
          </h3>

          <div className="mt-12 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            <ServiceCard title="Oil Change" icon={<FaOilCan size={26} />}>
              Quick service with real RO tracking and technician assignment.
            </ServiceCard>

            <ServiceCard title="Tire Rotation" icon={<GiCarWheel size={26} />}>
              Keep your vehicle running smooth with rotation scheduling.
            </ServiceCard>

            <ServiceCard title="Brake Inspection" icon={<FaCarSide size={26} />}>
              Inspection workflows that move from in-progress to approval.
            </ServiceCard>

            <ServiceCard title="Diagnostics" icon={<FaCarBattery size={26} />}>
              Track recommended repairs and keep RO history clean.
            </ServiceCard>

            <ServiceCard title="Maintenance" icon={<GiMechanicGarage size={26} />}>
              Admin builds templates, schedules store snapshots for accuracy.
            </ServiceCard>

            <ServiceCard title="Repair Orders" icon={<MdBuild size={26} />}>
              RO numbers are generated by backend and searchable in the shop.
            </ServiceCard>
          </div>
        </div>
      </section>

      {/* About */}
      <section id="about" className="bg-gray-50 border-t">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h3 className="text-2xl font-bold text-gray-900">About</h3>
          <p className="mt-3 text-gray-600 max-w-2xl">
            TechSchedule simulates real shop workflow: admins manage service templates and repair orders, technicians
            accept work, perform repairs, and move ROs through the lifecycle.
          </p>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" className="bg-white border-t">
        <div className="max-w-6xl mx-auto px-4 py-16">
          <h3 className="text-2xl font-bold text-gray-900">Contact</h3>
          <p className="mt-3 text-gray-600 max-w-2xl">
            Want a demo? Login and explore the admin and technician flows.
          </p>
          <div className="mt-6">
            <Link
              to="/login"
              className="inline-flex items-center justify-center px-5 py-3 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 transition"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300">
        <div className="max-w-6xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-6">
          <p className="text-sm">
            © {new Date().getFullYear()} TechSchedule. All rights reserved.
          </p>

          <div className="flex items-center gap-4">
            <a href="#" className="hover:text-white transition" aria-label="Facebook">
              <FaFacebookF size={18} />
            </a>
            <a href="#" className="hover:text-white transition" aria-label="Twitter">
              <FaTwitter size={18} />
            </a>
            <a href="#" className="hover:text-white transition" aria-label="Instagram">
              <FaInstagram size={18} />
            </a>
            <a href="#" className="hover:text-white transition" aria-label="LinkedIn">
              <FaLinkedinIn size={18} />
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}