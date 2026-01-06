# GPS Products Description Updater

This script updates existing GPS products in the database with descriptions and specifications scraped from piloton.ro.

## What it does

1. **Finds GPS products** without descriptions in your database
2. **Searches piloton.ro** for each product by name
3. **Scrapes descriptions and specifications** from the product pages
4. **Parses and structures** the data into your Product schema format:
   - `description` - Full HTML description
   - `shortDescription` - First 200 characters
   - `structuredDescription` - Organized sections with icons (⭐ Caracteristici, 📺 Display, etc.)
   - `romanianSpecs` - Structured Romanian specifications
   - `detailedSpecs` - Processor, RAM, Storage
   - `displaySpecs` - Screen size, resolution, technology
   - `specifications` - Key-value pairs

## How to run

### From your VPS:

```bash
# SSH into your VPS
ssh root@31.14.23.20

# Navigate to backend directory
cd /var/www/navishop/backend

# Run the script
node scripts/updateGpsDescriptions.js
```

### From your local machine (with VPS MongoDB):

```bash
# Make sure your .env has the correct MONGODB_URI
cd backend
node scripts/updateGpsDescriptions.js
```

## What to expect

The script will:
- Connect to MongoDB
- Find all GPS products without descriptions
- Process each product one by one (with 2-second delays for rate limiting)
- Show detailed progress for each product:
  ```
  [1/15] Processing: Navigatie GPS PilotOn A9XL
    SKU: PO-A9XL-9INCH
    🔍 Searching PilotOn for: Navigatie GPS PilotOn A9XL
    ✓ Found URL: http://www.piloton.ro/gps-a9xl-9-inch.html
    📄 Fetching description from: http://www.piloton.ro/gps-a9xl-9-inch.html
    ✓ Extracted description (2341 chars) and 15 specifications
    ✅ Updated Navigatie GPS PilotOn A9XL
       - Description: Yes
       - Structured sections: 4
       - Specifications: 15
  ```
- Show a final summary with success/failure counts

## Structured Description Format

The script automatically organizes descriptions into sections:

- **⭐ Caracteristici principale** - Main features
- **📺 Display** - Screen specifications
- **⚡ Performanță** - Processor, RAM, storage
- **🔗 Conectivitate** - Bluetooth, WiFi, USB
- **🎯 Funcționalități** - GPS functions, apps
- **📦 Conținut pachet** - What's in the box

## Rate Limiting

The script includes built-in rate limiting to be respectful to piloton.ro:
- 2 seconds between product requests
- Exponential backoff on failed requests
- Maximum 3 retries per request

## Error Handling

If a product can't be found or scraped:
- The script will log a warning and continue with the next product
- At the end, you'll see how many products succeeded vs failed
- The database won't be corrupted - failed products are skipped

## Safety Features

- **No overwrites**: Existing descriptions won't be replaced
- **Merge specifications**: New specs are added, existing ones kept
- **Validation**: All updates go through mongoose schema validation
- **Error recovery**: One failed product won't stop the entire process

## Testing First

To test on just one product before running on all:

```javascript
// Edit the script temporarily, line ~513:
const gpsProducts = await Product.find({
  category: 'gps',
  $or: [
    { description: { $exists: false } },
    { description: '' },
    { description: null }
  ]
}).limit(1); // Add .limit(1) to test with just one product
```

## What gets updated

For each product, the script updates:

```javascript
{
  description: "Full HTML description from piloton.ro",
  shortDescription: "First 200 characters...",
  structuredDescription: {
    sections: [
      {
        title: "Caracteristici principale",
        icon: "⭐",
        points: ["Feature 1", "Feature 2", ...]
      },
      ...
    ],
    originalDescription: "Original HTML",
    parsedAt: "2026-01-06T..."
  },
  specifications: [
    { key: "Procesor", value: "Quad-core 1.6GHz" },
    { key: "RAM", value: "2GB" },
    ...
  ],
  romanianSpecs: {
    hardware: {
      modelProcesor: "Quad-core 1.6GHz",
      memorieRAM: "2GB",
      capacitateStocare: "32GB"
    },
    display: {
      diagonalaDisplay: "9 inch",
      rezolutieDisplay: "1024x600",
      tehnologieDisplay: "IPS"
    },
    ...
  },
  detailedSpecs: {
    processor: "Quad-core 1.6GHz",
    ram: "2GB",
    storage: "32GB"
  },
  displaySpecs: {
    screenSize: "9 inch",
    resolution: "1024x600",
    technology: "IPS"
  }
}
```

## Troubleshooting

### "MongoDB connection error"
- Check your `.env` file has correct `MONGODB_URI`
- Make sure MongoDB is running

### "No products found"
- All GPS products already have descriptions! ✅
- Or check that products have `category: 'gps'`

### "Could not find product on PilotOn"
- The product name doesn't match piloton.ro listings
- You can manually add the URL by modifying the `searchPilotonProduct` function

### Script is slow
- This is intentional! Rate limiting prevents overwhelming piloton.ro
- 15 products × 2 seconds = ~30 seconds minimum

## After running

Check the results:
```bash
# In your MongoDB shell or Compass
db.products.find({
  category: 'gps',
  description: { $exists: true, $ne: '' }
}).count()

# Or check one product
db.products.findOne({ category: 'gps' }, {
  name: 1,
  description: 1,
  'structuredDescription.sections': 1,
  'romanianSpecs.hardware': 1
})
```

## Next Steps

After updating descriptions:
1. Rebuild the frontend to see the changes: `npm run build`
2. Check product pages to verify descriptions display correctly
3. Update SEO descriptions if needed
4. Consider featuring some GPS products on homepage
