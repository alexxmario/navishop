import { useState, useEffect, useRef } from 'react';
import { Star } from 'lucide-react';
import Marquee from './Marquee';

const ReviewsCarousel = () => {
  const [isMobile, setIsMobile] = useState(false);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const carouselRef = useRef(null);

  const reviews = [
    {
      id: 1,
      rating: 5,
      text: "Merge tare bine, frate! Nici nu mai bag telefonul în suport. Se conectează singur, pac-pac, gata!",
      name: "Marian C."
    },
    {
      id: 2,
      rating: 5,
      text: "Mi-au pus băieții navigația și nu pot să zic decât respect. Merge totul uns, CarPlay, camere, tot.",
      name: "Alexandru D."
    },
    {
      id: 3,
      rating: 5,
      text: "Am CarPlay wireless și nu s-a deconectat niciodată. Mă mir și eu cât de stabil e 😂.",
      name: "Cosmin R."
    },
    {
      id: 4,
      rating: 5,
      text: "La cât m-am chinuit cu alte sisteme, asta e vis. Merge perfect și se vede super clar.",
      name: "Diana M."
    },
    {
      id: 5,
      rating: 5,
      text: "N-am crezut că se poate instala așa ușor. Mi-au explicat tot, pas cu pas, și a mers din prima.",
      name: "Andrei P."
    },
    {
      id: 6,
      rating: 5,
      text: "Bă, n-am ce zice, merge beton! CarPlay, Waze, YouTube, tot. Și se mișcă repede, nu ca alea lente.",
      name: "Florin B."
    },
    {
      id: 7,
      rating: 5,
      text: "L-am pus pe un BMW E90. Zici că e original, frate. Seamănă la fix, fără jocuri, fără nimic.",
      name: "Vlad S."
    },
    {
      id: 8,
      rating: 5,
      text: "Sincer, am dat comandă cu emoții, da' m-au sunat, mi-au explicat, totul profi. Merge impecabil.",
      name: "Maria T."
    },
    {
      id: 9,
      rating: 5,
      text: "Am Android Auto, merge brici. Conectare rapidă, fără cablu. Mă bucur că am ales PilotOn.",
      name: "Gabriel L."
    },
    {
      id: 10,
      rating: 5,
      text: "E altă treabă. Nu se mai agață, nu se blochează, totul merge cum trebuie. Recomand oricui.",
      name: "Ioana V."
    },
    {
      id: 11,
      rating: 5,
      text: "Îi știu pe băieții de la PilotOn de mai demult, mereu corecți. Și navigațiile lor sunt top!",
      name: "Daniel C."
    },
    {
      id: 12,
      rating: 5,
      text: "Am CarPlay de vreo 4 luni. Merge perfect, fără lag. Niciodată n-a făcut figuri.",
      name: "Raluca A."
    },
    {
      id: 13,
      rating: 5,
      text: "Mi-a plăcut că arată fix ca originalul din mașină. Nici nu-ți dai seama că e aftermarket.",
      name: "Bogdan F."
    },
    {
      id: 14,
      rating: 5,
      text: "Pentru cât costă, își face treaba de nota 10. Am dat mai mult pe altele și s-au blocat după o lună.",
      name: "Elena N."
    },
    {
      id: 15,
      rating: 5,
      text: "Am primit și update după montaj, totul gratuit. Așa da, oameni serioși, nu doar vânzători.",
      name: "Cristian M."
    },
    {
      id: 16,
      rating: 5,
      text: "Merge brici CarPlay-ul, se conectează instant. N-am crezut că o să fie așa simplu. Bravo băieților de la PilotOn!",
      name: "Sorin P."
    },
    {
      id: 17,
      rating: 5,
      text: "Am pus și eu navigația asta, ce să zic... altă viață. Nu mai stau cu telefonul în mână. Recomand!",
      name: "Ana G."
    },
    {
      id: 18,
      rating: 5,
      text: "Mi-au montat băieții totul în jumate de oră, CarPlay merge din prima, fără prostii. Super treabă!",
      name: "Radu I."
    },
    {
      id: 19,
      rating: 5,
      text: "La început am fost sceptic, da' merge impecabil. Waze, Spotify, tot. Parcă am mașină nouă 😂.",
      name: "Mihai D."
    },
    {
      id: 20,
      rating: 5,
      text: "Am CarPlay wireless, pornește singur când bag contactul. Nici n-am ce comenta, e fix ce trebuie.",
      name: "Cristina H."
    },
    {
      id: 21,
      rating: 5,
      text: "Sunet bun, ecran clar, nu se blochează. Până și nevastă-mea s-a prins cum se folosește 😂.",
      name: "Vasile R."
    },
    {
      id: 22,
      rating: 5,
      text: "PilotOn mi-a pus sistemul fără să taie fire, totul curat. Se vede că-s meseriași.",
      name: "Laura E."
    },
    {
      id: 23,
      rating: 5,
      text: "Am Android Auto, merge ca uns. Mă duc cu Waze și muzică, fără fire, fără nervi.",
      name: "Adrian O."
    },
    {
      id: 24,
      rating: 5,
      text: "Mi-a venit pachetul repede, l-am montat la un prieten și merge perfect. Recomand, merită banii.",
      name: "Simona K."
    },
    {
      id: 25,
      rating: 5,
      text: "E altceva față de chinezăriile alea de pe net. Se mișcă repede și arată ca originala.",
      name: "Petru J."
    },
    {
      id: 26,
      rating: 5,
      text: "CarPlay merge mai bine ca la mașinile noi. Jur. Am un Passat din 2015 și e top acum.",
      name: "Camelia U."
    },
    {
      id: 27,
      rating: 5,
      text: "Mi-au răspuns imediat pe WhatsApp, m-au ghidat pas cu pas. Foarte ok echipa.",
      name: "Ionuț W."
    },
    {
      id: 28,
      rating: 5,
      text: "Mă bucur că am luat PilotOn. Am pierdut vremea cu alte firme, ăștia chiar știu ce fac.",
      name: "Georgiana Q."
    },
    {
      id: 29,
      rating: 5,
      text: "Navigația pornește instant, nu se blochează, ecran mare și clar. Foarte mulțumit.",
      name: "Lucian Y."
    },
    {
      id: 30,
      rating: 5,
      text: "La început am zis că e scumpă, da' acum văd că face toți banii. Recomand cu căldură!",
      name: "Roxana Z."
    }
  ];

  useEffect(() => {
    const checkIsMobile = () => {
      setIsMobile(window.innerWidth <= 1024);
    };

    checkIsMobile();
    window.addEventListener('resize', checkIsMobile);

    return () => window.removeEventListener('resize', checkIsMobile);
  }, []);

  // Minimum swipe distance
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;

    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe) {
      setCurrentSlide((prev) => (prev + 1) % reviews.length);
    }
    if (isRightSwipe) {
      setCurrentSlide((prev) => (prev - 1 + reviews.length) % reviews.length);
    }
  };

  const ReviewCard = ({ review }) => (
    <div className="bg-white p-6 border border-gray-100 rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 h-full flex flex-col">
      <div className="flex items-center mb-4">
        <div className="w-10 h-10 bg-blue-100 border border-blue-200 rounded-full flex items-center justify-center font-medium text-blue-600">
          {review.name.charAt(0)}
        </div>
        <div className="ml-3">
          <h4 className="font-medium">{review.name}</h4>
          <div className="flex">
            {[...Array(review.rating)].map((_, i) => (
              <Star key={i} className="w-3 h-3 fill-blue-600 text-blue-600" />
            ))}
          </div>
        </div>
      </div>
      <p className="text-gray-700 text-sm flex-grow">"{review.text}"</p>
    </div>
  );

  return (
    <section className="py-16 bg-gray-50">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-light mb-4">Ce spun <span className="text-blue-600">clienții</span></h2>
          <div className="flex items-center justify-center space-x-4">
            <div className="flex items-center">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-blue-600 text-blue-600" />
              ))}
            </div>
            <span className="text-lg font-medium">5.0</span>
            <span className="text-gray-600">din peste 2.500 recenzii</span>
          </div>
        </div>

        {isMobile ? (
          // Mobile/Tablet Simple Swipeable Carousel
          <div className="relative">
            <div
              ref={carouselRef}
              className="overflow-hidden cursor-grab active:cursor-grabbing select-none"
              onTouchStart={onTouchStart}
              onTouchMove={onTouchMove}
              onTouchEnd={onTouchEnd}
              style={{
                touchAction: 'pan-x'
              }}
            >
              <div
                className="flex transition-transform duration-300 ease-in-out"
                style={{
                  transform: `translateX(-${currentSlide * 100}%)`,
                }}
              >
                {reviews.map((review) => (
                  <div
                    key={review.id}
                    className="w-full flex-shrink-0 px-4"
                    style={{
                      minWidth: '100%',
                      width: '100%'
                    }}
                  >
                    <ReviewCard review={review} />
                  </div>
                ))}
              </div>
            </div>

            {/* Dots indicator */}
            <div className="flex justify-center mt-6 space-x-2">
              {reviews.slice(0, Math.min(reviews.length, 10)).map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors ${
                    index === currentSlide ? 'bg-blue-600' : 'bg-gray-300'
                  }`}
                />
              ))}
            </div>
          </div>
        ) : (
          // Desktop Marquee
          <Marquee
            direction="left"
            className="py-4"
            speed={40}
            pauseOnHover={true}
          >
            {reviews.map((review) => (
              <div key={review.id} className="mx-4">
                <div className="w-80">
                  <ReviewCard review={review} />
                </div>
              </div>
            ))}
          </Marquee>
        )}
      </div>
    </section>
  );
};

export default ReviewsCarousel;