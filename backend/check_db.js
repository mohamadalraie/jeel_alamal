const { Client } = require('pg');
const client = new Client({ connectionString: 'postgres://postgres:postgres@localhost:5432/jeel_alamal' });
client.connect().then(() => client.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'announcements'")).then(res => {
  console.log(res.rows);
  client.end();
}).catch(console.error);
