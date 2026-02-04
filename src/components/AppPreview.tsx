import { Smartphone, BookOpen, Brain, Heart, Star, Check } from 'lucide-react';

const appFeatures = [
  'Interface intuitive et élégante',
  'Contenu multilingue (FR, AR, EN, ES)',
  'Mode hors ligne disponible',
  'Notifications de nouvelles découvertes',
  'Recherche avancée par domaine',
  'Partage facile sur les réseaux sociaux',
];

export default function AppPreview() {
  return (
    <section className="py-24 bg-gradient-to-b from-emerald-50 to-white relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-20 left-10 w-72 h-72 bg-emerald-400 rounded-full blur-3xl"></div>
        <div className="absolute bottom-20 right-10 w-96 h-96 bg-amber-400 rounded-full blur-3xl"></div>
      </div>

      <div className="container mx-auto px-6 relative z-10">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-2 bg-emerald-100 px-4 py-2 rounded-full">
              <Smartphone className="w-5 h-5 text-emerald-700" />
              <span className="text-emerald-800 font-semibold">Application Mobile</span>
            </div>

            <h2 className="text-4xl lg:text-5xl font-bold text-emerald-900 leading-tight">
              Une expérience mobile exceptionnelle
            </h2>

            <p className="text-xl text-gray-700 leading-relaxed">
              IQra Dine vous offre une interface moderne et intuitive pour explorer facilement les liens entre science et Coran, où que vous soyez.
            </p>

            <div className="grid sm:grid-cols-2 gap-4">
              {appFeatures.map((feature, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 bg-white p-4 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300"
                >
                  <div className="w-8 h-8 bg-emerald-100 rounded-full flex items-center justify-center flex-shrink-0">
                    <Check className="w-5 h-5 text-emerald-600" />
                  </div>
                  <span className="text-gray-700 font-medium">{feature}</span>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 pt-4">
  
              {/* App Store (à remplacer quand le lien sera dispo) */}
              <a
                href="#"
                className="bg-black text-white px-8 py-4 rounded-xl font-semibold hover:bg-gray-800 transition-all duration-300 shadow-lg flex items-center gap-3 cursor-not-allowed opacity-70"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M17.05 20.28c-.98.95-2.05.8-3.08.35-1.09-.46-2.09-.48-3.24 0-1.44.62-2.2.44-3.06-.35C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09l.01-.01zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z"/>
                </svg>
                App Store
              </a>

              {/* Google Play */}
              <a
                href="https://play.google.com/store/apps/details?id=com.quranic_science_explorer.app"
                target="_blank"
                rel="noopener noreferrer"
                className="bg-emerald-600 text-white px-8 py-4 rounded-xl font-semibold hover:bg-emerald-700 transition-all duration-300 shadow-lg flex items-center gap-3"
              >
                <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M3.609 1.814L13.792 12 3.61 22.186a1.978 1.978 0 01-.119-1.062V2.876c0-.377.103-.744.118-1.062zM14.5 12.707l2.707 2.707-9.007 5.173c-.535.307-1.163.408-1.777.283L14.5 12.707zM17.207 8.586L14.5 11.293 6.423 3.217c.614-.125 1.242-.024 1.777.283l9.007 5.173v-.087zm1.586.914c.39.39.586.902.586 1.414s-.196 1.024-.586 1.414L17.5 13.621 15.086 11.207 17.5 8.793l1.293 1.293.014.414z"/>
                </svg>
                Google Play
              </a>

            </div>

          </div>

          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-400 to-amber-400 rounded-3xl blur-3xl opacity-30"></div>
            <div className="relative bg-gradient-to-br from-emerald-900 to-emerald-700 rounded-3xl p-8 shadow-2xl">
              <div className="bg-white rounded-2xl p-8 space-y-6">
                <div className="flex items-center gap-4 pb-4 border-b border-gray-200">
                  <div className="w-16 h-16 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center shadow-lg">
                    <BookOpen className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-emerald-900">IQra Dine</h3>
                    <p className="text-gray-600 text-sm">Science & Coran</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="bg-emerald-50 rounded-xl p-4 hover:bg-emerald-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-lg flex items-center justify-center">
                        <Brain className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-bold text-emerald-900">Assistant Hafiz</span>
                    </div>
                    <p className="text-sm text-gray-600">Posez vos questions sur le Coran et la science</p>
                  </div>

                  <div className="bg-amber-50 rounded-xl p-4 hover:bg-amber-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                        <Star className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-bold text-amber-900">Découverte du jour</span>
                    </div>
                    <p className="text-sm text-gray-600">L'univers en expansion</p>
                  </div>

                  <div className="bg-rose-50 rounded-xl p-4 hover:bg-rose-100 transition-colors cursor-pointer">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-10 h-10 bg-gradient-to-br from-rose-500 to-rose-600 rounded-lg flex items-center justify-center">
                        <Heart className="w-5 h-5 text-white" />
                      </div>
                      <span className="font-bold text-rose-900">Mes Favoris</span>
                    </div>
                    <p className="text-sm text-gray-600">12 découvertes sauvegardées</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
