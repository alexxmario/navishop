import { Link } from 'react-router-dom';
import logoSvg from '../logo.svg';
import { Phone, Mail } from 'lucide-react';

const Footer = () => {
  return (
    <footer className="bg-white border-t border-gray-100 py-12">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8">
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
            <h3 className="font-medium mb-4">GPS</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/category/gps?subcategory=5-inch" className="hover:text-blue-600">GPS 5 inch</Link></li>
              <li><Link to="/category/gps?subcategory=7-inch" className="hover:text-blue-600">GPS 7 inch</Link></li>
              <li><Link to="/category/gps?subcategory=9-inch" className="hover:text-blue-600">GPS 9 inch</Link></li>
              <li><Link to="/category/gps" className="hover:text-blue-600">Toate GPS-urile</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-4">Produse</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/category/navigatii-gps" className="hover:text-blue-600">Navigații GPS</Link></li>
              <li><Link to="/category/carplay-android" className="hover:text-blue-600">CarPlay / Android Auto</Link></li>
              <li><Link to="/category/camere-marsarier" className="hover:text-blue-600">Camere marsarier</Link></li>
              <li><Link to="/category/accesorii" className="hover:text-blue-600">Accesorii</Link></li>
            </ul>
          </div>

          <div>
            <h3 className="font-medium mb-4">Servicii</h3>
            <ul className="space-y-2 text-sm text-gray-600">
              <li><Link to="/contact" className="hover:text-blue-600">Instalare</Link></li>
              <li><Link to="/contact" className="hover:text-blue-600">Suport</Link></li>
              <li><Link to="/contact?subject=Retur" className="hover:text-blue-600">Retur</Link></li>
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

        {/* Company legal information */}
        <div className="border-t border-gray-100 mt-8 pt-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-sm text-gray-600">
            <div className="space-y-1">
              <p className="font-medium text-gray-900">S.C. PERFECT CENTURY S.R.L.</p>
              <p>Cod Fiscal: RO 26175588</p>
              <p>Nr. Reg. Com: J40/10698/2009</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-gray-900">Sediu Social</p>
              <p>Str. Nicolae Nicoleanu, 31, 013527,</p>
              <p>București, București</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium text-gray-900">Cont Bancar</p>
              <p>RO98BTRLRONCRT0I11180301</p>
              <p>Banca Transilvania</p>
              <p>Capital Social: 1000 lei</p>
            </div>
          </div>

          {/* ANPC & payment trust badges */}
          <div className="flex flex-wrap items-center gap-4 mt-8">
            <a
              href="https://consumer-redress.ec.europa.eu/site-relocation_en"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/images/anpc-sol.png" alt="ANPC SOL" className="h-12 w-auto" />
            </a>
            <a
              href="https://anpc.ro/sal/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/images/anpc-sal.png" alt="ANPC SAL" className="h-12 w-auto" />
            </a>
            <a
              href="https://www.euplatesc.ro/"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img src="/images/euplatesc.png" alt="euPlătesc" className="h-12 w-auto" />
            </a>
          </div>
        </div>

        <div className="border-t border-gray-100 mt-8 pt-8 flex flex-col md:flex-row justify-between items-center text-sm text-gray-600">
          <p>© 2026 PilotOn. Toate drepturile rezervate.</p>
          <div className="flex space-x-6 mt-4 md:mt-0">
            <Link to="/termeni" className="hover:text-blue-600">Termeni</Link>
            <Link to="/confidentialitate" className="hover:text-blue-600">Confidențialitate</Link>
            <Link to="/cookies" className="hover:text-blue-600">Cookies</Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
