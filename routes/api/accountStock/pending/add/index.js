'use strict'

module.exports = async function (fastify, opts) {
    const JWTModel = require('../../../../../models/JWT')
    const UserModel = require('../../../../../models/User')
    const jwt = new JWTModel()
    const { nanoid } = require('nanoid')

    fastify.post('/', async function (request, reply) {
        let conn

        const {
            username,
            mail,
            password,
            auth_token,
        } = request.query

        if (
            !username ||
            !mail ||
            !password ||
            !auth_token
        ) {
            return reply.code(400).send({
                message:
                    'Need to send: username, mail, password, pc_name, auth_token',
            })
        }

        try {
            conn = await request.dbpool.getConnection()

            if (auth_token !== "califatogang") {
                console.log(`Invalid auth token: ${auth_token}`)
                return reply.code(400).send("Token invalid")
            }

            const rows = await conn.query(
                'SELECT * FROM pending_stock_accounts WHERE mail = ?',
                mail
            )

            const stock_rows = await conn.query(
                'SELECT * FROM stock_accounts WHERE mail = ?',
                mail
            )

            if (rows.length > 0 || stock_rows.length > 0) {
                return reply.code(500).send({
                    message: `This account already exists on ${rows.length > 0 ? 'pending' : 'stock'} accounts`,
                })
            }

            const insertResult = await conn.query(
                'INSERT INTO pending_stock_accounts (username, mail, password) VALUES (?, ?, ?)',
                [username, mail, password]
            )

            if (insertResult.affectedRows <= 0) {
                return reply.code(500).send({
                    message: 'Failed to add stock',
                })
            }

            console.log(`Added pending stock with mail: ${mail}`)

            return { message: 'Stock added' }
        } finally {
            if (conn) conn.release()
        }
    })
}
