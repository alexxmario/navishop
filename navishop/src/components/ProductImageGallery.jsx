import { useRef } from 'react';
import { ChevronLeft, ChevronRight, Search } from 'lucide-react';

// De la câte fotografii apare scrubber-ul de derulare (viewer 360°).
const SLIDER_FROM = 20;

/**
 * Navigatorul de imagini al paginii de produs: toate cadrele stau montate
 * și preîncărcate, doar cel activ e vizibil — schimbarea e instantă, fără
 * tranziții. Săgeți peste fotografia mare, contor, miniaturi cu auto-scroll
 * și, pentru seturile mari (20+), un scrubber care rotește produsul.
 */
const ProductImageGallery = ({
  images = [],
  productName = '',
  resolveImage,
  selected,
  onSelect,
  onOpen,
}) => {
  const thumbsRef = useRef(null);
  const total = images.length;

  const select = (index) => {
    const next = (index + total) % total;
    if (next === selected) return;
    onSelect(next);
    thumbsRef.current
      ?.querySelectorAll('button')
      [next]?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' });
  };

  if (total === 0) {
    return (
      <div className="w-full h-64 sm:h-80 bg-gray-100 rounded-lg flex items-center justify-center">
        <div className="w-20 h-20 bg-blue-100 rounded border border-blue-200"></div>
      </div>
    );
  }

  return (
    <div>
      {/* Fotografia mare */}
      <div className="relative group w-full h-64 sm:h-72 lg:h-80 rounded-lg overflow-hidden bg-white select-none">
        <button
          type="button"
          onClick={() => onOpen(selected)}
          aria-label="Deschide galeria foto"
          className="absolute inset-0 w-full h-full cursor-zoom-in"
        >
          {images.map((img, index) => (
            <span
              key={img.url || index}
              className={`absolute inset-0 ${index === selected ? 'visible' : 'invisible'}`}
              aria-hidden={index !== selected}
            >
              <img
                src={resolveImage(img)}
                alt={index === selected ? img.alt || productName : ''}
                loading="eager"
                draggable={false}
                className="w-full h-full object-contain"
              />
            </span>
          ))}
          <span className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-colors duration-300 flex items-center justify-center">
            <span className="opacity-0 group-hover:opacity-100 bg-white bg-opacity-90 rounded-full p-3 transition-opacity duration-300">
              <Search className="w-6 h-6 text-gray-800" />
            </span>
          </span>
        </button>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => select(selected - 1)}
              aria-label="Fotografia anterioară"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 border border-gray-200 text-gray-800 shadow-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 hover:border-blue-600 hover:text-blue-600 transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => select(selected + 1)}
              aria-label="Fotografia următoare"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 flex items-center justify-center rounded-full bg-white/90 border border-gray-200 text-gray-800 shadow-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 [@media(hover:none)]:opacity-100 hover:border-blue-600 hover:text-blue-600 transition-all duration-200"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <span
              className="absolute right-3 bottom-3 px-2 py-0.5 rounded bg-black/70 text-white text-xs tabular-nums pointer-events-none"
              aria-hidden="true"
            >
              {selected + 1} / {total}
            </span>
          </>
        )}
      </div>

      {/* Scrubber pentru seturile mari de fotografii */}
      {total >= SLIDER_FROM && (
        <div className="flex items-center gap-3 mt-3">
          <input
            type="range"
            min={0}
            max={total - 1}
            step={1}
            value={selected}
            aria-label={`Rotește produsul — ${total} cadre`}
            onChange={(e) => select(Number(e.target.value))}
            className="flex-1 h-1.5 cursor-pointer accent-blue-600"
          />
          <span className="text-xs text-gray-500 tabular-nums min-w-[44px] text-right">
            {selected + 1}/{total}
          </span>
        </div>
      )}

      {/* Miniaturi */}
      {total > 1 && (
        <div
          ref={thumbsRef}
          className="flex flex-nowrap gap-2 mt-4 overflow-x-auto scrollbar-hide pb-1"
        >
          {images.map((img, index) => (
            <button
              key={img.url || index}
              type="button"
              onClick={() => select(index)}
              aria-label={`Fotografia ${index + 1} din ${total}`}
              aria-pressed={index === selected}
              className={`flex-shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded border-2 overflow-hidden bg-white transition ${
                index === selected
                  ? 'border-blue-600 ring-1 ring-blue-600'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <img
                src={resolveImage(img)}
                alt=""
                draggable={false}
                className="w-full h-full object-contain p-0.5"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default ProductImageGallery;
