import React from 'react';
import { Link } from 'react-router-dom';
import logoSvg from '../logo.svg';

const Logo = ({ 
  size = "header", // "header" or "footer"
  linkClassName = "logo-link" 
}) => {
  const logoClass = size === "footer" ? "logo-footer" : "logo-header";
  
  return (
    <Link to="/" className={linkClassName}>
      <img 
        src={logoSvg} 
        alt="PilotOn - Navigații auto moderne"
        className={logoClass}
      />
    </Link>
  );
};

export default Logo;