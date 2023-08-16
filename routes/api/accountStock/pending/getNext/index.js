'use strict'

module.exports = async function (fastify, opts) {
    const JWTModel = require('../../../../../models/JWT')
    const UserModel = require('../../../../../models/User')
    const jwt = new JWTModel()
    const { nanoid } = require('nanoid')

    fastify.get('/', async function (request, reply) {
        let conn

        const {
            pc_name,
            auth_token,
        } = request.query

        if (
            !auth_token
        ) {
            return reply.code(400).send({
                message:
                    'Need to send: auth_token',
            })
        }

        try {
            conn = await request.dbpool.getConnection()

            if (auth_token !== "califatogang") {
                console.log(`Invalid auth token: ${auth_token}`)
                return reply.code(400).send("Token invalid")
            }

            const pending_accounts = await conn.query(
                'SELECT * FROM pending_stock_accounts WHERE status = ?',
                ["pending"]
            );

            if (pending_accounts.length === 0) {
                return reply.code(400).send("There is no pending accounts, go to sleep :)")
            }

            const random_account = pending_accounts[Math.floor(Math.random() * pending_accounts.length)];

            console.log(`Sending account [${random_account.mail}] to [${pc_name}] for 0.16€`)

            await conn.query(
                'UPDATE pending_stock_accounts SET status = ?, checkedBy = ? WHERE mail = ?',
                ["checking", pc_name, random_account.mail]
            );

            return { 
                message: `Checking account [${random_account.mail}] [${pc_name}] for 0.16€`,
                email: random_account.mail,
                password: random_account.password,
            }
        } finally {
            if (conn) conn.release()
        }
    })
}
