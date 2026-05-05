const mongoose = require('mongoose');
require('dotenv').config();

const Product = require('../models/Product');

async function replaceNaviABC() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/piloton');
    console.log('Connected to MongoDB');

    // Find all products that contain NAVI-ABC or NAVI ABC anywhere
    const allProducts = await Product.find({});
    console.log(`Total products in DB: ${allProducts.length}`);

    const regex = /NAVI[\s-]ABC/gi;
    const replacement = 'PilotOn';
    let totalUpdated = 0;
    let totalChanges = 0;

    for (const product of allProducts) {
      let changed = false;
      const changes = [];

      // 1. Check brand field
      if (product.brand && regex.test(product.brand)) {
        changes.push(`  brand: "${product.brand}" -> "${product.brand.replace(regex, replacement)}"`);
        product.brand = product.brand.replace(regex, replacement);
        changed = true;
      }
      regex.lastIndex = 0;

      // 2. Check name field
      if (product.name && regex.test(product.name)) {
        changes.push(`  name: "${product.name}" -> "${product.name.replace(regex, replacement)}"`);
        product.name = product.name.replace(regex, replacement);
        changed = true;
      }
      regex.lastIndex = 0;

      // 3. Check description field
      if (product.description && regex.test(product.description)) {
        changes.push(`  description: contains NAVI-ABC -> replaced`);
        product.description = product.description.replace(regex, replacement);
        changed = true;
      }
      regex.lastIndex = 0;

      // 4. Check shortDescription field
      if (product.shortDescription && regex.test(product.shortDescription)) {
        changes.push(`  shortDescription: contains NAVI-ABC -> replaced`);
        product.shortDescription = product.shortDescription.replace(regex, replacement);
        changed = true;
      }
      regex.lastIndex = 0;

      // 5. Check specifications array (key/value pairs)
      if (product.specifications && product.specifications.length > 0) {
        for (const spec of product.specifications) {
          if (spec.key && regex.test(spec.key)) {
            changes.push(`  spec key: "${spec.key}" -> "${spec.key.replace(regex, replacement)}"`);
            spec.key = spec.key.replace(regex, replacement);
            changed = true;
          }
          regex.lastIndex = 0;
          if (spec.value && regex.test(spec.value)) {
            changes.push(`  spec value: "${spec.value}" -> "${spec.value.replace(regex, replacement)}"`);
            spec.value = spec.value.replace(regex, replacement);
            changed = true;
          }
          regex.lastIndex = 0;
        }
      }

      // 6. Check romanianSpecs (all nested string fields)
      if (product.romanianSpecs) {
        const sections = ['hardware', 'display', 'connectivity', 'features', 'package', 'compatibility', 'general', 'additional'];
        for (const section of sections) {
          if (product.romanianSpecs[section]) {
            for (const [key, value] of Object.entries(product.romanianSpecs[section])) {
              if (typeof value === 'string' && regex.test(value)) {
                const newValue = value.replace(regex, replacement);
                changes.push(`  romanianSpecs.${section}.${key}: "${value}" -> "${newValue}"`);
                product.romanianSpecs[section][key] = newValue;
                changed = true;
              }
              regex.lastIndex = 0;
            }
          }
        }
      }

      // 7. Check structuredDescription sections
      if (product.structuredDescription && product.structuredDescription.sections) {
        for (const section of product.structuredDescription.sections) {
          if (section.title && regex.test(section.title)) {
            changes.push(`  structuredDescription title: "${section.title}" -> "${section.title.replace(regex, replacement)}"`);
            section.title = section.title.replace(regex, replacement);
            changed = true;
          }
          regex.lastIndex = 0;
          if (section.points && section.points.length > 0) {
            for (let i = 0; i < section.points.length; i++) {
              if (section.points[i] && regex.test(section.points[i])) {
                changes.push(`  structuredDescription point: "${section.points[i].substring(0, 60)}..." -> replaced`);
                section.points[i] = section.points[i].replace(regex, replacement);
                changed = true;
              }
              regex.lastIndex = 0;
            }
          }
        }
        // Check originalDescription
        if (product.structuredDescription.originalDescription && regex.test(product.structuredDescription.originalDescription)) {
          changes.push(`  structuredDescription.originalDescription: contains NAVI-ABC -> replaced`);
          product.structuredDescription.originalDescription = product.structuredDescription.originalDescription.replace(regex, replacement);
          changed = true;
        }
        regex.lastIndex = 0;
      }

      // 8. Check features array
      if (product.features && product.features.length > 0) {
        for (let i = 0; i < product.features.length; i++) {
          if (product.features[i] && regex.test(product.features[i])) {
            changes.push(`  feature[${i}]: contains NAVI-ABC -> replaced`);
            product.features[i] = product.features[i].replace(regex, replacement);
            changed = true;
          }
          regex.lastIndex = 0;
        }
      }

      // 9. Check tags array
      if (product.tags && product.tags.length > 0) {
        for (let i = 0; i < product.tags.length; i++) {
          if (product.tags[i] && regex.test(product.tags[i])) {
            changes.push(`  tag[${i}]: "${product.tags[i]}" -> "${product.tags[i].replace(regex, replacement)}"`);
            product.tags[i] = product.tags[i].replace(regex, replacement);
            changed = true;
          }
          regex.lastIndex = 0;
        }
      }

      // 10. Check SEO fields
      if (product.seoTitle && regex.test(product.seoTitle)) {
        changes.push(`  seoTitle: contains NAVI-ABC -> replaced`);
        product.seoTitle = product.seoTitle.replace(regex, replacement);
        changed = true;
      }
      regex.lastIndex = 0;
      if (product.seoDescription && regex.test(product.seoDescription)) {
        changes.push(`  seoDescription: contains NAVI-ABC -> replaced`);
        product.seoDescription = product.seoDescription.replace(regex, replacement);
        changed = true;
      }
      regex.lastIndex = 0;

      // Save if changed
      if (changed) {
        totalUpdated++;
        totalChanges += changes.length;
        console.log(`\nProduct: ${product.name} (SKU: ${product.sku})`);
        changes.forEach(c => console.log(c));
        product.markModified('romanianSpecs');
        product.markModified('structuredDescription');
        product.markModified('specifications');
        await product.save({ validateBeforeSave: false });
      }
    }

    console.log(`\n========================================`);
    console.log(`Total products updated: ${totalUpdated}`);
    console.log(`Total changes made: ${totalChanges}`);
    console.log(`========================================`);

    await mongoose.connection.close();
    console.log('Done!');
  } catch (error) {
    console.error('Error:', error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

replaceNaviABC();
