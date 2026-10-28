const fs = require('fs');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const env = fs.readFileSync('.env', 'utf8');
const match = env.match(/MONGODB_URI=(.+)/);
const uri = match[1].trim();

async function run() {
  await mongoose.connect(uri);
  const School = mongoose.connection.collection('schools');
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash('School@123', salt);

  const res = await School.updateMany(
    {},
    { $set: { adminPassword: hash, adminName: 'Campus Administrator' } }
  );
  console.log('Update result:', res);

  const list = await School.find({}).project({ name: 1, slug: 1, code: 1, adminPassword: 1 }).toArray();
  console.log('Current schools:', list.map(s => ({ name: s.name, slug: s.slug, code: s.code, hasPassword: Boolean(s.adminPassword) })));
  process.exit(0);
}

run().catch(err => {
  console.error(err);
  process.exit(1);
});
