'use strict'

const path = require('path')
const mariadb = require('mariadb')
const AutoLoad = require('@fastify/autoload')
console.log('Starting FiveMUP API')

const pool = mariadb.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '1234',
    database: 'fivemup',
    connectionLimit: 15,
    timeout: 60000
})

// Pass --options via CLI arguments in command to enable these options.
module.exports.options = {}

module.exports = async function (fastify, opts) {
    console.log(fastify.version)
    // Place here your custom code!

    fastify.decorateRequest('dbpool', '')

    fastify.addHook('preHandler', (req, reply, done) => {
        req.dbpool = pool
        done()
    })

    // Do not touch the following lines

    // This loads all plugins defined in plugins
    // those should be support plugins that are reused
    // through your application
    fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'plugins'),
        options: Object.assign({}, opts),
    })

    // This loads all plugins defined in routes
    // define your routes in one of these
    fastify.register(AutoLoad, {
        dir: path.join(__dirname, 'routes'),
        options: Object.assign({}, opts),
    })
}
