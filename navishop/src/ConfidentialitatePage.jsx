import LegalPage, { LegalSection } from './components/LegalPage';

const ConfidentialitatePage = () => {
  return (
    <LegalPage
      title="Politica de confidențialitate"
      subtitle="Cum colectăm, folosim și protejăm datele tale personale"
      lastUpdated="22 iunie 2026"
    >
      <p>
        Confidențialitatea datelor tale este importantă pentru noi. Această
        politică explică ce date cu caracter personal colectăm, în ce scop le
        folosim și care sunt drepturile tale, în conformitate cu Regulamentul
        (UE) 2016/679 (GDPR).
      </p>

      <LegalSection title="1. Operatorul de date">
        <p>
          Operatorul datelor cu caracter personal este PilotOn, cu sediul în Str.
          Principală nr. 123, Sector 1, București, România. Pentru orice solicitare
          legată de protecția datelor ne poți contacta la{' '}
          <a href="mailto:contact@piloton.ro" className="text-blue-600 hover:underline">
            contact@piloton.ro
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="2. Ce date colectăm">
        <p>În funcție de interacțiunea ta cu site-ul, putem colecta:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>date de identificare: nume și prenume;</li>
          <li>date de contact: adresă de e-mail, număr de telefon, adresă de livrare;</li>
          <li>date privind comenzile: produse achiziționate, valoarea comenzii, istoricul comenzilor;</li>
          <li>date tehnice: adresă IP, tip de browser, date colectate prin cookie-uri.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Scopul prelucrării">
        <p>Folosim datele tale pentru:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>procesarea și livrarea comenzilor;</li>
          <li>emiterea documentelor fiscale;</li>
          <li>comunicarea privind statusul comenzilor și suportul clienți;</li>
          <li>respectarea obligațiilor legale;</li>
          <li>îmbunătățirea experienței pe site și a serviciilor oferite.</li>
        </ul>
      </LegalSection>

      <LegalSection title="4. Temeiul legal">
        <p>
          Prelucrăm datele pe baza executării contractului (procesarea
          comenzilor), a obligațiilor legale (de exemplu, cele fiscale), a
          consimțământului tău (de exemplu, pentru comunicări de marketing) și a
          interesului nostru legitim (de exemplu, prevenirea fraudelor).
        </p>
      </LegalSection>

      <LegalSection title="5. Partajarea datelor">
        <p>
          Putem transmite datele tale către parteneri care ne ajută să livrăm
          serviciile: firme de curierat, procesatori de plăți și furnizori de
          servicii IT. Acești parteneri prelucrează datele exclusiv în baza
          instrucțiunilor noastre și cu respectarea legislației aplicabile. Nu
          vindem datele tale personale către terți.
        </p>
      </LegalSection>

      <LegalSection title="6. Perioada de stocare">
        <p>
          Păstrăm datele tale doar atât timp cât este necesar pentru scopurile
          menționate sau pentru respectarea obligațiilor legale (de exemplu,
          documentele contabile se păstrează conform termenelor prevăzute de
          lege).
        </p>
      </LegalSection>

      <LegalSection title="7. Drepturile tale">
        <p>Conform GDPR, beneficiezi de următoarele drepturi:</p>
        <ul className="list-disc pl-6 space-y-1">
          <li>dreptul de acces la datele tale;</li>
          <li>dreptul la rectificarea datelor inexacte;</li>
          <li>dreptul la ștergerea datelor („dreptul de a fi uitat”);</li>
          <li>dreptul la restricționarea prelucrării;</li>
          <li>dreptul la portabilitatea datelor;</li>
          <li>dreptul de a te opune prelucrării;</li>
          <li>dreptul de a depune o plângere la Autoritatea Națională de Supraveghere a Prelucrării Datelor cu Caracter Personal (ANSPDCP).</li>
        </ul>
        <p>
          Pentru exercitarea acestor drepturi, ne poți scrie la{' '}
          <a href="mailto:contact@piloton.ro" className="text-blue-600 hover:underline">
            contact@piloton.ro
          </a>
          .
        </p>
      </LegalSection>

      <LegalSection title="8. Cookie-uri">
        <p>
          Site-ul folosește cookie-uri pentru funcționare și analiză. Detalii
          complete găsești în Politica de cookie-uri.
        </p>
      </LegalSection>

      <LegalSection title="9. Modificări">
        <p>
          Putem actualiza periodic această politică. Orice modificare va fi
          publicată pe această pagină, împreună cu data ultimei actualizări.
        </p>
      </LegalSection>
    </LegalPage>
  );
};

export default ConfidentialitatePage;
