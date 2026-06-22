import PageTitle from './PageTitle';
import Header from './Header';
import Footer from './Footer';

const LegalPage = ({ title, subtitle, lastUpdated, children }) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <PageTitle title={title} />
      <Header />

      {/* Page Header */}
      <div className="bg-white border-b border-gray-100 py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl font-light mb-4 text-gray-900">{title}</h1>
          {subtitle && (
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">{subtitle}</p>
          )}
          {lastUpdated && (
            <p className="text-sm text-gray-400 mt-4">
              Ultima actualizare: {lastUpdated}
            </p>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-16 flex-1">
        <div className="max-w-3xl mx-auto bg-white border border-gray-100 p-8 sm:p-12">
          <div className="legal-content space-y-8 text-gray-700 leading-relaxed">
            {children}
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export const LegalSection = ({ title, children }) => (
  <section className="space-y-3">
    <h2 className="text-xl font-medium text-gray-900">{title}</h2>
    <div className="space-y-3 text-gray-600">{children}</div>
  </section>
);

export default LegalPage;
