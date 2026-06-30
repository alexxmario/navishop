import { motion } from 'framer-motion';
import {
  Smartphone, Monitor, Wifi, Cpu, Bluetooth, Check, ShieldCheck,
} from 'lucide-react';
import { resolveImageUrl, placeholderImage } from '../config/api';
import ZoomImage from './ZoomImage';
import {
  buildGeneratedDescription,
  getManualSections,
  hasRealDescription,
} from '../utils/generatedDescription';

const ICONS = {
  smartphone: Smartphone,
  monitor: Monitor,
  wifi: Wifi,
  cpu: Cpu,
  bluetooth: Bluetooth,
};

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
  }),
};

const HighlightTile = ({ iconKey, label, value, index }) => {
  const Icon = ICONS[iconKey] || Cpu;
  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      className="flex items-start gap-3 rounded-xl bg-white border border-slate-200/70 px-4 py-3.5"
    >
      <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
        <Icon className="h-[18px] w-[18px]" strokeWidth={2} />
      </span>
      <span className="min-w-0">
        <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
          {label}
        </span>
        <span className="block text-[15px] font-semibold text-slate-900 leading-tight">
          {value}
        </span>
      </span>
    </motion.div>
  );
};

const ProductDescription = ({ product }) => {
  if (!product) return null;

  const gen = buildGeneratedDescription(product);
  const manualSections = getManualSections(product);
  const longText = hasRealDescription(product.description) ? product.description.trim() : null;

  if (!gen) return null;

  const showcaseUrl = gen.showcase
    ? resolveImageUrl(gen.showcase.image.url) || placeholderImage(800, 600)
    : null;

  return (
    <motion.div
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '-40px' }}
      className="space-y-10"
    >
      {/* Header: kicker + oversize headline + lead */}
      <motion.header variants={fadeUp} className="max-w-[68ch]">
        <span className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-600">
          {gen.kicker}
        </span>
        <h3 className="mt-2 text-2xl sm:text-3xl lg:text-[2.5rem] font-bold leading-[1.05] tracking-tight text-slate-900">
          {gen.headline}
        </h3>
        {gen.lead && (
          <p className="mt-4 text-[15px] sm:text-base leading-relaxed text-slate-600">
            {gen.lead}
          </p>
        )}
      </motion.header>

      {/* Spec highlights */}
      {gen.highlights.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {gen.highlights.map((h, i) => (
            <HighlightTile key={h.label} {...h} index={i} />
          ))}
        </div>
      )}

      {/* Image showcase woven into the description */}
      {showcaseUrl && (
        <motion.div
          variants={fadeUp}
          className="grid gap-6 lg:grid-cols-2 lg:items-center"
        >
          <div className="overflow-hidden rounded-2xl bg-slate-100">
            <ZoomImage
              src={showcaseUrl}
              imageCount={product.images?.length}
              alt={gen.showcase.image.alt || gen.headline}
              loading="lazy"
              className="h-full w-full aspect-[3/2]"
            />
          </div>
          <ul className="space-y-3">
            {gen.showcase.captions.map((caption) => (
              <li key={caption} className="flex items-start gap-3 text-[15px] text-slate-700">
                <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-600" strokeWidth={2.5} />
                <span className="leading-relaxed">{caption}</span>
              </li>
            ))}
          </ul>
        </motion.div>
      )}

      {/* Benefit checklist */}
      {gen.benefits.length > 0 && (
        <motion.div variants={fadeUp}>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3">
            {gen.benefits.map((benefit) => (
              <div key={benefit} className="flex items-center gap-3 text-[15px] text-slate-800">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-blue-600/10 text-blue-600">
                  <Check className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
                {benefit}
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Compatibility callout */}
      {gen.compatibility && (
        <motion.div
          variants={fadeUp}
          className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm font-medium text-blue-900"
        >
          <ShieldCheck className="h-5 w-5 flex-shrink-0 text-blue-600" strokeWidth={2} />
          {gen.compatibility}
        </motion.div>
      )}

      {/* Saved structured sections (manual content wins when present) */}
      {manualSections.length > 0 && (
        <motion.div variants={fadeUp} className="space-y-6 border-t border-slate-200 pt-8">
          {manualSections.map((section) => (
            <div key={section.title}>
              <h4 className="text-base font-semibold text-slate-900">{section.title}</h4>
              <ul className="mt-3 space-y-2">
                {section.points.map((point, i) => (
                  <li key={i} className="flex items-start gap-3 text-[15px] text-slate-700">
                    <span className="mt-2 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-blue-600" />
                    <span className="leading-relaxed">{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </motion.div>
      )}

      {/* Original long-form description, when it's real prose */}
      {longText && manualSections.length === 0 && (
        <motion.p
          variants={fadeUp}
          className="max-w-[70ch] whitespace-pre-line border-t border-slate-200 pt-8 text-[15px] leading-relaxed text-slate-600"
        >
          {longText}
        </motion.p>
      )}
    </motion.div>
  );
};

export default ProductDescription;
