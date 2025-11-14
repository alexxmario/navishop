import { useEffect } from 'react';

const PageTitle = ({ title }) => {
  useEffect(() => {
    const fullTitle = title ? `${title} - PilotOn` : 'PilotOn - Navigații Auto Moderne';
    document.title = fullTitle;
  }, [title]);

  return null; // This component doesn't render anything
};

export default PageTitle;