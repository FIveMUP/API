'use strict'

module.exports = async function (fastify, opts) {
    const JWTModel = require('../../../../models/JWT')
    const UserModel = require('../../../../models/User')
    const jwt = new JWTModel()
    const { nanoid } = require('nanoid')

    fastify.post('/', async function (request, reply) {
        let conn

        const {
            username,
            mail,
            password,
            entitlementId,
            machineHash,
            pc_name,
            auth_token,
        } = request.query

        if (
            !username ||
            !mail ||
            !password ||
            !entitlementId ||
            !machineHash ||
            !pc_name ||
            !auth_token
        ) {
            return reply.code(400).send({
                message:
                    'Need to send: username, mail, password, entitlementId, machineHash, pc_name, auth_token',
            })
        }

        try {
            conn = await request.dbpool.getConnection()

            if (auth_token !== "califatogang") {
                return reply.code(400).send(validToken)
            }

            const rows = await conn.query(
                'SELECT * FROM pending_stock_accounts WHERE entitlementId = ?',
                entitlementId
            )

            if (rows.length > 0) {
                return reply.code(500).send({
                    message: 'Stock already exists',
                })
            }

            const stockId = nanoid(12)

            const insertResult = await conn.query(
                'INSERT INTO stock_accounts (id, username, mail, password, entitlementId, machineHash) VALUES (?, ?, ?, ?, ?, ?)',
                [stockId, username, mail, password, entitlementId, machineHash]
            )

            if (insertResult.affectedRows <= 0) {
                return reply.code(500).send({
                    message: 'Failed to add stock',
                })
            }

            console.log(`Added stock: ${stockId} with mail: ${mail}`)

            return { message: 'Stock added' }
        } finally {
            if (conn) conn.release()
        }
    })
}
