require('dotenv').config();
const mongoose = require('mongoose');
const B2BApplication = require('./models/B2BApplication');

mongoose.connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log('Connected to MongoDB');

    const applications = await B2BApplication.find({});

    console.log('\n=== B2B Applications ===');
    console.log(`Total: ${applications.length}\n`);

    applications.forEach((app, index) => {
      console.log(`${index + 1}. ${app.companyName}`);
      console.log(`   Email: ${app.email}`);
      console.log(`   Status: ${app.status}`);
      console.log(`   Contact: ${app.contactName}`);
      console.log(`   Created: ${app.createdAt}`);
      console.log('');
    });

    process.exit(0);
  })
  .catch(err => {
    console.error('Error:', err);
    process.exit(1);
  });
