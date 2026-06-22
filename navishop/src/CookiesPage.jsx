import LegalPage, { LegalSection } from './components/LegalPage';

const CookiesPage = () => {
  return (
    <LegalPage
      title="Politica de cookie-uri"
      subtitle="Ce sunt cookie-urile și cum le folosim pe site-ul PilotOn"
      lastUpdated="22 iunie 2026"
    >
      <p>
        Această politică explică ce sunt cookie-urile, ce tipuri folosim pe
        site-ul PilotOn și cum îți poți gestiona preferințele legate de acestea.
      </p>

      <LegalSection title="1. Ce sunt cookie-urile">
        <p>
          Cookie-urile sunt fișiere text de mici dimensiuni stocate de browser pe
          dispozitivul tău atunci când vizitezi un site. Ele permit site-ului să
          rețină acțiunile și preferințele tale (de exemplu, produsele din coș)
          pe o anumită perioadă de timp.
        </p>
      </LegalSection>

      <LegalSection title="2. Tipuri de cookie-uri pe care le folosim">
        <p>
          <strong className="text-gray-900">Cookie-uri esențiale.</strong> Sunt
          necesare pentru funcționarea site-ului: menținerea coșului de cumpărături,
          autentificarea în cont și salvarea preferinței privind cookie-urile.
          Fără acestea, site-ul nu poate funcționa corect.
        </p>
        <p>
          <strong className="text-gray-900">Cookie-uri de funcționalitate.</strong>{' '}
          Rețin alegerile tale (de exemplu, produsele vizualizate recent) pentru a
          oferi o experiență personalizată.
        </p>
        <p>
          <strong className="text-gray-900">Cookie-uri de analiză.</strong> Ne
          ajută să înțelegem cum este utilizat site-ul, pentru a-l îmbunătăți.
          Aceste date sunt colectate în formă agregată.
        </p>
      </LegalSection>

      <LegalSection title="3. Consimțământul tău">
        <p>
          La prima vizită, îți afișăm o notificare prin care îți poți exprima
          acordul privind utilizarea cookie-urilor. Cookie-urile strict necesare
          sunt folosite indiferent de alegere, întrucât fără ele site-ul nu poate
          funcționa.
        </p>
      </LegalSection>

      <LegalSection title="4. Gestionarea cookie-urilor">
        <p>
          Poți controla și șterge cookie-urile din setările browser-ului tău.
          Majoritatea browserelor permit blocarea sau ștergerea cookie-urilor,
          însă te rugăm să reții că dezactivarea cookie-urilor esențiale poate
          afecta funcționarea site-ului.
        </p>
        <p>Mai jos găsești instrucțiuni pentru cele mai utilizate browsere:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>Google Chrome – Setări → Confidențialitate și securitate → Cookie-uri;</li>
          <li>Mozilla Firefox – Setări → Confidențialitate și securitate;</li>
          <li>Safari – Preferințe → Confidențialitate;</li>
          <li>Microsoft Edge – Setări → Cookie-uri și permisiuni site.</li>
        </ul>
      </LegalSection>

      <LegalSection title="5. Modificări ale politicii">
        <p>
          Putem actualiza această politică de cookie-uri. Orice modificare va fi
          publicată pe această pagină, împreună cu data ultimei actualizări.
        </p>
      </LegalSection>

      <LegalSection title="6. Contact">
        <p>
          Pentru întrebări legate de utilizarea cookie-urilor, ne poți contacta la{' '}
          <a href="mailto:contact@piloton.ro" className="text-blue-600 hover:underline">
            contact@piloton.ro
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
};

export default CookiesPage;
