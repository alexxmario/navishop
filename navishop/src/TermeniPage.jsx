import LegalPage, { LegalSection } from './components/LegalPage';

const TermeniPage = () => {
  return (
    <LegalPage
      title="Termeni și condiții"
      subtitle="Condițiile de utilizare a magazinului online PilotOn"
      lastUpdated="22 iunie 2026"
    >
      <p>
        Acești termeni și condiții reglementează utilizarea site-ului PilotOn și
        achiziționarea produselor comercializate prin intermediul acestuia. Prin
        accesarea site-ului și plasarea unei comenzi, confirmi că ai citit,
        înțeles și acceptat în totalitate prezentele condiții.
      </p>

      <LegalSection title="1. Informații generale">
        <p>
          Site-ul PilotOn (denumit în continuare „Site-ul”) este administrat de
          PilotOn, cu sediul în Str. Principală nr. 123, Sector 1, București,
          România. Pentru orice întrebări ne poți contacta la adresa de e-mail{' '}
          <a href="mailto:contact@piloton.ro" className="text-blue-600 hover:underline">
            contact@piloton.ro
          </a>{' '}
          sau la numărul de telefon 0800 123 456.
        </p>
      </LegalSection>

      <LegalSection title="2. Produse și prețuri">
        <p>
          Comercializăm navigații auto, sisteme CarPlay / Android Auto, camere
          de marșarier și accesorii compatibile. Ne străduim să prezentăm cât mai
          exact caracteristicile și disponibilitatea fiecărui produs.
        </p>
        <p>
          Toate prețurile afișate sunt exprimate în lei (RON) și includ TVA.
          Prețul produsului la momentul plasării comenzii este cel valabil
          pentru tranzacția respectivă. Ne rezervăm dreptul de a modifica
          prețurile în orice moment, fără notificare prealabilă.
        </p>
      </LegalSection>

      <LegalSection title="3. Plasarea comenzii">
        <p>
          O comandă este considerată finalizată în momentul în care primești
          confirmarea acesteia prin e-mail. Ne rezervăm dreptul de a anula o
          comandă în cazul în care produsul nu mai este disponibil, prețul a fost
          afișat eronat sau datele de livrare sunt incomplete ori incorecte. În
          aceste situații vei fi informat, iar sumele eventual achitate îți vor
          fi returnate integral.
        </p>
      </LegalSection>

      <LegalSection title="4. Livrare">
        <p>
          Livrarea produselor se realizează prin curier rapid, pe întreg
          teritoriul României. Termenul estimativ de livrare este de 1-3 zile
          lucrătoare de la confirmarea comenzii, în funcție de disponibilitatea
          produsului și de localitatea de destinație.
        </p>
      </LegalSection>

      <LegalSection title="5. Dreptul de retragere">
        <p>
          În conformitate cu OUG nr. 34/2014, în calitate de consumator ai
          dreptul de a te retrage din contract, fără a invoca vreun motiv, în
          termen de 14 zile calendaristice de la primirea produsului.
        </p>
        <p>
          Pentru a-ți exercita acest drept, ne poți notifica la adresa{' '}
          <a href="mailto:contact@piloton.ro" className="text-blue-600 hover:underline">
            contact@piloton.ro
          </a>
          . Produsul trebuie returnat în starea în care a fost primit, complet și
          fără urme de utilizare. Costul returnării este suportat de către
          client, cu excepția cazurilor în care produsul a fost livrat defect sau
          greșit.
        </p>
      </LegalSection>

      <LegalSection title="6. Garanție">
        <p>
          Toate produsele comercializate beneficiază de garanție conform
          legislației în vigoare. Pentru activarea garanției este necesară
          păstrarea facturii și a documentelor de garanție primite împreună cu
          produsul.
        </p>
      </LegalSection>

      <LegalSection title="7. Răspundere">
        <p>
          PilotOn nu poate fi tras la răspundere pentru eventualele daune
          rezultate din instalarea sau utilizarea necorespunzătoare a
          produselor. Recomandăm instalarea echipamentelor de către personal
          calificat.
        </p>
      </LegalSection>

      <LegalSection title="8. Modificarea termenilor">
        <p>
          Ne rezervăm dreptul de a modifica oricând prezentele condiții.
          Versiunea actualizată va fi publicată pe această pagină, motiv pentru
          care te încurajăm să o consulți periodic.
        </p>
      </LegalSection>
    </LegalPage>
  );
};

export default TermeniPage;
