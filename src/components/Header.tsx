import { BookOpen, Menu, X } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export default function Header() {
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { label: 'Accueil', href: '#home' },
    { label: 'Fonctionnalités', href: '#features' },
    { label: 'Domaines', href: '#domains' },
    { label: 'Découvertes', href: '#discoveries' },
    { label: 'À propos', href: '#about' },
    { label: 'Contact', href: '#contact' },
  ];

  return (
    <header className="sticky top-0 z-50 bg-white bg-opacity-95 backdrop-blur-md shadow-lg border-b-2 border-emerald-100">
      <div className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3 group cursor-pointer">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300">
              <BookOpen className="w-6 h-6 text-white" />
            </div>
            <div className="hidden sm:block">
              <h1 className="text-2xl font-bold text-emerald-900">IQra Dine</h1>
              <p className="text-xs text-amber-600 font-semibold">Science & Coran</p>
            </div>
          </div>

          <nav className="hidden lg:flex items-center gap-8">
            {menuItems.map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="text-gray-700 font-semibold hover:text-emerald-600 transition-colors duration-300 relative group"
              >
                {item.label}
                <span className="absolute bottom-0 left-0 w-0 h-1 bg-gradient-to-r from-emerald-600 to-amber-500 group-hover:w-full transition-all duration-300"></span>
              </a>
            ))}
          </nav>

          <div className="hidden lg:flex items-center gap-4">
            <Link
              to="/admin/login"
              className="bg-white text-emerald-700 px-6 py-2 rounded-lg font-semibold border-2 border-emerald-600 hover:bg-emerald-50 transition-all duration-300"
            >
              Connexion
            </Link>
            <a
              href="https://play.google.com/store/apps/details?id=com.quranic_science_explorer.app"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-2 rounded-lg font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 shadow-lg"
            >
              Télécharger
            </a>
          </div>

          <button
            onClick={() => setIsOpen(!isOpen)}
            className="lg:hidden p-2 hover:bg-emerald-50 rounded-lg transition-colors"
          >
            {isOpen ? (
              <X className="w-6 h-6 text-emerald-700" />
            ) : (
              <Menu className="w-6 h-6 text-emerald-700" />
            )}
          </button>
        </div>

        {isOpen && (
          <div className="lg:hidden mt-4 pb-4 border-t border-emerald-100 pt-4 animate-in fade-in slide-in-from-top-2 duration-300">
            <nav className="flex flex-col gap-3 mb-4">
              {menuItems.map((item) => (
                <a
                  key={item.label}
                  href={item.href}
                  className="text-gray-700 font-semibold px-4 py-2 rounded-lg hover:bg-emerald-50 hover:text-emerald-600 transition-all duration-300"
                  onClick={() => setIsOpen(false)}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            <div className="flex flex-col gap-3 px-4">
              <Link
                to="/admin/login"
                onClick={() => setIsOpen(false)}
                className="text-center w-full bg-white text-emerald-700 px-6 py-2 rounded-lg font-semibold border-2 border-emerald-600 hover:bg-emerald-50 transition-all duration-300"
              >
                Connexion
              </Link>
              <button className="w-full bg-gradient-to-r from-emerald-600 to-emerald-700 text-white px-6 py-2 rounded-lg font-semibold hover:from-emerald-700 hover:to-emerald-800 transition-all duration-300 shadow-lg">
                Télécharger
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
