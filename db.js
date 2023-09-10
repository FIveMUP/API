const mariadb = require('mariadb')

const pool = mariadb.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '1234',
    database: 'fivemup',
    connectionLimit: 15,
    timeout: 60000
})

module.exports = pool