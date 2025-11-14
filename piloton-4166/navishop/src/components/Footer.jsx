import { Link } from 'react-router-dom';
import logoSvg from '../logo.svg';
import { Phone, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-100 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <Link to="/" className="logo-link inline-block mb-4">
              <img 
                src={logoSvg} 
                alt="PilotOn - Navigații auto moderne"
                className="logo-footer"
              />
            </Link>
            <p className="text-gray-600 text-sm mb-4">
              Navigații auto moderne și fiabile pentru toate mărcile.
            </p>
          </div>

          <div>
            <h3 className="font-medium mb-4">Produse</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/category/navigatii-gps" className="hover:text-blue-600">Navigații GPS</Link></li>
              <li><Link to="/category/carplay-android" className="hover:text-blue-600">CarPlay/Android Auto</Link></li>
              <li><Link to="/category/camere-marsarier" className="hover:text-blue-600">Camere marsarier</Link></li>
              <li><Link to="/category/accesorii" className="hover:text-blue-600">Accesorii</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-4">Servicii</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><a href="#" className="hover:text-blue-600">Instalare</a></li>
              <li><a href="#" className="hover:text-blue-600">Service</a></li>
              <li><a href="#" className="hover:text-blue-600">Garanție</a></li>
              <li><a href="#" className="hover:text-blue-600">Suport</a></li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-4">Contact</h3>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex items-center">
                <Phone className="w-4 h-4 mr-2 text-blue-600" />
                <span>0800 123 456</span>
              </div>
              <div className="flex items-center">
                <Mail className="w-4 h-4 mr-2 text-blue-600" />
                <span>contact@piloton.ro</span>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
          <p>© 2024 PilotOn. Toate drepturile rezervate.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <a href="#" className="hover:text-blue-600">Termeni</a>
            <a href="#" className="hover:text-blue-600">Confidențialitate</a>
            <a href="#" className="hover:text-blue-600">Cookies</a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;